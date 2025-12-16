# Auth Service

JWT-based authentication service for the microservices platform.

## Features

### Core Authentication
- User registration (signup) with email verification
- User login (signin) with account lockout protection
- JWT access tokens
- Refresh tokens
- Token verification
- Sign out (single device)
- Sign out all (all devices)

### Password Reset
- Request password reset via email
- Secure token-based password reset
- Token validation before reset
- Rate limiting (3 requests per hour)

### Email Verification
- Automatic verification email on signup
- Resend verification email
- Check verification status

### Account Security
- Account lockout after failed login attempts (default: 5 attempts)
- Automatic unlock after lockout period (default: 15 minutes)
- Email notifications on account lockout
- Automatic cleanup of expired tokens

## Tech Stack

- **Node.js** + **Express**
- **PostgreSQL** (Neon DB)
- **JWT** for authentication
- **bcrypt** for password hashing
- **SendGrid** for email delivery (optional)

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
  "version": "1.1.0",
  "timestamp": "2025-01-20T...",
  "uptime": 12345
}
```

---

## Password Reset Endpoints

### POST /auth/forgot-password
Request a password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

### POST /auth/reset-password
Reset password using the token from email.

**Request:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password has been reset successfully. Please sign in with your new password."
}
```

### POST /auth/validate-reset-token
Validate a reset token before showing the password form.

**Request:**
```json
{
  "token": "reset-token-from-email"
}
```

**Response:**
```json
{
  "valid": true
}
```

---

## Email Verification Endpoints

### POST /auth/verify-email
Verify email address using token.

**Request:**
```json
{
  "token": "verification-token-from-email"
}
```

**Response:**
```json
{
  "message": "Email verified successfully.",
  "email": "user@example.com"
}
```

### POST /auth/resend-verification
Resend verification email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account exists with this email, a verification link has been sent."
}
```

### POST /auth/verification-status
Check email verification status (requires access token).

**Request:**
```json
{
  "token": "access-token"
}
```

**Response:**
```json
{
  "emailVerified": true
}
```

---

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

# Account Security
MAX_LOGIN_ATTEMPTS=5              # Lock after N failed attempts
LOCKOUT_DURATION_MINUTES=15       # Account lockout duration
PASSWORD_RESET_EXPIRY_HOURS=1     # Password reset token validity
EMAIL_VERIFICATION_EXPIRY_HOURS=24 # Email verification token validity

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@example.com
EMAIL_FROM_NAME=Auth Service
FRONTEND_URL=http://localhost:3000  # For email links

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

### auth_users
- `id` (UUID, primary key)
- `email` (VARCHAR, unique)
- `password_hash` (VARCHAR)
- `email_verified` (BOOLEAN, default: false)
- `email_verification_token` (VARCHAR)
- `email_verification_expires` (TIMESTAMP)
- `failed_login_attempts` (INTEGER, default: 0)
- `locked_until` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### auth_refresh_tokens
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key)
- `token` (VARCHAR, unique)
- `expires_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `revoked` (BOOLEAN)

### auth_password_resets
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
- Account lockout after failed login attempts
- Email verification for new accounts
- Secure password reset with expiring tokens
- Rate limiting on password reset requests

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
- `400` - Bad Request (validation errors, invalid token)
- `401` - Unauthorized (invalid credentials, expired token)
- `409` - Conflict (email already exists)
- `429` - Too Many Requests (account locked, rate limited)
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
