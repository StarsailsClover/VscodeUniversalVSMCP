import * as vscode from 'vscode';
import { McpClient } from './client';
import { OutputChannelProvider } from '../providers/output';
import { StatusBarProvider } from '../providers/statusbar';

/**
 * Connection Manager - handles connection lifecycle and error recovery
 */
export class ConnectionManager {
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    private reconnectDelay = 5000; // 5 seconds

    constructor(
        private client: McpClient,
        private outputProvider: OutputChannelProvider,
        private statusBarProvider: StatusBarProvider
    ) {
        // Listen to client events
        this.client.on('connected', () => this.onConnected());
        this.client.on('disconnected', (code) => this.onDisconnected(code));
        this.client.on('error', (error) => this.onError(error));
    }

    /**
     * Connect to MCP server
     */
    async connect(): Promise<boolean> {
        try {
            this.statusBarProvider.setConnecting();
            await this.client.connect();
            return true;
        } catch (error) {
            this.outputProvider.logError(`Connection failed: ${error}`);
            this.statusBarProvider.setError('Connection failed');
            
            const result = await vscode.window.showErrorMessage(
                `Failed to connect to UniversalVSMCP: ${error}`,
                'Retry',
                'Show Output',
                'Cancel'
            );

            if (result === 'Retry') {
                return this.connect();
            } else if (result === 'Show Output') {
                this.outputProvider.show();
            }
            
            return false;
        }
    }

    /**
     * Disconnect from MCP server
     */
    async disconnect(): Promise<void> {
        await this.client.disconnect();
    }

    /**
     * Handle successful connection
     */
    private onConnected(): void {
        this.reconnectAttempts = 0;
        this.statusBarProvider.setConnected();
        vscode.commands.executeCommand('setContext', 'uvm.connected', true);
        
        if (vscode.workspace.getConfiguration('uvm').get('showNotifications')) {
            vscode.window.showInformationMessage('Connected to Universal VS MCP');
        }
    }

    /**
     * Handle disconnection
     */
    private onDisconnected(code: number | null): void {
        this.statusBarProvider.setDisconnected();
        vscode.commands.executeCommand('setContext', 'uvm.connected', false);

        // Attempt reconnection if not intentional
        if (code !== 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.outputProvider.log(`Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay);
        }
    }

    /**
     * Handle connection error
     */
    private onError(error: Error): void {
        this.outputProvider.logError(`Connection error: ${error.message}`);
        this.statusBarProvider.setError(error.message);
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.client.isConnected();
    }

    /**
     * Get underlying MCP client
     */
    getClient(): McpClient {
        return this.client;
    }
}
