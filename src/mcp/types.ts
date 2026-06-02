/**
 * MCP (Model Context Protocol) Type Definitions
 */

export interface McpServer {
    name: string;
    version: string;
    tools: McpTool[];
}

export interface McpTool {
    name: string;
    description: string;
    inputSchema?: object;
    outputSchema?: object;
}

export interface McpRequest {
    jsonrpc: '2.0';
    id: number | string;
    method: string;
    params?: any;
}

export interface McpResponse {
    jsonrpc: '2.0';
    id: number | string;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

export interface ToolCallRequest {
    name: string;
    arguments: Record<string, any>;
}

export interface ToolCallResponse {
    content: Array<{
        type: 'text' | 'image';
        text?: string;
        data?: string;
    }>;
    isError?: boolean;
}
