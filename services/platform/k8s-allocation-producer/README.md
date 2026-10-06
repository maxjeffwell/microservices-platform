# k8s-allocation-producer

Publishes how the cluster's resources are allocated — and how that allocation
changes — to Kafka, for `analytics-service` to store in InfluxDB (bucket
`k8s-allocation`).

| topic | cadence | content |
|---|---|---|
| `k8s.allocation` | every 30 s | `kind=node`: allocatable / requests / limits / usage (cpu millicores, memory bytes), pod count, GPU slots. `kind=workload`: the same summed per Deployment/StatefulSet/DaemonSet/Job/…, replicas, node spread. `kind=hpa`: min/max/desired/current, metric target vs current. |
| `k8s.allocation.events` | as they happen | Scheduled / FailedScheduling / Preempted / Evicted (incl. descheduler) / TaintManagerEviction / SuccessfulRescale / Node(Not)Ready / OOMKilling, with node, object and message. |

Read-only: the ServiceAccount's ClusterRole grants `get/list/watch` on pods,
nodes, events, replicasets, HPAs and `metrics.k8s.io`.

`/health` on :3006 returns 503 after three consecutive failed snapshots.
