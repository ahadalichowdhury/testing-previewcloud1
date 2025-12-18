#!/bin/bash

set -e

# PreviewCloud Installation Script
# This script installs PreviewCloud on a fresh Ubuntu/Debian/Amazon Linux server

echo "========================================="
echo "   PreviewCloud Installation Script"
echo "========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}Please run as root (use sudo)${NC}"
   exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
else
    echo -e "${RED}Cannot detect operating system${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Detected OS: $OS $VERSION${NC}"

# Function to print success message
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error message
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print warning message
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Install Docker
install_docker() {
    echo ""
    echo "Installing Docker..."
    
    if command -v docker &> /dev/null; then
        print_warning "Docker is already installed"
        docker --version
    else
        case $OS in
            ubuntu|debian)
                apt-get update
                apt-get install -y ca-certificates curl gnupg
                install -m 0755 -d /etc/apt/keyrings
                curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
                chmod a+r /etc/apt/keyrings/docker.gpg
                
                echo \
                  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS \
                  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
                  tee /etc/apt/sources.list.d/docker.list > /dev/null
                
                apt-get update
                apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
                ;;
            amzn)
                yum update -y
                yum install -y docker
                service docker start
                systemctl enable docker
                ;;
            *)
                print_error "Unsupported OS for automatic Docker installation"
                exit 1
                ;;
        esac
        print_success "Docker installed"
    fi
    
    # Start Docker service
    systemctl start docker
    systemctl enable docker
}

# Install Docker Compose
install_docker_compose() {
    echo ""
    echo "Installing Docker Compose..."
    
    if command -v docker-compose &> /dev/null; then
        print_warning "Docker Compose is already installed"
        docker-compose --version
    else
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        print_success "Docker Compose installed"
    fi
}

# Install Node.js
install_nodejs() {
    echo ""
    echo "Installing Node.js 20..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_warning "Node.js is already installed: $NODE_VERSION"
    else
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
        print_success "Node.js installed"
    fi
}

# Create directory structure
create_directories() {
    echo ""
    echo "Creating directory structure..."
    
    mkdir -p /opt/previewcloud
    mkdir -p /opt/previewcloud/logs
    mkdir -p /opt/previewcloud/data
    mkdir -p /etc/previewcloud
    
    print_success "Directories created"
}

# Generate secure secrets
generate_secrets() {
    echo ""
    echo "Generating secure secrets..."
    
    JWT_SECRET=$(openssl rand -hex 32)
    API_TOKEN_SECRET=$(openssl rand -hex 32)
    GITHUB_WEBHOOK_SECRET=$(openssl rand -hex 32)
    POSTGRES_PASSWORD=$(openssl rand -hex 16)
    MYSQL_PASSWORD=$(openssl rand -hex 16)
    MONGODB_PASSWORD=$(openssl rand -hex 16)
    
    print_success "Secrets generated"
}

# Configure environment
configure_environment() {
    echo ""
    echo "========================================="
    echo "   Configuration"
    echo "========================================="
    echo ""
    
    # Prompt for domain
    read -p "Enter your base domain (e.g., preview.previewcloud.cloud): " BASE_DOMAIN
    read -p "Enter your API domain (e.g., api.previewcloud.cloud): " API_DOMAIN
    read -p "Enter your Traefik domain (e.g., traefik.preview.previewcloud.cloud): " TRAEFIK_DOMAIN
    read -p "Enter your email for Let's Encrypt: " ACME_EMAIL
    
    # Create .env file
    cat > /etc/previewcloud/.env <<EOF
# Domain Configuration
BASE_DOMAIN=$BASE_DOMAIN
API_DOMAIN=$API_DOMAIN
TRAEFIK_DOMAIN=$TRAEFIK_DOMAIN

# SSL Configuration
WILDCARD_SSL=true
ACME_EMAIL=$ACME_EMAIL

# Security
GITHUB_WEBHOOK_SECRET=$GITHUB_WEBHOOK_SECRET
JWT_SECRET=$JWT_SECRET
API_TOKEN_SECRET=$API_TOKEN_SECRET

# Database Passwords
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
MYSQL_PASSWORD=$MYSQL_PASSWORD
MONGODB_PASSWORD=$MONGODB_PASSWORD
EOF
    
    print_success "Environment configured"
    
    # Display webhook secret
    echo ""
    print_warning "IMPORTANT: Save these credentials!"
    echo ""
    echo "GitHub Webhook Secret: $GITHUB_WEBHOOK_SECRET"
    echo "API Token Secret: $API_TOKEN_SECRET"
    echo ""
}

