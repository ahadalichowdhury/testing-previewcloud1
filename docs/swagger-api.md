# PreviewCloud API Documentation

## API Overview

PreviewCloud provides a RESTful API for managing preview environments. All endpoints return JSON responses.

### Base URL

```
Development: http://localhost:3001
Production: https://api.previewcloud.cloud
```

### Interactive API Documentation

Access the interactive Swagger/OpenAPI documentation:

```
http://localhost:3001/api/docs
https://api.previewcloud.cloud/api/docs
```

## Authentication

Most write operations require authentication using a Bearer token.

### Security Schemes

1. **bearerAuth** - JWT token for API operations
   - Type: HTTP Bearer
   - Header: `Authorization: Bearer <token>`

2. **webhookSignature** - GitHub webhook signature verification
   - Type: API Key
   - Header: `X-Hub-Signature-256`

### Example Request with Authentication

```bash
curl -X POST https://api.previewcloud.cloud/api/previews \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d @preview-config.json
```

## Available Endpoints

### Health Check

#### GET /api/health

Check the system health status.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "api": "up",
    "database": "up",
    "docker": "up"
  }
}
```

---

### Previews

#### POST /api/previews

Create or update a preview environment.

**Authentication:** Required

**Request Body:**

```json
{
  "prNumber": 123,
  "repoName": "my-app",
  "repoOwner": "github-user",
  "branch": "feature/new-feature",
  "commitSha": "abc123def456",
  "services": {
    "api": {
      "dockerfile": "./api/Dockerfile",
      "port": 8080,
      "env": {
        "NODE_ENV": "preview"
      }
    },
    "web": {
      "dockerfile": "./web/Dockerfile",
      "port": 3000
    }
  },
  "database": {
    "type": "postgres",
    "migrations": "./migrations"
  },
  "env": {
    "LOG_LEVEL": "debug"
  },
  "password": "optional-password"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "prNumber": 123,
    "repoName": "my-app",
    "repoOwner": "github-user",
    "status": "running",
    "services": [
      {
        "name": "api",
        "url": "https://pr-123-user.api.previewcloud.cloud",
        "status": "running"
      },
      {
        "name": "web",
        "url": "https://pr-123-user.web.preview.previewcloud.cloud",
        "status": "running"
      }
    ],
    "database": {
      "type": "postgres",
      "connectionString": "postgresql://user:pass@host:5432/pr_123_db"
    },
    "urls": {
      "api": "https://pr-123-user.api.previewcloud.cloud",
      "web": "https://pr-123-user.web.preview.previewcloud.cloud"
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET /api/previews

List all preview environments.

**Query Parameters:**
- `status` (optional): Filter by status (creating, running, updating, destroying, destroyed, failed)
- `repoOwner` (optional): Filter by repository owner
- `repoName` (optional): Filter by repository name

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "prNumber": 123,
      "repoName": "my-app",
      "repoOwner": "github-user",
      "status": "running",
      "urls": {
        "api": "https://pr-123-user.api.previewcloud.cloud"
      },
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### GET /api/previews/{prNumber}

Get details of a specific preview.

**Path Parameters:**
- `prNumber`: Pull request number

**Response:**

```json
{
  "success": true,
  "data": {
    "prNumber": 123,
    "repoName": "my-app",
    "repoOwner": "github-user",
    "status": "running",
    "services": [
      {
        "name": "api",
        "containerId": "abc123",
        "imageTag": "previewcloud/pr-123-api:latest",
        "port": 8080,
        "url": "https://pr-123-user.api.previewcloud.cloud",
        "status": "running"
      }
    ],
    "database": {
      "type": "postgres",
      "connectionString": "postgresql://user:pass@host:5432/pr_123_db"
    },
    "urls": {
      "api": "https://pr-123-user.api.previewcloud.cloud"
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "lastAccessedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

#### DELETE /api/previews/{prNumber}

Destroy a preview environment.

**Authentication:** Required

**Path Parameters:**
- `prNumber`: Pull request number

**Response:**

```json
{
  "success": true,
  "message": "Preview destroyed successfully"
}
```

---

### Logs

#### GET /api/previews/{prNumber}/logs

Get logs for a preview environment.

**Path Parameters:**
- `prNumber`: Pull request number

**Query Parameters:**
- `type` (optional): Filter by log type (build, deploy, container, database, system)
- `limit` (optional): Number of logs to return (default: 100, max: 1000)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "previewId": "507f1f77bcf86cd799439011",
      "prNumber": 123,
      "type": "deploy",
      "message": "Service api deployed successfully",
      "metadata": {
        "serviceName": "api",
        "containerId": "abc123"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 50
}
```

#### GET /api/previews/{prNumber}/logs/paginated

Get paginated logs.

**Path Parameters:**
- `prNumber`: Pull request number

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Number of logs per page (default: 50, max: 100)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "previewId": "507f1f77bcf86cd799439011",
      "prNumber": 123,
      "type": "build",
      "message": "Building image for service api",
      "createdAt": "2024-01-15T10:25:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 250,
    "pages": 5
  }
}
```

#### GET /api/previews/{prNumber}/logs/stats

Get log statistics by type.

**Path Parameters:**
- `prNumber`: Pull request number

**Response:**

```json
{
  "success": true,
  "data": {
    "build": 45,
    "deploy": 12,
    "container": 189,
    "database": 8,
    "system": 6
  }
}
```

#### WebSocket: /api/previews/{prNumber}/logs/stream

Stream real-time logs via WebSocket.

**Connection:**

```javascript
const ws = new WebSocket('ws://localhost:3001/api/previews/123/logs/stream');

