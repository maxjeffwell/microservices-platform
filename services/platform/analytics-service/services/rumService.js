import { readFileSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendEvent } from '../config/kafka.js';

/**
 * Real-user monitoring (RUM) ingest: validates browser beacons from the
 * portfolio apps and publishes them to Kafka (KAFKA_WEBPERF_TOPIC). The Kafka
 * consumer writes them to the InfluxDB web-perf bucket (models/WebVital.js).
 *
 * The endpoint is public and unauthenticated, so everything that becomes an
 * InfluxDB tag is derived or allow-listed here, never taken from the client:
 *   - app/host come from the browser-set Origin header (allow-listed apps)
 *   - page is normalised (ids -> :id, depth 2) and capped per app
 *     (RUM_MAX_PAGES_PER_APP distinct pages, then "/other")
 *   - browser family comes from the User-Agent; bots are dropped
 *   - metric names, ratings, navigation types, devices and connection
 *     types must be in fixed sets; values must be finite and in range
 * The client IP is never stored.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const DEFAULT_APPS = 'code-talk,educationelly,educationelly-graphql,bookmarked,firebook,intervalai';
export const RUM_APPS = (process.env.RUM_APPS || DEFAULT_APPS)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Longest names first so "educationelly-graphql" wins over "educationelly".
const appAlternation = [...RUM_APPS]
  .sort((a, b) => b.length - a.length)
  .map((a) => a.replace(/[-.]/g, '\\$&'))
  .join('|');
const ORIGIN_RE = new RegExp(`^https://((${appAlternation})(-k8s)?)\\.el-jefe\\.me$`);

const METRICS = new Set(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);
const RATINGS = new Set(['good', 'needs-improvement', 'poor']);
const NAV_TYPES = new Set(['navigate', 'reload', 'back-forward', 'back-forward-cache', 'prerender', 'restore']);
const DEVICES = new Set(['mobile', 'tablet', 'desktop']);
const CONNS = new Set(['slow-2g', '2g', '3g', '4g', 'unknown']);
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|curl|wget|python|go-http/i;
const MAX_METRICS = 12;

/** Built once: web-vitals IIFE (defines global webVitals) + our reporter. */
let script = null;
export function rumScript() {
  if (!script) {
    const main = require.resolve('web-vitals'); // dist/web-vitals.umd.cjs
    const iife = readFileSync(path.join(path.dirname(main), 'web-vitals.iife.js'), 'utf8');
    const reporter = readFileSync(path.join(here, '..', 'rum', 'reporter.js'), 'utf8');
    script = `${iife}\n;${reporter}`;
  }
  return script;
}

/** "https://bookmarked-k8s.el-jefe.me" -> { app: "bookmarked", host: "bookmarked-k8s.el-jefe.me" } */
export function appFromOrigin(origin) {
  const m = typeof origin === 'string' ? origin.match(ORIGIN_RE) : null;
  if (!m) return null;
  return { app: m[2], host: `${m[1]}.el-jefe.me` };
}

/** Coarse browser family; null for bots and scripts. */
export function browserFamily(ua) {
  if (!ua || BOT_RE.test(ua)) return null;
  if (/Edg\//.test(ua)) return 'edge';
  if (/OPR\/|Opera/.test(ua)) return 'opera';
  if (/SamsungBrowser/.test(ua)) return 'samsung';
  if (/Firefox\/|FxiOS/.test(ua)) return 'firefox';
  if (/Chrome\/|CriOS/.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'other';
}

/** "/rooms/65f1c0ffee12ab34cd56ef78/edit?x=1" -> "/rooms/:id/edit" */
export function normalizePage(p) {
  if (typeof p !== 'string' || !p.startsWith('/')) return '/';
  const segments = p
    .split(/[?#]/)[0]
    .split('/')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => {
      let seg;
      try {
        seg = decodeURIComponent(s);
      } catch (e) {
        return ':id';
      }
      if (/\d/.test(seg)) return ':id'; // any digit: ids, dates, versions
      if (/^[0-9a-f]{8,}$/i.test(seg)) return ':id'; // mongo ids, hashes
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return ':id';
      if (/^[A-Za-z0-9_-]{20,}$/.test(seg)) return ':id'; // firestore ids, tokens
      if (!/^[A-Za-z0-9._~-]{1,40}$/.test(seg)) return ':id';
      return seg.toLowerCase();
    });
  return `/${segments.join('/')}`.slice(0, 80);
}

/**
 * Cardinality guard. `page` is the only free-form tag and the Origin header
 * can be forged outside a browser, so cap distinct pages per app: once an app
 * has RUM_MAX_PAGES_PER_APP distinct pages in this process, new ones are
 * recorded as "/other". Worst case = apps x cap series per tag combination.
 */
const MAX_PAGES_PER_APP = parseInt(process.env.RUM_MAX_PAGES_PER_APP, 10) || 50;
const seenPages = new Map();
export function boundedPage(app, page) {
  if (!seenPages.has(app)) seenPages.set(app, new Set(['/']));
  const seen = seenPages.get(app);
  if (seen.has(page)) return page;
  if (seen.size >= MAX_PAGES_PER_APP) return '/other';
  seen.add(page);
  return page;
}
export function resetSeenPages() {
  seenPages.clear();
}

function validMetric(m) {
  if (!m || typeof m !== 'object' || !METRICS.has(m.n) || !RATINGS.has(m.r)) return null;
  const v = Number(m.v);
  if (!Number.isFinite(v) || v < 0) return null;
  if (m.n === 'CLS' ? v > 10 : v > 60000) return null;
  return {
    name: m.n,
    value: v,
    rating: m.r,
    nav: NAV_TYPES.has(m.nav) ? m.nav : 'other',
    id: typeof m.id === 'string' && /^[\w.-]{1,64}$/.test(m.id) ? m.id : '',
  };
}

/**
 * @returns {{status: number, reason?: string, message?: object}}
 *   status 202 = accepted and published, 204 = dropped silently (bot/empty),
 *   400/403 = rejected
 */
export function buildRumMessage({ origin, userAgent, body }) {
  const who = appFromOrigin(origin);
  if (!who) return { status: 403, reason: 'origin not allowed' };

  const browser = browserFamily(userAgent);
  if (!browser) return { status: 204, reason: 'bot' };

  let data = body;
  if (typeof body === 'string') {
    try {
      data = JSON.parse(body);
    } catch (e) {
      return { status: 400, reason: 'invalid json' };
    }
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.metrics)) {
    return { status: 400, reason: 'invalid payload' };
  }

  const metrics = data.metrics.slice(0, MAX_METRICS).map(validMetric).filter(Boolean);
  if (!metrics.length) return { status: 204, reason: 'no valid metrics' };

  return {
    status: 202,
    message: {
      ts: Date.now(),
      app: who.app,
      host: who.host,
      page: boundedPage(who.app, normalizePage(data.page)),
      device: DEVICES.has(data.device) ? data.device : 'desktop',
      conn: CONNS.has(data.conn) ? data.conn : 'unknown',
      browser,
      metrics,
    },
  };
}

export async function publishRum(message) {
  const topic = process.env.KAFKA_WEBPERF_TOPIC || 'web.vitals';
  await sendEvent(topic, { ...message, appId: message.app });
}
