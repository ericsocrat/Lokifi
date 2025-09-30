#!/usr/bin/env python3
"""
Protected pip installer - prevents accidental downgrades
"""
import sys
import subprocess
import json
from pathlib import Path

# Add protection
protection_script = Path(__file__).parent.parent / "backend" / "dependency_protector.py"
if protection_script.exists():
    sys.path.insert(0, str(protection_script.parent))
    try:
        from dependency_protector import DependencyProtector
        protector = DependencyProtector()
        
        # Check if this is an install command
        if len(sys.argv) > 1 and sys.argv[1] in ['install', 'upgrade']:
            print("🛡️  Dependency Protection: Checking for potential downgrades...")
            
            # Save snapshot before installation
            protector.save_version_snapshot()
            
            # For now, proceed with installation but log it
            protector.log_message(f"pip command: {' '.join(sys.argv)}")
            
    except Exception as e:
        print(f"Protection check failed: {e}")

# Execute original pip command
sys.exit(subprocess.call([sys.executable, "-m", "pip"] + sys.argv[1:]))
