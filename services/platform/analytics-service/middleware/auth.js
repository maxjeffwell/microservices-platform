import { authenticateToken } from '@platform/middleware';
import { UnauthorizedError, ForbiddenError } from '@platform/errors';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required: analytics endpoints only accept auth-service tokens');
}

/**
 * Every /analytics request needs a valid auth-service access token
 * (Authorization: Bearer <token>), checked with the same issuer/audience
 * auth-service signs with.
 */
export const requireAuth = authenticateToken(process.env.JWT_SECRET, {
  issuer: 'auth-service',
  audience: 'platform-services',
});

/**
 * Scope events to the caller: events are always recorded under the token's
 * userId (any userId in the body is replaced), and a user can only read
 * their own event history. Metrics and dashboards are readable by any
 * authenticated user.
 */
export function scopeToUser(req, res, next) {
  const userId = req.user?.userId;
  if (!userId) {
    return next(new UnauthorizedError('Token has no userId'));
  }
  if (req.method === 'POST' && req.path === '/events' && req.body && typeof req.body === 'object') {
    req.body.userId = String(userId);
  }
  if (req.method === 'POST' && req.path === '/events/batch' && Array.isArray(req.body)) {
    req.body = req.body.map((event) => ({ ...event, userId: String(userId) }));
  }
  const own = req.path.match(/^\/users\/([^/]+)\/events\/?$/);
  if (own && decodeURIComponent(own[1]) !== String(userId)) {
    return next(new ForbiddenError('You can only read your own events'));
  }
  return next();
}
