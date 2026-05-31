import * as vscode from 'vscode';

/**
 * Output Channel Provider - manages MCP communication logs
 */
export class OutputChannelProvider implements vscode.Disposable {
    private channel: vscode.OutputChannel;
    private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

    constructor() {
        this.channel = vscode.window.createOutputChannel('Universal VS MCP', 'uvm');
        this.loadConfiguration();
    }

    /**
     * Load configuration
     */
    private loadConfiguration(): void {
        const config = vscode.workspace.getConfiguration('uvm');
        this.logLevel = config.get('logLevel') || 'info';
    }

    /**
     * Show output channel
     */
    show(): void {
        this.channel.show();
    }

    /**
     * Get the underlying VS Code output channel
     */
    getChannel(): vscode.OutputChannel {
        return this.channel;
    }

    /**
     * Clear output
     */
    clear(): void {
        this.channel.clear();
    }

    /**
     * Log debug message
     */
    logDebug(message: string): void {
        if (this.shouldLog('debug')) {
            this.append('DEBUG', message);
        }
    }

    /**
     * Log info message
     */
    log(message: string): void {
        if (this.shouldLog('info')) {
            this.append('INFO', message);
        }
    }

    /**
     * Log warning message
     */
    logWarning(message: string): void {
        if (this.shouldLog('warn')) {
            this.append('WARN', message);
        }
    }

    /**
     * Log error message
     */
    logError(message: string): void {
        if (this.shouldLog('error')) {
            this.append('ERROR', message);
        }
    }

    /**
     * Append formatted message to output
     */
    private append(level: string, message: string): void {
        const timestamp = new Date().toISOString();
        this.channel.appendLine(`[${timestamp}] [${level}] ${message}`);
    }

    /**
     * Check if message should be logged based on current log level
     */
    private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentIndex = levels.indexOf(this.logLevel);
        const messageIndex = levels.indexOf(level);
        return messageIndex >= currentIndex;
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.channel.dispose();
    }
}
