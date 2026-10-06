/**
 * Kubernetes resource quantity parsing.
 *
 * CPU is returned in millicores, memory in bytes, so every number that reaches
 * Kafka/InfluxDB is a plain integer in one unit (no "500m" vs "0.5" vs "1500000000n").
 */

const BINARY = { Ki: 2 ** 10, Mi: 2 ** 20, Gi: 2 ** 30, Ti: 2 ** 40, Pi: 2 ** 50 };
const DECIMAL = { n: 1e-9, u: 1e-6, m: 1e-3, k: 1e3, M: 1e6, G: 1e9, T: 1e12, P: 1e15 };

/** "250m" -> 250, "1" -> 1000, "0.5" -> 500, "1234567n" -> 1 (rounded), "" -> 0 */
export function cpuToMillicores(q) {
  if (q === undefined || q === null || q === '') return 0;
  const s = String(q).trim();
  const m = s.match(/^([0-9.]+)([a-zA-Z]*)$/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const unit = m[2];
  if (unit === '') return Math.round(n * 1000);
  if (unit === 'm') return Math.round(n);
  if (DECIMAL[unit] !== undefined) return Math.round(n * DECIMAL[unit] * 1000);
  return 0;
}

/** "128Mi" -> 134217728, "1Gi" -> 1073741824, "500M" -> 500000000, "1024" -> 1024 */
export function memoryToBytes(q) {
  if (q === undefined || q === null || q === '') return 0;
  const s = String(q).trim();
  const m = s.match(/^([0-9.]+)([a-zA-Z]*)$/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const unit = m[2];
  if (unit === '') return Math.round(n);
  if (BINARY[unit] !== undefined) return Math.round(n * BINARY[unit]);
  if (DECIMAL[unit] !== undefined) return Math.round(n * DECIMAL[unit]);
  return 0;
}

/** Plain integer resources such as pods or gpu.intel.com/i915 ("4" -> 4). */
export function countToInt(q) {
  if (q === undefined || q === null || q === '') return 0;
  const n = parseInt(String(q), 10);
  return Number.isFinite(n) ? n : 0;
}
