import 'dotenv/config';
import http from 'http';
import * as k8s from '@kubernetes/client-node';
import logger from '@platform/logger';
import { initProducer, sendJson, closeKafka } from './config/kafka.js';
import { AllocationCollector } from './lib/collector.js';
import { AllocationEventWatcher } from './lib/events.js';

/**
 * k8s-allocation-producer
 *
 * Every SNAPSHOT_INTERVAL_MS it publishes node / workload / HPA allocation
 * snapshots to KAFKA_ALLOCATION_TOPIC, and it streams scheduling, eviction,
 * HPA and node-readiness events to KAFKA_ALLOCATION_EVENTS_TOPIC as they
 * happen. analytics-service consumes both into the InfluxDB `k8s-allocation`
 * bucket. Runs with a read-only ClusterRole (see k8s/services/k8s-allocation-producer.yaml).
 */

const PORT = parseInt(process.env.PORT, 10) || 3006;
const INTERVAL = parseInt(process.env.SNAPSHOT_INTERVAL_MS, 10) || 30000;
const SNAPSHOT_TOPIC = process.env.KAFKA_ALLOCATION_TOPIC || 'k8s.allocation';
const EVENTS_TOPIC = process.env.KAFKA_ALLOCATION_EVENTS_TOPIC || 'k8s.allocation.events';

const state = {
  lastSnapshotAt: null,
  lastSnapshotMs: null,
  lastError: null,
  snapshots: 0,
  eventsPublished: 0,
  consecutiveFailures: 0,
};

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const collector = new AllocationCollector(kc);
let timer = null;
let watcher = null;

async function snapshot() {
  const started = Date.now();
  try {
    const { nodeMessages, workloadMessages, hpaMessages } = await collector.collect();
    await sendJson(SNAPSHOT_TOPIC, [
      ...nodeMessages.map((m) => ({ key: `node/${m.node}`, value: m })),
      ...workloadMessages.map((m) => ({ key: `workload/${m.namespace}/${m.owner_kind}/${m.name}`, value: m })),
      ...hpaMessages.map((m) => ({ key: `hpa/${m.namespace}/${m.name}`, value: m })),
    ]);
    state.lastSnapshotAt = new Date().toISOString();
    state.lastSnapshotMs = Date.now() - started;
    state.lastError = null;
    state.snapshots += 1;
    state.consecutiveFailures = 0;
    logger.debug('snapshot published', {
      nodes: nodeMessages.length,
      workloads: workloadMessages.length,
      hpas: hpaMessages.length,
      ms: state.lastSnapshotMs,
    });
  } catch (error) {
    state.lastError = error.message;
    state.consecutiveFailures += 1;
    logger.error('snapshot failed', { error: error.message, consecutiveFailures: state.consecutiveFailures });
  }
}

async function publishEvent(event) {
  await sendJson(EVENTS_TOPIC, [{ key: `${event.namespace}/${event.object_kind}/${event.object_name}`, value: event }]);
  state.eventsPublished += 1;
}

// /health is "ok" while snapshots keep succeeding; 3 consecutive failures
// (API or Kafka down for ~90 s) flips it so the pod gets restarted.
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    const healthy = state.consecutiveFailures < 3;
    res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: healthy ? 'ok' : 'degraded', service: 'k8s-allocation-producer', ...state }));
    return;
  }
  res.writeHead(404);
  res.end();
});

async function start() {
  await initProducer();
  watcher = new AllocationEventWatcher(kc, publishEvent);
  await watcher.start();
  await snapshot();
  timer = setInterval(snapshot, INTERVAL);
  server.listen(PORT, () => logger.info('k8s-allocation-producer running', { port: PORT, intervalMs: INTERVAL, SNAPSHOT_TOPIC, EVENTS_TOPIC }));
}

async function shutdown() {
  logger.info('shutting down');
  if (timer) clearInterval(timer);
  if (watcher) watcher.stop();
  server.close();
  try {
    await closeKafka();
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch((error) => {
  logger.error('failed to start', { error: error.message });
  process.exit(1);
});
