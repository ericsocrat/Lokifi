#!/usr/bin/env python3
"""
Simple startup script that can import and run the app properly
"""
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    import uvicorn
    from app.main import app
    
    print("🚀 Starting Fynix Backend Server...")
    print("📡 Health: http://localhost:8002/api/health") 
    print("📚 Docs: http://localhost:8002/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8002,
        reload=False,  # Disable reload for stability
        log_level="info"
    )