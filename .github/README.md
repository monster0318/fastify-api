# GitHub Actions CI/CD Setup

This project uses GitHub Actions for continuous integration and deployment. The CI pipeline ensures code quality, runs tests, and performs security checks.

## Workflows

### 1. Main CI Pipeline (`.github/workflows/ci.yml`)

**Triggers:** Push/PR to `main` or `develop` branches

**Features:**
- Runs on Node.js 18.x and 20.x (matrix strategy)
- Installs dependencies with `npm ci`
- Generates Prisma client
- Runs ESLint for code linting
- Checks Prettier formatting
- Performs TypeScript type checking
- Runs all tests
- Generates test coverage reports
- Uploads coverage to Codecov
- Builds the project
- Uploads build artifacts

**Jobs:**
- `lint-typecheck-test`: Main CI job with matrix strategy
- `build`: Build verification job (runs after main job passes)

### 2. Quick CI (`.github/workflows/quick-ci.yml`)

**Triggers:** Push/PR to `main` branch only

**Features:**
- Faster feedback for main branch
- Single Node.js version (20.x)
- Essential checks only: lint, format, typecheck, test
- No coverage or build steps

### 3. Security & Quality Checks (`.github/workflows/security-quality.yml`)

**Triggers:** 
- Weekly schedule (Mondays at 2 AM)
- Push/PR to `main` branch

**Features:**
- Security audit with `npm audit`
- Outdated package detection
- Detailed ESLint analysis
- Coverage reporting
- Artifact uploads for analysis

## Available Scripts

The CI uses these npm scripts from `package.json`:

```bash
# Linting and Formatting
npm run lint              # ESLint check
npm run lint:fix          # ESLint with auto-fix
npm run format:check      # Prettier format check
npm run format           # Prettier format fix

# Type Checking
npm run typecheck         # TypeScript type check

# Testing
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:coverage    # Run tests with coverage

# Database
npm run prisma:generate  # Generate Prisma client

# Build
npm run build            # TypeScript compilation
```

## CI Best Practices

### 1. **Caching**
- Node.js dependencies are cached using `cache: 'npm'`
- Significantly reduces build times

### 2. **Matrix Strategy**
- Tests against multiple Node.js versions (18.x, 20.x)
- Ensures compatibility across different environments

### 3. **Job Dependencies**
- Build job only runs after lint/typecheck/test passes
- Prevents unnecessary builds on failing code

### 4. **Artifact Management**
- Build artifacts are uploaded and retained for 7 days
- ESLint results are saved for analysis

### 5. **Coverage Reporting**
- Coverage reports are uploaded to Codecov
- Different flags for different workflows
- Non-blocking (won't fail CI if coverage upload fails)

## Local Development

To run the same checks locally that CI runs:

```bash
# Install dependencies
npm ci

# Generate Prisma client
npm run prisma:generate

# Run all CI checks
npm run lint
npm run format:check
npm run typecheck
npm run test:run
npm run build
```

## Troubleshooting

### Common Issues

1. **ESLint Errors**
   - Run `npm run lint:fix` to auto-fix issues
   - Check `.eslintrc` configuration

2. **TypeScript Errors**
   - Run `npm run typecheck` to see detailed errors
   - Check `tsconfig.json` configuration

3. **Test Failures**
   - Run `npm run test:run` locally
   - Check test files in `src/test/` directory

4. **Build Failures**
   - Ensure all TypeScript errors are resolved
   - Check `tsconfig.build.json` configuration

### CI Debugging

- Check the Actions tab in your GitHub repository
- Look at the specific job logs for detailed error messages
- Use the "Re-run jobs" feature to retry failed workflows

## Customization

### Adding New Checks

1. Add the script to `package.json`
2. Add the step to the appropriate workflow file
3. Consider caching if the step is expensive

### Modifying Triggers

Update the `on:` section in workflow files:

```yaml
on:
  push:
    branches: [ main, develop, feature/* ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
```

### Environment Variables

Add secrets in GitHub repository settings and reference them:

```yaml
- name: Run with secrets
  run: npm run some-script
  env:
    API_KEY: ${{ secrets.API_KEY }}
```
