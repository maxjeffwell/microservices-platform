# Neon DB Setup Guide

This guide walks you through setting up Neon DB (serverless PostgreSQL) for the microservices platform.

## Why Neon DB?

- **Serverless** - Scales to zero when not in use (free tier)
- **Instant branching** - Create database branches for dev/staging/prod
- **Fast provisioning** - Databases ready in seconds
- **Modern** - Built for cloud-native applications
- **Free tier** - 512MB storage, 10GB data transfer/month

## Setup Instructions

### 1. Create Neon Account

1. Go to [console.neon.tech](https://console.neon.tech)
2. Sign up with GitHub (recommended) or email
3. Verify your email

### 2. Create Your First Project

1. Click "Create a project"
2. Project name: `microservices-platform`
3. Region: Choose closest to you
4. PostgreSQL version: 16 (latest)
5. Click "Create project"

### 3. Create Databases

You'll need to create separate databases for each service. Neon creates one default database, but you need multiple.

#### Option A: Using Neon Console SQL Editor

For each database, run these commands in the SQL Editor:

```sql
-- Auth Service
CREATE DATABASE auth;

-- User Service
CREATE DATABASE users;

-- Notification Service
CREATE DATABASE notifications;

-- Media Service
CREATE DATABASE media;

-- educationELLy Services
CREATE DATABASE education_elly_progress;

-- Code Talk Services
CREATE DATABASE code_talk_rooms;
CREATE DATABASE code_talk_messages;
CREATE DATABASE code_talk_storage;

-- FireBook Services
CREATE DATABASE firebook_bookmarks;
CREATE DATABASE firebook_collections;

-- IntervalAI Services
CREATE DATABASE intervalai_reviews;
```

#### Option B: Using psql CLI

```bash
# Install psql if you don't have it
brew install postgresql  # macOS
# or
sudo apt-get install postgresql-client  # Linux

# Connect to your Neon database
psql "postgresql://user:password@ep-xxx.neon.tech/neondb"

# Then run the CREATE DATABASE commands above
```

### 4. Get Connection Strings

For each database, you need a connection string:

1. In Neon Console, go to your project
2. Click on "Connection string" in the top right
3. Select each database from the dropdown
4. Copy the connection string
5. It will look like:
   ```
   postgresql://user:password@ep-xxx-xxx.neon.tech/database_name?sslmode=require
   ```

### 5. Update .env File

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update the connection strings in `.env`:

```env
# Format: postgresql://[user]:[password]@[endpoint]/[database]?sslmode=require

AUTH_DATABASE_URL=postgresql://neondb_owner:xxx@ep-xxx.neon.tech/auth?sslmode=require
USER_DATABASE_URL=postgresql://neondb_owner:xxx@ep-xxx.neon.tech/users?sslmode=require
NOTIFICATION_DATABASE_URL=postgresql://neondb_owner:xxx@ep-xxx.neon.tech/notifications?sslmode=require
MEDIA_DATABASE_URL=postgresql://neondb_owner:xxx@ep-xxx.neon.tech/media?sslmode=require

# ... and so on for all databases
```

### 6. Test Connection

Test your connection with psql:

```bash
psql "postgresql://user:password@ep-xxx.neon.tech/auth?sslmode=require"
```

Or using Node.js:

```javascript
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.AUTH_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();
const res = await client.query('SELECT NOW()');
console.log(res.rows[0]);
await client.end();
```

## Database Schema Initialization

Each service will automatically initialize its schema when it starts. The migration scripts are in each service's `config/database.js` file.

### Manual Schema Initialization

If you need to manually initialize a schema:

```bash
cd services/platform/auth-service
npm run migrate
```

## Multiple Environments (Optional)

### Development, Staging, Production

Neon supports database branching, which is perfect for environments:

1. **Main branch** - Production
2. **Create branch** for staging
3. **Create branch** for development

To create a branch:
1. Go to Neon Console
2. Click "Branches" in sidebar
3. Click "New branch"
4. Name it (e.g., `staging`, `development`)
5. Get connection strings for each branch

Update your `.env`:

```env
# Development (branch)
AUTH_DATABASE_URL=postgresql://user:password@ep-dev-xxx.neon.tech/auth?sslmode=require

# Staging (branch)
# AUTH_DATABASE_URL=postgresql://user:password@ep-staging-xxx.neon.tech/auth?sslmode=require

# Production (main branch)
# AUTH_DATABASE_URL=postgresql://user:password@ep-prod-xxx.neon.tech/auth?sslmode=require
```

## Neon CLI (Optional)

Install Neon CLI for easier management:

```bash
npm install -g neonctl
```

Login:
```bash
neonctl auth
```

List projects:
```bash
neonctl projects list
```

Create database:
```bash
neonctl databases create --project-id=your-project-id --name=auth
```

## Best Practices

### 1. Use Pooling

Neon supports connection pooling. Your connection string can use pooling:

```
postgresql://user:password@ep-xxx.neon.tech/auth?sslmode=require&pooling=true
```

### 2. Set Connection Limits

In your database config:

```javascript
const pool = new Pool({
  connectionString: process.env.AUTH_DATABASE_URL,
  max: 10, // Maximum 10 connections per service
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 3. Handle SSL Properly

Neon requires SSL. In production:

```javascript
const pool = new Pool({
  connectionString: process.env.AUTH_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false  // Neon uses self-signed certs
  }
});
```

### 4. Monitor Usage

- Check Neon Console for usage metrics
- Free tier: 512MB storage, 10GB transfer/month
- Set up alerts for approaching limits

### 5. Backup Strategy

Neon automatically backs up your data:
- Point-in-time recovery (7 days on free tier)
- Branch your database before major changes
- Export critical data periodically:

```bash
pg_dump "postgresql://user:password@ep-xxx.neon.tech/auth" > backup.sql
```

## Troubleshooting

### Connection Refused

- Check connection string format
- Ensure `?sslmode=require` is included
- Verify IP whitelist (Neon allows all by default)

### Too Many Connections

- Reduce `max` connections in pool config
- Check for connection leaks (always `client.release()`)
- Use connection pooling: `?pooling=true`

### Slow Queries

- Neon shows query stats in console
- Add indexes to frequently queried columns
- Use `EXPLAIN ANALYZE` to debug slow queries

### Database Not Found

- Double-check database name in connection string
- Verify database was created: `SELECT datname FROM pg_database;`

## Cost Management

### Free Tier Limits

- 512MB storage
- 10GB data transfer/month
- 1 project
- Unlimited databases
- 7-day point-in-time recovery

### Staying Within Limits

- Use MongoDB for document storage (runs locally)
- Regularly clean up old data
- Use indexes to reduce query load
- Archive old records to external storage

### Upgrading (if needed)

If you exceed free tier:
- **Launch**: $19/month - 3GB storage, 200GB transfer
- **Scale**: $69/month - 10GB storage, 500GB transfer

## Resources

- [Neon Documentation](https://neon.tech/docs)
- [Connection String Format](https://neon.tech/docs/connect/connect-from-any-app)
- [Neon CLI Reference](https://neon.tech/docs/reference/cli-reference)
- [Node.js with Neon](https://neon.tech/docs/guides/node)

---

**Next Steps**: After setting up Neon DB, continue with building the Auth Service!
