# 🔧 Environment Variables in PreviewCloud - Complete Guide

**How environment variables work between preview.yaml and your code**

---

## 🤔 The Confusion

**Question:** In `preview.yaml`, when frontend calls backend, the example uses `API_URL`. Do users **have to** use this specific name?

**Answer:** **NO!** Users can use **any variable name they want**. Let me explain how it works...

---

## 📊 Two Types of Environment Variables

### 1. **PreviewCloud Magic Variables** (Automatically Provided)

PreviewCloud automatically provides these special variables that you can **reference** in your `preview.yaml`:

```yaml
# These are MAGIC variables PreviewCloud provides:
${API_URL}      # URL of the "api" service
${WEB_URL}      # URL of the "web" service
${WORKER_URL}   # URL of the "worker" service
${DATABASE_URL} # Database connection string
${REDIS_URL}    # Redis connection (if configured)

# Pattern: ${SERVICE_NAME_URL} where SERVICE_NAME is what YOU defined
```

### 2. **User-Defined Variables** (You choose the names)

In your `preview.yaml`, you define **what environment variables your app expects**:

```yaml
services:
  web:
    dockerfile: ./frontend/Dockerfile
    port: 3000
    env:
      # YOU choose these names based on your framework!
      NEXT_PUBLIC_API_URL: ${API_URL}    # For Next.js
      # or
      REACT_APP_API_URL: ${API_URL}      # For React
      # or
      VUE_APP_API_URL: ${API_URL}        # For Vue
      # or
      MY_CUSTOM_BACKEND_URL: ${API_URL}  # Whatever you want!
```

---

## 🎯 How It Actually Works

### Step 1: User Defines Services

```yaml
# preview.yaml
services:
  # Service name: "web" 
  # (PreviewCloud will create ${WEB_URL} automatically)
  web:
    dockerfile: ./frontend/Dockerfile
    port: 3000
    env:
      # User decides what variable their Next.js app needs
      NEXT_PUBLIC_API_URL: ${API_URL}  # References PreviewCloud's magic ${API_URL}
  
  # Service name: "api"
  # (PreviewCloud will create ${API_URL} automatically)
  api:
    dockerfile: ./backend/Dockerfile
    port: 8080
    env:
      # User decides what variable their backend needs
      FRONTEND_ORIGIN: ${WEB_URL}      # References PreviewCloud's magic ${WEB_URL}
      DB_CONNECTION_STRING: ${DATABASE_URL}
```

### Step 2: PreviewCloud Processes This

```javascript
// PreviewCloud internally:
const services = {
  web: {
    url: 'https://pr-42.web.user-myapp.preview.previewcloud.cloud'
  },
  api: {
    url: 'https://pr-42.api.user-myapp.preview.previewcloud.cloud'
  }
};

const magicVars = {
  WEB_URL: services.web.url,
  API_URL: services.api.url,
  DATABASE_URL: 'postgres://...'
};

// Replace ${API_URL} with actual URL
const webEnv = {
  NEXT_PUBLIC_API_URL: magicVars.API_URL  // The name YOU chose
};

const apiEnv = {
  FRONTEND_ORIGIN: magicVars.WEB_URL,     // The name YOU chose
  DB_CONNECTION_STRING: magicVars.DATABASE_URL
};
```

### Step 3: Containers Receive Variables

**Frontend container gets:**
```bash
NEXT_PUBLIC_API_URL=https://pr-42.api.user-myapp.preview.previewcloud.cloud
```

**Backend container gets:**
```bash
FRONTEND_ORIGIN=https://pr-42.web.user-myapp.preview.previewcloud.cloud
DB_CONNECTION_STRING=postgres://pr-42-user-myapp:pass@postgres:5432/pr_42
```

### Step 4: User's Code Uses Their Variable Names

**Frontend code:**
```typescript
// frontend/lib/api.ts
// Use the variable name YOU defined in preview.yaml
const API_URL = process.env.NEXT_PUBLIC_API_URL;  // Your name!

export async function fetchUsers() {
  const response = await fetch(`${API_URL}/api/users`);
  return response.json();
}
```

