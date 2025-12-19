# 🔧 Fix: Git Not Found in Docker Container

## Problem

The backend container doesn't have `git` installed, which is needed to clone repositories.

## Solution

Rebuild the Docker image with the updated Dockerfile that includes git.

## Steps to Deploy

### On Your Server:

```bash
# Navigate to project directory
cd /opt/previewcloud

# Pull latest code (includes updated Dockerfile with git)
git pull

# Rebuild the backend Docker image (this will include git)
cd infra
docker compose build previewcloud

# Restart the container with the new image
docker compose up -d previewcloud

# Verify git is installed
docker exec previewcloud-backend git --version
```

### Expected Output:

```
git version 2.x.x
```

## What Changed

The Dockerfile now includes:

```dockerfile
# Install curl for healthcheck and git for repository cloning
RUN apk add --no-cache curl git
```

## Verify It's Working

After rebuilding, test the GitHub Action again. The backend should now be able to:

1. ✅ Clone repositories
2. ✅ Build Docker images
3. ✅ Create preview containers

## Quick One-Liner

```bash
cd /opt/previewcloud && git pull && cd infra && docker compose build previewcloud && docker compose up -d previewcloud
```
