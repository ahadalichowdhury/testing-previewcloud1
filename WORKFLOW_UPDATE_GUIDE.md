# 📝 GitHub Workflow Update Guide

## Required Changes

With the new registry-based architecture, you **must** add registry configuration to your GitHub workflow.

## Updated Workflow Example

### Option 1: Docker Hub (Recommended for Public Images)

```yaml
name: Preview Environment

on:
  push:
    branches: [main, staging] # Deploy on push to these branches
  pull_request:
    branches: ["*"] # Deploy on PR to any branch

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Build your application before Docker build
      # Example for Node.js frontend:
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: |
          cd frontend
          npm install

      - name: Build frontend
        run: |
          cd frontend
          npm run build
        # This creates the 'build' directory that Dockerfile needs

      - name: Deploy to PreviewCloud
        uses: ahadalichowdhury/previewcloud-action@v1.0.13
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
          api-url: https://api.previewcloud.cloud
          # Registry configuration (REQUIRED)
          registry: docker.io
          registry-username: ${{ secrets.DOCKER_USERNAME }}
          registry-password: ${{ secrets.DOCKER_PASSWORD }}
```

### Option 2: GitHub Container Registry (GHCR) - Recommended

```yaml
name: Preview Environment

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: ["*"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write # Required for GHCR
    steps:
      - uses: actions/checkout@v3

      # Build your application before Docker build
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install and build
        run: |
          cd frontend
          npm install
          npm run build
        # This creates the 'build' directory that Dockerfile needs

      - name: Deploy to PreviewCloud
        uses: ahadalichowdhury/previewcloud-action@v1.0.13
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
          api-url: https://api.previewcloud.cloud
          # Use GitHub Container Registry
          registry: ghcr.io
          registry-username: ${{ github.actor }}
          registry-password: ${{ secrets.GITHUB_TOKEN }}
```

### Option 3: Private Registry

```yaml
name: Preview Environment

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: ["*"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Build your application before Docker build
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install and build
        run: |
          cd frontend
          npm install
          npm run build

      - name: Deploy to PreviewCloud
        uses: ahadalichowdhury/previewcloud-action@v1.0.13
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
          api-url: https://api.previewcloud.cloud
          # Private registry
          registry: registry.yourcompany.com
          registry-username: ${{ secrets.REGISTRY_USERNAME }}
          registry-password: ${{ secrets.REGISTRY_PASSWORD }}
```

## ⚠️ Important: Build Your Application First

**The GitHub Action builds Docker images, but it does NOT build your application.**

You must add build steps to your workflow **before** the PreviewCloud action runs.

### Common Build Patterns

#### For Node.js/React/Vue/Angular Frontend:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: "18"

- name: Install and build
  run: |
    cd frontend  # or wherever your frontend code is
    npm install
    npm run build  # Creates the 'build' directory
```

#### For Python Backend:

```yaml
- name: Setup Python
  uses: actions/setup-python@v4
  with:
    python-version: "3.11"

- name: Install dependencies
  run: |
    pip install -r requirements.txt
    # Build your Python app if needed
```

#### For Go Backend:

```yaml
- name: Setup Go
  uses: actions/setup-go@v4
  with:
    go-version: "1.21"

- name: Build
  run: |
    go build -o app ./cmd/server
```

### Error: "build directory not found"

If you see this error:

```
ERROR: failed to calculate checksum: "/build": not found
```

It means:

1. ❌ Your application wasn't built before Docker build
2. ✅ **Solution**: Add build steps before the PreviewCloud action

## Required GitHub Secrets

You need to add these secrets to your repository:

### For Docker Hub:

1. Go to: **Settings → Secrets and variables → Actions → New repository secret**
2. Add:
   - `DOCKER_USERNAME` - Your Docker Hub username
   - `DOCKER_PASSWORD` - Your Docker Hub password or access token

### For GHCR:

- No additional secrets needed! Uses `GITHUB_TOKEN` automatically
- Just add `packages: write` permission to your workflow

### For Private Registry:

1. Add:
   - `REGISTRY_USERNAME` - Registry username
   - `REGISTRY_PASSWORD` - Registry password/token

## What Changed?

### Before (Old Architecture):

```yaml
- uses: ahadalichowdhury/previewcloud-action@v1.0.13
  with:
    api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
    api-url: https://api.previewcloud.cloud
```

- ❌ Backend cloned repositories (required GitHub credentials on server)
- ❌ Didn't work with private repositories
- ❌ Security risk

### After (New Architecture):

```yaml
- uses: ahadalichowdhury/previewcloud-action@v1.0.13
  with:
    api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
    api-url: https://api.previewcloud.cloud
    registry: docker.io # ← NEW
    registry-username: ${{ secrets.DOCKER_USERNAME }} # ← NEW
    registry-password: ${{ secrets.DOCKER_PASSWORD }} # ← NEW
```

- ✅ GitHub Action builds images (has code access)
- ✅ Images pushed to registry
- ✅ Backend pulls from registry (no credentials needed)
- ✅ Works with private repositories

## Quick Setup Steps

1. **Choose a registry** (Docker Hub or GHCR recommended)
2. **Add secrets** to your GitHub repository
3. **Update workflow** with registry configuration
4. **Test** by pushing to a branch or opening a PR

## Troubleshooting

### Error: "No imageTag provided"

- Make sure registry configuration is added
- Check that images are being built in GitHub Action logs
- Verify `dockerfile` is specified in `preview.yaml`

### Error: "Failed to pull image"

- Check registry credentials are correct
- Verify backend can access the registry (network/firewall)
- Check image was pushed successfully in GitHub Action logs

### Error: "Unauthorized" when pushing

- Verify registry credentials are correct
- For Docker Hub, use access token instead of password
- For GHCR, ensure `packages: write` permission is set
