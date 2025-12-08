# Project Overview

## Summary

This is a **Portfolio Microservices Platform** demonstrating enterprise-grade platform engineering skills. It's a unified microservices architecture that orchestrates four existing applications into a cohesive platform with shared infrastructure services.

### Applications

The platform includes:

- **educationELLy**: English Language Learner management system with student tracking and assessments
- **Code Talk**: Real-time collaborative code editor with chat and room management
- **FireBook**: Intelligent bookmark manager with AI tagging and metadata extraction
- **IntervalAI**: Neural-enhanced spaced repetition learning with ML-optimized review scheduling

### Architecture Highlights

- **29 Microservices**: 6 shared platform services + 23 app-specific services
- **Kubernetes Orchestration** with Istio service mesh
- **Distributed Tracing** with Jaeger
- **Comprehensive Monitoring** with Prometheus & Grafana
- **API Gateway** for unified entry point
- **Cross-App Features**: SSO, unified analytics, shared services

## Goals

The project demonstrates:

- Microservices architecture with clear service boundaries
- Cloud-native development with Kubernetes and Istio
- Cross-app features: SSO, unified analytics, platform-wide search
- Platform engineering skills: shared services, observability, DevOps
- Domain-driven design with bounded contexts
- Reliability engineering: circuit breakers, retries, health checks

## Target Audience

- Potential employers seeking platform engineering expertise
- Recruiters evaluating microservices architecture skills
- Developers learning microservices patterns
- Technical interviewers assessing system design knowledge

## Current Implementation Status

### Completed

- Project structure and monorepo setup with npm workspaces
- Auth Service (complete with JWT, bcrypt, PostgreSQL)
- Analytics Service (complete with InfluxDB and Kafka)
- Shared libraries (@platform/errors, @platform/logger, @platform/middleware, @platform/utils)
- Docker Compose setup for local development
- Docker images and CI/CD with GitHub Actions
- Documentation (README, ARCHITECTURE, ROADMAP)

### Planned

- **Phase 1**: Remaining platform services (User, Notification, Media, Search)
- **Phase 2**: educationELLy services migration
- **Phase 3**: Kubernetes and Istio deployment
- **Phase 4**: Code Talk, FireBook, IntervalAI migrations
- **Phase 5**: Cross-app features (SSO, unified dashboard, platform-wide search)

---

# Technology Stack

## Languages

### JavaScript (Node.js 18+)
Primary backend language for microservices. Used for most platform and application services.

### Python (3.10+)
ML Inference Service using FastAPI for neural network predictions in IntervalAI.

## Backend Frameworks

### Express (v4.18.2)
REST API framework for most microservices including Auth Service, Analytics Service, and application-specific services.

### Apollo Server
GraphQL server for Code Talk services (Room Service, Messaging Service) providing real-time subscriptions.

### FastAPI
Python framework for ML Inference Service API in IntervalAI application.

### Socket.io
Real-time communication library for Code Talk collaboration service, enabling live code editing and chat.

## Frontend Frameworks

### React
Frontend framework for all four applications:
- educationELLy (with Redux)
- Code Talk (with Apollo Client)
- FireBook (with Vite)
- IntervalAI (with Redux)

### Redux
State management for educationELLy and IntervalAI frontends.

## Databases

### PostgreSQL (Neon)
Primary relational database for:
- Platform services: Auth, User, Notification, Media
- Code Talk: Rooms, Messages, Storage
- FireBook: Bookmarks, Collections
- educationELLy: Progress
- IntervalAI: Reviews, Training Data

### MongoDB (v7)
Document database for:
- educationELLy: Students, Assessments
- IntervalAI: Vocabulary

### Redis (v7)
In-memory database for:
- Caching and session storage
- Pub/sub messaging
- Code Talk presence tracking
- Job queues

### InfluxDB (v2.7)
Time-series database for analytics events and metrics aggregation.

### Elasticsearch
Full-text search across all applications (optional).

## Infrastructure

### Docker
Container platform for all services with Docker Compose for local development.

### Kubernetes
Container orchestration and deployment platform for production environments.

### Istio
Service mesh providing:
- mTLS encryption between services
- Traffic management and load balancing
- Circuit breakers and retry policies
- Distributed tracing integration

