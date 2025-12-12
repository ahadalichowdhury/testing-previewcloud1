# 🔐 Environment Variables Configuration - Complete Guide

**How users provide 20+ environment variables to their backend/frontend**

---

## 🎯 The Problem

User's backend needs many environment variables:

```
DATABASE_URL
REDIS_URL
JWT_SECRET
STRIPE_SECRET_KEY
STRIPE_PUBLIC_KEY
AWS_ACCESS_KEY
AWS_SECRET_KEY
SENDGRID_API_KEY
SENTRY_DSN
API_KEY_SERVICE_A
API_KEY_SERVICE_B
... (20+ variables)
```

**Question:** How do they configure all of these in PreviewCloud?

---

## ✅ Solution: 5 Methods to Provide Environment Variables

### Method 1: Direct in `preview.yaml` (Non-Sensitive)

### Method 2: PreviewCloud Dashboard (Secrets)

### Method 3: GitHub Repository Secrets

### Method 4: Environment Variable Files (`.env`)

### Method 5: Mixed Approach (Recommended)

---

## 📝 Method 1: Direct in `preview.yaml`

**Best for:** Non-sensitive, static values

```yaml
# preview.yaml

services:
  api:
    dockerfile: ./backend/Dockerfile
    port: 8080
    env:
      # PreviewCloud magic variables
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
      FRONTEND_URL: ${WEB_URL}

      # Static values (non-sensitive)
      NODE_ENV: production
      LOG_LEVEL: info
      PORT: 8080
      API_VERSION: v1
      RATE_LIMIT_MAX: 100
      RATE_LIMIT_WINDOW: 900000

      # Feature flags
      ENABLE_ANALYTICS: true
      ENABLE_CACHING: true
      ENABLE_WEBHOOKS: true

      # External services (non-sensitive endpoints)
      ANALYTICS_ENDPOINT: https://analytics.example.com
      WEBHOOK_ENDPOINT: https://webhooks.example.com
```

**Pros:**

- ✅ Easy to see all configuration
- ✅ Version controlled
- ✅ Same for all preview environments

**Cons:**

- ❌ Secrets visible in repository
- ❌ Hard to change without code commit

---

## 🔐 Method 2: PreviewCloud Dashboard (Secrets)

**Best for:** Sensitive values, API keys, passwords

### How It Works:

1. **User goes to PreviewCloud Dashboard**
2. **Navigates to Settings → Secrets**
3. **Adds secrets:**

