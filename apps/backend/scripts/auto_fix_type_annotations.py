"""
Automatic Type Annotation Fixer for Pyright Errors
Reads Pyright output and applies common type annotation patterns

Usage:
    python scripts/auto_fix_type_annotations.py                    # Dry run
    python scripts/auto_fix_type_annotations.py --fix             # Apply fixes
    python scripts/auto_fix_type_annotations.py --scan            # Run Pyright scan first
    python scripts/auto_fix_type_annotations.py --scan --fix      # Scan and fix
"""

import argparse
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

# Type patterns to apply based on parameter names
TYPE_PATTERNS = {
    # FastAPI dependencies
    r'current_user': 'dict[str, Any]',
    r'db': 'Session',
    r'redis_client': 'RedisClient',
    r'redis': 'RedisClient',
    
    # Middleware patterns
    r'call_next': 'Callable[[Request], Awaitable[Response]]',
    
    # Common parameters
    r'data': 'dict[str, Any]',
    r'request': 'Request',
    r'response': 'Response',
    r'config': 'dict[str, Any]',
    r'settings': 'dict[str, Any]',
    r'params': 'dict[str, Any]',
    r'options': 'dict[str, Any]',
    r'metadata': 'dict[str, Any]',
    r'context': 'dict[str, Any]',
    
    # Decorator parameters
    r'func': 'Callable[..., Any]',
    r'callback': 'Callable[..., Any]',
    
    # *args and **kwargs
    r'args': 'Any',
    r'kwargs': 'Any',
}

# Required imports for each type
REQUIRED_IMPORTS = {
    'dict[str, Any]': 'from typing import Any',
    'Callable[[Request], Awaitable[Response]]': 'from collections.abc import Awaitable, Callable\nfrom fastapi import Request, Response',
    'Callable[..., Any]': 'from collections.abc import Callable\nfrom typing import Any',
    'Session': 'from sqlalchemy.orm import Session',
    'RedisClient': 'from app.core.redis_client import RedisClient',
    'Request': 'from fastapi import Request',
    'Response': 'from fastapi import Response',
    'Any': 'from typing import Any',
}


