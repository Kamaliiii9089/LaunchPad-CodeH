# Health Check Endpoints

## Overview

The application provides multiple health check endpoints for monitoring, container orchestration, and load balancer health probes.

## Endpoints

### 1. Basic Health Check
**GET** `/health`

General health status with database connectivity, memory usage, and rate limiting status.

**Response (200 OK):**
```json
{
  "status": "OK",
  "timestamp": "2026-01-14T10:30:00.000Z",
  "uptime": 3600.5,
  "environment": "production",
  "service": "Gmail Subscription Manager API",
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "connected": true
  },
  "memory": {
    "rss": "50MB",
    "heapUsed": "30MB",
    "heapTotal": "45MB"
  },
  "rateLimiting": {
    "enabled": true,
    "config": {
      "authStrict": "5 req/15min",
      "authModerate": "50 req/15min",
      "apiGeneral": "100 req/15min"
    }
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "DEGRADED",
  "timestamp": "2026-01-14T10:30:00.000Z",
  "database": {
    "status": "disconnected",
    "connected": false
  }
}
```

### 2. Detailed Health Check
**GET** `/health/detailed`

Comprehensive health information including system metrics, database details, and security configuration.

**Response (200 OK):**
```json
{
  "status": "OK",
  "timestamp": "2026-01-14T10:30:00.000Z",
  "uptime": {
    "seconds": 3600,
    "formatted": "01:00:00"
  },
  "system": {
    "platform": "linux",
    "nodeVersion": "v22.16.0",
    "pid": 12345,
    "cpuUsage": {
      "user": 123456,
      "system": 78910
    }
  },
  "database": {
    "status": "connected",
    "host": "localhost",
    "name": "gmail-subscription-manager",
    "models": 5
  },
  "memory": {
    "rss": "50MB",
    "heapUsed": "30MB",
    "heapTotal": "45MB",
    "external": "2MB"
  },
  "security": {
    "helmet": "enabled",
    "cors": "enabled",
    "rateLimiting": true,
    "trustProxy": true
  },
  "environment": {
    "nodeEnv": "production",
    "port": "5000",
    "frontendUrl": "https://example.com"
  }
}
```

### 3. Liveness Probe
**GET** `/health/live`

Simple liveness check for container orchestration (Kubernetes, Docker Swarm).

**Response (200 OK):**
```json
{
  "status": "alive",
  "timestamp": "2026-01-14T10:30:00.000Z"
}
```

**Use Case:** Kubernetes liveness probe to determine if the container should be restarted.

**Kubernetes Configuration:**
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 5000
  initialDelaySeconds: 30
  periodSeconds: 10
```

### 4. Readiness Probe
**GET** `/health/ready`

Readiness check that verifies the application is ready to accept traffic.

**Response (200 OK):**
```json
{
  "status": "ready",
  "timestamp": "2026-01-14T10:30:00.000Z",
  "database": "connected"
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "not ready",
  "timestamp": "2026-01-14T10:30:00.000Z",
  "database": "disconnected"
}
```

**Use Case:** Kubernetes readiness probe to determine if the pod should receive traffic.

**Kubernetes Configuration:**
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 5000
  initialDelaySeconds: 10
  periodSeconds: 5
```

### 5. API Status (Legacy)
**GET** `/api/status`

Simple status endpoint for backward compatibility.

**Response (200 OK):**
```json
{
  "message": "Gmail Subscription Manager API is running",
  "version": "1.0.0",
  "status": "healthy",
  "timestamp": "2026-01-14T10:30:00.000Z",
  "database": "connected"
}
```

## Usage Examples

### cURL
```bash
# Basic health check
curl http://localhost:5000/health

# Detailed health check
curl http://localhost:5000/health/detailed

# Liveness probe
curl http://localhost:5000/health/live

# Readiness probe
curl http://localhost:5000/health/ready
```

### Load Balancer Configuration

**AWS ALB/NLB:**
```
Health Check Path: /health
Health Check Interval: 30 seconds
Healthy Threshold: 2
Unhealthy Threshold: 3
Timeout: 5 seconds
```

**Nginx:**
```nginx
upstream backend {
    server backend1:5000 max_fails=3 fail_timeout=30s;
    server backend2:5000 max_fails=3 fail_timeout=30s;
}

location /health {
    proxy_pass http://backend;
    proxy_connect_timeout 5s;
    proxy_read_timeout 5s;
}
```

### Monitoring Integration

**Prometheus:**
```yaml
- job_name: 'api-health'
  metrics_path: '/health'
  scrape_interval: 30s
  static_configs:
    - targets: ['localhost:5000']
```

**Datadog:**
```yaml
init_config:

instances:
  - url: http://localhost:5000/health
    name: api_health_check
    timeout: 5
```

## Docker Compose

```yaml
services:
  backend:
    image: gmail-subscription-backend:latest
    ports:
      - "5000:5000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-backend
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: gmail-subscription-backend:latest
        ports:
        - containerPort: 5000
        livenessProbe:
          httpGet:
            path: /health/live
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
```

## Monitoring Best Practices

1. **Use `/health` for basic monitoring** - Regular health checks every 30-60 seconds
2. **Use `/health/detailed` for troubleshooting** - Access when investigating issues
3. **Use `/health/live` for liveness probes** - Kubernetes container restart decisions
4. **Use `/health/ready` for readiness probes** - Traffic routing decisions
5. **Set appropriate timeouts** - 3-5 seconds is usually sufficient
6. **Configure retries** - 2-3 failed checks before marking unhealthy

## Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Service is healthy and operational |
| 503 | Service Unavailable | Service is degraded or unhealthy (e.g., database disconnected) |

## Troubleshooting

### Database Connection Issues

If `/health` returns 503 with database disconnected:

1. Check MongoDB connection string in `.env`
2. Verify MongoDB is running: `systemctl status mongod`
3. Check network connectivity to database
4. Review application logs for connection errors

### Memory Issues

If memory usage is high (>1GB):

1. Check for memory leaks
2. Review rate limiter cache size
3. Monitor concurrent connections
4. Consider restarting the application

### Rate Limiting Not Enabled

If `rateLimiting.enabled: false` in production:

1. Check `SKIP_RATE_LIMIT_DEV` environment variable
2. Should be set to `false` in production
3. Restart application after changing configuration

## Testing

```bash
# Test all health endpoints
cd backend
node test-health-endpoints.js

# Or manually test each endpoint
curl -i http://localhost:5000/health
curl -i http://localhost:5000/health/detailed
curl -i http://localhost:5000/health/live
curl -i http://localhost:5000/health/ready
curl -i http://localhost:5000/api/status
```

## Security Considerations

- Health check endpoints are **not rate-limited** to allow frequent monitoring
- **No authentication required** - health checks need to be accessible by monitoring systems
- **Limited information exposure** - Detailed health info should be restricted in production
- Consider using **internal-only endpoints** for `/health/detailed` in production

---

**Last Updated:** January 14, 2026  
**Version:** 1.0.0
