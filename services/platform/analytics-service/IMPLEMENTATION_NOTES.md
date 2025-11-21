# Analytics Service - Implementation Notes

## What Was Built

A fully functional analytics and event tracking service for the microservices platform with the following features:

### ✅ Core Features Implemented

- **Event Tracking**
  - Single event tracking (sync and async)
  - Batch event tracking
  - User event querying with filters
  - Automatic capture of user agent and IP address
  - Session tracking with UUID generation

- **Metrics Recording**
  - Single metric recording
  - Batch metric recording
  - Flexible metric querying with filters
  - Aggregation support (mean, sum, count, min, max, median)
  - Time-window aggregations

- **Dashboard Data**
  - Pre-built dashboard endpoint for applications
  - Summary statistics (total events, active users)
  - Top events tracking
  - Recent metrics retrieval

- **Event Streaming**
  - Kafka producer for async event publishing
  - Kafka consumer for background event processing
  - Configurable topics and consumer groups
  - Automatic topic creation

- **Time-Series Storage**
  - InfluxDB 2.x integration
  - Efficient time-series data storage
  - Flexible Flux query language support
  - Point-based data model

- **API**
  - RESTful endpoints for events and metrics
  - Input validation with express-validator
  - Error handling with correlation IDs
  - Rate limiting
  - CORS protection

- **Security**
  - Helmet.js security headers
  - Rate limiting (configurable)
  - Input validation
  - Non-root Docker user

- **Monitoring**
  - Health check endpoint
  - Structured logging with Winston
  - Correlation ID tracking
  - Graceful shutdown handling

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Applications                     │
│          (educationELLy, Code Talk, FireBook, etc.)         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTP POST
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    Analytics Service                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Express    │  │  Validation  │  │   Rate       │     │
│  │   Routes     │──│  Middleware  │──│   Limiter    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                                                    │
│         ├─────── async=true ──────┐                        │
│         │                          │                        │
│         ▼                          ▼                        │
│  ┌──────────────┐         ┌──────────────┐                │
│  │    Event     │         │    Kafka     │                │
│  │   Service    │         │   Producer   │                │
│  └──────┬───────┘         └──────┬───────┘                │
│         │                         │                        │
│         ▼                         ▼                        │
│  ┌──────────────┐         ┌──────────────┐                │
│  │   InfluxDB   │         │    Kafka     │                │
│  │   WriteAPI   │         │    Topic     │                │
│  └──────────────┘         └──────┬───────┘                │
│                                   │                        │
│                           ┌───────▼───────┐               │
│                           │     Kafka     │               │
│                           │   Consumer    │               │
│                           └───────┬───────┘               │
│                                   │                        │
│                                   ▼                        │
│                           ┌──────────────┐                │
│                           │   InfluxDB   │                │
│                           │   WriteAPI   │                │
│                           └──────────────┘                │
└─────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │    InfluxDB Database     │
                    │  ┌────────────────────┐  │
                    │  │  events measurement│  │
                    │  │  metrics measurement│ │
                    │  └────────────────────┘  │
                    └──────────────────────────┘
```

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js 18+ | JavaScript execution |
| Framework | Express.js | HTTP server |
| Time-Series DB | InfluxDB 2.7 | Event and metric storage |
| Message Queue | Apache Kafka | Async event streaming |
| Validation | express-validator | Input validation |
| Logging | Winston | Structured logging |
| Security | Helmet.js | Security headers |
| Containerization | Docker | Service deployment |

## Database Schema

### InfluxDB Measurements

#### `events` Measurement
```
Tags:
  - appId: string
  - userId: string
  - eventType: string
  - eventName: string

Fields:
  - properties: string (JSON)
  - sessionId: string
  - userAgent: string
  - ipAddress: string

Timestamp: time (nanosecond precision)
```

#### `metrics` Measurement
```
Tags:
  - appId: string
  - metricName: string
  - metricType: string
  - [custom tags from input]

Fields:
  - value: float
  - unit: string

