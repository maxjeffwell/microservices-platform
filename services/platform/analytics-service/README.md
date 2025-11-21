# Analytics Service

Event tracking and analytics service for the microservices platform. Provides time-series data storage, event streaming, and aggregated metrics for all applications.

## Features

- **Event Tracking**: Track user actions, page views, and feature usage
- **Metrics Recording**: Record aggregated statistics and measurements
- **Time-Series Storage**: InfluxDB for efficient time-series data storage
- **Event Streaming**: Kafka for asynchronous event processing
- **Query API**: Flexible querying with time ranges, filters, and aggregations
- **Dashboard Data**: Pre-built endpoints for application dashboards
- **Batch Operations**: Support for bulk event and metric recording
- **Health Monitoring**: Health check endpoint for service monitoring

## Technology Stack

- **Runtime**: Node.js 18+ with ES6 modules
- **Framework**: Express.js
- **Time-Series Database**: InfluxDB 2.x
- **Message Queue**: Apache Kafka via KafkaJS
- **Validation**: express-validator
- **Logging**: Winston (via @platform/logger)
- **Security**: Helmet.js, CORS, rate limiting

## API Endpoints

### Event Tracking

#### Track Single Event
```http
POST /analytics/events
Content-Type: application/json

{
  "appId": "educationelly",
  "userId": "user-123",
  "eventType": "user_action",
  "eventName": "button_clicked",
  "properties": {
    "buttonId": "submit-form",
    "page": "/dashboard"
  },
  "async": false
}
```

**Response:**
```json
{
  "success": true,
  "event": {
    "appId": "educationelly",
    "userId": "user-123",
    "eventType": "user_action",
    "eventName": "button_clicked",
    "timestamp": 1699564800000
  }
}
```

#### Track Batch Events
```http
POST /analytics/events/batch
Content-Type: application/json

[
  {
    "appId": "educationelly",
    "userId": "user-123",
    "eventType": "page_view",
    "eventName": "dashboard_viewed",
    "properties": {}
  },
  {
    "appId": "educationelly",
    "userId": "user-456",
    "eventType": "user_action",
    "eventName": "form_submitted",
    "properties": {
      "formId": "contact-form"
    }
  }
]
```

**Response:**
```json
{
  "success": true,
  "count": 2
}
```

#### Get User Events
```http
GET /analytics/users/:userId/events?appId=educationelly&startTime=-7d&limit=100
```

**Query Parameters:**
- `appId` (optional): Filter by application ID
- `eventType` (optional): Filter by event type
- `eventName` (optional): Filter by event name
- `startTime` (optional): Start time (e.g., `-7d`, `-24h`, ISO timestamp)
- `endTime` (optional): End time (default: `now()`)
- `limit` (optional): Max results (1-1000, default: 100)

**Response:**
```json
{
  "userId": "user-123",
  "count": 42,
  "events": [
    {
      "timestamp": "2023-11-09T12:00:00Z",
      "appId": "educationelly",
      "userId": "user-123",
      "eventType": "user_action",
      "eventName": "button_clicked",
      "properties": {
        "buttonId": "submit-form"
      },
      "sessionId": "session-abc-123",
      "userAgent": "Mozilla/5.0...",
      "ipAddress": "192.168.1.1"
    }
  ]
}
```

### Metrics Recording

#### Record Single Metric
```http
POST /analytics/metrics
Content-Type: application/json

{
  "appId": "educationelly",
  "metricName": "active_users",
  "metricType": "gauge",
  "value": 1250,
  "unit": "users",
  "tags": {
    "region": "us-west"
  }
}
```

**Response:**
```json
{
  "success": true,
  "metric": {
    "appId": "educationelly",
    "metricName": "active_users",
    "metricType": "gauge",
    "value": 1250,
    "timestamp": 1699564800000
  }
}
```

#### Record Batch Metrics
```http
POST /analytics/metrics/batch
Content-Type: application/json

[
  {
    "appId": "educationelly",
    "metricName": "response_time",
    "metricType": "timing",
    "value": 125.5,
    "unit": "ms"
  },
  {
    "appId": "educationelly",
    "metricName": "error_rate",
    "metricType": "counter",
    "value": 3
  }
]
```

**Response:**
```json
{
  "success": true,
  "count": 2
}
```

