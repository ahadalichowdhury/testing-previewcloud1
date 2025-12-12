# 🏗️ Frontend + Backend Communication Architecture

**How PreviewCloud handles full-stack apps in a single repository**

---

## 🎯 The Problem

User has a monorepo with:

```
my-app/
├── frontend/      (React, Next.js, Vue, etc.)
├── backend/       (Node.js, Python, Go API)
└── preview.yaml   (PreviewCloud config)
```

**Questions:**

1. How do FE and BE communicate in the preview environment?
2. What URLs do they get?
3. How does FE know the BE URL?
4. How is networking handled?

---

## ✅ The Solution: PreviewCloud Architecture

### 🌐 URL Pattern

PreviewCloud creates **separate subdomains** for each service:

```
PR #42 from repo "myapp" (owner: "acme")

Frontend URL:
https://pr-42.web.acme-myapp.preview.previewcloud.cloud

Backend URL:
https://pr-42.api.acme-myapp.preview.previewcloud.cloud

Database URL:
postgres://pr-42-acme-myapp:password@postgres.internal:5432/pr_42_acme_myapp
```

### 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         INTERNET                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Traefik (Reverse Proxy)                  │
│              SSL Termination + Routing                      │
├─────────────────────────────────────────────────────────────┤
│  Routes:                                                    │
│  • pr-42.web.*.preview.previewcloud.cloud → Frontend        │
│  • pr-42.api.*.preview.previewcloud.cloud → Backend         │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌──────────────────┐           ┌──────────────────┐
│   Frontend       │           │   Backend        │
│   Container      │           │   Container      │
│                  │           │                  │
│  React/Next.js   │──────────▶│  Node.js API     │
│  Port: 3000      │  HTTP     │  Port: 8080      │
│                  │           │                  │
│  ENV:            │           │  ENV:            │
│  NEXT_PUBLIC_    │           │  DATABASE_URL    │
│  API_URL=        │           │  REDIS_URL       │
│  https://pr-42...│           │                  │
└──────────────────┘           └────────┬─────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │   PostgreSQL     │
                              │   Container      │
                              │                  │
                              │   Port: 5432     │
                              │   (internal)     │
                              └──────────────────┘

All containers in shared Docker network: "previewcloud"
```

---

## 📝 Example Configuration

### `preview.yaml` - Full Stack App

```yaml
# Complete example for a full-stack app

services:
  # Frontend service (React, Next.js, Vue, etc.)
  web:
    dockerfile: ./frontend/Dockerfile
    port: 3000
    env:
      # PreviewCloud automatically injects these:
      # NEXT_PUBLIC_API_URL will be set to the backend URL
      NODE_ENV: production
      NEXT_PUBLIC_APP_NAME: MyApp

  # Backend API service (Node.js, Python, Go, etc.)
  api:
    dockerfile: ./backend/Dockerfile
    port: 8080
    env:
      NODE_ENV: production
      # Database URL is auto-injected by PreviewCloud
      # DATABASE_URL: postgres://...
      CORS_ORIGIN: ${WEB_URL} # Frontend URL
      JWT_SECRET: ${JWT_SECRET} # From secrets

  # Optional: Worker service
  worker:
    dockerfile: ./worker/Dockerfile
    env:
      QUEUE_URL: redis://redis:6379

# Database
database:
  type: postgres # or mysql, mongodb
  migrations: ./backend/migrations

# Secrets (set in PreviewCloud dashboard)
secrets:
  - JWT_SECRET
  - STRIPE_KEY

# Global environment variables
env:
  APP_NAME: myapp
  LOG_LEVEL: debug
```

---

## 🔧 How PreviewCloud Processes This

### Step 1: Parse Configuration

PreviewCloud reads `preview.yaml` and identifies:

- ✅ 2 services: `web`, `api`
- ✅ 1 database: `postgres`
- ✅ Environment variables needed

### Step 2: Generate URLs

```javascript
// PreviewCloud generates:
const prNumber = 42;
const repoSlug = "acme-myapp";

