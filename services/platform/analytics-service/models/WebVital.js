import { Point } from '@influxdata/influxdb-client';

/**
 * One RUM beacon (from routes/rum.js via Kafka topic web.vitals) becomes one
 * point per metric in measurement web_vitals (bucket web-perf).
 *
 * Tags (all validated/allow-listed server-side): app, host, page, metric,
 * rating, device, browser, conn, nav. Fields: value (ms, or unitless for
 * CLS) and id (web-vitals metric id; a field so it never becomes a series).
 */
export function webVitalsToPoints(msg) {
  if (!msg || typeof msg !== 'object' || !msg.app || !Array.isArray(msg.metrics)) return [];
  const at = new Date(Number.isFinite(msg.ts) ? msg.ts : Date.now());
  return msg.metrics
    .filter((m) => m && m.name && Number.isFinite(m.value))
    .map((m) =>
      new Point('web_vitals')
        .tag('app', msg.app)
        .tag('host', msg.host || '')
        .tag('page', msg.page || '/')
        .tag('metric', m.name)
        .tag('rating', m.rating || 'unknown')
        .tag('device', msg.device || 'desktop')
        .tag('browser', msg.browser || 'other')
        .tag('conn', msg.conn || 'unknown')
        .tag('nav', m.nav || 'other')
        .floatField('value', m.value)
        .stringField('id', m.id || '')
        .timestamp(at)
    );
}
