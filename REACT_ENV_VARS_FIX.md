# 🔧 Fix: React Frontend Not Using Backend URL

## The Problem

Your React app is calling `localhost:5000` instead of the deployed backend URL because:

1. **React requires `REACT_APP_` prefix** - Create React App only exposes environment variables that start with `REACT_APP_` to the browser
2. **Environment variables must be available at build time** - If your React app is pre-built (static files), env vars need to be injected during the Docker build

## ✅ Solution

### Step 1: Update `preview.yaml`

Change from:
```yaml
services:
  frontend:
    env:
      - API_URL: ${API_URL}  # ❌ Wrong - React won't see this
```

To:
```yaml
services:
  frontend:
    env:
      - REACT_APP_API_URL: ${API_URL}  # ✅ Correct - React will see this
```

### Step 2: Update Your React Code

Change from:
```javascript
const apiUrl = process.env.API_URL || 'http://localhost:5000'  // ❌ Won't work
```

To:
```javascript
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000'  // ✅ Correct
```

### Step 3: Ensure Your Dockerfile Rebuilds with Env Vars

Your `frontend/Dockerfile` should build the React app **inside the container** so it can access environment variables:

```dockerfile
# ✅ Good: Build inside container with env vars
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# REACT_APP_API_URL will be available here during build
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**NOT:**
```dockerfile
# ❌ Bad: Pre-built static files won't have env vars
FROM nginx:alpine
COPY build /usr/share/nginx/html  # Already built - no env vars!
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📝 Complete Example

### `preview.yaml`
```yaml
services:
  frontend:
    dockerfile: ./frontend/Dockerfile
    env:
      - REACT_APP_API_URL: ${API_URL}  # ✅ Use REACT_APP_ prefix
      - NODE_ENV: production
    port: 80
    root: true

  api:
    dockerfile: ./backend/Dockerfile
    port: 5000
    path: /api
    env:
      - DATABASE_URL: ${DATABASE_URL}
      - API_KEY: ${API_KEY}
```

### `frontend/src/App.js`
```javascript
import React, { useEffect, useState } from 'react'

function App() {
  const [backendMessage, setBackendMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // ✅ Use REACT_APP_API_URL
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000'
    fetch(`${apiUrl}/api/hello`)
      .then((response) => response.json())
      .then((data) => {
        setBackendMessage(data.message)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <h1>Hello from PreviewCloud</h1>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: '#ff6b6b' }}>Error: {error}</p>}
        {backendMessage && (
          <p style={{ marginTop: '20px', fontSize: '1.2rem' }}>
            {backendMessage}
          </p>
        )}
      </header>
    </div>
  )
}

export default App
```

### `frontend/Dockerfile`
```dockerfile
# Build stage - React app is built HERE with env vars
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build React app - REACT_APP_API_URL will be injected here
# PreviewCloud sets this env var before running docker build
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Production stage - serve static files
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🔍 How It Works

1. **PreviewCloud resolves `${API_URL}`** → `https://branch-main-username.api.preview.previewcloud.cloud`
2. **Sets `REACT_APP_API_URL`** in the container environment
3. **Docker build runs** → React build process sees `REACT_APP_API_URL` and bakes it into the JavaScript bundle
4. **Static files served** → The built JavaScript contains the actual backend URL

## ⚠️ Important Notes

- **Environment variables are baked into the build** - Once built, they can't be changed without rebuilding
- **Use `REACT_APP_` prefix** - Only variables starting with `REACT_APP_` are exposed to the browser
- **Build must happen in Docker** - Pre-built static files won't have access to environment variables

## 🧪 Testing Locally

To test locally before deploying:

```bash
# Set the env var
export REACT_APP_API_URL=http://localhost:5000

# Build
npm run build

# The built files will contain the API URL
```

## 📚 Framework-Specific Prefixes

- **React (CRA)**: `REACT_APP_*`
- **Next.js**: `NEXT_PUBLIC_*`
- **Vue**: `VUE_APP_*`
- **Vite**: `VITE_*`

