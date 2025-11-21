# Portfolio Platform - Microservices Architecture

## Executive Summary

This document outlines the decomposition of four existing applications (educationELLy, Code Talk, FireBook, and IntervalAI) into a unified microservices platform. The architecture features **6-7 shared platform services** and **20-22 app-specific services**, orchestrated through Kubernetes with Istio service mesh.

**Total Services**: ~27-29 microservices
**Apps Supported**: 4 applications
**Infrastructure**: Kubernetes + Istio + API Gateway

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (Kong/Ambassador)            │
│  • Rate limiting  • Authentication  • Routing  • SSL         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────┐
│             Istio Service Mesh                               │
│  • mTLS encryption  • Load balancing  • Circuit breakers    │
│  • Distributed tracing  • Traffic management                │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   [Platform]     [App Services]  [Frontends]
```

---

## 1. Platform Services (Shared Infrastructure)

These services are **written once, used by all apps**. They handle cross-cutting concerns.

### 1.1 Auth Service
**Responsibility**: Authentication & authorization for all applications

**API Endpoints**:
- `POST /auth/signup` - User registration
- `POST /auth/signin` - User login
- `POST /auth/signout` - User logout
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/verify` - Verify JWT token
- `POST /auth/password/reset` - Password reset request
- `PUT /auth/password/reset/:token` - Complete password reset

**Technology Stack**:
- Node.js + Express
- JWT for tokens
- bcrypt for password hashing
- Redis for token blacklist/session storage

**Data Ownership**:
- `authentication` database
  - `credentials` table (email, hashed_password, salt)
  - `tokens` table (refresh tokens, expiry)
  - `password_resets` table

**Used By**: educationELLy, Code Talk, FireBook, IntervalAI

---

### 1.2 User Service
**Responsibility**: User profiles and preferences across all apps

**API Endpoints**:
- `GET /users/:id` - Get user profile
- `PUT /users/:id` - Update user profile
- `DELETE /users/:id` - Delete user account
- `GET /users/:id/preferences` - Get user preferences
- `PUT /users/:id/preferences` - Update preferences
- `GET /users/search?q=` - Search users

**Technology Stack**:
- Node.js + Express
- PostgreSQL for relational user data

**Data Ownership**:
- `users` database
  - `users` table (id, username, email, firstName, lastName, avatar, createdAt)
  - `user_preferences` table (userId, theme, language, notifications)
  - `user_profiles` table (userId, bio, location, website)

**Used By**: All apps

---

### 1.3 Notification Service
**Responsibility**: Email, SMS, and push notifications

**API Endpoints**:
- `POST /notifications/email` - Send email
- `POST /notifications/sms` - Send SMS
- `POST /notifications/push` - Send push notification
- `GET /notifications/:userId` - Get user notifications
- `PUT /notifications/:id/read` - Mark as read

**Technology Stack**:
- Node.js + Express
- RabbitMQ for message queue
- SendGrid for email
- Twilio for SMS (optional)

**Data Ownership**:
- `notifications` database
  - `notification_templates` table
  - `notification_queue` table
  - `notification_history` table

**Communication Pattern**: Async (message queue)

**Used By**: All apps (student enrollment, code room invites, bookmark shares, review reminders)

---

### 1.4 Media/File Service
**Responsibility**: File uploads, storage, and CDN delivery

**API Endpoints**:
- `POST /media/upload` - Upload file
- `GET /media/:id` - Get file metadata
- `DELETE /media/:id` - Delete file
- `GET /media/:id/url` - Get signed CDN URL

**Technology Stack**:
- Node.js + Express
- MinIO or S3 for object storage
- Sharp for image processing

**Data Ownership**:
- `media` database
  - `files` table (id, userId, filename, mimeType, size, url, createdAt)
  - `thumbnails` table

**Used By**:
- educationELLy: student photos
- FireBook: bookmark screenshots
- Code Talk: user avatars
- IntervalAI: user avatars

---

### 1.5 Analytics Service
**Responsibility**: Event tracking and analytics across all apps

**API Endpoints**:
- `POST /analytics/events` - Track event
- `GET /analytics/users/:userId/events` - Get user events
- `GET /analytics/dashboards/:appId` - Get app metrics