### Helm (v3.x)
Kubernetes package manager for managing deployments.

### Kong/Ambassador
API Gateway for:
- Request routing
- Rate limiting per user/app
- Authentication validation
- SSL termination

## Messaging & Events

### Kafka (v7.5.0)
Event streaming platform for analytics events with high-throughput message processing.

### RabbitMQ
Message queue for async communication including notifications and background jobs.

## Observability

### Jaeger
Distributed tracing across microservices to track request flows.

### Prometheus
Metrics collection and alerting with RED (Rate, Errors, Duration) metrics.

### Grafana
Metrics visualization and dashboards for service monitoring.

### ELK Stack / Loki
Centralized logging with correlation IDs for request tracing.

## Development Tools

### Jest (v29.7.0)
Testing framework for unit and integration tests.

### ESLint (v8.57.0)
Code linting with Airbnb base configuration.

### Prettier (v3.1.1)
Code formatting with default configuration.

### Nodemon (v3.0.2)
Development hot reloading for faster iteration.

### npm workspaces
Monorepo management for shared libraries and services.

## Key Libraries

- **jsonwebtoken (v9.0.2)**: JWT token generation and verification
- **bcryptjs (v2.4.3)**: Password hashing with salt rounds
- **helmet (v7.1.0)**: Security headers middleware
- **cors (v2.8.5)**: CORS middleware for API access
- **express-validator (v7.0.1)**: Request validation middleware
- **kafkajs (v2.2.4)**: Kafka client for Node.js
- **@influxdata/influxdb-client (v1.33.2)**: InfluxDB client for analytics
- **pg (v8.11.3)**: PostgreSQL client for Node.js

---

# Coding Standards

## Syntax Rules

- Use ES Modules (`type: "module"` in package.json)
- Use `async/await` for asynchronous operations
- Use `const` and `let` instead of `var`
- Use arrow functions for callbacks and functional programming
- Use template literals for string interpolation

## Style Guidelines

- Follow Airbnb JavaScript Style Guide (eslint-config-airbnb-base)
- Use Prettier for code formatting with default configuration
- Use 2 spaces for indentation (Prettier default)
- Use single quotes for strings (unless escaping)
- Maximum line length: not specified (default Prettier)

## Naming Conventions

- **Variables and functions**: camelCase
- **Classes and components**: PascalCase
- **Constants and environment variables**: UPPER_SNAKE_CASE
- **Service names**: `{domain}-service` (e.g., `auth-service`)
- **Database names**: `{app}_{domain}` (e.g., `education_elly_students`)
- **Shared packages**: `@platform` namespace (e.g., `@platform/logger`)

## Architecture Principles

- Each service owns its database exclusively (Database Per Service pattern)
- Services communicate via REST, GraphQL, or message queues - never direct database access
- Use shared libraries (@platform/errors, @platform/logger, @platform/middleware, @platform/utils) for common functionality
- Platform services are shared across all applications
- App-specific services belong to their respective application directories
- Frontend services are separate from backend services

## API Design

- RESTful endpoints follow pattern: `/resource/:id` for CRUD operations
- GraphQL services use Apollo Server with type-safe schema
- Use express-validator for request validation
- Return appropriate HTTP status codes (200, 201, 400, 401, 404, 500)
- Use middleware for cross-cutting concerns (authentication, logging, error handling)

## Security Requirements

- Use helmet for security headers
- Enable CORS with explicit origin configuration
- Use JWT for authentication with refresh tokens
- Hash passwords with bcrypt (10 rounds minimum)
- Store secrets in environment variables, never in code
- Use PostgreSQL SSL mode (`sslmode=require`) for database connections
- Implement rate limiting per user/app

## Testing Standards

- Use Jest as testing framework
- Write unit tests for business logic
- Write integration tests for API endpoints
- Use supertest for HTTP endpoint testing
- Mock external dependencies in tests
- Test files use `.test.js` or `.spec.js` suffix

## Error Handling

- Use centralized error handling middleware
- Use @platform/errors for standardized error responses
- Log errors with context using @platform/logger
- Return consistent error format: `{ error: { message, code, details } }`

## Logging Standards

- Use @platform/logger (Winston-based) for all logging
- Log levels: debug, info, warn, error
- Include correlation IDs for request tracing
- Structured logging with JSON format in production

