import * as vscode from 'vscode';

/**
 * Security Manager - handles user confirmations and trust settings
 */
export class SecurityManager {
    /**
     * Confirm build operation
     */
    async confirmBuild(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('uvm.security');
        
        if (!config.get('alwaysConfirmBuild')) {
            return true;
        }

        const result = await vscode.window.showWarningMessage(
            'Build Solution?',
            { modal: true, detail: 'This will compile the solution in Visual Studio.' },
            'Build',
            'Cancel'
        );

        return result === 'Build';
    }

    /**
     * Confirm rebuild operation
     */
    async confirmRebuild(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('uvm.security');
        
        if (!config.get('alwaysConfirmBuild')) {
            // Still show confirmation for rebuild as it's more destructive
        }

        const result = await vscode.window.showWarningMessage(
            'Rebuild Solution?',
            { modal: true, detail: 'This will clean and rebuild the entire solution. This operation cannot be undone.' },
            'Rebuild',
            'Cancel'
        );

        return result === 'Rebuild';
    }

    /**
     * Confirm clean operation
     */
    async confirmClean(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('uvm.security');
        
        const result = await vscode.window.showWarningMessage(
            'Clean Solution?',
            { modal: true, detail: 'This will delete all build output files. This operation cannot be undone.' },
            'Clean',
            'Cancel'
        );

        return result === 'Clean';
    }

    /**
     * Show trust settings
     */
    async showSettings(): Promise<void> {
        vscode.commands.executeCommand('workbench.action.openSettings', 'uvm.security');
    }
}
