import pg from 'pg';
import { createLogger } from '@platform/logger';

const { Pool } = pg;
const logger = createLogger('user-service:database');

const pool = new Pool({
  connectionString: process.env.USER_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { error: err.message });
});

export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Query error', { text, error: error.message });
    throw error;
  }
}

export async function getClient() {
  const client = await pool.connect();
  const originalRelease = client.release.bind(client);

  client.release = () => {
    client.release = originalRelease;
    return originalRelease();
  };

  return client;
}

export async function testConnection() {
  try {
    const result = await query('SELECT NOW()');
    logger.info('Database connection successful', { timestamp: result.rows[0].now });
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    throw error;
  }
}

export async function initializeSchema() {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // User profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        auth_user_id INTEGER NOT NULL UNIQUE,
        username VARCHAR(25) UNIQUE,
        display_name VARCHAR(100),
        bio TEXT,
        avatar_url VARCHAR(500),
        timezone VARCHAR(50),
        language VARCHAR(10) DEFAULT 'en',
        role VARCHAR(20) DEFAULT 'USER',
        is_public BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // User preferences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        user_profile_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
        theme VARCHAR(20) DEFAULT 'auto',
        email_notifications BOOLEAN DEFAULT true,
        push_notifications BOOLEAN DEFAULT false,
        preferences_json JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // App permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_permissions (
        id SERIAL PRIMARY KEY,
        user_profile_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
        app_name VARCHAR(50) NOT NULL,
        permissions JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_profile_id, app_name)
      )
    `);

    // Social links table
    await client.query(`
      CREATE TABLE IF NOT EXISTS social_links (
        id SERIAL PRIMARY KEY,
        user_profile_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        url VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Product metadata table
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_metadata (
        id SERIAL PRIMARY KEY,
        user_profile_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
        product_name VARCHAR(50) NOT NULL,
        metadata_json JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_profile_id, product_name)
      )
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON user_profiles(auth_user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_app_permissions_user_app ON app_permissions(user_profile_id, app_name)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_product_metadata_user_product ON product_metadata(user_profile_id, product_name)');

    await client.query('COMMIT');
    logger.info('Database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to initialize schema', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

export default {
  query,
  getClient,
  testConnection,
  initializeSchema
};
