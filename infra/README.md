# 🏗️ Infrastructure Directory

**Purpose**: Contains all infrastructure configurations, deployment files, and system architecture components for the Lokifi platform.

---

## 📂 **Directory Structure**

```
infra/
├── 🐳 docker/            # Docker configurations and compose files
├── 📊 monitoring/        # Monitoring and observability configs (Prometheus, Grafana, Loki)
├── 🔒 security/          # Security tooling & dependency protection
├── 📂 logs/              # Infrastructure logs (docker, traefik, monitoring, security)
└── 📄 Makefile           # Build and deployment automation
```

---

## 🐳 **Docker Configuration** (`docker/`)

**Purpose**: Container orchestration and deployment configurations for different environments.

> **Note**: Streamlined from 7 to 4 compose files (Oct 2025) - removed redundant monitoring, Redis HA, and Swarm configs.

### Available Files:

- **docker-compose.yml**: Base application stack (frontend, backend, postgres, redis, mailhog)
- **docker-compose.override.yml**: Local development overrides (hot-reload)
- **docker-compose.prod-minimal.yml**: Lean production (for cloud managed databases)
- **docker-compose.production.yml**: Full production setup with Traefik, monitoring, and high availability

### Usage:

```bash
# Development (auto-loads override.yml)
docker compose up

# Production - Cloud deployment
docker compose -f docker-compose.prod-minimal.yml up -d

# Production - Self-hosted with full monitoring
docker compose -f docker-compose.production.yml up -d
```

### File Selection Guide:

- **Development**: Use `docker compose up` (auto-loads override.yml for hot-reload)
- **Cloud Production**: Use `docker-compose.prod-minimal.yml` (AWS RDS, Azure Database, etc.)
- **Self-Hosted Production**: Use `docker-compose.production.yml` (includes Traefik, Prometheus, Grafana, Loki)

📖 **Detailed Guide**: See `docker/README.md` for comprehensive usage instructions

---

## 🌐 **Reverse Proxy (Traefik)**

**Purpose**: Modern reverse proxy with automatic SSL/TLS, load balancing, and service discovery.

**Configuration**: See `docker/docker-compose.production.yml`

### Features:

- **Automatic SSL/TLS**: Let's Encrypt certificate management (auto-renewal)
- **Service Discovery**: Auto-detects Docker containers via labels
- **Load Balancing**: Built-in load balancing across service instances
- **HTTP to HTTPS**: Automatic redirect for all HTTP traffic
- **Dashboard**: Web UI at `traefik.www.lokifi.com:8080`
- **Access Logs**: Comprehensive request logging at `logs/traefik/`

### Endpoints:

- **Frontend**: `www.lokifi.com` (port 443)
- **Backend API**: `api.www.lokifi.com` (port 443)
- **Traefik Dashboard**: `traefik.www.lokifi.com` (port 8080)

### Configuration Example:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.frontend.rule=Host(`www.lokifi.com`)"
  - "traefik.http.routers.frontend.entrypoints=websecure"
  - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
```

---

## 📝 **Redis Configuration**

**Purpose**: Redis caching, session storage, and pub/sub for the application.

### Configuration Location:

Redis is configured via **Docker Compose inline commands** (no separate config files):

**Local Development** (`docker-compose.yml`):
```yaml
redis:
  image: redis:7.4-alpine
  command: redis-server --requirepass 23233
```

**Production** (`docker-compose.production.yml`):
```yaml
redis:
  image: redis:7.4-alpine
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Connection Details:

**Local Development**:
```
URL: redis://:23233@localhost:6379/0
Password: 23233
```

**Production**:
```
URL: redis://redis:6379/0
No password (internal network)
```

---

## 📊 **Monitoring Configuration** (`monitoring/`)

**Purpose**: Observability, performance monitoring, and health check configurations.

### Available Files:

- `lighthouserc.json` - Lighthouse CI configuration for performance monitoring
- `prometheus.yml` - Prometheus metrics collection configuration
- `grafana-datasources.yml` - Grafana data source configurations

### Features:

