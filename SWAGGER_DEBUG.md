# Swagger UI 404 Debugging Guide

If you're getting a 404 when accessing `https://api.previewcloud.cloud/api/docs`, follow these steps:

## 1. Check if the container is running

```bash
sudo docker ps | grep previewcloud-api
```

If it's not running, check logs:

```bash
sudo docker logs previewcloud-api
```

## 2. Check if the route is accessible

Test the health endpoint first:

```bash
curl https://api.previewcloud.cloud/api/health
```

Test the Swagger test endpoint:

```bash
curl https://api.previewcloud.cloud/api/docs/test
```

If this works but `/api/docs` doesn't, it's a Swagger UI issue.

## 3. Check container logs for errors

```bash
sudo docker logs previewcloud-api --tail 100
```

Look for:

- "Swagger route is working" message
- Any errors about swagger-jsdoc
- Path resolution errors

## 4. Verify the build completed successfully

```bash
sudo docker exec previewcloud-api ls -la /app/dist/routes/
```

You should see `swagger.routes.js` file.

## 5. Check if Swagger spec is being generated

```bash
curl https://api.previewcloud.cloud/api/docs/json
```

This should return the OpenAPI JSON spec. If it returns 404, the route isn't registered.

## 6. Common Issues and Fixes

### Issue: Container not running

**Fix:**

```bash
cd /opt/previewcloud
sudo docker-compose -f infra/docker-compose.yml up -d previewcloud-api
```

### Issue: Build failed

**Fix:**

```bash
cd /opt/previewcloud
sudo docker-compose -f infra/docker-compose.yml build previewcloud-api
sudo docker-compose -f infra/docker-compose.yml up -d previewcloud-api
```

### Issue: Route not found (404)

**Possible causes:**

1. Route not registered in `index.ts`
2. Swagger UI static files not being served
3. Traefik routing issue

**Check:**

```bash
# Test inside container
sudo docker exec previewcloud-api curl http://localhost:3001/api/docs/test

# Check Traefik routing
sudo docker logs traefik --tail 50 | grep api
```

### Issue: Swagger spec is empty

**Fix:** The swagger-jsdoc might not be finding the files. Check:

```bash
sudo docker exec previewcloud-api ls -la /app/dist/routes/
sudo docker exec previewcloud-api ls -la /app/dist/controllers/
```

## 7. Rebuild and Restart

If nothing works, rebuild everything:

```bash
cd /opt/previewcloud

# Pull latest code
git pull

# Rebuild backend
cd backend
npm install
npm run build

# Rebuild and restart container
cd ../infra
sudo docker-compose -f docker-compose.yml build previewcloud-api
sudo docker-compose -f docker-compose.yml up -d previewcloud-api

# Check logs
sudo docker logs previewcloud-api --tail 50
```

## 8. Test the endpoints

After restarting, test:

```bash
# Health check
curl https://api.previewcloud.cloud/api/health

# Swagger test
curl https://api.previewcloud.cloud/api/docs/test

# Swagger JSON
curl https://api.previewcloud.cloud/api/docs/json

# Swagger UI (should open in browser)
curl -I https://api.previewcloud.cloud/api/docs
```

## Expected Results

- `/api/health` → Returns JSON with status
- `/api/docs/test` → Returns `{"success": true, ...}`
- `/api/docs/json` → Returns OpenAPI JSON spec
- `/api/docs` → Returns HTML page (Swagger UI)

If all these work, Swagger UI should be accessible at `https://api.previewcloud.cloud/api/docs`.
