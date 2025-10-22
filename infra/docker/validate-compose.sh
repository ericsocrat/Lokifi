#!/bin/bash
# Docker Compose Validation Script
# Validates all compose files for syntax errors and misconfigurations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔍 Validating Docker Compose Files..."
echo "======================================"

ERRORS=0

# Function to validate a compose file
validate_compose() {
    local file=$1
    echo ""
    echo "📄 Validating: $file"

    if [ ! -f "$file" ]; then
        echo "❌ File not found: $file"
        ERRORS=$((ERRORS + 1))
        return
    fi

    # Check if file is valid YAML and compose syntax
    if docker compose -f "$file" config --quiet > /dev/null 2>&1; then
        echo "✅ $file is valid"
    else
        echo "❌ $file has syntax errors:"
        docker compose -f "$file" config 2>&1 || true
        ERRORS=$((ERRORS + 1))
    fi
}

# Validate all compose files
validate_compose "docker-compose.yml"
validate_compose "docker-compose.override.yml"
validate_compose "docker-compose.prod-minimal.yml"
validate_compose "docker-compose.production.yml"

# Combined validation (yml + override)
echo ""
echo "📄 Validating: docker-compose.yml + override"
if docker compose config --quiet > /dev/null 2>&1; then
    echo "✅ Combined config is valid"
else
    echo "❌ Combined config has errors:"
    docker compose config 2>&1 || true
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "======================================"
if [ $ERRORS -eq 0 ]; then
    echo "✅ All compose files are valid!"
    exit 0
else
    echo "❌ Found $ERRORS error(s)"
    exit 1
fi
