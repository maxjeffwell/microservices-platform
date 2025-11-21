import jwt from 'jsonwebtoken';
import { createLogger } from '@platform/logger';
import { UnauthorizedError } from '@platform/errors';

const logger = createLogger('auth-service:jwt');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

if (!JWT_SECRET) {
  logger.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

/**
 * Generate access token
 * @param {object} payload - User data to include in token
 * @returns {string}
 */
export function generateAccessToken(payload) {
  try {
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'auth-service',
      audience: 'platform-services',
    });

    logger.debug('Access token generated', { userId: payload.userId });
    return token;
  } catch (error) {
    logger.error('Error generating access token', { error: error.message });
    throw error;
  }
}

/**
 * Verify access token
 * @param {string} token
 * @returns {object} - Decoded payload
 * @throws {UnauthorizedError}
 */
export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'auth-service',
      audience: 'platform-services',
    });

    logger.debug('Access token verified', { userId: decoded.userId });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Invalid token');
    }

    logger.error('Error verifying access token', { error: error.message });
    throw new UnauthorizedError('Token verification failed');
  }
}

/**
 * Decode token without verification (for debugging)
 * @param {string} token
 * @returns {object|null}
 */
export function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Error decoding token', { error: error.message });
    return null;
  }
}

/**
 * Check if token is expired
 * @param {string} token
 * @returns {boolean}
 */
export function isTokenExpired(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
}

/**
 * Get token expiration time
 * @param {string} token
 * @returns {Date|null}
 */
export function getTokenExpiration(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null}
 */
export function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Generate token payload from user
 * @param {object} user
 * @returns {object}
 */
export function generateTokenPayload(user) {
  return {
    userId: user.id,
    email: user.email,
  };
}
