import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { IMcpConnection, ConnectionType, McpTool } from './connection-interface';
import { OutputChannelProvider } from '../providers/output';
import { ConfigurationManager } from './config';

/**
 * MCP Request structure
 */
interface McpRequest {
    jsonrpc: '2.0';
    id: number | string;
    method: string;
    params?: any;
}

/**
 * MCP Response structure
 */
interface McpResponse {
    jsonrpc: '2.0';
    id: number | string;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

/**
 * Stdio MCP Client - communicates with UniversalVSMCP via stdio
 * This is the extension-managed connection
 */
export class StdioMcpClient extends EventEmitter implements IMcpConnection {
    readonly type = ConnectionType.Stdio;
    
    private process: ChildProcess | null = null;
    private requestId = 0;
    private pendingRequests = new Map<number | string, { resolve: (value: any) => void; reject: (reason: any) => void }>();
    private buffer = '';
    private tools: McpTool[] = [];
    private _connected = false;
    private initTimeout: NodeJS.Timeout | null = null;

    constructor(
        private outputProvider: OutputChannelProvider,
        private configManager: ConfigurationManager
    ) {
        super();
    }

    /**
     * Check if connected to MCP server
     */
    isConnected(): boolean {
        return this._connected && this.process !== null && this.process.exitCode === null;
    }

    /**
     * Get available tools
     */
    getTools(): McpTool[] {
        return [...this.tools];
    }

    /**
     * Connect to MCP server via stdio
     */
    async connect(): Promise<void> {
        if (this.isConnected()) {
            this.outputProvider.log('Already connected to MCP server');
            return;
        }

        const serverPath = this.configManager.get('serverPath') || 'universal-vsmcp';
        const transport = this.configManager.get('transport') || 'stdio';

        this.outputProvider.log(`[Stdio] Starting MCP server: ${serverPath} --${transport}`);

        // Clear any existing timeout
        if (this.initTimeout) {
            clearTimeout(this.initTimeout);
            this.initTimeout = null;
        }

        try {
            // Create environment
            const serverEnv = { ...process.env, VS_AUTO_DETECT: 'true' };

            // Spawn the MCP server process
            const spawnOptions: any = {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: serverEnv
            };
            this.process = spawn(serverPath as string, [`--${transport}`], spawnOptions);

            // Handle stdout (MCP responses)
            if (this.process.stdout) {
                this.process.stdout.on('data', (data: Buffer) => {
                    this.handleData(data.toString());
                });
            }

            // Handle stderr (logs)
            if (this.process.stderr) {
                this.process.stderr.on('data', (data: Buffer) => {
                    const log = data.toString().trim();
                    if (log) {
                        this.outputProvider.log(`[UVM] ${log}`);
                    }
                });
            }

            // Handle process exit
            if (this.process) {
                this.process.on('exit', (code) => {
                    this.outputProvider.log(`[Stdio] MCP server exited with code ${code}`);
                    this._connected = false;
                    this.emit('disconnected', code);
                    this.process = null;
                });

                this.process.on('error', (error: Error) => {
                    this.outputProvider.logError(`[Stdio] MCP server error: ${error.message}`);
                    this.emit('error', error);
                });
            }

            // Wait for server to initialize with timeout
            await this.waitForConnection();

            // List available tools
            await this.refreshTools();

            this._connected = true;
            this.emit('connected');
            this.outputProvider.log(`[Stdio] Connected with ${this.tools.length} tools`);

        } catch (error) {
            this.outputProvider.logError(`[Stdio] Failed to start MCP server: ${error}`);
            throw error;
        }
    }

    /**
     * Disconnect from MCP server
     */
    async disconnect(): Promise<void> {
        if (this.initTimeout) {
            clearTimeout(this.initTimeout);
            this.initTimeout = null;
        }

        if (!this.process) {
            return;
        }

        this.outputProvider.log('[Stdio] Disconnecting from MCP server...');

        // Send shutdown notification
        this.sendNotification('shutdown');

        // Kill the process
        this.process.kill('SIGTERM');

        // Wait for graceful shutdown
        await new Promise<void>((resolve) => {
            const proc = this.process;
            if (!proc) {
                resolve();
                return;
            }
            proc.on('exit', () => resolve());
            setTimeout(() => {
                if (this.process) {
                    this.process.kill('SIGKILL');
                }
                resolve();
            }, 3000);
        });

        this._connected = false;
        this.process = null;
        this.tools = [];
        this.pendingRequests.clear();
        this.outputProvider.log('[Stdio] Disconnected');
    }

