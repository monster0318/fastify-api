# GitHub Actions Workflow Validation Script (PowerShell)
# This script validates the workflow files and checks for common issues

Write-Host "🔍 Validating GitHub Actions workflows..." -ForegroundColor Cyan

# Check if workflow files exist
$workflows = @(
    ".github/workflows/ci.yml",
    ".github/workflows/quick-ci.yml", 
    ".github/workflows/security-quality.yml"
)

foreach ($workflow in $workflows) {
    if (Test-Path $workflow) {
        Write-Host "✅ Found: $workflow" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing: $workflow" -ForegroundColor Red
        exit 1
    }
}

# Check for required scripts in package.json
Write-Host "🔍 Checking required npm scripts..." -ForegroundColor Cyan

$requiredScripts = @(
    "lint",
    "format:check", 
    "typecheck",
    "test:run",
    "test:coverage",
    "prisma:generate",
    "build"
)

foreach ($script in $requiredScripts) {
    try {
        $null = npm run $script --dry-run 2>$null
        Write-Host "✅ Script exists: $script" -ForegroundColor Green
    } catch {
        Write-Host "❌ Missing script: $script" -ForegroundColor Red
        exit 1
    }
}

Write-Host "🎉 All validations passed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Commit and push these workflow files to your repository"
Write-Host "2. Check the Actions tab in GitHub to see workflows running" 
Write-Host "3. Configure any required secrets in repository settings"
Write-Host "4. Consider setting up branch protection rules"
