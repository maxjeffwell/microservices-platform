# Auth Service

JWT-based authentication service for the microservices platform.

## Features

- User registration (signup)
- User login (signin)
- JWT access tokens
- Refresh tokens
- Token verification
- Sign out (single device)
- Sign out all (all devices)
- Automatic cleanup of expired tokens

## Tech Stack

- **Node.js** + **Express**
- **PostgreSQL** (Neon DB)
- **JWT** for authentication
- **bcrypt** for password hashing
- **Redis** for token blacklisting (future)

## API Endpoints

### POST /auth/signup
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2025-01-20T..."
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "uuid",
  "expiresIn": "7d"
}
```

### POST /auth/signin
Login user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "uuid",
  "expiresIn": "7d"
}
```

### POST /auth/refresh
Refresh access token.

**Request:**
```json
{
  "refreshToken": "uuid"
}
```

**Response:**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGc...",
  "expiresIn": "7d"
}
```

### POST /auth/verify
Verify access token.

**Request:**
```json
{
  "token": "eyJhbGc..."
}
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### POST /auth/signout
Sign out (revoke refresh token).

**Request:**
```json
{
  "refreshToken": "uuid"
}
```

**Response:**
```json
{
  "message": "Signed out successfully"
}
```

### POST /auth/signout-all
Sign out from all devices.

**Request:**
```json
{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "message": "Signed out from all devices successfully"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "auth-service",
  "version": "1.0.0",
  "timestamp": "2025-01-20T...",
  "uptime": 12345
}
```

## Environment Variables

```env
# Server
PORT=3001
NODE_ENV=development

# Database (Neon DB)
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/auth?sslmode=require

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Bcrypt
BCRYPT_ROUNDS=10

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

## Development

### Install Dependencies

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

## Docker

### Build Image

```bash
docker build -t auth-service .
```

### Run Container

```bash
docker run -p 3001:3001 \
  -e DATABASE_URL=your-neon-db-url \
  -e JWT_SECRET=your-secret \
  auth-service
```

## Database Schema

### users
- `id` (UUID, primary key)
- `email` (VARCHAR, unique)
- `password_hash` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### refresh_tokens
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key)
- `token` (VARCHAR, unique)
- `expires_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `revoked` (BOOLEAN)

### password_resets
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key)
- `token` (VARCHAR, unique)
- `expires_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `used` (BOOLEAN)

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens signed with HS256
- HTTPS required in production
- Rate limiting enabled
- Helmet.js for security headers
- CORS configured
- SQL injection prevention (parameterized queries)

## Monitoring

- Health check endpoint at `/health`
- Correlation IDs for request tracing
- Structured logging with Winston
- Automatic cleanup of expired tokens (hourly)

## Error Handling

All errors return consistent format:

```json
{
  "error": "Error message",
  "statusCode": 400,
  "correlationId": "uuid"
}
```

Common status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials, expired token)
- `409` - Conflict (email already exists)
- `500` - Internal Server Error

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Deployment

See main project documentation for Kubernetes deployment instructions.

## License

MIT