```
Dashboard UI:

┌────────────────────────────────────────────────┐
│  Secrets & Environment Variables               │
├────────────────────────────────────────────────┤
│                                                │
│  Repository: acme/my-app                       │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Name:  JWT_SECRET                        │ │
│  │ Value: ••••••••••••••••••••••••••       │ │
│  │ [Add]                                    │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Existing Secrets:                             │
│  ┌──────────────────────────────────────────┐ │
│  │ JWT_SECRET              [Edit] [Delete]  │ │
│  │ STRIPE_SECRET_KEY       [Edit] [Delete]  │ │
│  │ AWS_ACCESS_KEY          [Edit] [Delete]  │ │
│  │ AWS_SECRET_KEY          [Edit] [Delete]  │ │
│  │ SENDGRID_API_KEY        [Edit] [Delete]  │ │
│  │ DATABASE_PASSWORD       [Edit] [Delete]  │ │
│  └──────────────────────────────────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

### In `preview.yaml`:

```yaml
services:
  api:
    dockerfile: ./backend/Dockerfile
    port: 8080
    env:
      # Reference secrets from dashboard
      JWT_SECRET: ${JWT_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      AWS_ACCESS_KEY: ${AWS_ACCESS_KEY}
      AWS_SECRET_KEY: ${AWS_SECRET_KEY}
      SENDGRID_API_KEY: ${SENDGRID_API_KEY}

# Declare which secrets are needed
secrets:
  - JWT_SECRET
  - STRIPE_SECRET_KEY
  - AWS_ACCESS_KEY
  - AWS_SECRET_KEY
  - SENDGRID_API_KEY
```

**Pros:**

- ✅ Secrets encrypted at rest
- ✅ Not visible in repository
- ✅ Easy to update without code changes
- ✅ Can be organization-wide or repo-specific

**Cons:**

- ❌ Requires manual setup in dashboard

---

## 🔑 Method 3: GitHub Repository Secrets

**Best for:** CI/CD integration, GitHub Action workflow

### Setup:

1. **User adds secrets to GitHub:**

```
GitHub → Repository → Settings → Secrets and variables → Actions

Secrets:
- JWT_SECRET
- STRIPE_SECRET_KEY
- AWS_ACCESS_KEY
- AWS_SECRET_KEY
- SENDGRID_API_KEY
```

2. **GitHub Action passes them to PreviewCloud:**

```yaml
# .github/workflows/preview.yml

name: PreviewCloud Deploy

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to PreviewCloud
        uses: previewcloud/action@v1
        with:
          api-token: ${{ secrets.PREVIEWCLOUD_TOKEN }}
          api-url: https://api.previewcloud.cloud
          config-file: preview.yaml
          # Pass GitHub secrets to PreviewCloud
          secrets: |
            JWT_SECRET=${{ secrets.JWT_SECRET }}
            STRIPE_SECRET_KEY=${{ secrets.STRIPE_SECRET_KEY }}
            AWS_ACCESS_KEY=${{ secrets.AWS_ACCESS_KEY }}
            AWS_SECRET_KEY=${{ secrets.AWS_SECRET_KEY }}
            SENDGRID_API_KEY=${{ secrets.SENDGRID_API_KEY }}
```

**Pros:**

- ✅ Integrates with GitHub workflow
- ✅ Secrets managed in GitHub
- ✅ Easy for GitHub users

**Cons:**

- ❌ Tied to GitHub
- ❌ Duplication if using PreviewCloud dashboard

---

## 📄 Method 4: Environment Variable Files

**Best for:** Local development consistency, many variables

### Option A: `.env` file in repository (for defaults)

```bash
# .env.example (checked into git)
NODE_ENV=production
LOG_LEVEL=info
API_VERSION=v1
RATE_LIMIT_MAX=100
# ... 20+ more variables
```

```yaml
# preview.yaml
services:
  api:
    dockerfile: ./backend/Dockerfile
    port: 8080
    env_file: .env.preview # Load from file
    env:
      # Override specific values
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
```

### Option B: Build-time environment file

```dockerfile
# backend/Dockerfile
FROM node:18

WORKDIR /app

# Copy environment defaults
COPY .env.production .env

COPY package*.json ./
RUN npm install

COPY . .

# Runtime env vars will override these
CMD ["npm", "start"]
```

**Pros:**

- ✅ Easy to manage many variables
- ✅ Consistent across environments
- ✅ Can commit defaults

**Cons:**

- ❌ Still need secrets management
- ❌ File duplication

---

## 🎯 Method 5: Mixed Approach (RECOMMENDED)

**Best practice:** Combine all methods strategically

### Example for Real Production App

```yaml
# preview.yaml

services:
  api:
    dockerfile: ./backend/Dockerfile
    port: 8080

    # 1. Load defaults from file
    env_file: .env.preview

    # 2. Override/add specific values
    env:
      # PreviewCloud magic variables
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
      FRONTEND_URL: ${WEB_URL}

      # Environment-specific
      NODE_ENV: preview
      LOG_LEVEL: debug

      # Secrets from dashboard
      JWT_SECRET: ${JWT_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_PUBLIC_KEY: ${STRIPE_PUBLIC_KEY}
      AWS_ACCESS_KEY: ${AWS_ACCESS_KEY}
      AWS_SECRET_KEY: ${AWS_SECRET_KEY}
      AWS_REGION: ${AWS_REGION}
      SENDGRID_API_KEY: ${SENDGRID_API_KEY}
      SENTRY_DSN: ${SENTRY_DSN}

      # API keys for external services
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      GOOGLE_MAPS_API_KEY: ${GOOGLE_MAPS_API_KEY}
      TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
      TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}

      # Feature flags (static)
      ENABLE_ANALYTICS: true
      ENABLE_CACHING: true
      ENABLE_WEBHOOKS: true
      ENABLE_EMAIL_NOTIFICATIONS: true

# List all secrets needed
secrets:
  - JWT_SECRET
  - STRIPE_SECRET_KEY
  - STRIPE_PUBLIC_KEY
  - AWS_ACCESS_KEY
  - AWS_SECRET_KEY
  - AWS_REGION
  - SENDGRID_API_KEY
  - SENTRY_DSN
  - OPENAI_API_KEY
  - GOOGLE_MAPS_API_KEY
  - TWILIO_ACCOUNT_SID
  - TWILIO_AUTH_TOKEN

database:
  type: postgres
  migrations: ./backend/migrations
```

### `.env.preview` file (in repository):

```bash
# .env.preview
# Non-sensitive defaults for preview environments

# App Config
API_VERSION=v1
APP_NAME=MyApp
APP_URL=https://myapp.com

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# Pagination
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,png,pdf,doc

# Session
SESSION_MAX_AGE=86400000
COOKIE_SECURE=true
COOKIE_HTTP_ONLY=true

# Cache
CACHE_TTL=3600
CACHE_ENABLED=true

# Logging
LOG_FORMAT=json
LOG_MAX_FILES=7
LOG_MAX_SIZE=10m

# External Services (non-sensitive endpoints)
ANALYTICS_ENDPOINT=https://analytics.example.com
WEBHOOK_ENDPOINT=https://webhooks.example.com
CDN_URL=https://cdn.example.com

# Feature Flags
ENABLE_BETA_FEATURES=false
ENABLE_ADMIN_PANEL=true
ENABLE_API_DOCS=true
MAINTENANCE_MODE=false
```

**Result:**

- ✅ 20+ variables managed easily
- ✅ Secrets secure in dashboard
- ✅ Defaults in version control
- ✅ Easy to override per environment

---

## 🏗️ How PreviewCloud Processes This

### Step 1: User Configuration

```yaml
# preview.yaml
services:
  api:
    env_file: .env.preview
    env:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      # ... more vars

secrets:
  - JWT_SECRET
  - STRIPE_SECRET_KEY
```

### Step 2: PreviewCloud Processing

```javascript
// PreviewCloud backend processes this:

// 1. Load env file
const envFileVars = loadEnvFile(".env.preview");
// Result: 15 variables from file

// 2. Load secrets from dashboard
const secretVars = await getSecrets(userId, repoId, [
  "JWT_SECRET",
  "STRIPE_SECRET_KEY",
  // ... more
]);
// Result: 10 secrets from dashboard

// 3. Generate magic variables
const magicVars = {
  DATABASE_URL: "postgres://pr-42...",
  WEB_URL: "https://pr-42.web...",
  API_URL: "https://pr-42.api...",
};

// 4. Merge all (priority: magic > secrets > env_file > yaml)
const finalEnv = {
  ...envFileVars, // From .env.preview
  ...yaml.env, // From preview.yaml
  ...secretVars, // From dashboard (overrides)
  ...magicVars, // PreviewCloud (highest priority)
};

// 5. Inject into container
docker.run({
  image: "api:pr-42",
  env: finalEnv, // All 25+ variables
});
```

### Step 3: Container Receives Everything

```bash
# Container receives all variables:
NODE_ENV=preview
LOG_LEVEL=debug
API_VERSION=v1
RATE_LIMIT_MAX=100
DATABASE_URL=postgres://pr-42...
JWT_SECRET=***secret-from-dashboard***
STRIPE_SECRET_KEY=***secret-from-dashboard***
# ... (25+ total variables)
```

---

## 📊 Comparison Table

| Method                  | Use Case              | Pros              | Cons               | Security  |
| ----------------------- | --------------------- | ----------------- | ------------------ | --------- |
| **Direct in YAML**      | Static, non-sensitive | Easy, visible     | Secrets exposed    | ⚠️ Low    |
| **Dashboard Secrets**   | API keys, passwords   | Encrypted, secure | Manual setup       | ✅ High   |
| **GitHub Secrets**      | CI/CD integration     | GitHub native     | GitHub-only        | ✅ High   |
| **Env Files**           | Many defaults         | Bulk management   | Still need secrets | ⚠️ Medium |
| **Mixed (Recommended)** | Production apps       | Best of all       | More complex       | ✅ High   |

---

## 🎨 Real-World Examples

### Example 1: E-commerce App (30+ Variables)

```yaml
# preview.yaml
services:
  api:
    dockerfile: ./api/Dockerfile
    port: 8080
    env_file: .env.preview # 15 non-sensitive defaults
    env:
      # PreviewCloud
      DATABASE_URL: ${DATABASE_URL}
      FRONTEND_URL: ${WEB_URL}

      # Secrets (10 from dashboard)
      JWT_SECRET: ${JWT_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      SENDGRID_API_KEY: ${SENDGRID_API_KEY}
      AWS_ACCESS_KEY: ${AWS_ACCESS_KEY}
      AWS_SECRET_KEY: ${AWS_SECRET_KEY}
      PAYPAL_CLIENT_ID: ${PAYPAL_CLIENT_ID}
      PAYPAL_SECRET: ${PAYPAL_SECRET}
      SHIPPO_API_KEY: ${SHIPPO_API_KEY}
      TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
      TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}

      # Environment-specific (5)
      NODE_ENV: preview
      LOG_LEVEL: debug
      ENABLE_DEBUG_MODE: true
      MOCK_PAYMENTS: true
      MOCK_SHIPPING: true

secrets:
  - JWT_SECRET
  - STRIPE_SECRET_KEY
  - SENDGRID_API_KEY
  - AWS_ACCESS_KEY
  - AWS_SECRET_KEY
  - PAYPAL_CLIENT_ID
  - PAYPAL_SECRET
  - SHIPPO_API_KEY
  - TWILIO_ACCOUNT_SID
  - TWILIO_AUTH_TOKEN
```

**Total: 30+ variables**

- 15 from `.env.preview`
- 10 from dashboard secrets
- 5 directly in YAML

---

### Example 2: Microservices (50+ Variables)

```yaml
# preview.yaml
services:
  auth-service:
    dockerfile: ./services/auth/Dockerfile
    env_file: .env.common # Shared across services
    env:
      SERVICE_NAME: auth
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      OAUTH_GOOGLE_CLIENT_ID: ${OAUTH_GOOGLE_CLIENT_ID}
      OAUTH_GOOGLE_SECRET: ${OAUTH_GOOGLE_SECRET}

  payment-service:
    dockerfile: ./services/payment/Dockerfile
    env_file: .env.common
    env:
      SERVICE_NAME: payment
      DATABASE_URL: ${DATABASE_URL}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      PAYPAL_CLIENT_ID: ${PAYPAL_CLIENT_ID}

  notification-service:
    dockerfile: ./services/notification/Dockerfile
    env_file: .env.common
    env:
      SERVICE_NAME: notification
      SENDGRID_API_KEY: ${SENDGRID_API_KEY}
      TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
      TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}