**Backend code:**
```typescript
// backend/src/server.ts
// Use the variable name YOU defined in preview.yaml
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN  // Your name!
}));
```

---

## 🎨 Examples: Different Variable Names

### Example 1: Next.js Naming Convention

```yaml
services:
  web:
    dockerfile: ./frontend/Dockerfile
    port: 3000
    env:
      # Next.js requires NEXT_PUBLIC_ prefix for browser variables
      NEXT_PUBLIC_API_URL: ${API_URL}
      NEXT_PUBLIC_APP_NAME: MyApp
  
  api:
    dockerfile: ./backend/Dockerfile
    port: 8080
    env:
      CORS_ORIGIN: ${WEB_URL}
```

**Frontend code:**
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

---

### Example 2: React Naming Convention

```yaml
services:
  web:
    dockerfile: ./frontend/Dockerfile
    port: 3000
    env:
      # React requires REACT_APP_ prefix
      REACT_APP_API_URL: ${API_URL}
      REACT_APP_ENVIRONMENT: preview
  
  api:
    dockerfile: ./backend/Dockerfile
    port: 8080
    env:
      ALLOWED_ORIGIN: ${WEB_URL}
```

**Frontend code:**
```typescript
const apiUrl = process.env.REACT_APP_API_URL;
```

---

### Example 3: Custom Naming

```yaml
services:
  frontend:  # You can even name the service differently!
    dockerfile: ./client/Dockerfile
    port: 3000
    env:
      # Use whatever names YOU want!
      BACKEND_BASE_URL: ${API_URL}
      MY_CUSTOM_VAR: something
  
  backend:
    dockerfile: ./server/Dockerfile
    port: 8080
    env:
      # Reference by the service name you chose
      CLIENT_URL: ${FRONTEND_URL}  # ${FRONTEND_URL} because service is named "frontend"
```

**Frontend code:**
```typescript
const backendUrl = process.env.BACKEND_BASE_URL;  // Your custom name!
```

---

### Example 4: Multiple Services

```yaml
services:
  web:
    dockerfile: ./frontend/Dockerfile
    port: 3000
    env:
      NEXT_PUBLIC_API_URL: ${API_URL}      # Points to "api" service
      NEXT_PUBLIC_ADMIN_URL: ${ADMIN_URL}  # Points to "admin" service
  
  api:
    dockerfile: ./api/Dockerfile
    port: 8080
    env:
      WEB_ORIGIN: ${WEB_URL}
      ADMIN_ORIGIN: ${ADMIN_URL}
  
  admin:
    dockerfile: ./admin/Dockerfile
    port: 3001
    env:
      NEXT_PUBLIC_API_URL: ${API_URL}
```

PreviewCloud creates:
- `${WEB_URL}` → URL for "web" service
- `${API_URL}` → URL for "api" service
- `${ADMIN_URL}` → URL for "admin" service

---

## 🔑 Magic Variables Reference

### Service URLs

PreviewCloud automatically creates a `${SERVICE_NAME_URL}` variable for each service:

```yaml
services:
  web:        # Creates ${WEB_URL}
  api:        # Creates ${API_URL}
  admin:      # Creates ${ADMIN_URL}
  worker:     # Creates ${WORKER_URL}
  dashboard:  # Creates ${DASHBOARD_URL}
  # Pattern: uppercase service name + _URL
```

### Database

```yaml
database:
  type: postgres  # Creates ${DATABASE_URL}

# Available in all services:
env:
  DB: ${DATABASE_URL}  # postgres://...
```

### Preview Metadata

