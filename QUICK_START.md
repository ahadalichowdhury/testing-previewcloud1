# ⚡ PreviewCloud - Quick Start (5 Minutes)

## 🎯 What You'll Get

After 5 minutes, you'll have:
- ✅ Automatic preview environments for every PR
- ✅ Unique URLs for each preview
- ✅ Isolated databases
- ✅ Auto cleanup when PR closes

---

## 👤 For Developers Using PreviewCloud

### Step 1: Get Token from Your Admin (30 seconds)

Ask your admin for:
- API URL: `https://api.preview.previewcloud.cloud`
- API Token: `eyJhbGciOiJIUzI1NiIs...`

### Step 2: Add GitHub Action (2 minutes)

Create `.github/workflows/preview.yml`:

```yaml
name: Preview Environment
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

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

Add the token as a GitHub Secret:
1. Go to: **Settings** → **Secrets** → **Actions**
2. Click **New repository secret**
3. Name: `PREVIEWCLOUD_TOKEN`
4. Value: `<paste token>`

### Step 3: Create preview.yaml (2 minutes)

```yaml
# preview.yaml
services:
  api:
    dockerfile: ./Dockerfile
    port: 3000

database:
  type: postgres
  migrations: ./migrations
```

### Step 4: Commit & Push (30 seconds)

```bash
git add .github/workflows/preview.yml preview.yaml
git commit -m "Add PreviewCloud"
git push
```

### Step 5: Open a PR 🎉

Open any PR and get automatic preview URLs within 2-3 minutes!

```
🚀 Preview Ready!
https://pr-42-myrepo.api.preview.previewcloud.cloud
```

---

## 🎬 Example Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-api

# 2. Make changes
vim src/api.js
git commit -am "Add new endpoint"

# 3. Push and open PR
git push origin feature/new-api

# 4. Wait 2-3 minutes...

# 5. Get preview URL in PR comment!
# https://pr-123-myrepo.api.preview.previewcloud.cloud
```

---

## 📚 Full Documentation

- **User Guide**: [USER_GUIDE.md](USER_GUIDE.md) - Complete workflow
- **Setup Guide**: [LOCAL_SETUP_GUIDE.md](LOCAL_SETUP_GUIDE.md) - Admin setup
- **Swagger API**: http://localhost:3001/api/docs

---

## 🆘 Common Issues

**Preview not deploying?**
- Check GitHub Actions logs
- Verify `preview.yaml` exists
- Check Dockerfile paths

**Can't access preview URL?**
- Wait 2-3 minutes for deployment
- Check preview logs: `/api/previews/{prNumber}/logs`

---

That's it! 🚀 You now have automatic preview environments!

