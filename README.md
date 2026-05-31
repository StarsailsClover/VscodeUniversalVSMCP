# Universal VS MCP for VS Code

Connect AI Agents to Visual Studio 2026/2022 directly from VS Code through the Model Context Protocol (MCP).

## Features

- 🔗 **Connect to VS** - Control Visual Studio from VS Code
- 🔨 **Build & Debug** - Build solutions and start debugging sessions
- 📁 **Solution Explorer** - Browse VS solution structure
- 🔍 **Find in Solution** - Search across the entire solution
- 🛡️ **Security** - Workspace trust and user confirmation for sensitive operations
- 📊 **Status Bar** - Connection status at a glance
- 📝 **Output Channel** - Full MCP communication logs

## Requirements

- Visual Studio Code 1.90.0+
- Visual Studio 2026 or 2022
- [UniversalVSMCP](https://www.nuget.org/packages/UniversalVSMCP/) installed:
  ```bash
  dotnet tool install -g UniversalVSMCP
  ```

## Quick Start

1. **Install UniversalVSMCP** (if not already installed):
   ```bash
   dotnet tool install -g UniversalVSMCP
   ```

2. **Install the Extension** from VS Code marketplace or install from VSIX

3. **Connect to VS**:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "UVM: Connect to VS"
   - Or click the status bar item

4. **Start Building**:
   - Press `Ctrl+Shift+B` to build
   - Press `F5` to debug

## Commands

| Command | Keybinding | Description |
|---------|------------|-------------|
| UVM: Connect to VS | - | Connect to UniversalVSMCP server |
| UVM: Disconnect from VS | - | Disconnect from server |
| UVM: Build Solution | `Ctrl+Shift+B` | Build the current solution |
| UVM: Rebuild Solution | - | Clean and rebuild |
| UVM: Clean Solution | - | Clean build outputs |
| UVM: Start Debugging | `F5` | Start debugging in VS |
| UVM: Find in Solution | - | Search across solution |
| UVM: Get Solution Info | - | Show solution details |

## Configuration

Open VS Code settings (`Ctrl+,`) and search for "UVM":

| Setting | Default | Description |
|---------|---------|-------------|
| `uvm.serverPath` | `universal-vsmcp` | Path to UVM executable |
| `uvm.transport` | `stdio` | Transport mode (stdio or http) |
| `uvm.autoConnect` | `false` | Auto-connect on startup |
| `uvm.logLevel` | `info` | Log level (debug, info, warn, error) |
| `uvm.security.alwaysConfirmBuild` | `false` | Confirm before build |
| `uvm.security.alwaysConfirmDelete` | `true` | Confirm before delete |

## HTTP Mode

To use HTTP mode instead of stdio:

1. Start UVM server manually:
   ```bash
   universal-vsmcp --http 5000
   ```

2. In VS Code settings, set:
   ```json
   {
     "uvm.transport": "http",
     "uvm.http.url": "http://localhost:5000/sse"
   }
   ```

## Security

This extension implements security best practices:

- **Workspace Trust** - Only operates in trusted workspaces
- **User Confirmation** - Prompts for sensitive operations (delete, clean, etc.)
- **Audit Logging** - All operations logged to output channel

## Troubleshooting

### Connection Failed

1. Ensure UniversalVSMCP is installed:
   ```bash
   dotnet tool list -g | findstr UniversalVSMCP
   ```

2. Check the output channel: View → Output → "Universal VS MCP"

3. Verify VS is running with a solution open

### Build Not Working

1. Ensure the solution is loaded in Visual Studio
2. Check that the solution builds successfully in VS directly
3. Check the output channel for error details

## Contributing

See [Contributing Guide](CONTRIBUTING.md)

## License

MIT License - see [LICENSE](LICENSE)

## Links

- [UniversalVSMCP](https://github.com/StarsailsClover/UniversalVSMCP) - MCP Server
- [Link2VS.skill](https://github.com/StarsailsClover/Link2VS.skill) - Agent Skill
- [Issues](https://github.com/StarsailsClover/vscode-universal-vsmcp/issues)
