#!/usr/bin/env python3
"""
Lokifi Performance Monitor
Simple performance monitoring with alerts
"""

import time
import psutil
import json
import requests
from datetime import datetime
from pathlib import Path

class LokifiMonitor:
    def __init__(self):
        self.api_url = "http://localhost:8000"
        self.metrics_file = Path("performance_metrics.log")
        
    def collect_metrics(self):
        """Collect system and application metrics"""
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent if psutil.disk_usage('/') else 0
        }
        
        # Try to get API health
        try:
            response = requests.get(f"{self.api_url}/health", timeout=5)
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
            alerts.append(f"HIGH CPU: {metrics['cpu_percent']:.1f}%")
        
        if metrics["memory_percent"] > 90:
            alerts.append(f"HIGH MEMORY: {metrics['memory_percent']:.1f}%")
        
        if metrics.get("api_status") != "healthy":
            alerts.append(f"API UNHEALTHY: {metrics.get('api_error', 'Unknown error')}")
        
        return alerts
    
    def run_monitoring_cycle(self):
        """Run one monitoring cycle"""
        print(f"[{datetime.now()}] Running monitoring cycle...")
        
        metrics = self.collect_metrics()
        alerts = self.check_alerts(metrics)
        
        # Log metrics
        with open(self.metrics_file, "a", encoding="utf-8") as f:
            f.write(f"{json.dumps(metrics)}\n")
        
        # Print status
        print(f"CPU: {metrics['cpu_percent']:.1f}% | "
              f"Memory: {metrics['memory_percent']:.1f}% | "
              f"API: {metrics.get('api_status', 'unknown')}")
        
        # Handle alerts
        if alerts:
            for alert in alerts:
                print(f"ALERT: {alert}")
        else:
            print("All systems normal")
        
        return metrics, alerts
    
    def run_daemon(self, interval=60):
        """Run monitoring daemon"""
        print(f"Starting Lokifi Performance Monitor (interval: {interval}s)")
        
        try:
            while True:
                self.run_monitoring_cycle()
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\nMonitoring stopped by user")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--interval", type=int, default=60, help="Monitoring interval")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    
    args = parser.parse_args()
    
    monitor = LokifiMonitor()
    
    if args.once:
        monitor.run_monitoring_cycle()
    else:
        monitor.run_daemon(args.interval)