PreviewCloud also injects these (automatically, you don't define them):

```bash
PR_NUMBER=42
REPO_NAME=myapp
REPO_OWNER=acme
BRANCH_NAME=feature/auth
COMMIT_SHA=abc123def456
PREVIEW_ID=pr-42-acme-myapp
PREVIEW_URL=https://pr-42.web.acme-myapp.preview.previewcloud.cloud
```

---

## 📝 Complete Real-World Example

### User's Application

```
my-ecommerce-app/
├── storefront/     (Next.js - customer-facing)
├── admin-panel/    (React - internal admin)
├── api/            (Node.js - REST API)
├── worker/         (Node.js - background jobs)
└── preview.yaml
```

### preview.yaml

```yaml
services:
  # Customer-facing storefront
  storefront:
    dockerfile: ./storefront/Dockerfile
    port: 3000
    env:
      # Next.js variables (NEXT_PUBLIC_ prefix required)
      NEXT_PUBLIC_API_ENDPOINT: ${API_URL}
      NEXT_PUBLIC_STRIPE_KEY: ${STRIPE_PUBLIC_KEY}
      NEXT_PUBLIC_ENV: preview
  
  # Admin panel
  admin:
    dockerfile: ./admin-panel/Dockerfile
    port: 3001
    env:
      # React variables (REACT_APP_ prefix required)
      REACT_APP_API_BASE: ${API_URL}
      REACT_APP_STOREFRONT: ${STOREFRONT_URL}
  
  # API server
  api:
    dockerfile: ./api/Dockerfile
    port: 8080
    env:
      # Backend can use any names
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
      CORS_ORIGINS: ${STOREFRONT_URL},${ADMIN_URL}
      WORKER_ENDPOINT: http://worker:3002  # Internal communication
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
  
  # Background worker
  worker:
    dockerfile: ./worker/Dockerfile
    port: 3002
    env:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
      API_CALLBACK_URL: ${API_URL}

database:
  type: postgres
  migrations: ./api/migrations

secrets:
  - STRIPE_PUBLIC_KEY
  - STRIPE_SECRET_KEY
```

### What PreviewCloud Creates

```
Storefront: https://pr-42.storefront.user-ecommerce.preview.previewcloud.cloud
Admin:      https://pr-42.admin.user-ecommerce.preview.previewcloud.cloud
API:        https://pr-42.api.user-ecommerce.preview.previewcloud.cloud
Worker:     (internal only, no public URL)

Database:   postgres://pr-42-user-ecommerce:pass@postgres:5432/pr_42_user_ecommerce
```

### Environment Variables Injected

**Storefront container:**
```bash
NEXT_PUBLIC_API_ENDPOINT=https://pr-42.api.user-ecommerce.preview.previewcloud.cloud
NEXT_PUBLIC_STRIPE_KEY=pk_test_abc123
NEXT_PUBLIC_ENV=preview
PR_NUMBER=42
REPO_NAME=ecommerce
# ... other metadata
```

**Admin container:**
```bash
REACT_APP_API_BASE=https://pr-42.api.user-ecommerce.preview.previewcloud.cloud
REACT_APP_STOREFRONT=https://pr-42.storefront.user-ecommerce.preview.previewcloud.cloud
PR_NUMBER=42
# ... other metadata
```

**API container:**
```bash
DATABASE_URL=postgres://pr-42-user-ecommerce:pass@postgres:5432/pr_42_user_ecommerce
REDIS_URL=redis://redis:6379
CORS_ORIGINS=https://pr-42.storefront...,https://pr-42.admin...
WORKER_ENDPOINT=http://worker:3002
STRIPE_SECRET_KEY=sk_test_xyz789
PR_NUMBER=42
# ... other metadata
```

**Worker container:**
```bash
DATABASE_URL=postgres://pr-42-user-ecommerce:pass@postgres:5432/pr_42_user_ecommerce
REDIS_URL=redis://redis:6379
API_CALLBACK_URL=https://pr-42.api.user-ecommerce.preview.previewcloud.cloud
# ... other metadata
```

---

## ✅ Key Takeaways

### 1. Magic Variables (PreviewCloud provides)

These are **reference variables** you use in `preview.yaml`:

```yaml
${API_URL}       # Auto-created from "api" service
${WEB_URL}       # Auto-created from "web" service
${DATABASE_URL}  # Auto-created from database config
# Pattern: ${YOUR_SERVICE_NAME_URL}
```

### 2. User Variables (You choose the names)

These are the **actual environment variable names** your code uses:

```yaml
env:
  NEXT_PUBLIC_API_URL: ${API_URL}      # You pick "NEXT_PUBLIC_API_URL"
  MY_BACKEND_URL: ${API_URL}           # Or "MY_BACKEND_URL"
  WHATEVER_I_WANT: ${API_URL}          # Or any name you want!
```

### 3. Your Code Uses Your Names

```typescript
// Use the names YOU defined in preview.yaml
const apiUrl = process.env.NEXT_PUBLIC_API_URL;  // Your choice!
const backend = process.env.MY_BACKEND_URL;      // Your choice!
const anything = process.env.WHATEVER_I_WANT;    // Your choice!
```

---

## 🎯 Common Patterns by Framework

### Next.js

```yaml
services:
  web:
    env:
      NEXT_PUBLIC_API_URL: ${API_URL}          # Browser-accessible
      NEXT_PUBLIC_WS_URL: ${WS_URL}            # WebSocket
      SERVER_SIDE_API_KEY: ${API_KEY}          # Server-only
```

### React (Create React App)

```yaml
services:
  web:
    env:
      REACT_APP_API_URL: ${API_URL}            # Must start with REACT_APP_
      REACT_APP_ENV: preview
```

### Vue

```yaml
services:
  web:
    env:
      VUE_APP_API_URL: ${API_URL}              # Must start with VUE_APP_
      VUE_APP_MODE: preview
```

### Angular

```yaml
services:
  web:
    env:
      NG_API_URL: ${API_URL}                   # Custom names work
      API_ENDPOINT: ${API_URL}
```

### Plain HTML/JavaScript

```yaml
services:
  web:
    env:
      API_URL: ${API_URL}                      # Any name works
      BACKEND_URL: ${API_URL}
```

---

## 🔧 Advanced: Hardcoded vs Dynamic

### Option 1: Reference Magic Variables (Recommended)

```yaml
services:
  web:
    env:
      NEXT_PUBLIC_API_URL: ${API_URL}  # ✅ Dynamic - PreviewCloud fills this in
```

### Option 2: Hardcode Values

```yaml
services:
  web:
    env:
      NEXT_PUBLIC_API_URL: https://api.myapp.com  # ❌ Static - same for all previews
```

### Option 3: Mix Both

```yaml
services:
  web:
    env:
      NEXT_PUBLIC_API_URL: ${API_URL}             # Dynamic per preview
      NEXT_PUBLIC_ANALYTICS_ID: UA-123456          # Same for all previews
      NEXT_PUBLIC_APP_NAME: MyApp                  # Static value
```

---

## 💡 Summary

**The Confusion:**
> "Do I have to use `API_URL` specifically?"

**The Answer:**
> **NO!** You can use **any variable name** you want in your code.

**How It Works:**

1. **PreviewCloud provides magic variables** like `${API_URL}`, `${WEB_URL}` that you can **reference** in `preview.yaml`
2. **You define what your app expects** by mapping those magic variables to your own variable names
3. **Your code uses your variable names**, not PreviewCloud's magic names

**Example:**

```yaml
# In preview.yaml - you define the mapping:
env:
  MY_AWESOME_BACKEND: ${API_URL}  # Map magic var to your var

# In your code - you use YOUR name:
const backend = process.env.MY_AWESOME_BACKEND;  // Not ${API_URL}!
```

**Freedom:**
- ✅ Name variables whatever you want
- ✅ Use framework conventions (NEXT_PUBLIC_, REACT_APP_, etc.)
- ✅ Reference PreviewCloud's magic variables
- ✅ Mix static and dynamic values

---

**PreviewCloud is flexible - you're in control! 🎉**

