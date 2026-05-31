# Changelog

All notable changes to the "Universal VS MCP" extension will be documented in this file.

## [26.0.0] - 2026-05-31

### Added
- Initial release
- MCP stdio client for connecting to UniversalVSMCP
- Connection management with auto-reconnect
- Command palette integration (Build, Debug, Find, etc.)
- Status bar connection indicator
- Output channel for MCP communication logs
- Solution Explorer tree view
- User confirmation for sensitive operations
- Workspace trust integration
- Security settings (confirm build, confirm delete, etc.)
- Keybindings: `Ctrl+Shift+B` for build, `F5` for debug

### Security
- Workspace trust check on activation
- User confirmation dialogs for destructive operations
- Audit logging to output channel

## [Unreleased]

### Planned
- HTTP mode support (SSE transport)
- Multi-VS instance routing
- Plugin architecture
- WebSocket transport option
