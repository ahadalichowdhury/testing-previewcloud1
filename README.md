# PreviewCloud

A fully automated PR-based preview environment platform for multi-service, multi-repo, cloud-native applications.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Features

- **Automatic Preview Environments**: Create isolated environments for every Pull Request
- **Multi-Service Support**: Deploy multiple services (api, web, worker, cron) per preview
- **Multi-Database Support**: PostgreSQL, MySQL, and MongoDB with automatic provisioning
- **Auto-SSL**: Automatic HTTPS with Let's Encrypt via Traefik
- **Real-time Logs**: WebSocket-based live log streaming
- **Auto-Cleanup**: Automatic resource cleanup for idle and closed PRs
- **GitHub Integration**: Seamless integration with GitHub Actions and Webhooks
- **Self-Hosted**: Deploy on your own infrastructure (single EC2 instance)

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [User Guide](#user-guide) 👥 **How to Use PreviewCloud**
- [API Documentation](#api-documentation) 📚
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Development](#development)
- [Contributing](#contributing)

## ⚡ Quick Start

## 👥 User Guide

### New to PreviewCloud? Start Here!

**For Developers:**
- 📖 [Complete User Guide](USER_GUIDE.md) - Full workflow from setup to daily use
- ⚡ [Quick Start Guide](QUICK_START.md) - Get started in 5 minutes
- 🎬 **Real-world examples** and use cases
- 👥 **Team collaboration** workflows

**For Admins:**
- 🚀 [Local Setup Guide](LOCAL_SETUP_GUIDE.md) - Run PreviewCloud locally
- 🔧 [Deployment Guide](docs/deployment.md) - Deploy to production
- ⚙️ [Configuration Guide](docs/config.md) - All configuration options

---

## 📚 API Documentation

PreviewCloud includes **comprehensive Swagger/OpenAPI documentation** for all API endpoints!

### Interactive Swagger UI

Access the interactive API documentation:

- **Local**: `http://localhost:3001/api/docs`
- **Production**: `https://api.previewcloud.cloud/api/docs`

### Features

✅ All endpoints documented with examples  
✅ Interactive API testing (no Postman needed!)  
✅ Request/Response schemas  
✅ Authentication setup  
✅ WebSocket documentation  
✅ Export to Postman, Insomnia, or generate client code  

📖 [Read the full Swagger Guide](SWAGGER_GUIDE.md)

---

### Prerequisites

- Ubuntu 20.04+ / Debian 11+ / Amazon Linux 2
- Minimum 4GB RAM, 2 CPU cores
- Domain with wildcard DNS configured

### Installation

```bash
curl -fsSL https://install.previewcloud.com | sudo bash
```

### Configure GitHub Action

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

### Create Preview Configuration

Create `preview.yaml` in your repository root:

```yaml
services:
  api:
    dockerfile: ./api/Dockerfile
    port: 8080
    env:
      NODE_ENV: preview

  web:
    dockerfile: ./web/Dockerfile
    port: 3000

database:
  type: postgres
  migrations: ./migrations

env:
  LOG_LEVEL: debug
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Pull Request │  │ GitHub Action│  │   Webhook    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    PreviewCloud API                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Preview Manager → Build Manager → Docker Service     │  │
│  │       ↓              ↓                ↓               │  │
│  │ DB Provisioner   Traefik Service   Logs Service      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Docker  │  │ Traefik  │  │ MongoDB  │  │  DBs     │  │
│  │  Engine  │  │  Proxy   │  │ Platform │  │ Preview  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Components

- **API Server**: Express.js REST API with WebSocket support
- **Preview Manager**: Core orchestration logic for preview lifecycle
- **Build Manager**: Docker image building and caching
- **DB Provisioner**: Database creation and migration runner
- **Docker Service**: Container lifecycle management
- **Traefik Service**: Dynamic routing and SSL generation
- **Logs Service**: Centralized logging with real-time streaming
- **Cleanup Scheduler**: Automatic resource cleanup

## 📦 Installation

See [Installation Guide](docs/deployment.md) for detailed instructions.

### Quick Install

```bash
# Install PreviewCloud
curl -fsSL https://install.previewcloud.com | sudo bash

# Verify installation
systemctl status previewcloud
docker ps
```

## ⚙️ Configuration

### Environment Variables

See [Configuration Guide](docs/config.md) for all options.

Key variables:

```bash
# Domain Configuration
BASE_DOMAIN=preview.previewcloud.cloud
API_DOMAIN=api.previewcloud.cloud

# Database Configuration
POSTGRES_HOST=localhost
MYSQL_HOST=localhost
MONGODB_HOST=localhost

# Preview Limits
MAX_PREVIEWS=20
IDLE_TIMEOUT_HOURS=48
```

### preview.yaml Specification

Full specification in [docs/config.md](docs/config.md).

```yaml
services:
  <service-name>:
    dockerfile: <path> # Required
    port: <number> # Optional
    env: <object> # Optional
    context: <path> # Optional
    buildArgs: <object> # Optional

database:
  type: postgres|mysql|mongodb
  migrations: <path> # Optional

env:
  <KEY>: <value>

password: <string> # Optional
```

## 📖 Usage

### Creating a Preview

Previews are automatically created when:

1. A pull request is opened
2. New commits are pushed to an open PR
3. A closed PR is reopened

### Accessing Previews

Each service gets its own URL:

```
pr-{number}-{owner}.{service}.{domain}
```

Examples:

- `pr-123-john.api.preview.previewcloud.cloud`
- `pr-123-john.web.preview.previewcloud.cloud`

### Viewing Logs

```bash
# Via API
curl https://api.previewcloud.cloud/api/previews/123/logs

# Via WebSocket
ws://api.previewcloud.cloud/api/previews/123/logs/stream
```

### Manual Management

```bash
# List all previews
curl https://api.previewcloud.cloud/api/previews

# Get preview details
curl https://api.previewcloud.cloud/api/previews/123

# Destroy preview
curl -X DELETE https://api.previewcloud.cloud/api/previews/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📚 API Reference

See [API Documentation](docs/api.md) for complete reference.

### Endpoints

- `POST /api/previews` - Create or update preview
- `GET /api/previews` - List all previews
- `GET /api/previews/:prNumber` - Get preview details
- `DELETE /api/previews/:prNumber` - Destroy preview
- `GET /api/previews/:prNumber/logs` - Get logs
- `WS /api/previews/:prNumber/logs/stream` - Stream logs
- `POST /api/webhooks/github` - GitHub webhook handler

## 🛠️ Development

### Prerequisites

- Node.js 20+
- Docker
- MongoDB
- PostgreSQL (optional)
- MySQL (optional)

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/previewcloud.git
cd previewcloud

# Install backend dependencies
cd backend
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start dependencies
docker-compose -f infra/docker-compose.yml up -d mongodb postgres mysql

# Start development server
npm run dev
```

### Project Structure

```
previewcloud/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── models/         # Database models
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Utilities
│   └── package.json
├── github-action/          # GitHub Action
├── infra/                  # Infrastructure configs
├── installer/              # Installation scripts
└── docs/                   # Documentation
```

## 🔒 Security

- API token authentication (JWT)
- GitHub webhook signature verification
- Optional password protection for previews
- Network isolation per preview
- Encrypted database credentials

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Inspired by Vercel, Railway, and other preview environment platforms
- Built with Express, Docker, Traefik, and MongoDB

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/previewcloud/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/previewcloud/discussions)

---

Made with ❤️ by the PreviewCloud team
