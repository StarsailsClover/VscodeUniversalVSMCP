import { spawn, ChildProcess } from 'child_process';
import * as vscode from 'vscode';
import { EventEmitter } from 'events';
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
 * MCP Tool definition
 */
export interface McpTool {
    name: string;
    description: string;
    inputSchema: any;
}

/**
 * MCP Client - communicates with UniversalVSMCP via stdio
 */
export class McpClient extends EventEmitter {
    private process: ChildProcess | null = null;
    private requestId = 0;
    private pendingRequests = new Map<number | string, { resolve: (value: any) => void; reject: (reason: any) => void }>();
    private buffer = '';
    private tools: McpTool[] = [];
    private connected = false;

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
        return this.connected && this.process !== null && this.process.exitCode === null;
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

        this.outputProvider.log(`Starting MCP server: ${serverPath} --${transport}`);

        try {
            // Create environment
            const serverEnv = { ...process.env, VS_AUTO_DETECT: 'true' };

            // Spawn the MCP server process
            const spawnOptions = {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: serverEnv
            };
            this.process = spawn(serverPath as string, [`--${transport}`], spawnOptions as any);

            // Handle stdout (MCP responses)
            const stdout = this.process.stdout;
            if (stdout) {
                stdout.on('data', (data: Buffer) => {
                    this.handleData(data.toString());
                });
            }

            // Handle stderr (logs)
            const stderr = this.process.stderr;
            if (stderr) {
                stderr.on('data', (data: Buffer) => {
                    const log = data.toString().trim();
                    if (log) {
                        this.outputProvider.log(`[UVM] ${log}`);
                    }
                });
            }

            // Handle process exit
            const proc = this.process;
            if (proc) {
                proc.on('exit', (code) => {
                    this.outputProvider.log(`MCP server exited with code ${code}`);
                    this.connected = false;
                    this.emit('disconnected', code);
                    this.process = null;
                });

                proc.on('error', (error: Error) => {
                    this.outputProvider.logError(`MCP server error: ${error.message}`);
                    this.emit('error', error);
                });
            }

            // Wait for server to initialize
            await this.waitForConnection();

            // List available tools
            await this.refreshTools();

            this.connected = true;
            this.emit('connected');
            this.outputProvider.log(`Connected to MCP server with ${this.tools.length} tools`);

        } catch (error) {
            this.outputProvider.logError(`Failed to start MCP server: ${error}`);
            throw error;
        }
    }

    /**
     * Disconnect from MCP server
     */
    async disconnect(): Promise<void> {
        if (!this.process) {
            return;
        }

        this.outputProvider.log('Disconnecting from MCP server...');

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

        this.connected = false;
        this.process = null;
        this.tools = [];
        this.pendingRequests.clear();
        this.outputProvider.log('Disconnected from MCP server');
    }

    /**
     * Call an MCP tool
     */
    async callTool(name: string, args: any = {}): Promise<any> {
        if (!this.isConnected()) {
            throw new Error('Not connected to MCP server');
        }

        this.outputProvider.log(`Calling tool: ${name}`);

        const request: McpRequest = {
            jsonrpc: '2.0',
            id: ++this.requestId,
            method: 'tools/call',
            params: { name, arguments: args }
        };

        return this.sendRequest(request);
    }

    /**
     * Send a request and wait for response
     */
    private sendRequest(request: McpRequest): Promise<any> {
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(request.id, { resolve, reject });

            const json = JSON.stringify(request);
            this.outputProvider.logDebug(`-> ${json}`);

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
        this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            this.outputProvider.logDebug(`<- ${trimmed}`);

            try {
                const message = JSON.parse(trimmed) as McpResponse;
                this.handleMessage(message);
            } catch (error) {
                this.outputProvider.logError(`Failed to parse MCP message: ${error}`);
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
            // Handle notifications (no id)
            this.emit('notification', message);
        }
    }

    /**
     * Wait for MCP server to be ready
     */
    private async waitForConnection(): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('MCP server initialization timeout'));
            }, 10000);

            const checkReady = () => {
                // Check if we received any data indicating server is ready
                if (this.buffer.includes('UniversalVSMCP') || this.buffer.includes('MCP Server')) {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    setTimeout(checkReady, 500);
                }
            };

            checkReady();
        });
    }

    /**
     * Refresh list of available tools
     */
    private async refreshTools(): Promise<void> {
        const request: McpRequest = {
            jsonrpc: '2.0',
            id: ++this.requestId,
            method: 'tools/list'
        };

        const result = await this.sendRequest(request);
        this.tools = result?.tools || [];
    }
}
