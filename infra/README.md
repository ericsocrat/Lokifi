# 🏗️ Infrastructure Directory

**Purpose**: Contains all infrastructure configurations, deployment files, and system architecture components for the Lokifi platform.

---

## 📂 **Directory Structure**

```
infra/
├── 🐳 docker/            # Docker configurations and compose files
├── 🌐 nginx/             # Nginx configurations and load balancing
├── 📊 monitoring/        # Monitoring and observability configs
├── 🔒 security/          # Security tooling & configs
├── ⚡ performance-tests/ # Load & performance testing
├── 🔑 ssl/               # SSL certificates and security configs
├── 📝 redis/             # Redis configuration files
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

## 🌐 **Nginx Configuration** (`nginx/`)

**Purpose**: Reverse proxy, load balancing, and web server configurations.

### Available Files:

- `nginx_loadbalancer.conf` - Load balancer configuration for lokifi backend and frontend services

### Features:

- **Load Balancing**: Distributes traffic across lokifi backend/frontend services
- **SSL Termination**: Handles HTTPS certificates
- **Static File Serving**: Optimized static asset delivery
- **Caching**: Intelligent caching strategies

---

## 📝 **Redis Configuration** (`redis/`)

**Purpose**: Redis configuration files for caching, session storage, and pub/sub.

### Files:

- **redis.conf**: Main Redis configuration
- **redis-primary.conf**: Primary node config (for HA setup)
- **redis-replica.conf**: Replica node config
- **sentinel.conf**: Redis Sentinel for high availability

### Features:

- **Persistence**: AOF + RDB snapshots
- **Memory Management**: LRU eviction policies
- **Security**: Password authentication, command renaming
- **High Availability**: Sentinel configuration ready

### Connection:

```
URL: redis://:23233@localhost:6379/0
Password: 23233
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

## 🔑 **SSL/Security** (`ssl/`)

**Purpose**: SSL certificates, security configurations, and cryptographic materials.

### Security Features:

- **Certificate Management**: SSL/TLS certificate storage
- **Key Management**: Secure key storage and rotation
- **Security Headers**: HTTP security header configurations
- **Access Control**: Authentication and authorization configs

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
