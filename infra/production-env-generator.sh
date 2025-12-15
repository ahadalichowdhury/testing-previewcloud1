#!/bin/bash

# Production Environment Generator for PreviewCloud
# Generates secure passwords and creates .env files

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PreviewCloud - Production Environment Generator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to generate secure password
generate_password() {
  openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Generate passwords
MONGODB_ROOT_PASSWORD=$(generate_password)
POSTGRES_PASSWORD=$(generate_password)
MYSQL_PASSWORD=$(generate_password)
MONGODB_PREVIEW_PASSWORD=$(generate_password)
REDIS_PASSWORD=$(generate_password)
JWT_SECRET=$(openssl rand -base64 32)
API_TOKEN_SECRET=$(openssl rand -base64 32)
GITHUB_WEBHOOK_SECRET=$(openssl rand -hex 32)

echo "✅ Generated secure passwords and secrets"
echo ""

# Create infrastructure .env
cat > .env << EOF
# PreviewCloud Production Infrastructure
# Generated on: $(date)

# MongoDB (Platform)
MONGODB_ROOT_PASSWORD=$MONGODB_ROOT_PASSWORD

# PostgreSQL (Preview Databases)
POSTGRES_USER=previewcloud
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# MySQL (Preview Databases)
MYSQL_USER=previewcloud
MYSQL_PASSWORD=$MYSQL_PASSWORD

# MongoDB (Preview Databases)
MONGODB_PREVIEW_USER=previewcloud
MONGODB_PREVIEW_PASSWORD=$MONGODB_PREVIEW_PASSWORD

# Redis
REDIS_PASSWORD=$REDIS_PASSWORD

# Grafana (Optional)
GRAFANA_PASSWORD=admin
EOF

echo "✅ Created infra/.env"
echo ""

# Create backend .env template
cat > ../backend/.env << EOF
# PreviewCloud Backend Production Configuration
# Generated on: $(date)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Server Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Domain Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DOMAIN=previewcloud.cloud
API_URL=https://api.previewcloud.cloud
FRONTEND_URL=https://dashboard.previewcloud.cloud

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MongoDB (Platform Database)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Option A: Use local MongoDB from docker-compose
MONGODB_URI=mongodb://admin:$MONGODB_ROOT_PASSWORD@mongodb-platform:27017/previewcloud?authSource=admin

# Option B: Use MongoDB Atlas (recommended for production)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/previewcloud?retryWrites=true&w=majority

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Docker Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DOCKER_HOST=unix:///var/run/docker.sock
DOCKER_NETWORK=previewcloud

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Preview Database Credentials
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# PostgreSQL
POSTGRES_HOST=postgres-previews
POSTGRES_PORT=5432
POSTGRES_USER=previewcloud
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# MySQL
MYSQL_HOST=mysql-previews
MYSQL_PORT=3306
MYSQL_USER=previewcloud
MYSQL_PASSWORD=$MYSQL_PASSWORD

# MongoDB
MONGODB_PREVIEW_HOST=mongodb-previews
MONGODB_PREVIEW_PORT=27017
MONGODB_PREVIEW_USER=previewcloud
MONGODB_PREVIEW_PASSWORD=$MONGODB_PREVIEW_PASSWORD

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Traefik Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TRAEFIK_NETWORK=previewcloud
TRAEFIK_HTTP_PORT=80
TRAEFIK_HTTPS_PORT=443
TRAEFIK_DASHBOARD_PORT=8080

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Security
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

JWT_SECRET=$JWT_SECRET
API_TOKEN_SECRET=$API_TOKEN_SECRET

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GitHub Integration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GITHUB_WEBHOOK_SECRET=$GITHUB_WEBHOOK_SECRET

# GitHub App (Optional - configure after creating GitHub App)
# GITHUB_APP_ID=123456
# GITHUB_APP_PRIVATE_KEY_PATH=/opt/previewcloud/github-app.pem
# GITHUB_APP_SLUG=previewcloud

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Email (SMTP) - Configure one of these services
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Option A: SendGrid (recommended)
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=apikey
# SMTP_PASS=YOUR_SENDGRID_API_KEY
# SMTP_FROM="PreviewCloud" <noreply@previewcloud.cloud>

# Option B: Gmail (for testing only)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# SMTP_FROM="PreviewCloud" <noreply@previewcloud.cloud>

# Option C: AWS SES
# SMTP_HOST=email-smtp.us-east-1.amazonaws.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=YOUR_SES_SMTP_USERNAME
# SMTP_PASS=YOUR_SES_SMTP_PASSWORD
# SMTP_FROM="PreviewCloud" <noreply@previewcloud.cloud>

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Billing (Stripe) - Configure after creating Stripe account
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY
# STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
# STRIPE_PRICE_ID_PRO=price_YOUR_PRO_PLAN_ID
# STRIPE_PRICE_ID_ENTERPRISE=price_YOUR_ENTERPRISE_PLAN_ID

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Feature Flags
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENABLE_SIGNUP=true
ENABLE_EMAIL_VERIFICATION=true
ENABLE_BILLING=false
MAINTENANCE_MODE=false

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Rate Limiting
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Cleanup Schedule (cron format)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLEANUP_SCHEDULE=0 */6 * * *  # Every 6 hours
CLEANUP_IDLE_THRESHOLD_HOURS=48
EOF

echo "✅ Created backend/.env (review and customize)"
echo ""

# Secure the files
chmod 600 .env
chmod 600 ../backend/.env

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Environment files created successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Generated files:"
echo "   • infra/.env (infrastructure passwords)"
echo "   • backend/.env (backend configuration)"
echo ""
echo "🔒 File permissions set to 600 (secure)"
echo ""
echo "📋 Next steps:"
echo "   1. Review backend/.env and configure:"
echo "      - SMTP settings (for email)"
echo "      - SMTP settings (for email)"
echo "      - GitHub App credentials (optional)"
echo "      - Stripe keys (optional)"
echo "   2. Start infrastructure:"
echo "      cd infra && docker compose -f docker-compose.prod.yml up -d"
echo "   3. Check logs:"
echo "      docker compose logs -f"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