**Technology Stack**:
- Node.js + Express
- InfluxDB or TimescaleDB (time-series)
- Kafka for event streaming

**Data Ownership**:
- `analytics` database (time-series)
  - Events: user actions, page views, feature usage
  - Metrics: aggregated statistics

**Communication Pattern**: Async (fire and forget)

**Used By**: All apps

---

### 1.6 Search Service
**Responsibility**: Full-text search across applications

**API Endpoints**:
- `POST /search/index` - Index document
- `DELETE /search/index/:id` - Remove from index
- `GET /search?q=&app=` - Search query

**Technology Stack**:
- Node.js + Express
- Elasticsearch or Algolia

**Data Ownership**:
- Search indices (no persistent DB, uses Elasticsearch)

**Used By**:
- FireBook: bookmark search
- educationELLy: student search
- Code Talk: room search
- IntervalAI: vocabulary search

---

### 1.7 Feature Flags Service (Optional)
**Responsibility**: Feature toggles and A/B testing

**API Endpoints**:
- `GET /features/:appId/:userId` - Get enabled features for user
- `POST /features/:featureId/toggle` - Toggle feature

**Technology Stack**:
- Node.js + Express
- Redis for fast lookups

**Used By**: All apps (for rolling out features gradually)

---

## 2. educationELLy Services (App-Specific)

### 2.1 Student Service
**Responsibility**: Student records, demographics, language information

**API Endpoints**:
- `GET /students` - List all students
- `GET /students/:id` - Get student details
- `POST /students` - Create student
- `PUT /students/:id` - Update student
- `DELETE /students/:id` - Delete student
- `GET /students/search?name=` - Search students

**Technology Stack**:
- Node.js + Express
- MongoDB

**Data Ownership**:
- `education_elly_students` database
  - `students` collection: fullName, school, studentId, teacher, dateOfBirth, gender, race, gradeLevel, nativeLanguage, cityOfBirth, countryOfBirth

**Depends On**:
- Auth Service (user authentication)
- User Service (teacher information)
- Notification Service (enrollment notifications)

---

### 2.2 Assessment Service
**Responsibility**: ELL proficiency levels, test scores, assessments

**API Endpoints**:
- `GET /assessments/students/:studentId` - Get student assessments
- `POST /assessments` - Create assessment
- `PUT /assessments/:id` - Update assessment
- `GET /assessments/students/:studentId/proficiency` - Get proficiency level

**Technology Stack**:
- Node.js + Express
- MongoDB

**Data Ownership**:
- `education_elly_assessments` database
  - `assessments` collection: studentId, ellStatus, compositeLevel, testDate, scores
  - `proficiency_history` collection

**Depends On**:
- Student Service (student data)

---

### 2.3 Progress Service
**Responsibility**: Academic progress tracking, reports

**API Endpoints**:
- `GET /progress/students/:studentId` - Get progress timeline
- `POST /progress/students/:studentId/milestone` - Add milestone
- `GET /progress/reports/:studentId` - Generate progress report

**Technology Stack**:
- Node.js + Express
- PostgreSQL (relational for timeline data)

**Data Ownership**:
- `education_elly_progress` database
  - `progress_timeline` table
  - `milestones` table

**Depends On**:
- Student Service
- Assessment Service

---

### 2.4 educationELLy Frontend
**Responsibility**: React UI for educationELLy

**Technology Stack**:
- React + Redux
- Nginx for serving

**Communication**: API Gateway → Platform Services + App Services

---

## 3. Code Talk Services (App-Specific)

### 3.1 Room Service
**Responsibility**: Code collaboration rooms, participants

**API Endpoints (GraphQL)**:
```graphql
type Query {
  rooms(cursor: String, limit: Int): RoomConnection!
  room(id: ID!): Room!
}

type Mutation {
  createRoom(title: String!): Room!
  deleteRoom(id: ID!): Boolean!
  joinRoom(roomId: ID!): Boolean!
  leaveRoom(roomId: ID!): Boolean!
}
```

**Technology Stack**:
- Node.js + Apollo Server
- PostgreSQL

