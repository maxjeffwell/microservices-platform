# Portfolio Microservices Platform

> A unified microservices platform orchestrating educationELLy, Code Talk, FireBook, and IntervalAI applications with shared infrastructure services.

## Overview

This project demonstrates enterprise-grade platform engineering by decomposing four existing applications into a cohesive microservices architecture. The platform features:

- **29 Microservices** (6 shared platform + 23 app-specific)
- **Kubernetes Orchestration** with Istio service mesh
- **Distributed Tracing** with Jaeger
- **Comprehensive Monitoring** with Prometheus & Grafana
- **API Gateway** for unified entry point
- **Cross-App Features** (SSO, unified analytics, shared services)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────┐
│             Istio Service Mesh                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   [Platform]     [App Services]  [Frontends]
```

## Project Structure

```
microservices-platform/
├── docs/
│   ├── ARCHITECTURE.md          # Detailed architecture documentation
│   ├── IMPLEMENTATION_ROADMAP.md # Phase-by-phase implementation plan
│   └── SERVICE_CONTRACTS.md      # API contracts for all services
├── services/
│   ├── platform/                 # Shared services
│   │   ├── auth-service/
│   │   ├── user-service/
│   │   ├── notification-service/
│   │   ├── media-service/
│   │   ├── analytics-service/
│   │   └── search-service/
│   ├── educationelly/            # educationELLy services
│   │   ├── student-service/
│   │   ├── assessment-service/
│   │   ├── progress-service/
│   │   └── frontend/
│   ├── code-talk/                # Code Talk services
│   │   ├── room-service/
│   │   ├── collaboration-service/
│   │   ├── messaging-service/
│   │   ├── code-storage-service/
│   │   ├── presence-service/
│   │   └── frontend/
│   ├── firebook/                 # FireBook services
│   │   ├── bookmark-service/
│   │   ├── metadata-service/
│   │   ├── screenshot-service/
│   │   ├── tagging-service/
│   │   ├── collection-service/
│   │   └── frontend/
│   └── intervalai/               # IntervalAI services
│       ├── ml-inference-service/
│       ├── vocabulary-service/
│       ├── spaced-repetition-service/
│       ├── review-scheduler-service/
│       └── frontend/
├── infrastructure/
│   ├── kubernetes/               # K8s manifests
│   │   ├── base/                 # Base configurations
│   │   └── overlays/             # Environment-specific overlays (dev/staging/prod)
│   ├── istio/                    # Service mesh configs
│   │   ├── gateways/
│   │   ├── virtual-services/
│   │   └── destination-rules/
│   ├── monitoring/               # Observability stack
│   │   ├── prometheus/
│   │   ├── grafana/
│   │   └── jaeger/
│   └── api-gateway/              # Kong/Ambassador configs
└── scripts/
    ├── setup/                    # Setup scripts
    ├── deploy/                   # Deployment scripts
    └── test/                     # Testing scripts
```

## Applications

### 1. educationELLy
English Language Learner management system with student tracking, assessments, and progress reports.

**Services**:
- Student Service (MongoDB)
- Assessment Service (MongoDB)
- Progress Service (PostgreSQL)

### 2. Code Talk
Real-time collaborative code editor with chat and room management.

**Services**:
- Room Service (PostgreSQL + GraphQL)
- Collaboration Service (Socket.io + Redis)
- Messaging Service (PostgreSQL + GraphQL)
- Code Storage Service (PostgreSQL)
- Presence Service (Redis)

### 3. FireBook
Intelligent bookmark manager with AI tagging and automated metadata extraction.

**Services**:
- Bookmark Service (PostgreSQL)
- Metadata Service (stateless)
- Screenshot Service (Puppeteer)
- Tagging Service (Google NL API)
- Collection Service (PostgreSQL)

### 4. IntervalAI
Neural-enhanced spaced repetition learning system with ML-optimized review scheduling.

**Services**:
- ML Inference Service (Python + FastAPI)
- Vocabulary Service (MongoDB)
- Spaced Repetition Service (PostgreSQL)
- Review Scheduler Service (Node.js + Bull)

## Platform Services (Shared)

### Auth Service
JWT-based authentication for all applications with SSO support.

### User Service
Unified user profiles and preferences across all apps.

### Notification Service
Email, SMS, and push notifications via message queue.

### Media Service
File uploads and storage with CDN delivery (MinIO/S3).

### Analytics Service
Event tracking and metrics aggregation (InfluxDB + Kafka).

### Search Service
Full-text search across all applications (Elasticsearch).

## Technology Stack

### Backend
- **Node.js + Express** - Most microservices
- **Python + FastAPI** - ML Inference Service
- **Apollo Server** - GraphQL services (Code Talk)
- **Socket.io** - Real-time collaboration

### Databases
- **PostgreSQL** - Relational data (Users, Rooms, Reviews)
- **MongoDB** - Document data (Students, Vocabulary, Assessments)
- **Redis** - Caching, sessions, pub/sub (Presence, Tokens)
- **InfluxDB** - Time-series data (Analytics)
- **Elasticsearch** - Full-text search

### Infrastructure
- **Kubernetes** - Container orchestration
- **Istio** - Service mesh (mTLS, traffic management, observability)
- **Kong/Ambassador** - API Gateway
- **Helm** - Package management
- **Docker** - Containerization

### Observability
- **Jaeger** - Distributed tracing
- **Prometheus** - Metrics collection
- **Grafana** - Visualization dashboards
- **ELK Stack / Loki** - Centralized logging

### Message Queue
- **RabbitMQ** - Async communication
- **Kafka** - Event streaming (Analytics)

## Key Features

### 🔐 Single Sign-On (SSO)
Log into one app, automatically authenticated across all apps.

### 📊 Unified Analytics
Centralized dashboard showing usage metrics across all applications.

### 🔍 Platform-Wide Search
Search for students, bookmarks, code rooms, and vocabulary from one interface.

### 🚀 Independent Scaling
Each service scales independently based on demand (e.g., ML service scales up during training).

### 🛡️ Enhanced Security
- mTLS between all services
- JWT authentication
- Rate limiting per user/app
- Network policies and RBAC

### 📈 Comprehensive Observability
- Distributed tracing shows request flow across services
- Grafana dashboards for each service
- Centralized logging with correlation IDs

### 🎯 Advanced Deployment Patterns
- Canary deployments (10% traffic to new version)
- Blue-green deployments
- Circuit breakers for resilience
- Automated rollback on failure

## Getting Started

### Prerequisites
- Kubernetes cluster (Minikube, Kind, or cloud)
- kubectl configured
- Docker installed
- Helm 3.x
- Node.js 18+
- Python 3.10+ (for ML service)

### Quick Start

```bash
# Clone repository
git clone https://github.com/maxjeffwell/microservices-platform.git
cd microservices-platform

