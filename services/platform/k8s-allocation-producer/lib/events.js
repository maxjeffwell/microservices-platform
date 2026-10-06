import * as k8s from '@kubernetes/client-node';
import logger from '@platform/logger';

/**
 * Streams the Kubernetes events that describe allocation DECISIONS — where the
 * scheduler put a pod, why it could not, evictions, preemption, HPA rescales,
 * node readiness — and hands each one to `publish(event)`.
 *
 * Uses a watch on /api/v1/events (all namespaces) with automatic reconnect.
 * Only ADDED/MODIFIED events whose reason is in REASONS are forwarded; a
 * MODIFIED event is a repeat (count increments), forwarded with its new count.
 */

const REASONS = new Set(
  (
    process.env.ALLOCATION_EVENT_REASONS ||
    [
      'Scheduled',
      'FailedScheduling',
      'Preempted',
      'Evicted',
      'TaintManagerEviction',
      'SuccessfulRescale',
      'FailedGetResourceMetric',
      'NodeNotReady',
      'NodeReady',
      'NodeNotSchedulable',
      'NodeSchedulable',
      'OOMKilling',
      'Rebooted',
    ].join(',')
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

// descheduler evictions arrive as reason=Evicted with this reporting component
const DESCHEDULER = 'sigs.k8s.io.descheduler';

export class AllocationEventWatcher {
  constructor(kubeConfig, publish) {
    this.watch = new k8s.Watch(kubeConfig);
    this.publish = publish;
    this.controller = null;
    this.stopped = false;
    this.startedAt = Date.now();
  }

  async start() {
    this.stopped = false;
    await this.connect();
  }

  async connect() {
    if (this.stopped) return;
    try {
      this.controller = await this.watch.watch(
        '/api/v1/events',
        { allowWatchBookmarks: true },
        (type, obj) => this.onEvent(type, obj),
        (err) => {
          if (this.stopped) return;
          logger.warn('event watch ended, reconnecting in 5s', { error: err ? err.message : 'closed' });
          setTimeout(() => this.connect(), 5000);
        }
      );
      logger.info('event watch connected', { reasons: [...REASONS] });
    } catch (error) {
      logger.error('event watch failed to connect, retrying in 10s', { error: error.message });
      setTimeout(() => this.connect(), 10000);
    }
  }

  onEvent(type, obj) {
    if (type !== 'ADDED' && type !== 'MODIFIED') return;
    const reason = obj.reason || '';
    if (!REASONS.has(reason)) return;
    // the initial list replays old events; skip ones that happened before we started
    const when = Date.parse(obj.lastTimestamp || obj.eventTime || obj.metadata?.creationTimestamp || 0);
    if (when && when < this.startedAt - 60000) return;

    const involved = obj.involvedObject || {};
    const message = obj.message || '';
    const msg = {
      ts: when || Date.now(),
      reason,
      type: obj.type || 'Normal',
      namespace: involved.namespace || obj.metadata?.namespace || '',
      object_kind: involved.kind || '',
      object_name: involved.name || '',
      node: involved.kind === 'Node' ? involved.name : extractNode(message, obj),
      source: obj.reportingComponent || obj.source?.component || '',
      descheduler: obj.reportingComponent === DESCHEDULER || message.includes('descheduler'),
      count: obj.count || 1,
      message: message.slice(0, 500),
    };
    this.publish(msg).catch((error) => logger.error('failed to publish event', { error: error.message, reason }));
  }

  stop() {
    this.stopped = true;
    if (this.controller) this.controller.abort();
  }
}

/** "Successfully assigned default/foo to m920s" -> m920s; falls back to source.host */
function extractNode(message, obj) {
  const m = message.match(/ to ([a-z0-9][a-z0-9.-]*)$/);
  if (m) return m[1];
  return obj.source?.host || '';
}