**Data Ownership**:
- `code_talk_rooms` database
  - `rooms` table: id, title, createdAt, ownerId
  - `room_participants` table: roomId, userId, role, joinedAt

**Depends On**:
- User Service (participant info)
- Notification Service (room invites)

---

### 3.2 Collaboration Service
**Responsibility**: Real-time code editing via WebSocket

**WebSocket Events**:
- `code:update` - Code change broadcast
- `cursor:move` - Cursor position update
- `user:joined` - User joined room
- `user:left` - User left room

**Technology Stack**:
- Node.js + Socket.io
- Redis Pub/Sub (for multi-instance scaling)

**Data Ownership**:
- Redis (ephemeral state):
  - Active sessions
  - Code buffer (temporary)
  - User cursors

**Depends On**:
- Room Service (room validation)
- Presence Service (online status)
- Code Storage Service (persist code)

---

### 3.3 Messaging Service
**Responsibility**: Chat messages within rooms

**API Endpoints (GraphQL)**:
```graphql
type Query {
  messages(roomId: ID!, cursor: String, limit: Int!): MessageConnection!
}

type Mutation {
  createMessage(text: String!, roomId: ID!): Message!
  deleteMessage(id: ID!): Boolean!
}

type Subscription {
  messageCreated(roomId: ID!): MessageCreated!
}
```

**Technology Stack**:
- Node.js + Apollo Server
- PostgreSQL
- Redis Pub/Sub for subscriptions

**Data Ownership**:
- `code_talk_messages` database
  - `messages` table: id, text, userId, roomId, createdAt

**Depends On**:
- User Service (message author info)
- Room Service (room validation)

---

### 3.4 Code Storage Service
**Responsibility**: Persist and version code snippets

**API Endpoints**:
- `POST /code/rooms/:roomId/save` - Save code snapshot
- `GET /code/rooms/:roomId/history` - Get code history
- `GET /code/rooms/:roomId/latest` - Get latest code

**Technology Stack**:
- Node.js + Express
- PostgreSQL (for versioning)

**Data Ownership**:
- `code_talk_storage` database
  - `code_snapshots` table: id, roomId, code, userId, version, createdAt

---

### 3.5 Presence Service
**Responsibility**: Online/offline status, typing indicators

**API Endpoints**:
- `POST /presence/online` - Mark user online
- `POST /presence/offline` - Mark user offline
- `GET /presence/rooms/:roomId` - Get online users in room

**Technology Stack**:
- Node.js + Express
- Redis (fast lookups, TTL for auto-cleanup)

**Data Ownership**:
- Redis (ephemeral):
  - `user:{userId}:status` → online/offline
  - `room:{roomId}:users` → set of online users

---

### 3.6 Code Talk Frontend
**Responsibility**: React UI for Code Talk

**Technology Stack**:
- React + Apollo Client
- Socket.io client
- Nginx for serving

---

## 4. FireBook Services (App-Specific)

### 4.1 Bookmark Service
**Responsibility**: Bookmark CRUD operations

**API Endpoints**:
- `GET /bookmarks` - List user's bookmarks
- `GET /bookmarks/:id` - Get bookmark details
- `POST /bookmarks` - Create bookmark
- `PUT /bookmarks/:id` - Update bookmark
- `DELETE /bookmarks/:id` - Delete bookmark

**Technology Stack**:
- Node.js + Express
- Firestore or PostgreSQL

**Data Ownership**:
- `firebook_bookmarks` database
  - `bookmarks` collection/table: id, userId, url, title, description, tags, screenshotUrl, metadata, createdAt

**Depends On**:
- Metadata Service (extract metadata)
- Screenshot Service (capture screenshot)
- Tagging Service (AI tags)
- Search Service (indexing)

---

### 4.2 Metadata Service
**Responsibility**: Web scraping, extract titles, descriptions, favicons

**API Endpoints**:
- `POST /metadata/extract` - Extract metadata from URL

**Technology Stack**:
- Node.js + Express
- Cheerio for HTML parsing

**Data Ownership**:
- None (stateless service)

**Communication Pattern**: Sync (called by Bookmark Service)

---

### 4.3 Screenshot Service
**Responsibility**: Capture webpage screenshots using headless browser