- **Performance Monitoring**: Continuous performance assessment via Lighthouse CI
- **Metrics Collection**: Prometheus for system and application metrics
- **Visualization**: Grafana dashboards (configurable with docker-compose.production.yml)
- **Health Checks**: Service availability monitoring

### Key Metrics:

- API response times (p50, p95, p99)
- Error rates
- WebSocket connection health
- Cache hit rates
- Database query performance

---

## 🔒 **Security Configuration** (`security/`)

**Purpose**: Security tooling, configurations, and audit logs.

### Features:

- Secret scanning (prevent credential leaks)
- CVE vulnerability scanning
- License compliance checking
- Security audit trails
- Dependency vulnerability tracking

### Tools:

- Custom secret detection
- CVE database integration
- Automated security scanning

### Best Practices:

- Never commit secrets to Git
- Regular dependency updates
- Security scanning in CI/CD
- Audit log retention (90 days)

---

## 🧪 **Performance Tests** (`performance-tests/`)

**Purpose**: Load testing, stress testing, and performance benchmarking.

### Test Types:

- **Load Tests**: Normal traffic simulation
- **Stress Tests**: Breaking point identification
- **Spike Tests**: Traffic surge handling
- **Endurance Tests**: Long-running stability
- **Scalability Tests**: Horizontal scaling validation

### Tools:

- Custom load testing framework
- Benchmark scripts
- Performance baseline tracking

---

## � **Security** (`security/`)

**Purpose**: Security tooling and dependency protection system.

### Security Features:

- **Dependency Protection**: Version guard system preventing supply chain attacks
- **Security Scanner**: PowerShell-based security scanning (`tools/security-scanner.ps1`)
- **Documentation**: Security guides in `docs/security/`

**SSL/TLS**: Automatically managed by Traefik reverse proxy (see `docker/docker-compose.production.yml`)

---

## 📄 **Build Automation** (`Makefile`)

**Purpose**: Standardized build, test, and deployment commands.

### Available Commands:

```bash
# Build application
make build

# Run tests
make test

# Deploy to production
make deploy

# Clean build artifacts
make clean
```

---

## 🚀 **Deployment Strategies**

### **Development Environment**

```bash
# Quick start for development
docker-compose up -d
```

### **Production Environment**

```bash
# Cloud deployment (managed database)
docker compose -f docker-compose.prod-minimal.yml up -d

# Self-hosted (complete stack with monitoring)
docker compose -f docker-compose.production.yml up -d
```

---

## 📋 **Infrastructure Standards**

### **Configuration Management**

- Use environment variables for configuration
- Separate development and production configs
- Version control all configuration files
- Document configuration changes

### **Security Best Practices**

- Encrypt sensitive data at rest and in transit
- Use least privilege access principles
- Regular security audits and updates
- Secure secret management

### **Monitoring and Observability**

- Implement comprehensive logging
- Set up health checks for all services
- Monitor key performance indicators
- Configure automated alerting

---

## 🔄 **Maintenance Procedures**

### **Regular Tasks**

- Update container images and dependencies
- Review and rotate SSL certificates
- Monitor system performance and capacity
- Verify automated backup procedures

### **Security Maintenance**

- Apply security patches promptly
- Audit access controls and permissions
- Review and update firewall rules
- Conduct periodic security assessments

### **Performance Optimization**

- Monitor resource utilization
- Optimize database queries and indexes
- Review and tune caching strategies
- Load test critical workflows

---

## 📊 **Infrastructure Metrics**

### **Key Performance Indicators**

- **Uptime**: 99.9% target availability
- **Response Time**: < 200ms average response
- **Throughput**: Support for concurrent users
- **Resource Utilization**: Optimal CPU and memory usage

### **Monitoring Dashboards**

- System health and performance metrics
- Application performance monitoring
- Security event monitoring
- Cost and resource optimization

---

*Last Updated: October 22, 2025*
*Infrastructure Components: 7 major systems*
*Deployment Strategies: 3 environment configurations*
*Security Standards: Enterprise-grade implementation*
