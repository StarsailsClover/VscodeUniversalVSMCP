import * as vscode from 'vscode';

/**
 * Status Bar Provider - shows connection status in VS Code status bar
 */
export class StatusBarProvider implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'uvm.showOutput';
        this.statusBarItem.show();
    }

    /**
     * Set status to disconnected
     */
    setDisconnected(): void {
        this.statusBarItem.text = '$(debug-disconnect) UVM: Disconnected';
        this.statusBarItem.tooltip = 'Universal VS MCP: Not connected';
        this.statusBarItem.backgroundColor = undefined;
    }

    /**
     * Set status to connecting
     */
    setConnecting(): void {
        this.statusBarItem.text = '$(loading~spin) UVM: Connecting...';
        this.statusBarItem.tooltip = 'Universal VS MCP: Connecting to server...';
        this.statusBarItem.backgroundColor = undefined;
    }

    /**
     * Set status to connected
     */
    setConnected(): void {
        this.statusBarItem.text = '$(debug-start) UVM: Connected';
        this.statusBarItem.tooltip = 'Universal VS MCP: Connected to server';
        this.statusBarItem.backgroundColor = undefined;
    }

    /**
     * Set status to error
     */
    setError(message: string): void {
        this.statusBarItem.text = '$(error) UVM: Error';
        this.statusBarItem.tooltip = `Universal VS MCP: ${message}`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.statusBarItem.dispose();
    }
}
