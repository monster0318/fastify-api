#!/bin/bash

# GitHub Actions Workflow Validation Script
# This script validates the workflow files and checks for common issues

echo "🔍 Validating GitHub Actions workflows..."

# Check if workflow files exist
WORKFLOWS=(
  ".github/workflows/ci.yml"
  ".github/workflows/quick-ci.yml"
  ".github/workflows/security-quality.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
  if [ -f "$workflow" ]; then
    echo "✅ Found: $workflow"
  else
    echo "❌ Missing: $workflow"
    exit 1
  fi
done

# Validate YAML syntax (requires yq or python-yaml)
echo "🔍 Validating YAML syntax..."

if command -v yq &> /dev/null; then
  for workflow in "${WORKFLOWS[@]}"; do
    if yq eval '.' "$workflow" > /dev/null 2>&1; then
      echo "✅ Valid YAML: $workflow"
    else
      echo "❌ Invalid YAML: $workflow"
      exit 1
    fi
  done
else
  echo "⚠️  yq not found, skipping YAML validation"
fi

# Check for required scripts in package.json
echo "🔍 Checking required npm scripts..."

REQUIRED_SCRIPTS=(
  "lint"
  "format:check"
  "typecheck"
  "test:run"
  "test:coverage"
  "prisma:generate"
  "build"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
  if npm run "$script" --dry-run > /dev/null 2>&1; then
    echo "✅ Script exists: $script"
  else
    echo "❌ Missing script: $script"
    exit 1
  fi
done

echo "🎉 All validations passed!"
echo ""
echo "📋 Next steps:"
echo "1. Commit and push these workflow files to your repository"
echo "2. Check the Actions tab in GitHub to see workflows running"
echo "3. Configure any required secrets in repository settings"
echo "4. Consider setting up branch protection rules"
