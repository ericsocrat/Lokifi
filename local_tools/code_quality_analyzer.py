#!/usr/bin/env python3
"""
Fynix Code Quality Analyzer
Local code quality analysis without external services
"""

import os
import ast
import sys
from pathlib import Path
from typing import Dict, List, Any
from collections import defaultdict
import json
from datetime import datetime

class CodeQualityAnalyzer:
    def __init__(self):
        self.backend_dir = Path("backend")
        self.analysis_results = {
            "timestamp": datetime.now().isoformat(),
            "files_analyzed": 0,
            "issues_found": [],
            "metrics": {
                "total_lines": 0,
                "code_lines": 0,
                "comment_lines": 0,
                "blank_lines": 0,
                "functions": 0,
                "classes": 0,
                "complexity_score": 0
            },
            "quality_score": 0
        }
    
    def analyze_python_file(self, file_path: Path) -> Dict[str, Any]:
        """Analyze a single Python file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse AST
            tree = ast.parse(content)
            
            # Count lines
            lines = content.split('\n')
            total_lines = len(lines)
            blank_lines = sum(1 for line in lines if not line.strip())
            comment_lines = sum(1 for line in lines if line.strip().startswith('#'))
            code_lines = total_lines - blank_lines - comment_lines
            
            # Count functions and classes
            functions = sum(1 for node in ast.walk(tree) if isinstance(node, ast.FunctionDef))
            classes = sum(1 for node in ast.walk(tree) if isinstance(node, ast.ClassDef))
            
            # Calculate complexity (simplified)
            complexity = 0
            for node in ast.walk(tree):
                if isinstance(node, (ast.If, ast.While, ast.For, ast.With, ast.Try)):
                    complexity += 1
            
            file_analysis = {
                "file": str(file_path),
                "total_lines": total_lines,
                "code_lines": code_lines,
                "comment_lines": comment_lines,
                "blank_lines": blank_lines,
                "functions": functions,
                "classes": classes,
                "complexity": complexity,
                "issues": []
            }
            
            # Check for common issues
            if code_lines > 500:
                file_analysis["issues"].append("File too long (>500 lines)")
            
            if functions == 0 and classes == 0 and code_lines > 10:
                file_analysis["issues"].append("No functions or classes defined")
            
            if comment_lines / total_lines < 0.1 and code_lines > 50:
                file_analysis["issues"].append("Low comment ratio (<10%)")
            
            return file_analysis
            
        except Exception as e:
            return {
                "file": str(file_path),
                "error": str(e),
                "issues": [f"Parse error: {e}"]
            }
    
    def analyze_project(self):
        """Analyze entire project"""
        print("🔍 Starting code quality analysis...")
        
        # Find all Python files
        python_files = list(self.backend_dir.rglob("*.py"))
        python_files = [f for f in python_files if not any(
            part.startswith('.') for part in f.parts
        )]
        
        print(f"Found {len(python_files)} Python files")
        
        file_analyses = []
        for file_path in python_files:
            analysis = self.analyze_python_file(file_path)
            file_analyses.append(analysis)
            
            # Aggregate metrics
            if "error" not in analysis:
                self.analysis_results["metrics"]["total_lines"] += analysis["total_lines"]
                self.analysis_results["metrics"]["code_lines"] += analysis["code_lines"]
                self.analysis_results["metrics"]["comment_lines"] += analysis["comment_lines"]
                self.analysis_results["metrics"]["blank_lines"] += analysis["blank_lines"]
                self.analysis_results["metrics"]["functions"] += analysis["functions"]
                self.analysis_results["metrics"]["classes"] += analysis["classes"]
                self.analysis_results["metrics"]["complexity_score"] += analysis["complexity"]
            
            # Collect issues
            for issue in analysis.get("issues", []):
                self.analysis_results["issues_found"].append({
                    "file": str(file_path),
                    "issue": issue
                })
        
        self.analysis_results["files_analyzed"] = len(python_files)
        
        # Calculate quality score
        total_issues = len(self.analysis_results["issues_found"])
        if self.analysis_results["files_analyzed"] > 0:
            issues_per_file = total_issues / self.analysis_results["files_analyzed"]
            quality_score = max(0, 100 - (issues_per_file * 20))
            self.analysis_results["quality_score"] = round(quality_score, 1)
        
        return file_analyses
    
    def generate_report(self):
        """Generate quality report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = Path(f"test_results/code_quality_report_{timestamp}.json")
        report_file.parent.mkdir(exist_ok=True)
        
        # Save detailed results
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(self.analysis_results, f, indent=2)
        
        # Generate summary report
        summary_file = Path(f"test_results/code_quality_summary_{timestamp}.txt")
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write("Fynix Code Quality Analysis Report\n")
            f.write("=" * 40 + "\n\n")
            f.write(f"Analysis Date: {self.analysis_results['timestamp']}\n")
            f.write(f"Files Analyzed: {self.analysis_results['files_analyzed']}\n")
            f.write(f"Quality Score: {self.analysis_results['quality_score']}/100\n\n")
            
            metrics = self.analysis_results['metrics']
            f.write("Code Metrics:\n")
            f.write("-" * 20 + "\n")
            f.write(f"Total Lines: {metrics['total_lines']:,}\n")
            f.write(f"Code Lines: {metrics['code_lines']:,}\n")
            f.write(f"Comment Lines: {metrics['comment_lines']:,}\n")
            f.write(f"Functions: {metrics['functions']}\n")
            f.write(f"Classes: {metrics['classes']}\n")
            f.write(f"Complexity Score: {metrics['complexity_score']}\n\n")
            
            if self.analysis_results['issues_found']:
                f.write("Issues Found:\n")
                f.write("-" * 20 + "\n")
                for issue in self.analysis_results['issues_found']:
                    f.write(f"{issue['file']}: {issue['issue']}\n")
            else:
                f.write("No issues found! Great job! 🎉\n")
        
        print(f"\n📊 Quality report saved to: {report_file}")
        print(f"📊 Summary report saved to: {summary_file}")
        
        return report_file, summary_file

if __name__ == "__main__":
    analyzer = CodeQualityAnalyzer()
    analyzer.analyze_project()
    analyzer.generate_report()
    
    print(f"\n✨ Code Quality Score: {analyzer.analysis_results['quality_score']}/100")
