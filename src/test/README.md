# Test Organization

This directory contains all test files organized by their corresponding source modules.

## Structure

```
src/test/
├── routes/           # Tests for route handlers
│   ├── capital-table.test.ts
│   ├── companies.test.ts
│   ├── notifications.test.ts
│   └── scoring.test.ts
└── services/         # Tests for service modules
    └── scoring.test.ts
```

## Running Tests

From the project root:

```bash
# Run all tests
npm run test

# Run tests once (no watch mode)
npm run test:run

# Run tests with coverage
npm run test:coverage
```

## Test Organization Benefits

1. **Clear Separation**: Tests are separated from source code, making the main source directories cleaner
2. **Logical Grouping**: Tests are organized by module type (routes, services, etc.)
3. **Easy Discovery**: All tests are in one place, making them easier to find and maintain
4. **Consistent Structure**: Follows common testing conventions used in many projects