Timestamp: time (nanosecond precision)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analytics/events` | Track single event |
| POST | `/analytics/events/batch` | Track multiple events |
| GET | `/analytics/users/:userId/events` | Get user events |
| POST | `/analytics/metrics` | Record single metric |
| POST | `/analytics/metrics/batch` | Record multiple metrics |
| GET | `/analytics/metrics` | Query metrics |
| GET | `/analytics/dashboards/:appId` | Get app dashboard |
| GET | `/health` | Health check |

## Kafka Integration

### Topics
- **`analytics.events`**: Event stream for async processing

### Consumer Groups
- **`analytics-service-group`**: Analytics service consumer

### Message Format
```json
{
  "appId": "educationelly",
  "userId": "user-123",
  "eventType": "user_action",
  "eventName": "button_clicked",
  "properties": {
    "buttonId": "submit-form"
  },
  "sessionId": "session-abc-123",
  "userAgent": "Mozilla/5.0...",
  "ipAddress": "192.168.1.1",
  "timestamp": 1699564800000
}
```

## Docker Support

### Multi-Stage Dockerfile
- **Stage 1 (Builder)**: Install dependencies
- **Stage 2 (Runtime)**: Minimal production image

### Features
- Non-root user (nodejs:1001)
- Health check built-in
- Alpine Linux base (small image size)
- Proper signal handling (SIGTERM/SIGINT)

### Docker Compose Integration
Added to `docker-compose.yml`:
- Zookeeper (for Kafka)
- Kafka (event streaming)
- InfluxDB (time-series database)
- Analytics Service (with dependencies)

## Testing

### Test Structure
- Health check tests
- Event tracking tests (single and batch)
- Metric recording tests (single and batch)
- Query tests (events and metrics)
- Dashboard tests
- Validation tests
- Error handling tests

### Test Configuration
- Jest test framework
- Supertest for HTTP testing
- Coverage reporting enabled

## Next Steps to Run Locally

### 1. Set up InfluxDB

```bash
# Start InfluxDB with Docker Compose
docker-compose up -d influxdb

# Wait for InfluxDB to be healthy
docker-compose ps influxdb

# Access InfluxDB UI
open http://localhost:8086

# Login with:
# Username: admin
# Password: admin_password
# Org: microservices-platform
# Bucket: analytics
```

### 2. Set up Kafka

```bash
# Start Zookeeper and Kafka
docker-compose up -d zookeeper kafka

# Verify Kafka is running
docker-compose ps kafka

# Check Kafka topics
docker exec -it platform-kafka kafka-topics --list --bootstrap-server localhost:9092
```

### 3. Configure Environment

```bash
# Copy environment file
cp .env.example .env

# Update .env with InfluxDB token
# Get token from InfluxDB UI or use default:
INFLUXDB_TOKEN=my-super-secret-auth-token
```

### 4. Install Dependencies

```bash
cd services/platform/analytics-service
npm install
```

### 5. Start Service

```bash
# Development mode
npm run dev

# Or with Docker Compose
docker-compose up analytics-service
```

### 6. Test Service

```bash
# Health check
curl http://localhost:3005/health

# Track an event
curl -X POST http://localhost:3005/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "test-app",
    "userId": "user-123",
    "eventType": "user_action",
    "eventName": "test_event",
    "properties": {"key": "value"}
  }'

# Record a metric
curl -X POST http://localhost:3005/analytics/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "test-app",
    "metricName": "test_metric",
    "metricType": "gauge",
    "value": 100
  }'
