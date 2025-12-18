# PreviewCloud Workflow Examples

## ✅ Supported Events

The PreviewCloud action supports **both** `push` and `pull_request` events:

- **`pull_request`**: Creates previews for PRs (e.g., `pr-42`)
- **`push`**: Creates previews for branch pushes (e.g., `branch-main`, `branch-staging`)

## 🔑 GITHUB_TOKEN - When Do You Need It?

**GITHUB_TOKEN is OPTIONAL** and only needed if you want:
- ✅ PR comments with preview URLs (automatic comments on pull requests)

**You DON'T need GITHUB_TOKEN for:**
- ✅ Push events (branch previews)
- ✅ Deployments (push or PR)
- ✅ Destroying previews

**Note:** GitHub Actions automatically provides `GITHUB_TOKEN` in workflows, so you usually don't need to add it manually unless you want to use a custom token with more permissions.

---

## 📝 Example 1: Both Push and Pull Request (Recommended)

This workflow deploys previews for:
- **Push to `main` or `staging`** → Creates branch preview
- **Pull requests to any branch** → Creates PR preview

```yaml
name: Preview Environment

on:
  push:
    branches: [main, staging]  # Deploy on push to these branches
  pull_request:
    branches: ["*"]  # Deploy on PR to any branch

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to PreviewCloud
        uses: ahadalichowdhury/previewcloud-action@v1.0.7
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
          api-url: https://api.previewcloud.cloud
          # GITHUB_TOKEN is automatically available - no need to add it!
          # The action will use it for PR comments if available
```

**What happens:**
- Push to `main` → Creates `branch-main` preview
- Push to `staging` → Creates `branch-staging` preview  
- Open PR → Creates `pr-42` preview + comments on PR
- Push to PR branch → Updates `pr-42` preview
- Close PR → Destroys `pr-42` preview

---

## 📝 Example 2: Only Pull Requests

```yaml
name: Preview Environment

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to PreviewCloud
        uses: ahadalichowdhury/previewcloud-action@v1.0.7
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
```

**What happens:**
- Open PR → Creates preview + comments on PR
- Push to PR → Updates preview
- Close PR → Destroys preview

---

## 📝 Example 3: Only Push Events (No PR Comments)

```yaml
name: Preview Environment

on:
  push:
    branches: [main, staging, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to PreviewCloud
        uses: ahadalichowdhury/previewcloud-action@v1.0.7
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
          comment-on-pr: false  # Disable PR comments (not needed for push)
```

**What happens:**
- Push to `main` → Creates `branch-main` preview
- Push to `staging` → Creates `branch-staging` preview
- Push to `develop` → Creates `branch-develop` preview

---

## 📝 Example 4: Custom GITHUB_TOKEN (Advanced)

If you need a custom token with more permissions:

```yaml
name: Preview Environment

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to PreviewCloud
        uses: ahadalichowdhury/previewcloud-action@v1.0.7
        env:
          GITHUB_TOKEN: ${{ secrets.MY_CUSTOM_GITHUB_TOKEN }}  # Custom token
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
```

**Note:** Usually you don't need this. The default `GITHUB_TOKEN` works fine for PR comments.

---

## 🎯 Summary

| Event Type | Supported? | Needs GITHUB_TOKEN? | Use Case |
|------------|-----------|---------------------|----------|
| `pull_request` | ✅ Yes | Optional (for comments) | PR previews |
| `push` | ✅ Yes | ❌ No | Branch previews (main, staging, etc.) |
| Both | ✅ Yes | Optional (for PR comments) | Full coverage |

---

## 🔧 Where to Add GITHUB_TOKEN?

### Option 1: Automatic (Recommended)
**Do nothing!** GitHub Actions automatically provides `GITHUB_TOKEN` in workflows. The action will use it if available.

### Option 2: Explicit (If needed)
If you want to be explicit or use a custom token:

```yaml
- name: Deploy to PreviewCloud
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # Or your custom token
  uses: ahadalichowdhury/previewcloud-action@v1.0.7
  with:
    api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
```

### Option 3: Disable PR Comments
If you don't want PR comments (e.g., for push-only workflows):

```yaml
- name: Deploy to PreviewCloud
  uses: ahadalichowdhury/previewcloud-action@v1.0.7
  with:
    api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
    comment-on-pr: false  # Disable comments
```

---

## ✅ Quick Answer

**Q: Does it support push and pull_request for main and other branches?**
**A:** ✅ **YES!** It supports:
- Push to any branch (main, staging, develop, etc.) → Creates branch preview
- Pull request to any branch → Creates PR preview

**Q: Where do I add GITHUB_TOKEN?**
**A:** You **don't need to add it manually**! GitHub Actions automatically provides it. The action will:
- Use it automatically for PR comments (if available)
- Work fine without it for push events
- Show a warning if PR comments are requested but token is missing

