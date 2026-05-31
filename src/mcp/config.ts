import * as vscode from 'vscode';

/**
 * Configuration Manager - handles extension settings
 */
export class ConfigurationManager {
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration('uvm');
    }

    /**
     * Get configuration value
     */
    get<T>(key: string): T | undefined {
        return this.config.get<T>(key);
    }

    /**
     * Get configuration value with default
     */
    getWithDefault<T>(key: string, defaultValue: T): T {
        return this.config.get<T>(key) ?? defaultValue;
    }

    /**
     * Set configuration value
     */
    async set<T>(key: string, value: T, global = false): Promise<void> {
        await this.config.update(key, value, global);
    }

    /**
     * Reload configuration
     */
    reload(): void {
        this.config = vscode.workspace.getConfiguration('uvm');
    }

    /**
     * Get server executable path
     */
    getServerPath(): string {
        return this.getWithDefault('serverPath', 'universal-vsmcp');
    }

    /**
     * Get transport mode
     */
    getTransport(): 'stdio' | 'http' {
        return this.getWithDefault('transport', 'stdio');
    }

    /**
     * Get HTTP URL
     */
    getHttpUrl(): string {
        return this.getWithDefault('http.url', 'http://localhost:5000/sse');
    }

    /**
     * Check if auto-connect is enabled
     */
    isAutoConnect(): boolean {
        return this.getWithDefault('autoConnect', false);
    }

    /**
     * Check if notifications are enabled
     */
    isShowNotifications(): boolean {
        return this.getWithDefault('showNotifications', true);
    }

    /**
     * Get log level
     */
    getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
        return this.getWithDefault('logLevel', 'info');
    }
}
