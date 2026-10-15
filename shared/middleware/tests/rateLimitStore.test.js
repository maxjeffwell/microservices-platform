import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimitStore } from '../rateLimitStore.js';

function fakeClient() {
  const calls = [];
  return {
    calls,
    async call(...args) {
      calls.push(args);
      if (args[0] === 'SCRIPT') return 'deadbeef';
      if (args[0] === 'EVALSHA' || args[0] === 'EVAL') return [1, 60000];
      return null;
    },
  };
}

test('no REDIS_URL -> undefined (express-rate-limit falls back to its MemoryStore)', () => {
  assert.equal(createRateLimitStore('auth', { url: undefined }), undefined);
  assert.equal(createRateLimitStore('auth', { url: '' }), undefined);
});

test('with a client: keys are namespaced per limiter name', async () => {
  const client = fakeClient();
  const store = createRateLimitStore('auth-signup', { url: 'redis://x', client });
  store.init({ windowMs: 60_000 });
  const res = await store.increment('203.0.113.9');
  assert.equal(res.totalHits, 1);
  const evalCall = client.calls.find((c) => c[0] === 'EVALSHA' || c[0] === 'EVAL');
  assert.ok(evalCall, 'increment went through the Redis client');
  assert.ok(evalCall.includes('rl:auth-signup:203.0.113.9'), `key prefixed: ${evalCall.join(' ')}`);
});

test('two limiters with different names never share a counter key', async () => {
  const client = fakeClient();
  const a = createRateLimitStore('analytics', { url: 'redis://x', client });
  const b = createRateLimitStore('analytics-rum', { url: 'redis://x', client });
  a.init({ windowMs: 1000 });
  b.init({ windowMs: 1000 });
  await a.increment('ip');
  await b.increment('ip');
  const keys = client.calls.filter((c) => c[0] === 'EVALSHA' || c[0] === 'EVAL').map((c) => c.find((x) => typeof x === 'string' && x.startsWith('rl:')));
  assert.deepEqual(keys, ['rl:analytics:ip', 'rl:analytics-rum:ip']);
});

test('a name is required', () => {
  assert.throws(() => createRateLimitStore('', { url: 'redis://x', client: fakeClient() }), /name/);
});

test('Redis unreachable at construction: no unhandled rejection, increment rejects (fail-open upstream)', async () => {
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    const deadClient = { async call() { throw new Error("Stream isn't writeable"); } };
    const store = createRateLimitStore('auth', { url: 'redis://dead', client: deadClient });
    store.init({ windowMs: 1000 });
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(unhandled, []);
    await assert.rejects(() => store.increment('ip'), /writeable/);
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});
