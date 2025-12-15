# 🚀 PreviewCloud Production Deployment Guide

**Complete guide for deploying PreviewCloud to production as the founder**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Domain Setup (Hostinger)](#domain-setup-hostinger)
3. [AWS EC2 Setup](#aws-ec2-setup)
4. [Server Installation](#server-installation)
5. [Production Environment Configuration](#production-environment-configuration)
6. [SSL & Traefik Setup](#ssl--traefik-setup)
7. [Database Setup](#database-setup)
8. [Deploy Backend](#deploy-backend)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Scaling & Optimization](#scaling--optimization)

---

## 🎯 Prerequisites

### What You Need:

- ✅ Domain: `previewcloud.cloud` (registered with Hostinger)
- ✅ AWS Account
- ✅ Credit card for AWS
- ✅ SSH key pair
- ✅ Time: ~2-3 hours for initial setup

### Costs (Estimated):

- EC2 instance: $40-100/month (t3.large or t3.xlarge)
- Domain: $10/year (already have)
- Total: ~$50-100/month initially

---

## 🌐 Domain Setup (Hostinger)

### Step 1: Login to Hostinger

1. Go to https://www.hostinger.com
2. Login to your account
3. Go to "Domains" → Select `previewcloud.cloud`

### Step 2: Configure DNS Records

Click "Manage" → "DNS / Name Servers" → Add these records:

```dns
# Main domain (landing page)
Type: A
Name: @
Value: YOUR_EC2_IP (get this after EC2 setup)
TTL: 3600

# API subdomain
Type: A
Name: api
Value: YOUR_EC2_IP
TTL: 3600

# Wildcard for preview environments
Type: A
Name: *.preview
Value: YOUR_EC2_IP
TTL: 3600

# Dashboard subdomain
Type: A
Name: dashboard
Value: YOUR_EC2_IP
TTL: 3600

# Optional: www redirect
Type: CNAME
Name: www
Value: previewcloud.cloud
TTL: 3600
```

**Result after DNS propagation (24-48 hours):**

- `previewcloud.cloud` → Landing page
- `api.previewcloud.cloud` → Backend API
- `dashboard.previewcloud.cloud` → User dashboard
- `*.preview.previewcloud.cloud` → Preview environments
  - `pr-42.web.myapp.preview.previewcloud.cloud`
  - `pr-42.api.myapp.preview.previewcloud.cloud`

### Step 3: Verify DNS

Wait 10-30 minutes, then test:

```bash
# Check if DNS is propagating
dig previewcloud.cloud
dig api.previewcloud.cloud
dig test.preview.previewcloud.cloud

# Should show your EC2 IP
```

---

## ☁️ AWS EC2 Setup

### Step 1: Launch EC2 Instance

1. **Login to AWS Console**: https://console.aws.amazon.com
2. **Go to EC2**: Services → EC2 → Launch Instance

### Step 2: Configure Instance

**Name:** `previewcloud-production`

**AMI (Operating System):**

- Ubuntu Server 22.04 LTS (Free tier eligible)
- 64-bit (x86)

**Instance Type:**

For initial launch (small scale):

- `t3.large` - 2 vCPU, 8 GB RAM - $60/month
- Good for 5-10 concurrent preview environments

For growth (medium scale):

- `t3.xlarge` - 4 vCPU, 16 GB RAM - $120/month
- Good for 20-50 concurrent preview environments

**Key Pair:**

- Create new: `previewcloud-production`
- Download `.pem` file
- Save to: `~/.ssh/previewcloud-production.pem`
- Set permissions: `chmod 400 ~/.ssh/previewcloud-production.pem`

**Network Settings:**

Security Group: Create new `previewcloud-sg`

Inbound Rules:

```
SSH (22)        - Your IP only        - For management
HTTP (80)       - 0.0.0.0/0          - For web traffic
HTTPS (443)     - 0.0.0.0/0          - For secure traffic
Custom TCP      - 0.0.0.0/0          - Port 8080 (Traefik dashboard)
```

**Storage:**

- Root volume: 100 GB gp3 SSD (or more based on expected usage)
- Delete on termination: No (keep data if instance fails)

**Advanced Details:**

User data (runs on first boot):

```bash
#!/bin/bash
apt-get update
apt-get upgrade -y
```

### Step 3: Launch & Connect

1. Click "Launch Instance"
2. Wait 2-3 minutes for instance to start
3. Note the **Public IP address** (e.g., `54.123.45.67`)
4. Update Hostinger DNS with this IP

**Connect via SSH:**

```bash
# Save IP to variable
export EC2_IP=54.123.45.67

# Connect
ssh -i ~/.ssh/previewcloud-production.pem ubuntu@$EC2_IP
```

### Step 4: Elastic IP (Optional but Recommended)

To keep IP permanent even if instance restarts:

1. EC2 Console → Elastic IPs → Allocate
2. Select the new IP
3. Actions → Associate
4. Select your instance
5. Update DNS with this Elastic IP

**Cost:** Free while associated with running instance

---

## 💻 Server Installation

**SSH into your EC2 instance, then run:**

### Step 1: Update System

```bash
# Update packages
sudo apt-get update
sudo apt-get upgrade -y

# Install essential tools
sudo apt-get install -y \
  curl \
  git \
  build-essential \
  ca-certificates \
  gnupg \
  lsb-release
```

### Step 2: Install Docker

```bash
# Add Docker's official GPG key
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker ubuntu

# Logout and login again (or run)
newgrp docker

# Verify
docker --version
docker compose version
```

### Step 3: Install Node.js

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version  # Should show v20.x.x
npm --version
```

### Step 4: Install PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Setup PM2 to start on system boot
pm2 startup systemd
# Copy and run the command it outputs

# Verify
pm2 --version
```

### Step 5: Setup Project Directory

```bash
# Create app directory
sudo mkdir -p /opt/previewcloud
sudo chown ubuntu:ubuntu /opt/previewcloud
cd /opt/previewcloud

# Clone repository (replace with your actual repo)
git clone https://github.com/your-username/previewcloud-node.git .

# Or upload via SCP from local machine:
# scp -i ~/.ssh/previewcloud-production.pem -r ./previewcloud-node ubuntu@$EC2_IP:/opt/previewcloud/
```

---

## ⚙️ Production Environment Configuration

### Step 1: Create Production `.env` File

```bash
cd /opt/previewcloud/backend
nano .env
```

**Production `.env` configuration:**

```bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PreviewCloud Production Environment
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Server
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Domain Configuration
DOMAIN=previewcloud.cloud
API_URL=https://api.previewcloud.cloud
FRONTEND_URL=https://dashboard.previewcloud.cloud

# MongoDB (Production - use MongoDB Atlas or local)
# Option A: MongoDB Atlas (Recommended)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/previewcloud?retryWrites=true&w=majority

# Option B: Local MongoDB
# MONGODB_URI=mongodb://localhost:27017/previewcloud

# Docker
DOCKER_HOST=unix:///var/run/docker.sock
DOCKER_NETWORK=previewcloud

# Preview Database Credentials (for provisioned DBs)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=previewcloud
POSTGRES_PASSWORD=CHANGE_THIS_STRONG_PASSWORD_123

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=previewcloud
MYSQL_PASSWORD=CHANGE_THIS_STRONG_PASSWORD_456

MONGODB_PREVIEW_HOST=localhost
MONGODB_PREVIEW_PORT=27018
MONGODB_PREVIEW_USER=previewcloud
MONGODB_PREVIEW_PASSWORD=CHANGE_THIS_STRONG_PASSWORD_789

# Traefik Configuration
TRAEFIK_NETWORK=previewcloud
TRAEFIK_HTTP_PORT=80
TRAEFIK_HTTPS_PORT=443
TRAEFIK_DASHBOARD_PORT=8080

# Security
JWT_SECRET=$(openssl rand -base64 32)
API_TOKEN_SECRET=$(openssl rand -base64 32)

# GitHub Integration
GITHUB_WEBHOOK_SECRET=$(openssl rand -hex 32)
GITHUB_APP_ID=YOUR_GITHUB_APP_ID
GITHUB_APP_PRIVATE_KEY_PATH=/opt/previewcloud/github-app-key.pem

# Email (SMTP) - Use SendGrid, AWS SES, or Mailgun
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=YOUR_SENDGRID_API_KEY
SMTP_FROM="PreviewCloud" <noreply@previewcloud.cloud>

# Billing (Stripe)
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_PRICE_ID_PRO=price_YOUR_PRO_PLAN_ID
STRIPE_PRICE_ID_ENTERPRISE=price_YOUR_ENTERPRISE_PLAN_ID

# Feature Flags
ENABLE_SIGNUP=true
ENABLE_EMAIL_VERIFICATION=true
ENABLE_BILLING=true
MAINTENANCE_MODE=false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cleanup Schedule (cron format)
CLEANUP_SCHEDULE=0 */6 * * *  # Every 6 hours
CLEANUP_IDLE_THRESHOLD_HOURS=48
```

**Generate secure secrets:**

```bash
# Generate JWT secret
echo "JWT_SECRET=$(openssl rand -base64 32)"

# Generate API token secret
echo "API_TOKEN_SECRET=$(openssl rand -base64 32)"

# Generate GitHub webhook secret
echo "GITHUB_WEBHOOK_SECRET=$(openssl rand -hex 32)"
```

### Step 2: Secure the `.env` File

```bash
# Set proper permissions
chmod 600 /opt/previewcloud/backend/.env

# Verify only you can read it
ls -la /opt/previewcloud/backend/.env
# Should show: -rw------- ubuntu ubuntu
```

---

## 🔒 SSL & Traefik Setup

### Step 1: Create Traefik Directory

```bash
cd /opt/previewcloud
mkdir -p infra/traefik
cd infra/traefik
```

### Step 2: Create Traefik Configuration

**File: `traefik.yml`**

```yaml
# Traefik Production Configuration

# API and Dashboard
api:
  dashboard: true
  insecure: false # Disable insecure access

# Entry Points
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true

  websecure:
    address: ":443"
    http:
      tls:
        certResolver: letsencrypt

# Certificate Resolver (Let's Encrypt)
certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@previewcloud.cloud # Your email
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web

# Providers
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: previewcloud

  file:
    filename: /etc/traefik/dynamic.yml
    watch: true

# Logging
log:
  level: INFO
  filePath: /var/log/traefik/traefik.log

accessLog:
  filePath: /var/log/traefik/access.log
```

**File: `dynamic.yml`**

```yaml
# Dynamic Configuration

# HTTP to HTTPS redirect middleware
http:
  middlewares:
    secure-headers:
      headers:
        sslRedirect: true
        forceSTSHeader: true
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        stsPreload: true

    rate-limit:
      rateLimit:
        average: 100
        burst: 50
        period: 1m

# TLS Options
tls:
  options:
    default:
      minVersion: VersionTLS12
      cipherSuites:
        - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
        - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
        - TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305
```

### Step 3: Create Docker Compose for Infrastructure

**File: `/opt/previewcloud/infra/docker-compose.yml`**

```yaml
version: "3.8"

services:
  # Traefik Reverse Proxy
  traefik:
    image: traefik:v2.10
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080" # Dashboard (secure with auth)
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./traefik/dynamic.yml:/etc/traefik/dynamic.yml:ro
      - traefik-certificates:/letsencrypt
      - traefik-logs:/var/log/traefik
    networks:
      - previewcloud
    labels:
      - "traefik.enable=true"
      # Dashboard
      - "traefik.http.routers.traefik.rule=Host(`traefik.previewcloud.cloud`)"
      - "traefik.http.routers.traefik.entrypoints=websecure"
      - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"
      - "traefik.http.routers.traefik.service=api@internal"
      # Basic auth (generate with: htpasswd -nb admin password)
      - "traefik.http.routers.traefik.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$hash$$here"

  # MongoDB (Platform database)
  mongodb-platform:
    image: mongo:7
    container_name: mongodb-platform
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGODB_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: previewcloud
    volumes:
      - mongodb-platform-data:/data/db
      - mongodb-platform-config:/data/configdb
    ports:
      - "27017:27017"
    networks:
      - previewcloud

  # PostgreSQL (For preview databases)
  postgres:
    image: postgres:15
    container_name: postgres-previews
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: postgres
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - previewcloud

  # MySQL (For preview databases)
  mysql:
    image: mysql:8
    container_name: mysql-previews
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
    ports:
      - "3306:3306"
    networks:
      - previewcloud

  # MongoDB (For preview databases)
  mongodb-previews:
    image: mongo:7
    container_name: mongodb-previews
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGODB_PREVIEW_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGODB_PREVIEW_PASSWORD}
    volumes:
      - mongodb-previews-data:/data/db
    ports:
      - "27018:27017"
    networks:
      - previewcloud

  # Redis (For caching and queues)
  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    networks:
      - previewcloud

networks:
  previewcloud:
    name: previewcloud
    driver: bridge

volumes:
  traefik-certificates:
  traefik-logs:
  mongodb-platform-data:
  mongodb-platform-config:
  mongodb-previews-data:
  postgres-data:
  mysql-data:
  redis-data:
```

### Step 4: Start Infrastructure

```bash
cd /opt/previewcloud/infra

# Create .env for infra
cat > .env << 'EOF'
MONGODB_ROOT_PASSWORD=$(openssl rand -base64 32)
POSTGRES_USER=previewcloud
POSTGRES_PASSWORD=$(openssl rand -base64 32)
MYSQL_USER=previewcloud
MYSQL_PASSWORD=$(openssl rand -base64 32)
MONGODB_PREVIEW_USER=previewcloud
MONGODB_PREVIEW_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
EOF

# Start infrastructure
docker compose up -d

# Verify all containers are running
docker ps

# Check logs
docker compose logs -f
```

---

## 🚀 Deploy Backend

### Step 1: Build Backend

```bash
cd /opt/previewcloud/backend

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Verify dist/ folder created
ls -la dist/
```

### Step 2: Start with PM2

```bash
# Start backend
pm2 start dist/index.js --name previewcloud-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

# Check status
pm2 status
pm2 logs previewcloud-api
```

### Step 3: Configure Backend with Traefik

Add labels to backend for Traefik routing:

**Option A: Run backend in Docker** (Recommended)

Create `backend/Dockerfile.prod`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --production

# Copy built code
COPY dist ./dist

# Expose port
EXPOSE 3001

# Start app
CMD ["node", "dist/index.js"]
```

Add to `infra/docker-compose.yml`:

```yaml
# PreviewCloud API
previewcloud-api:
  build:
    context: ../backend
    dockerfile: Dockerfile.prod
  container_name: previewcloud-api
  restart: unless-stopped
  env_file:
    - ../backend/.env
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - preview-builds:/tmp/builds
  networks:
    - previewcloud
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.api.rule=Host(`api.previewcloud.cloud`)"
    - "traefik.http.routers.api.entrypoints=websecure"
    - "traefik.http.routers.api.tls.certresolver=letsencrypt"
    - "traefik.http.services.api.loadbalancer.server.port=3001"
  depends_on:
    - mongodb-platform
    - postgres
    - mysql
    - redis
```

Rebuild and restart:

```bash
cd /opt/previewcloud/infra
docker compose up -d --build previewcloud-api
```

---

## 📊 Monitoring & Maintenance

### Setup Monitoring

**Install monitoring tools:**

```bash
# Install monitoring stack
cd /opt/previewcloud/infra

# Add to docker-compose.yml:
```

```yaml
# Grafana (Monitoring UI)
grafana:
  image: grafana/grafana:latest
  container_name: grafana
  restart: unless-stopped
  ports:
    - "3000:3000"
  environment:
    GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
  volumes:
    - grafana-data:/var/lib/grafana
  networks:
    - previewcloud
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.grafana.rule=Host(`monitoring.previewcloud.cloud`)"
    - "traefik.http.routers.grafana.entrypoints=websecure"
    - "traefik.http.routers.grafana.tls.certresolver=letsencrypt"

# Prometheus (Metrics)
prometheus:
  image: prom/prometheus:latest
  container_name: prometheus
  restart: unless-stopped
  command:
    - "--config.file=/etc/prometheus/prometheus.yml"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus-data:/prometheus
  networks:
    - previewcloud
```

### Backup Strategy

**Automated backups:**

```bash
# Create backup script
cat > /opt/previewcloud/scripts/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# Backup MongoDB
docker exec mongodb-platform mongodump --out /backup/$DATE
docker cp mongodb-platform:/backup/$DATE $BACKUP_DIR/mongodb-$DATE

# Backup PostgreSQL
docker exec postgres pg_dumpall -U previewcloud > $BACKUP_DIR/postgres-$DATE.sql

# Compress
tar -czf $BACKUP_DIR/backup-$DATE.tar.gz $BACKUP_DIR/*-$DATE*

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/backup-$DATE.tar.gz s3://previewcloud-backups/

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x /opt/previewcloud/scripts/backup.sh

# Schedule with cron
crontab -e
# Add:
0 2 * * * /opt/previewcloud/scripts/backup.sh
```

### Log Rotation

```bash
# Configure log rotation
sudo nano /etc/logrotate.d/previewcloud

# Add:
/var/log/previewcloud/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 ubuntu ubuntu
}
```

---

## 🎯 Quick Start Commands

**Complete deployment from scratch:**

```bash
# On your local machine
# Upload files to EC2
scp -i ~/.ssh/previewcloud-production.pem -r ./previewcloud-node ubuntu@YOUR_EC2_IP:/opt/previewcloud/

# SSH to EC2
ssh -i ~/.ssh/previewcloud-production.pem ubuntu@YOUR_EC2_IP

# On EC2 instance
cd /opt/previewcloud

# Start infrastructure
cd infra
docker compose up -d

# Build and start backend
cd ../backend
npm install
npm run build
pm2 start dist/index.js --name previewcloud-api
pm2 save

# Verify
pm2 status
docker ps
curl https://api.previewcloud.cloud/api/health
```

---

## 🔧 Troubleshooting

### Check Services

```bash
# Backend logs
pm2 logs previewcloud-api

# Docker logs
docker compose logs -f

# Traefik logs
docker logs traefik

# System resources
htop
df -h
docker system df
```

### Common Issues

**1. SSL Certificate Issues:**

```bash
# Check Traefik logs
docker logs traefik | grep -i "certificate"

# Verify DNS
dig api.previewcloud.cloud
```

**2. Docker Socket Permission:**

```bash
sudo chmod 666 /var/run/docker.sock
```

**3. Port Already in Use:**

```bash
# Check what's using port
sudo lsof -i :80
sudo lsof -i :443
```

---

## ✅ Deployment Checklist

- [ ] EC2 instance launched and running
- [ ] Elastic IP allocated and associated
- [ ] DNS configured in Hostinger (A records)
- [ ] SSH key configured
- [ ] Docker installed
- [ ] Node.js & PM2 installed
- [ ] Project files uploaded
- [ ] Production `.env` configured
- [ ] Infrastructure containers started (Traefik, MongoDB, etc.)
- [ ] Backend built and started
- [ ] SSL certificates obtained (Let's Encrypt via Traefik)
- [ ] Health check working: `https://api.previewcloud.cloud/api/health`
- [ ] Monitoring setup
- [ ] Backups configured
- [ ] GitHub Action published

---

**Your PreviewCloud is now LIVE! 🎉**

- API: https://api.previewcloud.cloud
- Dashboard: https://dashboard.previewcloud.cloud (once frontend deployed)
- Monitoring: https://monitoring.previewcloud.cloud
