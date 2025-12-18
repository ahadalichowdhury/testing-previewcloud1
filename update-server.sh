#!/bin/bash

# PreviewCloud Server Update Script
# Run this on your server after pushing code changes

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Updating PreviewCloud on Server...${NC}"
echo ""

# Navigate to project directory
cd /opt/previewcloud || { echo "❌ Project directory not found. Is PreviewCloud installed?"; exit 1; }

# Step 1: Pull latest code
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  STEP 1: Pulling Latest Code${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

git pull origin main || git pull origin master
echo -e "${GREEN}✅ Code updated${NC}"

# Step 2: Pull latest Docker images
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  STEP 2: Pulling Docker Images${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd infra
docker compose pull
echo -e "${GREEN}✅ Docker images updated${NC}"

# Step 3: Rebuild backend
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  STEP 3: Rebuilding Backend${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd ../backend

# Install/update dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Build TypeScript
echo -e "${BLUE}🔨 Building TypeScript...${NC}"
npm run build
echo -e "${GREEN}✅ Backend rebuilt${NC}"

# Step 4: Restart services
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  STEP 4: Restarting Services${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Restart infrastructure (if using Docker Compose)
cd ../infra
echo -e "${BLUE}🔄 Restarting infrastructure services...${NC}"
docker compose up -d --build
echo -e "${GREEN}✅ Infrastructure restarted${NC}"

# Restart backend (if using PM2)
if command -v pm2 &> /dev/null; then
    echo ""
    echo -e "${BLUE}🔄 Restarting backend with PM2...${NC}"
    pm2 restart previewcloud-api || pm2 start dist/index.js --name previewcloud-api
    pm2 save
    echo -e "${GREEN}✅ Backend restarted${NC}"
fi

# Step 5: Verify
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  STEP 5: Verifying Services${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

sleep 5

# Check Docker containers
echo -e "${BLUE}🐳 Checking Docker containers...${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check PM2 (if used)
if command -v pm2 &> /dev/null; then
    echo ""
    echo -e "${BLUE}📊 PM2 Status:${NC}"
    pm2 status
fi

# Test API
echo ""
echo -e "${BLUE}🔍 Testing API...${NC}"
if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is responding${NC}"
else
    echo -e "${YELLOW}⚠️  API not responding (may need more time)${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ UPDATE COMPLETE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📝 Useful commands:${NC}"
echo -e "   • View logs: ${GREEN}pm2 logs previewcloud-api${NC}"
echo -e "   • Docker logs: ${GREEN}docker compose -f infra/docker-compose.yml logs -f${NC}"
echo -e "   • Check status: ${GREEN}pm2 status && docker ps${NC}"
echo ""