const urls = {
  web: `https://pr-${prNumber}.web.${repoSlug}.preview.previewcloud.cloud`,
  api: `https://pr-${prNumber}.api.${repoSlug}.preview.previewcloud.cloud`,
};

// Database connection string
const dbUrl = `postgres://pr-${prNumber}-${repoSlug}:${password}@postgres.internal:5432/pr_${prNumber}_${repoSlug}`;
```

### Step 3: Inject Environment Variables

**Frontend container receives:**

```bash
NEXT_PUBLIC_API_URL=https://pr-42.api.acme-myapp.preview.previewcloud.cloud
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=MyApp
```

**Backend container receives:**

```bash
DATABASE_URL=postgres://pr-42-acme-myapp:pass@postgres:5432/pr_42_acme_myapp
CORS_ORIGIN=https://pr-42.web.acme-myapp.preview.previewcloud.cloud
NODE_ENV=production
PORT=8080
```

### Step 4: Deploy with Docker Network

All containers are deployed in a shared Docker network:

```bash
# PreviewCloud creates:
docker network create preview-pr-42-acme-myapp

# Frontend container
docker run \
  --network preview-pr-42-acme-myapp \
  --name pr-42-web \
  -e NEXT_PUBLIC_API_URL=https://pr-42.api... \
  frontend:pr-42

# Backend container
docker run \
  --network preview-pr-42-acme-myapp \
  --name pr-42-api \
  -e DATABASE_URL=postgres://... \
  backend:pr-42
```

### Step 5: Configure Traefik Routing

```yaml
# Traefik labels auto-generated by PreviewCloud

# Frontend routing
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.pr-42-web.rule=Host(`pr-42.web.acme-myapp.preview.previewcloud.cloud`)"
  - "traefik.http.routers.pr-42-web.entrypoints=websecure"
  - "traefik.http.routers.pr-42-web.tls.certresolver=letsencrypt"
  - "traefik.http.services.pr-42-web.loadbalancer.server.port=3000"

# Backend routing
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.pr-42-api.rule=Host(`pr-42.api.acme-myapp.preview.previewcloud.cloud`)"
  - "traefik.http.routers.pr-42-api.entrypoints=websecure"
  - "traefik.http.routers.pr-42-api.tls.certresolver=letsencrypt"
  - "traefik.http.services.pr-42-api.loadbalancer.server.port=8080"
```

---

## 💻 Real-World Examples

### Example 1: Next.js + Node.js API

**Repository Structure:**

```
my-fullstack-app/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── pages/
│       └── api calls use process.env.NEXT_PUBLIC_API_URL
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       └── server.js (Express API)
├── preview.yaml
└── README.md
```

**preview.yaml:**

```yaml
services:
  web:
    dockerfile: ./frontend/Dockerfile
    port: 3000
    build_args:
      NEXT_PUBLIC_API_URL: ${API_URL} # Auto-injected

  api:
    dockerfile: ./backend/Dockerfile
    port: 8080
    env:
      CORS_ORIGIN: ${WEB_URL} # Auto-injected
      NODE_ENV: production

database:
  type: postgres
  migrations: ./backend/migrations
```

**Frontend Code (Next.js):**

```typescript
// frontend/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function fetchUser(id: string) {
  const response = await fetch(`${API_URL}/api/users/${id}`);
  return response.json();
}
```

**Backend Code (Express):**

```typescript
// backend/src/server.ts
import express from "express";
import cors from "cors";

const app = express();

// CORS automatically configured with frontend URL
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  })
);

app.get("/api/users/:id", async (req, res) => {
  // Database URL is auto-injected
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [
    req.params.id,
  ]);
  res.json(result.rows[0]);
});

app.listen(8080);
```

**Result:**

```
Frontend: https://pr-42.web.acme-myapp.preview.previewcloud.cloud
  ↓ (calls)
Backend:  https://pr-42.api.acme-myapp.preview.previewcloud.cloud/api/users/123
  ↓ (queries)
