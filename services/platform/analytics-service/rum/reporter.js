/*
 * Real-user web-performance reporter. Served by analytics-service at
 * /analytics/rum.js, appended after the web-vitals IIFE build (global
 * `webVitals`). Each portfolio app loads it with one tag:
 *
 *   <script defer src="https://vertex-platform.el-jefe.me/analytics/rum.js"></script>
 *
 * Collects LCP, INP, CLS, FCP and TTFB for the page load, batches them, and
 * sends one beacon when the page is hidden (tab switch, navigation, close).
 * Anonymous: no cookies, no user ids, no URLs beyond the landing path (the
 * server normalises it). Honours Global Privacy Control / Do Not Track.
 */
(function () {
  'use strict';

  var wv = window.webVitals;
  if (!wv || typeof wv.onLCP !== 'function') return;
  if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') return;

  var script = document.currentScript;
  var endpoint;
  try {
    endpoint = new URL('rum', script && script.src ? script.src : 'https://vertex-platform.el-jefe.me/analytics/rum.js').href;
  } catch (e) {
    return;
  }

  // Vitals describe the initial (hard) page load, so the landing path is the page.
  var page = location.pathname;

  function deviceClass() {
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var w = window.innerWidth || 0;
    if (coarse && w < 768) return 'mobile';
    if (coarse && w < 1200) return 'tablet';
    return 'desktop';
  }

  var conn = (navigator.connection && navigator.connection.effectiveType) || 'unknown';
  var device = deviceClass();

  // Latest value per metric id; only changed entries are sent on each flush.
  var pending = {};

  function record(m) {
    pending[m.id] = {
      n: m.name,
      v: Math.round(m.name === 'CLS' ? m.value * 10000 : m.value) / (m.name === 'CLS' ? 10000 : 1),
      r: m.rating,
      nav: m.navigationType,
      id: m.id,
    };
  }

  function flush() {
    var ids = Object.keys(pending);
    if (!ids.length) return;
    var metrics = ids.map(function (k) { return pending[k]; });
    pending = {};
    var body = JSON.stringify({ v: 1, page: page, device: device, conn: conn, metrics: metrics });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(endpoint, new Blob([body], { type: 'text/plain' }))) return;
    } catch (e) { /* fall through to fetch */ }
    try {
      fetch(endpoint, { method: 'POST', body: body, keepalive: true, mode: 'no-cors', credentials: 'omit', headers: { 'Content-Type': 'text/plain' } });
    } catch (e) { /* best effort */ }
  }

  wv.onLCP(record);
  wv.onINP(record);
  wv.onCLS(record);
  wv.onFCP(record);
  wv.onTTFB(record);

  addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });
  addEventListener('pagehide', flush);
})();
