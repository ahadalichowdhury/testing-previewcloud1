#!/bin/bash

# PreviewCloud Production Deployment Script
# One-command deployment for production servers

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}"
cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ██████╗ ██████╗ ███████╗██╗   ██╗██╗███████╗██╗    ██╗    ║
║   ██╔══██╗██╔══██╗██╔════╝██║   ██║██║██╔════╝██║    ██║    ║
║   ██████╔╝██████╔╝█████╗  ██║   ██║██║█████╗  ██║ █╗ ██║    ║
║   ██╔═══╝ ██╔══██╗██╔══╝  ╚██╗ ██╔╝██║██╔══╝  ██║███╗██║    ║
║   ██║     ██║  ██║███████╗ ╚████╔╝ ██║███████╗╚███╔███╔╝    ║
║   ╚═╝     ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚═╝╚══════╝ ╚══╝╚══╝     ║
║                                                              ║
║               CLOUD - Production Deployment                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${GREEN}🚀 Starting Production Deployment...${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Do not run this script as root. Run as a regular user with sudo access.${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker not found. Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}✅ Docker installed${NC}"
    echo -e "${YELLOW}⚠️  You need to log out and log back in for Docker group permissions to take effect.${NC}"
    echo -e "${YELLOW}   Then run this script again.${NC}"
    exit 0
fi

echo -e "${GREEN}✅ Docker is installed${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker is not running. Starting Docker...${NC}"
    sudo systemctl start docker
    sudo systemctl enable docker
    sleep 5
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. Installing Node.js 20...${NC}"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
    echo -e "${GREEN}✅ Node.js installed${NC}"
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js $NODE_VERSION${NC}"
fi

# Navigate to project root
cd "$SCRIPT_DIR"

# Step 1: Generate environment files if they don't exist
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  STEP 1: Environment Configuration${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$SCRIPT_DIR/infra"

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env files found. Generating...${NC}"
    if [ -f production-env-generator.sh ]; then
        ./production-env-generator.sh
        echo ""
        echo -e "${GREEN}✅ Environment files generated${NC}"
        echo ""
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}  ⚠️  IMPORTANT: Configure Email & Billing${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${YELLOW}Edit backend/.env and configure:${NC}"
        echo -e "   1. SMTP settings (for email)"
        echo -e "   2. Stripe keys (for billing) - optional"
        echo -e "   3. GitHub App credentials - optional"
        echo ""
        echo -e "${BLUE}Example SMTP config:${NC}"
        echo -e "   SMTP_HOST=smtp.sendgrid.net"
        echo -e "   SMTP_PORT=587"
        echo -e "   SMTP_USER=apikey"
        echo -e "   SMTP_PASS=YOUR_SENDGRID_KEY"
        echo ""
        echo -e "${YELLOW}After configuring, press ENTER to continue or Ctrl+C to exit...${NC}"
        read -p ""
    else
        echo -e "${RED}❌ Cannot find production-env-generator.sh${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Environment files already exist${NC}"
fi

# Step 2: Build backend
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  STEP 2: Building Backend${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$SCRIPT_DIR/backend"

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci --production=false
echo -e "${GREEN}✅ Dependencies installed${NC}"

echo -e "${BLUE}🔨 Building TypeScript...${NC}"
npm run build
echo -e "${GREEN}✅ Build completed${NC}"

# Step 3: Start infrastructure with Docker Compose
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  STEP 3: Starting Infrastructure${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$SCRIPT_DIR/infra"

echo -e "${BLUE}🐳 Starting all services with Docker Compose...${NC}"
docker compose -f docker-compose.prod.yml up -d --build

echo -e "${GREEN}✅ All services started${NC}"

# Step 4: Wait for services to be healthy
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  STEP 4: Verifying Services${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}⏳ Waiting for services to be ready (30 seconds)...${NC}"
sleep 30

# Check each service
echo -e "${BLUE}🔍 Checking service health:${NC}"
echo ""

# Traefik
if docker ps | grep -q traefik; then
    echo -e "   ✅ ${GREEN}Traefik${NC}"
else
    echo -e "   ❌ ${RED}Traefik${NC}"
fi

# MongoDB
if docker ps | grep -q mongodb-platform; then
    echo -e "   ✅ ${GREEN}MongoDB (Platform)${NC}"
else
    echo -e "   ❌ ${RED}MongoDB (Platform)${NC}"
fi

# PostgreSQL
if docker ps | grep -q postgres-previews; then
    echo -e "   ✅ ${GREEN}PostgreSQL${NC}"
else
    echo -e "   ❌ ${RED}PostgreSQL${NC}"
fi

# MySQL
if docker ps | grep -q mysql-previews; then
    echo -e "   ✅ ${GREEN}MySQL${NC}"
else
    echo -e "   ❌ ${RED}MySQL${NC}"
fi

# Redis
if docker ps | grep -q redis; then
    echo -e "   ✅ ${GREEN}Redis${NC}"
else
    echo -e "   ❌ ${RED}Redis${NC}"
fi

# PreviewCloud API
if docker ps | grep -q previewcloud-api; then
    echo -e "   ✅ ${GREEN}PreviewCloud API${NC}"
else
    echo -e "   ❌ ${RED}PreviewCloud API${NC}"
fi

# Grafana
if docker ps | grep -q grafana; then
    echo -e "   ✅ ${GREEN}Grafana${NC}"
else
    echo -e "   ⚠️  ${YELLOW}Grafana (optional)${NC}"
fi

# Prometheus
if docker ps | grep -q prometheus; then
    echo -e "   ✅ ${GREEN}Prometheus${NC}"
else
    echo -e "   ⚠️  ${YELLOW}Prometheus (optional)${NC}"
fi

# Step 5: Test API
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  STEP 5: Testing API${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}🔍 Testing local API endpoint...${NC}"
sleep 5

if curl -f -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✅ API is responding on http://localhost:3001${NC}"
else
    echo -e "${YELLOW}⚠️  API not responding yet (may need more time)${NC}"
fi

# Step 6: Setup backup cron job
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  STEP 6: Setting Up Backups${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f "$SCRIPT_DIR/infra/scripts/backup.sh" ]; then
    chmod +x "$SCRIPT_DIR/infra/scripts/backup.sh"
    
    # Check if cron job already exists
    if ! crontab -l 2>/dev/null | grep -q "backup.sh"; then
        echo -e "${BLUE}📅 Setting up daily backup at 2 AM...${NC}"
        (crontab -l 2>/dev/null; echo "0 2 * * * $SCRIPT_DIR/infra/scripts/backup.sh >> /var/log/previewcloud-backup.log 2>&1") | crontab -
        echo -e "${GREEN}✅ Backup cron job configured${NC}"
    else
        echo -e "${GREEN}✅ Backup cron job already exists${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Backup script not found${NC}"
fi

# Final status
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")

echo -e "${BLUE}🌐 Your PreviewCloud is now running!${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  PUBLIC URLs (after DNS propagates):${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "   • API: ${GREEN}https://api.previewcloud.cloud${NC}"
echo -e "   • Swagger Docs: ${GREEN}https://api.previewcloud.cloud/api/docs${NC}"
echo -e "   • Traefik Dashboard: ${GREEN}https://traefik.previewcloud.cloud${NC}"
echo -e "   • Monitoring: ${GREEN}https://monitoring.previewcloud.cloud${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  LOCAL ACCESS (immediate):${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "   • API: ${GREEN}http://localhost:3001${NC}"
echo -e "   • API: ${GREEN}http://$SERVER_IP:3001${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  NEXT STEPS:${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "   1. ${BLUE}Configure DNS:${NC}"
echo -e "      Add A records in Hostinger pointing to: ${GREEN}$SERVER_IP${NC}"
echo -e "      • api.previewcloud.cloud → $SERVER_IP"
echo -e "      • *.preview.previewcloud.cloud → $SERVER_IP"
echo -e "      • traefik.previewcloud.cloud → $SERVER_IP"
echo -e "      • monitoring.previewcloud.cloud → $SERVER_IP"
echo ""
echo -e "   2. ${BLUE}Wait for SSL:${NC}"
echo -e "      Traefik will auto-generate SSL certificates (1-2 minutes)"
echo ""
echo -e "   3. ${BLUE}Test API:${NC}"
echo -e "      curl https://api.previewcloud.cloud/api/health"
echo ""
echo -e "   4. ${BLUE}View Logs:${NC}"
echo -e "      docker compose -f $SCRIPT_DIR/infra/docker-compose.prod.yml logs -f"
echo ""
echo -e "   5. ${BLUE}Create GitHub App:${NC}"
echo -e "      See GITHUB_APP_SETUP.md for instructions"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  USEFUL COMMANDS:${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "   • View logs: ${GREEN}docker compose -f infra/docker-compose.prod.yml logs -f${NC}"
echo -e "   • Restart services: ${GREEN}docker compose -f infra/docker-compose.prod.yml restart${NC}"
echo -e "   • Stop services: ${GREEN}docker compose -f infra/docker-compose.prod.yml down${NC}"
echo -e "   • View status: ${GREEN}docker ps${NC}"
echo -e "   • Run backup: ${GREEN}./infra/scripts/backup.sh${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""

