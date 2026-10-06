import express from 'express';
import { rateLimiter } from '@platform/middleware';
import logger from '@platform/logger';
import { buildRumMessage, publishRum, rumScript } from '../services/rumService.js';

/**
 * Public RUM routes, mounted at /analytics BEFORE the JWT-protected routes:
 *   GET  /analytics/rum.js  - web-vitals + reporter (cross-origin script)
 *   POST /analytics/rum     - beacon ingest (text/plain JSON from sendBeacon)
 */
const router = express.Router();

// helmet sets Cross-Origin-Resource-Policy: same-origin on every response.
// The apps load rum.js and post beacons cross-origin, so both routes need
// cross-origin, or browsers block the response (ERR_BLOCKED_BY_RESPONSE.
// NotSameOrigin) and log a console error on every page.
router.use((req, res, next) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// One beacon per page view; generous per-IP ceiling, separate from the
// 100/15 min limit on the authenticated API.
const rumLimiter = rateLimiter(
  parseInt(process.env.RUM_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  parseInt(process.env.RUM_RATE_LIMIT_MAX_REQUESTS, 10) || 600
);

router.get('/rum.js', (req, res) => {
  res.set({
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  });
  res.send(rumScript());
});

router.post(
  '/rum',
  rumLimiter,
  express.text({ type: ['text/plain', 'application/json'], limit: '8kb' }),
  async (req, res) => {
    const result = buildRumMessage({
      origin: req.get('Origin'),
      userAgent: req.get('User-Agent'),
      body: req.body,
    });
    if (result.status !== 202) {
      if (result.status >= 400) logger.debug('RUM beacon rejected', { reason: result.reason, origin: req.get('Origin') });
      return res.status(result.status === 204 ? 204 : result.status).end();
    }
    try {
      await publishRum(result.message);
      return res.status(202).end();
    } catch (error) {
      logger.error('RUM publish failed', { error: error.message });
      return res.status(503).end();
    }
  }
);

export default router;
