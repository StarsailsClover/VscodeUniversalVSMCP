# VscodeUniversalVSMCP (VUV) v26.2.0-RC3 Release Notes

**Release Date**: 2026-06-06  
**Status**: Pre-Release  
**Tag**: v26.2.0-rc3

---

## 🎯 Highlights

VS Code extension for the Link2VS Suite, providing seamless integration between VS Code and the UniversalVSMCP MCP server.

---

## 🐛 Bug Fixes

### TypeScript Compilation (RC2 → RC3)
- **Issue**: `Expected 1 arguments, but got 2` in `ConfigurationManager.get()`
- **Fix**: Changed to `getWithDefault()` for calls with default values

```typescript
// Before (RC2)
configManager.get('server.autoStart', false);

// After (RC3)
configManager.getWithDefault('server.autoStart', false);
```

---

## 📊 Compilation Status

| Metric | RC2 | RC3 |
|--------|-----|-----|
| TypeScript Errors | 2 | **0** |
| Status | ⚠️ Issues | ✅ **Success** |

---

## 🏗️ Features

### Connection Modes
- **Stdio Mode**: Direct MCP communication via standard I/O
- **HTTP Mode**: RESTful API communication over HTTP
- **Hybrid Mode**: Automatic fallback between modes

### VS Code Integration
- Status bar indicator (connecting/connected/error)
- Command palette integration
- Output channel logging
- Security trust system

---

## 📦 What's Included (Source)

This repository contains:
- ✅ TypeScript source code
- ✅ VS Code extension manifest (package.json)
- ✅ Build configuration (tsconfig.json)
- ✅ Documentation
- ✅ .gitignore for clean builds

**Not included** (see Release Assets):
- Compiled JavaScript (.js)
- VSIX package
- node_modules

---

## 🔧 Building from Source

```bash
# Clone
git clone https://github.com/StarsailsClover/VscodeUniversalVSMCP.git
cd VscodeUniversalVSMCP

# Checkout RC3
git checkout v26.2.0-rc3

# Install dependencies
npm install

# Compile
npm run compile

# Package
npx vsce package
```

---

## 🚀 Installation

### From VSIX (Recommended)
1. Download `universal-vsmcp-26.2.0-rc3.vsix` from Release Assets
2. Open VS Code
3. Press `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
4. Select the downloaded file

### From Marketplace (Future)
Search "Universal VS MCP" in VS Code Extensions marketplace.

---

## 📋 Commands

| Command | Description |
|---------|-------------|
| `Universal VS MCP: Start Server` | Start MCP server connection |
| `Universal VS MCP: Stop Server` | Stop MCP server connection |
| `Universal VS MCP: Show Output` | Show extension output channel |

---

## 🔗 Related Components

| Component | Version | Repository |
|-----------|---------|------------|
| VUV | v26.2.0-rc3 | This repo |
| UVM | v26.2.0-rc3 | [UniversalVSMCP](https://github.com/StarsailsClover/UniversalVSMCP) |
| LVS | v26.2.0-rc3 | [Link2VS.skill](https://github.com/StarsailsClover/Link2VS.skill) |

---

## ⚙️ Configuration

```json
{
  "uvm.server.autoStart": true,
  "uvm.connectionStrategy": "prefer-native",
  "uvm.security.trustEnabled": true
}
```

---

## 📋 Changelog (RC1 → RC2 → RC3)

### RC1 → RC2
- Initial working version
- Basic connection handling
- Status bar integration

### RC2 → RC3
- Fixed ConfigurationManager TypeScript errors
- Updated version to v26.2.0-rc3
- Cleaned repository with .gitignore

---

## 📝 License

MIT License - See LICENSE file

---

**Full Release**: https://github.com/StarsailsClover/VscodeUniversalVSMCP/releases/tag/v26.2.0-rc3
