# PreviewCloud API Reference

Complete API documentation for the PreviewCloud platform.

## Base URL

```
https://api.preview.previewcloud.cloud
```

## Authentication

All authenticated endpoints require a Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://api.preview.previewcloud.cloud/api/previews
```

### Generating an API Token

```bash
# Contact your PreviewCloud administrator for a token
# Tokens are generated with the API_TOKEN_SECRET
```

## Endpoints

### Health Check

#### GET /api/health

Check the health status of the PreviewCloud API.

**Authentication:** None required

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
      "port": 3000,
      "context": "./web"
    }
  },
  "database": {
    "type": "postgres",
    "migrations": "./migrations"
  },
  "env": {
    "LOG_LEVEL": "debug"
  },
  "password": "optional-preview-password"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "prNumber": 123,
    "repoName": "my-app",
    "repoOwner": "github-user",
    "status": "creating",
    "services": [],
    "urls": {},
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Preview created/updated successfully"
}
```

**Error Responses:**

400 Bad Request:

```json
{
  "success": false,
  "error": {
    "message": "Missing required fields: prNumber, repoName, repoOwner"
  }
}
```

401 Unauthorized:

```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired token"
  }
}
```

---

#### GET /api/previews

List all preview environments.

**Authentication:** Optional (public listing)

**Query Parameters:**

- `status` (optional): Filter by status (`creating`, `running`, `updating`, `destroying`, `destroyed`, `failed`)
- `repoOwner` (optional): Filter by repository owner
- `repoName` (optional): Filter by repository name

**Example:**

```bash
curl "https://api.preview.previewcloud.cloud/api/previews?status=running&repoOwner=myuser"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "prNumber": 123,
      "repoName": "my-app",
      "repoOwner": "github-user",
      "branch": "feature/new-feature",
      "commitSha": "abc123def456",
      "status": "running",
      "services": [
        {
          "name": "api",
          "containerId": "container123",
          "imageTag": "previewcloud/pr-123-api:abc123",
          "port": 8080,
          "url": "https://pr-123-github-user.api.preview.previewcloud.cloud",
          "status": "running"
        }
      ],
      "database": {
        "type": "postgres",
        "connectionString": "postgresql://..."
      },
      "urls": {
        "api": "https://pr-123-github-user.api.preview.previewcloud.cloud",
        "web": "https://pr-123-github-user.web.preview.previewcloud.cloud"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z",
      "lastAccessedAt": "2024-01-15T10:35:00.000Z"
    }
  ],
  "count": 1
}
```

---

#### GET /api/previews/:prNumber

Get details for a specific preview.

**Authentication:** Optional

**Parameters:**

- `prNumber` (required): Pull request number

**Example:**

