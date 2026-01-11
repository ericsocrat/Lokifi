import json

with open("htmlcov/status.json") as f:
    data = json.load(f)

files = []
for file_data in data["files"].values():
    coverage = file_data.get("summary", {}).get("percent_covered", 0)
    statements = file_data.get("summary", {}).get("num_statements", 0)
    path = file_data.get("file_path", "")
    missing = statements - file_data.get("summary", {}).get("covered_lines", 0)

    if (
        path.startswith("app/")
        and 40 <= coverage < 85
        and 20 <= statements <= 300
        and missing > 0
    ):
        files.append((path, coverage, statements, missing))

files.sort(key=lambda x: (-x[1], x[3]))

print("Top Coverage Targets (40-85%, 20-300 stmts):")
print("=" * 80)
for i, (path, cov, stmts, missing) in enumerate(files[:15], 1):
    print(f"{i:2}. {path:<50} {cov:>6.1f}% ({missing:>3} lines)")
