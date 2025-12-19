# 🏗️ Registry-Based Architecture

## Problem with Previous Approach

The previous architecture had the backend clone repositories, which had several issues:

- ❌ **Private repositories**: Required GitHub credentials on server
- ❌ **Security risk**: Storing credentials on server
- ❌ **Unnecessary**: GitHub Action already has the code

## New Architecture

### ✅ How It Works Now

1. **GitHub Action** (has the code):

   - Builds Docker images from Dockerfiles
   - Pushes images to a registry (Docker Hub, GHCR, or private registry)
   - Sends image tags to backend API

2. **Backend** (on your server):
   - Receives image tags from GitHub Action
   - Pulls images from registry
   - Creates containers from pulled images
   - **No cloning needed!**

## Configuration

### GitHub Action Workflow

```yaml
name: PreviewCloud Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: ["*"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to PreviewCloud
        uses: ahadalichowdhury/previewcloud-action@v1
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
          # Optional: Registry configuration
          registry: docker.io # or ghcr.io, or your-private-registry.com
          registry-username: ${{ secrets.DOCKER_USERNAME }}
          registry-password: ${{ secrets.DOCKER_PASSWORD }}
```

### Registry Options

1. **Docker Hub** (default):

   ```yaml
   registry: docker.io
   registry-username: your-dockerhub-username
   registry-password: ${{ secrets.DOCKERHUB_TOKEN }}
   ```

2. **GitHub Container Registry** (GHCR):

   ```yaml
   registry: ghcr.io
   registry-username: ${{ github.actor }}
   registry-password: ${{ secrets.GITHUB_TOKEN }}
   ```

3. **Private Registry**:
   ```yaml
   registry: registry.yourcompany.com
   registry-username: ${{ secrets.REGISTRY_USERNAME }}
   registry-password: ${{ secrets.REGISTRY_PASSWORD }}
   ```

## Benefits

✅ **No credentials on server**: Backend doesn't need GitHub access  
✅ **Works with private repos**: GitHub Action has access  
✅ **Secure**: Credentials only in GitHub secrets  
✅ **Flexible**: Use any Docker registry  
✅ **Faster**: No cloning step on server

## Image Tag Format

Images are tagged as:

- With registry: `{registry}/{username}/{previewId}-{serviceName}:latest`
- Example: `docker.io/myuser/branch-main-frontend:latest`

## Backend Changes

- ✅ Removed `RepositoryService` (no cloning)
- ✅ Removed `BuildService` usage (images built by GitHub Action)
- ✅ Added `pullImage()` method to `DockerService`
- ✅ Backend now pulls images from registry

## Migration Notes

If you have existing previews using the old architecture:

1. They will continue to work
2. New previews will use the registry-based approach
3. Old previews can be destroyed and recreated

## Troubleshooting

### "Image not found" error

- Check registry credentials are correct
- Verify images were pushed successfully in GitHub Action logs
- Ensure backend can access the registry (network/firewall)

### "No imageTag provided" error

- Make sure GitHub Action is building images
- Check that `dockerfile` is specified in `preview.yaml`
- Verify registry configuration in workflow
