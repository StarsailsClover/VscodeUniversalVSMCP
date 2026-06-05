# Publishing Guide - VS Code Extension

## 📦 Publishing to VS Code Marketplace

### Prerequisites

1. **Azure DevOps Organization**
   - Create at: https://dev.azure.com/
   - Required for VS Code Marketplace publisher account

2. **Personal Access Token (PAT)**
   - Create at: https://dev.azure.com/{org}/_usersSettings/tokens
   - Scopes: "Marketplace" → "Acquire" and "Manage"

3. **Publisher Account**
   - Create at: https://marketplace.visualstudio.com/manage

### Step 1: Install vsce

```bash
npm install -g @vscode/vsce
```

### Step 2: Login

```bash
vsce login <publisher-id>
# Enter PAT when prompted
```

### Step 3: Publish

```bash
# Version bump (patch/minor/major)
npm version patch

# Package and publish
vsce publish

# Or publish specific version
vsce publish 26.0.3
```

### Step 4: Verify

- Check: https://marketplace.visualstudio.com/items?itemName=StarsailsClover.universal-vsmcp
- Search in VS Code: "Universal VS MCP"

---

## 🌐 Publishing to Open VSX Registry

### Prerequisites

1. **Eclipse Account**
   - Create at: https://accounts.eclipse.org/

2. **Open VSX Account**
   - Link Eclipse account at: https://open-vsx.org/

### Step 1: Install ovsx

```bash
npm install -g ovsx
```

### Step 2: Login

```bash
ovsx create-namespace StarsailsClover
ovsx login StarsailsClover
# Enter token from: https://open-vsx.org/user-settings/tokens
```

### Step 3: Publish

```bash
# Package
vsce package

# Publish to Open VSX
ovsx publish universal-vsmcp-26.0.3.vsix
```

### Step 4: Verify

- Check: https://open-vsx.org/extension/StarsailsClover/universal-vsmcp

---

## 📋 Pre-Publish Checklist

### Code Quality
- [ ] All tests passing
- [ ] No ESLint errors
- [ ] CHANGELOG.md updated
- [ ] README.md accurate
- [ ] Icon files present

### Package Validation
```bash
# Lint
npm run lint

# Test
npm test

# Package validation
vsce package --yarn
vsce verify-universal-vsmcp-26.0.3.vsix
```

### Metadata Check
- [ ] package.json version correct
- [ ] README.md installation instructions
- [ ] LICENSE file present
- [ ] CHANGELOG.md updated
- [ ] Icon (128x128 PNG)
- [ ] Keywords include: "visual studio", "mcp", "ai agent"

---

## 🚀 Quick Publish Commands

```bash
# Full publish workflow
npm run compile
npm run lint
npm version patch
vsce package
vsce publish

# Open VSX
ovsx publish universal-vsmcp-26.0.3.vsix
```

---

## 📝 Version Strategy

| Version | When to Use |
|---------|-------------|
| `26.0.x` | Bug fixes |
| `26.x.0` | New features |
| `x.0.0` | Breaking changes |

---

## 🔍 Troubleshooting

### "Publisher not found"
```bash
# Verify login
vsce ls-publishers
vsce login <publisher-id>
```

### "Extension not valid"
```bash
# Check extension
vsce ls
vsce package --yarn
```

### "Token expired"
```bash
# Regenerate PAT in Azure DevOps
# Update with: vsce login <publisher-id>
```

---

## 📊 Post-Publish

### Verification
1. Search in VS Code Extensions
2. Check Marketplace page
3. Verify Open VSX listing
4. Test installation

### Announcement
- [ ] Update GitHub releases
- [ ] Update documentation
- [ ] Announce on social media
- [ ] Update website

---

## 🔗 Links

- **VS Code Marketplace**: https://marketplace.visualstudio.com/
- **Open VSX**: https://open-vsx.org/
- **Publishing Docs**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension

---

**Last Updated**: 2026-06-01