# Install Istio
./scripts/setup/install-istio.sh

# Deploy platform services
kubectl apply -k infrastructure/kubernetes/base/platform

# Deploy app services (start with educationELLy)
kubectl apply -k infrastructure/kubernetes/base/educationelly

# Install monitoring stack
kubectl apply -k infrastructure/monitoring

# Access services
kubectl port-forward -n istio-system svc/istio-ingressgateway 8080:80
```

### Development

See [IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) for detailed implementation phases.

**Phase 1: Platform Services** (Weeks 1-5)
- Build Auth, User, and Notification services
- Set up local development environment

**Phase 2: Migrate educationELLy** (Weeks 5-9)
- Decompose into Student, Assessment, Progress services
- Integrate with platform services

**Phase 3: Infrastructure** (Weeks 9-14)
- Deploy to Kubernetes
- Install Istio service mesh
- Set up observability stack

**Phase 4: Migrate Remaining Apps** (Weeks 14-20)
- Code Talk, FireBook, IntervalAI

**Phase 5: Cross-App Features** (Weeks 20-24)
- SSO implementation
- Unified dashboard
- Platform-wide search

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - Detailed architecture documentation
- [Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md) - Phase-by-phase plan
- [Service Contracts](docs/SERVICE_CONTRACTS.md) - API contracts for all services

## Deployment

### Local Development
```bash
# Use Docker Compose for local development
docker-compose up

# Access apps
# educationELLy: http://localhost:3001
# Code Talk: http://localhost:3002
# FireBook: http://localhost:3003
# IntervalAI: http://localhost:3004
```

### Kubernetes (Production)
```bash
# Deploy to specific environment
kubectl apply -k infrastructure/kubernetes/overlays/production
```

## Monitoring & Observability

### Access Dashboards
```bash
# Grafana (metrics)
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Visit: http://localhost:3000

# Jaeger (tracing)
kubectl port-forward -n monitoring svc/jaeger 16686:16686
# Visit: http://localhost:16686

# Kiali (service mesh)
kubectl port-forward -n istio-system svc/kiali 20001:20001
# Visit: http://localhost:20001
```

## Testing

```bash
# Run all tests
npm test

# Test specific service
cd services/platform/auth-service
npm test

# Integration tests
npm run test:integration

# Load testing
npm run test:load
```

## Portfolio Value

This project demonstrates:

✅ **Platform Engineering** - Building shared infrastructure for multiple applications
✅ **Microservices Architecture** - Service decomposition with clear boundaries
✅ **Domain-Driven Design** - Bounded contexts and service ownership
✅ **Cloud-Native Development** - Kubernetes, service mesh, containerization
✅ **DevOps Practices** - CI/CD, IaC, automated deployments
✅ **Observability** - Distributed tracing, metrics, logging
✅ **Reliability Engineering** - Circuit breakers, retries, health checks
✅ **Security** - mTLS, RBAC, network policies, JWT authentication

## Contributing

This is a portfolio project, but contributions and suggestions are welcome!

## License

MIT License - see [LICENSE](LICENSE) for details

## Contact

**Jeff Maxwell**
- GitHub: [@maxjeffwell](https://github.com/maxjeffwell)
- LinkedIn: [Jeff Maxwell](https://linkedin.com/in/jeffmaxwell)
- Portfolio: [el-jefe.me](https://el-jefe.me)
- Email: maxjeffwell@gmail.com

---

**Built with ❤️ to demonstrate platform engineering and microservices architecture**
