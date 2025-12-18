# How to View Backend Logs on Server

## Quick Commands

### 1. View Container Logs (Real-time)

```bash
# View all logs
sudo docker logs previewcloud-api

# Follow logs (like tail -f)
sudo docker logs -f previewcloud-api

# View last 100 lines
sudo docker logs --tail 100 previewcloud-api

# View logs with timestamps
sudo docker logs -t previewcloud-api
```

### 2. View Recent Logs (Last 50 lines)

```bash
sudo docker logs --tail 50 previewcloud-api
```

### 3. View Logs for Specific Time Period

```bash
# View logs since 10 minutes ago
sudo docker logs --since 10m previewcloud-api

# View logs since 1 hour ago
sudo docker logs --since 1h previewcloud-api

# View logs between timestamps
sudo docker logs --since "2024-01-15T10:00:00" --until "2024-01-15T11:00:00" previewcloud-api
```

### 4. Filter Logs by Error

```bash
# View only error logs
sudo docker logs previewcloud-api 2>&1 | grep -i error

# View logs containing "preview"
sudo docker logs previewcloud-api 2>&1 | grep -i preview

# View logs containing "500" or "error"
sudo docker logs previewcloud-api 2>&1 | grep -E "(500|error|Error)"
```

### 5. View Log Files (If Using File Logging)

If logs are written to files:

```bash
# Check log file location
sudo docker exec previewcloud-api ls -la /app/logs

# View log file
sudo docker exec previewcloud-api cat /app/logs/app.log

# Tail log file
sudo docker exec previewcloud-api tail -f /app/logs/app.log
```

### 6. View All Container Logs

```bash
# View logs from all containers
cd /opt/previewcloud/infra
sudo docker-compose logs

# View logs from specific service
sudo docker-compose logs previewcloud-api

# Follow logs from all services
sudo docker-compose logs -f
```

## Debugging 500 Errors

### Step 1: Check Recent Errors

```bash
sudo docker logs --tail 100 previewcloud-api | grep -A 10 -i error
```

### Step 2: Check Full Stack Trace

```bash
sudo docker logs --tail 200 previewcloud-api | grep -A 20 "Failed to create/update preview"
```

### Step 3: Check Database Connection

```bash
sudo docker logs previewcloud-api | grep -i "database\|mongodb\|connection"
```

### Step 4: Check Docker Service

```bash
sudo docker logs previewcloud-api | grep -i "docker\|container"
```

## Common Issues and Log Patterns

### Authentication Error

```bash
sudo docker logs previewcloud-api | grep -i "authentication\|invalid.*token\|401"
```

### Validation Error

```bash
sudo docker logs previewcloud-api | grep -i "missing\|required\|validation\|400"
```

### Database Error

```bash
sudo docker logs previewcloud-api | grep -i "database\|mongodb\|connection.*failed"
```

### Docker Error

```bash
sudo docker logs previewcloud-api | grep -i "docker\|container.*failed\|cannot.*connect"
```

## Real-time Monitoring

### Watch Logs in Real-time

```bash
# Terminal 1: Watch backend logs
sudo docker logs -f previewcloud-api

# Terminal 2: Trigger the action and watch logs appear
```

### Monitor Multiple Services

```bash
cd /opt/previewcloud/infra
sudo docker-compose logs -f previewcloud-api mongodb-platform
```

## Export Logs to File

```bash
# Export last 1000 lines to file
sudo docker logs --tail 1000 previewcloud-api > backend-logs.txt

# Export with timestamps
sudo docker logs -t --tail 1000 previewcloud-api > backend-logs-timestamped.txt
```

## Check Container Status

```bash
# Check if container is running
sudo docker ps | grep previewcloud-api

# Check container health
sudo docker inspect previewcloud-api | grep -A 10 Health
```

## Restart and View Logs

```bash
# Restart container and immediately view logs
sudo docker restart previewcloud-api
sudo docker logs -f previewcloud-api
```