#### Query Metrics
```http
GET /analytics/metrics?appId=educationelly&metricName=active_users&startTime=-30d&aggregation=mean&window=1d
```

**Query Parameters:**
- `appId` (optional): Filter by application ID
- `metricName` (optional): Filter by metric name
- `metricType` (optional): Filter by metric type
- `startTime` (optional): Start time (default: `-30d`)
- `endTime` (optional): End time (default: `now()`)
- `aggregation` (optional): Aggregation function (`mean`, `sum`, `count`, `min`, `max`, `median`)
- `window` (optional): Time window for aggregation (e.g., `1h`, `1d`, `1w`)
- `limit` (optional): Max results (1-10000, default: 1000)

**Response:**
```json
{
  "count": 30,
  "filters": {
    "appId": "educationelly",
    "metricName": "active_users",
    "startTime": "-30d"
  },
  "metrics": [
    {
      "timestamp": "2023-11-09T00:00:00Z",
      "appId": "educationelly",
      "metricName": "active_users",
      "metricType": "gauge",
      "value": 1250,
      "unit": "users"
    }
  ]
}
```

### Dashboard Data

#### Get App Dashboard
```http
GET /analytics/dashboards/:appId?startTime=-24h
```

**Query Parameters:**
- `startTime` (optional): Start time (default: `-24h`)
- `endTime` (optional): End time (default: `now()`)

**Response:**
```json
{
  "appId": "educationelly",
  "timeRange": {
    "start": "-24h",
    "end": "now()"
  },
  "summary": {
    "totalEvents": 15420,
    "activeUsers": 1250
  },
  "topEvents": [
    {
      "name": "page_view",
      "count": 8500
    },
    {
      "name": "button_clicked",
      "count": 3200
    }
  ],
  "recentMetrics": []
}
```

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2023-11-09T12:00:00Z"
}
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
PORT=3005
NODE_ENV=development

# InfluxDB Configuration
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=your-influxdb-token-here
INFLUXDB_ORG=microservices-platform
INFLUXDB_BUCKET=analytics

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=analytics-service
KAFKA_GROUP_ID=analytics-service-group
KAFKA_EVENTS_TOPIC=analytics.events

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Development

### Prerequisites

- Node.js 18+
- InfluxDB 2.x
- Apache Kafka
- Zookeeper (for Kafka)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Running Locally

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### Using Docker

```bash
# Build image
docker build -t analytics-service .

# Run container
docker run -p 3005:3005 --env-file .env analytics-service
```

### Using Docker Compose

```bash
# Start all services (from project root)
docker-compose up analytics-service

# Start with dependencies
docker-compose up influxdb kafka analytics-service

# View logs
docker-compose logs -f analytics-service
```

## Data Models

### Event

Events represent user actions and application events:

```javascript
{
  appId: string,        // Application identifier
  userId: string,       // User identifier
  eventType: string,    // Type of event (e.g., "user_action", "page_view")
  eventName: string,    // Specific event name
  properties: object,   // Additional event data (JSON)
  sessionId: string,    // Session identifier
  userAgent: string,    // User agent string
  ipAddress: string,    // IP address
  timestamp: number     // Unix timestamp in milliseconds
}
```

### Metric

Metrics represent aggregated statistics:

```javascript
{
  appId: string,        // Application identifier
  metricName: string,   // Name of the metric
  metricType: string,   // Type (e.g., "gauge", "counter", "timing")
  value: number,        // Numeric value
  unit: string,         // Unit of measurement (optional)
  tags: object,         // Additional tags for filtering
  timestamp: number     // Unix timestamp in milliseconds
}
```

## Architecture

### Synchronous Event Tracking

```
Client → Analytics Service → InfluxDB
```

Events are written directly to InfluxDB for immediate availability.

### Asynchronous Event Tracking

```
Client → Analytics Service → Kafka → Kafka Consumer → InfluxDB
```

Events are sent to Kafka for processing by background consumers. Use `async: true` in the request body.

### Data Flow

1. **Event Ingestion**: Events arrive via REST API
2. **Validation**: Events are validated against schema
3. **Storage Decision**:
   - Sync: Write directly to InfluxDB
   - Async: Publish to Kafka topic
4. **Kafka Consumer**: Background consumer processes Kafka messages
5. **Persistence**: Events stored in InfluxDB time-series database
6. **Query**: Data retrieved via Flux query language

