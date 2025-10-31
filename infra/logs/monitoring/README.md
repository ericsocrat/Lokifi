# Infrastructure Monitoring Logs

**Purpose**: Infrastructure monitoring logs, health checks, system resource monitoring, and performance metrics.

## Common Files

- `test-runner.log` - Automated test runner logs (moved from infra/logs root)
- `docker-stats-*.log` - Docker container resource usage
- `system-resources-*.log` - CPU, memory, disk usage
- `health-check-*.log` - Periodic health check results
- `uptime-*.log` - Service uptime tracking
- `performance-baseline-*.log` - Performance baselines

## Usage Examples

### Docker Container Monitoring
```bash
# Real-time container stats
docker stats --no-stream > infra/logs/monitoring/docker-stats-$(date +%Y%m%d-%H%M).log

# Continuous monitoring (every 5 minutes)
watch -n 300 "docker stats --no-stream >> infra/logs/monitoring/docker-stats-continuous.log"

# Memory usage per container
docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}" > infra/logs/monitoring/memory-usage-$(date +%Y%m%d).log
```

### System Resource Monitoring
```bash
# CPU and memory
top -b -n 1 > infra/logs/monitoring/system-resources-$(date +%Y%m%d-%H%M).log

# Disk usage
df -h > infra/logs/monitoring/disk-usage-$(date +%Y%m%d).log

# Network statistics
netstat -s > infra/logs/monitoring/network-stats-$(date +%Y%m%d).log
```

### Health Check Monitoring
```bash
# Periodic health checks (every 5 minutes)
*/5 * * * * /path/to/health-check.sh >> /path/to/infra/logs/monitoring/health-check-continuous.log 2>&1

# Health check with timestamp
echo "[$(date)] Health check started" >> infra/logs/monitoring/health-check-$(date +%Y%m%d).log
curl -f https://www.lokifi.com/api/health >> infra/logs/monitoring/health-check-$(date +%Y%m%d).log
curl -f https://api.www.lokifi.com/health >> infra/logs/monitoring/health-check-$(date +%Y%m%d).log
```

### Service Uptime Tracking
```bash
# Track service uptime
docker-compose -f infra/docker/docker-compose.production.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.State}}" > infra/logs/monitoring/uptime-$(date +%Y%m%d-%H%M).log

# Calculate uptime percentage
# (Total time - Downtime) / Total time * 100
```

### Performance Baselines
```bash
# API response time
curl -w "@curl-format.txt" -o /dev/null -s https://api.www.lokifi.com/health > infra/logs/monitoring/api-response-time-$(date +%Y%m%d).log

# Database query performance
docker-compose -f infra/docker/docker-compose.production.yml exec postgres pg_stat_statements > infra/logs/monitoring/db-query-performance-$(date +%Y%m%d).log
```

## Monitoring Dashboard

### Daily Monitoring Report Script
```bash
#!/bin/bash
# generate-monitoring-report.sh

REPORT_FILE="infra/logs/monitoring/daily-report-$(date +%Y%m%d).log"

echo "=== Daily Monitoring Report ===" > $REPORT_FILE
echo "Date: $(date)" >> $REPORT_FILE
echo >> $REPORT_FILE

echo "### System Resources ###" >> $REPORT_FILE
echo "Disk Usage:" >> $REPORT_FILE
df -h | grep -E "/$|/var|/home" >> $REPORT_FILE
echo "Memory Usage:" >> $REPORT_FILE
free -h >> $REPORT_FILE
echo >> $REPORT_FILE

echo "### Docker Containers ###" >> $REPORT_FILE
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" >> $REPORT_FILE
echo >> $REPORT_FILE

echo "### Health Check ###" >> $REPORT_FILE
curl -f https://www.lokifi.com/api/health && echo "Frontend: OK" >> $REPORT_FILE || echo "Frontend: FAIL" >> $REPORT_FILE
curl -f https://api.www.lokifi.com/health && echo "Backend: OK" >> $REPORT_FILE || echo "Backend: FAIL" >> $REPORT_FILE
echo >> $REPORT_FILE

echo "=== Report Complete ===" >> $REPORT_FILE
```

## Alerting Thresholds

Set up alerts for:

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU usage | >70% | >90% | Investigate, scale |
| Memory usage | >75% | >90% | Restart, scale |
| Disk usage | >80% | >90% | Clean logs, expand storage |
| Container restarts | >3/hour | >10/hour | Check container logs |
| API response time | >500ms | >2s | Check backend performance |
| Health check failures | >2 consecutive | >5 consecutive | Incident response |

## Grafana Integration (Optional)

For advanced monitoring, integrate with Grafana:

```yaml
# docker-compose.monitoring.yml
grafana:
  image: grafana/grafana:latest
  volumes:
    - ./infra/logs/monitoring:/var/lib/grafana
  ports:
    - "3001:3000"

prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    - ./infra/logs/monitoring/prometheus:/prometheus
```

## Log Analysis

### CPU Usage Trends
```bash
# Extract CPU usage from docker stats logs
grep -E "backend|frontend" infra/logs/monitoring/docker-stats-*.log | awk '{print $3}' | sort -rn | head -10
```

### Memory Leaks Detection
```bash
# Compare memory usage over time
grep "backend" infra/logs/monitoring/docker-stats-$(date +%Y%m%d -d "1 hour ago")*.log | awk '{print $4}'
grep "backend" infra/logs/monitoring/docker-stats-$(date +%Y%m%d)*.log | awk '{print $4}'
```

### Downtime Calculation
```bash
# Count failed health checks
grep "FAIL" infra/logs/monitoring/health-check-*.log | wc -l

# Calculate uptime percentage (assuming 5-minute checks)
# Uptime % = (Total checks - Failed checks) / Total checks * 100
```

## Best Practices

1. **Automated monitoring**: Set up cron jobs for periodic checks
2. **Baseline metrics**: Establish normal ranges for CPU, memory, disk
3. **Trend analysis**: Track metrics over time to detect gradual degradation
4. **Alerting**: Set up automated alerts for threshold violations
5. **Capacity planning**: Use historical data for scaling decisions
6. **Log rotation**: Rotate monitoring logs weekly to prevent disk space issues

## Current Files

- **test-runner.log** (0.18 KB) - Test automation logs (moved from infra/logs root)

## Related Documentation

- Docker monitoring: `/infra/docker/docker-compose.production.yml`
- Health check setup: `/docs/guides/monitoring.md`
- Performance optimization: `/docs/guides/performance.md`

---

**Last Updated**: October 31, 2025
**Monitoring Strategy**: Docker stats + periodic health checks + Grafana (optional)
