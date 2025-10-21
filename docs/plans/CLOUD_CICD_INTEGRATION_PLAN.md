# 🚀 Phase 3.5: Cloud & CI/CD Integration

**Status**: 📋 Ready to Start  
**Priority**: HIGH  
**Estimated Time**: 2-3 weeks  
**Depends On**: Phase 3.4 ✅ Complete

---

## 📋 Overview

This phase focuses on implementing production-ready cloud deployment and CI/CD automation, enabling one-command deployment to cloud platforms with automated testing, building, and deployment pipelines.

### **Goals**
- ✅ One-command cloud deployment (`lokifi deploy`)
- ✅ Automated CI/CD pipelines (GitHub Actions)
- ✅ Infrastructure as Code (IaC)
- ✅ Multi-environment support (dev/staging/prod)
- ✅ Zero-downtime deployments
- ✅ Automated backups and disaster recovery
- ✅ Container registry integration
- ✅ Multi-architecture builds (AMD64/ARM64)

---

## 🎯 Features to Implement

### **1. Infrastructure as Code (IaC)** 🏗️

#### **Option A: Docker Compose (Recommended for MVP)**
**Pros**: Simple, fast, minimal cost, perfect for small-medium apps  
**Cons**: Limited scalability, manual orchestration

```yaml
# docker-compose.cloud.yml
version: '3.8'

services:
  frontend:
    image: ghcr.io/ericsocrat/lokifi-frontend:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${API_URL}
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  backend:
    image: ghcr.io/ericsocrat/lokifi-backend:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: lokifi
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  redis-data:
  postgres-data:
```yaml

#### **Option B: Terraform + DigitalOcean (Future - Scale)**
**When**: 10K+ users, need multi-region, auto-scaling  
**Cost**: ~$100-500/month

```hcl
# infra/terraform/digitalocean/main.tf
resource "digitalocean_app" "lokifi" {
  spec {
    name   = "lokifi"
    region = "nyc"

    service {
      name               = "frontend"
      instance_count     = 2
      instance_size_slug = "basic-xxs"
      
      github {
        repo           = "ericsocrat/Lokifi"
        branch         = "main"
        deploy_on_push = true
      }
      
      env {
        key   = "NODE_ENV"
        value = "production"
      }
    }
    
    service {
      name               = "backend"
      instance_count     = 2
      instance_size_slug = "basic-xs"
      
      github {
        repo           = "ericsocrat/Lokifi"
        branch         = "main"
        deploy_on_push = true
      }
    }
    
    database {
      name    = "lokifi-db"
      engine  = "PG"
      version = "16"
    }
  }
}
```hcl

---

### **2. GitHub Actions CI/CD Pipeline** 🔄

#### **Workflow: Test & Build**
```yaml
# .github/workflows/test-build.yml
name: 🧪 Test & Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: apps/frontend/package-lock.json
      
      - name: Install dependencies
        working-directory: apps/frontend
        run: npm ci
      
      - name: Run linter
        working-directory: apps/frontend
        run: npm run lint
      
      - name: Run type check
        working-directory: apps/frontend
        run: npm run type-check
      
      - name: Run tests
        working-directory: apps/frontend
        run: npm test
      
      - name: Build application
        working-directory: apps/frontend
        run: npm run build

  test-backend:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
          cache-dependency-path: apps/backend/requirements.txt
      
      - name: Install dependencies
        working-directory: apps/backend
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run linter
        working-directory: apps/backend
        run: ruff check .
      
      - name: Run type check
        working-directory: apps/backend
        run: mypy .
      
      - name: Run tests
        working-directory: apps/backend
        run: pytest --cov=app tests/
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```yaml

#### **Workflow: Deploy to Production**
```yaml
# .github/workflows/deploy-production.yml
name: 🚀 Deploy to Production

on:
  release:
    types: [published]
  workflow_dispatch:

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    strategy:
      matrix:
        service: [frontend, backend]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}-${{ matrix.service }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=semver,pattern={{major}}
            type=raw,value=latest,enable={{is_default_branch}}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./apps/${{ matrix.service }}
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/lokifi
            docker-compose pull
            docker-compose up -d
            docker-compose ps
      
      - name: Health check
        run: |
          sleep 30
          curl -f https://lokifi.app/health || exit 1
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        if: always()
        with:
          status: ${{ job.status }}
          text: 'Deployment to production ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```yaml

