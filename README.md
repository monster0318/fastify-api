
# Invest Platform API (backend)

This repo contains the Fastify + TypeScript backend for the test project. It includes:
- JWT cookie auth (register/login)
- Company onboarding endpoints
- Mock KYC endpoint
- Mock financials link endpoint
- File uploads (pdf/pptx/xlsx) with size limits
- Notifications
- Investability score endpoint
- Real-time chat via WebSocket + REST fallback
- Prisma + SQLite + seed
- Basic tests (vitest)

## Quick start (local)

1. Install:
```bash
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```

2. Default seed user: `founder@example.com` / `password123`

3. API examples (use cookie jar to store session):
```bash
curl -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" -d '{"email":"founder@example.com","password":"password123"}' -c cookiejar
curl -b cookiejar http://localhost:4000/api/company
curl -X POST -b cookiejar http://localhost:4000/api/kyc/verify
```

## ENV
See .env.example. Keep secrets out of git.

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Run TypeScript type checking

## Docker Deployment

This project includes a simplified Docker deployment setup perfect for development and small production environments:

### Quick Start
```bash
# Copy environment configuration
cp docker.env.example .env
# Edit .env with your production values

# Deploy with one command
./deploy.sh deploy  # Linux/macOS
# or
deploy.bat deploy   # Windows
```

### Services Included
- **API**: Fastify application with SQLite database (port 4000)
- **Volumes**: Persistent storage for uploads and database

### Features
- Single-container deployment
- SQLite database (no external database required)
- Multi-stage Docker builds
- Health checks and monitoring
- Automated migrations and seeding
- File upload handling
- WebSocket support

📖 **Full Docker deployment guide**: See [DOCKER_SIMPLE_DEPLOYMENT.md](./DOCKER_SIMPLE_DEPLOYMENT.md)

## CI/CD

This project includes GitHub Actions CI that runs on every push and pull request:

- **Lint**: ESLint + Prettier formatting checks
- **Type Check**: TypeScript compilation without emit
- **Test**: Unit tests with Vitest (requires PostgreSQL service)
- **Build**: Production build verification
- **Docker**: Docker image building and testing
- **Deploy**: Automated production deployment

The CI workflow is configured in `.github/workflows/ci.yml` and includes:
- Node.js 20 setup with npm caching
- SQLite database for tests
- Prisma client generation
- Test database setup and seeding
- Docker image building and testing
- Build artifact upload

## Notes
- This is a development/test scaffold. In production: use Postgres, secure secrets, enable HTTPS, and run proper migrations.
