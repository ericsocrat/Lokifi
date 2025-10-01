"""
Lokifi Rebranding Script
Automatically renames all instances of Fynix/fynix to Lokifi/lokifi across the codebase
"""

import os
import re
from pathlib import Path
from typing import List, Tuple


class LokifiRebrander:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.changes_made = []
        self.errors = []

        # Files/folders to skip
        self.skip_patterns = [
            ".git",
            "__pycache__",
            "node_modules",
            "venv",
            ".env",
            "dist",
            "build",
            ".next",
            "uploads",
            "logs",
            "domain_research",  # Keep domain research as-is (historical)
            ".pyc",
            ".sqlite",
            ".db",
        ]

        # File extensions to process
        self.file_extensions = [
            ".py",
            ".js",
            ".jsx",
            ".ts",
            ".tsx",
            ".json",
            ".md",
            ".txt",
            ".yml",
            ".yaml",
            ".env.example",
            ".env.template",
            ".sh",
            ".bat",
            ".ps1",
            ".html",
            ".css",
            ".scss",
            ".sql",
            ".conf",
            ".config",
            ".ini",
            ".toml",
        ]

    def should_skip(self, path: Path) -> bool:
        """Check if path should be skipped."""
        path_str = str(path)
        return any(skip in path_str for skip in self.skip_patterns)

    def should_process_file(self, path: Path) -> bool:
        """Check if file should be processed."""
        if not path.is_file():
            return False
        if self.should_skip(path):
            return False
        return any(str(path).endswith(ext) for ext in self.file_extensions)

    def rebrand_content(self, content: str) -> Tuple[str, int]:
        """Replace all variations of Fynix with Lokifi."""
        changes = 0
        original_content = content

        # Replacement patterns (order matters!)
        replacements = [
            # All caps
            (r"\bFYNIX\b", "LOKIFI"),
            # Title case
            (r"\bFynix\b", "Lokifi"),
            # Lower case
            (r"\bfynix\b", "lokifi"),
        ]

        for pattern, replacement in replacements:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                changes += (
                    content.count(re.search(pattern, content).group(0))
                    if re.search(pattern, content)
                    else 0
                )
                content = new_content

        return content, changes

    def rebrand_file(self, file_path: Path) -> bool:
        """Rebrand a single file."""
        try:
            # Read file
            with open(file_path, "r", encoding="utf-8") as f:
                original_content = f.read()

            # Rebrand content
            new_content, changes = self.rebrand_content(original_content)

            # If changes were made, write back
            if changes > 0:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)

                relative_path = file_path.relative_to(self.project_root)
                self.changes_made.append((str(relative_path), changes))
                return True

            return False

        except Exception as e:
            self.errors.append((str(file_path), str(e)))
            return False

    def rename_file(self, file_path: Path) -> bool:
        """Rename file if it contains fynix in name."""
        try:
            name = file_path.name
            new_name = name

            # Replace fynix variations in filename
            if "fynix" in name.lower():
                new_name = name.replace("fynix", "lokifi")
                new_name = new_name.replace("Fynix", "Lokifi")
                new_name = new_name.replace("FYNIX", "LOKIFI")

                new_path = file_path.parent / new_name
                file_path.rename(new_path)

                relative_old = file_path.relative_to(self.project_root)
                relative_new = new_path.relative_to(self.project_root)
                self.changes_made.append(
                    (f"RENAMED: {relative_old} → {relative_new}", 1)
                )
                return True

            return False

        except Exception as e:
            self.errors.append((str(file_path), str(e)))
            return False

    def rename_directories(self) -> None:
        """Rename directories containing fynix (from deepest to shallowest)."""
        # Get all directories sorted by depth (deepest first)
        dirs = sorted(
            [
                d
                for d in self.project_root.rglob("*")
                if d.is_dir() and not self.should_skip(d)
            ],
            key=lambda x: len(x.parts),
            reverse=True,
        )

        for dir_path in dirs:
            if "fynix" in dir_path.name.lower():
                try:
                    new_name = dir_path.name.replace("fynix", "lokifi")
                    new_name = new_name.replace("Fynix", "Lokifi")
                    new_name = new_name.replace("FYNIX", "LOKIFI")

                    new_path = dir_path.parent / new_name
                    dir_path.rename(new_path)

                    relative_old = dir_path.relative_to(self.project_root)
                    relative_new = new_path.relative_to(self.project_root)
                    self.changes_made.append(
                        (f"RENAMED DIR: {relative_old} → {relative_new}", 1)
                    )

                except Exception as e:
                    self.errors.append((str(dir_path), str(e)))

    def rebrand_project(self) -> None:
        """Execute full rebranding."""
        print("🎨 LOKIFI REBRANDING TOOL")
        print("=" * 70)
        print(f"📁 Project root: {self.project_root}")
        print()
        print("🔍 Scanning for files to rebrand...")

        # Collect all files to process
        files_to_process = []
        for file_path in self.project_root.rglob("*"):
            if self.should_process_file(file_path):
                files_to_process.append(file_path)

        print(f"   Found {len(files_to_process)} files to process")
        print()

        # Process files
        print("📝 Rebranding file contents...")
        files_changed = 0
        total_changes = 0

        for file_path in files_to_process:
            if self.rebrand_file(file_path):
                files_changed += 1
                # Get the number of changes from the last entry
                if self.changes_made:
                    total_changes += self.changes_made[-1][1]

        print(f"   ✅ Changed {total_changes} instances in {files_changed} files")
        print()

        # Rename files
        print("📄 Renaming files...")
        files_renamed = 0
        for file_path in files_to_process:
            if self.rename_file(file_path):
                files_renamed += 1

        print(f"   ✅ Renamed {files_renamed} files")
        print()

        # Rename directories
        print("📂 Renaming directories...")
        dirs_before = len([d for d in self.changes_made if "RENAMED DIR" in str(d[0])])
        self.rename_directories()
        dirs_after = len([d for d in self.changes_made if "RENAMED DIR" in str(d[0])])
        dirs_renamed = dirs_after - dirs_before

        print(f"   ✅ Renamed {dirs_renamed} directories")
        print()

        # Print summary
        print("=" * 70)
        print("📊 REBRANDING SUMMARY")
        print("=" * 70)
        print(f"✅ Total changes made: {len(self.changes_made)}")
        print(f"✅ Files modified: {files_changed}")
        print(f"✅ Files renamed: {files_renamed}")
        print(f"✅ Directories renamed: {dirs_renamed}")

        if self.errors:
            print(f"\n⚠️  Errors encountered: {len(self.errors)}")

        print()

        # Print detailed changes (first 50)
        if self.changes_made:
            print("📋 Changes Made (showing first 50):")
            print("-" * 70)
            for i, (path, count) in enumerate(self.changes_made[:50]):
                if "RENAMED" in path:
                    print(f"   {path}")
                else:
                    print(f"   {path}: {count} changes")

            if len(self.changes_made) > 50:
                print(f"   ... and {len(self.changes_made) - 50} more changes")

        # Print errors if any
        if self.errors:
            print()
            print("⚠️  ERRORS:")
            print("-" * 70)
            for path, error in self.errors[:10]:
                print(f"   {path}: {error}")

            if len(self.errors) > 10:
                print(f"   ... and {len(self.errors) - 10} more errors")

        print()
        print("=" * 70)
        print("✨ REBRANDING COMPLETE!")
        print("=" * 70)
        print()
        print("📝 NEXT STEPS:")
        print("   1. Review changes: git diff")
        print("   2. Test the application thoroughly")
        print("   3. Update README.md with new project name")
        print("   4. Update package.json name field")
        print("   5. Update any hardcoded URLs or references")
        print("   6. Commit changes: git commit -am 'Rebrand from Fynix to Lokifi'")
        print()


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Rebrand Fynix to Lokifi")
    parser.add_argument(
        "--project-root",
        default=".",
        help="Project root directory (default: current directory)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be changed without making changes",
    )

    args = parser.parse_args()

    if args.dry_run:
        print("🔍 DRY RUN MODE - No changes will be made")
        print()

    # Get absolute path
    project_root = os.path.abspath(args.project_root)

    # Confirm
    print(f"About to rebrand project in: {project_root}")
    print("This will replace all instances of 'Fynix' with 'Lokifi'")
    print()

    if not args.dry_run:
        response = input("Continue? (yes/no): ")
        if response.lower() not in ["yes", "y"]:
            print("❌ Cancelled")
            return

    print()

    # Execute rebranding
    rebrander = LokifiRebrander(project_root)

    if args.dry_run:
        print("(Dry run mode - would make changes)")
    else:
        rebrander.rebrand_project()


if __name__ == "__main__":
    main()
