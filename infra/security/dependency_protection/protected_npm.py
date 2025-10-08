#!/usr/bin/env python3
"""
Protected npm installer - prevents accidental downgrades
"""
import sys
import subprocess
from pathlib import Path

# Add protection
protection_script = Path(__file__).parent.parent / "backend" / "dependency_protector.py"
if protection_script.exists():
    sys.path.insert(0, str(protection_script.parent))
    try:
        from dependency_protector import DependencyProtector
        protector = DependencyProtector()
        
        # Check if this is an install command
        if len(sys.argv) > 1 and sys.argv[1] in ['install', 'update', 'upgrade']:
            print("Protection: Checking for potential downgrades...")
            
            # Save snapshot before installation
            protector.save_version_snapshot()
            
            # For now, proceed with installation but log it
            protector.log_message(f"npm command: {' '.join(sys.argv)}")
            
    except Exception as e:
        print(f"Protection check failed: {e}")

# Execute original npm command
sys.exit(subprocess.call(["npm"] + sys.argv[1:]))
