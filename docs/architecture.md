# PreviewCloud Architecture

This document describes the system architecture, components, and data flow of PreviewCloud.

## System Overview

PreviewCloud is a self-hosted platform that automatically creates isolated preview environments for GitHub Pull Requests. It supports multiple services, multiple databases, and provides automatic SSL, routing, and cleanup.

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                            GitHub                                  │
│                                                                    │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐   │
│  │ Pull Request │──────│GitHub Action │──────│   Webhook    │   │
│  │   (opened)   │      │  (builds &   │      │ (PR events)  │   │
│  └──────────────┘      │   deploys)   │      └──────────────┘   │
│                        └──────────────┘                           │
└────────────┬─────────────────┬────────────────────┬───────────────┘
             │                 │                    │
             │ 1. PR opened    │ 2. Build & Call   │ 3. PR closed
             │                 │    API             │
             ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PreviewCloud API Server                         │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │                     Express.js API                             ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     ││
│  │  │  Routes  │──│Controllers│──│ Services │──│  Models  │     ││
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  Core Services:                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Preview Manager: Orchestrates preview lifecycle             │  │
│  │   ├─ Create: DB → Build → Deploy → Start                    │  │
│  │   ├─ Update: Stop → Rebuild → Redeploy                      │  │
│  │   └─ Destroy: Stop → Remove containers → Drop DB            │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Build Manager: Docker image building                        │  │
│  │   ├─ Parse Dockerfile and context                           │  │
│  │   ├─ Build images (parallel)                                │  │
│  │   └─ Stream build logs                                      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ DB Provisioner: Database management                         │  │
│  │   ├─ PostgreSQL: CREATE DATABASE, run SQL migrations       │  │
│  │   ├─ MySQL: CREATE DATABASE, run SQL migrations            │  │
│  │   └─ MongoDB: create database, run JS migrations           │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Docker Service: Container lifecycle                         │  │
│  │   ├─ Build images from Dockerfiles                          │  │
│  │   ├─ Create containers with labels                          │  │
│  │   ├─ Start/Stop/Remove containers                           │  │
│  │   └─ Stream logs                                            │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Traefik Service: Dynamic routing                            │  │
│  │   ├─ Generate Traefik labels                                │  │
│  │   ├─ Configure SSL (Let's Encrypt)                          │  │
│  │   ├─ Generate URLs: pr-{num}-{owner}.{service}.{domain}    │  │
│  │   └─ Optional basic auth                                    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Logs Service: Centralized logging                           │  │
│  │   ├─ Store logs in MongoDB                                  │  │
│  │   ├─ Real-time streaming via WebSocket                      │  │
│  │   ├─ Log types: build, deploy, container, database          │  │
│  │   └─ Automatic cleanup (30 days)                            │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Cleanup Scheduler: Resource management                      │  │
│  │   ├─ Idle previews (>48h) → destroy                         │  │
│  │   ├─ Closed PRs → destroy                                   │  │
│  │   ├─ Enforce max preview limit                              │  │
│  │   ├─ Cleanup orphan containers                              │  │
│  │   └─ Prune Docker resources                                 │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ GitHub Service: Webhook handling                            │  │
│  │   ├─ pull_request.opened → create preview                   │  │
│  │   ├─ pull_request.synchronize → update preview              │  │
│  │   └─ pull_request.closed → destroy preview                  │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Infrastructure Layer                         │
│                                                                     │
│  ┌──────────────────┐         ┌──────────────────┐                │
│  │  Docker Engine   │◄────────│  Traefik Proxy   │                │
│  │                  │         │  - Auto SSL      │                │
│  │ ┌──────────────┐ │         │  - Routing       │                │
│  │ │ PR-12-api    │◄┼─────────┤  - Load Balance  │                │
│  │ │ Container    │ │         └──────────────────┘                │
│  │ └──────────────┘ │                                              │
│  │ ┌──────────────┐ │         ┌──────────────────┐                │
│  │ │ PR-12-web    │ │         │    MongoDB       │                │
│  │ │ Container    │ │         │  (Platform DB)   │                │
│  │ └──────────────┘ │         └──────────────────┘                │
│  │                  │                                              │
│  │ Network:         │         ┌──────────────────┐                │
│  │ traefik-proxy    │         │   PostgreSQL     │                │
│  └──────────────────┘         │ (Preview DBs)    │                │
│                               └──────────────────┘                │
│                               ┌──────────────────┐                │
│                               │      MySQL       │                │
│                               │ (Preview DBs)    │                │
│                               └──────────────────┘                │
│                               ┌──────────────────┐                │
│                               │     MongoDB      │                │
│                               │ (Preview DBs)    │                │
│                               └──────────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. API Server (Express.js)

**Responsibilities:**

- Handle HTTP requests and WebSocket connections
- Route requests to appropriate controllers
- Authentication and authorization
- Error handling and logging

**Technologies:**

- Express.js for HTTP server
- express-ws for WebSocket support
- JWT for authentication
- Winston for logging

### 2. Preview Manager

**Responsibilities:**

- Orchestrate preview creation, update, and destruction
- Coordinate between all services
- Manage preview state transitions
- Handle failures and rollbacks

**State Machine:**

```
┌─────────┐     create      ┌──────────┐     success     ┌─────────┐
│ [none]  │────────────────>│ CREATING │───────────────>│ RUNNING │
└─────────┘                 └──────────┘                 └────┬────┘
                                  │                           │
                                  │ failure                   │ update
                                  ▼                           ▼
                            ┌──────────┐              ┌───────────┐
                            │  FAILED  │              │ UPDATING  │
                            └──────────┘              └─────┬─────┘
                                                            │
                                                            │ success
                                                            ▼
                                  destroy             ┌─────────┐
                            ┌────────────────────────│ RUNNING │
                            │                         └─────────┘
                            ▼
                      ┌─────────────┐
                      │ DESTROYING  │
                      └──────┬──────┘
                            │
                            ▼
                      ┌───────────┐
                      │ DESTROYED │
                      └───────────┘
```

### 3. Build Manager

**Responsibilities:**

- Build Docker images from Dockerfiles
- Manage build contexts
- Cache build layers
- Stream build logs

**Build Flow:**

1. Parse service configurations
2. Resolve Dockerfile and context paths
3. Create tar stream of build context
4. Call Docker API to build
5. Stream progress to logs service
6. Tag and store image

### 4. Database Provisioner

**Factory Pattern:**

```typescript
DBProvisionerFactory
  ├─ PostgresProvisioner
  ├─ MySQLProvisioner
  └─ MongoDBProvisioner
```

**Each Provisioner:**

- Creates isolated database per PR
- Runs migrations automatically
- Provides connection string
- Destroys database on cleanup

**Database Naming:**

- Format: `pr_{prNumber}_db`
- Examples: `pr_123_db`, `pr_456_db`

### 5. Docker Service

**Container Management:**

- Uses Dockerode library
- Connects to Docker socket
- Manages container lifecycle
- Handles networking

**Container Naming:**

- Format: `pr-{number}-{service}-{uniqueId}`
- Example: `pr-123-api-a1b2c3d4`

**Labels for Tracking:**

```json
{
  "previewcloud.managed": "true",
  "previewcloud.pr": "123",
  "previewcloud.service": "api",
  "previewcloud.owner": "john"
}
```

### 6. Traefik Service

**Label Generation:**
For each service, generates Traefik labels:

```json
{
  "traefik.enable": "true",
  "traefik.http.routers.pr-123-api.rule": "Host(`pr-123-john.api.preview.com`)",
  "traefik.http.routers.pr-123-api.entrypoints": "websecure",
  "traefik.http.routers.pr-123-api.tls": "true",
  "traefik.http.routers.pr-123-api.tls.certresolver": "letsencrypt",
  "traefik.http.services.pr-123-api.loadbalancer.server.port": "8080"
}
```

**URL Pattern:**

```
protocol://pr-{number}-{owner}.{service}.{baseDomain}
```

### 7. Logs Service

**Log Storage:**

- MongoDB with capped collections
- TTL index (30 days)
- Indexed by PR number and timestamp

**Log Types:**

- `build`: Image building logs
- `deploy`: Deployment logs
- `container`: Container runtime logs
- `database`: Database operations logs
- `system`: System messages

**Real-time Streaming:**

- MongoDB Change Streams
- WebSocket broadcasting
- Automatic reconnection

### 8. Cleanup Scheduler

**Runs Every 30 Minutes:**

1. **Idle Previews**: Find previews with `lastAccessedAt > 48 hours` → destroy
2. **Closed PRs**: Find previews with status `destroyed` → cleanup
3. **Enforce Limits**: If count > MAX_PREVIEWS → destroy oldest
4. **Orphan Containers**: Find containers without DB entries → remove
5. **Docker Cleanup**: Prune images, containers, volumes

## Data Models

### Preview Document

```typescript
{
  prNumber: number;
  repoName: string;
  repoOwner: string;
  branch: string;
  commitSha: string;
  status: PreviewStatus;
  services: Array<{
    name: string;
    containerId: string;
    imageTag: string;
    port: number;
    url: string;
    status: ServiceStatus;
  }>;
  database?: {
    type: DatabaseType;
    name: string;
    connectionString: string;
  };
  urls: Map<string, string>;
  env: Map<string, string>;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
}
```

### Log Document

```typescript
{
  previewId: ObjectId;
  prNumber: number;
  type: LogType;
  message: string;
  metadata?: object;
  createdAt: Date;
}
```

## Network Architecture

### Docker Networks

- **traefik-proxy**: External network for all preview containers
- **previewcloud**: Internal network for platform services

### Isolation

Each preview is isolated through:

1. Separate containers
2. Separate databases
3. Separate URLs
4. Container labels for tracking

## Security

### Authentication

- **API**: JWT token-based
- **GitHub Webhooks**: HMAC-SHA256 signature verification
- **Preview URLs**: Optional basic auth

### Isolation

- Network isolation via Docker networks
- Database isolation via separate schemas
- Container isolation via Docker

### Secrets

- Encrypted storage of database credentials
- Environment variable injection
- Never logged or exposed

## Scalability

### Current Limitations

- Single server deployment
- 10-20 previews recommended
- Shared database servers

### Future Improvements

- Multi-server support
- Kubernetes orchestration
- Distributed database provisioning
- Load balancing
- Caching layer

## Performance

### Optimization Strategies

1. **Build Caching**: Docker layer caching
2. **Parallel Builds**: Build services concurrently
3. **Connection Pooling**: Database connection pools
4. **Log Rotation**: TTL-based log cleanup
5. **Resource Limits**: Container CPU/memory limits

### Monitoring

- Health checks for all services
- Docker stats monitoring
- Log aggregation
- Metrics collection (future)

## Disaster Recovery

### Backup Strategy

1. **MongoDB**: Regular dumps
2. **Preview DBs**: Backed up separately
3. **Configuration**: Version controlled
4. **Logs**: Archived to object storage

### Recovery Procedures

1. Stop PreviewCloud services
2. Restore MongoDB from backup
3. Restore preview databases
4. Restart services
5. Verify preview states

## Deployment

See [Deployment Guide](deployment.md) for detailed instructions.

### Infrastructure Requirements

- **CPU**: 2-4 cores
- **RAM**: 4-8 GB
- **Disk**: 40+ GB SSD
- **Network**: Public IP with open ports 80, 443

### Dependencies

- Docker Engine
- Docker Compose
- Node.js 20
- Traefik
- MongoDB
- PostgreSQL, MySQL (optional)
