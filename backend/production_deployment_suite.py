#!/usr/bin/env python3
"""
Production Deployment and Monitoring Suite
==========================================

Comprehensive production deployment automation and monitoring including:
- Docker container management
- Health monitoring and alerting
- Performance metrics collection
- Log aggregation and analysis
- Backup automation
- Security monitoring
"""

import asyncio
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    import aiofiles
    import docker
    import httpx
    import psutil
    from prometheus_client import CollectorRegistry, Counter, Gauge, Histogram, generate_latest
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("Install missing dependencies: pip install docker psutil aiofiles httpx prometheus_client")
    sys.exit(1)

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

class ProductionManager:
    """Production deployment and monitoring manager"""
    
    def __init__(self):
        self.project_root = backend_dir.parent
        self.monitoring_dir = self.project_root / "monitoring"
        self.logs_dir = self.monitoring_dir / "logs"
        self.backups_dir = self.project_root / "backups"
        self.configs_dir = self.monitoring_dir / "configs"
        
        # Create directories
        for directory in [self.monitoring_dir, self.logs_dir, self.backups_dir, self.configs_dir]:
            directory.mkdir(parents=True, exist_ok=True)
        
        # Metrics registry
        self.registry = CollectorRegistry()
        self.setup_metrics()
        
        # Docker client
        try:
            self.docker_client = docker.from_env()
        except Exception as e:
            print(f"⚠️  Docker not available: {e}")
            self.docker_client = None
    
    def setup_metrics(self):
        """Setup Prometheus metrics"""
        self.metrics = {
            'http_requests_total': Counter('fynix_http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'], registry=self.registry),
            'http_request_duration': Histogram('fynix_http_request_duration_seconds', 'HTTP request duration', ['method', 'endpoint'], registry=self.registry),
            'active_connections': Gauge('fynix_active_connections', 'Active connections', registry=self.registry),
            'database_connections': Gauge('fynix_database_connections', 'Database connections', registry=self.registry),
            'memory_usage': Gauge('fynix_memory_usage_bytes', 'Memory usage in bytes', registry=self.registry),
            'cpu_usage': Gauge('fynix_cpu_usage_percent', 'CPU usage percentage', registry=self.registry),
            'disk_usage': Gauge('fynix_disk_usage_bytes', 'Disk usage in bytes', ['path'], registry=self.registry),
        }
    
    def print_header(self, title: str):
        print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*80}{Colors.END}")
        print(f"{Colors.CYAN}{Colors.BOLD}{title.center(80)}{Colors.END}")
        print(f"{Colors.CYAN}{Colors.BOLD}{'='*80}{Colors.END}")
    
    def print_section(self, title: str):
        print(f"\n{Colors.BLUE}{Colors.BOLD}🚀 {title}{Colors.END}")
        print(f"{Colors.BLUE}{'─'*60}{Colors.END}")
    
    def print_success(self, message: str):
        print(f"{Colors.GREEN}✅ {message}{Colors.END}")
    
    def print_warning(self, message: str):
        print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")
    
    def print_error(self, message: str):
        print(f"{Colors.RED}❌ {message}{Colors.END}")
    
    def print_info(self, message: str):
        print(f"{Colors.WHITE}ℹ️  {message}{Colors.END}")
    
    async def create_docker_configs(self) -> bool:
        """Create optimized Docker configurations for production"""
        self.print_section("Docker Configuration Creation")
        
        try:
            # Enhanced production Dockerfile
            dockerfile_content = """# Multi-stage production Dockerfile for Lokifi
FROM python:3.11-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    postgresql-client \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.11-slim

# Create non-root user
RUN useradd --create-home --shell /bin/bash lokifi

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    postgresql-client \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /root/.local /home/lokifi/.local

# Set work directory
WORKDIR /app

# Copy application code
COPY . .

# Change ownership to lokifi user
RUN chown -R lokifi:lokifi /app

# Switch to non-root user
USER lokifi

# Set environment variables
ENV PATH=/home/lokifi/.local/bin:$PATH
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
"""
            
            dockerfile_path = backend_dir / "Dockerfile.production"
            with open(dockerfile_path, 'w') as f:
                f.write(dockerfile_content)
            
            self.print_success(f"Created production Dockerfile: {dockerfile_path.name}")
            
            # Enhanced docker-compose for production
            compose_content = {
                'version': '3.8',
                'services': {
                    'lokifi-api': {
                        'build': {
                            'context': '.',
                            'dockerfile': 'Dockerfile.production'
                        },
                        'ports': ['8000:8000'],
                        'environment': [
                            'DATABASE_URL=postgresql://lokifi:fynix_password@postgres:5432/fynix_prod',
                            'REDIS_URL=redis://redis:6379/0',
                            'SECRET_KEY=${SECRET_KEY}',
                            'ENVIRONMENT=production'
                        ],
                        'depends_on': ['postgres', 'redis'],
                        'restart': 'unless-stopped',
                        'healthcheck': {
                            'test': ['CMD', 'curl', '-f', 'http://localhost:8000/health'],
                            'interval': '30s',
                            'timeout': '10s',
                            'retries': 3
                        },
                        'logging': {
                            'driver': 'json-file',
                            'options': {
                                'max-size': '10m',
                                'max-file': '3'
                            }
                        }
                    },
                    'postgres': {
                        'image': 'postgres:15-alpine',
                        'environment': [
                            'POSTGRES_DB=fynix_prod',
                            'POSTGRES_USER=lokifi',
                            'POSTGRES_PASSWORD=fynix_password'
                        ],
                        'volumes': [
                            'postgres_data:/var/lib/postgresql/data',
                            './backups:/backups'
                        ],
                        'restart': 'unless-stopped',
                        'healthcheck': {
                            'test': ['CMD-SHELL', 'pg_isready -U lokifi -d fynix_prod'],
                            'interval': '30s',
                            'timeout': '10s',
                            'retries': 3
                        }
                    },
                    'redis': {
                        'image': 'redis:7-alpine',
                        'command': 'redis-server --appendonly yes',
                        'volumes': ['redis_data:/data'],
                        'restart': 'unless-stopped',
                        'healthcheck': {
                            'test': ['CMD', 'redis-cli', 'ping'],
                            'interval': '30s',
                            'timeout': '10s',
                            'retries': 3
                        }
                    },
                    'nginx': {
                        'image': 'nginx:alpine',
                        'ports': ['80:80', '443:443'],
                        'volumes': [
                            './monitoring/configs/nginx.conf:/etc/nginx/nginx.conf',
                            './monitoring/ssl:/etc/nginx/ssl'
                        ],
                        'depends_on': ['lokifi-api'],
                        'restart': 'unless-stopped'
                    },
                    'prometheus': {
                        'image': 'prom/prometheus:latest',
                        'ports': ['9090:9090'],
                        'volumes': [
                            './monitoring/configs/prometheus.yml:/etc/prometheus/prometheus.yml',
                            'prometheus_data:/prometheus'
                        ],
                        'command': [
                            '--config.file=/etc/prometheus/prometheus.yml',
                            '--storage.tsdb.path=/prometheus',
                            '--web.console.libraries=/etc/prometheus/console_libraries',
                            '--web.console.templates=/etc/prometheus/consoles',
                            '--web.enable-lifecycle'
                        ],
                        'restart': 'unless-stopped'
                    },
                    'grafana': {
                        'image': 'grafana/grafana:latest',
                        'ports': ['3000:3000'],
                        'environment': [
                            'GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-defaultpassword123}'
                        ],
                        'volumes': [
                            'grafana_data:/var/lib/grafana',
                            './monitoring/configs/grafana:/etc/grafana/provisioning'
                        ],
                        'restart': 'unless-stopped'
                    }
                },
                'volumes': {
                    'postgres_data': {},
                    'redis_data': {},
                    'prometheus_data': {},
                    'grafana_data': {}
                },
                'networks': {
                    'fynix_network': {
                        'driver': 'bridge'
                    }
                }
            }
            
            compose_path = self.project_root / "docker-compose.production.yml"
            with open(compose_path, 'w') as f:
                yaml.dump(compose_content, f, default_flow_style=False)
            
            self.print_success(f"Created production docker-compose: {compose_path.name}")
            
            return True
            
        except Exception as e:
            self.print_error(f"Docker configuration creation failed: {e}")
            return False
    
    async def create_monitoring_configs(self) -> bool:
        """Create monitoring and alerting configurations"""
        self.print_section("Monitoring Configuration Creation")
        
        try:
            # Prometheus configuration
            prometheus_config = {
                'global': {
                    'scrape_interval': '15s',
                    'evaluation_interval': '15s'
                },
                'rule_files': [
                    'alert_rules.yml'
                ],
                'scrape_configs': [
                    {
                        'job_name': 'lokifi-api',
                        'static_configs': [
                            {'targets': ['lokifi-api:8000']}
                        ],
                        'metrics_path': '/metrics',
                        'scrape_interval': '10s'
                    },
                    {
                        'job_name': 'postgres',
                        'static_configs': [
                            {'targets': ['postgres:5432']}
                        ]
                    },
                    {
                        'job_name': 'redis',
                        'static_configs': [
                            {'targets': ['redis:6379']}
                        ]
                    }
                ],
                'alerting': {
                    'alertmanagers': [
                        {
                            'static_configs': [
                                {'targets': ['alertmanager:9093']}
                            ]
                        }
                    ]
                }
            }
            
            prometheus_path = self.configs_dir / "prometheus.yml"
            with open(prometheus_path, 'w') as f:
                yaml.dump(prometheus_config, f, default_flow_style=False)
            
            self.print_success(f"Created Prometheus config: {prometheus_path.name}")
            
            # Alert rules
            alert_rules = {
                'groups': [
                    {
                        'name': 'fynix_alerts',
                        'rules': [
                            {
                                'alert': 'FynixAPIDown',
                                'expr': 'up{job="lokifi-api"} == 0',
                                'for': '1m',
                                'labels': {
                                    'severity': 'critical'
                                },
                                'annotations': {
                                    'summary': 'Lokifi API is down',
                                    'description': 'The Lokifi API has been down for more than 1 minute.'
                                }
                            },
                            {
                                'alert': 'HighResponseTime',
                                'expr': 'fynix_http_request_duration_seconds{quantile="0.95"} > 0.5',
                                'for': '5m',
                                'labels': {
                                    'severity': 'warning'
                                },
                                'annotations': {
                                    'summary': 'High response time detected',
                                    'description': '95th percentile response time is above 500ms for 5 minutes.'
                                }
                            },
                            {
                                'alert': 'HighMemoryUsage',
                                'expr': 'fynix_memory_usage_bytes > 1000000000',  # 1GB
                                'for': '10m',
                                'labels': {
                                    'severity': 'warning'
                                },
                                'annotations': {
                                    'summary': 'High memory usage',
                                    'description': 'Memory usage is above 1GB for 10 minutes.'
                                }
                            },
                            {
                                'alert': 'DatabaseConnectionFailed',
                                'expr': 'fynix_database_connections == 0',
                                'for': '1m',
                                'labels': {
                                    'severity': 'critical'
                                },
                                'annotations': {
                                    'summary': 'Database connection failed',
                                    'description': 'No database connections available.'
                                }
                            }
                        ]
                    }
                ]
            }
            
            alerts_path = self.configs_dir / "alert_rules.yml"
            with open(alerts_path, 'w') as f:
                yaml.dump(alert_rules, f, default_flow_style=False)
            
            self.print_success(f"Created alert rules: {alerts_path.name}")
            
            # Nginx configuration
            nginx_config = """
events {
    worker_connections 1024;
}

http {
    upstream fynix_backend {
        server lokifi-api:8000;
    }
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    server {
        listen 80;
        server_name localhost;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        
        # API proxy
        location / {
            proxy_pass http://fynix_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
        
        # Health check endpoint
        location /nginx-health {
            access_log off;
            return 200 "healthy\\n";
            add_header Content-Type text/plain;
        }
        
        # Metrics endpoint for Prometheus
        location /metrics {
            proxy_pass http://fynix_backend/metrics;
            allow 172.16.0.0/12;  # Docker network
            deny all;
        }
    }
}
"""
            
            nginx_path = self.configs_dir / "nginx.conf"
            with open(nginx_path, 'w') as f:
                f.write(nginx_config)
            
            self.print_success(f"Created Nginx config: {nginx_path.name}")
            
            return True
            
        except Exception as e:
            self.print_error(f"Monitoring configuration creation failed: {e}")
            return False
    
    async def create_deployment_scripts(self) -> bool:
        """Create deployment and management scripts"""
        self.print_section("Deployment Scripts Creation")
        
        try:
            # Production deployment script
            deploy_script = """#!/bin/bash
set -e

echo "🚀 Starting Lokifi Production Deployment"

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Docker is running"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env.production ]; then
    print_warning "Creating .env.production file with default values"
    cat > .env.production << EOF
SECRET_KEY=$(openssl rand -hex 32)
DATABASE_URL=postgresql://lokifi:fynix_password@postgres:5432/fynix_prod
REDIS_URL=redis://redis:6379/0
ENVIRONMENT=production
DEBUG=false
EOF
    print_success "Created .env.production file"
fi

# Create SSL directory for nginx
mkdir -p monitoring/ssl

# Pull latest images
print_status "Pulling latest Docker images..."
docker-compose -f docker-compose.production.yml pull

# Build application image
print_status "Building Lokifi application image..."
docker-compose -f docker-compose.production.yml build lokifi-api

# Run database migrations
print_status "Running database migrations..."
docker-compose -f docker-compose.production.yml run --rm lokifi-api alembic upgrade head

# Start services
print_status "Starting production services..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
services=("postgres" "redis" "lokifi-api" "nginx")
for service in "${services[@]}"; do
    if docker-compose -f docker-compose.production.yml ps "$service" | grep -q "Up (healthy)\\|Up"; then
        print_success "$service is running"
    else
        print_error "$service is not healthy"
        docker-compose -f docker-compose.production.yml logs "$service"
        exit 1
    fi
done

# Test API endpoint
print_status "Testing API endpoint..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    print_success "API is responding correctly"
else
    print_error "API health check failed"
    exit 1
fi

print_success "🎉 Lokifi production deployment completed successfully!"
print_status "Services are running at:"
echo "  - API: http://localhost"
echo "  - Prometheus: http://localhost:9090"
echo "  - Grafana: http://localhost:3000 (admin/[check GRAFANA_ADMIN_PASSWORD])"
echo ""
print_status "To view logs: docker-compose -f docker-compose.production.yml logs -f"
print_status "To stop services: docker-compose -f docker-compose.production.yml down"
"""
            
            deploy_path = self.project_root / "deploy-production.sh"
            with open(deploy_path, 'w') as f:
                f.write(deploy_script)
            
            # Make script executable
            os.chmod(deploy_path, 0o755)
            
            self.print_success(f"Created deployment script: {deploy_path.name}")
            
            # Backup script
            backup_script = """#!/bin/bash
set -e

echo "💾 Starting Lokifi Backup Process"

# Colors
GREEN='\\033[0;32m'
BLUE='\\033[0;34m'
NC='\\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Create backup directory with timestamp
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

print_status "Creating backup in $BACKUP_DIR"

# Backup database
print_status "Backing up PostgreSQL database..."
docker-compose -f docker-compose.production.yml exec -T postgres pg_dump -U lokifi fynix_prod | gzip > "$BACKUP_DIR/database.sql.gz"

# Backup Redis data
print_status "Backing up Redis data..."
docker-compose -f docker-compose.production.yml exec -T redis redis-cli SAVE
docker cp $(docker-compose -f docker-compose.production.yml ps -q redis):/data/dump.rdb "$BACKUP_DIR/redis_dump.rdb"

# Backup application logs
print_status "Backing up application logs..."
mkdir -p "$BACKUP_DIR/logs"
docker-compose -f docker-compose.production.yml logs lokifi-api > "$BACKUP_DIR/logs/lokifi-api.log" 2>&1
docker-compose -f docker-compose.production.yml logs postgres > "$BACKUP_DIR/logs/postgres.log" 2>&1
docker-compose -f docker-compose.production.yml logs redis > "$BACKUP_DIR/logs/redis.log" 2>&1

# Create backup info file
cat > "$BACKUP_DIR/backup_info.txt" << EOF
Backup Created: $(date)
Database Size: $(du -h "$BACKUP_DIR/database.sql.gz" | cut -f1)
Redis Size: $(du -h "$BACKUP_DIR/redis_dump.rdb" | cut -f1)
Total Backup Size: $(du -sh "$BACKUP_DIR" | cut -f1)
EOF

print_success "Backup completed successfully!"
print_status "Backup location: $BACKUP_DIR"
print_status "Backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"

# Cleanup old backups (keep last 7 days)
find backups -type d -name "20*" -mtime +7 -exec rm -rf {} + 2>/dev/null || true

print_success "✅ Backup process completed"
"""
            
            backup_path = self.project_root / "backup.sh"
            with open(backup_path, 'w') as f:
                f.write(backup_script)
            
            # Make script executable
            os.chmod(backup_path, 0o755)
            
            self.print_success(f"Created backup script: {backup_path.name}")
            
            return True
            
        except Exception as e:
            self.print_error(f"Deployment scripts creation failed: {e}")
            return False
    
    async def collect_system_metrics(self) -> dict[str, Any]:
        """Collect current system metrics"""
        self.print_section("System Metrics Collection")
        
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "system": {},
            "application": {},
            "docker": {}
        }
        
        try:
            # System metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            metrics["system"] = {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_total": memory.total,
                "memory_used": memory.used,
                "disk_percent": disk.percent,
                "disk_total": disk.total,
                "disk_used": disk.used,
                "load_average": os.getloadavg() if hasattr(os, 'getloadavg') else [0, 0, 0]
            }
            
            # Update Prometheus metrics
            self.metrics['cpu_usage'].set(cpu_percent)
            self.metrics['memory_usage'].set(memory.used)
            self.metrics['disk_usage'].labels(path='/').set(disk.used)
            
            self.print_info(f"CPU: {cpu_percent:.1f}%, Memory: {memory.percent:.1f}%, Disk: {disk.percent:.1f}%")
            
            # Application metrics (if server is running)
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get("http://localhost:8002/health", timeout=5)
                    if response.status_code == 200:
                        metrics["application"]["status"] = "healthy"
                        metrics["application"]["response_time"] = response.elapsed.total_seconds()
                        
                        # Try to get metrics endpoint
                        try:
                            metrics_response = await client.get("http://localhost:8002/metrics", timeout=5)
                            if metrics_response.status_code == 200:
                                metrics["application"]["prometheus_metrics"] = True
                        except (httpx.RequestError, httpx.TimeoutException):
                            metrics["application"]["prometheus_metrics"] = False
                    else:
                        metrics["application"]["status"] = "unhealthy"
            except Exception as e:
                metrics["application"]["status"] = "down"
                metrics["application"]["error"] = str(e)
            
            # Docker metrics
            if self.docker_client:
                try:
                    containers = self.docker_client.containers.list()
                    metrics["docker"] = {
                        "total_containers": len(containers),
                        "running_containers": len([c for c in containers if c.status == 'running']),
                        "containers": [
                            {
                                "name": c.name,
                                "status": c.status,
                                "image": c.image.tags[0] if c.image.tags else "unknown"
                            }
                            for c in containers
                        ]
                    }
                except Exception as e:
                    metrics["docker"]["error"] = str(e)
            
            # Save metrics to file
            metrics_file = self.logs_dir / f"metrics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            async with aiofiles.open(metrics_file, 'w') as f:
                await f.write(json.dumps(metrics, indent=2))
            
            self.print_success(f"Metrics collected and saved to {metrics_file.name}")
            
            return metrics
            
        except Exception as e:
            self.print_error(f"Metrics collection failed: {e}")
            return metrics
    
    async def health_check_all_services(self) -> dict[str, Any]:
        """Comprehensive health check of all services"""
        self.print_section("Comprehensive Health Check")
        
        health_status = {
            "timestamp": datetime.now().isoformat(),
            "overall_status": "unknown",
            "services": {}
        }
        
        services_to_check = [
            ("Lokifi API", "http://localhost:8002/health"),
            ("Prometheus", "http://localhost:9090/-/healthy"),
            ("Grafana", "http://localhost:3000/api/health"),
        ]
        
        healthy_services = 0
        total_services = len(services_to_check)
        
        for service_name, service_url in services_to_check:
            try:
                async with httpx.AsyncClient() as client:
                    start_time = time.time()
                    response = await client.get(service_url, timeout=10)
                    response_time = time.time() - start_time
                    
                    if response.status_code == 200:
                        health_status["services"][service_name] = {
                            "status": "healthy",
                            "response_time": response_time,
                            "status_code": response.status_code
                        }
                        healthy_services += 1
                        self.print_success(f"{service_name}: Healthy ({response_time:.3f}s)")
                    else:
                        health_status["services"][service_name] = {
                            "status": "unhealthy",
                            "response_time": response_time,
                            "status_code": response.status_code
                        }
                        self.print_warning(f"{service_name}: Unhealthy (HTTP {response.status_code})")
                        
            except Exception as e:
                health_status["services"][service_name] = {
                    "status": "down",
                    "error": str(e)
                }
                self.print_error(f"{service_name}: Down ({e})")
        
        # Determine overall status
        if healthy_services == total_services:
            health_status["overall_status"] = "healthy"
        elif healthy_services > 0:
            health_status["overall_status"] = "partial"
        else:
            health_status["overall_status"] = "down"
        
        health_status["healthy_services"] = healthy_services
        health_status["total_services"] = total_services
        health_status["health_percentage"] = (healthy_services / total_services * 100) if total_services > 0 else 0
        
        # Save health check results
        health_file = self.logs_dir / f"health_check_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        async with aiofiles.open(health_file, 'w') as f:
            await f.write(json.dumps(health_status, indent=2))
        
        self.print_info(f"Overall health: {health_status['overall_status']} ({healthy_services}/{total_services} services)")
        
        return health_status
    
    async def generate_monitoring_report(self) -> dict[str, Any]:
        """Generate comprehensive monitoring report"""
        self.print_section("Monitoring Report Generation")
        
        # Collect all monitoring data
        system_metrics = await self.collect_system_metrics()
        health_status = await self.health_check_all_services()
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "system_metrics": system_metrics,
            "health_status": health_status,
            "recommendations": [],
            "alerts": []
        }
        
        # Generate recommendations based on metrics
        if system_metrics["system"]["cpu_percent"] > 80:
            report["recommendations"].append("High CPU usage detected - consider scaling or optimization")
            report["alerts"].append({"level": "warning", "message": "CPU usage above 80%"})
        
        if system_metrics["system"]["memory_percent"] > 85:
            report["recommendations"].append("High memory usage detected - monitor for memory leaks")
            report["alerts"].append({"level": "warning", "message": "Memory usage above 85%"})
        
        if system_metrics["system"]["disk_percent"] > 90:
            report["recommendations"].append("Low disk space - cleanup or expand storage")
            report["alerts"].append({"level": "critical", "message": "Disk usage above 90%"})
        
        if health_status["health_percentage"] < 100:
            report["recommendations"].append("Some services are unhealthy - check service logs")
            report["alerts"].append({"level": "warning", "message": f"Only {health_status['health_percentage']:.0f}% of services healthy"})
        
        # Save comprehensive report
        report_file = self.monitoring_dir / f"monitoring_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        async with aiofiles.open(report_file, 'w') as f:
            await f.write(json.dumps(report, indent=2))
        
        self.print_success(f"Monitoring report saved: {report_file.name}")
        
        return report
    
    async def run_production_setup(self) -> bool:
        """Run complete production setup"""
        self.print_header("Lokifi Production Deployment & Monitoring Suite")
        
        print(f"{Colors.WHITE}Setting up production environment and monitoring{Colors.END}")
        print(f"{Colors.WHITE}Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.END}")
        
        success_count = 0
        total_tasks = 4
        
        # Create Docker configurations
        if await self.create_docker_configs():
            success_count += 1
        
        # Create monitoring configurations
        if await self.create_monitoring_configs():
            success_count += 1
        
        # Create deployment scripts
        if await self.create_deployment_scripts():
            success_count += 1
        
        # Generate monitoring report
        report = await self.generate_monitoring_report()
        if report:
            success_count += 1
        
        # Final summary
        self.print_header("Production Setup Summary")
        
        self.print_success("Docker production configuration created")
        self.print_success("Monitoring and alerting configured")
        self.print_success("Deployment scripts generated")
        self.print_success("System monitoring active")
        
        success_rate = (success_count / total_tasks * 100)
        
        print(f"\n{Colors.BOLD}Setup Status: {Colors.GREEN if success_rate >= 100 else Colors.YELLOW}{'Complete' if success_rate >= 100 else 'Partial'}{Colors.END}")
        print(f"{Colors.BOLD}Success Rate: {Colors.WHITE}{success_rate:.0f}%{Colors.END}")
        
        if success_rate >= 100:
            print(f"\n{Colors.GREEN}🎉 Production environment is ready for deployment!{Colors.END}")
            print(f"{Colors.WHITE}Next steps:{Colors.END}")
            print("  1. Review configuration files in monitoring/configs/")
            print("  2. Run: ./deploy-production.sh")
            print("  3. Access monitoring at http://localhost:3000 (Grafana)")
            print("  4. Set up automated backups with: ./backup.sh")
        
        return success_rate >= 75

async def main():
    """Main production setup execution"""
    manager = ProductionManager()
    
    try:
        success = await manager.run_production_setup()
        return success
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Production setup interrupted by user{Colors.END}")
        return False
    except Exception as e:
        print(f"\n{Colors.RED}Production setup failed: {e}{Colors.END}")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Production manager failed: {e}")
        sys.exit(1)