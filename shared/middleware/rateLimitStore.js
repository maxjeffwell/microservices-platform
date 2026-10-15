import Redis from 'ioredis';
import { RedisStore } from 'rate-limit-redis';

/**
 * Shared (cross-replica) counter store for express-rate-limit.
 *
 * Each service runs 2 replicas; the library's default MemoryStore counts per
 * pod, so every client silently got 2x the configured budget. With REDIS_URL
 * set the counters live in Redis (default/redis, the Sentinel-backed cluster)
 * and all replicas see the same numbers. Without it this returns undefined and
 * express-rate-limit keeps its in-memory behaviour (local dev, tests).
 *
 * Keys are `rl:<name>:<ip>`. Every limiter MUST pass a distinct name or two
 * limiters (even in different services) would share one counter.
 *
 * Fail-open: callers pass `passOnStoreError: true` to rateLimit(), so a Redis
 * outage lets requests through (logged) instead of turning the API into 500s.
 */

let sharedClient;
let lastErrorLog = 0;

function clientFor(url, password) {
  if (sharedClient) return sharedClient;
  sharedClient = new Redis(url, {
    password: password || undefined,
    lazyConnect: true,
    enableOfflineQueue: false, // fail fast while disconnected (fail-open upstream)
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    retryStrategy: (times) => Math.min(times * 500, 5000),
  });
  sharedClient.on('error', (err) => {
    const now = Date.now();
    if (now - lastErrorLog > 60_000) {
      lastErrorLog = now;
      console.warn(`[rate-limit] Redis error (requests pass unthrottled meanwhile): ${err.message}`);
    }
  });
  sharedClient.connect().catch(() => {});
  return sharedClient;
}

/**
 * @param {string} name - limiter name, e.g. "auth", "auth-signup"
 * @param {object} [opts]
 * @param {string} [opts.url] - defaults to process.env.REDIS_URL
 * @param {string} [opts.password] - defaults to process.env.REDIS_PASSWORD
 * @param {object} [opts.client] - injected client (tests); needs .call(...args)
 * @returns {RedisStore|undefined}
 */
export function createRateLimitStore(name, opts = {}) {
  if (!name) throw new Error('createRateLimitStore: a limiter name is required');
  const url = 'url' in opts ? opts.url : process.env.REDIS_URL;
  if (!url) return undefined;
  const client = opts.client ?? clientFor(url, opts.password ?? process.env.REDIS_PASSWORD);
  const store = new RedisStore({
    prefix: `rl:${name}:`,
    sendCommand: (...args) => client.call(...args),
  });
  // rate-limit-redis 4.x issues SCRIPT LOAD in its constructor and only awaits
  // the stored promises (inside try/catch, with a reload on failure) on the
  // first increment/get. If Redis is unreachable at boot that early rejection
  // has no handler yet and Node kills the process. Observe them here; the real
  // consumers still see (and recover from) the rejection.
  store.incrementScriptSha?.catch?.(() => {});
  store.getScriptSha?.catch?.(() => {});
  return store;
}
