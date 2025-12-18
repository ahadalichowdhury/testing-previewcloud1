# PreviewCloud - Complete User Guide

## 🎯 What is PreviewCloud?

PreviewCloud automatically creates **isolated preview environments** for your GitHub Pull Requests and branches. Every PR or branch push gets its own:
- ✅ Live preview URLs (HTTPS)
- ✅ Isolated databases
- ✅ Multiple services (frontend, backend, workers)
- ✅ Auto-cleanup when done

---

## 👥 For Developers (Using PreviewCloud)

### Step 1: Get Your API Token

Ask your admin for:
- **API URL**: `https://api.preview.previewcloud.cloud` (or your custom domain)
- **API Token**: `eyJhbGciOiJIUzI1NiIs...` (JWT token)

### Step 2: Add GitHub Action to Your Repository

Create `.github/workflows/preview.yml` in your repository:

```yaml
name: Preview Environment
on:
  push:
    branches: [ main, staging ]      # Deploy on push to these branches
  pull_request:
    branches: [ '*' ]                  # Deploy on PR to any branch

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to PreviewCloud
        uses: previewcloud/action@v1
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
          api-url: https://api.preview.previewcloud.cloud
```

### Step 3: Add Token as GitHub Secret

1. Go to your repository: **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `PREVIEWCLOUD_TOKEN`
4. Value: Paste your API token
5. Click **Add secret**

### Step 4: Create `preview.yaml` Configuration

Create `preview.yaml` in your repository root:

```yaml
# preview.yaml
services:
  # Frontend service
  web:
    dockerfile: ./frontend/Dockerfile
    port: 3000
    env:
      NEXT_PUBLIC_API_URL: ${API_URL}  # Auto-injected by PreviewCloud
      NODE_ENV: production

  # Backend API service
  api:
    dockerfile: ./backend/Dockerfile
    port: 8080
    env:
      DATABASE_URL: ${DATABASE_URL}    # Auto-injected by PreviewCloud
      CORS_ORIGIN: ${WEB_URL}          # Auto-injected frontend URL
      NODE_ENV: production

# Optional: Database
database:
  type: postgres                       # or mysql, mongodb
  migrations: ./backend/migrations

# Optional: Global environment variables
env:
  APP_NAME: MyApp Preview
  LOG_LEVEL: debug

# Optional: Password protection
password: my-secure-password
```

### Step 5: Commit and Push

```bash
git add .github/workflows/preview.yml preview.yaml
git commit -m "Add PreviewCloud configuration"
git push
```

### Step 6: Open a PR or Push to Branch

**For Pull Requests:**
1. Create a new branch: `git checkout -b feature/new-feature`
2. Make changes and commit
3. Push: `git push origin feature/new-feature`
4. Open a Pull Request on GitHub
5. **Wait 2-3 minutes** → Preview URLs appear in PR comment!

**For Branch Pushes:**
1. Push to configured branch (e.g., `main`): `git push origin main`
2. **Wait 2-3 minutes** → Preview is ready!

### Step 7: Access Your Preview

**Pull Request Preview:**
- URLs appear as a comment on your PR
- Example: `https://pr-42.api.acme-myapp.preview.previewcloud.cloud`

**Branch Preview:**
- Check PreviewCloud dashboard or API
- Example: `https://branch-main.api.acme-myapp.preview.previewcloud.cloud`

---

## 📋 Complete Example Workflow

### Example 1: Full-Stack App (Next.js + Node.js API)

**Repository Structure:**
```
my-app/
├── frontend/
│   ├── Dockerfile
│   └── package.json
├── backend/
│   ├── Dockerfile
│   └── package.json
├── preview.yaml
└── .github/workflows/preview.yml
```

