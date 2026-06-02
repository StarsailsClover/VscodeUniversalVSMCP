import * as vscode from 'vscode';
import * as http from 'http';
import { EventEmitter } from 'events';
import { McpServer, McpTool } from './mcp/types';

/**
 * VS Code Extension HTTP Server
 * Acts as MCP server for UniversalVSMCP connection
 * 
 * This allows UVM to connect to VS Code via HTTP
 * UVM ← HTTP → VS Code Extension ← VS Code API
 */
export class ExtensionHttpServer extends EventEmitter {
    private server: http.Server | null = null;
    private port: number = 5001;
    private isRunning = false;
    private mcpServer: McpServer | null = null;

    constructor(private outputChannel: vscode.OutputChannel) {
        super();
    }

    /**
     * Start HTTP server
     */
    async start(port?: number): Promise<boolean> {
        if (this.isRunning) {
            this.outputChannel.appendLine('[ExtensionHttpServer] Already running');
            return true;
        }

        this.port = port || this.getConfigPort();

        return new Promise((resolve, reject) => {
            try {
                this.server = http.createServer((req, res) => {
                    this.handleRequest(req, res);
                });

                this.server.listen(this.port, () => {
                    this.isRunning = true;
                    this.outputChannel.appendLine(`[ExtensionHttpServer] Started on port ${this.port}`);
                    this.emit('started', this.port);
                    resolve(true);
                });

                this.server.on('error', (err) => {
                    this.outputChannel.appendLine(`[ExtensionHttpServer] Error: ${err.message}`);
                    reject(err);
                });

            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Stop HTTP server
     */
    async stop(): Promise<void> {
        if (!this.isRunning || !this.server) {
            return;
        }

        return new Promise((resolve) => {
            this.server?.close(() => {
                this.isRunning = false;
                this.outputChannel.appendLine('[ExtensionHttpServer] Stopped');
                this.emit('stopped');
                resolve();
            });
        });
    }

    /**
     * Handle HTTP requests
     */
    private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        const url = req.url || '/';
        const method = req.method || 'GET';

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
        }

        this.outputChannel.appendLine(`[ExtensionHttpServer] ${method} ${url}`);

        switch (url) {
            case '/health':
                this.handleHealth(req, res);
                break;
            case '/info':
                this.handleInfo(req, res);
                break;
            case '/tools':
                this.handleTools(req, res);
                break;
            case '/tools/call':
                this.handleToolCall(req, res);
                break;
            default:
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Not found' }));
        }
    }

    /**
     * Health check endpoint
     */
    private handleHealth(req: http.IncomingMessage, res: http.ServerResponse): void {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const health = {
            status: 'healthy',
            workspace: workspacePath ? 'open' : 'none',
            timestamp: new Date().toISOString()
        };

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(health));
    }

    /**
     * Server info endpoint
     */
    private handleInfo(req: http.IncomingMessage, res: http.ServerResponse): void {
        const info = {
            name: 'vscode-universal-vsmcp',
            version: '26.0.3',
            description: 'VS Code Extension MCP Server',
            vscodeVersion: vscode.version,
            workspace: vscode.workspace.workspaceFolders?.[0]?.name || 'none'
        };

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(info));
    }

    /**
     * Tools list endpoint
     */
    private async handleTools(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const tools = [
            { name: 'get_workspace_info', description: 'Get workspace information' },
            { name: 'get_open_files', description: 'Get open files' },
            { name: 'open_file', description: 'Open a file' },
            { name: 'read_file', description: 'Read file content' },
            { name: 'write_file', description: 'Write file content' },
            { name: 'execute_command', description: 'Execute VS Code command' },
            { name: 'start_debugging', description: 'Start debugging' },
            { name: 'run_task', description: 'Run a task' }
        ];

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ tools }));
    }

    /**
     * Tool call endpoint
     */
    private async handleToolCall(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        }

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const request = JSON.parse(body);
                const { name, arguments: args } = request;

                this.outputChannel.appendLine(`[ExtensionHttpServer] Tool call: ${name}`);

                const result = await this.executeTool(name, args);

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ result }));

            } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: String(err) }));
            }
        });
    }

    /**
     * Execute a tool
     */
    private async executeTool(name: string, args: any): Promise<any> {
        switch (name) {
            case 'get_workspace_info':
                return this.getWorkspaceInfo();
            case 'get_open_files':
                return this.getOpenFiles();
            case 'open_file':
                return this.openFile(args?.path, args?.line);
            case 'read_file':
                return this.readFile(args?.path);
            case 'write_file':
                return this.writeFile(args?.path, args?.content);
            case 'execute_command':
                return this.executeCommand(args?.command, args?.args);
            case 'start_debugging':
                return this.startDebugging();
            case 'run_task':
                return this.runTask(args?.name);
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }

    // Tool implementations

    private getWorkspaceInfo(): any {
        const folders = vscode.workspace.workspaceFolders;
        return {
            name: folders?.[0]?.name || 'none',
            path: folders?.[0]?.uri.fsPath || '',
            folders: folders?.map(f => ({ name: f.name, path: f.uri.fsPath })) || []
        };
    }

    private getOpenFiles(): any {
        return vscode.workspace.textDocuments.map(doc => ({
            path: doc.fileName,
            isDirty: doc.isDirty,
            language: doc.languageId
        }));
    }

    private async openFile(path: string, line?: number): Promise<any> {
        if (!path) { return { success: false, error: 'Path required' }; }
        
        const uri = vscode.Uri.file(path);
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc);
        
        if (line) {
            const position = new vscode.Position(line - 1, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position));
        }
        
        return { success: true, path };
    }

    private async readFile(path: string): Promise<any> {
        if (!path) { return { success: false, error: 'Path required' }; }
        
        const uri = vscode.Uri.file(path);
        const content = await vscode.workspace.fs.readFile(uri);
        return { success: true, content: Buffer.from(content).toString('utf8') };
    }

    private async writeFile(path: string, content: string): Promise<any> {
        if (!path || content === undefined) { 
            return { success: false, error: 'Path and content required' }; 
        }
        
        const uri = vscode.Uri.file(path);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
        return { success: true, path };
    }

    private async executeCommand(command: string, args?: any[]): Promise<any> {
        if (!command) { return { success: false, error: 'Command required' }; }
        
        const result = await vscode.commands.executeCommand(command, ...(args || []));
        return { success: true, result };
    }

    private async startDebugging(): Promise<any> {
        await vscode.commands.executeCommand('workbench.action.debug.start');
        return { success: true };
    }

    private async runTask(name: string): Promise<any> {
        if (!name) { return { success: false, error: 'Task name required' }; }
        
        const tasks = await vscode.tasks.fetchTasks();
        const task = tasks.find(t => t.name === name);
        
        if (task) {
            await vscode.tasks.executeTask(task);
            return { success: true, task: name };
        }
        
        return { success: false, error: `Task not found: ${name}` };
    }

    /**
     * Get configured port
     */
    private getConfigPort(): number {
        const config = vscode.workspace.getConfiguration('uvm');
        return config.get('http.port', 5001);
    }

    /**
     * Check if server is running
     */
    getIsRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Get server port
     */
    getPort(): number {
        return this.port;
    }
}
