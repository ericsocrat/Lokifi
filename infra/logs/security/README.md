# Infrastructure Security Logs

**Purpose**: Infrastructure security event logs, SSL/TLS management, firewall logs, intrusion detection, and security audit trails.

> **Note**: This directory is for **log files** generated at runtime. For security **configuration and tools**, see [`infra/security/`](../../security/README.md).

## Common Files

- `ssl-renewal-*.log` - Let's Encrypt SSL/TLS certificate renewal logs
- `certificate-validation-*.log` - SSL certificate validation checks
- `firewall-*.log` - UFW/iptables firewall logs
- `fail2ban-*.log` - fail2ban intrusion prevention logs
- `traefik-access-suspicious-*.log` - Suspicious access patterns from Traefik
- `security-scan-*.log` - Container vulnerability scans
- `audit-trail-*.log` - Security audit events

## Usage Examples

### SSL/TLS Certificate Management
```bash
# Let's Encrypt renewal logs
docker-compose -f infra/docker/docker-compose.production.yml logs traefik | grep "certificate" > infra/logs/security/ssl-renewal-$(date +%Y%m%d).log

# Certificate expiry check
echo "[$(date)] Checking certificate expiry" >> infra/logs/security/certificate-validation-$(date +%Y%m%d).log
echo | openssl s_client -servername www.lokifi.com -connect www.lokifi.com:443 2>/dev/null | openssl x509 -noout -dates >> infra/logs/security/certificate-validation-$(date +%Y%m%d).log
```

### Firewall Logs
```bash
# UFW firewall logs (if enabled)
sudo tail -n 100 /var/log/ufw.log > infra/logs/security/firewall-$(date +%Y%m%d).log

# iptables rules audit
sudo iptables -L -n -v > infra/logs/security/firewall-rules-$(date +%Y%m%d).log

# Recent blocked connections
sudo grep "BLOCK" /var/log/syslog | tail -n 50 > infra/logs/security/firewall-blocks-$(date +%Y%m%d).log
```

### Intrusion Detection (fail2ban)
```bash
# fail2ban status
sudo fail2ban-client status > infra/logs/security/fail2ban-status-$(date +%Y%m%d).log

# Banned IPs
sudo fail2ban-client status sshd > infra/logs/security/fail2ban-banned-ips-$(date +%Y%m%d).log

# Recent jail actions
sudo grep "Ban" /var/log/fail2ban.log | tail -n 50 > infra/logs/security/fail2ban-recent-bans-$(date +%Y%m%d).log
```

### Suspicious Access Patterns
```bash
# Extract suspicious access from Traefik logs
docker-compose -f infra/docker/docker-compose.production.yml logs traefik | grep -E "401|403|404|500" | tail -n 100 > infra/logs/security/traefik-access-suspicious-$(date +%Y%m%d).log

# Failed authentication attempts
docker-compose -f infra/docker/docker-compose.production.yml logs backend | grep "authentication failed" > infra/logs/security/failed-auth-$(date +%Y%m%d).log

# Unusual request patterns (high frequency)
docker-compose -f infra/docker/docker-compose.production.yml logs traefik | awk '{print $1}' | sort | uniq -c | sort -rn | head -20 > infra/logs/security/request-frequency-$(date +%Y%m%d).log
```

### Container Security Scans
```bash
# Trivy vulnerability scan
trivy image lokifi-backend:latest > infra/logs/security/security-scan-backend-$(date +%Y%m%d).log
trivy image lokifi-frontend:latest > infra/logs/security/security-scan-frontend-$(date +%Y%m%d).log

# Docker Scout (if available)
docker scout cves lokifi-backend:latest > infra/logs/security/scout-scan-backend-$(date +%Y%m%d).log
```

