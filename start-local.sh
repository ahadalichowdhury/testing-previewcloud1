#!/bin/bash

# PreviewCloud Local Development Startup Script
# Starts the entire PreviewCloud stack locally for development

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
║               CLOUD - Local Development                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${GREEN}🚀 Starting PreviewCloud in LOCAL mode...${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 20+ and try again.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js $NODE_VERSION${NC}"

# Navigate to project root
cd "$SCRIPT_DIR"

# Step 1: Start infrastructure (Docker Compose)
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  STEP 1: Starting Infrastructure (Docker)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd infra

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found in infra/. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created infra/.env from template${NC}"
        echo -e "${YELLOW}📝 Please edit infra/.env and add your passwords before continuing.${NC}"
        echo -e "${YELLOW}   Run this script again after configuring.${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  Running environment generator...${NC}"
        if [ -f production-env-generator.sh ]; then
            ./production-env-generator.sh
        else
            echo -e "${RED}❌ Cannot find .env.example or production-env-generator.sh${NC}"
            exit 1
        fi
    fi
fi

echo -e "${BLUE}🐳 Starting Docker Compose services...${NC}"
docker compose -f docker-compose.yml up -d

echo -e "${GREEN}✅ Infrastructure started${NC}"

# Wait for services to be ready
echo ""
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Check MongoDB
echo -e "${BLUE}   Checking MongoDB...${NC}"
docker exec previewcloud-mongodb mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1 && echo -e "${GREEN}   ✅ MongoDB ready${NC}" || echo -e "${YELLOW}   ⚠️  MongoDB not ready yet${NC}"

# Check PostgreSQL
echo -e "${BLUE}   Checking PostgreSQL...${NC}"
docker exec previewcloud-postgres pg_isready -U postgres > /dev/null 2>&1 && echo -e "${GREEN}   ✅ PostgreSQL ready${NC}" || echo -e "${YELLOW}   ⚠️  PostgreSQL not ready yet${NC}"

# Check MySQL
echo -e "${BLUE}   Checking MySQL...${NC}"
docker exec previewcloud-mysql mysqladmin ping -h localhost --silent > /dev/null 2>&1 && echo -e "${GREEN}   ✅ MySQL ready${NC}" || echo -e "${YELLOW}   ⚠️  MySQL not ready yet${NC}"

# Check Redis
echo -e "${BLUE}   Checking Redis...${NC}"
docker exec redis redis-cli ping > /dev/null 2>&1 && echo -e "${GREEN}   ✅ Redis ready${NC}" || echo -e "${YELLOW}   ⚠️  Redis not ready yet${NC}"

# Step 2: Setup backend
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  STEP 2: Setting Up Backend${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$SCRIPT_DIR/backend"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found in backend/. Copying from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created backend/.env from template${NC}"
    else
        echo -e "${RED}❌ Cannot find backend/.env.example${NC}"
        exit 1
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Build TypeScript
echo -e "${BLUE}🔨 Building TypeScript...${NC}"
npm run build
echo -e "${GREEN}✅ Build completed${NC}"

# Step 3: Start backend
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  STEP 3: Starting Backend API${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}🚀 Starting backend in development mode...${NC}"
echo ""

# Final status
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ PreviewCloud is starting!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}🌐 Services:${NC}"
echo -e "   • Backend API: ${GREEN}http://localhost:3001${NC}"
echo -e "   • Swagger Docs: ${GREEN}http://localhost:3001/api/docs${NC}"
echo -e "   • Traefik Dashboard: ${GREEN}http://localhost:8080${NC}"
echo ""
echo -e "${BLUE}🗄️  Databases:${NC}"
echo -e "   • MongoDB: ${GREEN}mongodb://localhost:27017${NC}"
echo -e "   • PostgreSQL: ${GREEN}localhost:5432${NC}"
echo -e "   • MySQL: ${GREEN}localhost:3306${NC}"
echo -e "   • Redis: ${GREEN}localhost:6379${NC}"
echo ""
echo -e "${YELLOW}📝 Logs: Backend will start with nodemon (auto-restart on changes)${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start backend with nodemon (will show logs)
npm run dev

