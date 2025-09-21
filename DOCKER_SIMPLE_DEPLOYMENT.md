# Simplified Docker Deployment Guide

This guide covers deploying the Capital Marketplace Backend using Docker with SQLite database.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git repository cloned

### One-Command Deployment
```bash
# Linux/macOS
./deploy.sh deploy

# Windows
deploy.bat deploy
```

## 📁 File Structure

```
├── Dockerfile                    # Production Dockerfile
├── docker-compose.yml           # Docker Compose configuration
├── docker.env.example          # Environment variables template
├── deploy.sh                   # Linux/macOS deployment script
├── deploy.bat                  # Windows deployment script
└── prisma/
    └── schema.prisma           # SQLite schema
```

## 🔧 Configuration

### 1. Environment Variables

Copy the example environment file and configure it:
```bash
cp docker.env.example .env
```

**Required Variables:**
```env
# API Configuration
API_PORT=4000
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key_change_me_in_production
MAX_UPLOAD_SIZE_BYTES=8000000

# Database (SQLite)
DATABASE_URL=file:./data/prod.db

# Optional: External Services
KNOCK_API_KEY=your_knock_api_key
ABLY_API_KEY=your_ably_api_key
VIRUS_TOTAL_API_KEY=your_virus_total_api_key
```

## 🐳 Docker Services

### Services Overview

| Service | Port | Description |
|---------|------|-------------|
| **api** | 4000 | Main Fastify API application with SQLite |

### Architecture
```
┌─────────────┐
│     API     │
│  (Port 4000)│
│  + SQLite   │
└─────────────┘
```

## 🚀 Deployment Methods

### Method 1: Using Deployment Scripts

**Linux/macOS:**
```bash
# Full deployment
./deploy.sh deploy

# Individual commands
./deploy.sh build     # Build image
./deploy.sh start      # Start service
./deploy.sh migrate    # Run migrations
./deploy.sh seed       # Seed database
./deploy.sh logs       # View logs
./deploy.sh status     # Check status
./deploy.sh stop       # Stop service
```

**Windows:**
```cmd
# Full deployment
deploy.bat deploy

# Individual commands
deploy.bat build
deploy.bat start
deploy.bat migrate
deploy.bat seed
deploy.bat logs
deploy.bat status
deploy.bat stop
```

### Method 2: Manual Docker Compose

```bash
# Build and start service
docker-compose up -d --build

# Run database migrations
docker-compose exec api npx prisma migrate deploy

# Seed the database
docker-compose exec api npx prisma db seed

# View logs
docker-compose logs -f

# Stop service
docker-compose down
```

### Method 3: Individual Docker Commands

```bash
# Build the API image
docker build -t capital-marketplace-api .

# Run the API
docker run -d --name api \
  -e DATABASE_URL=file:./data/prod.db \
  -e JWT_SECRET=your-secret \
  -p 4000:4000 \
  -v uploads_data:/app/uploads \
  -v database_data:/app/data \
  capital-marketplace-api
```

## 🔍 Monitoring and Health Checks

### Health Check Endpoint
```bash
curl http://localhost:4000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production"
}
```

### Service Status
```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs api
```

### Resource Monitoring
```bash
# Container resource usage
docker stats

# Disk usage
docker system df
```

## 🔒 Security Considerations

### 1. Environment Variables
- Never commit `.env` to version control
- Use strong, unique JWT secrets
- Rotate secrets regularly

### 2. File Permissions
- SQLite database files are stored in Docker volumes
- Uploads are stored in separate Docker volumes
- Non-root user execution in container

### 3. Network Security
- Configure firewall rules
- Use HTTPS in production (configure reverse proxy)
- Implement rate limiting (already included)

## 📊 Data Management

### Database Backup
```bash
# Create backup
./deploy.sh backup

# Or manually
docker-compose exec api cp /app/data/prod.db /app/uploads/backup.db
docker cp $(docker-compose ps -q api):/app/uploads/backup.db .
```

### Database Restore
```bash
# Copy backup to container
docker cp backup.db $(docker-compose ps -q api):/app/data/prod.db

# Restart service
docker-compose restart api
```

## 🔄 CI/CD Integration

### GitHub Actions
The repository includes automated CI/CD workflows:

1. **CI Pipeline** (`.github/workflows/ci.yml`):
   - Lint and type checking
   - Unit tests
   - Docker image building
   - Docker Compose testing

2. **Deployment Pipeline** (`.github/workflows/deploy.yml`):
   - Container registry push
   - Production deployment
   - Health checks

## 🛠️ Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check database file permissions
docker-compose exec api ls -la /app/data/

# Check logs
docker-compose logs api
```

**2. API Not Starting**
```bash
# Check logs
docker-compose logs api

# Check environment variables
docker-compose exec api env
```

**3. File Upload Issues**
```bash
# Check uploads directory
docker-compose exec api ls -la /app/uploads/

# Check volume mounts
docker volume ls
```

### Debugging Commands
```bash
# Enter API container
docker-compose exec api sh

# Check database
docker-compose exec api npx prisma studio

# View all logs
docker-compose logs --tail=100 -f
```

## 📈 Scaling Considerations

### Single Container Deployment
This setup is optimized for:
- Development environments
- Small to medium production deployments
- Applications with moderate traffic

### For High Traffic
Consider:
- Adding a reverse proxy (Nginx)
- Implementing horizontal scaling
- Moving to PostgreSQL for better concurrency
- Adding Redis for caching

## 🔧 Maintenance

### Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
./deploy.sh deploy
```

### Cleanup
```bash
# Remove unused resources
./deploy.sh cleanup

# Or manually
docker system prune -f
docker volume prune -f
```

## 📞 Support

For issues or questions:
1. Check the logs: `./deploy.sh logs`
2. Verify configuration: `./deploy.sh status`
3. Review this documentation
4. Check GitHub Issues

---

**Note**: This simplified setup is perfect for development and small production deployments. For high-traffic production environments, consider the full PostgreSQL + Redis setup.
