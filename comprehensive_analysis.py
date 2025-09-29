#!/usr/bin/env python3
"""
Comprehensive Codebase Health & Quality Analysis Report
====================================================

This script performs a thorough analysis of the codebase including:
- Security vulnerabilities and hardcoded secrets
- Configuration and environment variables
- Code quality metrics and file statistics
- Dependency analysis
- Infrastructure setup
- Testing coverage
- Documentation quality
- Overall health assessment with recommendations
"""

import re
import os
from pathlib import Path
import json
from datetime import datetime

def analyze_security_and_quality():
    """Comprehensive security and quality analysis."""
    print("=== COMPREHENSIVE CODEBASE HEALTH & QUALITY REPORT ===\n")
    
    # Security Analysis
    print("📋 SECURITY ANALYSIS")
    print("=" * 50)
    
    # Look for hardcoded secrets (patterns for detection)
    secrets_patterns = [
        (r'password\s*=\s*["\']([^"\']+)["\']', 'Hardcoded Password'),
        (r'secret[_-]?key\s*=\s*["\']([^"\']+)["\']', 'Hardcoded Secret Key'), 
        (r'api[_-]?key\s*=\s*["\']([^"\']+)["\']', 'Hardcoded API Key'),
        (r'token\s*=\s*["\']([^"\']+)["\']', 'Hardcoded Token'),
        (r'(?<!patterns.*)(dev-secret|dev-insecure|change-this|your-secret)(?!.*patterns)', 'Development Secret in Production'),
    ]
    
    # File patterns to analyze
    file_patterns = ['*.py', '*.js', '*.ts', '*.jsx', '*.tsx', '*.env*', '*.json', '*.yml', '*.yaml']
    
    security_issues = []
    for pattern in file_patterns:
        for file_path in Path('.').rglob(pattern):
            if file_path.is_file() and 'venv' not in str(file_path) and '.git' not in str(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        for secret_pattern, issue_type in secrets_patterns:
                            matches = re.finditer(secret_pattern, content, re.IGNORECASE)
                            for match in matches:
                                security_issues.append({
                                    'file': str(file_path),
                                    'type': issue_type,
                                    'line': content[:match.start()].count('\n') + 1,
                                    'match': match.group(1) if len(match.groups()) > 0 else match.group(0)
                                })
                except Exception:
                    pass
    
    print(f"Found {len(security_issues)} potential security issues:")
    for issue in security_issues[:10]:  # Show first 10
        print(f"  ⚠️  {issue['type']} in {issue['file']}:{issue['line']}")
    
    if len(security_issues) > 10:
        print(f"  ... and {len(security_issues) - 10} more issues")
    
    # Configuration Analysis
    print("\n📋 CONFIGURATION ANALYSIS")
    print("=" * 50)
    
    config_files = []
    for pattern in ['*.env*', 'config.py', 'settings.py', '*.ini', '*.conf']:
        for file_path in Path('.').rglob(pattern):
            if file_path.is_file() and 'venv' not in str(file_path):
                config_files.append(str(file_path))
    
    print(f"Configuration files found: {len(config_files)}")
    for config_file in config_files[:5]:
        print(f"  📄 {config_file}")
    
    # Environment Variables Analysis
    env_vars_found = set()
    for file_path in Path('.').rglob('*.py'):
        if 'venv' not in str(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    env_matches = re.findall(r'os\.getenv\(["\'](.{0,50}?)["\']', content)
                    env_vars_found.update(env_matches)
                    env_matches = re.findall(r'Field\(.*alias=["\'](.{0,50}?)["\']', content)
                    env_vars_found.update(env_matches)
            except Exception:
                pass
    
    print(f"\nEnvironment variables referenced: {len(env_vars_found)}")
    critical_env_vars = [var for var in env_vars_found if any(keyword in var.lower() for keyword in ['secret', 'key', 'password', 'token'])]
    print(f"Critical environment variables: {len(critical_env_vars)}")
    for var in sorted(critical_env_vars)[:10]:
        print(f"  🔑 {var}")
    
    print("\n📋 CODE QUALITY METRICS")
    print("=" * 50)
    
    # Count files and lines
    total_files = 0
    total_lines = 0
    file_types = {}
    
    for file_path in Path('.').rglob('*'):
        if file_path.is_file() and 'venv' not in str(file_path) and '.git' not in str(file_path):
            total_files += 1
            ext = file_path.suffix.lower()
            file_types[ext] = file_types.get(ext, 0) + 1
            
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    total_lines += len(f.readlines())
            except Exception:
                pass
    
    print(f"Total files: {total_files}")
    print(f"Total lines of code: {total_lines:,}")
    print(f"File types:")
    for ext, count in sorted(file_types.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {ext or 'no extension'}: {count} files")
    
    print("\n📋 DEPENDENCY ANALYSIS")
    print("=" * 50)
    
    # Check for package files
    package_files = []
    for pattern in ['package.json', 'requirements.txt', 'pyproject.toml', 'Pipfile', 'poetry.lock']:
        for file_path in Path('.').rglob(pattern):
            package_files.append(str(file_path))
    
    print(f"Package files found: {len(package_files)}")
    for pkg_file in package_files:
        print(f"  📦 {pkg_file}")
    
    print("\n📋 INFRASTRUCTURE ANALYSIS")
    print("=" * 50)
    
    # Check for infrastructure files
    infra_files = []
    for pattern in ['Dockerfile*', 'docker-compose*.yml', '*.k8s.yaml']:
        for file_path in Path('.').rglob(pattern):
            if file_path.is_file():
                infra_files.append(str(file_path))
    
    print(f"Infrastructure files found: {len(infra_files)}")
    for infra_file in infra_files[:10]:
        print(f"  🏗️  {infra_file}")
    
    print("\n📋 TESTING COVERAGE")
    print("=" * 50)
    
    # Find test files
    test_files = []
    for pattern in ['test_*.py', '*_test.py', '*.test.js', '*.test.ts', '*.spec.js', '*.spec.ts']:
        for file_path in Path('.').rglob(pattern):
            if file_path.is_file() and 'venv' not in str(file_path):
                test_files.append(str(file_path))
    
    print(f"Test files found: {len(test_files)}")
    for test_file in test_files[:5]:
        print(f"  🧪 {test_file}")
    
    print("\n📋 DOCUMENTATION ANALYSIS")
    print("=" * 50)
    
    # Find documentation files
    doc_files = []
    for pattern in ['README*', '*.md']:
        for file_path in Path('.').rglob(pattern):
            if file_path.is_file():
                doc_files.append(str(file_path))
    
    print(f"Documentation files found: {len(doc_files)}")
    for doc_file in doc_files[:10]:
        print(f"  📚 {doc_file}")
    
    print("\n📋 OVERALL HEALTH ASSESSMENT")
    print("=" * 50)
    
    health_score = 100
    health_issues = []
    
    # Deduct points for security issues
    if len(security_issues) > 0:
        deduction = min(30, len(security_issues) * 3)
        health_score -= deduction
        health_issues.append(f"Security Issues (-{deduction} points)")
    
    # Check for missing .env file
    env_files = list(Path('.').glob('.env*'))
    if not env_files:
        health_score -= 10
        health_issues.append("Missing .env file (-10 points)")
    
    # Check test coverage
    if len(test_files) == 0:
        health_score -= 15
        health_issues.append("No test files found (-15 points)")
    elif len(test_files) < 5:
        health_score -= 5
        health_issues.append("Limited test coverage (-5 points)")
    
    # Check documentation
    readme_files = [f for f in doc_files if 'readme' in f.lower()]
    if not readme_files:
        health_score -= 10
        health_issues.append("Missing README file (-10 points)")
    
    print(f"🏥 HEALTH SCORE: {health_score}/100")
    
    if health_score >= 90:
        print("🟢 EXCELLENT - Production ready!")
    elif health_score >= 80:
        print("🟡 GOOD - Minor improvements needed")
    elif health_score >= 70:
        print("🟠 FAIR - Several issues to address")
    else:
        print("🔴 POOR - Major improvements required")
    
    if health_issues:
        print("\nIssues affecting score:")
        for issue in health_issues:
            print(f"  • {issue}")
    
    print("\n📋 RECOMMENDATIONS")
    print("=" * 50)
    
    recommendations = []
    
    if len(security_issues) > 0:
        recommendations.append("🔒 Address security issues by using environment variables for secrets")
    
    if not env_files:
        recommendations.append("📄 Create .env file for environment configuration")
    
    if len(test_files) < 10:
        recommendations.append("🧪 Increase test coverage")
    
    if not readme_files:
        recommendations.append("📚 Add comprehensive README documentation")
    
    recommendations.extend([
        "🔧 Run security linting tools regularly",
        "📊 Implement code quality metrics tracking",
        "🚀 Set up CI/CD pipeline for automated checks",
        "📝 Document API endpoints and architecture",
        "🔄 Regular dependency updates and security patches"
    ])
    
    for i, rec in enumerate(recommendations, 1):
        print(f"{i:2d}. {rec}")
    
    print("\n=== END OF REPORT ===")
    
    # Save summary to file
    summary = {
        "timestamp": datetime.now().isoformat(),
        "health_score": health_score,
        "security_issues_count": len(security_issues),
        "total_files": total_files,
        "total_lines": total_lines,
        "test_files_count": len(test_files),
        "doc_files_count": len(doc_files),
        "recommendations": recommendations
    }
    
    with open("health_report_summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n📊 Summary saved to: health_report_summary.json")

if __name__ == "__main__":
    analyze_security_and_quality()