**preview.yaml:**
```yaml
services:
  web:
    dockerfile: ./frontend/Dockerfile
    port: 3000
    env:
      NEXT_PUBLIC_API_URL: ${API_URL}

  api:
    dockerfile: ./backend/Dockerfile
    port: 8080
    env:
      DATABASE_URL: ${DATABASE_URL}
      CORS_ORIGIN: ${WEB_URL}

database:
  type: postgres
  migrations: ./backend/migrations
```

**Result:**
- Frontend: `https://pr-42.web.acme-myapp.preview.previewcloud.cloud`
- Backend: `https://pr-42.api.acme-myapp.preview.previewcloud.cloud`
- Database: Automatically provisioned and migrated

### Example 2: Simple API Service

**preview.yaml:**
```yaml
services:
  api:
    dockerfile: ./Dockerfile
    port: 8080
    env:
      NODE_ENV: preview
      PORT: 8080

database:
  type: postgres
```

**Result:**
- API: `https://pr-42.api.acme-myapp.preview.previewcloud.cloud`

### Example 3: Multiple Services (API + Worker)

**preview.yaml:**
```yaml
services:
  api:
    dockerfile: ./api/Dockerfile
    port: 8080

  worker:
    dockerfile: ./worker/Dockerfile
    # No port needed for background workers
    env:
      QUEUE_URL: redis://redis:6379
```

---

## 🔧 Configuration Options

### Service Configuration

```yaml
services:
  myservice:
    dockerfile: ./path/to/Dockerfile    # Required
    port: 8080                          # Optional (default: 8080)
    context: ./path/to/context          # Optional (build context)
    buildArgs:                          # Optional (Docker build args)
      NODE_VERSION: "20"
    env:                                # Optional (environment variables)
      MY_VAR: value
      API_URL: ${API_URL}               # Use auto-injected variables
```

### Database Configuration

```yaml
database:
  type: postgres | mysql | mongodb     # Required
  migrations: ./path/to/migrations     # Optional
```

### Environment Variables

**Auto-injected by PreviewCloud:**
- `${API_URL}` - Backend service URL
- `${WEB_URL}` - Frontend service URL
- `${DATABASE_URL}` - Database connection string
- `${PR_NUMBER}` - Pull request number (for PR previews)
- `${BRANCH_NAME}` - Branch name
- `${COMMIT_SHA}` - Git commit SHA
- `${SERVICE_NAME}` - Current service name
- `${SERVICE_URL}` - Current service URL

**Custom variables:**
```yaml
env:
  MY_CUSTOM_VAR: value
  ANOTHER_VAR: ${API_URL}/custom-path
```

---

## 🌐 URL Patterns

### Pull Request Previews
```
https://pr-{number}-{owner}.{service}.{domain}
```

**Example:**
- PR #42 from `acme/myapp`
- Service: `api`
- Domain: `preview.previewcloud.cloud`
- URL: `https://pr-42.api.acme-myapp.preview.previewcloud.cloud`

### Branch Previews
```
https://branch-{branch-name}-{owner}.{service}.{domain}
```

**Example:**
- Branch: `main` from `acme/myapp`
- Service: `api`
- URL: `https://branch-main.api.acme-myapp.preview.previewcloud.cloud`

---

## 📊 Viewing Logs

### Via API
```bash
curl https://api.preview.previewcloud.cloud/api/previews/42/logs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Via WebSocket (Real-time)
```javascript
const ws = new WebSocket(
  'wss://api.preview.previewcloud.cloud/api/previews/42/logs/stream'
);

ws.onmessage = (event) => {
  const log = JSON.parse(event.data);
  console.log(log.message);
};
```

---

## 🗑️ Cleanup

### Automatic Cleanup
- **PR Previews**: Auto-destroyed when PR is closed/merged
- **Branch Previews**: Auto-destroyed after 48 hours of inactivity
- **All Previews**: Cleaned up by scheduler every 30 minutes

### Manual Cleanup
```bash
# Destroy a preview
curl -X DELETE \
  https://api.preview.previewcloud.cloud/api/previews/42 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 Common Use Cases

