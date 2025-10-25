# DNS Configuration Guide for www.lokifi.com

## 🌐 Required DNS Records

Configure these DNS A records in your domain registrar's control panel:

### For Production Deployment

| Type | Host/Name | Value | TTL |
|------|-----------|-------|-----|
| A | www | YOUR_SERVER_IP_ADDRESS | 3600 |
| A | api.www | YOUR_SERVER_IP_ADDRESS | 3600 |
| A | traefik.www | YOUR_SERVER_IP_ADDRESS | 3600 |

### Alternative Configuration (if subdomain restrictions)

Some registrars don't support nested subdomains like `api.www`. If you encounter this issue:

| Type | Host/Name | Value | TTL |
|------|-----------|-------|-----|
| A | @ | YOUR_SERVER_IP_ADDRESS | 3600 |
| CNAME | www | lokifi.com | 3600 |
| A | api | YOUR_SERVER_IP_ADDRESS | 3600 |
| A | traefik | YOUR_SERVER_IP_ADDRESS | 3600 |

**Note:** If using this alternative, you'll need to update the compose files to use `lokifi.com` instead of `www.lokifi.com`.

## 📝 Step-by-Step Instructions

### For Popular Registrars:

#### GoDaddy
1. Log in to GoDaddy
2. Go to "My Products" → "Domains"
3. Click "DNS" next to lokifi.com
4. Click "Add" and select "A" record
5. Add each record as shown in the table above

#### Namecheap
1. Log in to Namecheap
2. Go to "Domain List" → Select lokifi.com
3. Click "Manage" → "Advanced DNS"
4. Click "Add New Record"
5. Add each A record as shown above

#### Cloudflare (if using)
1. Log in to Cloudflare
2. Select lokifi.com domain
3. Go to "DNS" tab
4. Click "Add record"
5. Add each A record
6. **Important:** Set proxy status to "Proxied" (orange cloud) for SSL

## ✅ Verification

After adding DNS records, verify they propagate:

### Using Command Line (Windows PowerShell)
```powershell
# Check www.lokifi.com
nslookup www.lokifi.com

# Check api.www.lokifi.com
nslookup api.www.lokifi.com

# Check traefik.www.lokifi.com
nslookup traefik.www.lokifi.com
```

### Using Online Tools
- https://dnschecker.org
- https://www.whatsmydns.net

Enter each domain and verify it resolves to your server IP globally.

## ⏰ Propagation Time

- **Minimum**: 5-10 minutes
- **Average**: 1-2 hours
- **Maximum**: 48 hours (rare)

**Tip:** Lower TTL values (like 300) propagate faster but use more DNS queries.

## 🔒 SSL Certificate

Once DNS propagates, Traefik will automatically:
1. Detect the domain
2. Request SSL certificate from Let's Encrypt
3. Configure HTTPS automatically

**No manual SSL configuration needed!** 🎉

## 🧪 Test Before Full Deployment

Before deploying to production, test DNS:

```powershell
# Ping test
ping www.lokifi.com
ping api.www.lokifi.com

# HTTP test (after deployment)
curl https://www.lokifi.com
curl https://api.www.lokifi.com/api/health
```

## 📞 Troubleshooting

### DNS Not Resolving
- Wait longer (up to 48 hours)
- Clear DNS cache: `ipconfig /flushdns` (Windows)
- Check registrar's DNS settings are correct
- Verify domain is not expired

### SSL Certificate Issues
- Ensure DNS fully propagated first
- Check Traefik logs: `docker compose logs traefik`
- Verify ports 80 and 443 are open on server
- Check Let's Encrypt rate limits (50 certs/week per domain)

### Nested Subdomain Issues
- Some registrars don't support `api.www.lokifi.com`
- Use alternative configuration (see above)
- Or use `api.lokifi.com` instead

## 🎯 Production Readiness Check

Before deploying, confirm:
- [ ] All DNS records added
- [ ] DNS resolving to correct IP (`nslookup`)
- [ ] Server firewall allows ports 80, 443
- [ ] Docker and Docker Compose installed on server
- [ ] .env file copied to server
- [ ] Compose files copied to server

## 🚀 Ready to Deploy?

Once DNS propagates and all checks pass:

```bash
cd /path/to/lokifi/infra/docker
docker compose -f docker-compose.production.yml up -d
```

Monitor the deployment:
```bash
docker compose logs -f
```

Access your application:
- **Frontend**: https://www.lokifi.com
- **API Docs**: https://api.www.lokifi.com/docs
- **Health**: https://api.www.lokifi.com/api/health

---

**Generated**: 2025-10-22
**Domain**: www.lokifi.com
**Status**: Ready for DNS configuration