class TypeAnnotationFixer:
    """Automatically fix missing type annotations based on Pyright output"""
    
    def __init__(self, backend_path: Path = Path(".")):
        self.backend_path = backend_path.resolve()
        self.app_path = self.backend_path / "app"
        self.fixes_by_file: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self.stats = {
            'files_scanned': 0,
            'errors_found': 0,
            'fixes_applied': 0,
            'files_modified': 0,
        }
    
    def run_pyright_scan(self) -> dict[str, Any]:
        """Run Pyright and parse JSON output"""
        print("🔍 Running Pyright scan...")
        
        try:
            # Try npx pyright first (works on Windows/Mac/Linux)
            result = subprocess.run(
                ['npx', '--yes', 'pyright', '--outputjson', str(self.app_path)],
                capture_output=True,
                text=True,
                cwd=self.backend_path,
                shell=True  # Required for Windows
            )
            
            output = json.loads(result.stdout)
            self.stats['files_scanned'] = output.get('summary', {}).get('filesAnalyzed', 0)
            self.stats['errors_found'] = output.get('summary', {}).get('errorCount', 0)
            
            print(f"✅ Scanned {self.stats['files_scanned']} files")
            print(f"📊 Found {self.stats['errors_found']} errors")
            
            return output
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Pyright scan failed: {e}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse Pyright output: {e}")
            print(f"Raw output: {result.stdout[:500]}")
            sys.exit(1)
        except FileNotFoundError:
            print("❌ npx not found. Please install Node.js")
            sys.exit(1)
    
    def analyze_errors(self, pyright_output: dict[str, Any]) -> None:
        """Analyze Pyright errors and identify fixable patterns"""
        print("\n🔧 Analyzing fixable errors...")
        
        diagnostics = pyright_output.get('generalDiagnostics', [])
        fixable_count = 0
        
        for diag in diagnostics:
            # Look for missing or partially unknown parameter types
            rule = diag.get('rule', '')
            message = diag.get('message', '')
            
            if 'reportMissingParameterType' not in rule and 'partially unknown' not in message:
                continue
            
            file_path = Path(diag['file'])
            if not file_path.is_relative_to(self.app_path):
                continue
            
            # Extract parameter name from message
            # Matches: parameter "foo" or Type of parameter "foo"
            param_match = re.search(r'parameter "(\w+)"', message)
            if not param_match:
                continue
            
            param_name = param_match.group(1)
            
            # Check if we have a pattern for this parameter
            suggested_type = self._get_type_for_parameter(param_name)
            if suggested_type:
                self.fixes_by_file[str(file_path)].append({
                    'line': diag['range']['start']['line'] + 1,  # 1-indexed
                    'parameter': param_name,
                    'suggested_type': suggested_type,
                    'message': message,
                })
                fixable_count += 1
        
        print(f"✅ Found {fixable_count} fixable type annotation errors")
        print(f"📁 Affected files: {len(self.fixes_by_file)}")
    
    def _get_type_for_parameter(self, param_name: str) -> str | None:
        """Determine type annotation based on parameter name"""
        for pattern, type_annotation in TYPE_PATTERNS.items():
            if re.match(pattern, param_name):
                return type_annotation
        return None
    
    def preview_fixes(self) -> None:
        """Preview all suggested fixes"""
        if not self.fixes_by_file:
            print("✅ No fixable errors found!")
            return
        
        print("\n📋 Preview of suggested fixes:\n")
        print("=" * 80)
        
        for file_path, fixes in sorted(self.fixes_by_file.items()):
            rel_path = Path(file_path).relative_to(self.backend_path)
            print(f"\n📄 {rel_path}")
            print(f"   {len(fixes)} fixes:")
            
            for fix in fixes:
                print(f"   Line {fix['line']:4d}: {fix['parameter']:20s} → {fix['suggested_type']}")
        
        print("\n" + "=" * 80)
        print(f"\n📊 Total: {sum(len(fixes) for fixes in self.fixes_by_file.values())} fixes in {len(self.fixes_by_file)} files")
    
    def apply_fixes(self, dry_run: bool = True) -> None:
        """Apply type annotation fixes to files"""
        if not self.fixes_by_file:
            print("✅ No fixes to apply!")
            return
        
        if dry_run:
            print("\n🔍 DRY RUN - No files will be modified")
        else:
            print("\n✍️  Applying fixes...")
        
        for file_path, fixes in self.fixes_by_file.items():
            if not dry_run:
                success = self._apply_fixes_to_file(Path(file_path), fixes)
                if success:
                    self.stats['files_modified'] += 1
                    self.stats['fixes_applied'] += len(fixes)
        
        if not dry_run:
            print(f"\n✅ Modified {self.stats['files_modified']} files")
            print(f"✅ Applied {self.stats['fixes_applied']} fixes")
    
    def _apply_fixes_to_file(self, file_path: Path, fixes: list[dict[str, Any]]) -> bool:
        """Apply fixes to a single file"""
        try:
            content = file_path.read_text(encoding='utf-8')
            lines = content.split('\n')
            required_imports = set()
            
            # Apply fixes (in reverse order to preserve line numbers)
            for fix in sorted(fixes, key=lambda x: x['line'], reverse=True):
                line_idx = fix['line'] - 1
                if line_idx >= len(lines):
                    continue
                
                line = lines[line_idx]
                param_name = fix['parameter']
                suggested_type = fix['suggested_type']
                
                # Add type annotation to parameter
                # Handle *args and **kwargs specially
                if param_name == 'args':
                    patterns = [
                        (rf'\*{param_name}\s*\)', rf'*{param_name}: {suggested_type})'),
                        (rf'\*{param_name}\s*,', rf'*{param_name}: {suggested_type},'),
                    ]
                elif param_name == 'kwargs':
                    patterns = [
                        (rf'\*\*{param_name}\s*\)', rf'**{param_name}: {suggested_type})'),
                        (rf'\*\*{param_name}\s*,', rf'**{param_name}: {suggested_type},'),
                    ]
                else:
                    # Pattern: param_name) or param_name, or param_name: or param_name=
                    patterns = [
                        (rf'\b{param_name}\s*\)', rf'{param_name}: {suggested_type})'),
                        (rf'\b{param_name}\s*,', rf'{param_name}: {suggested_type},'),
                        (rf'\b{param_name}\s*=', rf'{param_name}: {suggested_type} ='),
                    ]
                
                for pattern, replacement in patterns:
                    new_line = re.sub(pattern, replacement, line)
                    if new_line != line:
                        lines[line_idx] = new_line
                        required_imports.add(suggested_type)
                        break
            
            # Add required imports at the top
            if required_imports:
                lines = self._add_imports(lines, required_imports)
            
            # Write back to file
            file_path.write_text('\n'.join(lines), encoding='utf-8')
            
            rel_path = file_path.relative_to(self.backend_path)
            print(f"✅ Fixed {len(fixes)} annotations in {rel_path}")
            return True
            
        except Exception as e:
            print(f"❌ Error fixing {file_path}: {e}")
            return False
    
    def _add_imports(self, lines: list[str], required_types: set[str]) -> list[str]:
        """Add required imports to the file"""
        imports_to_add = set()
        
        for type_annotation in required_types:
            import_line = REQUIRED_IMPORTS.get(type_annotation)
            if import_line:
                imports_to_add.add(import_line)
        
        if not imports_to_add:
            return lines
        
        # Find where to insert imports (after existing imports, before first def/class)
        insert_idx = 0
        in_imports = False
        
        for idx, line in enumerate(lines):
            stripped = line.strip()
            
            # Skip docstrings at the top
            if stripped.startswith('"""') or stripped.startswith("'''"):
                continue
            
            # Track if we're in import section
            if stripped.startswith('import ') or stripped.startswith('from '):
                in_imports = True
                insert_idx = idx + 1
            elif in_imports and stripped and not stripped.startswith('#'):
                # End of import section
                break
        
        # Check if imports already exist
        existing_imports = '\n'.join(lines[:insert_idx])
        new_imports = []
        
        for import_line in sorted(imports_to_add):
            # Handle multi-line import strings (split on \n)
            import_statements = import_line.split('\n')
            for statement in import_statements:
                if statement and statement not in existing_imports:
                    new_imports.append(statement)
        
        if new_imports:
            # Insert new imports (deduplicate)
            unique_imports = list(dict.fromkeys(new_imports))
            lines = lines[:insert_idx] + unique_imports + [''] + lines[insert_idx:]
        
        return lines
    
    def print_summary(self) -> None:
        """Print summary of operations"""
        print("\n" + "=" * 80)
        print("📊 SUMMARY")
        print("=" * 80)
        print(f"Files scanned:    {self.stats['files_scanned']}")
        print(f"Errors found:     {self.stats['errors_found']}")
        print(f"Fixes applied:    {self.stats['fixes_applied']}")
        print(f"Files modified:   {self.stats['files_modified']}")
        print("=" * 80)


