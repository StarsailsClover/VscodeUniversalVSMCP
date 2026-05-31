import * as vscode from 'vscode';
import { IMcpConnection, ConnectionType, McpTool } from './connection-interface';

/**
 * Native MCP Detector - detects and connects to VS Code's built-in MCP
 */
export class NativeMcpDetector {
    private static readonly MCP_EXTENSION_ID = 'vscode.mcp';
    private static readonly MCP_API_VERSION = 1;

    constructor(private outputChannel: vscode.OutputChannel) {}

    /**
     * Check if VS Code has native MCP support
     */
    async hasNativeMcpSupport(): Promise<boolean> {
        try {
            // Check VS Code version (native MCP available in 1.90+)
            const vscodeVersion = vscode.version;
            const [major, minor] = vscodeVersion.split('.').map(Number);
            
            if (major < 1 || (major === 1 && minor < 90)) {
                this.outputChannel.appendLine(`[Native MCP] VS Code ${vscodeVersion} does not support native MCP`);
                return false;
            }

            // Check for mcp.json configuration
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return false;
            }

            for (const folder of workspaceFolders) {
                const mcpJsonUri = vscode.Uri.joinPath(folder.uri, 'mcp.json');
                try {
                    await vscode.workspace.fs.stat(mcpJsonUri);
                    this.outputChannel.appendLine(`[Native MCP] Found mcp.json in ${folder.name}`);
                    return true;
                } catch {
                    // File doesn't exist, continue checking
                }
            }

            this.outputChannel.appendLine('[Native MCP] No mcp.json found in workspace');
            return false;
        } catch (error) {
            this.outputChannel.appendLine(`[Native MCP] Error checking support: ${error}`);
            return false;
        }
    }

    /**
     * Try to get native MCP client
     * This uses VS Code's proposed API for MCP
     */
    async tryGetNativeClient(): Promise<IMcpConnection | null> {
        try {
            // Access VS Code's internal MCP API (if available)
            const mcpApi = (vscode as any).mcp;
            
            if (!mcpApi) {
                this.outputChannel.appendLine('[Native MCP] VS Code MCP API not available');
                return null;
            }

            // Look for universal-vsmcp server
            const servers = await mcpApi.getServers();
            const uvmServer = servers.find((s: any) => 
                s.name === 'universal-vsmcp' || 
                s.id === 'universal-vsmcp'
            );

            if (!uvmServer) {
                this.outputChannel.appendLine('[Native MCP] universal-vsmcp not found in native MCP servers');
                return null;
            }

            if (!uvmServer.connected) {
                this.outputChannel.appendLine('[Native MCP] universal-vsmcp found but not connected');
                return null;
            }

            this.outputChannel.appendLine('[Native MCP] Found active universal-vsmcp connection');
            return new NativeMcpConnection(uvmServer, this.outputChannel);

        } catch (error) {
            this.outputChannel.appendLine(`[Native MCP] Error getting native client: ${error}`);
            return null;
        }
    }

    /**
     * Get connection info from native MCP
     */
    async getNativeConnectionInfo(): Promise<{ available: boolean; serverName?: string; connected?: boolean }> {
        try {
            const mcpApi = (vscode as any).mcp;
            if (!mcpApi) {
                return { available: false };
            }

            const servers = await mcpApi.getServers();
            const uvmServer = servers.find((s: any) => 
                s.name === 'universal-vsmcp' || s.id === 'universal-vsmcp'
            );

            if (!uvmServer) {
                return { available: true, serverName: undefined, connected: false };
            }

            return {
                available: true,
                serverName: uvmServer.name,
                connected: uvmServer.connected
            };
        } catch {
            return { available: false };
        }
    }
}

/**
 * Native MCP Connection - wraps VS Code's built-in MCP client
 */
class NativeMcpConnection implements IMcpConnection {
    readonly type = ConnectionType.Native;
    private tools: McpTool[] = [];

    constructor(
        private server: any,
        private outputChannel: vscode.OutputChannel
    ) {}

    isConnected(): boolean {
        return this.server.connected === true;
    }

    async connect(): Promise<void> {
        // Native MCP is already managed by VS Code
        this.outputChannel.appendLine('[Native MCP] Using existing VS Code connection');
        await this.refreshTools();
    }

    async disconnect(): Promise<void> {
        // We don't disconnect native MCP as it's managed by VS Code
        this.outputChannel.appendLine('[Native MCP] Not disconnecting (managed by VS Code)');
    }

    async callTool(name: string, args: any = {}): Promise<any> {
        if (!this.isConnected()) {
            throw new Error('Native MCP not connected');
        }

        this.outputChannel.appendLine(`[Native MCP] Calling tool: ${name}`);
        
        try {
            const mcpApi = (vscode as any).mcp;
            const result = await mcpApi.callTool(this.server.id, name, args);
            return result;
        } catch (error) {
            this.outputChannel.appendLine(`[Native MCP] Tool call failed: ${error}`);
            throw error;
        }
    }

    getTools(): McpTool[] {
        return [...this.tools];
    }

    async healthCheck(): Promise<boolean> {
        try {
            const mcpApi = (vscode as any).mcp;
            const servers = await mcpApi.getServers();
            const server = servers.find((s: any) => s.id === this.server.id);
            return server?.connected === true;
        } catch {
            return false;
        }
    }

    private async refreshTools(): Promise<void> {
        try {
            const mcpApi = (vscode as any).mcp;
            const tools = await mcpApi.listTools(this.server.id);
            this.tools = tools || [];
            this.outputChannel.appendLine(`[Native MCP] Discovered ${this.tools.length} tools`);
        } catch (error) {
            this.outputChannel.appendLine(`[Native MCP] Failed to list tools: ${error}`);
            this.tools = [];
        }
    }
}