```

## What's NOT Yet Implemented

### Authentication & Authorization
- [ ] Integration with Auth Service
- [ ] JWT token validation
- [ ] API key authentication
- [ ] Service-to-service authentication

### Advanced Features
- [ ] Event schema validation (JSON Schema)
- [ ] Custom retention policies per app
- [ ] Real-time alerting based on metrics
- [ ] Data export capabilities (CSV, JSON)
- [ ] Multi-tenancy support
- [ ] Event replay functionality
- [ ] Metric anomaly detection

### APIs
- [ ] GraphQL API
- [ ] WebSocket support for real-time data
- [ ] Bulk delete operations
- [ ] Event deduplication

### Integrations
- [ ] Grafana dashboard templates
- [ ] Prometheus metrics export
- [ ] Jaeger distributed tracing
- [ ] Webhook notifications
- [ ] Third-party analytics integrations

### Monitoring & Observability
- [ ] Prometheus metrics endpoint
- [ ] Custom Grafana dashboards
- [ ] Distributed tracing with Jaeger
- [ ] Log aggregation with ELK stack
- [ ] Performance metrics dashboard

### Data Management
- [ ] Automatic data archival
- [ ] Data backup and restore
- [ ] Data migration tools
- [ ] Data anonymization/GDPR compliance

### Testing
- [ ] Integration tests with real InfluxDB
- [ ] Load testing scenarios
- [ ] Chaos engineering tests
- [ ] End-to-end tests

## Integration with Other Services

### Example: Track Event from Auth Service

```javascript
// services/platform/auth-service/controllers/authController.js
import axios from 'axios';

async function signup(req, res) {
  // ... user signup logic ...

  // Track signup event
  try {
    await axios.post('http://analytics-service:3005/analytics/events', {
      appId: 'auth-service',
      userId: user.id,
      eventType: 'user_lifecycle',
      eventName: 'user_signup',
      properties: {
        email: user.email,
        source: 'web'
      },
      async: true  // Fire and forget
    });
  } catch (error) {
    // Log error but don't fail signup
    logger.error('Failed to track signup event', { error: error.message });
  }

  res.status(201).json({ user, token });
}
```

### Example: Record Metric from Any Service

```javascript
// Track API response time
const startTime = Date.now();

// ... process request ...

const duration = Date.now() - startTime;

await axios.post('http://analytics-service:3005/analytics/metrics', {
  appId: 'user-service',
  metricName: 'api_response_time',
  metricType: 'timing',
  value: duration,
  unit: 'ms',
  tags: {
    endpoint: '/users/:id',
    method: 'GET',
    statusCode: '200'
  }
});
```

## Performance Considerations

### Write Performance
- **Batch Writes**: Use `/events/batch` for multiple events
- **Async Mode**: Use `async: true` for non-critical events
- **Kafka Buffering**: Kafka provides natural buffering for spikes

### Query Performance
- **Time Range**: Limit queries to reasonable time ranges
- **Limit Results**: Use `limit` parameter to reduce data transfer
- **Aggregations**: Use InfluxDB aggregations instead of client-side
- **Indexing**: InfluxDB automatically indexes tags

### Scaling
- **Horizontal Scaling**: Multiple Analytics Service instances
- **Kafka Partitions**: Scale Kafka with more partitions
- **InfluxDB Clustering**: Use InfluxDB Enterprise for clustering
- **Caching**: Add Redis for frequently accessed dashboards

## Security Considerations

### Current Implementation
- Rate limiting on all endpoints
- Input validation with express-validator
- CORS protection
- Helmet.js security headers
- Non-root Docker user

### Future Enhancements
- [ ] JWT authentication for API access
- [ ] API key rotation
- [ ] Encryption at rest (InfluxDB)
- [ ] TLS for Kafka communication
- [ ] IP whitelisting
- [ ] Request signing

## Deployment

### Development
```bash
docker-compose up analytics-service
```

### Production (Kubernetes)
```bash
# Build image
docker build -t analytics-service:v1.0.0 .

# Push to registry
docker push your-registry/analytics-service:v1.0.0

# Deploy to Kubernetes
kubectl apply -f infrastructure/kubernetes/platform-services/analytics-service/
```

## Status

**Current Status**: ✅ Ready for testing and development

The Analytics Service is fully implemented and ready for:
1. Local development and testing
2. Integration with other platform services
3. Docker Compose deployment
4. Kubernetes deployment (requires K8s manifests)

## Author

Jeff Maxwell <maxjeffwell@gmail.com>

## License

MIT
