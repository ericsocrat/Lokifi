"""#!/usr/bin/env python3#!/usr/bin/env python3

Fynix Backend Startup Script

Simple Python script to start the Fynix backend servers""""""

"""

Fynix Backend Startup ScriptServer startup script for J5 AI Chatbot

import sys

import subprocessSimple Python script to start the Fynix backend servers"""

import os

from pathlib import Path"""import subprocess



def main():import sys

    # Set up paths

    backend_dir = Path(__file__).parentimport sysimport os

    venv_python = backend_dir / "venv" / "Scripts" / "python.exe"

    import subprocess

    # Check if virtual environment exists

    if not venv_python.exists():import osdef start_server():

        print("❌ Virtual environment not found at venv\\Scripts\\python.exe")

        print("Please ensure the virtual environment is set up correctly.")from pathlib import Path    """Start the FastAPI server from the correct directory"""

        sys.exit(1)

        # Get the backend directory path

    # Set Python path

    os.environ["PYTHONPATH"] = str(backend_dir)def main():    backend_dir = os.path.dirname(os.path.abspath(__file__))

    

    # Parse arguments    # Set up paths    python_exe = os.path.join(backend_dir, 'venv', 'Scripts', 'python.exe')

    if len(sys.argv) < 2:

        server_type = "main"    backend_dir = Path(__file__).parent    

        port = 8002

    else:    venv_python = backend_dir / "venv" / "Scripts" / "python.exe"    print(f"🚀 Starting J5 AI Chatbot server...")

        server_type = sys.argv[1].lower()

        port = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 8002        print(f"📁 Working directory: {backend_dir}")

    

    print("🚀 Fynix Backend Startup Script v2.0")    # Check if virtual environment exists    print(f"🐍 Python executable: {python_exe}")

    print("Latest Dependencies: FastAPI 0.118.0, SQLAlchemy 2.0.43")

    print("============================================")    if not venv_python.exists():    print(f"🌐 Server will be available at: http://localhost:8000")

    print(f"📋 Server: {server_type}, Port: {port}")

            print("❌ Virtual environment not found at venv\\Scripts\\python.exe")    print(f"📡 WebSocket available at: ws://localhost:8000/ws/ai")

    os.chdir(backend_dir)

            print("Please ensure the virtual environment is set up correctly.")    print(f"📚 API docs at: http://localhost:8000/docs")

    if server_type == "main":

        print(f"🌟 Starting Main Fynix Server on port {port}...")        sys.exit(1)    print()

        print(f"📡 Health endpoint: http://localhost:{port}/api/health")

        print(f"📚 API endpoints: http://localhost:{port}/docs")        

        print()

        subprocess.run([    # Set Python path    # Change to backend directory

            str(venv_python), "-m", "uvicorn", "app.main:app", 

            "--host", "0.0.0.0", "--port", str(port), "--reload"    os.environ["PYTHONPATH"] = str(backend_dir)    os.chdir(backend_dir)

        ])

    elif server_type == "stress":        

        print("⚡ Starting Stress Test Server on port 8001...")

        print("📡 Health endpoint: http://localhost:8001/health")    # Parse arguments    # Start server using subprocess

        print()

        subprocess.run([str(venv_python), "stress_test_server.py"])    if len(sys.argv) < 2:    try:

    elif server_type == "verify":

        print("🔍 Running verification tests...")        server_type = "main"        subprocess.run([

        subprocess.run([str(venv_python), "verify_setup.py"])

    else:        port = 8002            python_exe, '-m', 'uvicorn', 

        print(f"❌ Unknown server type: {server_type}")

        print("Available options:")    else:            'app.main:app', 

        print("  main [port]  - Start main Fynix server (default port 8002)")

        print("  stress       - Start stress test server (port 8001)")        server_type = sys.argv[1].lower()            '--host', '0.0.0.0', 

        print("  verify       - Run verification tests")

        print()        port = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 8002            '--port', '8000', 

        print("Examples:")

        print("  python start_server.py main")                '--reload'

        print("  python start_server.py main 8000")

        print("  python start_server.py stress")    print("🚀 Fynix Backend Startup Script v2.0")        ], cwd=backend_dir)

        print("  python start_server.py verify")

        sys.exit(1)    print("Latest Dependencies: FastAPI 0.118.0, SQLAlchemy 2.0.43")    except KeyboardInterrupt:



if __name__ == "__main__":    print("============================================")        print("\n👋 Server stopped by user")

    main()
    print(f"📋 Server: {server_type}, Port: {port}")    except Exception as e:

            print(f"❌ Server startup failed: {e}")

    os.chdir(backend_dir)

    if __name__ == "__main__":

    if server_type == "main":    start_server()
        print(f"🌟 Starting Main Fynix Server on port {port}...")
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
        print("  main [port]  - Start main Fynix server (default port 8002)")
        print("  stress       - Start stress test server (port 8001)")
        print("  verify       - Run verification tests")
        print()
        print("Examples:")
        print("  python start_server.py main")
        print("  python start_server.py main 8000")
        print("  python start_server.py stress")
        print("  python start_server.py verify")
        sys.exit(1)

if __name__ == "__main__":
    main()