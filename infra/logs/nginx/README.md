# Nginx Web Server Logs

**Purpose**: Nginx reverse proxy and web server logs (if nginx is used alongside or instead of Traefik).

**Note**: Lokifi currently uses **Traefik** as the primary reverse proxy (see `/infra/logs/traefik/`). This directory is provided for future nginx integration or if nginx is added for static asset serving, load balancing, or as a secondary proxy.

## Common Files

- `nginx-access-*.log` - HTTP access logs (requests, status codes, response times)
- `nginx-error-*.log` - Nginx errors, configuration issues, upstream failures
- `nginx-upstream-*.log` - Backend upstream server communication logs
- `nginx-cache-*.log` - Cache hit/miss statistics
- `nginx-ssl-*.log` - SSL/TLS handshake logs (if configured)

## Usage Examples

### Basic Nginx Logging
```bash
# View nginx access logs
docker logs nginx > infra/logs/nginx/nginx-access-$(date +%Y%m%d).log

# View nginx error logs
docker logs nginx --stderr > infra/logs/nginx/nginx-error-$(date +%Y%m%d).log

# Tail live access logs
docker logs -f nginx | tee infra/logs/nginx/nginx-access-live.log
```

### Error Analysis
```bash
# Find 4xx errors (client errors)
grep "HTTP/4" infra/logs/nginx/nginx-access-*.log | wc -l

# Find 5xx errors (server errors)
grep "HTTP/5" infra/logs/nginx/nginx-access-*.log

# Most common errors
grep " 500 " infra/logs/nginx/nginx-access-*.log | awk '{print $7}' | sort | uniq -c | sort -rn | head -10
```

### Performance Analysis
```bash
# Response time analysis (if configured)
awk '{print $NF}' infra/logs/nginx/nginx-access-*.log | sort -n | tail -10

# Requests per minute
grep "$(date +%d/%b/%Y:%H:%M)" infra/logs/nginx/nginx-access-*.log | wc -l

# Top requested URLs
awk '{print $7}' infra/logs/nginx/nginx-access-*.log | sort | uniq -c | sort -rn | head -20
```

### Traffic Analysis
```bash
# Unique visitors (by IP)
awk '{print $1}' infra/logs/nginx/nginx-access-*.log | sort -u | wc -l

# Top visitor IPs
awk '{print $1}' infra/logs/nginx/nginx-access-*.log | sort | uniq -c | sort -rn | head -20

# Requests by HTTP method
awk '{print $6}' infra/logs/nginx/nginx-access-*.log | sort | uniq -c
```

## Nginx Configuration for Logging

### Docker Compose Integration
```yaml
# docker-compose.nginx.yml (example)
nginx:
  image: nginx:alpine
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - ./infra/logs/nginx:/var/log/nginx
  ports:
    - "80:80"
    - "443:443"
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

### Custom Access Log Format
```nginx
# nginx.conf
http {
    log_format detailed '$remote_addr - $remote_user [$time_local] '
                       '"$request" $status $body_bytes_sent '
                       '"$http_referer" "$http_user_agent" '
                       'rt=$request_time uct="$upstream_connect_time" '
                       'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log detailed;
    error_log /var/log/nginx/error.log warn;
}
```

## Log Rotation

### Logrotate Configuration
```bash
# /etc/logrotate.d/nginx
/path/to/infra/logs/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

### Manual Log Rotation
```bash
# Signal nginx to reopen log files after rotation
docker exec nginx nginx -s reopen

# Or via docker-compose
docker-compose -f docker-compose.nginx.yml exec nginx nginx -s reopen
```

## Monitoring & Alerting

### GoAccess Real-Time Analysis
```bash
# Install GoAccess for real-time web log analysis
docker run --rm -v $(pwd)/infra/logs/nginx:/var/log/nginx -v $(pwd)/public:/var/www/html allinurl/goaccess goaccess /var/log/nginx/access.log -o /var/www/html/report.html --log-format=COMBINED

# View report at https://www.lokifi.com/report.html
```

### Alert on High Error Rates
```bash
# Cron job to alert on excessive 5xx errors
#!/bin/bash
ERROR_COUNT=$(grep " 500 " infra/logs/nginx/nginx-access-$(date +%Y%m%d).log | wc -l)
if [ $ERROR_COUNT -gt 50 ]; then
    echo "High 5xx error count: $ERROR_COUNT" | mail -s "Nginx Error Alert" admin@lokifi.com
fi
```

## Nginx vs Traefik

| Feature | Nginx | Traefik |
|---------|-------|---------|
| **Current Usage** | Not used | ✅ Primary proxy |
| **Configuration** | Config files | Docker labels |
| **Auto SSL** | Manual (certbot) | ✅ Automatic |
| **Static Files** | ✅ Excellent | Basic |
| **Load Balancing** | ✅ Advanced | Basic |
| **Docker Integration** | Manual | ✅ Native |
| **Use Case** | Static assets, complex routing | ✅ Microservices, auto-discovery |

**When to use Nginx**:
- Serving large volumes of static assets
- Advanced caching strategies
- Complex rewrite rules
- Load balancing across multiple backend servers
- Rate limiting and request throttling

**Current Recommendation**: Continue using Traefik for simplicity and Docker integration. Consider adding nginx if static asset performance becomes a bottleneck.

## Integration with Traefik

If using nginx alongside Traefik:

```yaml
# docker-compose.production.yml
nginx:
  image: nginx:alpine
  volumes:
    - ./apps/frontend/.next/static:/usr/share/nginx/html/static:ro
    - ./infra/logs/nginx:/var/log/nginx
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.nginx-static.rule=Host(`www.lokifi.com`) && PathPrefix(`/_next/static`)"
    - "traefik.http.services.nginx-static.loadbalancer.server.port=80"
```

**Pattern**: Traefik routes static asset requests to nginx, dynamic requests to Next.js/FastAPI.

## Best Practices

1. **Log format**: Use detailed log format with response times for performance analysis
2. **Log rotation**: Rotate logs daily, keep 14 days for analysis
3. **Compression**: Compress rotated logs to save disk space
4. **Monitoring**: Set up alerts for high error rates (>1% of requests)
5. **Performance**: Monitor response times, set thresholds for slow requests (>1s)
6. **Security**: Log suspicious patterns (high 4xx rates, scanning attempts)
7. **Privacy**: Consider anonymizing IP addresses for GDPR compliance

## Current Status

**Nginx Status**: Not currently deployed in Lokifi infrastructure
**Primary Proxy**: Traefik (see `/infra/logs/traefik/README.md`)
**Future Consideration**: May add nginx for static asset optimization in high-traffic scenarios

## Related Documentation

- Traefik logs: `/infra/logs/traefik/README.md`
- Traefik configuration: `/infra/docker/docker-compose.production.yml`
- Static asset optimization: `/docs/guides/performance.md`
- Reverse proxy comparison: `/docs/deployment/reverse-proxy.md`

---

**Last Updated**: October 31, 2025
**Current Proxy**: Traefik (nginx not yet deployed)
**Placeholder**: Directory prepared for future nginx integration
