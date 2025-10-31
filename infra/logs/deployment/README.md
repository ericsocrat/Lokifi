# Deployment Logs

**Purpose**: Production deployment logs, rollback logs, health checks, and deployment automation.

## Common Files

- `deploy-*.log` - Deployment execution logs
- `rollback-*.log` - Rollback execution logs
- `health-check-*.log` - Post-deployment health verification
- `migration-*.log` - Database migration logs
- `backup-*.log` - Pre-deployment backup logs

## Deployment Workflow Logs

### Pre-Deployment
```bash
# Backup current production state
./backup-production.sh 2>&1 | tee infra/logs/deployment/backup-$(date +%Y%m%d-%H%M).log

# Database migration dry-run
alembic upgrade head --sql > infra/logs/deployment/migration-dryrun-$(date +%Y%m%d).log
```

### During Deployment
```bash
# Full deployment log
./deploy.sh 2>&1 | tee infra/logs/deployment/deploy-$(date +%Y%m%d-%H%M).log

# Docker image builds
docker-compose -f infra/docker/docker-compose.production.yml build 2>&1 | tee infra/logs/deployment/build-$(date +%Y%m%d).log

# Service updates
docker-compose -f infra/docker/docker-compose.production.yml up -d 2>&1 | tee infra/logs/deployment/update-$(date +%Y%m%d).log
```

### Post-Deployment
```bash
# Health check verification
./health-check.sh > infra/logs/deployment/health-check-$(date +%Y%m%d-%H%M).log

# Smoke tests
npm run test:smoke > infra/logs/deployment/smoke-tests-$(date +%Y%m%d).log

# Performance baseline
curl -w "@curl-format.txt" https://www.lokifi.com > infra/logs/deployment/performance-$(date +%Y%m%d).log
```

## Rollback Logs

### When to Rollback
- Critical bugs in production
- Failed health checks after deployment
- Database migration failures
- Performance degradation

### Rollback Execution
```bash
# Execute rollback
./rollback.sh 2>&1 | tee infra/logs/deployment/rollback-$(date +%Y%m%d-%H%M).log

# Verify rollback success
./health-check.sh > infra/logs/deployment/health-check-post-rollback-$(date +%Y%m%d).log

# Document rollback reason
echo "Reason: [describe issue]" >> infra/logs/deployment/rollback-$(date +%Y%m%d-%H%M).log
```

## Health Check Logs

### Health Check Script Output
```bash
#!/bin/bash
# health-check.sh

echo "=== Lokifi Health Check ==="
echo "Timestamp: $(date)"
echo

# Frontend
echo "Frontend (https://www.lokifi.com):"
curl -f -s -o /dev/null -w "%{http_code}" https://www.lokifi.com
echo

# Backend API
echo "Backend API (https://api.www.lokifi.com/health):"
curl -f -s https://api.www.lokifi.com/health | jq .
echo

# Database connectivity
echo "Database:"
docker-compose -f infra/docker/docker-compose.production.yml exec -T postgres pg_isready
echo

# Redis connectivity
echo "Redis:"
docker-compose -f infra/docker/docker-compose.production.yml exec -T redis redis-cli ping
echo

echo "=== Health Check Complete ==="
```

## Migration Logs

### Database Migration Tracking
```bash
# Alembic migration
alembic upgrade head 2>&1 | tee infra/logs/deployment/migration-$(date +%Y%m%d-%H%M).log

# Migration rollback (if needed)
alembic downgrade -1 2>&1 | tee infra/logs/deployment/migration-rollback-$(date +%Y%m%d-%H%M).log

# Check current migration status
alembic current > infra/logs/deployment/migration-status-$(date +%Y%m%d).log
```

## Deployment Checklist

Track deployment steps in log:

```bash
# Pre-Deployment Checklist
echo "=== Pre-Deployment Checklist ===" | tee -a infra/logs/deployment/deploy-$(date +%Y%m%d-%H%M).log
echo "[✓] Code review completed" | tee -a infra/logs/deployment/deploy-$(date +%Y%m%d-%H%M).log
echo "[✓] Tests passing" | tee -a infra/logs/deployment/deploy-$(date +%Y%m%d-%H%M).log
echo "[✓] Backup created" | tee -a infra/logs/deployment/deploy-$(date +%Y%m%d-%H%M).log
echo "[✓] Migration tested" | tee -a infra/logs/deployment/deploy-$(date +%Y%m%d-%H%M).log
echo "[✓] Rollback plan ready" | tee -a infra/logs/deployment/deploy-$(date +%Y%m%d-%H%M).log
```

## Deployment Metrics

Track key metrics in logs:

```bash
# Deployment duration
START_TIME=$(date +%s)
# ... deployment steps ...
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "Deployment duration: ${DURATION}s" >> infra/logs/deployment/deploy-$(date +%Y%m%d-%H%M).log

# Downtime duration (if any)
echo "Downtime: 0s (zero-downtime deployment)" >> infra/logs/deployment/deploy-$(date +%Y%m%d-%H%M).log
```

## Deployment Analysis

### Successful Deployments
```bash
# Count successful deployments
grep -l "Deployment complete" infra/logs/deployment/deploy-*.log | wc -l

# Average deployment time
grep "Deployment duration" infra/logs/deployment/deploy-*.log | awk '{sum+=$3} END {print "Avg:", sum/NR, "seconds"}'
```

### Failed Deployments
```bash
# Find failed deployments
grep -l "ERROR\|FAIL" infra/logs/deployment/deploy-*.log

# Common failure reasons
grep "ERROR:" infra/logs/deployment/deploy-*.log | sort | uniq -c | sort -rn
```

### Rollback Frequency
```bash
# Count rollbacks
ls infra/logs/deployment/rollback-*.log | wc -l

# Rollback reasons
grep "Reason:" infra/logs/deployment/rollback-*.log
```

## Best Practices

1. **Always log**: Every deployment step should be logged
2. **Timestamp everything**: Use `date +%Y%m%d-%H%M%S` in filenames
3. **Backup before deploy**: Keep 7 days of backups
4. **Health checks**: Verify system health after every deployment
5. **Rollback plan**: Have rollback logs ready for quick recovery
6. **Post-mortem**: Document failures in deployment logs
7. **Metrics tracking**: Track deployment duration, downtime, success rate

## Alerting

Set up alerts for:
- Deployment failures (exit code != 0)
- Failed health checks post-deployment
- Deployment duration > 10 minutes
- Multiple rollbacks in short period
- Database migration failures

## Related Documentation

- Deployment guide: `/docs/deployment/PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- Rollback procedures: `/docs/deployment/ROLLBACK_GUIDE.md` (if exists)
- Health check setup: `/docs/guides/monitoring.md`
- Docker deployment: `/infra/docker/docker-compose.production.yml`

---

**Last Updated**: October 31, 2025
**Deployment Strategy**: Zero-downtime with Docker Compose + Traefik
