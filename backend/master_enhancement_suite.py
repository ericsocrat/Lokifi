#!/usr/bin/env python3
"""
Fynix Master Enhancement Suite
=============================

Master control script that orchestrates all enhancement tools:
- Database management and optimization
- Advanced testing framework
- Production deployment setup
- Performance optimization and analytics

This script provides a unified interface to run all improvements,
upgrades, fixes, and tests for the Fynix system.
"""

import asyncio
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

class MasterEnhancementSuite:
    """Master orchestrator for all Fynix enhancements"""
    
    def __init__(self):
        self.project_root = backend_dir.parent
        self.results_dir = self.project_root / "enhancement_results"
        self.results_dir.mkdir(parents=True, exist_ok=True)
        
        self.enhancement_results = {
            "timestamp": datetime.now().isoformat(),
            "suite_results": {},
            "overall_status": "unknown",
            "summary": {}
        }
        
        # Available enhancement suites
        self.suites = {
            "database": {
                "name": "Database Management & Optimization",
                "script": "database_management_suite.py",
                "description": "Database health, optimization, backup, and migration management"
            },
            "testing": {
                "name": "Advanced Testing Framework",
                "script": "advanced_testing_framework.py",
                "description": "Comprehensive testing of all system components"
            },
            "production": {
                "name": "Production Deployment Suite",
                "script": "production_deployment_suite.py",
                "description": "Production deployment automation and monitoring setup"
            },
            "performance": {
                "name": "Performance Optimization & Analytics",
                "script": "performance_optimization_suite.py",
                "description": "Performance profiling, optimization, and analytics"
            }
        }
    
    def print_header(self, title: str):
        print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*80}{Colors.END}")
        print(f"{Colors.CYAN}{Colors.BOLD}{title.center(80)}{Colors.END}")
        print(f"{Colors.CYAN}{Colors.BOLD}{'='*80}{Colors.END}")
    
    def print_section(self, title: str):
        print(f"\n{Colors.BLUE}{Colors.BOLD}🚀 {title}{Colors.END}")
        print(f"{Colors.BLUE}{'─'*60}{Colors.END}")
    
    def print_success(self, message: str):
        print(f"{Colors.GREEN}✅ {message}{Colors.END}")
    
    def print_warning(self, message: str):
        print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")
    
    def print_error(self, message: str):
        print(f"{Colors.RED}❌ {message}{Colors.END}")
    
    def print_info(self, message: str):
        print(f"{Colors.WHITE}ℹ️  {message}{Colors.END}")
    
    def print_suite_intro(self, suite_name: str, description: str):
        print(f"\n{Colors.CYAN}{Colors.BOLD}┌{'─'*60}┐{Colors.END}")
        print(f"{Colors.CYAN}{Colors.BOLD}│{suite_name.center(60)}│{Colors.END}")
        print(f"{Colors.CYAN}{Colors.BOLD}└{'─'*60}┘{Colors.END}")
        print(f"{Colors.WHITE}{description}{Colors.END}")
    
    async def run_suite(self, suite_key: str) -> Dict[str, Any]:
        """Run a specific enhancement suite"""
        suite = self.suites[suite_key]
        suite_script = backend_dir / suite["script"]
        
        self.print_suite_intro(suite["name"], suite["description"])
        
        result = {
            "suite_name": suite["name"],
            "script": suite["script"],
            "start_time": datetime.now().isoformat(),
            "success": False,
            "execution_time": 0,
            "output": "",
            "error": None
        }
        
        try:
            if not suite_script.exists():
                result["error"] = f"Script not found: {suite_script}"
                self.print_error(f"Script not found: {suite_script}")
                return result
            
            # Run the suite script
            start_time = time.time()
            
            self.print_info(f"Executing: python {suite_script.name}")
            
            # Use subprocess to run the enhancement script
            process = await asyncio.create_subprocess_exec(
                sys.executable, str(suite_script),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=backend_dir
            )
            
            stdout, stderr = await process.communicate()
            
            execution_time = time.time() - start_time
            result["execution_time"] = execution_time
            
            if stdout:
                result["output"] = stdout.decode('utf-8', errors='ignore')
            
            if process.returncode == 0:
                result["success"] = True
                self.print_success(f"{suite['name']} completed successfully ({execution_time:.1f}s)")
            else:
                result["success"] = False
                result["error"] = f"Process exited with code {process.returncode}"
                self.print_error(f"{suite['name']} failed (exit code: {process.returncode})")
            
            result["end_time"] = datetime.now().isoformat()
            
        except Exception as e:
            result["error"] = str(e)
            result["execution_time"] = time.time() - start_time
            result["end_time"] = datetime.now().isoformat()
            self.print_error(f"{suite['name']} failed: {e}")
        
        return result
    
    async def check_prerequisites(self) -> bool:
        """Check system prerequisites"""
        self.print_section("System Prerequisites Check")
        
        checks = []
        
        # Check Python version
        python_version = sys.version_info
        if python_version >= (3, 8):
            self.print_success(f"Python version: {python_version.major}.{python_version.minor}.{python_version.micro}")
            checks.append(True)
        else:
            self.print_error(f"Python version too old: {python_version.major}.{python_version.minor}.{python_version.micro} (need >= 3.8)")
            checks.append(False)
        
        # Check required packages
        required_packages = [
            "fastapi", "sqlalchemy", "alembic", "httpx", "psutil", "aiofiles"
        ]
        
        for package in required_packages:
            try:
                __import__(package)
                self.print_success(f"Package available: {package}")
                checks.append(True)
            except ImportError:
                self.print_warning(f"Package missing: {package}")
                checks.append(False)
        
        # Check if all enhancement scripts exist
        for suite_key, suite in self.suites.items():
            script_path = backend_dir / suite["script"]
            if script_path.exists():
                self.print_success(f"Enhancement script found: {suite['script']}")
                checks.append(True)
            else:
                self.print_error(f"Enhancement script missing: {suite['script']}")
                checks.append(False)
        
        success_rate = sum(checks) / len(checks) * 100
        
        if success_rate >= 80:
            self.print_success(f"Prerequisites check: {success_rate:.0f}% passed")
            return True
        else:
            self.print_warning(f"Prerequisites check: {success_rate:.0f}% passed - some issues detected")
            return success_rate >= 60
    
    async def run_all_suites(self) -> Dict[str, Any]:
        """Run all enhancement suites"""
        self.print_header("Running All Enhancement Suites")
        
        # Check prerequisites first
        prereqs_ok = await self.check_prerequisites()
        if not prereqs_ok:
            self.print_error("Prerequisites check failed - aborting")
            return self.enhancement_results
        
        # Run each suite
        for suite_key in self.suites.keys():
            try:
                result = await self.run_suite(suite_key)
                self.enhancement_results["suite_results"][suite_key] = result
                
                # Brief pause between suites
                await asyncio.sleep(2)
                
            except Exception as e:
                self.print_error(f"Failed to run suite {suite_key}: {e}")
                self.enhancement_results["suite_results"][suite_key] = {
                    "suite_name": self.suites[suite_key]["name"],
                    "success": False,
                    "error": str(e)
                }
        
        return self.enhancement_results
    
    async def run_selected_suites(self, selected_suites: List[str]) -> Dict[str, Any]:
        """Run only selected enhancement suites"""
        self.print_header(f"Running Selected Enhancement Suites: {', '.join(selected_suites)}")
        
        # Check prerequisites
        prereqs_ok = await self.check_prerequisites()
        if not prereqs_ok:
            self.print_warning("Some prerequisites missing - continuing with caution")
        
        # Validate selected suites
        invalid_suites = [s for s in selected_suites if s not in self.suites]
        if invalid_suites:
            self.print_error(f"Invalid suite(s): {', '.join(invalid_suites)}")
            return self.enhancement_results
        
        # Run selected suites
        for suite_key in selected_suites:
            try:
                result = await self.run_suite(suite_key)
                self.enhancement_results["suite_results"][suite_key] = result
                
                # Brief pause between suites
                await asyncio.sleep(2)
                
            except Exception as e:
                self.print_error(f"Failed to run suite {suite_key}: {e}")
                self.enhancement_results["suite_results"][suite_key] = {
                    "suite_name": self.suites[suite_key]["name"],
                    "success": False,
                    "error": str(e)
                }
        
        return self.enhancement_results
    
    def generate_summary_report(self) -> Dict[str, Any]:
        """Generate comprehensive summary report"""
        self.print_section("Generating Summary Report")
        
        # Calculate overall statistics
        total_suites = len(self.enhancement_results["suite_results"])
        successful_suites = sum(1 for result in self.enhancement_results["suite_results"].values() 
                              if result.get("success", False))
        
        success_rate = (successful_suites / total_suites * 100) if total_suites > 0 else 0
        
        # Determine overall status
        if success_rate >= 100:
            overall_status = "EXCELLENT"
        elif success_rate >= 75:
            overall_status = "GOOD"
        elif success_rate >= 50:
            overall_status = "FAIR"
        else:
            overall_status = "POOR"
        
        self.enhancement_results["overall_status"] = overall_status
        self.enhancement_results["summary"] = {
            "total_suites": total_suites,
            "successful_suites": successful_suites,
            "failed_suites": total_suites - successful_suites,
            "success_rate": round(success_rate, 1),
            "overall_status": overall_status,
            "total_execution_time": sum(
                result.get("execution_time", 0) 
                for result in self.enhancement_results["suite_results"].values()
            ),
            "recommendations": []
        }
        
        # Generate recommendations
        recommendations = []
        
        for suite_key, result in self.enhancement_results["suite_results"].items():
            if not result.get("success", False):
                suite_name = self.suites[suite_key]["name"]
                recommendations.append(f"Review and retry {suite_name}")
        
        if success_rate < 100:
            recommendations.append("Check system logs for detailed error information")
            recommendations.append("Ensure all dependencies are properly installed")
        
        if not recommendations:
            recommendations.append("All enhancements completed successfully - system is optimized!")
        
        self.enhancement_results["summary"]["recommendations"] = recommendations
        
        return self.enhancement_results
    
    def display_final_summary(self):
        """Display final summary to user"""
        summary = self.enhancement_results["summary"]
        
        self.print_header("Enhancement Suite Execution Summary")
        
        # Overall status with color coding
        status_color = Colors.GREEN if summary["overall_status"] == "EXCELLENT" else \
                      Colors.BLUE if summary["overall_status"] == "GOOD" else \
                      Colors.YELLOW if summary["overall_status"] == "FAIR" else Colors.RED
        
        print(f"{Colors.BOLD}Overall Status: {status_color}{summary['overall_status']}{Colors.END}")
        print(f"{Colors.BOLD}Success Rate: {Colors.WHITE}{summary['success_rate']:.1f}%{Colors.END}")
        print(f"{Colors.BOLD}Total Execution Time: {Colors.WHITE}{summary['total_execution_time']:.1f}s{Colors.END}")
        
        # Suite-by-suite results
        print(f"\n{Colors.BOLD}Suite Results:{Colors.END}")
        for suite_key, result in self.enhancement_results["suite_results"].items():
            status_icon = "✅" if result.get("success", False) else "❌"
            execution_time = result.get("execution_time", 0)
            
            print(f"  {status_icon} {result.get('suite_name', suite_key)} ({execution_time:.1f}s)")
            
            if not result.get("success", False) and result.get("error"):
                print(f"      {Colors.RED}Error: {result['error']}{Colors.END}")
        
        # Recommendations
        if summary["recommendations"]:
            print(f"\n{Colors.YELLOW}💡 Recommendations:{Colors.END}")
            for i, rec in enumerate(summary["recommendations"], 1):
                print(f"  {i}. {rec}")
        
        # Next steps
        print(f"\n{Colors.CYAN}📋 Next Steps:{Colors.END}")
        if summary["overall_status"] == "EXCELLENT":
            print("  🎉 All enhancements completed successfully!")
            print("  • Review generated reports in enhancement_results/")
            print("  • Check performance-tests/ for optimization insights")
            print("  • Monitor system performance with new monitoring tools")
            print("  • Consider deploying to production with ./deploy-production.sh")
        else:
            print("  • Address any failed enhancements")
            print("  • Check individual suite logs for details")
            print("  • Re-run specific suites if needed")
            print("  • Ensure all dependencies are installed")
    
    async def save_results(self):
        """Save enhancement results to file"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            results_file = self.results_dir / f"master_enhancement_results_{timestamp}.json"
            
            with open(results_file, 'w') as f:
                json.dump(self.enhancement_results, f, indent=2, default=str)
            
            self.print_success(f"Results saved: {results_file.name}")
            
            # Also create a simple summary file
            summary_file = self.results_dir / f"enhancement_summary_{timestamp}.txt"
            with open(summary_file, 'w') as f:
                f.write("Fynix Enhancement Suite Results\n")
                f.write("=" * 50 + "\n\n")
                f.write(f"Execution Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Overall Status: {self.enhancement_results['summary']['overall_status']}\n")
                f.write(f"Success Rate: {self.enhancement_results['summary']['success_rate']:.1f}%\n")
                f.write(f"Total Execution Time: {self.enhancement_results['summary']['total_execution_time']:.1f}s\n\n")
                
                f.write("Suite Results:\n")
                f.write("-" * 20 + "\n")
                for suite_key, result in self.enhancement_results["suite_results"].items():
                    status = "PASS" if result.get("success", False) else "FAIL"
                    f.write(f"{result.get('suite_name', suite_key)}: {status}\n")
                
                if self.enhancement_results["summary"]["recommendations"]:
                    f.write("\nRecommendations:\n")
                    f.write("-" * 20 + "\n")
                    for i, rec in enumerate(self.enhancement_results["summary"]["recommendations"], 1):
                        f.write(f"{i}. {rec}\n")
            
            self.print_info(f"Summary saved: {summary_file.name}")
            
        except Exception as e:
            self.print_error(f"Failed to save results: {e}")
    
    async def run_interactive_mode(self):
        """Run in interactive mode for suite selection"""
        self.print_header("Fynix Master Enhancement Suite - Interactive Mode")
        
        print(f"{Colors.WHITE}Available enhancement suites:{Colors.END}\n")
        
        for i, (suite_key, suite) in enumerate(self.suites.items(), 1):
            print(f"  {i}. {Colors.BOLD}{suite['name']}{Colors.END}")
            print(f"     {suite['description']}")
            print()
        
        print(f"  {len(self.suites) + 1}. {Colors.BOLD}Run All Suites{Colors.END}")
        print("     Execute all enhancement suites in sequence")
        print()
        
        try:
            choice = input(f"{Colors.CYAN}Select option (1-{len(self.suites) + 1}): {Colors.END}")
            choice_num = int(choice)
            
            if choice_num == len(self.suites) + 1:
                # Run all suites
                await self.run_all_suites()
            elif 1 <= choice_num <= len(self.suites):
                # Run selected suite
                suite_key = list(self.suites.keys())[choice_num - 1]
                await self.run_selected_suites([suite_key])
            else:
                self.print_error("Invalid selection")
                return False
            
            return True
            
        except (ValueError, KeyboardInterrupt):
            self.print_error("Invalid input or cancelled by user")
            return False

async def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Fynix Master Enhancement Suite")
    parser.add_argument("--suites", nargs="+", help="Specific suites to run", 
                       choices=["database", "testing", "production", "performance"])
    parser.add_argument("--interactive", action="store_true", help="Run in interactive mode")
    parser.add_argument("--list", action="store_true", help="List available suites")
    
    args = parser.parse_args()
    
    suite = MasterEnhancementSuite()
    
    # List suites and exit
    if args.list:
        suite.print_header("Available Enhancement Suites")
        for suite_key, suite_info in suite.suites.items():
            print(f"\n{Colors.BOLD}{suite_key}:{Colors.END} {suite_info['name']}")
            print(f"  {suite_info['description']}")
            print(f"  Script: {suite_info['script']}")
        return True
    
    try:
        # Determine execution mode
        if args.interactive:
            # Interactive mode
            success = await suite.run_interactive_mode()
            if not success:
                return False
        elif args.suites:
            # Run specific suites
            await suite.run_selected_suites(args.suites)
        else:
            # Run all suites
            await suite.run_all_suites()
        
        # Generate summary and save results
        suite.generate_summary_report()
        suite.display_final_summary()
        await suite.save_results()
        
        # Determine success
        success_rate = suite.enhancement_results["summary"]["success_rate"]
        return success_rate >= 75
        
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Enhancement suite interrupted by user{Colors.END}")
        return False
    except Exception as e:
        print(f"\n{Colors.RED}Master enhancement suite failed: {e}{Colors.END}")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Master enhancement suite failed: {e}")
        sys.exit(1)