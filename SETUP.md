# Setup Guide

Complete guide to setting up the Microservices Platform for development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Docker** ([Download](https://www.docker.com/products/docker-desktop))
- **docker-compose** (usually included with Docker Desktop)
- **Git**
- **kubectl** (for Kubernetes deployment)
- **Helm** 3.x (for Kubernetes package management)

### Verify Installation

```bash
node --version   # Should be 18.x or higher
docker --version
docker-compose --version
git --version
kubectl version --client
helm version
```

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/maxjeffwell/microservices-platform.git
cd microservices-platform
```

### 2. Run Setup Script

```bash
./scripts/setup/install.sh
```

This script will:
- Install root dependencies
- Install shared library dependencies
- Create `.env` file from `.env.example`

### 3. Configure Environment

Edit the `.env` file with your actual configuration:

```bash
# Copy the example if you haven't already
cp .env.example .env

# Edit with your preferred editor
nano .env  # or vim, code, etc.
```

**Important configurations to update**:
- `JWT_SECRET` - Change to a secure random string
- `SENDGRID_API_KEY` - Your SendGrid API key (for email notifications)
- `POSTGRES_PASSWORD` - Change default passwords
- `MONGODB_PASSWORD` - Change default passwords
- `REDIS_PASSWORD` - Change default passwords
- `RABBITMQ_PASSWORD` - Change default passwords

### 4. Start Development Environment

```bash
# Start all infrastructure services
./scripts/dev/start.sh

# Or use npm script
npm run dev
```

This will start:
- PostgreSQL (port 5432)
- MongoDB (port 27017)
- Redis (port 6379)
- RabbitMQ (port 5672, Management UI: 15672)
- MinIO (port 9000, Console: 9001)
- Elasticsearch (port 9200)
- InfluxDB (port 8086)

### 5. Verify Services Are Running

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Check specific service
docker-compose logs -f postgres
```

## Development Workflow

### Building Your First Service (Auth Service)

1. **Create service directory structure**:

```bash
mkdir -p services/platform/auth-service
cd services/platform/auth-service
```

2. **Initialize Node.js project**:

```bash
npm init -y
```

3. **Update package.json** to use ES6 modules:

```json
{
  "name": "auth-service",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js",
    "test": "jest"
  }
}
```

4. **Install dependencies**:

```bash
npm install express pg bcryptjs jsonwebtoken dotenv cors helmet
npm install --save-dev nodemon jest
```

5. **Create service files**:

```bash
touch index.js
touch config.js
mkdir routes models middleware
```

6. **Add to docker-compose.yml** (already included in template)

### Using Shared Libraries

All services can use the shared libraries:

```javascript
// Import shared utilities
import { createLogger } from '@platform/logger';
import { UnauthorizedError, errorHandler } from '@platform/errors';
import { authenticateToken, correlationIdMiddleware } from '@platform/middleware';
import { retryWithBackoff, parseBoolean } from '@platform/utils';

// Create logger for your service
const logger = createLogger('auth-service');

// Use middleware
app.use(correlationIdMiddleware);
app.use(authenticateToken(process.env.JWT_SECRET));

// Use error handling
app.use(errorHandler(logger));
```

## Accessing Services

### Infrastructure Services

**PostgreSQL**:
```bash
# Connect with psql
docker-compose exec postgres psql -U platform -d auth

# Or use pgAdmin
open http://localhost:5050
# Email: admin@admin.com
# Password: admin
```

**MongoDB**:
```bash
# Connect with mongosh
docker-compose exec mongodb mongosh -u platform -p platform_password

# Or use Mongo Express
open http://localhost:8081
```

**RabbitMQ Management**:
```bash
open http://localhost:15672
# Username: platform
# Password: rabbitmq_password
```

**MinIO Console**:
```bash
open http://localhost:9001
# Username: minioadmin
# Password: minioadmin
```

**Elasticsearch**:
```bash
curl http://localhost:9200
```

**InfluxDB**:
```bash
open http://localhost:8086
# Username: admin
# Password: admin_password
```

### Development Tools

Start development tools (pgAdmin, Mongo Express):
```bash
docker-compose --profile tools up -d
```

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests for Specific Service

```bash
cd services/platform/auth-service
npm test
```

### Integration Tests

```bash
npm run test:integration
```

## Database Management

### Reset Databases

```bash
# Stop containers and remove volumes
docker-compose down -v

# Restart (will recreate databases)
docker-compose up -d
```

### Run Migrations

(To be implemented with each service)

```bash
cd services/platform/auth-service
npm run migrate
```

## Troubleshooting

### Containers Won't Start

```bash
# Check Docker is running
docker info

# Check for port conflicts
lsof -i :5432  # Check if PostgreSQL port is in use
lsof -i :27017 # Check if MongoDB port is in use

# Remove all containers and volumes
docker-compose down -v

# Rebuild and restart
docker-compose up --build
```

### Cannot Connect to Database

```bash
# Check if database is healthy
docker-compose ps

# View database logs
docker-compose logs postgres
docker-compose logs mongodb

# Verify environment variables
cat .env
```

### Shared Libraries Not Found

```bash
# Install shared libraries
cd shared/logger && npm install && cd ../..
cd shared/errors && npm install && cd ../..
cd shared/middleware && npm install && cd ../..
cd shared/utils && npm install && cd ../..

# Or use install script
./scripts/setup/install.sh
```

## Next Steps

1. **Build Platform Services** (Week 1-5):
   - Start with Auth Service
   - Then User Service
   - Then Notification Service
   - Then Media Service

2. **Follow Implementation Roadmap**: See `docs/IMPLEMENTATION_ROADMAP.md`

3. **Read Architecture Docs**: See `docs/ARCHITECTURE.md`

## Useful Commands

```bash
# Start development environment
npm run dev

# Stop all containers
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f auth-service

# Restart specific service
docker-compose restart auth-service

# Rebuild specific service
docker-compose up -d --build auth-service

# Execute command in running container
docker-compose exec auth-service npm test

# Check service health
docker-compose ps
```

## Environment Variables Reference

See `.env.example` for complete list. Key variables:

- `NODE_ENV` - development/production
- `LOG_LEVEL` - debug/info/warn/error
- `JWT_SECRET` - Secret for JWT tokens
- `*_SERVICE_PORT` - Port for each service
- `POSTGRES_*` - PostgreSQL configuration
- `MONGODB_*` - MongoDB configuration
- `REDIS_*` - Redis configuration
- `RABBITMQ_*` - RabbitMQ configuration

## Additional Resources

- [Architecture Documentation](docs/ARCHITECTURE.md)
- [Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md)
- [Docker Documentation](https://docs.docker.com/)
- [Node.js Documentation](https://nodejs.org/docs/)

## Support

For issues or questions:
- Check troubleshooting section above
- Review documentation in `docs/`
- Open an issue on GitHub

---

**Happy Building! 🚀**
