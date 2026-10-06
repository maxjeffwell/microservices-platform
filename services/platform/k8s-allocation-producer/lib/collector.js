import * as k8s from '@kubernetes/client-node';
import logger from '@platform/logger';
import { cpuToMillicores, memoryToBytes, countToInt } from './quantity.js';

/**
 * Builds allocation snapshots from the Kubernetes API.
 *
 * One pass lists pods, nodes, HPAs and the metrics API, then emits:
 *   - one "node" message per node: allocatable vs requested vs limits vs actual
 *     usage (cpu/mem), pod count, GPU slots (gpu.intel.com/i915) requested vs
 *     capacity
 *   - one "workload" message per owner (Deployment/StatefulSet/DaemonSet/...):
 *     replicas, requests/limits/usage summed over its running pods, nodes it is
 *     spread over
 *   - one "hpa" message per HorizontalPodAutoscaler: min/max/desired/current
 *     and the first metric's current/target values
 *
 * Usage comes from metrics.k8s.io (metrics-server); when it is unavailable the
 * usage fields are omitted rather than reported as 0.
 */

const GPU_RESOURCE = process.env.GPU_RESOURCE_NAME || 'gpu.intel.com/i915';
const SYSTEM_PODS = new Set(['Succeeded', 'Failed']);

export class AllocationCollector {
  constructor(kubeConfig) {
    this.core = kubeConfig.makeApiClient(k8s.CoreV1Api);
    this.apps = kubeConfig.makeApiClient(k8s.AppsV1Api);
    this.autoscaling = kubeConfig.makeApiClient(k8s.AutoscalingV2Api);
    this.metrics = new k8s.Metrics(kubeConfig);
  }

  async collect() {
    const ts = Date.now();
    const [pods, nodes, hpas, podMetrics, nodeMetrics, replicaSets] = await Promise.all([
      this.core.listPodForAllNamespaces(),
      this.core.listNode(),
      this.autoscaling.listHorizontalPodAutoscalerForAllNamespaces(),
      this.safeMetrics(() => this.metrics.getPodMetrics()),
      this.safeMetrics(() => this.metrics.getNodeMetrics()),
      this.apps.listReplicaSetForAllNamespaces(),
    ]);

    const usageByPod = indexPodUsage(podMetrics);
    const usageByNode = indexNodeUsage(nodeMetrics);
    const rsOwner = indexReplicaSetOwners(replicaSets);

    const nodeAgg = new Map();
    const workloadAgg = new Map();

    for (const n of nodes.items) {
      nodeAgg.set(n.metadata.name, {
        kind: 'node',
        ts,
        node: n.metadata.name,
        ready: isNodeReady(n),
        schedulable: !n.spec?.unschedulable,
        cpu_allocatable_m: cpuToMillicores(n.status?.allocatable?.cpu),
        mem_allocatable_b: memoryToBytes(n.status?.allocatable?.memory),
        pods_allocatable: countToInt(n.status?.allocatable?.pods),
        gpu_capacity: countToInt(n.status?.allocatable?.[GPU_RESOURCE]),
        cpu_requests_m: 0,
        cpu_limits_m: 0,
        mem_requests_b: 0,
        mem_limits_b: 0,
        gpu_requests: 0,
        pods: 0,
        ...(usageByNode.get(n.metadata.name) || {}),
      });
    }

    for (const p of pods.items) {
      const phase = p.status?.phase;
      if (SYSTEM_PODS.has(phase)) continue;
      const node = p.spec?.nodeName;
      const req = sumContainers(p, 'requests');
      const lim = sumContainers(p, 'limits');
      const usage = usageByPod.get(`${p.metadata.namespace}/${p.metadata.name}`);

      if (node && nodeAgg.has(node)) {
        const a = nodeAgg.get(node);
        a.cpu_requests_m += req.cpu;
        a.cpu_limits_m += lim.cpu;
        a.mem_requests_b += req.mem;
        a.mem_limits_b += lim.mem;
        a.gpu_requests += req.gpu;
        a.pods += 1;
      }

      const owner = resolveOwner(p, rsOwner);
      const key = `${p.metadata.namespace}/${owner.kind}/${owner.name}`;
      if (!workloadAgg.has(key)) {
        workloadAgg.set(key, {
          kind: 'workload',
          ts,
          namespace: p.metadata.namespace,
          owner_kind: owner.kind,
          name: owner.name,
          pods: 0,
          pods_running: 0,
          pods_pending: 0,
          cpu_requests_m: 0,
          cpu_limits_m: 0,
          mem_requests_b: 0,
          mem_limits_b: 0,
          gpu_requests: 0,
          cpu_usage_m: 0,
          mem_usage_b: 0,
          usage_samples: 0,
          nodes: new Set(),
        });
      }
      const w = workloadAgg.get(key);
      w.pods += 1;
      if (phase === 'Running') w.pods_running += 1;
      if (phase === 'Pending') w.pods_pending += 1;
      w.cpu_requests_m += req.cpu;
      w.cpu_limits_m += lim.cpu;
      w.mem_requests_b += req.mem;
      w.mem_limits_b += lim.mem;
      w.gpu_requests += req.gpu;
      if (node) w.nodes.add(node);
      if (usage) {
        w.cpu_usage_m += usage.cpu;
        w.mem_usage_b += usage.mem;
        w.usage_samples += 1;
      }
    }

    const nodeMessages = [...nodeAgg.values()];
    const workloadMessages = [...workloadAgg.values()].map((w) => {
      const { nodes: nodeSet, usage_samples, ...rest } = w;
      const msg = { ...rest, node_count: nodeSet.size, nodes: [...nodeSet].sort().join(',') };
      if (usage_samples === 0) {
        delete msg.cpu_usage_m;
        delete msg.mem_usage_b;
      }
      return msg;
    });

    const hpaMessages = hpas.items.map((h) => {
      const m = h.spec?.metrics?.[0];
      const cur = h.status?.currentMetrics?.[0];
      return {
        kind: 'hpa',
        ts,
        namespace: h.metadata.namespace,
        name: h.metadata.name,
        target_kind: h.spec?.scaleTargetRef?.kind,
        target_name: h.spec?.scaleTargetRef?.name,
        min_replicas: h.spec?.minReplicas ?? 1,
        max_replicas: h.spec?.maxReplicas ?? 0,
        desired_replicas: h.status?.desiredReplicas ?? 0,
        current_replicas: h.status?.currentReplicas ?? 0,
        metric_name: metricName(m),
        metric_target: metricTarget(m),
        metric_current: metricCurrent(cur),
        able_to_scale: conditionTrue(h, 'AbleToScale'),
        scaling_limited: conditionTrue(h, 'ScalingLimited'),
        last_scale_ts: h.status?.lastScaleTime ? Date.parse(h.status.lastScaleTime) : null,
      };
    });

    return { nodeMessages, workloadMessages, hpaMessages };
  }

