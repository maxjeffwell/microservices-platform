import { Point } from '@influxdata/influxdb-client';

/**
 * Converts k8s-allocation-producer messages into InfluxDB points.
 *
 * Topic k8s.allocation carries snapshots (kind = node | workload | hpa);
 * topic k8s.allocation.events carries scheduling/eviction/scaling events.
 *
 * Tags are the stable identities (node, namespace, workload, reason) so series
 * cardinality stays bounded; anything that churns (pod names, messages, the
 * list of nodes a workload is spread over) is stored as a field.
 */

const NODE_INT_FIELDS = [
  'cpu_allocatable_m',
  'mem_allocatable_b',
  'pods_allocatable',
  'gpu_capacity',
  'cpu_requests_m',
  'cpu_limits_m',
  'mem_requests_b',
  'mem_limits_b',
  'gpu_requests',
  'pods',
  'cpu_usage_m',
  'mem_usage_b',
];

const WORKLOAD_INT_FIELDS = [
  'pods',
  'pods_running',
  'pods_pending',
  'cpu_requests_m',
  'cpu_limits_m',
  'mem_requests_b',
  'mem_limits_b',
  'gpu_requests',
  'cpu_usage_m',
  'mem_usage_b',
  'node_count',
];

const HPA_INT_FIELDS = ['min_replicas', 'max_replicas', 'desired_replicas', 'current_replicas'];

function ints(point, msg, names) {
  for (const n of names) {
    if (Number.isFinite(msg[n])) point.intField(n, Math.round(msg[n]));
  }
  return point;
}

function tag(point, name, value) {
  if (value !== undefined && value !== null && value !== '') point.tag(name, String(value));
  return point;
}

function at(msg) {
  return new Date(Number.isFinite(msg.ts) ? msg.ts : Date.now());
}

/**
 * @param {string} topic Kafka topic the message came from
 * @param {object} msg parsed JSON message
 * @returns {Point|null} null when the message is not something we store
 */
export function allocationToPoint(topic, msg, eventsTopic = 'k8s.allocation.events') {
  if (!msg || typeof msg !== 'object') return null;

  if (topic === eventsTopic) {
    if (!msg.reason) return null;
    const p = new Point('k8s_allocation_event');
    tag(p, 'reason', msg.reason);
    tag(p, 'type', msg.type);
    tag(p, 'namespace', msg.namespace);
    tag(p, 'object_kind', msg.object_kind);
    tag(p, 'node', msg.node);
    tag(p, 'source', msg.source);
    p.tag('descheduler', msg.descheduler ? 'true' : 'false');
    p.stringField('object_name', msg.object_name || '');
    p.stringField('message', msg.message || '');
    p.intField('count', Number.isFinite(msg.count) ? msg.count : 1);
    return p.timestamp(at(msg));
  }

  switch (msg.kind) {
    case 'node': {
      if (!msg.node) return null;
      const p = new Point('k8s_node_allocation');
      tag(p, 'node', msg.node);
      ints(p, msg, NODE_INT_FIELDS);
      p.booleanField('ready', !!msg.ready);
      p.booleanField('schedulable', !!msg.schedulable);
      return p.timestamp(at(msg));
    }
    case 'workload': {
      if (!msg.namespace || !msg.name) return null;
      const p = new Point('k8s_workload_allocation');
      tag(p, 'namespace', msg.namespace);
      tag(p, 'owner_kind', msg.owner_kind);
      tag(p, 'workload', msg.name);
      ints(p, msg, WORKLOAD_INT_FIELDS);
      p.stringField('nodes', msg.nodes || '');
      return p.timestamp(at(msg));
    }
    case 'hpa': {
      if (!msg.namespace || !msg.name) return null;
      const p = new Point('k8s_hpa');
      tag(p, 'namespace', msg.namespace);
      tag(p, 'hpa', msg.name);
      tag(p, 'target_kind', msg.target_kind);
      tag(p, 'target', msg.target_name);
      tag(p, 'metric', msg.metric_name);
      ints(p, msg, HPA_INT_FIELDS);
      if (Number.isFinite(msg.metric_target)) p.floatField('metric_target', msg.metric_target);
      if (Number.isFinite(msg.metric_current)) p.floatField('metric_current', msg.metric_current);
      p.booleanField('able_to_scale', !!msg.able_to_scale);
      p.booleanField('scaling_limited', !!msg.scaling_limited);
      if (Number.isFinite(msg.last_scale_ts)) p.intField('last_scale_ts', msg.last_scale_ts);
      return p.timestamp(at(msg));
    }
    default:
      return null;
  }
}
