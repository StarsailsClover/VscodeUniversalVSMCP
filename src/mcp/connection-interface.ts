/**
 * Connection Interface - Abstraction for different MCP connection types
 * Supports: Native MCP (VS Code built-in), Extension stdio, HTTP
 */

export interface IMcpConnection {
    /**
     * Get connection type
     */
    readonly type: ConnectionType;
    
    /**
     * Check if connection is active
     */
    isConnected(): boolean;
    
    /**
     * Connect to MCP server
     */
    connect(): Promise<void>;
    
    /**
     * Disconnect from MCP server
     */
    disconnect(): Promise<void>;
    
    /**
     * Call an MCP tool
     */
    callTool(name: string, args?: any): Promise<any>;
    
    /**
     * Get available tools
     */
    getTools(): McpTool[];
    
    /**
     * Check if connection is healthy
     */
    healthCheck(): Promise<boolean>;
}

/**
 * Connection types
 */
export enum ConnectionType {
    /** VS Code built-in native MCP */
    Native = 'native',
    /** Extension stdio subprocess */
    Stdio = 'stdio',
    /** HTTP transport */
    Http = 'http',
    /** No connection */
    None = 'none'
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
 * Connection status
 */
export interface ConnectionStatus {
    type: ConnectionType;
    connected: boolean;
    healthy: boolean;
    toolCount: number;
    lastError?: string;
}