## InfluxDB Schema

### Events Measurement

- **Measurement**: `events`
- **Tags**: `appId`, `userId`, `eventType`, `eventName`
- **Fields**: `properties` (JSON string), `sessionId`, `userAgent`, `ipAddress`
- **Timestamp**: Event occurrence time

### Metrics Measurement

- **Measurement**: `metrics`
- **Tags**: `appId`, `metricName`, `metricType`, custom tags
- **Fields**: `value` (float), `unit` (string)
- **Timestamp**: Metric recording time

## Kafka Topics

- **Topic**: `analytics.events`
- **Partitions**: 1 (configurable)
- **Replication Factor**: 1 (configurable)
- **Consumer Group**: `analytics-service-group`

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Security

- **Rate Limiting**: Prevents abuse (configurable)
- **CORS**: Cross-origin resource sharing protection
- **Helmet.js**: Security headers
- **Input Validation**: express-validator for request validation
- **Error Handling**: Centralized error handling with correlation IDs

## Performance Considerations

- **Batch Operations**: Use batch endpoints for multiple events/metrics
- **Async Events**: Use async mode for non-critical events to reduce latency
- **Time-Series Optimization**: InfluxDB optimized for time-series queries
- **Kafka Streaming**: Decouples event ingestion from storage
- **Connection Pooling**: Reuses database connections

## Monitoring

### Health Check

```bash
curl http://localhost:3005/health
```

### Metrics to Monitor

- Event ingestion rate
- Kafka consumer lag
- InfluxDB write latency
- API response times
- Error rates

### Logs

The service uses structured logging with Winston:

```javascript
{
  level: "info",
  message: "Event tracked",
  correlationId: "abc-123",
  eventName: "button_clicked",
  timestamp: "2023-11-09T12:00:00Z"
}
```

## Integration Examples

### Track Event from Node.js Service

```javascript
const axios = require('axios');

async function trackEvent(eventData) {
  try {
    const response = await axios.post('http://analytics-service:3005/analytics/events', {
      appId: 'educationelly',
      userId: 'user-123',
      eventType: 'user_action',
      eventName: 'form_submitted',
      properties: {
        formId: 'contact-form',
        formName: 'Contact Us'
      },
      async: true  // Use async for better performance
    });

    console.log('Event tracked:', response.data);
  } catch (error) {
    console.error('Failed to track event:', error.message);
  }
}
```

### Record Metric from Node.js Service

```javascript
async function recordMetric(metricData) {
  try {
    await axios.post('http://analytics-service:3005/analytics/metrics', {
      appId: 'educationelly',
      metricName: 'api_response_time',
      metricType: 'timing',
      value: 125.5,
      unit: 'ms',
      tags: {
        endpoint: '/api/students',
        method: 'GET'
      }
    });
  } catch (error) {
    console.error('Failed to record metric:', error.message);
  }
}
```

## Troubleshooting

### Cannot connect to InfluxDB

- Verify `INFLUXDB_URL` is correct
- Check InfluxDB is running: `curl http://localhost:8086/health`
- Verify `INFLUXDB_TOKEN` has write permissions

### Cannot connect to Kafka

- Verify `KAFKA_BROKERS` is correct
- Check Kafka is running: `docker ps | grep kafka`
- Verify Zookeeper is running (required for Kafka)

### Events not appearing in queries

- Check time range in query (default is last 30 days)
- Verify events were written successfully (check logs)
- Use InfluxDB UI to query data directly: `http://localhost:8086`

### Consumer not processing events

- Check Kafka consumer logs
- Verify topic exists: `kafka-topics --list --bootstrap-server localhost:9092`
- Check consumer group status

## Next Steps

### Planned Features

- [ ] Event schema validation
- [ ] Data retention policies
- [ ] Metric aggregation pipelines
- [ ] Real-time alerting
- [ ] Data export capabilities
- [ ] Multi-tenant support
- [ ] GraphQL API
- [ ] WebSocket support for real-time dashboards

### Integration TODOs

- [ ] Integrate with Auth Service for authentication
- [ ] Add user context to all events
- [ ] Create standardized event schema for each app
- [ ] Set up Grafana dashboards
- [ ] Configure Prometheus metrics export
- [ ] Add distributed tracing (Jaeger)

## License

MIT

## Author

Jeff Maxwell <maxjeffwell@gmail.com>