Database: postgres://pr-42-acme-myapp:pass@postgres:5432/pr_42_acme_myapp
```

---

### Example 2: React + Python FastAPI

**preview.yaml:**

```yaml
services:
  web:
    dockerfile: ./client/Dockerfile
    port: 80
    env:
      REACT_APP_API_URL: ${API_URL}

  api:
    dockerfile: ./server/Dockerfile
    port: 8000
    env:
      CORS_ORIGINS: ${WEB_URL}
      DATABASE_URL: ${DATABASE_URL}

database:
  type: postgres
```

**Frontend (React):**

```typescript
// client/src/api.ts
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const getItems = async () => {
  const res = await fetch(`${API_URL}/items`);
  return res.json();
};
```

**Backend (FastAPI):**

```python
# server/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# CORS with frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGINS", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/items")
async def get_items():
    # Use auto-injected DATABASE_URL
    db_url = os.getenv("DATABASE_URL")
    # ... query database
    return {"items": [...]}
```

---

### Example 3: Vue + Go API

**preview.yaml:**

```yaml
services:
  web:
    dockerfile: ./web/Dockerfile
    port: 8080
    env:
      VUE_APP_API_URL: ${API_URL}

  api:
    dockerfile: ./api/Dockerfile
    port: 9000
    env:
      ALLOWED_ORIGINS: ${WEB_URL}
      DB_CONNECTION: ${DATABASE_URL}

database:
  type: postgres
```

**Frontend (Vue):**

```typescript
// web/src/services/api.ts
const API_URL = process.env.VUE_APP_API_URL || "http://localhost:9000";

export const fetchData = async () => {
  const response = await fetch(`${API_URL}/api/data`);
  return response.json();
};
```

**Backend (Go):**

```go
// api/main.go
package main

import (
    "os"
    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
)

func main() {
    r := gin.Default()

    // CORS with frontend URL
    r.Use(cors.New(cors.Config{
        AllowOrigins: []string{os.Getenv("ALLOWED_ORIGINS")},
    }))

    r.GET("/api/data", func(c *gin.Context) {
        // Use DATABASE_URL from environment
        dbURL := os.Getenv("DB_CONNECTION")
        // ... query database
        c.JSON(200, gin.H{"data": "..."})
    })

    r.Run(":9000")
}
```

---

## 🔄 Communication Flow

### User Opens Preview URL

```
1. User opens: https://pr-42.web.acme-myapp.preview.previewcloud.cloud
   ↓
2. Browser → Traefik (DNS resolves to PreviewCloud server)
   ↓
3. Traefik → Frontend Container (port 3000)
   ↓
4. Frontend renders and makes API call to:
   https://pr-42.api.acme-myapp.preview.previewcloud.cloud/api/users
   ↓
5. Browser → Traefik
   ↓
6. Traefik → Backend Container (port 8080)
   ↓
7. Backend queries database
   ↓
8. Backend → Traefik → Browser
   ↓
9. Frontend receives data and displays
```

---

## 🌐 Internal vs External Communication

### External Communication (Through Traefik)

**Browser → Frontend:**

```
https://pr-42.web.acme-myapp.preview.previewcloud.cloud
```

**Browser → Backend (AJAX calls):**

```
https://pr-42.api.acme-myapp.preview.previewcloud.cloud
```

### Internal Communication (Docker Network)

**Backend → Database:**

```
postgres://postgres:5432/pr_42_acme_myapp
(No need for public URL, containers in same network)
```

**Backend → Redis:**

```
redis://redis:6379
(Service name as hostname)
```

**API → Worker:**

```
http://worker:3001
(Internal service-to-service)
```

---

## 🔐 Security & CORS

### CORS Configuration

PreviewCloud automatically configures CORS:

```javascript
// Backend receives:
process.env.CORS_ORIGIN =
  "https://pr-42.web.acme-myapp.preview.previewcloud.cloud";

