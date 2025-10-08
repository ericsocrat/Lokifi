#!/usr/bin/env python3
"""
Lokifi Backend Startup Script

Simple Python script to start the Lokifi backend servers
"""

import os
import subprocess
import sys
from pathlib import Path


def main():
    # Set up paths
    backend_dir = Path(__file__).parent
    venv_python = backend_dir / "venv" / "Scripts" / "python.exe"
    
    # Check if virtual environment exists
    if not venv_python.exists():
        print("❌ Virtual environment not found at venv\\Scripts\\python.exe")
        print("Please ensure the virtual environment is set up correctly.")
        sys.exit(1)
    
    # Set Python path
    os.environ["PYTHONPATH"] = str(backend_dir)
    
    # Parse arguments
    if len(sys.argv) < 2:
        server_type = "main"
        port = 8002
    else:
        server_type = sys.argv[1].lower()
        port = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 8002
    
    print("🚀 Lokifi Backend Startup Script v2.0")
    print("Latest Dependencies: FastAPI 0.118.0, SQLAlchemy 2.0.43")
    print("============================================")
    print(f"📋 Server: {server_type}, Port: {port}")
    
    # Change to backend directory
    os.chdir(backend_dir)
    
    try:
        if server_type == "main":
            print(f"🌟 Starting Main Lokifi Server on port {port}...")
            print(f"📡 Health endpoint: http://localhost:{port}/api/health")
            print(f"📚 API endpoints: http://localhost:{port}/docs")
            print()
            subprocess.run([
                str(venv_python), "-m", "uvicorn", "app.main:app", 
                "--host", "0.0.0.0", "--port", str(port), "--reload"
            ])
        elif server_type == "stress":
            print("⚡ Starting Stress Test Server on port 8001...")
            print("📡 Health endpoint: http://localhost:8001/health")
            print()
            subprocess.run([str(venv_python), "stress_test_server.py"])
        elif server_type == "verify":
            print("🔍 Running verification tests...")
            subprocess.run([str(venv_python), "verify_setup.py"])
        else:
            print(f"❌ Unknown server type: {server_type}")
            print("Available options:")
            print("  main [port]  - Start main Lokifi server (default port 8002)")
            print("  stress       - Start stress test server (port 8001)")
            print("  verify       - Run verification tests")
            print()
            print("Examples:")
            print("  python start_server.py main")
            print("  python start_server.py main 8000")
            print("  python start_server.py stress")
            print("  python start_server.py verify")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Server startup failed: {e}")


if __name__ == "__main__":
    main()