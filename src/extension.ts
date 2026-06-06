import * as vscode from 'vscode';
import { ConnectionRouter } from './mcp/connection-router';
import { OutputChannelProvider } from './providers/output';
import { StatusBarProvider } from './providers/statusbar';
import { CommandProvider } from './providers/commands';
import { SolutionProvider } from './providers/solution';
import { ConfigurationManager } from './mcp/config';
import { SecurityManager } from './security/trust';
import { ExtensionHttpServer } from './server/ExtensionHttpServer';

/**
 * Extension activation entry point
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('Universal VS MCP extension is activating...');

    // Initialize providers
    const outputProvider = new OutputChannelProvider();
    const statusBarProvider = new StatusBarProvider();
    const configManager = new ConfigurationManager();
    const securityManager = new SecurityManager();

    context.subscriptions.push(outputProvider, statusBarProvider);

    // Check workspace trust
    if (!vscode.workspace.isTrusted) {
        const result = await vscode.window.showWarningMessage(
            'Universal VS MCP requires a trusted workspace for file operations.',
            'Trust Workspace', 'Later'
        );
        if (result === 'Trust Workspace') {
            vscode.commands.executeCommand('workbench.trust.manage');
        }
        outputProvider.log('Extension activated in untrusted workspace. Some features disabled.');
        return;
    }

    // Initialize Extension HTTP Server (for UVM connection)
    const httpServer = new ExtensionHttpServer(outputProvider.getChannel());
    
    // Start HTTP server if configured
    const autoStartServer = configManager.getWithDefault('server.autoStart', false);
    if (autoStartServer) {
        try {
            statusBarProvider.setConnecting();
            const started = await httpServer.start();
            if (started) {
                outputProvider.log(`Extension HTTP Server started on port ${httpServer.getPort()}`);
                statusBarProvider.setHttpMode();
            }
        } catch (err) {
            outputProvider.logError(`Failed to start HTTP server: ${err}`);
        }
    }

    // Initialize MCP connection router
    const connectionRouter = new ConnectionRouter(outputProvider, configManager);

    // Listen to connection events
    connectionRouter.on('connected', (type) => {
        statusBarProvider.setConnected(type);
        vscode.commands.executeCommand('setContext', 'uvm.connected', true);
        
        if (type === 'native') {
            outputProvider.log('Connected via VS Code native MCP');
            vscode.window.showInformationMessage('Connected to Universal VS MCP (Native Mode)');
        } else if (type === 'stdio') {
            outputProvider.log('Connected via extension stdio');
            vscode.window.showInformationMessage('Connected to Universal VS MCP (Extension Mode)');
        } else if (type === 'http') {
            outputProvider.log('Connected via HTTP');
            vscode.window.showInformationMessage('Connected to Universal VS MCP (HTTP Mode)');
        }
    });

    connectionRouter.on('disconnected', () => {
        statusBarProvider.setDisconnected();
        vscode.commands.executeCommand('setContext', 'uvm.connected', false);
        outputProvider.log('Disconnected from MCP server');
    });

    connectionRouter.on('connection-weak', () => {
        statusBarProvider.setWeak();
        outputProvider.logWarning('Connection is weak');
    });

    // Initialize providers
    const commandProvider = new CommandProvider(connectionRouter, outputProvider, securityManager, httpServer);
    const solutionProvider = new SolutionProvider(connectionRouter);

    // Register commands
    const disposables = [
        // Connection commands
        vscode.commands.registerCommand('uvm.connect', async () => {
            statusBarProvider.setConnecting();
            const connected = await commandProvider.connect();
            if (!connected) {
                statusBarProvider.setError('Connection failed');
                vscode.window.showErrorMessage('Failed to connect to Universal VS MCP');
            }
        }),
        
        vscode.commands.registerCommand('uvm.disconnect', async () => {
            await commandProvider.disconnect();
            if (httpServer.getIsRunning()) {
                await httpServer.stop();
            }
            statusBarProvider.setDisconnected();
        }),
        
        // HTTP Server commands
        vscode.commands.registerCommand('uvm.startServer', async () => {
            try {
                statusBarProvider.setConnecting();
                const started = await httpServer.start();
                if (started) {
                    outputProvider.log(`HTTP Server started on port ${httpServer.getPort()}`);
                    statusBarProvider.setHttpMode();
                    vscode.window.showInformationMessage(`Universal VS MCP HTTP Server started on port ${httpServer.getPort()}`);
                }
            } catch (err) {
                statusBarProvider.setError('Server start failed');
                vscode.window.showErrorMessage(`Failed to start server: ${err}`);
            }
        }),
        
        vscode.commands.registerCommand('uvm.stopServer', async () => {
            await httpServer.stop();
            statusBarProvider.setDisconnected();
            outputProvider.log('HTTP Server stopped');
        }),
        
        // Build commands
        vscode.commands.registerCommand('uvm.build', () => commandProvider.build()),
        vscode.commands.registerCommand('uvm.rebuild', () => commandProvider.rebuild()),
        vscode.commands.registerCommand('uvm.clean', () => commandProvider.clean()),
        
        // Debug commands
        vscode.commands.registerCommand('uvm.debug', () => commandProvider.debug()),
        
        // Query commands
        vscode.commands.registerCommand('uvm.find', () => commandProvider.find()),
        vscode.commands.registerCommand('uvm.getSolutionInfo', () => commandProvider.getSolutionInfo()),
        
        // UI commands
        vscode.commands.registerCommand('uvm.showOutput', () => outputProvider.show()),
        vscode.commands.registerCommand('uvm.showTrustSettings', () => securityManager.showSettings()),

        // Tree view
        vscode.window.registerTreeDataProvider('uvm.solutionExplorer', solutionProvider),

        // Configuration change listener
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('uvm')) {
                configManager.reload();
            }
        })
    ];

    context.subscriptions.push(...disposables);
    context.subscriptions.push(httpServer);

    // Auto-connect if enabled
    if (configManager.isAutoConnect()) {
        setTimeout(async () => {
            statusBarProvider.setConnecting();
            const connected = await commandProvider.connect();
            if (!connected) {
                statusBarProvider.setError('Auto-connect failed');
            }
        }, 3000);
    } else {
        statusBarProvider.setDisconnected();
    }

    outputProvider.log('Universal VS MCP extension activated successfully!');
    outputProvider.log(`Connection strategy: ${configManager.getWithDefault('connectionStrategy', 'prefer-native')}`);
    
    if (httpServer.getIsRunning()) {
        outputProvider.log(`HTTP Server running on port ${httpServer.getPort()}`);
    }
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
    console.log('Universal VS MCP extension is deactivating...');
}
