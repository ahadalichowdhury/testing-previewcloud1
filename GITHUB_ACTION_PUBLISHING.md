# 📦 Publishing PreviewCloud GitHub Action

Complete guide to build and publish the PreviewCloud GitHub Action.

---

## 📁 Repository Structure

```
previewcloud-action/  (New separate repository)
├── action.yml                 # Action definition
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── README.md                 # Documentation
├── LICENSE                   # MIT License
├── .gitignore
├── src/
│   └── index.ts             # Main action code
└── dist/
    └── index.js             # Compiled code (committed)
```

---

## 🚀 Step-by-Step Publishing Guide

### Step 1: Create New GitHub Repository

1. Go to https://github.com/new
2. Repository name: `action` or `previewcloud-action`
3. Description: "GitHub Action for PreviewCloud - Deploy preview environments"
4. Public repository
5. Click "Create repository"

**Result:** `https://github.com/previewcloud/action`

---

### Step 2: Initialize Repository Locally

```bash
# Create directory
mkdir previewcloud-action
cd previewcloud-action

# Initialize git
git init
git branch -M main

# Copy files from github-action/ folder
cp -r /path/to/previewcloud-node/github-action/* .

# Initialize npm
npm install

# Build the action
npm run build

# Verify dist/index.js was created
ls -la dist/
```

---

### Step 3: Configure `.gitignore`

```bash
# .gitignore
node_modules/
*.log
.env
.DS_Store

# Don't ignore dist/ - it must be committed!
# GitHub Actions need the compiled code
```

**Important:** Unlike regular Node.js projects, GitHub Actions **require** committing `dist/` folder.

---

### Step 4: Commit and Push

```bash
# Add all files (including dist/)
git add .

# Commit
git commit -m "Initial commit: PreviewCloud GitHub Action"

# Add remote
git remote add origin https://github.com/previewcloud/action.git

# Push
git push -u origin main
```

---

### Step 5: Create Release (v1.0.0)

```bash
# Tag the release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Also create moving tag v1 (points to latest v1.x.x)
git tag -fa v1 -m "Release v1"
git push origin v1 --force
```

**Why two tags?**

- `v1.0.0` - Specific version
- `v1` - Allows users to use `previewcloud/action@v1` (auto-updates to latest v1.x.x)

---

### Step 6: Publish to GitHub Marketplace

1. Go to repository: https://github.com/previewcloud/action
2. Click "Releases" → "Create a new release"
3. Select tag: `v1.0.0`
4. Release title: `v1.0.0 - Initial Release`
5. Description:

````markdown
## PreviewCloud GitHub Action v1.0.0

Automatically deploy preview environments for every pull request.

### Features

- ✅ Automatic preview deployment on PR open/update
- ✅ Auto-cleanup on PR close
- ✅ PR comments with preview URLs
- ✅ Secrets management
- ✅ Multi-service support

### Usage

```yaml
- uses: previewcloud/action@v1
  with:
    api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
```
````

See README for complete documentation.

````

6. Check "✅ Publish this Action to the GitHub Marketplace"
7. Choose primary category: "Deployment"
8. Choose additional categories: "Utilities", "Continuous Integration"
9. Verify the action.yml is valid (GitHub validates automatically)
10. Click "Publish release"

---

### Step 7: Verify Publication

1. Visit: https://github.com/marketplace/actions/previewcloud-deploy
2. Check action appears in marketplace
3. Test using in a workflow:

```yaml
name: Test PreviewCloud Action

on: pull_request

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: previewcloud/action@v1
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
````

---

## 🔄 Updating the Action

### For Bug Fixes (Patch: v1.0.1)

```bash
# Make changes
vim src/index.ts

# Rebuild
npm run build

# Commit
git add .
git commit -m "Fix: Handle timeout errors gracefully"

# Tag patch version
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1

# Update v1 tag (so users on @v1 get the fix)
git tag -fa v1 -m "Update v1 to v1.0.1"
git push origin v1 --force

# Create GitHub release
# (Same process as step 6)
```

### For New Features (Minor: v1.1.0)

```bash
# Make changes
vim src/index.ts

# Rebuild
npm run build

# Commit
git add .
git commit -m "Feature: Add custom domain support"

# Tag minor version
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0

# Update v1 tag
git tag -fa v1 -m "Update v1 to v1.1.0"
git push origin v1 --force

# Create GitHub release
```

### For Breaking Changes (Major: v2.0.0)

```bash
# Make changes
vim src/index.ts
vim action.yml  # Update inputs if needed

# Rebuild
npm run build

# Commit
git add .
git commit -m "BREAKING: Change API structure"