```bash
curl https://api.preview.previewcloud.cloud/api/previews/123
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "prNumber": 123,
    "repoName": "my-app",
    "repoOwner": "github-user",
    "branch": "feature/new-feature",
    "commitSha": "abc123def456",
    "status": "running",
    "services": [...],
    "database": {...},
    "urls": {...},
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z",
    "lastAccessedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

**Error Responses:**

404 Not Found:

```json
{
  "success": false,
  "error": {
    "message": "Preview not found"
  }
}
```

---

#### DELETE /api/previews/:prNumber

Destroy a preview environment.

**Authentication:** Required

**Parameters:**

- `prNumber` (required): Pull request number

**Example:**

```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://api.preview.previewcloud.cloud/api/previews/123
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Preview destroyed successfully"
}
```

---

### Logs

#### GET /api/previews/:prNumber/logs

Get logs for a preview environment.

**Authentication:** Optional

**Parameters:**

- `prNumber` (required): Pull request number

**Query Parameters:**

- `type` (optional): Filter by log type (`build`, `deploy`, `container`, `database`, `system`)
- `limit` (optional): Number of logs to return (default: 100, max: 1000)
- `offset` (optional): Offset for pagination (default: 0)

**Example:**

```bash
curl "https://api.preview.previewcloud.cloud/api/previews/123/logs?type=build&limit=50"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "log123",
      "previewId": "preview123",
      "prNumber": 123,
      "type": "build",
      "message": "[api] Step 1/5 : FROM node:20-alpine",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "log124",
      "previewId": "preview123",
      "prNumber": 123,
      "type": "deploy",
      "message": "Service api deployed: https://pr-123-user.api.preview.previewcloud.cloud",
      "createdAt": "2024-01-15T10:35:00.000Z"
    }
  ],
  "count": 2
}
```

---

#### GET /api/previews/:prNumber/logs/paginated

Get paginated logs for a preview.

**Authentication:** Optional

**Parameters:**

- `prNumber` (required): Pull request number

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Logs per page (default: 50, max: 100)

**Example:**

```bash
curl "https://api.preview.previewcloud.cloud/api/previews/123/logs/paginated?page=1&pageSize=50"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 250,
    "pages": 5
  }
}
```

---

#### GET /api/previews/:prNumber/logs/stats

Get log statistics for a preview.

**Authentication:** Optional

**Example:**

```bash
curl https://api.preview.previewcloud.cloud/api/previews/123/logs/stats
```

**Response (200 OK):**

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

---

#### WebSocket: /api/previews/:prNumber/logs/stream

Stream real-time logs via WebSocket.

**Authentication:** Optional

**Example (JavaScript):**

```javascript
const ws = new WebSocket(
  "ws://api.preview.previewcloud.cloud/api/previews/123/logs/stream"
);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "log") {
    console.log(data.data.message);
  }

  if (data.type === "error") {
    console.error(data.message);
  }
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};
```

**Message Format:**

```json
{
  "type": "log",
  "data": {
    "_id": "log123",
    "prNumber": 123,
    "type": "container",
    "message": "Server listening on port 8080",
    "createdAt": "2024-01-15T10:35:00.000Z"
  }
}
```

---

### GitHub Webhooks

#### POST /api/webhooks/github

Handle GitHub webhook events.

**Authentication:** GitHub webhook signature verification

**Headers:**

- `X-GitHub-Event`: Event type (must be `pull_request`)
- `X-Hub-Signature-256`: HMAC signature

**Request Body:**
GitHub webhook payload for pull_request events.

**Supported Actions:**

- `opened`: Create preview
- `synchronize`: Update preview (new commits)
- `reopened`: Recreate preview
- `closed`: Destroy preview

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

**Error Responses:**

401 Unauthorized (Invalid signature):

```json
{
  "success": false,
  "error": {
    "message": "Invalid signature"
  }
}
```

---

## Rate Limiting

Currently, there is no rate limiting implemented. This may be added in future versions.

## Error Codes

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| 200  | Success                                 |
| 400  | Bad Request - Invalid parameters        |
| 401  | Unauthorized - Missing or invalid token |
| 404  | Not Found - Resource doesn't exist      |
| 500  | Internal Server Error                   |
| 503  | Service Unavailable - System degraded   |

## Common Errors

### Invalid Token

```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired token"
  }
}
```

**Solution:** Verify your API token is correct and hasn't expired.

### Preview Not Found

```json
{
  "success": false,
  "error": {
    "message": "Preview not found"
  }
}
```

**Solution:** Verify the PR number is correct and the preview exists.

### Service Unavailable

```json
{
  "status": "degraded",
  "services": {
    "api": "up",
    "database": "down",
    "docker": "up"
  }
}
```

**Solution:** Check system health and ensure all dependencies are running.

## Best Practices

1. **Token Security**: Never commit API tokens to version control
2. **Error Handling**: Always handle error responses gracefully
3. **Webhooks**: Verify webhook signatures to prevent unauthorized access
4. **Pagination**: Use paginated endpoints for large result sets
5. **WebSockets**: Implement reconnection logic for log streaming
6. **Rate Limiting**: Be prepared for rate limiting in future versions

## SDKs and Libraries

Currently, no official SDKs are available. The API follows REST conventions and can be used with any HTTP client.

Example clients:

- **JavaScript**: axios, fetch
- **Python**: requests, httpx
- **Go**: net/http
- **Ruby**: faraday, httparty
