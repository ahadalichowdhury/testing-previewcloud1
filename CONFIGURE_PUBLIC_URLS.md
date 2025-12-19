# 🌐 Configure Public Preview URLs

Your previews are working, but they're showing internal URLs (`preview.local`). To get public URLs, configure your backend domain.

## Current Issue

The URLs shown are:

- `http://branch-main-***.api.preview.local` ❌ (internal only)
- `http://branch-main-***.frontend.preview.local` ❌ (internal only)

These won't work from outside your server.

## Solution: Configure BASE_DOMAIN

### 1. Update Backend `.env` File

On your server, edit `/opt/previewcloud/backend/.env`:

```bash
# Change this:
BASE_DOMAIN=preview.local

# To your actual domain:
BASE_DOMAIN=preview.previewcloud.cloud
```

**Or if you want a different domain structure:**

```bash
BASE_DOMAIN=previewcloud.cloud  # Will create: branch-main-***.api.previewcloud.cloud
```

### 2. DNS Configuration

Make sure your DNS has a wildcard record pointing to your server:

```
Type: A
Name: *.preview.previewcloud.cloud
Value: YOUR_SERVER_IP
```

**Example DNS records:**

```
*.preview.previewcloud.cloud    A    YOUR_SERVER_IP
api.previewcloud.cloud          A    YOUR_SERVER_IP
```

### 3. Traefik SSL Configuration

If you want HTTPS (recommended), ensure Traefik is configured:

```bash
# In your Traefik config or docker-compose.yml
WILDCARD_SSL=true
ACME_EMAIL=your-email@example.com
```

### 4. Restart Backend

After updating `.env`:

```bash
cd /opt/previewcloud/infra
docker compose restart previewcloud
```

### 5. Test

After restarting, create a new preview. You should see actual URLs like:

**For branch `main` with repo owner `ahadalichowdhury`:**

```
🌐 Preview URLs:
   api: https://branch-main-ahadalichowdhury.api.preview.previewcloud.cloud ✅
   frontend: https://branch-main-ahadalichowdhury.frontend.preview.previewcloud.cloud ✅
```

**For PR #42 with repo owner `myuser`:**

```
🌐 Preview URLs:
   api: https://pr-42-myuser.api.preview.previewcloud.cloud ✅
   frontend: https://pr-42-myuser.frontend.preview.previewcloud.cloud ✅
```

**URL Format:**

- **Branch previews**: `branch-{branch-name}-{repo-owner}.{service-name}.{base-domain}`
- **PR previews**: `pr-{pr-number}-{repo-owner}.{service-name}.{base-domain}`

## URL Format

Based on your `BASE_DOMAIN`:

- **If `BASE_DOMAIN=preview.previewcloud.cloud`:**

  - `branch-main-owner.api.preview.previewcloud.cloud`
  - `branch-main-owner.frontend.preview.previewcloud.cloud`

- **If `BASE_DOMAIN=previewcloud.cloud`:**
  - `branch-main-owner.api.previewcloud.cloud`
  - `branch-main-owner.frontend.previewcloud.cloud`

## Verify Configuration

Check your current config:

```bash
# On your server
cd /opt/previewcloud/backend
grep BASE_DOMAIN .env
```

The domain should match your DNS wildcard record!