## Documentation

- Document API endpoints with clear descriptions
- Include README.md in each service directory
- Document environment variables in .env.example
- Use JSDoc comments for complex functions

## Performance Guidelines

- Use connection pooling for databases
- Implement caching with Redis where appropriate
- Use async operations for I/O-bound tasks
- Optimize database queries with proper indexing

---

# Project Structure

```
microservices-platform/
├── docs/
│   ├── ARCHITECTURE.md          # Detailed architecture documentation
│   ├── IMPLEMENTATION_ROADMAP.md # Phase-by-phase implementation plan
│   └── NEON_DB_SETUP.md         # Database setup guide
├── infrastructure/
│   ├── api-gateway/             # Kong/Ambassador configurations
│   ├── istio/                   # Service mesh configs
│   │   ├── gateways/
│   │   ├── virtual-services/
│   │   └── destination-rules/
│   ├── kubernetes/              # K8s manifests
│   │   ├── base/                # Base configurations
│   │   └── overlays/            # Environment-specific overlays (dev/staging/prod)
│   └── monitoring/              # Observability stack
│       ├── prometheus/
│       ├── grafana/
│       └── jaeger/
├── scripts/
│   ├── deploy/                  # Deployment scripts
│   ├── dev/                     # Development scripts
│   │   └── start.sh
│   ├── setup/                   # Setup scripts
│   │   ├── init-postgres.sh
│   │   └── install.sh
│   └── test/                    # Testing scripts
├── services/
│   ├── platform/                # Shared platform services
│   │   ├── auth-service/        # JWT authentication & authorization
│   │   ├── analytics-service/   # Event tracking with InfluxDB & Kafka
│   │   ├── user-service/        # User profiles and preferences (planned)
│   │   ├── notification-service/ # Email/SMS/push notifications (planned)
│   │   ├── media-service/       # File uploads & CDN (planned)
│   │   └── search-service/      # Full-text search (planned)
│   ├── educationelly/           # educationELLy services
│   │   ├── student-service/     # Student records & demographics (planned)
│   │   ├── assessment-service/  # ELL proficiency & test scores (planned)
│   │   ├── progress-service/    # Academic progress tracking (planned)
│   │   └── frontend/            # React UI (planned)
│   ├── code-talk/               # Code Talk services
│   │   ├── room-service/        # Collaboration rooms (planned)
│   │   ├── collaboration-service/ # Real-time code editing (planned)
│   │   ├── messaging-service/   # Chat messages (planned)
│   │   ├── code-storage-service/ # Code persistence (planned)
│   │   ├── presence-service/    # Online/offline status (planned)
│   │   └── frontend/            # React UI (planned)
│   ├── firebook/                # FireBook services
│   │   ├── bookmark-service/    # Bookmark CRUD (planned)
│   │   ├── metadata-service/    # Web scraping (planned)
│   │   ├── screenshot-service/  # Webpage screenshots (planned)
│   │   ├── tagging-service/     # AI-powered tags (planned)
│   │   ├── collection-service/  # Collections & sharing (planned)
│   │   └── frontend/            # React UI (planned)
│   └── intervalai/              # IntervalAI services
│       ├── ml-inference-service/ # Neural network predictions (planned)
│       ├── vocabulary-service/   # Word management (planned)
│       ├── spaced-repetition-service/ # SM-2 algorithm (planned)
│       ├── review-scheduler-service/ # Review reminders (planned)
│       └── frontend/            # React UI (planned)
└── shared/
    ├── errors/                  # Standardized error handling
    │   ├── index.js
    │   └── package.json
    ├── logger/                  # Winston-based logging
    │   ├── index.js
    │   └── package.json
    ├── middleware/              # Common middleware (auth, validation)
    │   ├── index.js
    │   └── package.json
    ├── types/                   # TypeScript types (future)
    └── utils/                   # Utility functions
        ├── index.js
        └── package.json
```

---

# External Resources

## Cloud Services

### Neon
- **Category**: Database
- **Description**: Serverless PostgreSQL platform for all relational databases
- **Usage**: Auth, User, Notification, Media, Progress, Rooms, Messages, Storage, Bookmarks, Collections, Reviews
- **Documentation**: https://neon.tech/docs

