import { allocationToPoint } from '../models/Allocation.js';

const ts = 1791323570230;

describe('allocationToPoint', () => {
  it('maps a node snapshot to k8s_node_allocation with integer fields', () => {
    const line = allocationToPoint('k8s.allocation', {
      kind: 'node', ts, node: 'm920s', ready: true, schedulable: true,
      cpu_allocatable_m: 12000, cpu_requests_m: 6265, mem_usage_b: 14429024256, gpu_capacity: 4,
    }).toLineProtocol();
    expect(line).toMatch(/^k8s_node_allocation,node=m920s /);
    expect(line).toContain('cpu_requests_m=6265i');
    expect(line).toContain('mem_usage_b=14429024256i');
    expect(line).toContain('ready=T');
    expect(line).toMatch(/ 1791323570230000000$/); // ns when rendered without a write API
  });

  it('keeps churny values out of tags for workloads', () => {
    const line = allocationToPoint('k8s.allocation', {
      kind: 'workload', ts, namespace: 'jellyfin', owner_kind: 'Deployment', name: 'jellyfin',
      pods: 1, gpu_requests: 1, nodes: 'neonmarmoset', node_count: 1,
    }).toLineProtocol();
    expect(line).toMatch(/^k8s_workload_allocation,namespace=jellyfin,owner_kind=Deployment,workload=jellyfin /);
    expect(line).toContain('nodes="neonmarmoset"');
  });

  it('omits usage fields that the producer left out', () => {
    const line = allocationToPoint('k8s.allocation', {
      kind: 'workload', ts, namespace: 'x', owner_kind: 'Job', name: 'y', pods: 1,
    }).toLineProtocol();
    expect(line).not.toContain('cpu_usage_m');
  });

  it('maps HPA snapshots including the metric ratio', () => {
    const line = allocationToPoint('k8s.allocation', {
      kind: 'hpa', ts, namespace: 'default', name: 'bookmarked-server', target_kind: 'Deployment',
      target_name: 'bookmarked-server', metric_name: 'resource/cpu', min_replicas: 2, max_replicas: 2,
      desired_replicas: 2, current_replicas: 2, metric_target: 80, metric_current: 5, scaling_limited: true,
    }).toLineProtocol();
    expect(line).toContain('metric=resource/cpu');
    expect(line).toContain('metric_current=5');
    expect(line).toContain('scaling_limited=T');
  });

  it('maps events from the events topic, pod name as a field', () => {
    const line = allocationToPoint('k8s.allocation.events', {
      ts, reason: 'Scheduled', type: 'Normal', namespace: 'default', object_kind: 'Pod',
      object_name: 'foo-abc', node: 'm920s', source: 'default-scheduler', count: 1,
      message: 'Successfully assigned default/foo-abc to m920s',
    }).toLineProtocol();
    expect(line).toMatch(/^k8s_allocation_event,descheduler=false,namespace=default,node=m920s,object_kind=Pod,reason=Scheduled/);
    expect(line).toContain('object_name="foo-abc"');
  });

  it('drops unknown or malformed messages', () => {
    expect(allocationToPoint('k8s.allocation', { kind: 'nope' })).toBeNull();
    expect(allocationToPoint('k8s.allocation', { kind: 'node' })).toBeNull();
    expect(allocationToPoint('k8s.allocation.events', { ts })).toBeNull();
    expect(allocationToPoint('k8s.allocation', null)).toBeNull();
  });
});
