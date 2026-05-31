# VS Code Extension Quickstart

## Installation

### From VSIX
1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions view (`Ctrl+Shift+X`)
4. Click `...` → "Install from VSIX"
5. Select the downloaded file

### From Marketplace
Search for "Universal VS MCP" in the VS Code marketplace.

## Development

### Prerequisites
- Node.js 18+
- VS Code 1.90+

### Setup
```bash
npm install
```

### Build
```bash
npm run compile
```

### Watch Mode
```bash
npm run watch
```

### Run Extension
Press `F5` to open a new VS Code window with the extension loaded.

### Package
```bash
npm run package
```

### Publish
```bash
npm run publish
```

## Testing

### Manual Testing
1. Ensure UniversalVSMCP is installed: `dotnet tool list -g`
2. Open VS Code with the extension
3. Press `Ctrl+Shift+P` → "UVM: Connect to VS"
4. Verify connection status in status bar
5. Try build/debug commands

### Automated Testing
```bash
npm test
```

## Debugging

1. Set breakpoints in `src/extension.ts`
2. Press `F5` to launch Extension Host
3. Use the Debug Console to inspect variables

## Architecture

```
src/
├── extension.ts          # Entry point
├── mcp/
│   ├── client.ts         # MCP stdio client
│   ├── connection.ts     # Connection lifecycle
│   └── config.ts         # Configuration management
├── providers/
│   ├── commands.ts       # VS Code commands
│   ├── output.ts         # Output channel
│   ├── statusbar.ts      # Status bar
│   └── solution.ts       # Tree view
└── security/
    └── trust.ts          # Security confirmations
```

## Contributing

See main repository: https://github.com/StarsailsClover/UniversalVSMCP