**API Endpoints**:
- `POST /screenshots/capture` - Capture screenshot of URL

**Technology Stack**:
- Node.js + Express
- Puppeteer (headless Chrome)

**Data Ownership**:
- Temp files only (uploads to Media Service)

**Depends On**:
- Media Service (store screenshots)

**Resource Requirements**: High CPU, memory (runs browsers)

---

### 4.4 Tagging Service
**Responsibility**: AI-powered tag generation

**API Endpoints**:
- `POST /tags/generate` - Generate tags for content

**Technology Stack**:
- Node.js + Express
- Google Natural Language API or local NLP model

**Data Ownership**:
- None (stateless service)

**Communication Pattern**: Async (called via queue after bookmark creation)

---

### 4.5 Collection Service
**Responsibility**: Bookmark collections, sharing, permissions

**API Endpoints**:
- `GET /collections` - List user collections
- `POST /collections` - Create collection
- `POST /collections/:id/bookmarks/:bookmarkId` - Add bookmark to collection
- `POST /collections/:id/share` - Share collection (viewer/editor)
- `GET /collections/:id/collaborators` - Get collection permissions

**Technology Stack**:
- Node.js + Express
- PostgreSQL

**Data Ownership**:
- `firebook_collections` database
  - `collections` table
  - `collection_bookmarks` table (many-to-many)
  - `collection_permissions` table (userId, collectionId, role)

**Depends On**:
- User Service (collaborator info)
- Notification Service (share notifications)

---

### 4.6 FireBook Frontend
**Responsibility**: React UI for FireBook

**Technology Stack**:
- React + Vite
- Tailwind CSS
- Nginx for serving

---

## 5. IntervalAI Services (App-Specific)

### 5.1 ML Inference Service
**Responsibility**: Neural network predictions for optimal review timing

**API Endpoints**:
- `POST /ml/predict` - Get optimal review interval
- `POST /ml/train` - Retrain model with user data
- `GET /ml/model/metrics` - Get model performance

**Technology Stack**:
- Python + FastAPI (for TensorFlow.js or PyTorch)
- WebGPU support
- Redis for caching predictions

**Data Ownership**:
- `intervalai_ml` database
  - `training_data` table (user review history)
  - `model_versions` table

**Resource Requirements**: High CPU/GPU (inference and training)

**Depends On**:
- Review Service (training data)

---

### 5.2 Vocabulary Service
**Responsibility**: Word/phrase management

**API Endpoints**:
- `GET /vocabulary` - List user's vocabulary
- `GET /vocabulary/:id` - Get word details
- `POST /vocabulary` - Add word
- `PUT /vocabulary/:id` - Update word
- `DELETE /vocabulary/:id` - Delete word

**Technology Stack**:
- Node.js + Express
- MongoDB

**Data Ownership**:
- `intervalai_vocabulary` database
  - `words` collection: id, userId, word, translation, context, createdAt

---

### 5.3 Spaced Repetition Service
**Responsibility**: SM-2 algorithm implementation, review scheduling

**API Endpoints**:
- `GET /reviews/due` - Get words due for review
- `POST /reviews/:wordId/submit` - Submit review result
- `GET /reviews/schedule/:wordId` - Get next review date

**Technology Stack**:
- Node.js + Express
- PostgreSQL

**Data Ownership**:
- `intervalai_reviews` database
  - `review_history` table: wordId, userId, quality, interval, easeFactor, reviewedAt
  - `review_schedule` table: wordId, nextReviewAt, interval

**Depends On**:
- Vocabulary Service (word data)
- ML Inference Service (enhanced predictions)

---

### 5.4 Review Scheduler Service
**Responsibility**: Background job to send review reminders

**Technology Stack**:
- Node.js + Bull (job queue)
- Redis

**Communication Pattern**: Async (scheduled jobs)

**Depends On**:
- Spaced Repetition Service (due reviews)
- Notification Service (send reminders)

---

### 5.5 IntervalAI Frontend
**Responsibility**: React UI for IntervalAI

**Technology Stack**:
- React + Redux
- TensorFlow.js (client-side ML)
- Nginx for serving

---

## 6. Service Communication Patterns