ws.onmessage = (event) => {
  const log = JSON.parse(event.data);
  console.log(log.message);
};
```

**Message Format:**

```json
{
  "type": "deploy",
  "message": "Container started successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Webhooks

#### POST /api/webhooks/github

GitHub webhook handler for pull request events.

**Authentication:** GitHub signature verification

**Headers:**
- `X-Hub-Signature-256`: GitHub webhook signature
- `X-GitHub-Event`: Event type (e.g., `pull_request`)

**Supported Events:**
- `pull_request.opened` - Creates a new preview
- `pull_request.synchronize` - Updates existing preview
- `pull_request.reopened` - Recreates preview
- `pull_request.closed` - Destroys preview

**Response:**

```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

#### GET /api/webhooks/github

Webhook endpoint health check.

**Response:**

```json
{
  "success": true,
  "message": "GitHub webhook endpoint is ready"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error message here",
    "stack": "Stack trace (only in development)"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable (degraded health)

---

## Rate Limiting

Currently, there is no rate limiting implemented. In production, consider implementing rate limiting based on your requirements.

---

## Usage Examples

### Create a Preview (cURL)

```bash
curl -X POST http://localhost:3001/api/previews \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prNumber": 123,
    "repoName": "my-app",
    "repoOwner": "github-user",
    "branch": "feature/auth",
    "commitSha": "abc123",
    "services": {
      "api": {
        "dockerfile": "./Dockerfile",
        "port": 3000
      }
    }
  }'
```

### List Previews (JavaScript/Fetch)

```javascript
const response = await fetch('http://localhost:3001/api/previews?status=running');
const data = await response.json();
console.log(data.data); // Array of previews
```

### Stream Logs (JavaScript/WebSocket)

```javascript
const ws = new WebSocket('ws://localhost:3001/api/previews/123/logs/stream');

ws.onopen = () => {
  console.log('Connected to log stream');
};

ws.onmessage = (event) => {
  const log = JSON.parse(event.data);
  console.log(`[${log.type}] ${log.message}`);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

### Destroy Preview (Python/requests)

```python
import requests

response = requests.delete(
    'http://localhost:3001/api/previews/123',
    headers={'Authorization': 'Bearer YOUR_TOKEN'}
)

if response.status_code == 200:
    print('Preview destroyed successfully')
else:
    print('Error:', response.json())
```

---

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:

```
http://localhost:3001/api/docs/json
https://api.previewcloud.cloud/api/docs/json
```

You can import this specification into tools like:
- Postman
- Insomnia
- Swagger Editor
- API testing tools

---

## Need Help?

- **Interactive Docs**: Visit `/api/docs` for the Swagger UI
- **GitHub Issues**: Report bugs or request features
- **Community**: Join our community discussions

