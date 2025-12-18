# 🚀 PreviewCloud - Quick Start (5 Minutes)

## For Developers

### 1️⃣ Get Your Token (30 seconds)

Ask your admin for:

- API URL: `https://api.preview.previewcloud.cloud`
- API Token: `eyJhbGciOiJIUzI1NiIs...`

### 2️⃣ Add GitHub Secret (1 minute)

1. Go to: **Repository** → **Settings** → **Secrets** → **Actions**
2. Click **New repository secret**
3. Name: `PREVIEWCLOUD_TOKEN`
4. Value: Paste your token
5. Click **Add secret**

### 3️⃣ Create GitHub Action (1 minute)

Create `.github/workflows/preview.yml`:

```yaml
name: Preview Environment
on:
  push:
    branches: [main]
  pull_request:
    branches: ["*"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: previewcloud/action@v1
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
          api-url: https://api.preview.previewcloud.cloud
```

### 4️⃣ Create preview.yaml (2 minutes)

Create `preview.yaml` in repository root:

```yaml
services:
  api:
    dockerfile: ./Dockerfile
    port: 8080

database:
  type: postgres
  migrations: ./migrations
```

### 5️⃣ Push & Done! (30 seconds)

```bash
git add .github/workflows/preview.yml preview.yaml
git commit -m "Add PreviewCloud"
git push
```

**That's it!** Open a PR or push to `main` → Preview ready in 2-3 minutes! 🎉

---

## Example: Full-Stack App

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

database:
  type: postgres
```

**Result:**

- Frontend: `https://pr-42.web.your-repo.preview.previewcloud.cloud`
- Backend: `https://pr-42.api.your-repo.preview.previewcloud.cloud`

---

## What Happens Automatically?

✅ **PR Opened** → Preview created  
✅ **PR Updated** → Preview updated  
✅ **PR Closed** → Preview destroyed  
✅ **Push to Branch** → Preview created/updated

**No manual steps needed!** 🎯

---

## Need Help?

- Full Guide: See `USER_GUIDE.md`
- API Docs: `https://api.preview.previewcloud.cloud/api/docs`
- Contact your admin
