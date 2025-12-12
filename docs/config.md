# PreviewCloud Configuration Guide

Complete configuration reference for PreviewCloud.

## Table of Contents

- [Environment Variables](#environment-variables)
- [preview.yaml Specification](#previewyaml-specification)
- [Database Configuration](#database-configuration)
- [Traefik Configuration](#traefik-configuration)
- [Examples](#examples)

## Environment Variables

### Server Configuration

| Variable   | Description      | Default       | Required |
| ---------- | ---------------- | ------------- | -------- |
| `PORT`     | API server port  | `3001`        | No       |
| `NODE_ENV` | Environment mode | `development` | No       |

### MongoDB Configuration

| Variable      | Description               | Default                                  | Required |
| ------------- | ------------------------- | ---------------------------------------- | -------- |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/previewcloud` | Yes      |

### Docker Configuration

| Variable      | Description        | Default                       | Required |
| ------------- | ------------------ | ----------------------------- | -------- |
| `DOCKER_HOST` | Docker socket path | `unix:///var/run/docker.sock` | Yes      |

### Domain Configuration

| Variable       | Description              | Default         | Required |
| -------------- | ------------------------ | --------------- | -------- |
| `BASE_DOMAIN`  | Base domain for previews | `preview.local` | Yes      |
| `WILDCARD_SSL` | Enable Let's Encrypt SSL | `false`         | No       |

### GitHub Configuration

| Variable                | Description           | Default | Required           |
| ----------------------- | --------------------- | ------- | ------------------ |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook secret | -       | Yes (for webhooks) |

### Security

| Variable           | Description        | Default | Required |
| ------------------ | ------------------ | ------- | -------- |
| `JWT_SECRET`       | JWT signing secret | -       | Yes      |
| `API_TOKEN_SECRET` | API token secret   | -       | Yes      |

### Preview Configuration

| Variable                   | Description                 | Default | Required |
| -------------------------- | --------------------------- | ------- | -------- |
| `MAX_PREVIEWS`             | Maximum concurrent previews | `20`    | No       |
| `IDLE_TIMEOUT_HOURS`       | Hours before idle cleanup   | `48`    | No       |
| `CLEANUP_INTERVAL_MINUTES` | Cleanup job interval        | `30`    | No       |

### PostgreSQL Configuration

| Variable                  | Description     | Default     | Required |
| ------------------------- | --------------- | ----------- | -------- |
| `POSTGRES_HOST`           | PostgreSQL host | `localhost` | No       |
| `POSTGRES_PORT`           | PostgreSQL port | `5432`      | No       |
| `POSTGRES_ADMIN_USER`     | Admin username  | `postgres`  | No       |
| `POSTGRES_ADMIN_PASSWORD` | Admin password  | `postgres`  | No       |

### MySQL Configuration

| Variable               | Description    | Default     | Required |
| ---------------------- | -------------- | ----------- | -------- |
| `MYSQL_HOST`           | MySQL host     | `localhost` | No       |
| `MYSQL_PORT`           | MySQL port     | `3306`      | No       |
| `MYSQL_ADMIN_USER`     | Admin username | `root`      | No       |
| `MYSQL_ADMIN_PASSWORD` | Admin password | `root`      | No       |

### MongoDB Configuration (Preview DBs)

| Variable                 | Description    | Default     | Required |
| ------------------------ | -------------- | ----------- | -------- |
| `MONGODB_HOST`           | MongoDB host   | `localhost` | No       |
| `MONGODB_PORT`           | MongoDB port   | `27017`     | No       |
| `MONGODB_ADMIN_USER`     | Admin username | `admin`     | No       |
| `MONGODB_ADMIN_PASSWORD` | Admin password | `admin`     | No       |

### Traefik Configuration

| Variable          | Description         | Default                 | Required |
| ----------------- | ------------------- | ----------------------- | -------- |
| `TRAEFIK_NETWORK` | Docker network name | `traefik-proxy`         | Yes      |
| `TRAEFIK_API_URL` | Traefik API URL     | `http://localhost:8080` | No       |

### Preview Security

| Variable                     | Description          | Default      | Required |
| ---------------------------- | -------------------- | ------------ | -------- |
| `PREVIEW_PASSWORD_PROTECTED` | Protect all previews | `false`      | No       |
| `PREVIEW_DEFAULT_PASSWORD`   | Default password     | `preview123` | No       |

## preview.yaml Specification

The `preview.yaml` file defines the configuration for your preview environment.

### File Location

Place `preview.yaml` in your repository root or specify a custom path in the GitHub Action.

### Full Schema

```yaml
# Services to deploy (required)
services:
  <service-name>:
    dockerfile: <string> # Required: Path to Dockerfile
    port: <number> # Optional: Exposed port (default: auto-detect)
    env: <object> # Optional: Environment variables
    context: <string> # Optional: Build context path
    buildArgs: <object> # Optional: Docker build arguments

# Database configuration (optional)
database:
  type: postgres|mysql|mongodb # Required: Database type
  migrations: <string> # Optional: Path to migrations folder

# Global environment variables (optional)
env:
  <KEY>: <value>

# Password protection (optional)
password: <string> # Optional: Password for preview access
```

### Services Configuration

#### service-name

Each service must have a unique name that will be used in the URL.

**Valid names:**

- Alphanumeric characters
- Hyphens (-)
- Underscores (\_)

**Examples:** `api`, `web`, `worker`, `admin-panel`

#### dockerfile (required)

Path to the Dockerfile relative to repository root.

**Examples:**

```yaml
services:
  api:
    dockerfile: ./api/Dockerfile
  web:
    dockerfile: ./frontend/Dockerfile
```

#### port (optional)

The port your service listens on inside the container.

**Default:** Auto-detected from Dockerfile EXPOSE directive

**Examples:**

```yaml
services:
  api:
    port: 8080
  web:
    port: 3000
```

#### env (optional)

Environment variables specific to this service.

**Examples:**

```yaml
services:
  api:
    env:
      NODE_ENV: preview
      LOG_LEVEL: debug
      REDIS_URL: redis://redis:6379
```

#### context (optional)

Build context directory relative to repository root.

**Default:** Directory containing the Dockerfile

**Examples:**

```yaml
services:
  web:
    dockerfile: ./web/Dockerfile
    context: ./web
```

#### buildArgs (optional)

Docker build arguments passed during image build.

**Examples:**

```yaml
services:
  api:
    buildArgs:
      BUILD_ENV: preview
      NODE_VERSION: "20"
```

### Database Configuration

#### type (required)

Database engine to provision.

**Options:**

- `postgres`: PostgreSQL 16
- `mysql`: MySQL 8
- `mongodb`: MongoDB 7

**Examples:**

```yaml
database:
  type: postgres

database:
  type: mysql

database:
  type: mongodb
```

#### migrations (optional)

Path to migrations folder relative to repository root.

**PostgreSQL/MySQL:**

- SQL files (`.sql`)
- Executed in alphabetical order
- Each file should be idempotent

**MongoDB:**

- JavaScript files (`.js`)
- Must export `up` function
- Receives database connection

**Examples:**

```yaml
database:
  type: postgres
  migrations: ./migrations

database:
  type: mongodb
  migrations: ./db/migrations
```

### Global Environment Variables

Environment variables available to all services.

**Automatic Variables:**

- `DATABASE_URL`: Connection string for provisioned database
- `DATABASE_TYPE`: Database type (postgres/mysql/mongodb)
- `PR_NUMBER`: Pull request number
- `BRANCH`: Git branch name
- `COMMIT_SHA`: Git commit SHA

**Examples:**

```yaml
env:
  APP_ENV: preview
  LOG_LEVEL: debug
  FEATURE_FLAGS: "experimental,new-ui"
```

### Password Protection

Optional password to protect preview URLs with basic auth.

**Examples:**

```yaml
password: my-secure-password
```

**Result:**

- Username: `preview`
- Password: `my-secure-password`
- All service URLs protected

## Examples

### Example 1: Simple Single Service

```yaml
services:
  api:
    dockerfile: ./Dockerfile
    port: 8080
```

**Result:**

- Single service: `pr-123-user.api.preview.previewcloud.cloud`
- No database
- No custom environment variables

### Example 2: Multi-Service with Database

```yaml
services:
  api:
    dockerfile: ./backend/Dockerfile
    port: 8080
    env:
      NODE_ENV: preview

  web:
    dockerfile: ./frontend/Dockerfile
    port: 3000
    env:
      API_URL: https://pr-123-user.api.preview.previewcloud.cloud

database:
  type: postgres
  migrations: ./migrations

env:
  LOG_LEVEL: debug
```

**Result:**

- API service: `pr-123-user.api.preview.previewcloud.cloud`
- Web service: `pr-123-user.web.preview.previewcloud.cloud`
- PostgreSQL database with migrations
- DATABASE_URL available to all services

### Example 3: Microservices Architecture

```yaml
services:
  api:
    dockerfile: ./services/api/Dockerfile
    port: 8080
    context: ./services/api

  auth:
    dockerfile: ./services/auth/Dockerfile
    port: 8081
    context: ./services/auth

  web:
    dockerfile: ./apps/web/Dockerfile
    port: 3000
    context: ./apps/web
    env:
      API_URL: https://pr-123-user.api.preview.previewcloud.cloud
      AUTH_URL: https://pr-123-user.auth.preview.previewcloud.cloud

  admin:
    dockerfile: ./apps/admin/Dockerfile
    port: 3001
    context: ./apps/admin

database:
  type: postgres
  migrations: ./migrations

env:
  NODE_ENV: preview
  JWT_SECRET: preview-secret

password: secure-preview-password
```

**Result:**

- 4 services with individual URLs
- PostgreSQL database
- All URLs password-protected
- Proper service isolation

### Example 4: MongoDB with Migrations

```yaml
services:
  api:
    dockerfile: ./Dockerfile
    port: 3000

database:
  type: mongodb
  migrations: ./db/migrations
```

**Migration file (001-initial-setup.js):**

```javascript
module.exports = {
  async up(db) {
    // Create collections
    await db.createCollection("users");
    await db.createCollection("posts");

    // Create indexes
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("posts").createIndex({ userId: 1 });
  },
};
```

### Example 5: Full-Stack Application

```yaml
services:
  api:
    dockerfile: ./backend/Dockerfile
    port: 4000
    context: ./backend
    buildArgs:
      NODE_VERSION: "20"
    env:
      CORS_ORIGIN: https://pr-123-user.web.preview.previewcloud.cloud

  worker:
    dockerfile: ./worker/Dockerfile
    context: ./worker
    # No port - background worker

  web:
    dockerfile: ./frontend/Dockerfile
    port: 3000
    context: ./frontend
    buildArgs:
      NEXT_PUBLIC_API_URL: https://pr-123-user.api.preview.previewcloud.cloud

database:
  type: postgres
  migrations: ./db/migrations

env:
  REDIS_URL: redis://shared-redis:6379
  S3_BUCKET: preview-uploads
  AWS_REGION: us-east-1
```

## Database Connection Strings

### PostgreSQL

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

**Example:**

```
postgresql://postgres:password@localhost:5432/pr_123_db
```

### MySQL

```
mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

**Example:**

```
mysql://root:password@localhost:3306/pr_123_db
```

### MongoDB

```
mongodb://USER:PASSWORD@HOST:PORT/DATABASE
```

**Example:**

```
mongodb://admin:password@localhost:27017/pr_123_db
```

## Best Practices

### Service Naming

**Good:**

```yaml
services:
  api: # ✓ Simple, clear
  web: # ✓ Standard name
  admin-panel: # ✓ Descriptive with hyphen
```

**Bad:**

```yaml
services:
  MyAPI:      # ✗ Capital letters
  web service: # ✗ Space
  @admin:     # ✗ Special character
```

### Environment Variables

**Good:**

```yaml
env:
  DATABASE_POOL_SIZE: "10" # ✓ Specific
  LOG_LEVEL: debug # ✓ Appropriate for preview
  FEATURE_NEW_UI: "true" # ✓ Feature flags
```

**Bad:**

```yaml
env:
  SECRET_KEY: "hardcoded-secret" # ✗ Security risk
  PROD_API_KEY: "xyz" # ✗ Production credential
```

### Migrations

**Good:**

```
migrations/
├── 001-create-users-table.sql      # ✓ Numbered
├── 002-create-posts-table.sql      # ✓ Descriptive
├── 003-add-user-indexes.sql        # ✓ Ordered
```

**Bad:**

```
migrations/
├── users.sql                        # ✗ No order
├── fix.sql                          # ✗ Unclear
├── migration.sql                    # ✗ Generic
```

### Build Context

**Good:**

```yaml
services:
  api:
    dockerfile: ./api/Dockerfile
    context: ./api # ✓ Isolated context
```

**Bad:**

```yaml
services:
  api:
    dockerfile: ./api/Dockerfile
    context: . # ✗ Root context (slow builds)
```

## Troubleshooting

### Common Issues

#### Service won't start

**Check:**

1. Port configuration matches Dockerfile EXPOSE
2. Environment variables are correct
3. Dependencies are available

#### Database connection fails

**Check:**

1. Database type matches application
2. Connection string format
3. Database credentials

#### Build fails

**Check:**

1. Dockerfile path is correct
2. Build context includes all files
3. Build arguments are valid

#### URL not accessible

**Check:**

1. Service is running (`docker ps`)
2. Traefik labels are correct
3. DNS is properly configured
4. SSL certificates are valid

## Advanced Configuration

### Custom Docker Networks

Not currently supported via preview.yaml. All containers join the `traefik-proxy` network.

### Resource Limits

Not currently supported via preview.yaml. Set via environment variables or infrastructure configuration.

### Health Checks

Define in your Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/health || exit 1
```

### Volumes

Not currently supported for preview environments to maintain isolation and clean state.
