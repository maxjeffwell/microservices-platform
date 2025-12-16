# Vertex Platform

[![Build and Push Docker Images](https://github.com/maxjeffwell/microservices-platform/actions/workflows/build-and-deploy-vertex.yml/badge.svg)](https://github.com/maxjeffwell/microservices-platform/actions/workflows/build-and-deploy-vertex.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Production-ready microservices platform for building SaaS applications. Use it to accelerate client projects or deploy your own Developer Productivity Suite.

## What Is This?

Vertex Platform is a **consulting accelerator** and **product foundation** rolled into one:

- **For Consulting**: Launch client projects in weeks instead of months using battle-tested auth, analytics, and infrastructure
- **For Product**: Build a Developer Productivity Suite with integrated tools for learning, collaboration, and organization

### The Business Model

```
┌─────────────────────────────────────────────────────────────────┐
│  SHORT-TERM: Consulting Revenue                                  │
│  • Use platform to build client MVPs fast                       │
│  • Each project improves the platform                            │
│  • Bill $150-250/hr with faster delivery                        │
├─────────────────────────────────────────────────────────────────┤
│  LONG-TERM: Developer Productivity Suite (SaaS)                 │
│  • Code Talk: Collaborative coding & technical interviews       │
│  • FireBook: AI-powered developer bookmarks & research          │
│  • IntervalAI: Spaced repetition for learning programming       │
│  • educationELLy: Track your learning journey                   │
└─────────────────────────────────────────────────────────────────┘
```

## Platform Services (Ready to Use)

These shared services work out of the box and accelerate any SaaS project:

| Service | Status | What It Does |
|---------|--------|--------------|
| **Auth Service** | Production | JWT auth, refresh tokens, multi-device support, SSO-ready |
| **Analytics Service** | Production | Event tracking, metrics, time-series queries via Kafka + InfluxDB |
| User Service | Planned | Profiles, preferences, cross-app identity |
| Notification Service | Planned | Email, SMS, push via message queue |
| Media Service | Planned | File uploads, S3/R2 storage, CDN delivery |
| Search Service | Planned | Full-text search via Elasticsearch |

## Technology Stack

**Backend**: Node.js, Express, Python/FastAPI (ML), GraphQL, Socket.io
**Databases**: PostgreSQL (Neon), MongoDB, Redis, InfluxDB, Elasticsearch
**Infrastructure**: Docker, Kubernetes-ready, Istio service mesh
**Messaging**: Kafka, RabbitMQ
**Observability**: Structured logging, health checks, correlation IDs

## Quick Start

### Local Development

```bash
# Clone and install
git clone https://github.com/maxjeffwell/microservices-platform.git
cd microservices-platform
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Neon DB URL and secrets

# Start infrastructure + services
docker compose up -d

# Services available at:
# Auth API: http://localhost:3001
# Analytics API: http://localhost:3005
```

### Production Deployment (VPS)

```bash
# 1. Copy project to your VPS
scp -r . user@your-vps:/opt/vertex-platform

# 2. SSH into VPS
ssh user@your-vps
cd /opt/vertex-platform

# 3. Configure production environment
cp .env.production.example .env.production
nano .env.production  # Fill in your values

# 4. Deploy
./deploy.sh setup   # First time only
./deploy.sh deploy  # Pull images and start services

# Your API is now live at https://your-domain.com
```

### Deployment Commands

```bash
./deploy.sh deploy   # Full deployment (pull + restart)
./deploy.sh status   # Check service health
./deploy.sh logs     # View all logs
./deploy.sh logs auth-service  # View specific service
./deploy.sh backup   # Backup data volumes
./deploy.sh health   # Run health checks
```

## API Endpoints

### Auth Service (`/api/auth`)

```bash
# Register
POST /api/auth/signup
{ "email": "user@example.com", "password": "secure123", "name": "User" }

# Login
POST /api/auth/signin
{ "email": "user@example.com", "password": "secure123" }

# Refresh token
POST /api/auth/refresh
{ "refreshToken": "..." }

# Verify token
GET /api/auth/verify
Authorization: Bearer <token>

# Logout
POST /api/auth/signout
Authorization: Bearer <token>
```

### Analytics Service (`/api/analytics`)

```bash
# Track event
POST /api/analytics/events
{
  "appId": "code-talk",
  "userId": "user-123",
  "eventType": "feature",
  "eventName": "room_created",
  "properties": { "roomType": "interview" }
}

# Record metric
POST /api/analytics/metrics
{
  "appId": "code-talk",
  "metricName": "active_users",
  "metricType": "gauge",
  "value": 42
}

# Query data
GET /api/analytics/query?appId=code-talk&startTime=-7d&aggregation=count
```

## Project Structure

```
vertex-platform/
├── services/
│   └── platform/           # Shared services (use these for any project)
│       ├── auth-service/   # JWT authentication
│       └── analytics-service/  # Event tracking + metrics
├── shared/                 # Reusable libraries
│   ├── errors/            # Centralized error handling
│   ├── logger/            # Winston logging with rotation
│   ├── middleware/        # Auth, rate limiting, health checks
│   └── utils/             # Common utilities
├── docker-compose.yml      # Local development
├── docker-compose.prod.yml # Production deployment
├── Caddyfile              # Reverse proxy + auto-SSL
├── deploy.sh              # One-command deployment
└── .env.production.example # Production config template
```

## For Consulting Clients

When you engage me for a project, you get:

1. **Faster Delivery**: Auth, analytics, and infrastructure are already built
2. **Production Quality**: Battle-tested code with proper error handling, logging, security
3. **Scalable Architecture**: Microservices that scale independently
4. **Modern Stack**: Current best practices, not legacy patterns
5. **Documentation**: Clear API docs and deployment guides

**Typical Timeline**:
- Traditional approach: 4-6 months
- With Vertex Platform: 4-8 weeks

## Developer Productivity Suite (Product Roadmap)

The long-term vision is a suite of integrated tools for developers:

### Code Talk
Real-time collaborative code editor for pair programming and technical interviews.
- WebSocket-based real-time sync
- Room management with permissions
- Integrated chat
- Code execution sandbox

### FireBook
AI-powered bookmark manager for developer research and documentation.
- Auto-extract metadata from URLs
- AI tagging and categorization
- Screenshot capture
- Smart collections

### IntervalAI
Spaced repetition system optimized for learning programming concepts.
- ML-optimized review scheduling
- Programming-specific content types
- Progress tracking
- API documentation flashcards

### educationELLy
Track your learning journey across tutorials, courses, and projects.
- Progress dashboards
- Learning path recommendations
- Integration with other tools

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Caddy (Reverse Proxy + SSL)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                     Platform Network                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Auth Service │  │  Analytics   │  │  Future Services...   │  │
│  │   (3001)     │  │   (3005)     │  │                       │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────────────────┘  │
│         │                 │                                      │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────────────────────┐  │
│  │    Redis     │  │   InfluxDB   │  │   Kafka + Zookeeper  │  │
│  │   (cache)    │  │ (time-series)│  │   (event streaming)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │   MongoDB    │  │  PostgreSQL  │  (Neon - external)         │
│  │  (documents) │  │ (relational) │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

## Security

- JWT with refresh token rotation
- Password hashing (bcrypt, 10 rounds)
- Rate limiting per endpoint
- CORS protection
- Security headers (Helmet.js)
- Input validation
- Non-root Docker containers
- Internal network isolation (only Caddy exposed)

## What This Demonstrates

- Platform engineering at scale
- Microservices architecture with clear boundaries
- Production deployment practices
- Security-first design
- Observability and monitoring
- Clean code organization
- Comprehensive documentation

## Contact

**Jeff Maxwell** - Full-Stack Engineer & Platform Architect

- GitHub: [@maxjeffwell](https://github.com/maxjeffwell)
- LinkedIn: [Jeff Maxwell](https://linkedin.com/in/jeffmaxwell)
- Portfolio: [el-jefe.me](https://el-jefe.me)
- Email: maxjeffwell@gmail.com

**Interested in working together?** I help startups and businesses build production-ready backends in weeks, not months.

---

MIT License - See [LICENSE](LICENSE) for details
