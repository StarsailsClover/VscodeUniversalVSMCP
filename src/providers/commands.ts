import * as vscode from 'vscode';
import { ConnectionRouter } from '../mcp/connection-router';
import { OutputChannelProvider } from './output';
import { SecurityManager } from '../security/trust';

/**
 * Command Provider - handles all VS Code commands
 */
export class CommandProvider {
    constructor(
        private connectionRouter: ConnectionRouter,
        private outputProvider: OutputChannelProvider,
        private securityManager: SecurityManager
    ) {}

    /**
     * Build solution
     */
    async build(): Promise<void> {
        if (!this.connectionRouter.isConnected()) {
            const result = await vscode.window.showWarningMessage(
                'Not connected to Universal VS MCP',
                'Connect Now',
                'Cancel'
            );
            if (result === 'Connect Now') {
                const connected = await this.connectionRouter.connect();
                if (!connected) return;
            } else {
                return;
            }
        }

        if (await this.securityManager.confirmBuild()) {
            this.outputProvider.log('Building solution...');
            
            try {
                const result = await this.connectionRouter.callTool('build_solution', {});
                this.outputProvider.log(`Build result: ${JSON.stringify(result)}`);
                vscode.window.showInformationMessage('Build completed successfully');
            } catch (error) {
                this.outputProvider.logError(`Build failed: ${error}`);
                vscode.window.showErrorMessage(`Build failed: ${error}`);
            }
        }
    }

    /**
     * Rebuild solution
     */
    async rebuild(): Promise<void> {
        if (!this.connectionRouter.isConnected()) {
            vscode.window.showWarningMessage('Not connected to Universal VS MCP');
            return;
        }

        if (await this.securityManager.confirmRebuild()) {
            this.outputProvider.log('Rebuilding solution...');
            
            try {
                const result = await this.connectionRouter.callTool('rebuild_solution', {});
                this.outputProvider.log(`Rebuild result: ${JSON.stringify(result)}`);
                vscode.window.showInformationMessage('Rebuild completed');
            } catch (error) {
                this.outputProvider.logError(`Rebuild failed: ${error}`);
                vscode.window.showErrorMessage(`Rebuild failed: ${error}`);
            }
        }
    }

    /**
     * Clean solution
     */
    async clean(): Promise<void> {
        if (!this.connectionRouter.isConnected()) {
            vscode.window.showWarningMessage('Not connected to Universal VS MCP');
            return;
        }

        if (await this.securityManager.confirmClean()) {
            this.outputProvider.log('Cleaning solution...');
            
            try {
                const result = await this.connectionRouter.callTool('clean_solution', {});
                this.outputProvider.log(`Clean result: ${JSON.stringify(result)}`);
                vscode.window.showInformationMessage('Clean completed');
            } catch (error) {
                this.outputProvider.logError(`Clean failed: ${error}`);
                vscode.window.showErrorMessage(`Clean failed: ${error}`);
            }
        }
    }

    /**
     * Start debugging
     */
    async debug(): Promise<void> {
        if (!this.connectionRouter.isConnected()) {
            vscode.window.showWarningMessage('Not connected to Universal VS MCP');
            return;
        }

        this.outputProvider.log('Starting debug session...');
        
        try {
            await this.connectionRouter.callTool('start_debugging', {});
            vscode.window.showInformationMessage('Debug session started in Visual Studio');
        } catch (error) {
            this.outputProvider.logError(`Debug failed: ${error}`);
            vscode.window.showErrorMessage(`Debug failed: ${error}`);
        }
    }

    /**
     * Find in solution
     */
    async find(): Promise<void> {
        if (!this.connectionRouter.isConnected()) {
            vscode.window.showWarningMessage('Not connected to Universal VS MCP');
            return;
        }

        const searchTerm = await vscode.window.showInputBox({
            prompt: 'Enter search term',
            placeHolder: 'Search in solution...'
        });

        if (!searchTerm) {
            return;
        }

        this.outputProvider.log(`Searching for: ${searchTerm}`);
        
        try {
            const result = await this.connectionRouter.callTool('find_in_files', {
                searchText: searchTerm
            });
            this.outputProvider.log(`Find result: ${JSON.stringify(result)}`);
        } catch (error) {
            this.outputProvider.logError(`Find failed: ${error}`);
        }
    }

    /**
     * Get solution information
     */
    async getSolutionInfo(): Promise<void> {
        if (!this.connectionRouter.isConnected()) {
            vscode.window.showWarningMessage('Not connected to Universal VS MCP');
            return;
        }

        try {
            const result = await this.connectionRouter.callTool('get_solution_info', {});
            
            const panel = vscode.window.createWebviewPanel(
                'uvmSolutionInfo',
                'Solution Info',
                vscode.ViewColumn.One,
                {}
            );

            panel.webview.html = this.getSolutionInfoHtml(result);
        } catch (error) {
            this.outputProvider.logError(`Get solution info failed: ${error}`);
            vscode.window.showErrorMessage(`Failed to get solution info: ${error}`);
        }
    }

    /**
     * Generate HTML for solution info webview
     */
    private getSolutionInfoHtml(info: any): string {
        return `<!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: sans-serif; padding: 20px; }
                h1 { color: #333; }
                pre { background: #f5f5f5; padding: 10px; border-radius: 4px; }
            </style>
        </head>
        <body>
            <h1>Solution Information</h1>
            <pre>${JSON.stringify(info, null, 2)}</pre>
        </body>
        </html>`;
    }
}
