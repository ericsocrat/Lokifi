#!/usr/bin/env python3
"""
Lokifi Local Test Runner
Comprehensive testing without external dependencies
"""

import importlib.util
import json
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path


class LocalTestRunner:
    def __init__(self):
        self.backend_dir = Path("backend")
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "tests": [],
            "summary": {"total": 0, "passed": 0, "failed": 0, "skipped": 0},
        }

    def run_import_tests(self):
        """Test all imports without starting servers"""
        print("\n🔍 Testing Python imports...")

        import_tests = [
            ("app.main", "Main application"),
            ("app.models", "Database models"),
            ("app.database", "Database connection"),
            ("app.routers.health", "Health router"),
            ("app.services.data_service", "Data service"),
        ]

        for module_name, description in import_tests:
            try:
                # Change to backend directory for imports
                os.chdir(self.backend_dir)
                sys.path.insert(0, str(Path.cwd()))

                spec = importlib.util.spec_from_file_location(
                    module_name, f"{module_name.replace('.', '/')}.py"
                )
                if spec and spec.loader:
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)

                    self.results["tests"].append(
                        {
                            "name": f"Import {module_name}",
                            "description": description,
                            "status": "PASSED",
                            "message": "Import successful",
                        }
                    )
                    self.results["summary"]["passed"] += 1
                    print(f"✓ {description}")
                else:
                    raise ImportError(f"Could not find {module_name}")

            except Exception as e:
                self.results["tests"].append(
                    {
                        "name": f"Import {module_name}",
                        "description": description,
                        "status": "FAILED",
                        "message": str(e),
                    }
                )
                self.results["summary"]["failed"] += 1
                print(f"✗ {description}: {e}")
            finally:
                os.chdir("..")

        self.results["summary"]["total"] += len(import_tests)

    def run_database_tests(self):
        """Test database operations"""
        print("\n🗃️  Testing database operations...")

        db_path = self.backend_dir / "lokifi.sqlite"

        if not db_path.exists():
            self.results["tests"].append(
                {
                    "name": "Database Exists",
                    "description": "Check if database file exists",
                    "status": "FAILED",
                    "message": "Database file not found",
                }
            )
            self.results["summary"]["failed"] += 1
            print("✗ Database file not found")
            return

        try:
            # Test database connection
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # Test basic query
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()

            self.results["tests"].append(
                {
                    "name": "Database Connection",
                    "description": "Test database connectivity",
                    "status": "PASSED",
                    "message": f"Found {len(tables)} tables",
                }
            )
            self.results["summary"]["passed"] += 1
            print(f"✓ Database connection OK ({len(tables)} tables)")

            # Test each table
            for (table_name,) in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    count = cursor.fetchone()[0]

                    self.results["tests"].append(
                        {
                            "name": f"Table {table_name}",
                            "description": f"Test table {table_name}",
                            "status": "PASSED",
                            "message": f"{count} records",
                        }
                    )
                    self.results["summary"]["passed"] += 1
                    print(f"✓ Table {table_name}: {count} records")

                except Exception as e:
                    self.results["tests"].append(
                        {
                            "name": f"Table {table_name}",
                            "description": f"Test table {table_name}",
                            "status": "FAILED",
                            "message": str(e),
                        }
                    )
                    self.results["summary"]["failed"] += 1
                    print(f"✗ Table {table_name}: {e}")

            conn.close()
            self.results["summary"]["total"] += len(tables) + 1

        except Exception as e:
            self.results["tests"].append(
                {
                    "name": "Database Connection",
                    "description": "Test database connectivity",
                    "status": "FAILED",
                    "message": str(e),
                }
            )
            self.results["summary"]["failed"] += 1
            print(f"✗ Database connection failed: {e}")
            self.results["summary"]["total"] += 1

    def run_file_structure_tests(self):
        """Test project file structure"""
        print("\n📁 Testing file structure...")

        required_files = [
            ("backend/app/main.py", "Main application file"),
            ("backend/app/database.py", "Database configuration"),
            ("backend/app/models", "Models directory"),
            ("backend/app/routers", "Routers directory"),
            ("backend/requirements.txt", "Requirements file"),
            ("backend/.venv", "Virtual environment"),
        ]

        for file_path, description in required_files:
            path = Path(file_path)
            if path.exists():
                self.results["tests"].append(
                    {
                        "name": f"File {file_path}",
                        "description": description,
                        "status": "PASSED",
                        "message": "File exists",
                    }
                )
                self.results["summary"]["passed"] += 1
                print(f"✓ {description}")
            else:
                self.results["tests"].append(
                    {
                        "name": f"File {file_path}",
                        "description": description,
                        "status": "FAILED",
                        "message": "File missing",
                    }
                )
                self.results["summary"]["failed"] += 1
                print(f"✗ {description} - Missing")

        self.results["summary"]["total"] += len(required_files)

    def run_configuration_tests(self):
        """Test configuration files"""
        print("\n⚙️  Testing configuration...")

        config_tests = [
            ("backend/.env", "Environment configuration"),
            ("backend/alembic.ini", "Database migration config"),
            (".env.production", "Production environment"),
            ("infra/docker/docker-compose.yml", "Docker compose config"),
        ]

        for config_path, description in config_tests:
            path = Path(config_path)
            if path.exists():
                try:
                    # Try to read the file
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()

                    self.results["tests"].append(
                        {
                            "name": f"Config {config_path}",
                            "description": description,
                            "status": "PASSED",
                            "message": f"Readable ({len(content)} chars)",
                        }
                    )
                    self.results["summary"]["passed"] += 1
                    print(f"✓ {description}")

                except Exception as e:
                    self.results["tests"].append(
                        {
                            "name": f"Config {config_path}",
                            "description": description,
                            "status": "FAILED",
                            "message": f"Read error: {e}",
                        }
                    )
                    self.results["summary"]["failed"] += 1
                    print(f"✗ {description}: {e}")
            else:
                self.results["tests"].append(
                    {
                        "name": f"Config {config_path}",
                        "description": description,
                        "status": "SKIPPED",
                        "message": "File not found",
                    }
                )
                self.results["summary"]["skipped"] += 1
                print(f"⚠ {description} - Not found")

        self.results["summary"]["total"] += len(config_tests)

    def save_results(self):
        """Save test results"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = Path(f"test_results/local_test_results_{timestamp}.json")
        results_file.parent.mkdir(exist_ok=True)

        with open(results_file, "w", encoding="utf-8") as f:
            json.dump(self.results, f, indent=2)

        print(f"\n📊 Results saved to: {results_file}")
        return results_file

    def run_all_tests(self):
        """Run all local tests"""
        print("🚀 Starting Lokifi Local Test Suite...")
        print(f"Timestamp: {self.results['timestamp']}")

        # Run all test categories
        self.run_file_structure_tests()
        self.run_configuration_tests()
        self.run_database_tests()
        self.run_import_tests()

        # Print summary
        summary = self.results["summary"]
        print(f"\n{'='*50}")
        print("TEST SUMMARY")
        print(f"{'='*50}")
        print(f"Total Tests: {summary['total']}")
        print(f"Passed: {summary['passed']} ✓")
        print(f"Failed: {summary['failed']} ✗")
        print(f"Skipped: {summary['skipped']} ⚠")

        success_rate = (summary["passed"] / summary["total"] * 100) if summary["total"] > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")

        # Save results
        results_file = self.save_results()

        return self.results


if __name__ == "__main__":
    runner = LocalTestRunner()
    results = runner.run_all_tests()

    # Exit with appropriate code
    sys.exit(0 if results["summary"]["failed"] == 0 else 1)
