#!/usr/bin/env python3
"""
Server startup script for J5 AI Chatbot
"""
import subprocess
import sys
import os

def start_server():
    """Start the FastAPI server from the correct directory"""
    # Get the backend directory path
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    python_exe = os.path.join(backend_dir, 'venv', 'Scripts', 'python.exe')
    
    print(f"🚀 Starting J5 AI Chatbot server...")
    print(f"📁 Working directory: {backend_dir}")
    print(f"🐍 Python executable: {python_exe}")
    print(f"🌐 Server will be available at: http://localhost:8000")
    print(f"📡 WebSocket available at: ws://localhost:8000/ws/ai")
    print(f"📚 API docs at: http://localhost:8000/docs")
    print()
    
    # Change to backend directory
    os.chdir(backend_dir)
    
    # Start server using subprocess
    try:
        subprocess.run([
            python_exe, '-m', 'uvicorn', 
            'app.main:app', 
            '--host', '0.0.0.0', 
            '--port', '8000', 
            '--reload'
        ], cwd=backend_dir)
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Server startup failed: {e}")

if __name__ == "__main__":
    start_server()