// Use in Express:
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
```

### SSL/TLS

- ✅ Traefik automatically provisions Let's Encrypt certificates
- ✅ All URLs use HTTPS
- ✅ Certificates auto-renewed

---

## 📊 Environment Variables Auto-Injected

PreviewCloud automatically injects these variables:

```bash
# For ALL services:
PR_NUMBER=42
REPO_NAME=myapp
REPO_OWNER=acme
BRANCH_NAME=feature/auth
COMMIT_SHA=abc123...
PREVIEW_ID=pr-42-acme-myapp

# Service-specific:
SERVICE_NAME=web  # or api, worker, etc.
SERVICE_URL=https://pr-42.web.acme-myapp.preview.previewcloud.cloud

# For services that need to call other services:
API_URL=https://pr-42.api.acme-myapp.preview.previewcloud.cloud
WEB_URL=https://pr-42.web.acme-myapp.preview.previewcloud.cloud

# Database:
DATABASE_URL=postgres://...
```

---

## 🧪 Testing Multi-Service Communication

### Test Script Example

```bash
#!/bin/bash
# test-preview.sh

PREVIEW_URL="https://pr-42.web.acme-myapp.preview.previewcloud.cloud"
API_URL="https://pr-42.api.acme-myapp.preview.previewcloud.cloud"

# Test frontend
echo "Testing frontend..."
curl -I $PREVIEW_URL
# Should return 200

# Test API directly
echo "Testing API..."
curl $API_URL/health
# Should return {"status": "ok"}

# Test frontend → API communication
echo "Testing FE → BE communication..."
curl $API_URL/api/data -H "Origin: $PREVIEW_URL"
# Should return data (CORS should allow)

# Test with wrong origin
echo "Testing CORS protection..."
curl $API_URL/api/data -H "Origin: https://malicious.com"
# Should be blocked by CORS
```

---

## 🚀 Advanced: Custom Domain Per Service

Users can also configure custom domains:

```yaml
services:
  web:
    dockerfile: ./frontend/Dockerfile
    port: 3000
    custom_domain: app.mycompany.com # Custom domain

  api:
    dockerfile: ./backend/Dockerfile
    port: 8080
    custom_domain: api.mycompany.com # Custom domain
```

PreviewCloud will:

1. Generate Let's Encrypt cert for custom domains
2. Configure Traefik routing
3. Inject correct URLs into environment variables

---

## 📈 Performance Considerations

### 1. Service-to-Service Communication

**Good: Internal Docker network**

```typescript
// Backend → Worker (same Docker network)
fetch("http://worker:3001/jobs"); // Fast, no external routing
```

**Avoid: External routing for internal calls**

```typescript
// DON'T do this:
fetch("https://pr-42.worker.acme-myapp.preview.previewcloud.cloud/jobs");
// This goes through Traefik unnecessarily
```

### 2. Browser-to-API

**Use public URLs (must go through Traefik):**

```typescript
// Frontend → Backend (from browser)
fetch("https://pr-42.api.acme-myapp.preview.previewcloud.cloud/api/data");
// This is correct - browser needs public URL
```

---

## 🎯 Summary

### How It Works:

1. **User commits to PR** → GitHub Action triggers
2. **PreviewCloud receives `preview.yaml`** → Parses services
3. **Generates unique URLs** for each service
4. **Builds Docker images** for frontend and backend
5. **Creates Docker network** for internal communication
6. **Injects environment variables** with service URLs
7. **Configures Traefik** for routing and SSL
8. **Deploys containers** with proper networking
9. **Comments on PR** with all URLs

### User Experience:

```
PR opened → 2-3 minutes → URLs ready!

Frontend: https://pr-42.web.acme-myapp.preview.previewcloud.cloud
Backend:  https://pr-42.api.acme-myapp.preview.previewcloud.cloud

✅ Frontend can call backend (CORS configured)
✅ Backend can access database (URL injected)
✅ All services in same network
✅ SSL certificates auto-provisioned
✅ Updates automatically on new commits
```

---

**That's how PreviewCloud handles full-stack applications! 🚀**
