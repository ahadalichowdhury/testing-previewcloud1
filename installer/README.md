# PreviewCloud Installer

Automated installation script for deploying PreviewCloud on a single EC2 instance or VPS.

## Quick Install

```bash
curl -fsSL https://install.previewcloud.com | sudo bash
```

Or download and run manually:

```bash
wget https://raw.githubusercontent.com/yourusername/previewcloud/main/installer/install.sh
chmod +x install.sh
sudo ./install.sh
```

## Prerequisites

### Server Requirements

- **OS**: Ubuntu 20.04+, Debian 11+, or Amazon Linux 2
- **RAM**: Minimum 4GB, Recommended 8GB+
- **CPU**: Minimum 2 cores, Recommended 4+ cores
- **Disk**: Minimum 40GB SSD
- **Network**: Public IP address with ports 80, 443 open

### DNS Configuration

Before installation, configure your DNS:

```
Type    Name                            Value
A       *.preview.previewcloud.cloud       YOUR_SERVER_IP
A       api.preview.previewcloud.cloud     YOUR_SERVER_IP
A       traefik.preview.previewcloud.cloud YOUR_SERVER_IP
```

## What Gets Installed

The installer will set up:

1. **Docker & Docker Compose** - Container runtime
2. **Node.js 20** - JavaScript runtime
3. **Traefik** - Reverse proxy with automatic SSL
4. **MongoDB** - Platform metadata database
5. **PostgreSQL** - For preview databases
6. **MySQL** - For preview databases
7. **MongoDB** - For preview databases
8. **PreviewCloud Backend** - Main application

## Installation Steps

### 1. Run the installer

```bash
sudo ./install.sh
```

### 2. Follow the prompts

The installer will ask for:

- Base domain (e.g., `preview.previewcloud.cloud`)
- API domain (e.g., `api.preview.previewcloud.cloud`)
- Traefik domain (e.g., `traefik.preview.previewcloud.cloud`)
- Email for Let's Encrypt

### 3. Save the credentials

The installer will generate and display:

- GitHub Webhook Secret
- API Token Secret
- Database passwords

**Important**: Save these securely!

## Post-Installation

### Generate API Token

```bash
# Generate a token for GitHub Actions
curl -X POST https://api.preview.previewcloud.cloud/api/auth/generate-token \
  -H "Content-Type: application/json"
```

### Set Up GitHub Webhook

1. Go to your repository → Settings → Webhooks
2. Add webhook:
   - **Payload URL**: `https://api.preview.previewcloud.cloud/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: Use the webhook secret from installation
   - **Events**: Select "Pull requests"

### Add GitHub Action

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
          api-url: https://api.preview.previewcloud.cloud
```

Add the API token as a secret in your repository settings.

## Management

### Check Status

```bash
# Check service status
sudo systemctl status previewcloud

# View logs
sudo journalctl -u previewcloud -f

# Check containers
sudo docker ps
```

### Start/Stop/Restart

```bash
# Stop PreviewCloud
sudo systemctl stop previewcloud

# Start PreviewCloud
sudo systemctl start previewcloud

# Restart PreviewCloud
sudo systemctl restart previewcloud
```

### Update PreviewCloud

```bash
cd /opt/previewcloud
sudo git pull
sudo systemctl restart previewcloud
```

### Backup

```bash
# Backup databases
sudo docker exec previewcloud-mongodb mongodump --out=/backup
sudo docker exec previewcloud-postgres pg_dumpall -U postgres > backup.sql

# Backup configuration
sudo cp -r /etc/previewcloud /backup/
```

## Troubleshooting

### Check Logs

```bash
# Application logs
sudo journalctl -u previewcloud -f

# Docker logs
sudo docker-compose -f /opt/previewcloud/infra/docker-compose.yml logs -f

# Specific service logs
sudo docker logs previewcloud-backend -f
```

### Common Issues

#### Port already in use

```bash
# Check what's using port 80/443
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# Stop conflicting services
sudo systemctl stop nginx  # or apache2
```

#### SSL Certificate Issues

```bash
# Check certificate
sudo docker exec traefik cat /letsencrypt/acme.json

# Remove and regenerate
sudo rm /opt/previewcloud/traefik-certs/acme.json
sudo systemctl restart previewcloud
```

#### Docker permission issues

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Restart docker
sudo systemctl restart docker
```

## Uninstall

```bash
# Stop services
sudo systemctl stop previewcloud
sudo systemctl disable previewcloud

# Remove containers
cd /opt/previewcloud
sudo docker-compose -f infra/docker-compose.yml down -v

# Remove files
sudo rm -rf /opt/previewcloud
sudo rm -rf /etc/previewcloud
sudo rm /etc/systemd/system/previewcloud.service

# Reload systemd
sudo systemctl daemon-reload
```

## Security Recommendations

1. **Firewall**: Only open ports 80, 443, and 22
2. **SSH**: Use key-based authentication, disable password auth
3. **Updates**: Keep system and Docker up to date
4. **Monitoring**: Set up monitoring and alerts
5. **Backups**: Regular automated backups
6. **Secrets**: Rotate secrets regularly

## Support

- Documentation: https://docs.previewcloud.com
- Issues: https://github.com/yourusername/previewcloud/issues
- Community: https://discord.gg/previewcloud
