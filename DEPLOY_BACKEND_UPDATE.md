# 🚀 Deploy Backend Update (Remove Git Clone)

The backend is still trying to clone repositories, but we've moved to registry-based architecture. Deploy the updated backend.

## On Your Server:

```bash
cd /opt/previewcloud

# Pull latest code (includes fix to remove git clone)
git pull

# Rebuild backend
cd backend
npm install
npm run build

# Rebuild and restart Docker container
cd ../infra
docker compose build previewcloud
docker compose up -d previewcloud

# Check logs to verify
docker logs -f previewcloud-backend
```

## What Changed:

- ✅ Removed repository cloning (no longer needed)
- ✅ Backend now only pulls images from registry
- ✅ No git required in Docker container

## Verify It's Working:

After deploying, the backend should:

1. ✅ Receive image tags from GitHub Action
2. ✅ Pull images from registry
3. ✅ Create containers
4. ✅ **NOT** try to clone repositories

The error "git: not found" should be gone!
