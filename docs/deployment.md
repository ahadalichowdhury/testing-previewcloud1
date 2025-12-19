# PreviewCloud Deployment Guide

Complete guide for deploying PreviewCloud on your infrastructure.

## Table of Contents

- [Infrastructure Requirements](#infrastructure-requirements)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Installation Methods](#installation-methods)
- [DNS Configuration](#dns-configuration)
- [SSL Configuration](#ssl-configuration)
- [Post-Deployment](#post-deployment)
- [Maintenance](#maintenance)

## Infrastructure Requirements

### Minimum Requirements

| Component   | Specification                             |
| ----------- | ----------------------------------------- |
| **OS**      | Ubuntu 20.04+, Debian 11+, Amazon Linux 2 |
| **CPU**     | 2 cores                                   |
| **RAM**     | 4 GB                                      |
| **Disk**    | 40 GB SSD                                 |
| **Network** | 100 Mbps, Public IP                       |

### Recommended Requirements

| Component   | Specification                   |
| ----------- | ------------------------------- |
| **OS**      | Ubuntu 22.04 LTS                |
| **CPU**     | 4+ cores                        |
| **RAM**     | 8+ GB                           |
| **Disk**    | 100+ GB SSD                     |
| **Network** | 1 Gbps, Public IP, IPv6 support |

### Cloud Provider Recommendations

#### AWS EC2

**Recommended Instance Types:**

- **Minimum**: t3.medium (2 vCPU, 4 GB RAM)
- **Recommended**: t3.large (2 vCPU, 8 GB RAM)
- **Production**: t3.xlarge (4 vCPU, 16 GB RAM)

**Storage:**

- gp3 EBS volumes
- Minimum 40 GB, recommended 100+ GB

#### DigitalOcean Droplets

**Recommended Plans:**

- **Minimum**: Basic (2 vCPU, 4 GB RAM)
- **Recommended**: General Purpose (4 vCPU, 8 GB RAM)

#### Linode

**Recommended Plans:**

- **Minimum**: Linode 4GB
- **Recommended**: Linode 8GB

#### Hetzner

**Recommended Plans:**

- **Minimum**: CX21 (2 vCPU, 4 GB RAM)
- **Recommended**: CX31 (2 vCPU, 8 GB RAM)

### Network Ports

| Port | Protocol | Purpose                      | Public |
| ---- | -------- | ---------------------------- | ------ |
| 22   | TCP      | SSH                          | Yes    |
| 80   | TCP      | HTTP (redirects to HTTPS)    | Yes    |
| 443  | TCP      | HTTPS                        | Yes    |
| 8080 | TCP      | Traefik Dashboard (optional) | No     |

## Pre-Deployment Checklist

### 1. Domain Setup

- [ ] Register a domain name
- [ ] Have access to DNS management
- [ ] Plan subdomain structure:
  - `preview.previewcloud.cloud` (base)
  - `api.previewcloud.cloud` (API)
  - `traefik.preview.previewcloud.cloud` (Traefik dashboard)

### 2. Server Access

- [ ] SSH access to server
- [ ] Root or sudo privileges (for initial setup only)
- [ ] Server is updated: `sudo apt update && sudo apt upgrade`
- [ ] Ubuntu user will be configured to run commands without sudo

### 3. Firewall Rules

- [ ] Allow ports 22, 80, 443
- [ ] Optional: Restrict SSH to your IP

### 4. SSL Certificate Email

- [ ] Valid email for Let's Encrypt notifications

## Initial Setup (One-Time, Requires Sudo)

Before you can run commands without sudo, you need to complete the initial setup:

```bash
# 1. Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# 2. Set ownership of previewcloud directory
sudo chown -R ubuntu:ubuntu /opt/previewcloud

# 3. Log out and log back in (or run: newgrp docker)
# This applies the docker group membership

# 4. Verify you can run docker without sudo
docker ps
```

**Note:** After this initial setup, all commands in this guide can be run without `sudo` by the `ubuntu` user. Commands that still require `sudo` are clearly marked.

## Installation Methods

### Method 1: Quick Install (Recommended)

**Initial Setup (requires sudo):**

```bash
# Download and run installer
curl -fsSL https://install.previewcloud.com | sudo bash

# Or download first, then run
wget https://raw.githubusercontent.com/yourusername/previewcloud/main/installer/install.sh
chmod +x install.sh
sudo ./install.sh
```

**Configure Ubuntu User (run once after installation):**

```bash
# Add ubuntu user to docker group (no sudo needed after this)
sudo usermod -aG docker ubuntu

# Set ownership of previewcloud directory
sudo chown -R ubuntu:ubuntu /opt/previewcloud

# Log out and log back in for group changes to take effect
# Or run: newgrp docker
```

**After setup, all commands can be run without sudo:**

```bash
cd /opt/previewcloud
docker compose -f infra/docker-compose.yml up -d
docker logs -f previewcloud-api
```

The installer will:

1. Install Docker and Docker Compose
2. Install Node.js 20
3. Create directory structure
4. Generate secure secrets
5. Prompt for configuration
6. Set up Traefik with SSL
7. Start all services

### Method 2: Manual Installation

#### Step 1: Install Docker (requires sudo)

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add ubuntu user to docker group (allows running docker without sudo)
sudo usermod -aG docker ubuntu
```

**Important:** Log out and log back in (or run `newgrp docker`) for group changes to take effect.

#### Step 2: Install Docker Compose (requires sudo)

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Step 3: Install Node.js (requires sudo)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
```

#### Step 4: Create Directories (requires sudo)

```bash
sudo mkdir -p /opt/previewcloud
sudo mkdir -p /etc/previewcloud
sudo chown -R ubuntu:ubuntu /opt/previewcloud
```

#### Step 5: Clone Repository (no sudo needed)

```bash
cd /opt/previewcloud
git clone https://github.com/yourusername/previewcloud.git .
```

#### Step 6: Configure Environment (requires sudo for /etc)

```bash
# Generate secrets
JWT_SECRET=$(openssl rand -hex 32)
API_TOKEN_SECRET=$(openssl rand -hex 32)
GITHUB_WEBHOOK_SECRET=$(openssl rand -hex 32)

# Create .env file in project directory (no sudo needed)
cd /opt/previewcloud/backend
cat > .env <<EOF
BASE_DOMAIN=preview.previewcloud.cloud
API_DOMAIN=api.previewcloud.cloud
TRAEFIK_DOMAIN=traefik.preview.previewcloud.cloud
WILDCARD_SSL=true
ACME_EMAIL=admin@previewcloud.cloud
GITHUB_WEBHOOK_SECRET=$GITHUB_WEBHOOK_SECRET
JWT_SECRET=$JWT_SECRET
API_TOKEN_SECRET=$API_TOKEN_SECRET
POSTGRES_PASSWORD=$(openssl rand -hex 16)
MYSQL_PASSWORD=$(openssl rand -hex 16)
MONGODB_PASSWORD=$(openssl rand -hex 16)
EOF
```

#### Step 7: Create Docker Network (no sudo needed after docker group setup)

```bash
docker network create traefik-proxy
```

#### Step 8: Start Services (no sudo needed)

```bash
cd /opt/previewcloud
docker compose -f infra/docker-compose.yml up -d
```

## DNS Configuration

### Wildcard DNS Setup

You need to configure DNS records to point to your server.

#### Required DNS Records

```
Type    Name                            Value
A       *.preview.previewcloud.cloud       YOUR_SERVER_IP
A       api.previewcloud.cloud     YOUR_SERVER_IP
A       traefik.preview.previewcloud.cloud YOUR_SERVER_IP
```

#### Popular DNS Providers

##### Cloudflare

1. Log in to Cloudflare Dashboard
2. Select your domain
3. Go to DNS settings
4. Add records:
   - Type: `A`, Name: `*.preview`, Content: `YOUR_IP`, Proxy: OFF
   - Type: `A`, Name: `api.preview`, Content: `YOUR_IP`, Proxy: OFF
   - Type: `A`, Name: `traefik.preview`, Content: `YOUR_IP`, Proxy: OFF

**Important:** Disable Cloudflare proxy (orange cloud) for preview domains.

##### AWS Route 53

1. Go to Route 53 Console
2. Select your hosted zone
3. Create records:

```bash
aws route53 change-resource-record-sets --hosted-zone-id YOUR_ZONE_ID --change-batch '{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "*.preview.previewcloud.cloud",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "YOUR_SERVER_IP"}]
      }
    }
  ]
}'
```

##### DigitalOcean

1. Go to Networking → Domains
2. Select your domain
3. Add records:
   - Type: `A`, Hostname: `*.preview`, Value: `YOUR_IP`
   - Type: `A`, Hostname: `api.preview`, Value: `YOUR_IP`
   - Type: `A`, Hostname: `traefik.preview`, Value: `YOUR_IP`

### Verify DNS Propagation

```bash
# Check wildcard DNS
dig pr-123-test.api.previewcloud.cloud

# Check specific subdomain
dig api.previewcloud.cloud

# Check from multiple locations
nslookup api.previewcloud.cloud 8.8.8.8
```

DNS propagation typically takes 5-60 minutes.

## SSL Configuration

PreviewCloud uses Traefik with Let's Encrypt for automatic SSL.

### Let's Encrypt Requirements

1. **Valid domain name** pointing to your server
2. **Ports 80 and 443** accessible from internet
3. **Valid email** for certificate notifications

### Automatic SSL Setup

SSL is configured automatically by the installer. Traefik will:

1. Request certificates from Let's Encrypt
2. Store certificates in `/opt/previewcloud/traefik-certs/acme.json`
3. Automatically renew certificates before expiry

### Manual SSL Verification

```bash
# Check certificate
docker exec traefik cat /letsencrypt/acme.json | jq

# View Traefik logs
docker logs traefik

# Test HTTPS
curl -I https://api.previewcloud.cloud/api/health
```

### Troubleshooting SSL

#### Certificate not issued

**Causes:**

- DNS not propagated
- Port 80/443 not accessible
- Rate limit exceeded

**Solutions:**

```bash
# Check DNS
dig api.previewcloud.cloud

# Check port accessibility
netstat -tulpn | grep :80
netstat -tulpn | grep :443

# Check Traefik logs
docker logs traefik --tail 100

# Remove and retry
rm -f /opt/previewcloud/infra/traefik-certs/acme.json
docker restart traefik
```

#### Let's Encrypt rate limits

- **50 certificates** per registered domain per week
- **5 failed validations** per account per hostname per hour

Wait or use staging endpoint for testing:

```yaml
# traefik.yml
certificatesResolvers:
  letsencrypt:
    acme:
      caServer: https://acme-staging-v02.api.letsencrypt.org/directory
```

## Post-Deployment

### 1. Verify Installation

```bash
# Check running containers
docker ps

# Check API health
curl https://api.previewcloud.cloud/api/health

# Check all services
docker compose -f infra/docker-compose.yml ps
```

Expected output:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "api": "up",
    "database": "up",
    "docker": "up"
  }
}
```

### 2. Generate API Token

```bash
# This functionality needs to be implemented
# For now, tokens are generated with the API_TOKEN_SECRET
```

### 3. Configure GitHub Webhook

1. Go to your repository → Settings → Webhooks
2. Add webhook:
   - **Payload URL**: `https://api.previewcloud.cloud/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: Use GITHUB_WEBHOOK_SECRET from installation
   - **Events**: Select "Pull requests"
   - **Active**: ✓

### 4. Add GitHub Action

Create `.github/workflows/preview.yml`:

```yaml
name: Deploy Preview
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to PreviewCloud
        uses: previewcloud/deploy@v1
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_API_TOKEN }}
          api-url: https://api.previewcloud.cloud
```

Add `PREVIEWCLOUD_API_TOKEN` to repository secrets.

### 5. Test with a Pull Request

1. Create a test PR
2. Watch GitHub Action execution
3. Check preview creation:
   ```bash
   curl https://api.previewcloud.cloud/api/previews
   ```
4. Access preview URL

## Maintenance

### Regular Updates

```bash
# Update PreviewCloud
cd /opt/previewcloud
git pull
docker compose -f infra/docker-compose.yml pull
docker compose -f infra/docker-compose.yml up -d --build
```

### Monitoring

```bash
# View backend logs
docker logs -f previewcloud-api

# View all service logs
docker compose -f infra/docker-compose.yml logs -f

# Check disk usage
df -h

# Check Docker stats
docker stats

# Check preview count
curl https://api.previewcloud.cloud/api/previews | jq '.count'
```

### Backup

```bash
# Backup MongoDB
docker exec mongodb-platform mongodump --out=/backup
docker cp mongodb-platform:/backup ./backup-$(date +%Y%m%d)

# Backup configuration
cp -r backend/.env ./config-backup-$(date +%Y%m%d)
```

### Cleanup

```bash
# Manual cleanup (be careful!)
docker system prune -a --volumes

# Remove specific preview
curl -X DELETE https://api.previewcloud.cloud/api/previews/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Production Recommendations

1. **Monitoring**: Set up monitoring (Prometheus, Grafana)
2. **Backups**: Automated daily backups
3. **Alerts**: Configure alerts for downtime
4. **Logs**: Centralized logging (ELK, Loki)
5. **Security**: Regular security updates
6. **Firewall**: Restrict access where possible
7. **SSH**: Key-based auth only, disable password auth
8. **Limits**: Set resource limits per container
9. **Scaling**: Consider multiple servers for high load
10. **Documentation**: Document your specific setup

## Troubleshooting

See [Troubleshooting Guide](troubleshooting.md) for common issues and solutions.
