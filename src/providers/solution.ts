import * as vscode from 'vscode';
import { McpClient } from '../mcp/client';

/**
 * Solution Item for Tree View
 */
export class SolutionItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'solution' | 'project' | 'file' | 'folder',
        public readonly path?: string
    ) {
        super(label, collapsibleState);
        
        // Set icon based on type
        switch (type) {
            case 'solution':
                this.iconPath = new vscode.ThemeIcon('project');
                break;
            case 'project':
                this.iconPath = new vscode.ThemeIcon('symbol-class');
                break;
            case 'file':
                this.iconPath = new vscode.ThemeIcon('file');
                break;
            case 'folder':
                this.iconPath = new vscode.ThemeIcon('folder');
                break;
        }

        // Set context value for menu contributions
        this.contextValue = type;

        // Set tooltip
        if (path) {
            this.tooltip = path;
        }
    }
}

/**
 * Solution Provider - Tree data provider for Solution Explorer
 */
export class SolutionProvider implements vscode.TreeDataProvider<SolutionItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SolutionItem | undefined | null | void> = new vscode.EventEmitter<SolutionItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SolutionItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private client: McpClient) {
        // Refresh when connection state changes
        this.client.on('connected', () => this.refresh());
        this.client.on('disconnected', () => this.refresh());
    }

    /**
     * Get tree item for element
     */
    getTreeItem(element: SolutionItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children of element
     */
    async getChildren(element?: SolutionItem): Promise<SolutionItem[]> {
        if (!this.client.isConnected()) {
            return [];
        }

        try {
            if (!element) {
                // Root level - get solution info
                return await this.getSolutionRoot();
            } else if (element.type === 'solution') {
                // Get projects in solution
                return await this.getProjects();
            } else if (element.type === 'project') {
                // Get files in project
                return await this.getProjectFiles(element.path || '');
            }
        } catch (error) {
            console.error('Failed to get children:', error);
        }

        return [];
    }

    /**
     * Refresh tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Get solution root items
     */
    private async getSolutionRoot(): Promise<SolutionItem[]> {
        try {
            const result = await this.client.callTool('get_solution_info', {});
            
            if (!result || !result.solutionName) {
                return [new SolutionItem('No solution open', vscode.TreeItemCollapsibleState.None, 'solution')];
            }

            return [
                new SolutionItem(
                    result.solutionName,
                    vscode.TreeItemCollapsibleState.Expanded,
                    'solution',
                    result.solutionPath
                )
            ];
        } catch (error) {
            return [new SolutionItem('Error loading solution', vscode.TreeItemCollapsibleState.None, 'solution')];
        }
    }

    /**
     * Get projects in solution
     */
    private async getProjects(): Promise<SolutionItem[]> {
        try {
            const result = await this.client.callTool('get_solution_projects', {});
            
            if (!result || !Array.isArray(result.projects)) {
                return [];
            }

            return result.projects.map((project: any) => new SolutionItem(
                project.name,
                vscode.TreeItemCollapsibleState.Collapsed,
                'project',
                project.fullName
            ));
        } catch (error) {
            return [];
        }
    }

    /**
     * Get files in project
     */
    private async getProjectFiles(projectPath: string): Promise<SolutionItem[]> {
        try {
            const result = await this.client.callTool('get_project_files', {
                projectName: projectPath
            });
            
            if (!result || !Array.isArray(result.files)) {
                return [];
            }

            return result.files.map((file: any) => new SolutionItem(
                file.name,
                vscode.TreeItemCollapsibleState.None,
                'file',
                file.fullPath
            ));
        } catch (error) {
            return [];
        }
    }
}