### Cloudflare R2 / AWS S3
- **Category**: Object Storage
- **Description**: Cloud object storage for media files and uploads
- **Usage**: Media Service for file storage and CDN delivery
- **Documentation**: https://developers.cloudflare.com/r2/

### SendGrid
- **Category**: Email
- **Description**: Email delivery service
- **Usage**: Notification Service for transactional emails
- **Documentation**: https://docs.sendgrid.com/

### Twilio (Optional)
- **Category**: SMS
- **Description**: SMS messaging service
- **Usage**: Notification Service for SMS notifications
- **Documentation**: https://www.twilio.com/docs

### Algolia / Elasticsearch
- **Category**: Search
- **Description**: Hosted search API or self-hosted search engine
- **Usage**: Search Service for full-text search across applications
- **Documentation**: https://www.algolia.com/doc/

### Google Natural Language API
- **Category**: AI/ML
- **Description**: Natural language processing for content analysis
- **Usage**: FireBook Tagging Service for AI-powered tag generation
- **Documentation**: https://cloud.google.com/natural-language/docs

## Development Tools

### Docker Hub
- **Category**: Container Registry
- **Description**: Container image repository
- **Usage**: Publishing service Docker images
- **Documentation**: https://docs.docker.com/docker-hub/

### GitHub
- **Category**: Version Control
- **Description**: Source code management and CI/CD
- **Usage**: Code repository and GitHub Actions for automated builds
- **Documentation**: https://docs.github.com/

### GitHub Actions
- **Category**: CI/CD
- **Description**: Automated build and deployment pipeline
- **Usage**: Building and pushing Docker images on push to main
- **Documentation**: https://docs.github.com/en/actions

## Libraries

### Puppeteer
- **Category**: Web Scraping
- **Description**: Headless browser for webpage screenshots
- **Usage**: FireBook Screenshot Service
- **Documentation**: https://pptr.dev/

### Cheerio
- **Category**: HTML Parsing
- **Description**: jQuery-like HTML parsing
- **Usage**: FireBook Metadata Service for extracting titles and descriptions
- **Documentation**: https://cheerio.js.org/

### TensorFlow.js / PyTorch
- **Category**: Machine Learning
- **Description**: Neural network library
- **Usage**: IntervalAI ML Inference Service for spaced repetition optimization
- **Documentation**: https://www.tensorflow.org/js

### Bull
- **Category**: Job Queue
- **Description**: Redis-based job queue for Node.js
- **Usage**: IntervalAI Review Scheduler for background jobs
- **Documentation**: https://optimalbits.github.io/bull/

### Winston
- **Category**: Logging
- **Description**: Logging library for Node.js
- **Usage**: @platform/logger for structured logging across all services
- **Documentation**: https://github.com/winstonjs/winston

## Infrastructure Platforms

### Kubernetes
- **Category**: Orchestration
- **Description**: Container orchestration platform
- **Documentation**: https://kubernetes.io/docs/

### Istio
- **Category**: Service Mesh
- **Description**: Service mesh for microservices with mTLS, traffic management, and observability
- **Documentation**: https://istio.io/latest/docs/

### Helm
- **Category**: Package Manager
- **Description**: Kubernetes package manager
- **Documentation**: https://helm.sh/docs/

### Kong / Ambassador
- **Category**: API Gateway
- **Description**: API gateway for routing and rate limiting
- **Documentation**: https://docs.konghq.com/

## Monitoring Tools

### Prometheus
- **Category**: Metrics
- **Description**: Time-series database for metrics collection
- **Documentation**: https://prometheus.io/docs/

### Grafana
- **Category**: Visualization
- **Description**: Metrics visualization and dashboards
- **Documentation**: https://grafana.com/docs/

### Jaeger
- **Category**: Tracing
- **Description**: Distributed tracing system
- **Documentation**: https://www.jaegertracing.io/docs/

### ELK Stack / Loki
- **Category**: Logging
- **Description**: Centralized logging (Elasticsearch, Logstash, Kibana)
- **Documentation**: https://www.elastic.co/guide/

## Recommended Reading

- Microservices Patterns by Chris Richardson
- Building Microservices by Sam Newman
- Istio in Action by Christian Posta and Rinor Maloku
- Kubernetes Documentation: https://kubernetes.io/docs/
- Domain-Driven Design by Eric Evans

