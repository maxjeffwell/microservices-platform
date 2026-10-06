import { appFromOrigin, browserFamily, normalizePage, buildRumMessage, rumScript } from '../services/rumService.js';
import { webVitalsToPoints } from '../models/WebVital.js';

const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const body = (metrics, extra = {}) => JSON.stringify({ v: 1, page: '/rooms/65f1c0ffee12ab34cd56ef78', device: 'mobile', conn: '4g', metrics, ...extra });
const LCP = { n: 'LCP', v: 1234.5, r: 'good', nav: 'navigate', id: 'v6-1712-123' };

describe('appFromOrigin', () => {
  it('derives the app from allow-listed origins, longest name first', () => {
    expect(appFromOrigin('https://educationelly-graphql-k8s.el-jefe.me')).toEqual({ app: 'educationelly-graphql', host: 'educationelly-graphql-k8s.el-jefe.me' });
    expect(appFromOrigin('https://educationelly.el-jefe.me').app).toBe('educationelly');
    expect(appFromOrigin('https://bookmarked-k8s.el-jefe.me').app).toBe('bookmarked');
  });
  it('rejects everything else', () => {
    ['https://evil.com', 'http://bookmarked.el-jefe.me', 'https://bookmarked.el-jefe.me.evil.com', 'https://podrick.el-jefe.me',
      'https://x.bookmarked.el-jefe.me', undefined, 'null'].forEach((o) => expect(appFromOrigin(o)).toBeNull());
  });
});

describe('normalizePage', () => {
  it('replaces ids and strips query/hash', () => {
    expect(normalizePage('/rooms/65f1c0ffee12ab34cd56ef78/edit?x=1#y')).toBe('/rooms/:id/edit');
    expect(normalizePage('/students/42')).toBe('/students/:id');
    expect(normalizePage('/b/3f2504e0-4f89-11d3-9a0c-0305e82c3301')).toBe('/b/:id');
    expect(normalizePage('/x/AbCdEfGhIjKlMnOpQrStUv')).toBe('/x/:id');
    expect(normalizePage('/Dashboard')).toBe('/dashboard');
  });
  it('caps depth and rejects junk', () => {
    expect(normalizePage('/a/b/c/d/e/f')).toBe('/a/b/c/d');
    expect(normalizePage('/<script>')).toBe('/:id');
    expect(normalizePage('nope')).toBe('/');
    expect(normalizePage(undefined)).toBe('/');
  });
});

describe('browserFamily', () => {
  it('classifies browsers and drops bots', () => {
    expect(browserFamily(CHROME)).toBe('chrome');
    expect(browserFamily('Mozilla/5.0 ... Edg/141.0')).toBe('edge');
    expect(browserFamily('Mozilla/5.0 (iPhone) AppleWebKit Version/18 Mobile Safari/604.1')).toBe('safari');
    expect(browserFamily('Googlebot/2.1')).toBeNull();
    expect(browserFamily('Mozilla/5.0 HeadlessChrome/141')).toBeNull();
    expect(browserFamily('curl/8.5')).toBeNull();
    expect(browserFamily('')).toBeNull();
  });
});

describe('buildRumMessage', () => {
  const ok = { origin: 'https://code-talk.el-jefe.me', userAgent: CHROME };
  it('accepts a valid beacon and derives everything tag-like server-side', () => {
    const r = buildRumMessage({ ...ok, body: body([LCP, { n: 'CLS', v: 0.05, r: 'good', nav: 'reload' }]) });
    expect(r.status).toBe(202);
    expect(r.message).toMatchObject({ app: 'code-talk', host: 'code-talk.el-jefe.me', page: '/rooms/:id', device: 'mobile', conn: '4g', browser: 'chrome' });
    expect(r.message.metrics).toHaveLength(2);
  });
  it('rejects foreign origins and bad bodies', () => {
    expect(buildRumMessage({ ...ok, origin: 'https://evil.com', body: body([LCP]) }).status).toBe(403);
    expect(buildRumMessage({ ...ok, body: '{not json' }).status).toBe(400);
    expect(buildRumMessage({ ...ok, body: '{"metrics":5}' }).status).toBe(400);
  });
  it('drops bots and invalid metrics silently', () => {
    expect(buildRumMessage({ ...ok, userAgent: 'Googlebot', body: body([LCP]) }).status).toBe(204);
    const bad = [{ n: 'FOO', v: 1, r: 'good' }, { n: 'LCP', v: -1, r: 'good' }, { n: 'LCP', v: 1e9, r: 'good' },
      { n: 'CLS', v: 50, r: 'good' }, { n: 'LCP', v: 'x', r: 'good' }, { n: 'LCP', v: 1, r: 'great' }];
    expect(buildRumMessage({ ...ok, body: body(bad) }).status).toBe(204);
  });
  it('coerces unknown enum values instead of trusting them', () => {
    const r = buildRumMessage({ ...ok, body: body([{ ...LCP, nav: 'evil' }], { device: 'toaster', conn: '9g' }) });
    expect(r.message.device).toBe('desktop');
    expect(r.message.conn).toBe('unknown');
    expect(r.message.metrics[0].nav).toBe('other');
  });
  it('caps metrics per beacon', () => {
    const r = buildRumMessage({ ...ok, body: body(Array(50).fill(LCP)) });
    expect(r.message.metrics.length).toBe(12);
  });
});

describe('webVitalsToPoints', () => {
  it('writes one point per metric with bounded tags', () => {
    const { message } = buildRumMessage({ origin: 'https://firebook.el-jefe.me', userAgent: CHROME, body: body([LCP]) });
    const [line] = webVitalsToPoints(message).map((p) => p.toLineProtocol());
    expect(line).toMatch(/^web_vitals,app=firebook,browser=chrome,conn=4g,device=mobile,host=firebook\.el-jefe\.me,metric=LCP,nav=navigate,page=\/rooms\/:id,rating=good id="v6-1712-123",value=1234\.5 /);
  });
});

describe('rumScript', () => {
  it('bundles web-vitals and the reporter, and runs in a browser-like context', () => {
    const src = rumScript();
    expect(src).toContain('var webVitals=');
    expect(src).toContain('sendBeacon');
    const calls = [];
    const listeners = {};
    const fakeWindow = {};
    const ctx = {
      window: fakeWindow, document: { currentScript: { src: 'https://vertex-platform.el-jefe.me/analytics/rum.js' }, visibilityState: 'visible', addEventListener() {} },
      navigator: { sendBeacon: (u, b) => { calls.push(u); return true; } }, location: { pathname: '/x' }, URL, Blob: class { constructor(p) { this.p = p; } },
      addEventListener: (t, f) => { listeners[t] = f; }, performance: { getEntriesByType: () => [], now: () => 0 }, PerformanceObserver: undefined,
    };
    // eslint-disable-next-line no-new-func
    const run = new Function(...Object.keys(ctx), `${src.replace('var webVitals=', 'window.webVitals=')}`);
    expect(() => run(...Object.values(ctx))).not.toThrow();
    expect(typeof fakeWindow.webVitals.onLCP).toBe('function');
    expect(typeof listeners.pagehide).toBe('function');
  });
});