### 6.1 Synchronous Communication (REST/GraphQL/gRPC)

**When to Use**: When you need an immediate response

**Examples**:
- Frontend → Auth Service (login)
- Bookmark Service → Metadata Service (extract title)
- Student Service → User Service (get teacher info)

**Pattern**: Request → Response (HTTP)

---

### 6.2 Asynchronous Communication (Message Queue)

**When to Use**: Fire-and-forget operations, long-running tasks

**Technology**: RabbitMQ or Kafka

**Examples**:
- Bookmark created → Screenshot Service (capture screenshot)
- Bookmark created → Tagging Service (generate tags)
- Student enrolled → Notification Service (send welcome email)

**Pattern**:
```
Service A → Message Queue → Service B
           (publish)      (subscribe)
```

---

### 6.3 Event-Driven (Pub/Sub)

**When to Use**: Multiple services need to react to same event

**Technology**: Redis Pub/Sub or Kafka

**Examples**:
- "Student Created" event:
  - Progress Service: Initialize progress tracking
  - Notification Service: Send welcome email
  - Analytics Service: Track enrollment event

**Pattern**:
```
Student Service → Event Bus → [Progress Service, Notification Service, Analytics Service]
```

---

### 6.4 Real-Time Communication (WebSocket)

**When to Use**: Bidirectional, real-time updates

**Technology**: Socket.io + Redis Pub/Sub (for scaling)

**Examples**:
- Code Talk: Real-time code editing
- Code Talk: Chat messages
- Code Talk: Presence (online/offline)

---

## 7. Data Ownership & Database Strategy

### 7.1 Database Per Service Pattern

**Principle**: Each service owns its data exclusively

**Benefits**:
- Services can scale independently
- No tight coupling via shared database
- Teams can choose best DB technology for their domain

**Example**:
- Auth Service → PostgreSQL (relational)
- Student Service → MongoDB (flexible schema)
- Analytics Service → InfluxDB (time-series)
- Presence Service → Redis (in-memory, TTL)

---

### 7.2 Shared Data Strategy

**Challenge**: User data is needed by many services

**Solution**: User Service as source of truth

**Pattern**:
```
User Service (owns user data)
    ↓
Other services cache user data locally or query User Service
```

**Example**:
- Student Service stores `teacherId` (reference)
- To get teacher name: Student Service → User Service

---

### 7.3 Data Consistency

**Pattern**: Eventual Consistency (via events)

**Example - Student Creation**:
1. Student Service creates student → publishes "Student Created" event
2. Progress Service subscribes → creates progress record
3. If Progress Service fails, retry via dead letter queue

---

## 8. Cross-Cutting Concerns

### 8.1 Service Mesh (Istio)

**Provides**:
- mTLS encryption between all services
- Load balancing
- Circuit breakers (fail gracefully)
- Retry policies
- Traffic splitting (canary deployments)
- Distributed tracing

**Example**:
```yaml
# Istio VirtualService for canary deployment
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: student-service
spec:
  hosts:
  - student-service
  http:
  - match:
    - headers:
        x-version:
          exact: "v2"
    route:
    - destination:
        host: student-service
        subset: v2
  - route:
    - destination:
        host: student-service
        subset: v1
      weight: 90
    - destination:
        host: student-service
        subset: v2
      weight: 10  # 10% traffic to new version
```

---

### 8.2 API Gateway (Kong or Ambassador)

**Responsibilities**:
- Single entry point for all apps
- Rate limiting per user/app
- Authentication (validates JWT before forwarding)
- Request routing to services
- SSL termination

**Example Routes**:
```
GET /api/v1/students           → Student Service
GET /api/v1/bookmarks          → Bookmark Service
GET /api/v1/rooms              → Room Service (GraphQL)
POST /api/v1/auth/signin       → Auth Service
```

---

### 8.3 Observability

#### Distributed Tracing (Jaeger)
**What it shows**: Request flow across services

**Example Trace**:
```
User creates bookmark:
1. API Gateway (10ms)
2. → Auth Service: validate token (5ms)
3. → Bookmark Service: create bookmark (15ms)
4.   → Metadata Service: extract title (200ms)
5.   → Screenshot Service: capture screenshot (1500ms)
6.   → Tagging Service: generate tags (300ms)
7.   → Search Service: index bookmark (20ms)
Total: 2050ms
```