#### **Workflow: Security Scan**
```yaml
# .github/workflows/security-scan.yml
name: 🔒 Security Scan

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```yaml

---

### **3. Lokifi CLI Deployment Commands** 💻

```powershell
# Future: Add deployment commands to tools/

function Deploy-ToCloud {
    param(
        [ValidateSet('dev', 'staging', 'production')]
        [string]$Environment = 'production',
        
        [switch]$DryRun,
        [switch]$Force
    )
    
    Write-Host "🚀 Deploying Lokifi to $Environment..." -ForegroundColor Cyan
    
    # Pre-deployment checks
    Write-Host "📋 Running pre-deployment checks..." -ForegroundColor Yellow
    
    # 1. Check if all tests pass
    $testsPass = Test-AllApplications
    if (-not $testsPass -and -not $Force) {
        Write-Host "❌ Tests failed. Fix issues or use -Force to deploy anyway." -ForegroundColor Red
        return
    }
    
    # 2. Check if Docker is running
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Docker not found. Please install Docker." -ForegroundColor Red
        return
    }
    
    # 3. Check environment variables
    $envFile = ".env.$Environment"
    if (-not (Test-Path $envFile)) {
        Write-Host "❌ Environment file not found: $envFile" -ForegroundColor Red
        return
    }
    
    # 4. Build containers
    Write-Host "🏗️  Building containers..." -ForegroundColor Cyan
    docker-compose -f docker-compose.cloud.yml build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        return
    }
    
    # 5. Push to container registry
    Write-Host "📦 Pushing to GitHub Container Registry..." -ForegroundColor Cyan
    docker-compose -f docker-compose.cloud.yml push
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Push failed!" -ForegroundColor Red
        return
    }
    
    # 6. Deploy to server
    if (-not $DryRun) {
        Write-Host "🚀 Deploying to $Environment..." -ForegroundColor Green
        
        # SSH into server and pull latest
        ssh $env:SERVER_USER@$env:SERVER_HOST @"
            cd /opt/lokifi
            docker-compose pull
            docker-compose up -d
            docker-compose ps
"@
        
        # Health check
        Start-Sleep -Seconds 30
        $healthCheck = Invoke-RestMethod -Uri "https://lokifi.app/health" -ErrorAction SilentlyContinue
        
        if ($healthCheck) {
            Write-Host "✅ Deployment successful!" -ForegroundColor Green
            Write-Host "🌐 Application: https://lokifi.app" -ForegroundColor Cyan
        } else {
            Write-Host "⚠️  Deployment completed but health check failed!" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ Dry run completed successfully!" -ForegroundColor Green
    }
}

function Rollback-Deployment {
    param(
        [ValidateSet('dev', 'staging', 'production')]
        [string]$Environment = 'production',
        
        [string]$Version
    )
    
    Write-Host "⏮️  Rolling back $Environment to version $Version..." -ForegroundColor Yellow
    
    ssh $env:SERVER_USER@$env:SERVER_HOST @"
        cd /opt/lokifi
        docker-compose down
        docker-compose pull $Version
        docker-compose up -d
        docker-compose ps
"@
    
    Write-Host "✅ Rollback completed!" -ForegroundColor Green
}

function Get-DeploymentStatus {
    param(
        [ValidateSet('dev', 'staging', 'production')]
        [string]$Environment = 'production'
    )
    
    Write-Host "📊 Deployment Status: $Environment" -ForegroundColor Cyan
    
    ssh $env:SERVER_USER@$env:SERVER_HOST @"
        cd /opt/lokifi
        docker-compose ps
        docker stats --no-stream
"@
}
```powershell

---

### **4. Deployment Platforms** ☁️

#### **Recommended: DigitalOcean App Platform**
**Cost**: ~$12-25/month for MVP  
**Pros**: Simple, managed, auto-scaling, one-click deploy  
**Perfect for**: 0-10K users

```bash
# Deploy with DigitalOcean CLI
doctl apps create --spec .do/app.yaml
```bash

