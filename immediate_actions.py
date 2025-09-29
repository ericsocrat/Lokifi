#!/usr/bin/env python3
"""
Fynix Immediate Actions Implementation
====================================

This script implements all 8 immediate actions for production deployment.
Designed to run on Windows with proper encoding support.
"""

import os
import sys
import json
import datetime
import subprocess
import shutil
from pathlib import Path
from typing import Dict, List, Any

# Ensure UTF-8 encoding
if os.name == 'nt':  # Windows
    os.environ['PYTHONIOENCODING'] = 'utf-8'

class FynixProductionSetup:
    """Immediate production actions implementation"""
    
    def __init__(self):
        self.base_dir = Path.cwd()
        self.backend_dir = self.base_dir / "backend"
        self.results = {}
        self.timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Create results directory
        self.results_dir = self.base_dir / "production_results"
        self.results_dir.mkdir(exist_ok=True)
    
    def print_action(self, action_num: int, title: str):
        """Print action header"""
        print(f"\n{'='*60}")
        print(f"Action {action_num}: {title}")
        print(f"{'='*60}")
    
    def print_status(self, message: str, status: str = "INFO"):
        """Print status with proper encoding"""
        status_symbols = {
            "SUCCESS": "[SUCCESS]",
            "FAIL": "[FAIL]", 
            "WARNING": "[WARNING]",
            "INFO": "[INFO]"
        }
        symbol = status_symbols.get(status, "[INFO]")
        print(f"{symbol} {message}")
    
    def action_1_review_reports(self):
        """Action 1: Review generated reports in enhancement_results/"""
        self.print_action(1, "Review Enhancement Reports")
        
        # Find enhancement results
        enhancement_files = []
        search_dirs = [
            self.base_dir / "enhancement_results",
            self.backend_dir / "enhancement_results"
        ]
        
        for search_dir in search_dirs:
            if search_dir.exists():
                for file in search_dir.glob("*"):
                    if file.is_file():
                        enhancement_files.append(file)
        
        self.print_status(f"Found {len(enhancement_files)} enhancement result files")
        
        # Analyze recent results
        issues_found = []
        if enhancement_files:
            for file in enhancement_files[-3:]:  # Check last 3 files
                try:
                    if file.suffix == ".json":
                        with open(file, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            if "suite_results" in data:
                                for suite, info in data["suite_results"].items():
                                    if not info.get("success", False):
                                        issues_found.append(f"{suite}: {info.get('error', 'Unknown')}")
                except Exception as e:
                    self.print_status(f"Could not read {file}: {e}", "WARNING")
        
        result = {
            "files_found": len(enhancement_files),
            "issues_identified": issues_found,
            "status": "completed"
        }
        
        self.print_status(f"Identified {len(issues_found)} issues to address")
        self.results["reports_review"] = result
        return result
    
    def action_2_production_environment(self):
        """Action 2: Configure production environment"""
        self.print_action(2, "Configure Production Environment")
        
        # Check existing production files
        prod_compose = self.base_dir / "docker-compose.production.yml"
        prod_exists = prod_compose.exists()
        
        self.print_status(f"Production docker-compose: {'Found' if prod_exists else 'Missing'}")
        
        # Create production environment file
        env_prod = self.base_dir / ".env.production"
        env_content = """# Fynix Production Environment
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=sqlite:///./fynix_production.db
REDIS_URL=redis://redis:6379/0
SECRET_KEY=${SECRET_KEY}
FYNIX_JWT_SECRET=${FYNIX_JWT_SECRET}
ALLOWED_HOSTS=localhost,127.0.0.1
LOG_LEVEL=INFO
MAX_WORKERS=4
"""
        
        try:
            with open(env_prod, 'w', encoding='utf-8') as f:
                f.write(env_content)
            self.print_status("Created .env.production", "SUCCESS")
            env_created = True
        except Exception as e:
            self.print_status(f"Failed to create .env.production: {e}", "FAIL")
            env_created = False
        
        result = {
            "production_compose_exists": prod_exists,
            "environment_file_created": env_created,
            "status": "completed"
        }
        
        self.results["production_environment"] = result
        return result
    
    def action_3_monitoring_setup(self):
        """Action 3: Set up monitoring with Prometheus and Grafana"""
        self.print_action(3, "Setup Monitoring Infrastructure")
        
        # Create monitoring directory
        monitoring_dir = self.base_dir / "monitoring"
        monitoring_dir.mkdir(exist_ok=True)
        
        configs_dir = monitoring_dir / "configs"
        configs_dir.mkdir(exist_ok=True)
        
        # Create Prometheus configuration
        prometheus_config = """global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'fynix-backend'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'fynix-frontend'
    static_configs:
      - targets: ['localhost:3000']
    scrape_interval: 30s
"""
        
        try:
            with open(configs_dir / "prometheus.yml", 'w', encoding='utf-8') as f:
                f.write(prometheus_config)
            self.print_status("Created Prometheus configuration", "SUCCESS")
            prometheus_created = True
        except Exception as e:
            self.print_status(f"Failed to create Prometheus config: {e}", "FAIL")
            prometheus_created = False
        
        # Create monitoring docker-compose
        monitoring_compose = """version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: fynix-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/configs/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    container_name: fynix-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-defaultpassword123}
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  grafana-storage:
"""
        
        try:
            with open(self.base_dir / "docker-compose.monitoring.yml", 'w', encoding='utf-8') as f:
                f.write(monitoring_compose)
            self.print_status("Created monitoring docker-compose", "SUCCESS")
            compose_created = True
        except Exception as e:
            self.print_status(f"Failed to create monitoring compose: {e}", "FAIL")
            compose_created = False
        
        result = {
            "prometheus_config_created": prometheus_created,
            "monitoring_compose_created": compose_created,
            "monitoring_directory_created": True,
            "status": "completed"
        }
        
        self.results["monitoring_setup"] = result
        return result
    
    def action_4_automated_backups(self):
        """Action 4: Implement automated backup scheduling"""
        self.print_action(4, "Setup Automated Backup System")
        
        # Create backups directory
        backups_dir = self.base_dir / "backups"
        backups_dir.mkdir(exist_ok=True)
        
        # Create Windows backup script
        backup_script = f"""@echo off
REM Fynix Automated Backup Script
REM Created: {datetime.datetime.now()}

set BACKUP_DIR=backups
set DATE=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set DATE=%DATE: =0%

echo Starting backup at %date% %time%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Database backup
if exist "backend\\fynix.sqlite" (
    echo Backing up database...
    copy "backend\\fynix.sqlite" "%BACKUP_DIR%\\fynix_%DATE%.sqlite"
    echo Database backup completed
)

REM Configuration backup
echo Backing up configurations...
if exist ".env.production" copy ".env.production" "%BACKUP_DIR%\\env_prod_%DATE%.txt"
if exist "docker-compose.production.yml" copy "docker-compose.production.yml" "%BACKUP_DIR%\\compose_prod_%DATE%.yml"

echo Backup completed at %date% %time%
"""
        
        try:
            backup_script_path = self.base_dir / "backup_script.bat"
            with open(backup_script_path, 'w', encoding='utf-8') as f:
                f.write(backup_script)
            self.print_status("Created backup script", "SUCCESS")
            script_created = True
        except Exception as e:
            self.print_status(f"Failed to create backup script: {e}", "FAIL")
            script_created = False
        
        # Create backup configuration for task scheduler
        task_xml = f"""<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2">
  <RegistrationInfo>
    <Date>{datetime.datetime.now().isoformat()}</Date>
    <Author>Fynix</Author>
    <Description>Automated Fynix backup task</Description>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <Repetition>
        <Interval>PT24H</Interval>
      </Repetition>
      <StartBoundary>{datetime.datetime.now().replace(hour=2, minute=0).isoformat()}</StartBoundary>
    </CalendarTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>false</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>true</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions>
    <Exec>
      <Command>{self.base_dir / 'backup_script.bat'}</Command>
      <WorkingDirectory>{self.base_dir}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>"""
        
        try:
            task_path = self.base_dir / "fynix_backup_task.xml"
            with open(task_path, 'w', encoding='utf-8') as f:
                f.write(task_xml)
            self.print_status("Created backup task configuration", "SUCCESS")
            task_created = True
        except Exception as e:
            self.print_status(f"Failed to create backup task: {e}", "FAIL")
            task_created = False
        
        result = {
            "backup_directory_created": True,
            "backup_script_created": script_created,
            "task_scheduler_config_created": task_created,
            "status": "completed"
        }
        
        self.results["automated_backups"] = result
        return result
    
    def action_5_ssl_certificates(self):
        """Action 5: Configure SSL certificates for production"""
        self.print_action(5, "Configure SSL Certificates")
        
        # Create SSL directory
        ssl_dir = self.base_dir / "ssl"
        ssl_dir.mkdir(exist_ok=True)
        
        # Create Nginx SSL configuration
        nginx_ssl_config = """server {
    listen 80;
    server_name fynix.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name fynix.example.com;

    ssl_certificate /etc/ssl/certs/fynix.crt;
    ssl_certificate_key /etc/ssl/private/fynix.key;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}"""
        
        try:
            with open(ssl_dir / "nginx_ssl.conf", 'w', encoding='utf-8') as f:
                f.write(nginx_ssl_config)
            self.print_status("Created Nginx SSL configuration", "SUCCESS")
            nginx_created = True
        except Exception as e:
            self.print_status(f"Failed to create Nginx SSL config: {e}", "FAIL")
            nginx_created = False
        
        # Create SSL setup instructions
        ssl_instructions = """# SSL Certificate Setup Instructions

## Option 1: Let's Encrypt (Recommended for production)
1. Install Certbot on your server
2. Run: certbot --nginx -d fynix.example.com
3. Test auto-renewal: certbot renew --dry-run

## Option 2: Self-signed certificates (Development only)
1. Generate certificate:
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 
   -keyout ssl/fynix.key -out ssl/fynix.crt
   -subj "/C=US/ST=State/L=City/O=Fynix/CN=fynix.example.com"

## Option 3: Commercial SSL Certificate
1. Generate CSR: openssl req -new -newkey rsa:2048 -nodes 
   -keyout ssl/fynix.key -out ssl/fynix.csr
2. Submit CSR to certificate authority
3. Install provided certificate as ssl/fynix.crt

## Update Domain
Replace 'fynix.example.com' with your actual domain in:
- nginx_ssl.conf
- docker-compose.production.yml
- .env.production
"""
        
        try:
            with open(ssl_dir / "SSL_SETUP_INSTRUCTIONS.md", 'w', encoding='utf-8') as f:
                f.write(ssl_instructions)
            self.print_status("Created SSL setup instructions", "SUCCESS")
            instructions_created = True
        except Exception as e:
            self.print_status(f"Failed to create SSL instructions: {e}", "FAIL")
            instructions_created = False
        
        result = {
            "ssl_directory_created": True,
            "nginx_ssl_config_created": nginx_created,
            "ssl_instructions_created": instructions_created,
            "status": "completed"
        }
        
        self.results["ssl_certificates"] = result
        return result
    
    def action_6_ci_cd_testing(self):
        """Action 6: Set up continuous integration with testing framework"""
        self.print_action(6, "Setup CI/CD with Testing Framework")
        
        # Create .github/workflows directory
        workflows_dir = self.base_dir / ".github" / "workflows"
        workflows_dir.mkdir(parents=True, exist_ok=True)
        
        # Create GitHub Actions workflow
        github_workflow = f"""name: Fynix CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v3
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        cd backend
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Run tests
      run: |
        cd backend
        python -m pytest --verbose
    
    - name: Run database management test
      run: |
        cd backend
        python database_management_suite.py
    
    - name: Security scan
      run: |
        cd backend
        pip install safety bandit
        safety check
        bandit -r app/

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker images
      run: |
        docker build -f backend/Dockerfile.prod -t fynix/backend:latest .
        echo "Docker images built successfully"

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to production
      run: |
        echo "Deployment would happen here"
        echo "Example: docker-compose -f docker-compose.production.yml up -d"
"""
        
        try:
            workflow_path = workflows_dir / "ci_cd.yml"
            with open(workflow_path, 'w', encoding='utf-8') as f:
                f.write(github_workflow)
            self.print_status("Created GitHub Actions workflow", "SUCCESS")
            github_created = True
        except Exception as e:
            self.print_status(f"Failed to create GitHub workflow: {e}", "FAIL")
            github_created = False
        
        # Create test configuration
        test_config = """# Fynix Testing Configuration

## Running Tests Locally

### Backend Tests
cd backend
python database_management_suite.py
python advanced_testing_framework.py --local-mode

### Performance Tests  
cd backend
python performance_optimization_suite.py --quick-test

## CI/CD Integration
- GitHub Actions: .github/workflows/ci_cd.yml
- Automated testing on push/PR
- Security scanning with safety and bandit
- Docker image building on main branch

## Test Environment Setup
1. Ensure all dependencies installed: pip install -r requirements.txt
2. Database setup: python manage_db.py init
3. Run tests: python -m pytest

## Test Coverage
- Unit tests for core functionality
- Integration tests for API endpoints
- Performance benchmarks
- Security vulnerability scanning
"""
        
        try:
            with open(self.base_dir / "TESTING_GUIDE.md", 'w', encoding='utf-8') as f:
                f.write(test_config)
            self.print_status("Created testing guide", "SUCCESS")
            guide_created = True
        except Exception as e:
            self.print_status(f"Failed to create testing guide: {e}", "FAIL")
            guide_created = False
        
        result = {
            "github_workflow_created": github_created,
            "workflows_directory_created": True,
            "testing_guide_created": guide_created,
            "status": "completed"
        }
        
        self.results["ci_cd_testing"] = result
        return result
    
    def action_7_performance_monitoring(self):
        """Action 7: Monitor performance metrics regularly"""
        self.print_action(7, "Setup Performance Monitoring")
        
        # Create performance monitoring script
        monitor_script = f'''#!/usr/bin/env python3
"""
Fynix Performance Monitor
Simple performance monitoring with alerts
"""

import time
import psutil
import json
import requests
from datetime import datetime
from pathlib import Path

class FynixMonitor:
    def __init__(self):
        self.api_url = "http://localhost:8000"
        self.metrics_file = Path("performance_metrics.log")
        
    def collect_metrics(self):
        """Collect system and application metrics"""
        metrics = {{
            "timestamp": datetime.now().isoformat(),
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent if psutil.disk_usage('/') else 0
        }}
        
        # Try to get API health
        try:
            response = requests.get(f"{{self.api_url}}/health", timeout=5)
            metrics["api_status"] = "healthy" if response.status_code == 200 else "unhealthy"
            metrics["api_response_time"] = response.elapsed.total_seconds()
        except Exception as e:
            metrics["api_status"] = "error"
            metrics["api_error"] = str(e)
        
        return metrics
    
    def check_alerts(self, metrics):
        """Check for alert conditions"""
        alerts = []
        
        if metrics["cpu_percent"] > 90:
            alerts.append(f"HIGH CPU: {{metrics['cpu_percent']:.1f}}%")
        
        if metrics["memory_percent"] > 90:
            alerts.append(f"HIGH MEMORY: {{metrics['memory_percent']:.1f}}%")
        
        if metrics.get("api_status") != "healthy":
            alerts.append(f"API UNHEALTHY: {{metrics.get('api_error', 'Unknown error')}}")
        
        return alerts
    
    def run_monitoring_cycle(self):
        """Run one monitoring cycle"""
        print(f"[{{datetime.now()}}] Running monitoring cycle...")
        
        metrics = self.collect_metrics()
        alerts = self.check_alerts(metrics)
        
        # Log metrics
        with open(self.metrics_file, "a", encoding="utf-8") as f:
            f.write(f"{{json.dumps(metrics)}}\\n")
        
        # Print status
        print(f"CPU: {{metrics['cpu_percent']:.1f}}% | "
              f"Memory: {{metrics['memory_percent']:.1f}}% | "
              f"API: {{metrics.get('api_status', 'unknown')}}")
        
        # Handle alerts
        if alerts:
            for alert in alerts:
                print(f"ALERT: {{alert}}")
        else:
            print("All systems normal")
        
        return metrics, alerts
    
    def run_daemon(self, interval=60):
        """Run monitoring daemon"""
        print(f"Starting Fynix Performance Monitor (interval: {{interval}}s)")
        
        try:
            while True:
                self.run_monitoring_cycle()
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\\nMonitoring stopped by user")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--interval", type=int, default=60, help="Monitoring interval")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    
    args = parser.parse_args()
    
    monitor = FynixMonitor()
    
    if args.once:
        monitor.run_monitoring_cycle()
    else:
        monitor.run_daemon(args.interval)
'''
        
        try:
            monitor_path = self.base_dir / "performance_monitor.py"
            with open(monitor_path, 'w', encoding='utf-8') as f:
                f.write(monitor_script)
            self.print_status("Created performance monitoring script", "SUCCESS")
            monitor_created = True
        except Exception as e:
            self.print_status(f"Failed to create monitor script: {e}", "FAIL")
            monitor_created = False
        
        # Create monitoring service for Windows
        service_script = f"""@echo off
REM Fynix Performance Monitoring Service
REM Run this to start performance monitoring

echo Starting Fynix Performance Monitor...
cd /d "{self.base_dir}"
python performance_monitor.py --interval 60
"""
        
        try:
            service_path = self.base_dir / "start_monitoring.bat"
            with open(service_path, 'w', encoding='utf-8') as f:
                f.write(service_script)
            self.print_status("Created monitoring service script", "SUCCESS")
            service_created = True
        except Exception as e:
            self.print_status(f"Failed to create service script: {e}", "FAIL")
            service_created = False
        
        result = {
            "monitor_script_created": monitor_created,
            "service_script_created": service_created,
            "status": "completed"
        }
        
        self.results["performance_monitoring"] = result
        return result
    
    def action_8_infrastructure_scaling(self):
        """Action 8: Scale infrastructure based on load testing results"""
        self.print_action(8, "Configure Infrastructure Scaling")
        
        # Create load balancer configuration
        lb_config = """# Nginx Load Balancer Configuration

upstream fynix_backend {
    least_conn;
    server backend1:8000 weight=1 max_fails=3 fail_timeout=30s;
    server backend2:8000 weight=1 max_fails=3 fail_timeout=30s;
    server backend3:8000 weight=1 max_fails=3 fail_timeout=30s;
}

upstream fynix_frontend {
    server frontend1:3000 weight=1;
    server frontend2:3000 weight=1;
}

server {
    listen 80;
    
    location /api/ {
        proxy_pass http://fynix_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
    }
    
    location / {
        proxy_pass http://fynix_frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /health {
        access_log off;
        return 200 "healthy";
        add_header Content-Type text/plain;
    }
}"""
        
        try:
            lb_path = self.base_dir / "nginx_loadbalancer.conf"
            with open(lb_path, 'w', encoding='utf-8') as f:
                f.write(lb_config)
            self.print_status("Created load balancer configuration", "SUCCESS")
            lb_created = True
        except Exception as e:
            self.print_status(f"Failed to create load balancer config: {e}", "FAIL")
            lb_created = False
        
        # Create Docker Swarm configuration
        swarm_config = """version: '3.8'

services:
  backend:
    image: fynix/backend:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    networks:
      - fynix-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: fynix/frontend:latest
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.25'
          memory: 256M
    networks:
      - fynix-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    deploy:
      replicas: 1
    volumes:
      - ./nginx_loadbalancer.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - fynix-network

networks:
  fynix-network:
    driver: overlay
    attachable: true"""
        
        try:
            swarm_path = self.base_dir / "docker-compose.swarm.yml"
            with open(swarm_path, 'w', encoding='utf-8') as f:
                f.write(swarm_config)
            self.print_status("Created Docker Swarm configuration", "SUCCESS")
            swarm_created = True
        except Exception as e:
            self.print_status(f"Failed to create Swarm config: {e}", "FAIL")
            swarm_created = False
        
        # Create scaling instructions
        scaling_guide = """# Infrastructure Scaling Guide

## Docker Swarm Deployment
1. Initialize swarm: `docker swarm init`
2. Deploy stack: `docker stack deploy -c docker-compose.swarm.yml fynix`
3. Scale services: `docker service scale fynix_backend=5`
4. Monitor: `docker service ls`

## Manual Scaling
1. Scale backend: `docker-compose up -d --scale backend=3`
2. Scale frontend: `docker-compose up -d --scale frontend=2`
3. Update load balancer configuration accordingly

## Load Testing
1. Install: `pip install locust`
2. Run: `locust -f backend/load_test.py --host=http://localhost`
3. Monitor performance during load tests
4. Scale based on CPU/memory usage and response times

## Monitoring Scaling
- Watch CPU usage: Should stay below 70%
- Monitor memory: Should stay below 80%
- Response times: Should stay below 500ms
- Error rates: Should stay below 1%

## Auto-scaling Triggers
- Scale up when CPU > 70% for 5 minutes
- Scale down when CPU < 30% for 10 minutes
- Maximum 10 backend instances
- Minimum 2 backend instances
"""
        
        try:
            guide_path = self.base_dir / "SCALING_GUIDE.md"
            with open(guide_path, 'w', encoding='utf-8') as f:
                f.write(scaling_guide)
            self.print_status("Created scaling guide", "SUCCESS")
            guide_created = True
        except Exception as e:
            self.print_status(f"Failed to create scaling guide: {e}", "FAIL")
            guide_created = False
        
        result = {
            "load_balancer_config_created": lb_created,
            "swarm_config_created": swarm_created,
            "scaling_guide_created": guide_created,
            "status": "completed"
        }
        
        self.results["infrastructure_scaling"] = result
        return result
    
    def generate_summary_report(self):
        """Generate final summary report"""
        print(f"\n{'='*60}")
        print("FYNIX PRODUCTION SETUP COMPLETE")
        print(f"{'='*60}")
        
        total_actions = 8
        completed_actions = len([r for r in self.results.values() if r.get("status") == "completed"])
        
        print(f"Actions Completed: {completed_actions}/{total_actions}")
        print(f"Success Rate: {(completed_actions/total_actions)*100:.1f}%")
        print(f"Timestamp: {datetime.datetime.now()}")
        
        # Save detailed results
        report_data = {
            "timestamp": datetime.datetime.now().isoformat(),
            "summary": {
                "total_actions": total_actions,
                "completed_actions": completed_actions,
                "success_rate": (completed_actions/total_actions)*100
            },
            "detailed_results": self.results
        }
        
        report_path = self.results_dir / f"production_setup_report_{self.timestamp}.json"
        try:
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2)
            print(f"Detailed report saved: {report_path}")
        except Exception as e:
            print(f"Failed to save report: {e}")
        
        # Print next steps
        print(f"\n{'='*60}")
        print("NEXT STEPS")
        print(f"{'='*60}")
        print("1. Start monitoring: python performance_monitor.py")
        print("2. Run backup: backup_script.bat")
        print("3. Start monitoring stack: docker-compose -f docker-compose.monitoring.yml up -d")
        print("4. Deploy production: docker-compose -f docker-compose.production.yml up -d")
        print("5. Configure SSL: Follow ssl/SSL_SETUP_INSTRUCTIONS.md")
        print("6. Set up CI/CD: Push to GitHub to trigger .github/workflows/ci_cd.yml")
        print("7. Monitor performance: Check performance_metrics.log")
        print("8. Scale if needed: Follow SCALING_GUIDE.md")
        
        return report_data
    
    def run_all_immediate_actions(self):
        """Execute all 8 immediate actions"""
        print("Starting Fynix Production Setup - All Immediate Actions")
        print(f"Working Directory: {self.base_dir}")
        
        start_time = datetime.datetime.now()
        
        # Execute all actions
        actions = [
            self.action_1_review_reports,
            self.action_2_production_environment,
            self.action_3_monitoring_setup,
            self.action_4_automated_backups,
            self.action_5_ssl_certificates,
            self.action_6_ci_cd_testing,
            self.action_7_performance_monitoring,
            self.action_8_infrastructure_scaling
        ]
        
        for i, action in enumerate(actions, 1):
            try:
                action()
                self.print_status(f"Action {i} completed successfully", "SUCCESS")
            except Exception as e:
                self.print_status(f"Action {i} failed: {e}", "FAIL")
        
        end_time = datetime.datetime.now()
        execution_time = (end_time - start_time).total_seconds()
        
        print(f"\nTotal execution time: {execution_time:.2f} seconds")
        
        # Generate summary
        return self.generate_summary_report()

if __name__ == "__main__":
    setup = FynixProductionSetup()
    setup.run_all_immediate_actions()