---

# Additional Context

## Architecture Patterns

The platform implements several key architectural patterns:

### Microservices Architecture
Services are decomposed by business capability with clear boundaries and independent deployments.

### Database Per Service
Each service owns its data exclusively, preventing tight coupling through shared databases.

### API Gateway Pattern
Single entry point for all client requests with routing, authentication, and rate limiting.

### Service Mesh (Istio)
Infrastructure layer handling service-to-service communication, security, and observability.

### Event-Driven Architecture
Services communicate asynchronously through events for loose coupling and scalability.

### CQRS (Command Query Responsibility Segregation)
Applied where appropriate to separate read and write operations for optimal performance.

## Platform Services

### Auth Service
- **Purpose**: JWT-based authentication for all applications with SSO support
- **Database**: PostgreSQL (Neon)
- **Features**: Signup, signin, password reset, token refresh, JWT validation

### User Service
- **Purpose**: Unified user profiles and preferences across all apps
- **Database**: PostgreSQL (Neon)
- **Features**: Profile management, preferences, user search

### Notification Service
- **Purpose**: Email, SMS, and push notifications via message queue
- **Database**: PostgreSQL (Neon)
- **External**: SendGrid for email, Twilio for SMS (optional)
- **Pattern**: Async communication via RabbitMQ

### Media Service
- **Purpose**: File uploads and storage with CDN delivery
- **Database**: PostgreSQL (Neon)
- **External**: MinIO or Cloudflare R2/AWS S3 for object storage

### Analytics Service
- **Purpose**: Event tracking and metrics aggregation
- **Database**: InfluxDB (time-series)
- **Messaging**: Kafka for event streaming
- **Pattern**: Fire-and-forget async communication

### Search Service
- **Purpose**: Full-text search across all applications
- **Database**: Elasticsearch or Algolia
- **Features**: Index management, cross-app search

## Communication Patterns

### Synchronous Communication
- **Protocol**: REST/GraphQL
- **Use Case**: Immediate responses required
- **Examples**: Frontend → Auth Service (login), Bookmark Service → Metadata Service

### Asynchronous Communication
- **Technology**: RabbitMQ, Kafka
- **Use Case**: Fire-and-forget operations, long-running tasks
- **Examples**: Bookmark created → Screenshot Service, Student enrolled → Notification Service

### Event-Driven Communication
- **Technology**: Redis Pub/Sub, Kafka
- **Use Case**: Multiple services reacting to same event
- **Examples**: Student Created event → Progress Service, Notification Service, Analytics Service

### Real-Time Communication
- **Technology**: Socket.io + Redis Pub/Sub
- **Use Case**: Bidirectional real-time updates
- **Examples**: Code Talk: real-time editing, chat, presence

## Deployment Environments

### Development
- **Platform**: Docker Compose
- **Services**: All infrastructure services locally (MongoDB, Redis, Kafka, InfluxDB)
- **Commands**: `docker-compose up` for starting all services

### Production
- **Platform**: Kubernetes with Istio service mesh
- **Features**: mTLS, circuit breakers, canary deployments, distributed tracing
- **Monitoring**: Prometheus, Grafana, Jaeger

## Business Domains

- **Education Technology**: educationELLy for English Language Learner management
- **Developer Tools**: Code Talk for real-time collaborative coding
- **Productivity Tools**: FireBook for intelligent bookmark management
- **Learning Technology**: IntervalAI for neural-enhanced spaced repetition

---

# Testing Instructions

## Running Tests

### All Services
```bash
npm test
```

### Specific Service
```bash
cd services/platform/auth-service
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Integration Tests
```bash
npm run test:integration
```

## Test Structure

- Unit tests for business logic
- Integration tests for API endpoints
- Mock external dependencies
- Use supertest for HTTP testing
- Test files: `*.test.js` or `*.spec.js`

---

# Build Steps

## Local Development Setup

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- npm (comes with Node.js)

### Initial Setup
```bash
# Clone repository
git clone https://github.com/maxjeffwell/microservices-platform.git
cd microservices-platform

