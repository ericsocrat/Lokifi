#!/usr/bin/env python3
"""
Performance Optimization Analyzer for Fynix Phase K
Analyzes system performance and provides specific optimization recommendations
"""

import os
import sys
import ast
import re
from pathlib import Path
from typing import Dict, List, Tuple, Set
from dataclasses import dataclass
import json

@dataclass
class PerformanceIssue:
    """Represents a performance issue"""
    file_path: str
    line_number: int
    issue_type: str
    severity: str  # "critical", "high", "medium", "low"
    description: str
    recommendation: str
    code_snippet: str

@dataclass
class OptimizationOpportunity:
    """Represents an optimization opportunity"""
    category: str
    description: str
    impact: str  # "high", "medium", "low"
    implementation_effort: str  # "low", "medium", "high"
    recommendation: str
    files_affected: List[str]

class PerformanceOptimizationAnalyzer:
    """Analyzes Fynix codebase for performance optimization opportunities"""
    
    def __init__(self, backend_dir: str = "."):
        self.backend_dir = Path(backend_dir)
        self.issues: List[PerformanceIssue] = []
        self.opportunities: List[OptimizationOpportunity] = []
        self.analyzed_files: Set[str] = set()
    
    def analyze_file(self, file_path: Path) -> List[PerformanceIssue]:
        """Analyze a single Python file for performance issues"""
        issues = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.splitlines()
            
            # Parse AST for deeper analysis
            try:
                tree = ast.parse(content)
            except SyntaxError:
                return issues
            
            # Check for common performance issues
            issues.extend(self._check_database_n_plus_1(file_path, content, lines))
            issues.extend(self._check_inefficient_loops(file_path, content, lines))
            issues.extend(self._check_blocking_io(file_path, content, lines))
            issues.extend(self._check_memory_issues(file_path, content, lines))
            issues.extend(self._check_caching_opportunities(file_path, content, lines))
            issues.extend(self._check_async_await_patterns(file_path, content, lines))
            
            self.analyzed_files.add(str(file_path))
            
        except Exception as e:
            print(f"Error analyzing {file_path}: {e}")
        
        return issues
    
    def _check_database_n_plus_1(self, file_path: Path, content: str, lines: List[str]) -> List[PerformanceIssue]:
        """Check for N+1 query problems"""
        issues = []
        
        # Look for loops with database queries
        for i, line in enumerate(lines):
            if re.search(r'for\s+\w+\s+in\s+.*:', line):
                # Check next few lines for database operations
                for j in range(i + 1, min(i + 10, len(lines))):
                    if any(pattern in lines[j] for pattern in ['session.query', 'await.*get', '.filter', 'SELECT']):
                        issues.append(PerformanceIssue(
                            file_path=str(file_path),
                            line_number=i + 1,
                            issue_type="N+1 Query",
                            severity="high",
                            description="Potential N+1 query pattern detected in loop",
                            recommendation="Use eager loading, batch queries, or join operations",
                            code_snippet=line.strip()
                        ))
                        break
        
        return issues
    
    def _check_inefficient_loops(self, file_path: Path, content: str, lines: List[str]) -> List[PerformanceIssue]:
        """Check for inefficient loop patterns"""
        issues = []
        
        for i, line in enumerate(lines):
            # Check for nested loops
            if re.search(r'\s+for\s+.*:', line) and i > 0:
                # Count indentation level
                indent_level = len(line) - len(line.lstrip())
                if indent_level > 4:  # Nested loop
                    issues.append(PerformanceIssue(
                        file_path=str(file_path),
                        line_number=i + 1,
                        issue_type="Nested Loop",
                        severity="medium",
                        description="Deeply nested loop detected",
                        recommendation="Consider optimizing with set operations, vectorization, or caching",
                        code_snippet=line.strip()
                    ))
            
            # Check for inefficient string concatenation
            if '+=' in line and any(str_op in line for str_op in ['"', "'", 'str(']):
                issues.append(PerformanceIssue(
                    file_path=str(file_path),
                    line_number=i + 1,
                    issue_type="String Concatenation",
                    severity="low",
                    description="Inefficient string concatenation in loop",
                    recommendation="Use list.append() and ''.join() or f-strings",
                    code_snippet=line.strip()
                ))
        
        return issues
    
    def _check_blocking_io(self, file_path: Path, content: str, lines: List[str]) -> List[PerformanceIssue]:
        """Check for blocking I/O operations"""
        issues = []
        
        blocking_patterns = [
            (r'requests\.(get|post|put|delete)', "Use aiohttp for async HTTP requests"),
            (r'time\.sleep\(', "Use asyncio.sleep() in async functions"),
            (r'open\(.*\)', "Use aiofiles for async file operations"),
            (r'json\.load\(', "Consider async JSON parsing for large files"),
        ]
        
        for i, line in enumerate(lines):
            for pattern, recommendation in blocking_patterns:
                if re.search(pattern, line):
                    # Check if we're in an async function
                    in_async = False
                    for j in range(max(0, i - 20), i):
                        if re.search(r'async def ', lines[j]):
                            in_async = True
                            break
                        elif re.search(r'^def ', lines[j]):
                            break
                    
                    if in_async:
                        issues.append(PerformanceIssue(
                            file_path=str(file_path),
                            line_number=i + 1,
                            issue_type="Blocking I/O",
                            severity="high",
                            description="Blocking I/O operation in async function",
                            recommendation=recommendation,
                            code_snippet=line.strip()
                        ))
        
        return issues
    
    def _check_memory_issues(self, file_path: Path, content: str, lines: List[str]) -> List[PerformanceIssue]:
        """Check for potential memory issues"""
        issues = []
        
        for i, line in enumerate(lines):
            # Check for large list comprehensions
            if '[' in line and 'for' in line and 'in' in line and len(line) > 100:
                issues.append(PerformanceIssue(
                    file_path=str(file_path),
                    line_number=i + 1,
                    issue_type="Memory Usage",
                    severity="medium",
                    description="Large list comprehension may consume excessive memory",
                    recommendation="Consider using generator expressions or itertools",
                    code_snippet=line.strip()[:100] + "..."
                ))
            
            # Check for loading entire files
            if re.search(r'\.read\(\)', line) and 'with open' in content:
                issues.append(PerformanceIssue(
                    file_path=str(file_path),
                    line_number=i + 1,
                    issue_type="Memory Usage",
                    severity="medium",
                    description="Reading entire file into memory",
                    recommendation="Consider streaming or chunk-based processing for large files",
                    code_snippet=line.strip()
                ))
        
        return issues
    
    def _check_caching_opportunities(self, file_path: Path, content: str, lines: List[str]) -> List[PerformanceIssue]:
        """Check for caching opportunities"""
        issues = []
        
        # Look for expensive operations that could be cached
        expensive_patterns = [
            (r'session\.query.*\.all\(\)', "Database query results"),
            (r'requests\.(get|post)', "HTTP request results"),
            (r'json\.loads\(', "JSON parsing results"),
            (r'hashlib\.(md5|sha1|sha256)', "Hash computation results"),
        ]
        
        for i, line in enumerate(lines):
            for pattern, operation in expensive_patterns:
                if re.search(pattern, line):
                    # Check if already in a cached function
                    if '@cache' not in '\n'.join(lines[max(0, i-5):i]):
                        issues.append(PerformanceIssue(
                            file_path=str(file_path),
                            line_number=i + 1,
                            issue_type="Caching Opportunity",
                            severity="medium",
                            description=f"{operation} could benefit from caching",
                            recommendation="Consider using @lru_cache, Redis, or application-level caching",
                            code_snippet=line.strip()
                        ))
        
        return issues
    
    def _check_async_await_patterns(self, file_path: Path, content: str, lines: List[str]) -> List[PerformanceIssue]:
        """Check for async/await optimization opportunities"""
        issues = []
        
        for i, line in enumerate(lines):
            # Check for sequential awaits that could be parallel
            if 'await ' in line and i < len(lines) - 1:
                next_line = lines[i + 1] if i + 1 < len(lines) else ""
                if 'await ' in next_line and not any(control in line for control in ['if', 'for', 'while']):
                    issues.append(PerformanceIssue(
                        file_path=str(file_path),
                        line_number=i + 1,
                        issue_type="Async Optimization",
                        severity="medium",
                        description="Sequential awaits could be parallelized",
                        recommendation="Use asyncio.gather() or asyncio.create_task() for parallel execution",
                        code_snippet=f"{line.strip()} ; {next_line.strip()}"
                    ))
        
        return issues
    
    def identify_optimization_opportunities(self) -> List[OptimizationOpportunity]:
        """Identify system-wide optimization opportunities"""
        opportunities = []
        
        # Database optimization opportunities
        db_files = [f for f in self.analyzed_files if 'models' in f or 'database' in f]
        if db_files:
            opportunities.append(OptimizationOpportunity(
                category="Database",
                description="Implement database query optimization and indexing",
                impact="high",
                implementation_effort="medium",
                recommendation="Add database indexes, optimize queries, implement connection pooling",
                files_affected=db_files
            ))
        
        # Caching optimization
        api_files = [f for f in self.analyzed_files if 'api' in f or 'routes' in f]
        if api_files:
            opportunities.append(OptimizationOpportunity(
                category="Caching",
                description="Implement comprehensive caching strategy",
                impact="high",
                implementation_effort="medium",
                recommendation="Add Redis caching for API responses, database queries, and computed data",
                files_affected=api_files
            ))
        
        # WebSocket optimization
        ws_files = [f for f in self.analyzed_files if 'websocket' in f]
        if ws_files:
            opportunities.append(OptimizationOpportunity(
                category="WebSocket",
                description="Optimize WebSocket connection management",
                impact="medium",
                implementation_effort="low",
                recommendation="Implement connection pooling, message batching, and efficient broadcasting",
                files_affected=ws_files
            ))
        
        # Memory optimization
        opportunities.append(OptimizationOpportunity(
            category="Memory",
            description="Implement memory usage optimization",
            impact="medium",
            implementation_effort="medium",
            recommendation="Use generators, implement object pooling, optimize data structures",
            files_affected=list(self.analyzed_files)
        ))
        
        # Background task optimization
        task_files = [f for f in self.analyzed_files if 'task' in f or 'scheduler' in f]
        if task_files:
            opportunities.append(OptimizationOpportunity(
                category="Background Tasks",
                description="Optimize background task execution",
                impact="medium",
                implementation_effort="low",
                recommendation="Implement task queues, batch processing, and efficient scheduling",
                files_affected=task_files
            ))
        
        return opportunities
    
    def analyze_directory(self, directory: Path = None) -> None:
        """Analyze entire directory structure"""
        if directory is None:
            directory = self.backend_dir
        
        python_files = list(directory.rglob("*.py"))
        
        print(f"🔍 Analyzing {len(python_files)} Python files...")
        
        for file_path in python_files:
            # Skip virtual environment and cache files
            if any(skip in str(file_path) for skip in ['venv', '__pycache__', '.git']):
                continue
            
            file_issues = self.analyze_file(file_path)
            self.issues.extend(file_issues)
        
        # Identify optimization opportunities
        self.opportunities = self.identify_optimization_opportunities()
    
    def generate_report(self) -> str:
        """Generate performance optimization report"""
        
        report = [
            "=" * 80,
            "🚀 PERFORMANCE OPTIMIZATION ANALYSIS REPORT",
            "=" * 80,
            f"📅 Generated: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"📁 Analyzed Files: {len(self.analyzed_files)}",
            f"⚠️  Issues Found: {len(self.issues)}",
            f"💡 Opportunities: {len(self.opportunities)}",
            ""
        ]
        
        # Issues by severity
        severity_counts = {}
        for issue in self.issues:
            severity_counts[issue.severity] = severity_counts.get(issue.severity, 0) + 1
        
        report.extend([
            "📊 ISSUES BY SEVERITY:",
            "-" * 40,
            f"🔴 Critical: {severity_counts.get('critical', 0)}",
            f"🟠 High: {severity_counts.get('high', 0)}",
            f"🟡 Medium: {severity_counts.get('medium', 0)}",
            f"🟢 Low: {severity_counts.get('low', 0)}",
            ""
        ])
        
        # Top issues by type
        issue_types = {}
        for issue in self.issues:
            issue_types[issue.issue_type] = issue_types.get(issue.issue_type, 0) + 1
        
        report.extend([
            "🔍 ISSUES BY TYPE:",
            "-" * 40
        ])
        
        for issue_type, count in sorted(issue_types.items(), key=lambda x: x[1], reverse=True):
            report.append(f"   {issue_type}: {count}")
        
        report.append("")
        
        # Critical and high severity issues
        critical_issues = [i for i in self.issues if i.severity in ['critical', 'high']]
        if critical_issues:
            report.extend([
                "🚨 CRITICAL & HIGH SEVERITY ISSUES:",
                "-" * 40
            ])
            
            for issue in critical_issues[:10]:  # Show top 10
                report.extend([
                    f"\n⚠️  {issue.issue_type} in {Path(issue.file_path).name}:{issue.line_number}",
                    f"   Description: {issue.description}",
                    f"   Recommendation: {issue.recommendation}",
                    f"   Code: {issue.code_snippet}"
                ])
        
        # Optimization opportunities
        if self.opportunities:
            report.extend([
                "",
                "💡 OPTIMIZATION OPPORTUNITIES:",
                "-" * 40
            ])
            
            for opp in sorted(self.opportunities, key=lambda x: (x.impact, x.implementation_effort), reverse=True):
                report.extend([
                    f"\n🎯 {opp.category} Optimization",
                    f"   Impact: {opp.impact.upper()} | Effort: {opp.implementation_effort.upper()}",
                    f"   Description: {opp.description}",
                    f"   Recommendation: {opp.recommendation}",
                    f"   Files Affected: {len(opp.files_affected)}"
                ])
        
        # Specific recommendations
        report.extend([
            "",
            "🎯 IMMEDIATE ACTION ITEMS:",
            "-" * 40,
            "1. 🗄️  Database: Add indexes for frequently queried columns",
            "2. 🚀 Caching: Implement Redis caching for API responses",
            "3. 🔄 Async: Convert blocking I/O to async operations",
            "4. 🧠 Memory: Use generators for large data processing",
            "5. 📊 Monitoring: Add performance metrics and alerts",
            "",
            "🔧 OPTIMIZATION PRIORITY:",
            "-" * 40,
            "1. Fix critical and high severity issues first",
            "2. Implement high-impact, low-effort optimizations",
            "3. Focus on database and caching improvements",
            "4. Optimize async/await patterns",
            "5. Implement comprehensive monitoring",
            "",
            "=" * 80
        ])
        
        return "\n".join(report)
    
    def export_issues_json(self, filename: str = "performance_issues.json"):
        """Export issues to JSON format"""
        data = {
            "analysis_date": __import__('datetime').datetime.now().isoformat(),
            "files_analyzed": len(self.analyzed_files),
            "issues": [
                {
                    "file_path": issue.file_path,
                    "line_number": issue.line_number,
                    "issue_type": issue.issue_type,
                    "severity": issue.severity,
                    "description": issue.description,
                    "recommendation": issue.recommendation,
                    "code_snippet": issue.code_snippet
                }
                for issue in self.issues
            ],
            "opportunities": [
                {
                    "category": opp.category,
                    "description": opp.description,
                    "impact": opp.impact,
                    "implementation_effort": opp.implementation_effort,
                    "recommendation": opp.recommendation,
                    "files_affected": opp.files_affected
                }
                for opp in self.opportunities
            ]
        }
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"📄 Performance analysis exported to: {filename}")

def main():
    """Main analysis function"""
    analyzer = PerformanceOptimizationAnalyzer()
    
    print("🚀 Starting Performance Optimization Analysis...")
    analyzer.analyze_directory()
    
    # Generate and display report
    report = analyzer.generate_report()
    print(report)
    
    # Save report to file
    with open("performance_optimization_report.txt", "w") as f:
        f.write(report)
    
    # Export detailed data
    analyzer.export_issues_json()
    
    print("\n📄 Reports saved:")
    print("   - performance_optimization_report.txt")
    print("   - performance_issues.json")

if __name__ == "__main__":
    main()