    /**
     * Call an MCP tool
     */
    async callTool(name: string, args: any = {}): Promise<any> {
        if (!this.isConnected()) {
            throw new Error('Not connected to MCP server');
        }

        this.outputProvider.log(`[Stdio] Calling tool: ${name}`);

        const request: McpRequest = {
            jsonrpc: '2.0',
            id: ++this.requestId,
            method: 'tools/call',
            params: { name, arguments: args }
        };

        return this.sendRequest(request);
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        if (!this.isConnected()) {
            return false;
        }
        
        try {
            // Simple ping-like check
            await this.sendRequest({
                jsonrpc: '2.0',
                id: ++this.requestId,
                method: 'health_check'
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Send a request and wait for response
     */
    private sendRequest(request: McpRequest): Promise<any> {
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(request.id, { resolve, reject });

            const json = JSON.stringify(request);
            this.outputProvider.logDebug(`[Stdio] -> ${json}`);

            const stdin = this.process?.stdin;
            if (stdin) {
                stdin.write(json + '\n', (error) => {
                    if (error) {
                        this.pendingRequests.delete(request.id);
                        reject(error);
                    }
                });
            } else {
                this.pendingRequests.delete(request.id);
                reject(new Error('Process stdin not available'));
            }

            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(request.id)) {
                    this.pendingRequests.delete(request.id);
                    reject(new Error(`Request timeout: ${request.method}`));
                }
            }, 30000);
        });
    }

    /**
     * Send a notification (no response expected)
     */
    private sendNotification(method: string, params?: any): void {
        const notification = {
            jsonrpc: '2.0',
            method,
            params
        };
        const stdin = this.process?.stdin;
        if (stdin) {
            stdin.write(JSON.stringify(notification) + '\n');
        }
    }

    /**
     * Handle incoming data from MCP server
     */
    private handleData(data: string): void {
        this.buffer += data;

        // Process complete JSON-RPC messages (one per line)
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            this.outputProvider.logDebug(`[Stdio] <- ${trimmed}`);

            try {
                const message = JSON.parse(trimmed) as McpResponse;
                this.handleMessage(message);
            } catch (error) {
                this.outputProvider.logError(`[Stdio] Failed to parse MCP message: ${error}`);
            }
        }
    }

    /**
     * Handle parsed MCP message
     */
    private handleMessage(message: McpResponse): void {
        const id = message.id;

        if (id !== undefined && this.pendingRequests.has(id)) {
            const handler = this.pendingRequests.get(id)!;
            this.pendingRequests.delete(id);

            if (message.error) {
                handler.reject(new Error(message.error.message));
            } else {
                handler.resolve(message.result);
            }
        } else {
            this.emit('notification', message);
        }
    }

    /**
     * Wait for MCP server to be ready
     */
    private async waitForConnection(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.initTimeout) {
                clearTimeout(this.initTimeout);
            }

            this.initTimeout = setTimeout(() => {
                if (this.process && this.process.exitCode === null) {
                    this.outputProvider.log('[Stdio] Server process started (timeout)');
                    resolve();
                } else {
                    reject(new Error('MCP server initialization timeout'));
                }
            }, 5000);

            // Also resolve if we get any data
            const checkData = () => {
                if (this.buffer.length > 0) {
                    if (this.initTimeout) {
                        clearTimeout(this.initTimeout);
                        this.initTimeout = null;
                    }
                    this.outputProvider.log('[Stdio] Server responded');
                    resolve();
                } else {
                    setTimeout(checkData, 100);
                }
            };

            setTimeout(checkData, 500);
        });
    }

    /**
     * Refresh list of available tools
     */
    private async refreshTools(): Promise<void> {
        try {
            const request: McpRequest = {
                jsonrpc: '2.0',
                id: ++this.requestId,
                method: 'tools/list'
            };

            const result = await this.sendRequest(request);
            this.tools = result?.tools || [];
        } catch (error) {
            this.outputProvider.logWarning(`[Stdio] Failed to refresh tools: ${error}`);
            this.tools = [];
        }
    }
}