  async safeMetrics(fn) {
    try {
      return await fn();
    } catch (error) {
      logger.warn('metrics.k8s.io unavailable this pass; usage fields omitted', { error: error.message });
      return null;
    }
  }
}

function sumContainers(pod, field) {
  let cpu = 0;
  let mem = 0;
  let gpu = 0;
  for (const c of pod.spec?.containers || []) {
    const r = c.resources?.[field] || {};
    cpu += cpuToMillicores(r.cpu);
    mem += memoryToBytes(r.memory);
    gpu += countToInt(r[GPU_RESOURCE]);
  }
  return { cpu, mem, gpu };
}

function indexPodUsage(list) {
  const map = new Map();
  for (const pm of list?.items || []) {
    let cpu = 0;
    let mem = 0;
    for (const c of pm.containers || []) {
      cpu += cpuToMillicores(c.usage?.cpu);
      mem += memoryToBytes(c.usage?.memory);
    }
    map.set(`${pm.metadata.namespace}/${pm.metadata.name}`, { cpu, mem });
  }
  return map;
}

function indexNodeUsage(list) {
  const map = new Map();
  for (const nm of list?.items || []) {
    map.set(nm.metadata.name, {
      cpu_usage_m: cpuToMillicores(nm.usage?.cpu),
      mem_usage_b: memoryToBytes(nm.usage?.memory),
    });
  }
  return map;
}

function indexReplicaSetOwners(list) {
  const map = new Map();
  for (const rs of list?.items || []) {
    const o = rs.metadata?.ownerReferences?.[0];
    if (o) map.set(`${rs.metadata.namespace}/${rs.metadata.name}`, { kind: o.kind, name: o.name });
  }
  return map;
}

/** Deployment for ReplicaSet-owned pods, otherwise the direct owner, otherwise the pod itself. */
function resolveOwner(pod, rsOwner) {
  const o = pod.metadata.ownerReferences?.[0];
  if (!o) return { kind: 'Pod', name: pod.metadata.name };
  if (o.kind === 'ReplicaSet') {
    return rsOwner.get(`${pod.metadata.namespace}/${o.name}`) || { kind: 'ReplicaSet', name: o.name };
  }
  return { kind: o.kind, name: o.name };
}

function isNodeReady(node) {
  return (node.status?.conditions || []).some((c) => c.type === 'Ready' && c.status === 'True');
}

function conditionTrue(hpa, type) {
  return (hpa.status?.conditions || []).some((c) => c.type === type && c.status === 'True');
}

function metricName(m) {
  if (!m) return '';
  if (m.type === 'Resource') return `resource/${m.resource?.name}`;
  if (m.type === 'Pods') return `pods/${m.pods?.metric?.name}`;
  if (m.type === 'Object') return `object/${m.object?.metric?.name}`;
  if (m.type === 'External') return `external/${m.external?.metric?.name}`;
  return m.type || '';
}

function metricTarget(m) {
  const t = m?.resource?.target || m?.pods?.target || m?.object?.target || m?.external?.target;
  if (!t) return null;
  if (t.averageUtilization !== undefined) return t.averageUtilization;
  if (t.averageValue !== undefined) return cpuToMillicores(t.averageValue);
  if (t.value !== undefined) return cpuToMillicores(t.value);
  return null;
}

function metricCurrent(c) {
  const cur = c?.resource?.current || c?.pods?.current || c?.object?.current || c?.external?.current;
  if (!cur) return null;
  if (cur.averageUtilization !== undefined) return cur.averageUtilization;
  if (cur.averageValue !== undefined) return cpuToMillicores(cur.averageValue);
  if (cur.value !== undefined) return cpuToMillicores(cur.value);
  return null;
}
