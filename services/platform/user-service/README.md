# User Service

Centralized user profile and preferences microservice for the platform. Manages user identity, profiles, preferences, app permissions, social links, and product-specific metadata across all platform applications.

## Overview

The User Service is extracted from common user-related functionality across portfolio apps (code-talk, educationELLy, firebook, intervalai). It provides a single source of truth for user identity and profile data while integrating with the Auth Service for authentication.

### Key Features

- **User Profiles**: Display names, bios, avatars, timezone, language settings
- **User Preferences**: Theme, notification settings, custom preferences
- **App Permissions**: Per-application role and permission management
- **Social Links**: GitHub, LinkedIn, Twitter, and other platform integrations
- **Product Metadata**: Flexible JSONB storage for app-specific user data
- **Search & Discovery**: Public profile search and listing

### Service Boundaries

- **Auth Service**: Owns credentials, tokens, email verification (port 3001)
- **User Service**: Owns profiles, preferences, relationships (port 3002)
- Foreign key relationship: `user_profiles.auth_user_id` → `auth_service.users.id`

## Tech Stack

- **Runtime**: Node.js 18+ (ES Modules)
- **Framework**: Express.js 4.18
- **Database**: PostgreSQL (Neon DB serverless)
- **Validation**: express-validator
- **Security**: Helmet, CORS, rate limiting
- **Logging**: Winston (via @platform/logger)
- **Error Handling**: Centralized (via @platform/errors)

## Database Schema

```sql
-- User profiles (links to auth-service via auth_user_id)
user_profiles (
  id, auth_user_id, username, display_name, bio, avatar_url,
  timezone, language, role, is_public, created_at, updated_at
)

-- User preferences
user_preferences (
  id, user_profile_id, theme, email_notifications,
  push_notifications, preferences_json, created_at, updated_at
)

-- Per-app permissions
app_permissions (
  id, user_profile_id, app_name, permissions[json], created_at
)

-- Social links
social_links (
  id, user_profile_id, platform, url, created_at
)

-- Product metadata (flexible storage)
product_metadata (
  id, user_profile_id, product_name, metadata_json, created_at, updated_at
)
```

## API Endpoints

### Profile Management

#### Create Profile
```http
POST /api/v1/profiles
Content-Type: application/json

{
  "authUserId": 123,
  "username": "johndoe",
  "displayName": "John Doe",
  "email": "john@example.com"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": 1,
    "auth_user_id": 123,
    "username": "johndoe",
    "display_name": "John Doe",
    "role": "USER",
    "is_public": true,
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

#### Get Profile by Auth User ID
```http
GET /api/v1/profiles/:authUserId

Response: 200 OK
{
  "success": true,
  "data": { /* profile */ }
}
```

#### Get Profile by Username
```http
GET /api/v1/profiles/username/:username

Response: 200 OK (only if public)
{
  "success": true,
  "data": { /* profile */ }
}
```

#### Update Profile
```http
PUT /api/v1/profiles/:authUserId
Content-Type: application/json

{
  "username": "newusername",
  "displayName": "New Name",
  "bio": "Software engineer",
  "avatarUrl": "https://example.com/avatar.jpg",
  "timezone": "America/New_York",
  "language": "en",
  "isPublic": true
}

Response: 200 OK
{
  "success": true,
  "data": { /* updated profile */ }
}
```

#### Delete Profile
```http
DELETE /api/v1/profiles/:authUserId

Response: 200 OK
{
  "success": true,
  "message": "Profile deleted successfully"
}
```

#### Search Public Profiles
```http
GET /api/v1/profiles/search?q=john&limit=20&offset=0

Response: 200 OK
{
  "success": true,
  "data": [ /* profiles */ ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "count": 5
  }
}
```

#### List Public Profiles
```http
GET /api/v1/profiles?limit=20&offset=0

Response: 200 OK
{
  "success": true,
  "data": [ /* profiles */ ],
  "pagination": { /* ... */ }
}
```

### Preferences

#### Get Preferences
```http
GET /api/v1/profiles/:authUserId/preferences

Response: 200 OK
{
  "success": true,
  "data": {
    "theme": "dark",
    "email_notifications": true,
    "push_notifications": false,
    "preferences_json": { /* custom prefs */ }
  }
}
```

#### Update Preferences
```http
PUT /api/v1/profiles/:authUserId/preferences
Content-Type: application/json

{
  "theme": "dark",
  "emailNotifications": false,
  "pushNotifications": true,
  "preferencesJson": {
    "customKey": "customValue"
  }
}

Response: 200 OK
{
  "success": true,
  "data": { /* updated preferences */ }
}
```

### App Permissions

#### Get All App Permissions
```http
GET /api/v1/profiles/:authUserId/permissions

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "app_name": "code-talk",
      "permissions": ["read", "write", "admin"]
    }
  ]
}
```

#### Get App Permissions
```http
GET /api/v1/profiles/:authUserId/permissions/:appName