### Use Case 1: PR Review Environments
```yaml
on:
  pull_request:
    branches: [ '*' ]
```
**Result:** Every PR gets its own preview automatically.

### Use Case 2: Staging Environment
```yaml
on:
  push:
    branches: [ main ]
```
**Result:** `main` branch always has a live preview.

### Use Case 3: Feature Branch Testing
```yaml
on:
  push:
    branches: [ feature/*, develop ]
```
**Result:** Specific branches get previews for testing.

### Use Case 4: Combined (PR + Staging)
```yaml
on:
  push:
    branches: [ main, staging ]
  pull_request:
    branches: [ '*' ]
```
**Result:** PRs get previews AND staging branches stay updated.

---

## 🚨 Troubleshooting

### Preview Not Deploying?

1. **Check GitHub Actions logs**
   - Go to your repository → **Actions** tab
   - Click on the failed workflow
   - Check error messages

2. **Verify `preview.yaml` exists**
   ```bash
   ls preview.yaml
   ```

3. **Check Dockerfile paths**
   - Ensure paths in `preview.yaml` are correct
   - Dockerfiles must exist at specified paths

4. **Verify API token**
   - Check GitHub Secret: `PREVIEWCLOUD_TOKEN`
   - Ensure token is valid and not expired

### Can't Access Preview URL?

1. **Wait 2-3 minutes** for deployment to complete
2. **Check preview status:**
   ```bash
   curl https://api.preview.previewcloud.cloud/api/previews/42
   ```
3. **Check logs** for errors:
   ```bash
   curl https://api.preview.previewcloud.cloud/api/previews/42/logs
   ```

### Database Connection Issues?

1. **Verify database type** in `preview.yaml`
2. **Check migrations path** exists
3. **Review database logs** in preview logs

---

## 📚 API Reference

### Create/Update Preview
```bash
POST /api/previews
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "previewType": "pull_request",  # or "branch"
  "prNumber": 42,                 # Required for pull_request
  "repoName": "myapp",
  "repoOwner": "acme",
  "branch": "feature/auth",
  "commitSha": "abc123...",
  "services": { ... },
  "database": { ... }
}
```

### Get Preview Details
```bash
GET /api/previews/{identifier}
# For PR: GET /api/previews/42
# For Branch: GET /api/previews/branch-main
```

### List All Previews
```bash
GET /api/previews?status=running&repoOwner=acme
```

### Destroy Preview
```bash
DELETE /api/previews/{identifier}
Authorization: Bearer YOUR_TOKEN
```

### Get Logs
```bash
GET /api/previews/{identifier}/logs
GET /api/previews/{identifier}/logs/paginated?page=1&limit=50
```

---

## 🎓 Best Practices

### 1. Use Environment Variables
```yaml
env:
  NEXT_PUBLIC_API_URL: ${API_URL}  # ✅ Good
  # Don't hardcode URLs
```

### 2. Keep Dockerfiles Simple
- Use multi-stage builds
- Cache dependencies
- Keep images small

### 3. Database Migrations
- Always test migrations locally first
- Use idempotent migrations
- Keep migration files small

### 4. Service Communication
- Use `${API_URL}` for frontend → backend calls
- Use service names for internal calls (e.g., `http://worker:3001`)

### 5. Resource Management
- Don't create too many previews (default limit: 20)
- Clean up old previews manually if needed
- Use branch filtering to avoid unnecessary previews

---

## 📞 Support

- **Documentation**: See `docs/` folder
- **API Docs**: `https://api.preview.previewcloud.cloud/api/docs` (Swagger UI)
- **Issues**: Contact your admin or check logs

---

## 🎉 That's It!

You're now ready to use PreviewCloud! Just:
1. ✅ Add GitHub Action
2. ✅ Create `preview.yaml`
3. ✅ Push code or open PR
4. ✅ Get preview URLs automatically!

**Happy Previewing! 🚀**

