"""Fix docstring syntax errors in test files."""
import os
import re

# Walk through all test files
count = 0
patterns_fixed = 0
for root, dirs, files in os.walk('tests'):
    for file in files:
        if file.endswith('.py'):
            filepath = os.path.join(root, file)
            
            # Read file
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Replace ALL two-quote docstrings with three-quote docstrings
            # Pattern: match any string that starts/ends with exactly two quotes (not three)
            new_content = re.sub(r'(?<!")""(?!")([^"]+?)""(?!")', r'"""\1"""', content)
            
            # Only write if changed
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                count += 1
                # Count how many patterns were fixed
                patterns_fixed += len(re.findall(r'(?<!")""(?!")([^"]+?)""(?!")', content))
                print(f"Fixed: {filepath}")

print(f"\nFixed {count} files with {patterns_fixed} docstring errors")
