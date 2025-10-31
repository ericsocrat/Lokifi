# Docker Logs

**Purpose**: Docker container logs, docker-compose execution logs, and container lifecycle events.

## Common Files

- `compose-*.log` - Docker Compose command outputs
- `backend-service.log` - Backend container logs
- `frontend-service.log` - Frontend container logs
- `postgres-service.log` - PostgreSQL container logs
- `redis-service.log` - Redis container logs
- `traefik-service.log` - Traefik container logs

## Usage

### Capture All Service Logs
```bash
# Production stack
docker-compose -f infra/docker/docker-compose.production.yml logs > infra/logs/docker/compose-all-$(date +%Y%m%d).log

# Development stack
docker-compose -f infra/docker/docker-compose.yml logs > infra/logs/docker/compose-dev-$(date +%Y%m%d).log
```

### Capture Specific Service Logs
```bash
# Backend service
docker-compose -f infra/docker/docker-compose.production.yml logs backend > infra/logs/docker/backend-service.log

# Frontend service
docker-compose -f infra/docker/docker-compose.production.yml logs frontend > infra/logs/docker/frontend-service.log

# Database service
docker-compose -f infra/docker/docker-compose.production.yml logs postgres > infra/logs/docker/postgres-service.log
```

### Real-time Log Following
```bash
# Follow all services
docker-compose -f infra/docker/docker-compose.production.yml logs -f --tail=100

# Follow specific service
docker-compose -f infra/docker/docker-compose.production.yml logs -f backend --tail=50
```

### Container Stats & Health
```bash
# Container resource usage
docker stats --no-stream > infra/logs/docker/stats-$(date +%Y%m%d-%H%M).log

# Container health status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" > infra/logs/docker/health-$(date +%Y%m%d).log
```

## Docker Logging Configuration

In docker-compose files, configure logging:

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"      # Max log file size
        max-file: "3"        # Keep last 3 log files
        compress: "true"     # Compress rotated logs
```

## Debugging Container Issues

### Container Won't Start
```bash
# Check container logs
docker-compose logs backend

# Inspect container
docker inspect <container_id>

# Check container exit code
docker ps -a | grep backend
```

### Container Keeps Restarting
```bash
# View restart events
docker events --filter 'event=restart' > infra/logs/docker/restart-events.log

# Check last 100 lines before crash
docker-compose logs --tail=100 backend
```

### Performance Issues
```bash
# Real-time resource monitoring
docker stats

# Historical resource usage
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" > infra/logs/docker/performance-$(date +%Y%m%d).log
```

## Log Analysis Patterns

**Search for errors**:
```bash
docker-compose logs | grep -i error > infra/logs/docker/errors-$(date +%Y%m%d).log
```

**Search for specific requests**:
```bash
docker-compose logs backend | grep "POST /api" > infra/logs/docker/post-requests.log
```

**Count log events**:
```bash
docker-compose logs backend | grep "ERROR" | wc -l
```

## Best Practices

1. **Log rotation**: Docker automatically rotates logs based on max-size/max-file
2. **Log levels**: Set appropriate log levels (INFO for prod, DEBUG for dev)
3. **Structured logging**: Use JSON logging for easier parsing
4. **Centralization**: Send logs to centralized logging service (ELK, Grafana Loki)
5. **Monitoring**: Set up alerts for container restarts and errors

## Troubleshooting

| Issue | Command | Log Location |
|-------|---------|--------------|
| Container won't start | `docker-compose logs backend` | `docker/backend-service.log` |
| High memory usage | `docker stats` | `docker/stats-*.log` |
| Network issues | `docker network inspect lokifi_default` | `docker/network-debug.log` |
| Volume permissions | `docker-compose logs postgres` | `docker/postgres-service.log` |
| Build failures | `docker-compose build --no-cache` | `docker/build-*.log` |
