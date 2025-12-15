# 🔧 GitHub App Setup Guide

**How to create a GitHub App for PreviewCloud and get App ID + Private Key**

---

## 📋 What is a GitHub App?

A GitHub App is better than GitHub Actions for SaaS because:

- ✅ Users can install it with one click
- ✅ No need to add workflow files manually
- ✅ Automatic webhook integration
- ✅ More secure (user doesn't need to manage tokens)
- ✅ Better user experience

**Comparison:**

| Feature      | GitHub Action              | GitHub App        |
| ------------ | -------------------------- | ----------------- |
| User setup   | Manual (add workflow file) | One-click install |
| Webhooks     | Manual configuration       | Automatic         |
| Updates      | Users must update workflow | Automatic         |
| Security     | User manages tokens        | App handles auth  |
| **Best for** | Power users                | SaaS products ✅  |

---

## 🚀 Creating Your GitHub App

### Step 1: Go to GitHub Settings

1. **Login to GitHub** with your PreviewCloud organization account
2. **Navigate to:**
   - If personal: https://github.com/settings/apps
   - If organization: https://github.com/organizations/YOUR_ORG/settings/apps
3. **Click**: "New GitHub App"

---

### Step 2: Configure Basic Information

**GitHub App name:**

```
PreviewCloud
```

_(Must be unique globally)_

**Description:**

```
Automatically deploy preview environments for every pull request. Test your code in production-like environments before merging.
```

**Homepage URL:**

```
https://previewcloud.cloud
```

**Callback URL:**

```
https://api.previewcloud.cloud/api/github/callback
```

_(Used for OAuth if you add "Login with GitHub")_

**Setup URL (optional but recommended):**

```
https://dashboard.previewcloud.cloud/integrations/github/setup
```

_(Where users go after installing the app)_

**Webhook URL:**

```
https://api.previewcloud.cloud/api/webhooks/github
```

_(PreviewCloud receives PR events here)_

**Webhook secret:**

```
Generate a strong secret:
```

```bash
# On your terminal:
openssl rand -hex 32

# Copy the output, e.g.:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

Save this secret - you'll need it for your `.env` file.

---

### Step 3: Configure Permissions

**Repository permissions:**

Select these permissions:

```
✅ Contents: Read & write
   (To read code and files)

✅ Pull requests: Read & write
   (To receive PR events and post comments)

✅ Issues: Read & write
   (To post comments on PRs)

✅ Metadata: Read-only
   (Repository metadata - automatically selected)

✅ Checks: Read & write
   (To create deployment checks)

✅ Deployments: Read & write
   (To track deployments)
```

**Organization permissions:**

```
❌ None needed for basic functionality
```

**User permissions:**

```
❌ None needed
```

---

### Step 4: Subscribe to Events

**Select these webhook events:**

```
✅ Pull request
   - opened
   - synchronize (new commits)
   - reopened
   - closed

✅ Pull request review
   (Optional: to track reviews)

✅ Push
   (Optional: to detect branch changes)

✅ Check run
   (Optional: to integrate with checks)
```

**Important:** These events tell PreviewCloud when to deploy/update/destroy previews.

---

### Step 5: Configure Where App Can Be Installed

**Where can this GitHub App be installed?**

Choose one:

**Option A: Any account (Public SaaS)**

```
⚪ Any account
```

✅ Choose this for public SaaS

- Anyone can install PreviewCloud
- Best for growth

**Option B: Only this account (Private/Testing)**

```
⚪ Only on this account
```

- Choose for testing
- Switch to "Any account" when ready to launch

---

### Step 6: Create the App

1. **Review all settings**
2. **Click**: "Create GitHub App"
3. **You'll see**: Success message with App ID

---

## 🔑 Getting App ID and Private Key

### Step 1: Note Your App ID

After creating the app, you'll see:

```
App ID: 123456
```

**Copy this!** This is your `GITHUB_APP_ID`.

---

### Step 2: Generate Private Key

On your GitHub App settings page:

1. **Scroll down to**: "Private keys"
2. **Click**: "Generate a private key"
3. **A `.pem` file will download**: `your-app-name.2024-12-13.private-key.pem`

**This file contains your private key!**

---

### Step 3: Save Private Key to Server

**On your local machine:**

```bash
# Rename the file for clarity
mv ~/Downloads/previewcloud*.pem previewcloud-github-app.pem

# Upload to EC2
scp -i ~/.ssh/previewcloud-production.pem \
    previewcloud-github-app.pem \
    ubuntu@YOUR_EC2_IP:/opt/previewcloud/
```

**On EC2 server:**

```bash
# SSH to server
ssh -i ~/.ssh/previewcloud-production.pem ubuntu@YOUR_EC2_IP

# Set proper permissions (important!)
chmod 600 /opt/previewcloud/previewcloud-github-app.pem

# Verify
ls -la /opt/previewcloud/*.pem
# Should show: -rw------- ubuntu ubuntu
```

---

## ⚙️ Configure Environment Variables

**Update `backend/.env`:**

```bash
# GitHub App Configuration
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY_PATH=/opt/previewcloud/previewcloud-github-app.pem
GITHUB_WEBHOOK_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# GitHub App Installation URL (for users)
GITHUB_APP_SLUG=previewcloud
GITHUB_APP_INSTALL_URL=https://github.com/apps/previewcloud/installations/new
```

**Where to find these:**

| Variable                      | Where to Find                  |
| ----------------------------- | ------------------------------ |
| `GITHUB_APP_ID`               | GitHub App settings page (top) |
| `GITHUB_APP_PRIVATE_KEY_PATH` | Path to `.pem` file on server  |
| `GITHUB_WEBHOOK_SECRET`       | Secret you generated in Step 2 |
| `GITHUB_APP_SLUG`             | Your app name in lowercase     |

---

## 🔧 Update Backend Code to Use GitHub App

### Step 1: Install Dependencies

```bash
cd /opt/previewcloud/backend
npm install @octokit/app @octokit/rest
```

### Step 2: Create GitHub App Service

**File: `backend/src/services/github-app.service.ts`**

```typescript
import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";
import fs from "fs";
import { config } from "../config/env";
import { logger } from "../utils/logger";

class GitHubAppService {
  private app: App;

  constructor() {
    // Read private key
    const privateKey = fs.readFileSync(
      process.env.GITHUB_APP_PRIVATE_KEY_PATH!,
      "utf8"
    );

    // Initialize GitHub App
    this.app = new App({
      appId: process.env.GITHUB_APP_ID!,
      privateKey: privateKey,
      webhooks: {
        secret: process.env.GITHUB_WEBHOOK_SECRET!,
      },
    });

    logger.info(`GitHub App initialized (ID: ${process.env.GITHUB_APP_ID})`);
  }

  /**
   * Get Octokit instance for installation
   */
  async getInstallationOctokit(installationId: number): Promise<Octokit> {
    return this.app.getInstallationOctokit(installationId);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhook(signature: string, payload: string): boolean {
    return this.app.webhooks.verify(payload, signature);
  }

  /**
   * Get app installation for repository
   */
  async getInstallation(owner: string, repo: string) {
    const octokit = await this.app.getInstallationOctokit({
      owner,
      repo,
    });
    return octokit;
  }

  /**
   * Post comment on PR
   */
  async commentOnPR(
    installationId: number,
    owner: string,
    repo: string,
    prNumber: number,
    body: string
  ) {
    const octokit = await this.getInstallationOctokit(installationId);

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });

    logger.info(`Posted comment on ${owner}/${repo}#${prNumber}`);
  }

  /**
   * Get installation URL for users
   */
  getInstallationUrl(): string {
    return `https://github.com/apps/${process.env.GITHUB_APP_SLUG}/installations/new`;
  }
}

