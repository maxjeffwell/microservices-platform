import pg from 'pg';
import { createLogger } from '@platform/logger';

const { Pool } = pg;
const logger = createLogger('auth-service:database');

// Database configuration for Neon DB
const connectionString = process.env.DATABASE_URL || process.env.AUTH_DATABASE_URL;

if (!connectionString) {
  logger.error('DATABASE_URL or AUTH_DATABASE_URL environment variable is required');
  process.exit(1);
}

const config = {
  connectionString,
  ssl: {
    rejectUnauthorized: false  // Neon uses self-signed certificates
  },
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
const pool = new Pool(config);

// Test connection
pool.on('connect', () => {
  logger.info('Connected to Neon DB (PostgreSQL)');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { error: err });
  process.exit(-1);
});

/**
 * Execute a SQL query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<object>}
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Query error', { error: error.message, query: text });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<PoolClient>}
 */
export async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query;
  const originalRelease = client.release;

  // Set a timeout of 5 seconds
  const timeout = setTimeout(() => {
    logger.error('A client has been checked out for more than 5 seconds!');
  }, 5000);

  // Monkey patch the query method to track queries
  client.query = (...args) => {
    return originalQuery.apply(client, args);
  };

  // Monkey patch the release method to clear timeout
  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease.apply(client);
  };

  return client;
}

/**
 * Initialize database schema
 */
export async function initializeSchema() {
  logger.info('Initializing database schema...');

  const schema = `
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Create auth_users table
    CREATE TABLE IF NOT EXISTS auth_users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      email_verified BOOLEAN DEFAULT FALSE,
      email_verification_token VARCHAR(500),
      email_verification_expires TIMESTAMP WITH TIME ZONE,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Add columns if they don't exist (for existing databases)
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auth_users' AND column_name='email_verified') THEN
        ALTER TABLE auth_users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auth_users' AND column_name='email_verification_token') THEN
        ALTER TABLE auth_users ADD COLUMN email_verification_token VARCHAR(500);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auth_users' AND column_name='email_verification_expires') THEN
        ALTER TABLE auth_users ADD COLUMN email_verification_expires TIMESTAMP WITH TIME ZONE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auth_users' AND column_name='failed_login_attempts') THEN
        ALTER TABLE auth_users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auth_users' AND column_name='locked_until') THEN
        ALTER TABLE auth_users ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;
      END IF;
    END $$;

    -- Create auth_refresh_tokens table
    CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      token VARCHAR(500) UNIQUE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      revoked BOOLEAN DEFAULT FALSE
    );

    -- Create auth_password_resets table
    CREATE TABLE IF NOT EXISTS auth_password_resets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      token VARCHAR(500) UNIQUE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      used BOOLEAN DEFAULT FALSE
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
    CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user_id ON auth_refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_token ON auth_refresh_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires_at ON auth_refresh_tokens(expires_at);
    CREATE INDEX IF NOT EXISTS idx_auth_password_resets_token ON auth_password_resets(token);
    CREATE INDEX IF NOT EXISTS idx_auth_password_resets_user_id ON auth_password_resets(user_id);

    -- Create updated_at trigger function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Create trigger for auth_users table
    DROP TRIGGER IF EXISTS update_auth_users_updated_at ON auth_users;
    CREATE TRIGGER update_auth_users_updated_at
      BEFORE UPDATE ON auth_users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    await query(schema);
    logger.info('Database schema initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database schema', { error: error.message });
    throw error;
  }
}

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    const result = await query('SELECT NOW() as now, version() as version');
    logger.info('Database connection test successful', {
      timestamp: result.rows[0].now,
      version: result.rows[0].version
    });
    return true;
  } catch (error) {
    logger.error('Database connection test failed', { error: error.message });
    return false;
  }
}

export default pool;
