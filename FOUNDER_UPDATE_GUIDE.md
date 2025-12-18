# 🚀 Founder's Quick Update Guide

**When you push code changes, run these commands on your server:**

---

## 📋 Quick Update Commands

### Option 1: Use the Update Script (Recommended)

```bash
# SSH to your server
ssh -i ~/.ssh/previewcloud-production.pem ubuntu@YOUR_SERVER_IP

# Navigate to project
cd /opt/previewcloud

# Run update script
./update-server.sh
```

**That's it!** The script will:
1. ✅ Pull latest code from Git
2. ✅ Pull latest Docker images
3. ✅ Rebuild backend
4. ✅ Restart all services
5. ✅ Verify everything is working

---

## 🔧 Manual Update (Step-by-Step)

If you prefer to run commands manually:

### Step 1: Pull Latest Code

```bash
cd /opt/previewcloud
git pull origin main
```

### Step 2: Pull Docker Images

```bash
cd infra
docker compose pull
```

### Step 3: Rebuild Backend

```bash
cd ../backend
npm install
npm run build
```

### Step 4: Restart Services

**If using Docker Compose:**
```bash
cd ../infra
docker compose up -d --build
```

**If using PM2:**
```bash
pm2 restart previewcloud-api
# Or if not running:
pm2 start dist/index.js --name previewcloud-api
pm2 save
```

### Step 5: Verify

```bash
# Check containers
docker ps

# Check PM2
pm2 status

# Test API
curl http://localhost:3001/api/health
```

---

## 🎯 Complete Workflow Example

**On your local machine:**
```bash
# Make changes to code
vim backend/src/services/preview.service.ts

# Commit and push
git add .
git commit -m "Add new feature"
git push origin main
```

**On your server:**
```bash
# SSH to server
ssh -i ~/.ssh/previewcloud-production.pem ubuntu@YOUR_SERVER_IP

# Run update
cd /opt/previewcloud
./update-server.sh
```

**Done!** Your changes are live! 🎉

---

## 📊 Check Status

### View Logs
```bash
# Backend logs (PM2)
pm2 logs previewcloud-api

# Docker logs
docker compose -f infra/docker-compose.yml logs -f

# Specific service
docker logs previewcloud-api
```

### Check Services
```bash
# All Docker containers
docker ps

# PM2 processes
pm2 status

# System resources
htop
df -h
```

### Test API
```bash
# Local
curl http://localhost:3001/api/health

# Production
curl https://api.previewcloud.cloud/api/health
```

---

## 🚨 Troubleshooting

### Update Failed?

**1. Check Git Status:**
```bash
cd /opt/previewcloud
git status
git pull origin main
```

**2. Check Docker:**
```bash
docker ps
docker compose -f infra/docker-compose.yml ps
```

**3. Check PM2:**
```bash
pm2 status
pm2 logs previewcloud-api --lines 50
```

**4. Rebuild from Scratch:**
```bash
cd /opt/previewcloud/backend
rm -rf node_modules dist
npm install
npm run build
pm2 restart previewcloud-api
```

### Services Not Starting?

**Check logs:**
```bash
# PM2 logs
pm2 logs previewcloud-api --err

# Docker logs
docker compose -f infra/docker-compose.yml logs previewcloud-api
```

**Restart everything:**
```bash
cd /opt/previewcloud/infra
docker compose down
docker compose up -d

cd ../backend
pm2 restart previewcloud-api
```

---

## 🔄 Automated Updates (Optional)

**Set up auto-pull on server:**

```bash
# Create update script
cat > /opt/previewcloud/auto-update.sh << 'EOF'
#!/bin/bash
cd /opt/previewcloud
git pull origin main
cd backend && npm install && npm run build
pm2 restart previewcloud-api
EOF

chmod +x /opt/previewcloud/auto-update.sh

# Add to cron (runs every hour)
crontab -e
# Add:
0 * * * * /opt/previewcloud/auto-update.sh >> /var/log/previewcloud-update.log 2>&1
```

**⚠️ Warning:** Auto-updates can break things. Use with caution!

---

## 📝 Summary

**Every time you push code:**

1. SSH to server
2. `cd /opt/previewcloud`
3. `./update-server.sh`
4. Done! ✅

**That's it!** Your PreviewCloud is updated! 🚀

