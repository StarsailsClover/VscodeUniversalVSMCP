import * as vscode from 'vscode';
import { McpClient } from './mcp/client';
import { ConnectionManager } from './mcp/connection';
import { CommandProvider } from './providers/commands';
import { SolutionProvider } from './providers/solution';
import { OutputChannelProvider } from './providers/output';
import { StatusBarProvider } from './providers/statusbar';
import { ConfigurationManager } from './mcp/config';
import { SecurityManager } from './security/trust';

/**
 * Extension activation entry point
 * Called when VS Code activates the extension
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('Universal VS MCP extension is activating...');

    // Initialize providers
    const outputProvider = new OutputChannelProvider();
    const statusBarProvider = new StatusBarProvider();
    const configManager = new ConfigurationManager();
    const securityManager = new SecurityManager();

    // Add to subscriptions for disposal
    context.subscriptions.push(outputProvider, statusBarProvider);

    // Check workspace trust
    if (!vscode.workspace.isTrusted) {
        const result = await vscode.window.showWarningMessage(
            'Universal VS MCP requires a trusted workspace for file operations.',
            'Trust Workspace',
            'Later'
        );
        if (result === 'Trust Workspace') {
            vscode.commands.executeCommand('workbench.trust.manage');
        }
        outputProvider.log('Extension activated in untrusted workspace. Some features disabled.');
        return;
    }

    // Initialize MCP client
    const mcpClient = new McpClient(outputProvider, configManager);
    const connectionManager = new ConnectionManager(mcpClient, outputProvider, statusBarProvider);

    // Initialize providers
    const commandProvider = new CommandProvider(connectionManager, outputProvider, securityManager);
    const solutionProvider = new SolutionProvider(mcpClient);

    // Register commands
    const disposables = [
        // Connection commands
        vscode.commands.registerCommand('uvm.connect', () => commandProvider.connect()),
        vscode.commands.registerCommand('uvm.disconnect', () => commandProvider.disconnect()),
        
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

        // Auto-connect if configured
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('uvm')) {
                configManager.reload();
            }
        })
    ];

    context.subscriptions.push(...disposables);

    // Auto-connect if enabled
    if (configManager.get('autoConnect')) {
        setTimeout(() => {
            commandProvider.connect();
        }, 3000); // Delay to allow VS Code to fully initialize
    }

    outputProvider.log('Universal VS MCP extension activated successfully!');
    statusBarProvider.setDisconnected();
}

/**
 * Extension deactivation
 * Called when VS Code shuts down or extension is disabled
 */
export function deactivate(): void {
    console.log('Universal VS MCP extension is deactivating...');
}
