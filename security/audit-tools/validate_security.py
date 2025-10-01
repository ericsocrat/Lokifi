#!/usr/bin/env python3
"""
Security Validation Script for Lokifi
====================================

This script validates that all security configurations are properly set
and no hardcoded secrets remain in the codebase.
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple, Any

class SecurityValidator:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.errors = []
        self.warnings = []
        self._load_env_file()
        
    def _load_env_file(self):
        """Load environment variables from .env file if it exists."""
        env_file = self.project_root / ".env"
        if env_file.exists():
            try:
                with open(env_file, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, value = line.split('=', 1)
                            if key not in os.environ:
                                os.environ[key] = value
            except Exception as e:
                self.warnings.append(f"Could not load .env file: {e}")
        
    def validate_environment_variables(self) -> bool:
        """Validate that required environment variables are set."""
        required_vars = [
            "LOKIFI_JWT_SECRET",
            "SECRET_KEY"
        ]
        
        missing_vars = []
        weak_vars = []
        
        for var in required_vars:
            value = os.getenv(var)
            if not value:
                missing_vars.append(var)
            elif self._is_weak_secret(value):
                weak_vars.append(var)
        
        if missing_vars:
            self.errors.append(f"Missing required environment variables: {', '.join(missing_vars)}")
        
        if weak_vars:
            self.warnings.append(f"Weak secrets detected in: {', '.join(weak_vars)}")
        
        return len(missing_vars) == 0
    
    def _is_weak_secret(self, secret: str) -> bool:
        """Check if a secret is weak or appears to be a development default."""
        weak_patterns = [
            r'dev[-_].*',
            r'test[-_].*',
            r'change[-_]this',
            r'your[-_]secret',
            r'admin123',
            r'password123',
            r'default.*',
        ]
        
        for pattern in weak_patterns:
            if re.match(pattern, secret.lower()):
                return True
        
        # Check for minimum length
        if len(secret) < 32:
            return True
        
        return False
    
    def scan_for_hardcoded_secrets(self) -> List[Tuple[str, int, str]]:
        """Scan codebase for hardcoded secrets."""
        secret_patterns = [
            (r'password\s*=\s*["\']([^"\']{3,})["\']', 'Hardcoded Password'),
            (r'secret[_-]?key\s*=\s*["\']([^"\']{3,})["\']', 'Hardcoded Secret Key'),
            (r'api[_-]?key\s*=\s*["\']([^"\']{3,})["\']', 'Hardcoded API Key'),
            (r'token\s*=\s*["\']([^"\']{3,})["\']', 'Hardcoded Token'),
            (r'dev-secret|dev-insecure|change-this|your-secret|admin123', 'Development Secret'),
        ]
        
        file_patterns = ['*.py', '*.js', '*.ts', '*.tsx', '*.yml', '*.yaml', '*.json']
        exclude_patterns = ['venv', '.git', 'node_modules', '__pycache__', '.next']
        exclude_files = ['comprehensive_analysis.py', 'validate_security.py', 'generate_secrets.py']
        
        findings = []
        
        for pattern in file_patterns:
            for file_path in self.project_root.rglob(pattern):
                # Skip excluded directories and analysis files
                if any(excl in str(file_path) for excl in exclude_patterns):
                    continue
                if any(file_path.name == excl_file for excl_file in exclude_files):
                    continue
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        for line_num, line in enumerate(content.splitlines(), 1):
                            for secret_pattern, issue_type in secret_patterns:
                                if re.search(secret_pattern, line, re.IGNORECASE):
                                    findings.append((str(file_path), line_num, issue_type))
                except Exception:
                    continue
        
        return findings
    
    def validate_env_file_security(self) -> bool:
        """Check .env file security."""
        env_files = ['.env', '.env.production', '.env.local']
        issues = []
        
        for env_file in env_files:
            env_path = self.project_root / env_file
            if env_path.exists():
                # Check file permissions (Unix-like systems)
                try:
                    stat = env_path.stat()
                    mode = stat.st_mode & 0o777
                    if mode & 0o077:  # Check if readable by group/others
                        issues.append(f"{env_file} has insecure permissions: {oct(mode)}")
                except:
                    pass
        
        if issues:
            self.warnings.extend(issues)
        
        return len(issues) == 0
    
    def validate_docker_compose_security(self) -> bool:
        """Check Docker Compose files for hardcoded secrets."""
        compose_files = list(self.project_root.glob('docker-compose*.yml'))
        issues = []
        
        for compose_file in compose_files:
            try:
                with open(compose_file, 'r') as f:
                    content = f.read()
                    # Look for hardcoded passwords in environment variables
                    hardcoded_patterns = [
                        r'PASSWORD=(?!\$\{)[^$\n]+',
                        r'SECRET=(?!\$\{)[^$\n]+',
                        r'KEY=(?!\$\{)[^$\n]+',
                    ]
                    
                    for pattern in hardcoded_patterns:
                        matches = re.findall(pattern, content)
                        for match in matches:
                            if not match.startswith('${'):
                                issues.append(f"{compose_file.name}: Hardcoded secret detected: {match}")
            except Exception:
                continue
        
        if issues:
            self.errors.extend(issues)
        
        return len(issues) == 0
    
    def run_full_validation(self) -> Dict[str, Any]:
        """Run complete security validation."""
        print("🔒 Running Lokifi Security Validation...")
        print("=" * 50)
        
        results = {
            'env_vars_valid': self.validate_environment_variables(),
            'env_file_secure': self.validate_env_file_security(),
            'docker_secure': self.validate_docker_compose_security(),
            'hardcoded_secrets': self.scan_for_hardcoded_secrets(),
            'errors': self.errors,
            'warnings': self.warnings
        }
        
        # Display results
        print(f"✅ Environment Variables: {'PASS' if results['env_vars_valid'] else 'FAIL'}")
        print(f"✅ Environment File Security: {'PASS' if results['env_file_secure'] else 'FAIL'}")
        print(f"✅ Docker Compose Security: {'PASS' if results['docker_secure'] else 'FAIL'}")
        print(f"🔍 Hardcoded Secrets Found: {len(results['hardcoded_secrets'])}")
        
        if results['hardcoded_secrets']:
            print("\n⚠️  Hardcoded Secrets Found:")
            for file_path, line_num, issue_type in results['hardcoded_secrets'][:10]:
                print(f"   {issue_type} in {file_path}:{line_num}")
            if len(results['hardcoded_secrets']) > 10:
                print(f"   ... and {len(results['hardcoded_secrets']) - 10} more")
        
        if self.errors:
            print("\n❌ Errors:")
            for error in self.errors:
                print(f"   {error}")
        
        if self.warnings:
            print("\n⚠️  Warnings:")
            for warning in self.warnings:
                print(f"   {warning}")
        
        # Overall status
        overall_pass = (
            results['env_vars_valid'] and 
            results['docker_secure'] and 
            len(results['hardcoded_secrets']) == 0
        )
        
        print("\n" + "=" * 50)
        if overall_pass:
            print("🟢 SECURITY VALIDATION PASSED")
        else:
            print("🔴 SECURITY VALIDATION FAILED")
        
        print("\n📋 Recommendations:")
        if not results['env_vars_valid']:
            print("   1. Set all required environment variables")
        if len(results['hardcoded_secrets']) > 0:
            print("   2. Replace hardcoded secrets with environment variables")
        if not results['docker_secure']:
            print("   3. Update Docker Compose files to use environment variables")
        
        print("   4. Run ./generate_secrets.py to create secure secrets")
        print("   5. Set restrictive permissions on .env files (chmod 600)")
        print("   6. Never commit .env files to version control")
        
        return results

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Validate Lokifi security configuration")
    parser.add_argument("--project-root", default=".", help="Project root directory")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    
    args = parser.parse_args()
    
    validator = SecurityValidator(args.project_root)
    results = validator.run_full_validation()
    
    if args.json:
        import json
        # Make results JSON serializable
        json_results = {k: v for k, v in results.items() if k != 'hardcoded_secrets'}
        json_results['hardcoded_secrets_count'] = len(results['hardcoded_secrets'])
        print(json.dumps(json_results, indent=2))
    
    # Exit with error code if validation failed
    if results['errors'] or len(results['hardcoded_secrets']) > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()