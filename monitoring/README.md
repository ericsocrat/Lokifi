# Monitoring Setup (Optional)

This directory contains optional monitoring configurations for production deployments.

## Available Monitoring Options

### 1. Docker Health Checks (Built-in)

All services include health checks that automatically restart unhealthy containers:

```bash
docker compose up -d
docker compose ps  # Check health status
```

### 2. Grafana + Prometheus Stack

For comprehensive monitoring and alerting:

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

Access:
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Uptime Kuma**: http://localhost:3002

### 3. Simple Uptime Monitoring

For basic HTTP uptime monitoring, Uptime Kuma provides a web interface to monitor:
- Backend health: http://backend:8000/api/health
- Frontend health: http://frontend:3000/api/health

### 4. External Monitoring

For production, consider:
- **UptimeRobot**: Simple SaaS uptime monitoring
- **Pingdom**: Advanced monitoring with global checks
- **DataDog**: Comprehensive application monitoring

Configure external monitors to check:
- `https://your-domain.com/api/health` (Frontend)
- `https://api.your-domain.com/api/health` (Backend)

## Health Check Endpoints

All services expose health endpoints that return `{"ok": true}`:

- **Backend**: `/api/health` and `/health`
- **Frontend**: `/api/health`
- **Redis**: Built-in ping command

These endpoints are used by:
- Docker Compose health checks
- External monitoring services
- Load balancer health checks