#### **Alternative: Railway.app**
**Cost**: $5-20/month for MVP  
**Pros**: Zero-config, GitHub integration, free SSL  
**Perfect for**: MVP, testing

```bash
# Deploy with Railway CLI
railway up
```bash

#### **Alternative: Fly.io**
**Cost**: $0-15/month for MVP  
**Pros**: Edge network, multi-region, good free tier  
**Perfect for**: Global apps

```bash
# Deploy with Fly CLI
fly deploy
```bash

#### **Enterprise: AWS/GCP/Azure**
**Cost**: $100-1000+/month  
**When**: 100K+ users, need enterprise features  
**Not recommended yet**: Overkill for current stage

---

### **5. Monitoring & Observability** 📊

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana-data:/var/lib/grafana
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
  
  loki:
    image: grafana/loki:latest
    volumes:
      - loki-data:/loki
    ports:
      - "3100:3100"
  
  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - ./promtail.yml:/etc/promtail/config.yml
```yaml

---

## 📝 Implementation Checklist

### **Week 1: Infrastructure Setup** 🏗️
- [ ] Create `docker-compose.cloud.yml` for production
- [ ] Set up GitHub Container Registry (GHCR)
- [ ] Create multi-stage Dockerfiles (optimized)
- [ ] Set up environment variable management (`.env.production`)
- [ ] Create nginx reverse proxy configuration
- [ ] Set up SSL certificates (Let's Encrypt)
- [ ] Test local Docker Compose deployment

### **Week 2: CI/CD Pipeline** 🔄
- [ ] Create `.github/workflows/test-build.yml`
- [ ] Create `.github/workflows/deploy-production.yml`
- [ ] Create `.github/workflows/security-scan.yml`
- [ ] Set up GitHub Actions secrets
- [ ] Configure multi-architecture builds (AMD64/ARM64)
- [ ] Add deployment notifications (Slack/Discord)
- [ ] Test CI/CD pipeline end-to-end

### **Week 3: Deployment & Monitoring** 📊
- [ ] Choose deployment platform (DigitalOcean recommended)
- [ ] Deploy to staging environment
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Configure log aggregation (Loki)
- [ ] Set up automated backups
- [ ] Create disaster recovery plan
- [ ] Deploy to production
- [ ] Add deployment commands to tools/
- [ ] Write deployment documentation

---

## 🎯 Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Deployment time | < 10 minutes | 📋 |
| Build success rate | > 95% | 📋 |
| Uptime | > 99.5% | 📋 |
| Health check response | < 500ms | 📋 |
| Rollback time | < 2 minutes | 📋 |
| Zero-downtime deploys | 100% | 📋 |

---

## 📚 Documentation to Create

1. **DEPLOYMENT_GUIDE.md** - Complete deployment instructions
2. **CICD_SETUP.md** - CI/CD pipeline configuration
3. **MONITORING_GUIDE.md** - Monitoring and alerting setup
4. **DISASTER_RECOVERY.md** - Backup and recovery procedures
5. **SCALING_GUIDE.md** - How to scale when needed

---

## 💰 Cost Estimate

### **Development/MVP (0-1K users)**
- DigitalOcean App Platform: $12-25/month
- Domain + SSL: $12-20/year
- Monitoring (optional): $0 (self-hosted)
- **Total**: ~$15-30/month

### **Growth (1K-10K users)**
- DigitalOcean: $50-150/month
- Database (managed): $15-50/month
- Redis (managed): $10-30/month
- CDN: $10-30/month
- **Total**: ~$85-260/month

### **Scale (10K-100K users)**
- Multi-region deployment: $200-500/month
- Auto-scaling: $100-300/month
- Advanced monitoring: $50-100/month
- **Total**: ~$350-900/month

---

## 🚀 Next Steps

1. **Start with Week 1**: Infrastructure setup
2. **Use Docker Compose**: Simple, fast, cost-effective
3. **Deploy to DigitalOcean**: Best balance of simplicity and features
4. **Set up monitoring early**: Catch issues before users do
5. **Automate everything**: Less manual work = fewer errors

---

**Status**: 📋 Ready to implement  
**Priority**: HIGH  
**Estimated completion**: 2-3 weeks  
**Blockers**: None - all dependencies met

Let's build production-ready infrastructure! 🚀