Response: 200 OK
{
  "success": true,
  "data": {
    "app_name": "code-talk",
    "permissions": ["read", "write"]
  }
}
```

#### Update App Permissions
```http
PUT /api/v1/profiles/:authUserId/permissions/:appName
Content-Type: application/json

{
  "permissions": ["read", "write", "admin"]
}

Response: 200 OK
```

### Social Links

#### Get Social Links
```http
GET /api/v1/profiles/:authUserId/social-links

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": 1,
      "platform": "github",
      "url": "https://github.com/johndoe"
    }
  ]
}
```

#### Add Social Link
```http
POST /api/v1/profiles/:authUserId/social-links
Content-Type: application/json

{
  "platform": "github",
  "url": "https://github.com/johndoe"
}

Response: 201 Created
```

**Supported Platforms**: github, linkedin, twitter, facebook, instagram, website

#### Delete Social Link
```http
DELETE /api/v1/profiles/:authUserId/social-links/:id

Response: 200 OK
```

### Product Metadata

#### Get All Product Metadata
```http
GET /api/v1/profiles/:authUserId/metadata

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "product_name": "code-talk",
      "metadata_json": { /* ... */ }
    }
  ]
}
```

#### Get Product Metadata
```http
GET /api/v1/profiles/:authUserId/metadata/:productName

Response: 200 OK
{
  "success": true,
  "data": {
    "product_name": "code-talk",
    "metadata_json": {
      "roomsJoined": ["room1", "room2"],
      "lastSeen": "2024-01-15T10:00:00Z"
    }
  }
}
```

#### Update Product Metadata
```http
PUT /api/v1/profiles/:authUserId/metadata/:productName
Content-Type: application/json

{
  "metadata": {
    "roomsJoined": ["room1", "room2", "room3"],
    "lastSeen": "2024-01-15T12:00:00Z"
  },
  "merge": false  // true to merge with existing, false to replace
}

Response: 200 OK
```

### Health Check

```http
GET /health

Response: 200 OK
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

## Environment Variables

```bash
# Server Configuration
NODE_ENV=development
USER_SERVICE_PORT=3002

# Database
USER_DATABASE_URL=postgresql://user:password@localhost:5432/user_service

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=debug
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your database credentials

# Start development server
npm run dev

# Start production server
npm start
```

## Integration with Auth Service

### On User Signup (Auth Service → User Service)
```javascript
// After creating user in auth-service
const response = await fetch('http://user-service:3002/api/v1/profiles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    authUserId: newUser.id,
    email: newUser.email
  })
});
```

### On User Deletion (Auth Service → User Service)
```javascript
// Before deleting user in auth-service
await fetch(`http://user-service:3002/api/v1/profiles/${userId}`, {
  method: 'DELETE'
});
// CASCADE deletes all related data automatically
```

## Docker Deployment

```bash
# Build image
docker build -t user-service:latest .

# Run container
docker run -d \
  -p 3002:3002 \
  -e USER_DATABASE_URL=postgresql://... \
  --name user-service \
  user-service:latest
```

## Kubernetes Deployment

See `/k8s/user-service/` for Kubernetes manifests.

```bash
kubectl apply -f k8s/user-service/
```

## Error Responses

All errors follow the standard format:

```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 404
}
```

Common status codes:
- `400` - Bad Request (validation errors)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (username taken, etc.)
- `500` - Internal Server Error

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Development with auto-reload
npm run dev
```

## Project Structure

```
user-service/
├── config/
│   └── database.js         # Database connection & schema
├── models/
│   ├── UserProfile.js      # Profile model
│   ├── UserPreferences.js  # Preferences model
│   ├── AppPermissions.js   # Permissions model
│   ├── SocialLinks.js      # Social links model
│   ├── ProductMetadata.js  # Metadata model
│   └── index.js            # Model exports
├── routes/
│   ├── profiles.js         # Profile routes
│   ├── preferences.js      # Preferences routes
│   ├── permissions.js      # Permissions routes
│   ├── socialLinks.js      # Social links routes
│   ├── metadata.js         # Metadata routes
│   └── index.js            # Route setup
├── tests/                  # Jest tests
├── index.js                # Server entry point
├── package.json
├── Dockerfile
└── README.md
```

## Security

- All passwords should be hashed by auth-service before storage
- Rate limiting applied per endpoint
- CORS configured for allowed origins
- Helmet.js security headers
- Input validation on all endpoints
- Non-root Docker container
- Parameterized SQL queries (SQL injection prevention)

## Migration from Portfolio Apps

When migrating from existing apps:

1. **code-talk**: Map `username` directly, use `user_rooms` data in `product_metadata`
2. **educationELLy**: Map `email` to profile, store student relationships in `product_metadata`
3. **educationELLy-graphql**: Similar to educationELLy
4. **Common pattern**: Use `product_metadata` JSONB for app-specific data

## License

MIT
