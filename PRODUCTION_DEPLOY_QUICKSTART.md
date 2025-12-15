# 🚀 Production Deployment - Quick Start Guide

**Deploy PreviewCloud to production in under 30 minutes**

---

## 📋 Prerequisites

- ✅ Domain: `previewcloud.cloud` (Hostinger)
- ✅ AWS EC2 instance running Ubuntu 22.04
- ✅ SSH access to server
- ⏱️ Time: 20-30 minutes

---

## ⚡ Quick Deploy (Copy & Paste)

### Step 1: Configure Domain (Hostinger)

1. Login to Hostinger: https://www.hostinger.com
2. Go to Domains → `previewcloud.cloud` → DNS Settings
3. Add these A records:

```
Type: A, Name: @, Value: YOUR_EC2_IP
Type: A, Name: api, Value: YOUR_EC2_IP
Type: A, Name: *.preview, Value: YOUR_EC2_IP
Type: A, Name: dashboard, Value: YOUR_EC2_IP
```

Wait 10-30 minutes for DNS propagation.

---

### Step 2: Setup EC2 Instance

**SSH to your server:**

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_EC2_IP
```

**Run these commands:**

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
newgrp docker

# Install Docker Compose
sudo apt-get install -y docker-compose-plugin

# Install Node.js 20
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Install PM2
npm install -g pm2

# Create project directory
sudo mkdir -p /opt/previewcloud
sudo chown ubuntu:ubuntu /opt/previewcloud
cd /opt/previewcloud
```

---

### Step 3: Upload Project Files

**From your local machine:**

```bash
# Upload entire project to server
scp -i ~/.ssh/your-key.pem -r ./previewcloud-node ubuntu@YOUR_EC2_IP:/opt/previewcloud/
```

**Or clone from GitHub:**

```bash
# On server
cd /opt/previewcloud
git clone https://github.com/your-username/previewcloud-node.git .
```

---

### Step 4: Generate Environment Files

**On server:**

```bash
cd /opt/previewcloud/infra

# Run environment generator
./production-env-generator.sh

# This creates:
# - infra/.env (with secure passwords)
# - backend/.env (with configuration)
```

---

### Step 5: Configure Email & Billing (Optional)

**Edit backend/.env:**

```bash
nano /opt/previewcloud/backend/.env
```

**Uncomment and configure SMTP:**

```bash
# For SendGrid (recommended)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=YOUR_SENDGRID_API_KEY
SMTP_FROM="PreviewCloud" <noreply@previewcloud.cloud>
```

**Uncomment and configure Stripe (optional):**

```bash
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`)

---

### Step 6: Start Infrastructure

```bash
cd /opt/previewcloud/infra

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Verify all containers are running
docker ps

# Expected output:
# traefik, mongodb-platform, postgres-previews, mysql-previews,
# mongodb-previews, redis, previewcloud-api
```

**Check logs:**

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Or specific service
docker logs traefik
docker logs previewcloud-api
```

---

### Step 7: Verify Deployment

**Check health:**

```bash
# API health check
curl http://localhost:3001/api/health

# Expected: {"success": true, "data": {"status": "ok"}}
```

**Test from browser:**

```bash
# After DNS propagates (10-30 minutes)
curl https://api.previewcloud.cloud/api/health

# Expected: {"success": true, "data": {"status": "ok"}}
```

---

### Step 8: Setup Auto-Restart on Boot

```bash
# Setup PM2 startup (if using PM2 instead of Docker for backend)
pm2 startup systemd

# Or ensure Docker starts on boot (already configured with restart: unless-stopped)
sudo systemctl enable docker
```

---

## ✅ Production Checklist

- [ ] EC2 instance running
- [ ] DNS configured in Hostinger
- [ ] Docker installed
- [ ] Project files uploaded
- [ ] Environment files generated
- [ ] SMTP configured (optional)
- [ ] Infrastructure started
- [ ] All containers running
- [ ] Health check passing
- [ ] SSL certificates obtained (automatic via Traefik)
- [ ] API accessible via https://api.previewcloud.cloud

---

## 🔧 Common Issues

### Issue 1: Containers not starting

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Rebuild if needed
docker compose -f docker-compose.prod.yml up -d --build
```

### Issue 2: SSL certificates not working

```bash
# Check Traefik logs
docker logs traefik | grep -i "certificate"

# Verify DNS is correct
dig api.previewcloud.cloud
# Should return your EC2 IP
```

### Issue 3: Backend can't connect to MongoDB

```bash
# Check MongoDB is running
docker ps | grep mongodb-platform

# Check connection string in .env
grep MONGODB_URI /opt/previewcloud/backend/.env

# Test connection
docker exec mongodb-platform mongosh -u admin -p YOUR_PASSWORD
```

---

## 📊 Verify Everything Works

**Test API:**

```bash
# Health check
curl https://api.previewcloud.cloud/api/health

# Swagger docs
curl https://api.previewcloud.cloud/api/docs

# Signup (create test user)
curl -X POST https://api.previewcloud.cloud/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User"
  }'
```

---

## 🎉 You're Live!

**Your PreviewCloud is now running at:**

- 🌐 API: https://api.previewcloud.cloud
- 📊 Traefik Dashboard: https://traefik.previewcloud.cloud (user: admin, pass: admin)
- 📚 API Docs: https://api.previewcloud.cloud/api/docs

**Next Steps:**

1. Create GitHub App (see GITHUB_APP_SETUP.md)
2. Build frontend dashboard (see SAAS_ROADMAP.md)
3. Configure billing (Stripe)
4. Launch! 🚀

---

## 📖 Additional Resources

- Full deployment guide: `DEPLOYMENT_GUIDE.md`
- GitHub App setup: `GITHUB_APP_SETUP.md`
- Email configuration: `EMAIL_SETUP_GUIDE.md`
- Environment variables: `ENV_CONFIGURATION_METHODS.md`

---

**Total deployment time: ~20-30 minutes**

**Monthly cost: ~$60-120 (EC2 + services)**

**Ready for production! 🎉**