### Security Audit Trail
```bash
# Generate security audit report
#!/bin/bash
AUDIT_FILE="infra/logs/security/audit-trail-$(date +%Y%m%d-%H%M).log"

echo "=== Security Audit Trail ===" > $AUDIT_FILE
echo "Timestamp: $(date)" >> $AUDIT_FILE
echo >> $AUDIT_FILE

echo "### SSL Certificate Status ###" >> $AUDIT_FILE
echo | openssl s_client -servername www.lokifi.com -connect www.lokifi.com:443 2>/dev/null | openssl x509 -noout -subject -dates >> $AUDIT_FILE
echo >> $AUDIT_FILE

echo "### Active Firewall Rules ###" >> $AUDIT_FILE
sudo iptables -L -n >> $AUDIT_FILE
echo >> $AUDIT_FILE

echo "### fail2ban Status ###" >> $AUDIT_FILE
sudo fail2ban-client status >> $AUDIT_FILE
echo >> $AUDIT_FILE

echo "### Recent Suspicious Access ###" >> $AUDIT_FILE
docker-compose -f infra/docker/docker-compose.production.yml logs --tail=50 traefik | grep -E "401|403|500" >> $AUDIT_FILE
echo >> $AUDIT_FILE

echo "=== Audit Complete ===" >> $AUDIT_FILE
```

## Best Practices

### Log Retention
- **SSL/Certificate Logs**: Keep for 90 days (compliance)
- **Firewall Logs**: Keep for 30 days (security analysis)
- **fail2ban Logs**: Keep for 60 days (incident investigation)
- **Security Scans**: Keep latest + monthly snapshots for 1 year
- **Audit Trails**: Keep for 1 year (compliance requirement)

### Monitoring & Alerting
Set up alerts for:
- SSL certificate expiring in <30 days
- Multiple failed authentication attempts (>5 in 1 minute)
- Unusual traffic patterns (>1000 requests/minute from single IP)
- Critical vulnerabilities in container scans
- Firewall rule changes

### Security Event Response
When suspicious activity detected:
1. **Isolate**: Block offending IPs immediately
2. **Document**: Log all details in audit trail
3. **Analyze**: Review logs for patterns
4. **Respond**: Update firewall rules, rotate credentials if needed
5. **Report**: Generate incident report

### Compliance
For SOC2, ISO27001, PCI-DSS compliance:
- Enable comprehensive logging for all security events
- Implement automated log rotation and archival
- Set up centralized log aggregation (Loki/ELK)
- Regular security audits with documented results
- Maintain audit trails for all administrative actions

## Integration with CI/CD

### GitHub Actions Security Scanning
```yaml
# .github/workflows/security-scan.yml
- name: Run Trivy vulnerability scanner
  run: |
    trivy image ${{ env.IMAGE_NAME }} > infra/logs/security/security-scan-$(date +%Y%m%d).log
    
- name: Upload security scan results
  uses: actions/upload-artifact@v3
  with:
    name: security-scan-results
    path: infra/logs/security/security-scan-*.log
```

### Production Deployment Security Checks
```bash
# Pre-deployment security validation
echo "[$(date)] Pre-deployment security check" >> infra/logs/security/deployment-security-$(date +%Y%m%d).log

# Check SSL certificate validity
echo | openssl s_client -servername www.lokifi.com -connect www.lokifi.com:443 2>/dev/null | openssl x509 -noout -checkend 2592000 && echo "SSL: OK" >> infra/logs/security/deployment-security-$(date +%Y%m%d).log || echo "SSL: WARNING - Expires soon" >> infra/logs/security/deployment-security-$(date +%Y%m%d).log

# Verify firewall rules
sudo iptables -L -n | grep -q "ACCEPT.*443" && echo "Firewall: OK" >> infra/logs/security/deployment-security-$(date +%Y%m%d).log || echo "Firewall: ERROR" >> infra/logs/security/deployment-security-$(date +%Y%m%d).log
```

## Related Documentation

- [Infrastructure Logs Overview](../README.md)
- [Monitoring Logs](../monitoring/README.md)
- [Deployment Logs](../deployment/README.md)
- [Security Configuration](/docs/security/README.md)
- [Production Deployment Guide](/docs/deployment/guides/production.md)