# Setup Traefik network
setup_traefik_network() {
    echo ""
    echo "Setting up Traefik network..."
    
    if docker network ls | grep -q traefik-proxy; then
        print_warning "Traefik network already exists"
    else
        docker network create traefik-proxy
        print_success "Traefik network created"
    fi
}

# Download PreviewCloud
download_previewcloud() {
    echo ""
    echo "Downloading PreviewCloud..."
    
    cd /opt/previewcloud
    
    # In production, this would download a release
    # For now, we'll assume the code is already in place
    print_success "PreviewCloud ready"
}

# Create systemd service
create_systemd_service() {
    echo ""
    echo "Creating systemd service..."
    
    cat > /etc/systemd/system/previewcloud.service <<EOF
[Unit]
Description=PreviewCloud Service
Requires=docker.service
After=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/previewcloud
EnvironmentFile=/etc/previewcloud/.env
ExecStart=/usr/local/bin/docker-compose -f /opt/previewcloud/infra/docker-compose.yml up
ExecStop=/usr/local/bin/docker-compose -f /opt/previewcloud/infra/docker-compose.yml down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    print_success "Systemd service created"
}

# Configure firewall
configure_firewall() {
    echo ""
    echo "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw allow 8080/tcp
        print_success "UFW firewall configured"
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --permanent --add-port=8080/tcp
        firewall-cmd --reload
        print_success "Firewalld configured"
    else
        print_warning "No firewall detected. Please manually open ports 80, 443, and 8080"
    fi
}

# Start services
start_services() {
    echo ""
    echo "Starting PreviewCloud services..."
    
    systemctl enable previewcloud
    systemctl start previewcloud
    
    print_success "PreviewCloud services started"
}

# Main installation flow
main() {
    echo ""
    echo "Starting installation..."
    echo ""
    
    install_docker
    install_docker_compose
    install_nodejs
    create_directories
    generate_secrets
    configure_environment
    setup_traefik_network
    download_previewcloud
    create_systemd_service
    configure_firewall
    start_services
    
    echo ""
    echo "========================================="
    echo "   Installation Complete!"
    echo "========================================="
    echo ""
    print_success "PreviewCloud is now running!"
    echo ""
    echo "Access points:"
    echo "  - API: https://$API_DOMAIN"
    echo "  - Traefik Dashboard: https://$TRAEFIK_DOMAIN"
    echo ""
    echo "Next steps:"
    echo "  1. Point your DNS records to this server:"
    echo "     - A record: *.$BASE_DOMAIN → $(curl -s ifconfig.me)"
    echo "     - A record: $API_DOMAIN → $(curl -s ifconfig.me)"
    echo "     - A record: $TRAEFIK_DOMAIN → $(curl -s ifconfig.me)"
    echo ""
    echo "  2. Generate an API token:"
    echo "     curl -X POST https://$API_DOMAIN/api/auth/generate-token"
    echo ""
    echo "  3. Set up GitHub webhook:"
    echo "     URL: https://$API_DOMAIN/api/webhooks/github"
    echo "     Secret: $GITHUB_WEBHOOK_SECRET"
    echo ""
    echo "  4. Check status:"
    echo "     systemctl status previewcloud"
    echo "     docker ps"
    echo ""
    print_success "Happy previewing! 🚀"
    echo ""
}

# Run main installation
main

