import * as vscode from 'vscode';
import { ConnectionType } from '../mcp/connection-interface';

/**
 * Status Bar Provider - shows connection status and mode
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
        this.statusBarItem.text = '$(debug-disconnect) UVM';
        this.statusBarItem.tooltip = 'Universal VS MCP: Not connected';
        this.statusBarItem.backgroundColor = undefined;
    }

    /**
     * Set status to connecting
     */
    setConnecting(): void {
        this.statusBarItem.text = '$(loading~spin) UVM: Connecting...';
        this.statusBarItem.tooltip = 'Universal VS MCP: Connecting to agent...';
        this.statusBarItem.backgroundColor = undefined;
    }

    /**
     * Set status to connected with type
     */
    setConnected(type: ConnectionType): void {
        const typeLabel = this.getTypeLabel(type);
        this.statusBarItem.text = `$(debug-start) UVM: ${typeLabel}`;
        this.statusBarItem.tooltip = `Universal VS MCP: Connected via ${typeLabel}`;
        this.statusBarItem.backgroundColor = undefined;
    }

    /**
     * Set status to using native MCP
     */
    setNativeMode(): void {
        this.statusBarItem.text = '$(debug-start) UVM: Native';
        this.statusBarItem.tooltip = 'Universal VS MCP: Using VS Code native MCP';
        this.statusBarItem.backgroundColor = undefined;
    }

    /**
     * Set status to using stdio
     */
    setStdioMode(): void {
        this.statusBarItem.text = '$(debug-start) UVM: Stdio';
        this.statusBarItem.tooltip = 'Universal VS MCP: Using extension stdio connection';
        this.statusBarItem.backgroundColor = undefined;
    }

    /**
     * Set status to error
     */
    setError(message: string): void {
        this.statusBarItem.text = '$(error) UVM';
        this.statusBarItem.tooltip = `Universal VS MCP: ${message}`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }

    /**
     * Set status to connection weak
     */
    setWeak(): void {
        this.statusBarItem.text = '$(warning) UVM';
        this.statusBarItem.tooltip = 'Universal VS MCP: Connection weak';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }

    /**
     * Get human-readable type label
     */
    private getTypeLabel(type: ConnectionType): string {
        switch (type) {
            case ConnectionType.Native:
                return 'Native';
            case ConnectionType.Stdio:
                return 'Stdio';
            case ConnectionType.Http:
                return 'HTTP';
            default:
                return 'Connected';
        }
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.statusBarItem.dispose();
    }
}
