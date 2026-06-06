import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { IMcpConnection, ConnectionType, ConnectionStatus } from './connection-interface';
import { NativeMcpDetector } from './native-detector';
import { StdioMcpClient } from './stdio-client';
import { HttpMcpClient } from './http-client';
import { OutputChannelProvider } from '../providers/output';
import { ConfigurationManager } from './config';

/**
 * Connection Strategy
 */
export enum ConnectionStrategy {
    /** Prefer native MCP, fallback to stdio */
    PreferNative = 'prefer-native',
    /** Always use stdio (extension-managed) */
    AlwaysStdio = 'always-stdio',
    /** Try native only, fail if not available */
    NativeOnly = 'native-only',
    /** Use HTTP connection */
    Http = 'http',
    /** Prefer HTTP, fallback to stdio */
    PreferHttp = 'prefer-http'
}

/**
 * Connection Router - manages connection lifecycle and routing
 */
export class ConnectionRouter extends EventEmitter {
    private connection: IMcpConnection | null = null;
    private nativeDetector: NativeMcpDetector;
    private strategy: ConnectionStrategy;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;

    constructor(
        private outputProvider: OutputChannelProvider,
        private configManager: ConfigurationManager
    ) {
        super();
        this.nativeDetector = new NativeMcpDetector(outputProvider.getChannel());
        this.strategy = this.configManager.get('connectionStrategy') || ConnectionStrategy.PreferNative;
    }

    /**
     * Get current connection
     */
    getConnection(): IMcpConnection | null {
        return this.connection;
    }

    /**
     * Get connection type
     */
    getConnectionType(): ConnectionType {
        return this.connection?.type || ConnectionType.None;
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.connection?.isConnected() ?? false;
    }

    /**
     * Get connection status
     */
    async getStatus(): Promise<ConnectionStatus> {
        if (!this.connection) {
            return {
                type: ConnectionType.None,
                connected: false,
                healthy: false,
                toolCount: 0
            };
        }

        const connected = this.connection.isConnected();
        const healthy = connected ? await this.connection.healthCheck() : false;
        const tools = this.connection.getTools();

        return {
            type: this.connection.type,
            connected,
            healthy,
            toolCount: tools.length
        };
    }

    /**
     * Connect using appropriate strategy
     */
    async connect(): Promise<boolean> {
        this.outputProvider.log(`Connection strategy: ${this.strategy}`);

        switch (this.strategy) {
            case ConnectionStrategy.PreferNative:
                return await this.connectPreferNative();
            case ConnectionStrategy.AlwaysStdio:
                return await this.connectAlwaysStdio();
            case ConnectionStrategy.NativeOnly:
                return await this.connectNativeOnly();
            case ConnectionStrategy.Http:
            case ConnectionStrategy.PreferHttp:
                return await this.connectHttp();
            default:
                return await this.connectPreferNative();
        }
    }

    /**
     * Disconnect
     */
    async disconnect(): Promise<void> {
        if (this.connection) {
            this.outputProvider.log(`Disconnecting from ${this.connection.type} connection`);
            await this.connection.disconnect();
            this.connection = null;
            this.emit('disconnected');
        }
    }

    /**
     * Call a tool (with automatic fallback)
     */
    async callTool(name: string, args: any = {}): Promise<any> {
        // If no connection, try to connect
        if (!this.isConnected()) {
            this.outputProvider.log('No active connection, attempting to connect...');
            const connected = await this.connect();
            if (!connected) {
                throw new Error('Failed to establish connection');
            }
        }

        // If connection becomes unhealthy, try to reconnect
        const healthy = await this.connection!.healthCheck();
        if (!healthy) {
            this.outputProvider.logWarning('Connection unhealthy, attempting reconnect...');
            await this.reconnect();
        }

        return this.connection!.callTool(name, args);
    }

    /**
     * Prefer native strategy
     */
    private async connectPreferNative(): Promise<boolean> {
        // Step 1: Try native MCP
        this.outputProvider.log('Checking for native MCP...');
        const nativeClient = await this.nativeDetector.tryGetNativeClient();
        
        if (nativeClient) {
            this.outputProvider.log('✓ Found native MCP connection');
            this.connection = nativeClient;
            
            try {
                await this.connection.connect();
                this.emit('connected', ConnectionType.Native);
                this.setupHealthCheck();
                return true;
            } catch (error) {
                this.outputProvider.logWarning(`Native MCP connection failed: ${error}`);
                this.connection = null;
            }
        }

        // Step 2: Fallback to stdio
        this.outputProvider.log('Native MCP not available, falling back to stdio...');
        return await this.connectStdio();
    }

    /**
     * Always stdio strategy
     */
    private async connectAlwaysStdio(): Promise<boolean> {
        return await this.connectStdio();
    }

    /**
     * Native only strategy
     */
    private async connectNativeOnly(): Promise<boolean> {
        const nativeClient = await this.nativeDetector.tryGetNativeClient();
        
        if (!nativeClient) {
            this.outputProvider.logError('Native MCP not available and strategy is native-only');
            return false;
        }

        this.connection = nativeClient;
        
        try {
            await this.connection.connect();
            this.emit('connected', ConnectionType.Native);
            this.setupHealthCheck();
            return true;
        } catch (error) {
            this.outputProvider.logError(`Native MCP connection failed: ${error}`);
            this.connection = null;
            return false;
        }
    }

    /**
     * Connect via stdio
     */
    private async connectStdio(): Promise<boolean> {
        try {
            this.outputProvider.log('Starting stdio connection...');
            
            const stdioClient = new StdioMcpClient(
                this.outputProvider,
                this.configManager
            );

            this.connection = stdioClient;
            await this.connection.connect();
            
            this.emit('connected', ConnectionType.Stdio);
            this.reconnectAttempts = 0;
            this.setupHealthCheck();
            
            return true;
        } catch (error) {
            this.outputProvider.logError(`Stdio connection failed: ${error}`);
            this.connection = null;
            
            // Try to reconnect
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                this.outputProvider.log(`Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                await new Promise(r => setTimeout(r, 2000));
                return await this.connectStdio();
            }
            
            return false;
        }
    }

    /**
     * Connect via HTTP
     */
    private async connectHttp(): Promise<boolean> {
        try {
            this.outputProvider.log('Starting HTTP connection...');
            
            const httpClient = new HttpMcpClient(
                this.outputProvider,
                this.configManager
            );

            this.connection = httpClient;
            await this.connection.connect();
            
            this.emit('connected', ConnectionType.Http);
            this.reconnectAttempts = 0;
            this.setupHealthCheck();
            
            return true;
        } catch (error) {
            this.outputProvider.logError(`HTTP connection failed: ${error}`);
            this.connection = null;
            
            // For PreferHttp strategy, fallback to stdio
            if (this.strategy === ConnectionStrategy.PreferHttp) {
                this.outputProvider.log('HTTP failed, falling back to stdio...');
                return await this.connectStdio();
            }
            
            return false;
        }
    }

    /**
     * Reconnect
     */
    private async reconnect(): Promise<boolean> {
        await this.disconnect();
        await new Promise(r => setTimeout(r, 1000));
        return await this.connect();
    }

    /**
     * Setup periodic health check
     */
    private setupHealthCheck(): void {
        // Health check every 30 seconds
        setInterval(async () => {
            if (!this.connection) return;
            
            const healthy = await this.connection.healthCheck();
            if (!healthy && this.connection.isConnected()) {
                this.outputProvider.logWarning('Health check failed, connection may be stale');
                this.emit('connection-weak');
            }
        }, 30000);
    }
}
