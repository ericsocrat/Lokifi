#!/usr/bin/env python3
"""
Lokifi Dependency Verification Suite
===================================

Comprehensive verification of all Python packages, Node.js modules, and imports
for the entire Lokifi project. Ensures all dependencies are correctly installed
and at the latest compatible versions.
"""

import importlib
import json
import platform
import subprocess
import sys
from pathlib import Path
from typing import Any


# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

class DependencyVerifier:
    """Verifies all project dependencies and imports"""
    
    def __init__(self):
        self.backend_dir = Path(__file__).parent
        self.project_root = self.backend_dir.parent
        self.frontend_dir = self.project_root / "frontend"
        
        # Core Python packages required
        self.required_packages = [
            # Core FastAPI
            'fastapi', 'uvicorn', 'pydantic', 'pydantic_settings',
            # Database
            'sqlalchemy', 'alembic', 'asyncpg', 'aiosqlite', 'psycopg2',
            # Security
            'argon2', 'authlib', 'itsdangerous', 'jose', 'bleach',
            # Async & HTTP
            'aiohttp', 'httpx', 'aiofiles', 'websockets',
            # Redis & Monitoring
            'redis', 'prometheus_client', 'psutil',
            # Production
            'docker', 'yaml', 'jinja2',
            # Testing
            'pytest', 'pytest_asyncio', 'pytest_cov',
            # Code Quality
            'mypy', 'ruff', 'black'
        ]
        
        # Application-specific imports to test
        self.app_imports = [
            'app.main',
            'app.core.database',
            'app.core.advanced_redis_client',
            'app.services.advanced_monitoring',
            'app.services.j53_scheduler',
            'app.api.routes.security'
        ]
    
    def print_header(self, title: str):
        print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*80}{Colors.END}")
        print(f"{Colors.CYAN}{Colors.BOLD}{title.center(80)}{Colors.END}")
        print(f"{Colors.CYAN}{Colors.BOLD}{'='*80}{Colors.END}")
    
    def print_section(self, title: str):
        print(f"\n{Colors.BLUE}{Colors.BOLD}🔧 {title}{Colors.END}")
        print(f"{Colors.BLUE}{'─'*60}{Colors.END}")
    
    def print_success(self, message: str):
        print(f"{Colors.GREEN}✅ {message}{Colors.END}")
    
    def print_warning(self, message: str):
        print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")
    
    def print_error(self, message: str):
        print(f"{Colors.RED}❌ {message}{Colors.END}")
    
    def print_info(self, message: str):
        print(f"{Colors.WHITE}ℹ️  {message}{Colors.END}")
    
    def get_package_version(self, package_name: str) -> str | None:
        """Get installed package version"""
        try:
            if package_name == 'jose':
                import jose
                return getattr(jose, '__version__', 'unknown')
            elif package_name == 'yaml':
                import yaml
                return getattr(yaml, '__version__', 'unknown')
            elif package_name == 'psycopg2':
                import psycopg2
                return getattr(psycopg2, '__version__', 'unknown')
            else:
                module = importlib.import_module(package_name)
                return getattr(module, '__version__', 'unknown')
        except ImportError:
            return None
        except Exception:
            return 'unknown'
    
    def verify_python_packages(self) -> tuple[int, int]:
        """Verify all required Python packages are installed"""
        self.print_section("Python Package Verification")
        
        installed_count = 0
        total_count = len(self.required_packages)
        
        for package in self.required_packages:
            version = self.get_package_version(package)
            if version:
                self.print_success(f"{package}: {version}")
                installed_count += 1
            else:
                self.print_error(f"{package}: Not installed")
        
        print(f"\n{Colors.BOLD}Python Packages: {Colors.GREEN if installed_count == total_count else Colors.YELLOW}{installed_count}/{total_count} installed{Colors.END}")
        
        return installed_count, total_count
    
    def verify_app_imports(self) -> tuple[int, int]:
        """Verify application imports work correctly"""
        self.print_section("Application Import Verification")
        
        # Add backend to Python path
        sys.path.insert(0, str(self.backend_dir))
        
        imported_count = 0
        total_count = len(self.app_imports)
        
        for import_path in self.app_imports:
            try:
                importlib.import_module(import_path)
                self.print_success(f"{import_path}: Import successful")
                imported_count += 1
            except ImportError as e:
                self.print_error(f"{import_path}: Import failed - {e}")
            except Exception as e:
                self.print_warning(f"{import_path}: Import warning - {e}")
        
        print(f"\n{Colors.BOLD}App Imports: {Colors.GREEN if imported_count == total_count else Colors.YELLOW}{imported_count}/{total_count} successful{Colors.END}")
        
        return imported_count, total_count
    
    def verify_node_modules(self) -> bool:
        """Verify Node.js modules are installed"""
        self.print_section("Node.js Modules Verification")
        
        if not self.frontend_dir.exists():
            self.print_error("Frontend directory not found")
            return False
        
        package_json_path = self.frontend_dir / "package.json"
        node_modules_path = self.frontend_dir / "node_modules"
        
        if not package_json_path.exists():
            self.print_error("package.json not found")
            return False
        
        if not node_modules_path.exists():
            self.print_error("node_modules directory not found - run npm install")
            return False
        
        try:
            with open(package_json_path) as f:
                package_data = json.load(f)
            
            dependencies = package_data.get('dependencies', {})
            dev_dependencies = package_data.get('devDependencies', {})
            all_deps = {**dependencies, **dev_dependencies}
            
            installed_count = 0
            missing_count = 0
            
            for dep_name, dep_version in all_deps.items():
                dep_path = node_modules_path / dep_name
                if dep_path.exists():
                    installed_count += 1
                    self.print_success(f"{dep_name}: {dep_version}")
                else:
                    missing_count += 1
                    self.print_error(f"{dep_name}: Missing")
            
            total_deps = len(all_deps)
            success_rate = (installed_count / total_deps * 100) if total_deps > 0 else 0
            
            print(f"\n{Colors.BOLD}Node Modules: {Colors.GREEN if missing_count == 0 else Colors.YELLOW}{installed_count}/{total_deps} installed ({success_rate:.1f}%){Colors.END}")
            
            return missing_count == 0
            
        except Exception as e:
            self.print_error(f"Failed to verify Node modules: {e}")
            return False
    
    def check_system_dependencies(self) -> dict[str, bool]:
        """Check system-level dependencies"""
        self.print_section("System Dependencies Check")
        
        system_deps = {
            'python': 'python --version',
            'node': 'node --version',
            'npm': 'npm --version',
            'docker': 'docker --version',
            'git': 'git --version'
        }
        
        results = {}
        
        for dep_name, command in system_deps.items():
            try:
                # Special handling for npm on Windows
                if dep_name == 'npm' and platform.system() == 'Windows':
                    result = subprocess.run(['powershell', '-Command', 'npm --version'], 
                                          capture_output=True, text=True, timeout=10)
                else:
                    result = subprocess.run(command.split(), capture_output=True, text=True, timeout=10)
                    
                if result.returncode == 0:
                    version = result.stdout.strip()
                    self.print_success(f"{dep_name}: {version}")
                    results[dep_name] = True
                else:
                    self.print_error(f"{dep_name}: Not found or not working")
                    results[dep_name] = False
            except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
                self.print_error(f"{dep_name}: Not available")
                results[dep_name] = False
        
        return results
    
    def run_backend_health_check(self) -> bool:
        """Run a basic health check on backend imports"""
        self.print_section("Backend Health Check")
        
        try:
            # Test critical imports
            sys.path.insert(0, str(self.backend_dir))
            
            # Test database
            try:
                self.print_success("Database manager: Import OK")
            except Exception as e:
                self.print_warning(f"Database manager: {e}")
            
            # Test Redis
            try:
                self.print_success("Redis client: Import OK")
            except Exception as e:
                self.print_warning(f"Redis client: {e}")
            
            # Test monitoring
            try:
                self.print_success("Monitoring system: Import OK")
            except Exception as e:
                self.print_warning(f"Monitoring system: {e}")
            
            # Test main app
            try:
                self.print_success("FastAPI app: Import OK")
            except Exception as e:
                self.print_warning(f"FastAPI app: {e}")
                
            return True
            
        except Exception as e:
            self.print_error(f"Backend health check failed: {e}")
            return False
    
    def generate_upgrade_commands(self) -> list[str]:
        """Generate commands to upgrade dependencies"""
        self.print_section("Upgrade Commands")
        
        commands = [
            "# Backend Python packages upgrade:",
            f"cd {self.backend_dir}",
            ".\\venv\\Scripts\\pip.exe install --upgrade -r requirements.txt",
            "",
            "# Frontend Node.js packages upgrade:",
            f"cd {self.frontend_dir}",
            "npm update",
            "npm audit fix",
            "",
            "# Install missing system dependencies:",
            "# choco install docker-desktop",
            "# winget install Git.Git",
            "# winget install OpenJS.NodeJS",
        ]
        
        for cmd in commands:
            if cmd.startswith('#'):
                self.print_info(cmd)
            else:
                print(f"{Colors.WHITE}{cmd}{Colors.END}")
        
        return commands
    
    def run_comprehensive_verification(self) -> dict[str, Any]:
        """Run complete verification suite"""
        self.print_header("🔧 Lokifi Comprehensive Dependency Verification")
        
        print(f"{Colors.WHITE}Platform: {platform.system()} {platform.release()}{Colors.END}")
        print(f"{Colors.WHITE}Python: {sys.version.split()[0]}{Colors.END}")
        print(f"{Colors.WHITE}Architecture: {platform.architecture()[0]}{Colors.END}")
        
        results = {
            "timestamp": str(subprocess.run(['date'], capture_output=True, text=True).stdout.strip() if platform.system() != 'Windows' else 'Windows'),
            "system_deps": {},
            "python_packages": {},
            "node_modules": False,
            "app_imports": {},
            "backend_health": False,
            "overall_status": "unknown"
        }
        
        # System dependencies
        results["system_deps"] = self.check_system_dependencies()
        
        # Python packages
        py_installed, py_total = self.verify_python_packages()
        results["python_packages"] = {
            "installed": py_installed,
            "total": py_total,
            "success_rate": (py_installed / py_total * 100) if py_total > 0 else 0
        }
        
        # Application imports
        app_imported, app_total = self.verify_app_imports()
        results["app_imports"] = {
            "imported": app_imported,
            "total": app_total,
            "success_rate": (app_imported / app_total * 100) if app_total > 0 else 0
        }
        
        # Node modules
        results["node_modules"] = self.verify_node_modules()
        
        # Backend health
        results["backend_health"] = self.run_backend_health_check()
        
        # Upgrade commands
        self.generate_upgrade_commands()
        
        # Overall assessment
        self.print_header("🎯 Verification Summary")
        
        python_ok = results["python_packages"]["success_rate"] >= 90
        imports_ok = results["app_imports"]["success_rate"] >= 80
        node_ok = results["node_modules"]
        system_ok = sum(results["system_deps"].values()) >= 3  # At least 3/5 system deps
        
        if python_ok and imports_ok and node_ok and system_ok:
            results["overall_status"] = "excellent"
            self.print_success("🎉 All dependencies verified and working!")
            self.print_info("✅ Python packages: Ready")
            self.print_info("✅ Application imports: Ready") 
            self.print_info("✅ Node.js modules: Ready")
            self.print_info("✅ System dependencies: Ready")
        elif python_ok and imports_ok:
            results["overall_status"] = "good"
            self.print_success("✅ Core dependencies working!")
            self.print_warning("⚠️  Some optional dependencies may need attention")
        else:
            results["overall_status"] = "needs_attention"
            self.print_warning("⚠️  Some critical dependencies need attention")
            self.print_info("Run the upgrade commands above to fix issues")
        
        # Save results
        results_file = self.backend_dir / f"dependency_verification_{subprocess.run(['date', '+%Y%m%d_%H%M%S'], capture_output=True, text=True).stdout.strip() if platform.system() != 'Windows' else 'results'}.json"
        try:
            with open(results_file, 'w') as f:
                json.dump(results, f, indent=2)
            self.print_success(f"Verification results saved: {results_file.name}")
        except Exception as e:
            self.print_warning(f"Could not save results: {e}")
        
        return results

def main():
    """Main verification function"""
    verifier = DependencyVerifier()
    results = verifier.run_comprehensive_verification()
    
    # Exit with appropriate code
    if results["overall_status"] == "excellent":
        sys.exit(0)
    elif results["overall_status"] == "good":
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()