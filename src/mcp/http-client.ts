import { EventEmitter } from 'events';
import { IMcpConnection, ConnectionType, McpTool } from './connection-interface';
import { OutputChannelProvider } from '../providers/output';
import { ConfigurationManager } from './config';

export class HttpMcpClient extends EventEmitter implements IMcpConnection {
    readonly type = ConnectionType.Http;
    private requestId = 0;
    private tools: McpTool[] = [];
    private _connected = false;
    private baseUrl: string;

    constructor(
        private outputProvider: OutputChannelProvider,
        private configManager: ConfigurationManager
    ) {
        super();
        this.baseUrl = configManager.getHttpUrl();
    }

    isConnected(): boolean {
        return this._connected;
    }

    async connect(): Promise<void> {
        try {
            this.outputProvider.log(`Connecting to HTTP MCP server at ${this.baseUrl}...`);
            const healthUrl = `${this.getHttpRoot()}/health`;
            const response = await fetch(healthUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const health = await response.json() as { status: string };
            this.outputProvider.log(`HTTP server health: ${health.status}`);
            this._connected = true;
            await this.discoverTools();
        } catch (error) {
            this.outputProvider.logError(`HTTP connection failed: ${error}`);
            this._connected = false;
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        this._connected = false;
        this.tools = [];
        this.outputProvider.log('HTTP connection closed');
    }

    private async discoverTools(): Promise<void> {
        try {
            const response = await fetch(`${this.getHttpRoot()}/tools`);
            if (response.ok) {
                const data = await response.json() as { tools?: McpTool[] };
                this.tools = data.tools || [];
                this.outputProvider.log(`Discovered ${this.tools.length} tools via HTTP`);
            }
        } catch (error) {
            this.outputProvider.logWarning(`Failed to discover tools: ${error}`);
            this.tools = [];
        }
    }

    async callTool(name: string, args: any = {}): Promise<any> {
        if (!this._connected) {
            throw new Error('Not connected to MCP server');
        }

        this.requestId++;
        const request = { name, arguments: args };

        try {
            const response = await fetch(`${this.getHttpRoot()}/tools/call`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json() as { success?: boolean; content?: any; error?: string };
            if (data.error) {
                throw new Error(data.error);
            }
            return data.content ?? data;
        } catch (error) {
            this.outputProvider.logError(`Tool call failed: ${error}`);
            throw error;
        }
    }

    getTools(): McpTool[] {
        return this.tools;
    }

    async healthCheck(): Promise<boolean> {
        try {
            const healthUrl = `${this.getHttpRoot()}/health`;
            const response = await fetch(healthUrl);
            return response.ok;
        } catch {
            return false;
        }
    }

    private getHttpRoot(): string {
        return this.baseUrl.replace(/\/sse\/?$/, '').replace(/\/$/, '');
    }
}
