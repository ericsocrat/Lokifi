# Infrastructure Logs Directory

**Purpose**: Organized storage for Docker, Traefik, deployment, and infrastructure monitoring logs.

## Directory Structure

```
logs/
├── README.md           # This file
├── docker/             # Docker container logs, compose logs
├── traefik/            # Traefik reverse proxy logs (access, error)
├── nginx/              # Nginx logs (if using nginx)
├── deployment/         # Deployment logs, rollback logs
├── monitoring/         # Infrastructure monitoring, health checks
└── security/           # Security events, firewall logs, SSL/TLS logs
```

## Usage Patterns

### Docker Logs
```bash
# Capture docker-compose logs
docker-compose -f docker-compose.production.yml logs > logs/docker/compose-$(date +%Y%m%d).log

# Specific service logs
docker-compose logs backend > logs/docker/backend-service.log
docker-compose logs frontend > logs/docker/frontend-service.log

# Follow logs in real-time
docker-compose logs -f --tail=100 > logs/docker/realtime-$(date +%Y%m%d-%H%M).log
```

### Traefik Logs
```bash
# Access logs (configured in docker-compose.production.yml)
# Auto-written to: logs/traefik/access.log

# Error logs
# Auto-written to: logs/traefik/error.log

# View Traefik dashboard logs
docker-compose logs traefik > logs/traefik/traefik-dashboard-$(date +%Y%m%d).log
```

### Deployment Logs
```bash
# Production deployment
./deploy.sh 2>&1 | tee logs/deployment/deploy-$(date +%Y%m%d-%H%M).log

# Rollback logs
./rollback.sh 2>&1 | tee logs/deployment/rollback-$(date +%Y%m%d-%H%M).log

# Health check verification
./health-check.sh > logs/deployment/health-check-$(date +%Y%m%d).log
```

### Monitoring Logs
```bash
# Docker stats
docker stats --no-stream > logs/monitoring/docker-stats-$(date +%Y%m%d).log

# System resource monitoring
top -b -n 1 > logs/monitoring/system-resources-$(date +%Y%m%d).log

# Database connection monitoring
# Auto-logged by monitoring services
```

### Security Logs
```bash
# SSL/TLS certificate renewals (Let's Encrypt)
# Auto-logged by Traefik/Certbot

# Firewall logs (if using UFW)
sudo ufw status verbose > logs/security/firewall-status-$(date +%Y%m%d).log

# Failed login attempts (SSH)
sudo grep "Failed password" /var/log/auth.log > logs/security/failed-logins-$(date +%Y%m%d).log
```

## File Naming Conventions

**Timestamp-based** (Daily/Hourly):
- `compose-yyyymmdd.log` - Daily docker-compose logs
- `deploy-yyyymmdd-HHMM.log` - Deployment with timestamp
- `access-yyyymmdd.log` - Daily Traefik access logs

**Service-based** (Continuous):
- `traefik/access.log` - Continuous Traefik access log
- `traefik/error.log` - Continuous Traefik error log
- `docker/backend-service.log` - Backend service logs

**Event-based** (Specific actions):
- `deployment/rollback-incident-123.log` - Incident-specific rollback
- `security/ssl-renewal-success.log` - SSL renewal events

## Traefik Configuration

In `docker-compose.production.yml`, Traefik logs are configured:

```yaml
traefik:
  command:
    - "--accesslog=true"
    - "--accesslog.filepath=/logs/access.log"
    - "--log.level=INFO"
    - "--log.filepath=/logs/error.log"
  volumes:
    - ./infra/logs/traefik:/logs
```

## Docker Compose Logging

Best practices for docker-compose logs:

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Retention Policy

**Keep**:
- Latest 7 days of access logs (weekly rotation)
- Latest 30 days of deployment logs
- All security events (audit trail)
- Latest 3 days of monitoring logs

**Archive**:
- Older deployment logs → `.archive/` subdirectory
- Compress old Traefik logs: `gzip logs/traefik/access-*.log`

**Delete**:
- Docker logs older than 7 days (handled by docker logging driver)
- Monitoring logs older than 7 days

## Production Monitoring

**Key logs to monitor in production**:
1. **Traefik access.log** - HTTP traffic patterns, response times
2. **Traefik error.log** - SSL issues, routing failures, backend errors
3. **Docker compose logs** - Container crashes, restart events
4. **Deployment logs** - Deployment success/failure patterns
5. **Security logs** - Failed auth attempts, unusual traffic

## Alerting

Set up alerts for:
- **High error rate** in Traefik error.log (>5% of requests)
- **Container restarts** in docker logs (unexpected restarts)
- **SSL certificate expiry** (< 30 days to expiration)
- **Disk space** (logs directory > 80% capacity)
- **Failed deployments** (deployment log contains "ERROR")

## Best Practices

1. **Log rotation**: Use `logrotate` for system-level log management
2. **Centralized logging**: Consider ELK stack or Grafana Loki for production
3. **Compression**: Compress old logs to save disk space
4. **Access control**: Restrict log access to authorized personnel
5. **Regular review**: Automated monitoring + weekly manual review
6. **Backup**: Include logs in backup strategy (critical for audit trails)

## Related Documentation

- Production deployment: `/docs/deployment/PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- Docker setup: `/infra/docker/LOCAL_DEVELOPMENT.md`
- Traefik config: `/infra/docker/docker-compose.production.yml`
- Monitoring setup: `/docs/guides/monitoring.md`

---

**Last Updated**: October 31, 2025 (Infrastructure logs organization)
**Related**: Frontend logs (`apps/frontend/logs/`), Backend logs (`apps/backend/logs/`)