def main():
    parser = argparse.ArgumentParser(
        description='Automatically fix type annotations based on Pyright errors',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/auto_fix_type_annotations.py                    # Dry run preview
  python scripts/auto_fix_type_annotations.py --fix             # Apply fixes
  python scripts/auto_fix_type_annotations.py --scan --fix      # Scan and fix
        """
    )
    parser.add_argument('--scan', action='store_true', help='Run Pyright scan first')
    parser.add_argument('--fix', action='store_true', help='Apply fixes (default is dry run)')
    parser.add_argument('--output', type=str, help='Path to existing Pyright JSON output')
    
    args = parser.parse_args()
    
    # Initialize fixer
    fixer = TypeAnnotationFixer()
    
    # Get Pyright output
    if args.output:
        print(f"📄 Reading Pyright output from {args.output}")
        with open(args.output, 'r') as f:
            pyright_output = json.load(f)
    elif args.scan:
        pyright_output = fixer.run_pyright_scan()
    else:
        print("❌ Either --scan or --output must be provided")
        print("   Run with --help for usage information")
        sys.exit(1)
    
    # Analyze and apply fixes
    fixer.analyze_errors(pyright_output)
    fixer.preview_fixes()
    fixer.apply_fixes(dry_run=not args.fix)
    fixer.print_summary()
    
    if not args.fix and fixer.fixes_by_file:
        print("\n💡 Run with --fix to apply these changes")


if __name__ == '__main__':
    main()