# All secrets centralized
secrets:
  - JWT_SECRET
  - OAUTH_GOOGLE_CLIENT_ID
  - OAUTH_GOOGLE_SECRET
  - STRIPE_SECRET_KEY
  - PAYPAL_CLIENT_ID
  - SENDGRID_API_KEY
  - TWILIO_ACCOUNT_SID
  - TWILIO_AUTH_TOKEN
```

---

## 🔒 Security Best Practices

### ✅ DO:

- Store secrets in PreviewCloud Dashboard or GitHub Secrets
- Use `.env.example` (without values) in git
- Use different secrets for preview vs production
- Rotate secrets regularly
- Use least-privilege principle

### ❌ DON'T:

- Commit `.env` with real secrets to git
- Hardcode secrets in `preview.yaml`
- Share secrets across teams/repos unnecessarily
- Use production secrets in preview environments

---

## 🎯 Summary

**For 20+ environment variables, users should:**

1. **Split by type:**

   - Non-sensitive → Direct in `preview.yaml` or `.env` file
   - Sensitive → PreviewCloud Dashboard or GitHub Secrets
   - Dynamic → PreviewCloud magic variables (`${DATABASE_URL}`)

2. **Recommended structure:**

```yaml
services:
  api:
    env_file: .env.preview # 10-15 defaults
    env:
      DATABASE_URL: ${DATABASE_URL} # 2-3 magic vars
      JWT_SECRET: ${JWT_SECRET} # 5-10 secrets
      NODE_ENV: preview # 2-3 overrides
```

3. **Total variables:** 20-30+ easily managed! ✅

**PreviewCloud merges everything automatically!** 🚀

---

## 📚 Next Steps

- Create `.env.example` with all variable names
- Add sensitive secrets to PreviewCloud Dashboard
- Configure `preview.yaml` with appropriate mappings
- Test with a preview environment
- Document for team

**Environment variables: Solved! 🎉**
