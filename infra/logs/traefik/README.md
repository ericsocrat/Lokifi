# Traefik Logs

**Purpose**: Traefik reverse proxy logs including access logs, error logs, and SSL/TLS events.

## Log Files

### Configured in docker-compose.production.yml

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

### Log File Types

- **access.log** - HTTP access logs (all requests)
  - Request method, path, status code
  - Response time, client IP
  - Backend service routing
  - User agent, referer

- **error.log** - Traefik errors and warnings
  - SSL/TLS certificate issues
  - Backend health check failures
  - Routing configuration errors
  - Let's Encrypt certificate renewals

## Access Log Format

Traefik access logs are in Common Log Format (CLF):

```
192.168.1.1 - - [31/Oct/2025:14:30:45 +0000] "GET /api/health HTTP/1.1" 200 45 "-" "Mozilla/5.0..."
```

Fields:
1. Client IP address
2. User identifier (usually -)
3. User name (usually -)
4. Timestamp
5. HTTP method and path
6. HTTP status code
7. Response size (bytes)
8. Referer
9. User agent

## Usage Examples

### View Recent Access Logs
```bash
# Last 100 requests
tail -100 infra/logs/traefik/access.log

# Follow access logs in real-time
tail -f infra/logs/traefik/access.log

# Filter by status code (e.g., 404 errors)
grep "\" 404 " infra/logs/traefik/access.log
```

### Analyze Traffic Patterns
```bash
# Count requests per status code
awk '{print $9}' infra/logs/traefik/access.log | sort | uniq -c | sort -rn

# Top 10 most requested paths
awk '{print $7}' infra/logs/traefik/access.log | sort | uniq -c | sort -rn | head -10

# Top 10 client IPs
awk '{print $1}' infra/logs/traefik/access.log | sort | uniq -c | sort -rn | head -10
```

### Error Log Analysis
```bash
# View all errors
cat infra/logs/traefik/error.log | grep "level=error"

# SSL/TLS certificate issues
grep -i "certificate\|ssl\|tls" infra/logs/traefik/error.log

# Backend health check failures
grep -i "health\|backend" infra/logs/traefik/error.log
```

### Performance Analysis
```bash
# Calculate average response time (if logged)
awk '{sum+=$10; count++} END {print "Avg response time:", sum/count, "ms"}' infra/logs/traefik/access.log

# Find slow requests (>1 second, if response time logged)
awk '$10 > 1000 {print}' infra/logs/traefik/access.log
```

## Log Rotation

Traefik logs can grow quickly. Implement log rotation:

### Using logrotate (Linux)
```bash
# /etc/logrotate.d/traefik
/path/to/lokifi/infra/logs/traefik/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    postrotate
        docker-compose -f /path/to/docker-compose.production.yml restart traefik
    endscript
}
```

### Manual Rotation
```bash
# Archive old logs
cd infra/logs/traefik
mv access.log access-$(date +%Y%m%d).log
mv error.log error-$(date +%Y%m%d).log

# Restart Traefik to create new log files
docker-compose -f infra/docker/docker-compose.production.yml restart traefik

# Compress old logs
gzip access-*.log error-*.log
```

## Monitoring & Alerts

### Set Up Alerts For

1. **High Error Rate**
   ```bash
   # Count 5xx errors in last hour
   tail -1000 access.log | grep "\" 5" | wc -l
   ```

2. **SSL Certificate Expiry**
   ```bash
   # Check error log for certificate warnings
   grep -i "certificate.*expir" error.log
   ```

3. **Backend Health Failures**
   ```bash
   # Check for repeated health check failures
   grep "backend.*health" error.log | tail -20
   ```

4. **Unusual Traffic Patterns**
   ```bash
   # Detect potential DDoS (>1000 requests from single IP in 5 minutes)
   tail -5000 access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -1
   ```

## Traefik Dashboard

Access Traefik dashboard for real-time monitoring:
- URL: `https://traefik.lokifi.com/dashboard/` (production)
- Basic auth configured in docker-compose.production.yml

## Common Issues

| Issue | Log Pattern | Solution |
|-------|-------------|----------|
| 502 Bad Gateway | `"502"` in access.log | Check backend service health |
| SSL errors | `ssl\|certificate` in error.log | Verify Let's Encrypt renewal |
| High latency | Response time >1s | Check backend performance |
| 404 errors | `"404"` in access.log | Verify routing configuration |
| Rate limiting | `429` in access.log | Adjust rate limit middleware |

## Best Practices

1. **Regular rotation**: Rotate logs daily to prevent disk space issues
2. **Monitoring**: Set up automated alerts for high error rates
3. **Analysis**: Weekly review of traffic patterns and errors
4. **Retention**: Keep 7 days of uncompressed logs, 30 days compressed
5. **Security**: Monitor for unusual traffic patterns (DDoS, scraping)
6. **Performance**: Track response times to identify backend bottlenecks

## Related Documentation

- Traefik configuration: `/infra/docker/docker-compose.production.yml`
- SSL setup: `/docs/deployment/dns.md`
- Production deployment: `/docs/deployment/PRODUCTION_DEPLOYMENT_CHECKLIST.md`