# Install dependencies (for all workspaces)
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# Especially: JWT_SECRET, DATABASE_URLs, INFLUXDB_TOKEN
```

### Start Infrastructure Services
```bash
# Start MongoDB, Redis, Kafka, InfluxDB, Zookeeper
docker-compose up
```

### Start Platform Services

#### Auth Service
```bash
npm run start:auth
# Runs on http://localhost:3001
```

#### Analytics Service
```bash
npm run start:analytics
# Runs on http://localhost:3005
```

### Development Mode (Hot Reload)
```bash
# In service directory
cd services/platform/auth-service
npm run dev
```

## Docker Build

### Build Single Service
```bash
docker build -t auth-service -f services/platform/auth-service/Dockerfile .
```

### Build All Services (via Docker Compose)
```bash
docker-compose up --build
```

## Production Deployment

### Kubernetes Deployment
```bash
# Deploy to specific environment
kubectl apply -k infrastructure/kubernetes/overlays/production
```

### Using Deployment Scripts
```bash
# Apply all K8s manifests
npm run k8s:apply

# Delete all K8s resources
npm run k8s:delete
```

## Code Quality

### Linting
```bash
npm run lint
```

### Fix Linting Issues
```bash
npm run lint:fix
```

### Format Code
```bash
npm run format
```

---

# Service-Specific Information

## Auth Service (Complete)

### API Endpoints
- `POST /auth/signup` - User registration
- `POST /auth/signin` - User login
- `POST /auth/signout` - User logout
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/verify` - Verify JWT token
- `POST /auth/password/reset` - Password reset request
- `PUT /auth/password/reset/:token` - Complete password reset

### Environment Variables
- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing
- `JWT_EXPIRES_IN` - Token expiration (e.g., "7d")
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis configuration
- `BCRYPT_ROUNDS` - Bcrypt salt rounds (default: 10)

## Analytics Service (Complete)

### API Endpoints
- `POST /analytics/events` - Track event
- `GET /analytics/events` - Get events with filters
- `GET /analytics/health` - Health check

### Environment Variables
- `INFLUXDB_URL` - InfluxDB server URL
- `INFLUXDB_TOKEN` - InfluxDB authentication token
- `INFLUXDB_ORG` - InfluxDB organization
- `INFLUXDB_BUCKET` - InfluxDB bucket for analytics
- `KAFKA_BROKERS` - Kafka broker addresses
- `KAFKA_CLIENT_ID` - Kafka client identifier
- `KAFKA_GROUP_ID` - Kafka consumer group
- `KAFKA_EVENTS_TOPIC` - Kafka topic for events

---

# Troubleshooting

## Common Issues

### Database Connection Errors
- Verify Neon PostgreSQL connection strings in `.env`
- Ensure `sslmode=require` is included in connection strings
- Check network connectivity to Neon endpoints

### Redis Connection Errors
- Ensure Redis container is running: `docker ps`
- Verify Redis password matches configuration
- Check Redis host and port settings

### Kafka Connection Issues
- Ensure Zookeeper is running before Kafka
- Wait for Kafka health check to pass
- Verify Kafka broker addresses

### Docker Compose Issues
- Clean volumes: `docker-compose down -v`
- Rebuild containers: `docker-compose up --build`
- Check logs: `docker-compose logs [service-name]`

## Environment Variable Checklist

✓ All DATABASE_URL variables point to valid Neon databases
✓ JWT_SECRET is set to a strong, unique value
✓ INFLUXDB_TOKEN matches the token configured in InfluxDB
✓ Redis password matches across services
✓ Kafka brokers are correctly configured

---

# Contributing Guidelines

While this is primarily a portfolio project, the following guidelines apply:

## Code Review Requirements
- All changes must pass linting and tests
- Follow established coding standards
- Update documentation as needed
- Add tests for new functionality

## Commit Message Format
Follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build process or tooling changes

## Branch Strategy
- `main` - Production-ready code
- Feature branches: `feature/description`
- Bug fixes: `fix/description`

---

# License

This project is licensed under the MIT License.

---

# Contact

**Jeff Maxwell**
- GitHub: [@maxjeffwell](https://github.com/maxjeffwell)
- LinkedIn: [Jeff Maxwell](https://linkedin.com/in/jeffmaxwell)
- Portfolio: [el-jefe.me](https://el-jefe.me)
- Email: maxjeffwell@gmail.com

---

*Last Updated: 2025-12-08*
*Document Version: 1.0*