**Benefit**: Identify bottlenecks (Screenshot Service is slow!)

---

#### Metrics (Prometheus + Grafana)

**Key Metrics (RED)**:
- **Rate**: Requests per second per service
- **Errors**: Error rate per service
- **Duration**: Latency percentiles (p50, p95, p99)

**Example Grafana Dashboard**:
```
Student Service Metrics:
- Requests/sec: 120
- Error rate: 0.5%
- p95 latency: 45ms
- Active pods: 3
- CPU usage: 60%
- Memory usage: 45%
```

---

#### Logging (ELK Stack or Loki)

**Centralized Logs**: All services → Elasticsearch

**Features**:
- Search logs across all services
- Filter by service, level, timestamp
- Correlation IDs (trace request across services)

**Example Query**:
```
Find all errors for request_id="abc123":
correlationId:abc123 AND level:ERROR
```

---

## 9. Service Summary Table

| Service | Type | Tech Stack | Database | Used By |
|---------|------|------------|----------|---------|
| **Platform Services** |
| Auth Service | Platform | Node.js + Express | PostgreSQL | All apps |
| User Service | Platform | Node.js + Express | PostgreSQL | All apps |
| Notification Service | Platform | Node.js + RabbitMQ | PostgreSQL | All apps |
| Media Service | Platform | Node.js + MinIO | PostgreSQL | All apps |
| Analytics Service | Platform | Node.js + Kafka | InfluxDB | All apps |
| Search Service | Platform | Node.js + Elasticsearch | Elasticsearch | All apps |
| **educationELLy Services** |
| Student Service | App | Node.js + Express | MongoDB | educationELLy |
| Assessment Service | App | Node.js + Express | MongoDB | educationELLy |
| Progress Service | App | Node.js + Express | PostgreSQL | educationELLy |
| ELL Frontend | App | React + Redux + Nginx | - | educationELLy |
| **Code Talk Services** |
| Room Service | App | Node.js + Apollo Server | PostgreSQL | Code Talk |
| Collaboration Service | App | Node.js + Socket.io | Redis | Code Talk |
| Messaging Service | App | Node.js + Apollo Server | PostgreSQL | Code Talk |
| Code Storage Service | App | Node.js + Express | PostgreSQL | Code Talk |
| Presence Service | App | Node.js + Express | Redis | Code Talk |
| Code Talk Frontend | App | React + Apollo + Nginx | - | Code Talk |
| **FireBook Services** |
| Bookmark Service | App | Node.js + Express | PostgreSQL/Firestore | FireBook |
| Metadata Service | App | Node.js + Cheerio | - | FireBook |
| Screenshot Service | App | Node.js + Puppeteer | - | FireBook |
| Tagging Service | App | Node.js + Google NL API | - | FireBook |
| Collection Service | App | Node.js + Express | PostgreSQL | FireBook |
| FireBook Frontend | App | React + Vite + Nginx | - | FireBook |
| **IntervalAI Services** |
| ML Inference Service | App | Python + FastAPI | PostgreSQL | IntervalAI |
| Vocabulary Service | App | Node.js + Express | MongoDB | IntervalAI |
| Spaced Repetition Service | App | Node.js + Express | PostgreSQL | IntervalAI |
| Review Scheduler Service | App | Node.js + Bull | Redis | IntervalAI |
| IntervalAI Frontend | App | React + Redux + Nginx | - | IntervalAI |

**Total Services**: 29 microservices (6 platform + 23 app-specific)

---

## 10. Next Steps

See `IMPLEMENTATION_ROADMAP.md` for detailed implementation phases and milestones.

**Quick Start**:
1. Phase 1: Build Platform Services (Auth, User, Notification)
2. Phase 2: Migrate educationELLy (simplest app)
3. Phase 3: Add service mesh and observability
4. Phase 4: Migrate remaining apps
5. Phase 5: Cross-app features (SSO, unified dashboard)

---

## Document Version
- **Version**: 1.0
- **Date**: 2025-11-20
- **Author**: Jeff Maxwell