# Tag major version
git tag -a v2.0.0 -m "Release v2.0.0"
git push origin v2.0.0

# Create v2 moving tag
git tag -a v2 -m "Release v2"
git push origin v2

# Create GitHub release with migration guide
```

---

## 📝 Example User Workflow

After publishing, users can use it like this:

### `.github/workflows/preview.yml`

```yaml
name: PreviewCloud Deploy

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest

    # Required permissions
    permissions:
      contents: read
      pull-requests: write

    steps:
      # Checkout code
      - name: Checkout
        uses: actions/checkout@v4

      # Deploy to PreviewCloud
      - name: Deploy Preview
        uses: previewcloud/action@v1
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
          secrets: |
            JWT_SECRET=${{ secrets.JWT_SECRET }}
            STRIPE_KEY=${{ secrets.STRIPE_KEY }}
```

---

## 🧪 Testing Before Publishing

### Local Testing (act)

Install `act` to test actions locally:

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Create test workflow
mkdir -p .github/workflows
cat > .github/workflows/test.yml << 'EOF'
name: Test
on: pull_request
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./
        with:
          api-token: test-token
EOF

# Run locally
act pull_request -W .github/workflows/test.yml
```

### Test in Real Repository

1. Create test repository
2. Copy `github-action/` contents to `.github/actions/previewcloud/`
3. Use in workflow:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/previewcloud
    with:
      api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
```

4. Open test PR and verify it works
5. Once verified, publish to marketplace

---

## 📊 Monitoring Usage

After publishing, monitor action usage:

### GitHub Insights

Visit: `https://github.com/previewcloud/action/graphs/traffic`

Shows:

- Daily clones
- Daily views
- Referring sites

### Marketplace Stats

Visit: `https://github.com/marketplace/actions/previewcloud-deploy`

Shows:

- Total installs
- Recent installs
- Trending position

---

## 🔒 Security Considerations

### Secrets Handling

```typescript
// ✅ Good: Never log secrets
core.setSecret(apiToken);

// ❌ Bad: Logging secrets
console.log(`Token: ${apiToken}`);
```

### Input Validation

```typescript
// Validate inputs
const timeout = parseInt(core.getInput("timeout") || "600");
if (timeout < 0 || timeout > 3600) {
  throw new Error("Timeout must be between 0 and 3600");
}
```

### Error Handling

```typescript
try {
  await deployPreview();
} catch (error: any) {
  // Sanitize error before logging
  const sanitized = error.message.replace(/Bearer\s+\w+/g, "Bearer ***");
  core.setFailed(sanitized);
}
```

---

## 📚 Documentation Checklist

Before publishing, ensure:

- ✅ `README.md` with usage examples
- ✅ `action.yml` with clear input descriptions
- ✅ Example workflows in docs
- ✅ Troubleshooting section
- ✅ Security best practices
- ✅ License file (MIT recommended)
- ✅ Contributing guidelines
- ✅ Changelog for updates

---

## 🎯 Quick Publish Commands

```bash
# Complete publish flow
cd previewcloud-action

# Install & build
npm install
npm run build

# Commit
git add .
git commit -m "Release v1.0.0"

# Tag
git tag -a v1.0.0 -m "Release v1.0.0"
git tag -a v1 -m "Release v1"

# Push
git push origin main
git push origin v1.0.0
git push origin v1

# Then go to GitHub UI to create release and publish to marketplace
```

---

## 🆘 Common Issues

### Issue: "Action not found"

**Solution:** Make sure `dist/index.js` is committed and pushed

### Issue: "Node modules not found"

**Solution:** Use `@vercel/ncc` to bundle dependencies:

```bash
npm run build  # Uses ncc to bundle everything
```

### Issue: "Permission denied"

**Solution:** Add permissions to workflow:

```yaml
permissions:
  contents: read
  pull-requests: write
```

---

## ✅ Publishing Checklist

- [ ] Code is tested and working
- [ ] `npm run build` creates `dist/index.js`
- [ ] `README.md` is complete with examples
- [ ] `action.yml` inputs/outputs documented
- [ ] `dist/` folder is committed
- [ ] Repository pushed to GitHub
- [ ] Tagged with version (v1.0.0, v1)
- [ ] GitHub release created
- [ ] Published to Marketplace
- [ ] Tested by installing in another repo
- [ ] Documentation site updated

---

**Your action is now live at:**
`https://github.com/marketplace/actions/previewcloud-deploy`

**Users can install with:**

```yaml
uses: previewcloud/action@v1
```

🎉 **Congratulations! Your GitHub Action is published!**
