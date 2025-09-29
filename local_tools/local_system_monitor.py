#!/usr/bin/env python3
"""
Fynix Local System Monitor
Real-time monitoring for local development
"""

import psutil
import time
import json
from datetime import datetime
from pathlib import Path

class LocalSystemMonitor:
    def __init__(self):
        self.metrics_file = Path("local_metrics.log")
        self.running = True
    
    def get_system_metrics(self):
        """Get current system metrics"""
        return {
            "timestamp": datetime.now().isoformat(),
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory": {
                "percent": psutil.virtual_memory().percent,
                "available_gb": psutil.virtual_memory().available / (1024**3),
                "used_gb": psutil.virtual_memory().used / (1024**3)
            },
            "disk": {
                "percent": psutil.disk_usage('/').percent,
                "free_gb": psutil.disk_usage('/').free / (1024**3)
            },
            "network": {
                "bytes_sent": psutil.net_io_counters().bytes_sent,
                "bytes_recv": psutil.net_io_counters().bytes_recv
            }
        }
    
    def check_local_services(self):
        """Check if local services are running"""
        services = {}
        
        # Check common development ports
        connections = psutil.net_connections()
        active_ports = {conn.laddr.port for conn in connections if conn.status == 'LISTEN'}
        
        services["backend_8000"] = 8000 in active_ports
        services["frontend_3000"] = 3000 in active_ports
        services["redis_6379"] = 6379 in active_ports
        services["postgres_5432"] = 5432 in active_ports
        
        return services
    
    def monitor_once(self):
        """Run monitoring cycle once"""
        metrics = self.get_system_metrics()
        services = self.check_local_services()
        
        combined_data = {
            **metrics,
            "services": services
        }
        
        # Log to file
        with open(self.metrics_file, "a", encoding="utf-8") as f:
            f.write(f"{json.dumps(combined_data)}\n")
        
        # Print current status
        print(f"[{metrics['timestamp']}]")
        print(f"CPU: {metrics['cpu_percent']:.1f}% | "
              f"Memory: {metrics['memory']['percent']:.1f}% | "
              f"Disk: {metrics['disk']['percent']:.1f}%")
        
        # Print service status
        service_status = []
        for service, running in services.items():
            status = "🟢" if running else "🔴"
            service_status.append(f"{service}: {status}")
        
        print("Services: " + " | ".join(service_status))
        
        # Alert on high usage
        if metrics['cpu_percent'] > 80:
            print("⚠️ HIGH CPU USAGE!")
        if metrics['memory']['percent'] > 85:
            print("⚠️ HIGH MEMORY USAGE!")
        
        return combined_data
    
    def monitor_continuous(self, interval=10):
        """Run continuous monitoring"""
        print(f"🖥️ Starting local system monitoring (interval: {interval}s)")
        print("Press Ctrl+C to stop")
        
        try:
            while self.running:
                self.monitor_once()
                print("-" * 50)
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\n🛑 Monitoring stopped")
        except Exception as e:
            print(f"❌ Monitoring error: {e}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Local System Monitor")
    parser.add_argument("--interval", type=int, default=10, help="Monitoring interval")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    
    args = parser.parse_args()
    
    monitor = LocalSystemMonitor()
    
    if args.once:
        monitor.monitor_once()
    else:
        monitor.monitor_continuous(args.interval)