export const githubAppService = new GitHubAppService();
```

---

## 📝 Handle GitHub Webhooks

**Update `backend/src/routes/webhook.routes.ts`:**

```typescript
import { Router } from "express";
import { githubAppService } from "../services/github-app.service";
import { logger } from "../utils/logger";

const router = Router();

// GitHub App webhook endpoint
router.post("/github", async (req, res) => {
  try {
    const signature = req.headers["x-hub-signature-256"] as string;
    const event = req.headers["x-github-event"] as string;

    // Verify webhook signature
    const isValid = githubAppService.verifyWebhook(
      signature,
      JSON.stringify(req.body)
    );

    if (!isValid) {
      logger.warn("Invalid GitHub webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Handle pull request events
    if (event === "pull_request") {
      const action = req.body.action;
      const pr = req.body.pull_request;
      const repo = req.body.repository;
      const installation = req.body.installation;

      logger.info(`PR ${action}: ${repo.full_name}#${pr.number}`);

      // Deploy preview
      if (["opened", "synchronize", "reopened"].includes(action)) {
        // TODO: Trigger preview deployment
        // await previewService.deploy({
        //   installationId: installation.id,
        //   owner: repo.owner.login,
        //   repo: repo.name,
        //   prNumber: pr.number,
        //   branch: pr.head.ref,
        //   sha: pr.head.sha,
        // });
      }

      // Destroy preview
      if (action === "closed") {
        // TODO: Destroy preview
        // await previewService.destroy({
        //   owner: repo.owner.login,
        //   repo: repo.name,
        //   prNumber: pr.number,
        // });
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error("Webhook error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## 🎯 Testing Your GitHub App

### Step 1: Install App on Test Repository

1. Go to: `https://github.com/apps/YOUR_APP_NAME`
2. Click: "Install"
3. Select: Test repository
4. Click: "Install"

### Step 2: Test Webhook

```bash
# On your server, watch logs
pm2 logs previewcloud-api

# On GitHub, open a test PR
# You should see webhook events in logs
```

### Step 3: Verify Webhook Delivery

1. **GitHub App Settings** → **Advanced** → **Recent Deliveries**
2. Check if webhooks are being delivered
3. Response should be `200 OK`

---

## 🔄 Update After Changes

If you change webhook URL or permissions:

```bash
# Restart backend
pm2 restart previewcloud-api

# Users might need to accept new permissions
# GitHub will show them a prompt
```

---

## 🎨 Customize App Appearance

### Logo

1. **Prepare logo**: 200x200 PNG with transparent background
2. **Upload**: GitHub App Settings → Display Information → Upload logo

### Colors

- **Primary color**: Choose brand color (e.g., `#667eea`)
- **Background color**: Usually white (`#ffffff`)

---

## 📚 Complete `.env` Example

```bash
# GitHub App Configuration
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY_PATH=/opt/previewcloud/previewcloud-github-app.pem
GITHUB_WEBHOOK_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
GITHUB_APP_SLUG=previewcloud
GITHUB_APP_INSTALL_URL=https://github.com/apps/previewcloud/installations/new
```

---

## 🎯 User Experience with GitHub App

### For End Users:

**1. Visit PreviewCloud Dashboard**

```
https://dashboard.previewcloud.cloud
```

**2. Click "Connect GitHub"**

- Redirects to GitHub App installation
- One-click install

**3. Select Repositories**

- Choose which repos to enable
- All repos or specific ones

**4. That's it!**

- Open PR → Preview auto-created
- No workflow files needed!
- No tokens to manage!

**Much better than GitHub Action!** 🎉

---

## 🔒 Security Best Practices

### Private Key Security

```bash
# ✅ DO:
chmod 600 /opt/previewcloud/*.pem  # Restrict access
backup private key securely
rotate keys periodically

# ❌ DON'T:
commit .pem file to git
share private key
store in public location
```

### Webhook Secret

```bash
# Generate strong secret
openssl rand -hex 32

# Verify ALL webhooks
# (code does this automatically)
```

---

## 🐛 Troubleshooting

### Issue: "Private key not found"

**Check:**

```bash
ls -la /opt/previewcloud/*.pem
# File should exist with 600 permissions
```

**Fix:**

```bash
# Re-upload private key
scp -i ~/.ssh/key.pem github-app-key.pem ubuntu@IP:/opt/previewcloud/
chmod 600 /opt/previewcloud/*.pem
```

### Issue: "Webhook signature invalid"

**Check:**

1. Webhook secret matches in GitHub App settings and `.env`
2. Secret is exactly the same (no extra spaces)

### Issue: "Webhooks not received"

**Check:**

1. Webhook URL is correct: `https://api.previewcloud.cloud/api/webhooks/github`
2. Server is running: `pm2 status`
3. Port 443 is open in security group
4. Check GitHub App → Recent Deliveries for errors

---

## ✅ Checklist

- [ ] Created GitHub App
- [ ] Noted App ID
- [ ] Generated private key
- [ ] Uploaded private key to server
- [ ] Set correct permissions (600)
- [ ] Updated `.env` with App ID and key path
- [ ] Configured webhook URL
- [ ] Generated webhook secret
- [ ] Set correct permissions (Contents, PRs, Issues)
- [ ] Subscribed to pull_request events
- [ ] Tested on a repository
- [ ] Verified webhooks work

---

## 📖 References

- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [Octokit SDK](https://github.com/octokit/octokit.js)
- [Webhook Events](https://docs.github.com/en/webhooks-and-events/webhooks/webhook-events-and-payloads)

---

**Your GitHub App is ready! 🎉**

Now users can install PreviewCloud with just one click!
