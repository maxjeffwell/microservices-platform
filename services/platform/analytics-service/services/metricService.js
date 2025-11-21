import { getWriteApi, getQueryApi } from '../config/influxdb.js';
import Metric from '../models/Metric.js';
import logger from '@platform/logger';

/**
 * Record a single metric
 */
export async function recordMetric(metricData) {
  try {
    const metric = Metric.fromObject(metricData);

    // Validate metric
    const validation = metric.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid metric data: ${validation.errors.join(', ')}`);
    }

    // Write to InfluxDB
    const writeApi = getWriteApi();
    const point = metric.toInfluxPoint();
    writeApi.writePoint(point);
    await writeApi.flush();

    logger.debug('Metric recorded', {
      metricName: metric.metricName,
      value: metric.value,
    });

    return {
      success: true,
      metric: {
        appId: metric.appId,
        metricName: metric.metricName,
        metricType: metric.metricType,
        value: metric.value,
        timestamp: metric.timestamp,
      },
    };
  } catch (error) {
    logger.error('Failed to record metric', {
      error: error.message,
      metricData,
    });
    throw error;
  }
}

/**
 * Record multiple metrics in batch
 */
export async function recordMetricsBatch(metricsData) {
  try {
    const metrics = Metric.fromArray(metricsData);

    // Validate all metrics
    const validationErrors = [];
    metrics.forEach((metric, index) => {
      const validation = metric.validate();
      if (!validation.isValid) {
        validationErrors.push({
          index,
          errors: validation.errors,
        });
      }
    });

    if (validationErrors.length > 0) {
      throw new Error(`Invalid metrics: ${JSON.stringify(validationErrors)}`);
    }

    // Write all metrics to InfluxDB
    const writeApi = getWriteApi();
    metrics.forEach((metric) => {
      const point = metric.toInfluxPoint();
      writeApi.writePoint(point);
    });

    await writeApi.flush();

    logger.info('Batch metrics recorded', { count: metrics.length });

    return {
      success: true,
      count: metrics.length,
    };
  } catch (error) {
    logger.error('Failed to record batch metrics', {
      error: error.message,
      count: metricsData.length,
    });
    throw error;
  }
}

/**
 * Query metrics with filters and aggregations
 */
export async function queryMetrics(filters = {}) {
  try {
    const queryApi = getQueryApi();
    const bucket = process.env.INFLUXDB_BUCKET;

    const {
      appId,
      metricName,
      metricType,
      startTime,
      endTime,
      aggregation = null,
      window = null,
      limit = 1000,
    } = filters;

    // Build Flux query
    let fluxQuery = `
      from(bucket: "${bucket}")
        |> range(start: ${startTime || '-30d'}, stop: ${endTime || 'now()'})
        |> filter(fn: (r) => r["_measurement"] == "metrics")
    `;

    if (appId) {
      fluxQuery += `\n  |> filter(fn: (r) => r["appId"] == "${appId}")`;
    }

    if (metricName) {
      fluxQuery += `\n  |> filter(fn: (r) => r["metricName"] == "${metricName}")`;
    }

    if (metricType) {
      fluxQuery += `\n  |> filter(fn: (r) => r["metricType"] == "${metricType}")`;
    }

    // Apply aggregation if specified
    if (aggregation && window) {
      const aggregationFn = aggregation.toLowerCase();
      if (['mean', 'sum', 'count', 'min', 'max', 'median'].includes(aggregationFn)) {
        fluxQuery += `\n  |> aggregateWindow(every: ${window}, fn: ${aggregationFn})`;
      }
    }

    fluxQuery += `\n  |> limit(n: ${limit})`;
    fluxQuery += `\n  |> sort(columns: ["_time"], desc: true)`;

    const metrics = [];

    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const row = tableMeta.toObject(values);
      metrics.push({
        timestamp: row._time,
        appId: row.appId,
        metricName: row.metricName,
        metricType: row.metricType,
        value: row._value,
        unit: row.unit,
      });
    }

    logger.debug('Metrics queried', {
      count: metrics.length,
      filters,
    });

    return metrics;
  } catch (error) {
    logger.error('Failed to query metrics', {
      error: error.message,
      filters,
    });
    throw error;
  }
}

/**
 * Get dashboard data for an application
 */
export async function getAppDashboard(appId, options = {}) {
  try {
    const { startTime = '-24h', endTime = 'now()' } = options;

    // Query common dashboard metrics
    const [totalEvents, activeUsers, topEvents, recentMetrics] = await Promise.all([
      // Total events count
      queryMetrics({
        appId,
        metricType: 'event_count',
        startTime,
        endTime,
        aggregation: 'sum',
        window: '1d',
        limit: 1,
      }),

      // Active users count
      queryMetrics({
        appId,
        metricType: 'active_users',
        startTime,
        endTime,
        limit: 1,
      }),

      // Top events
      queryMetrics({
        appId,
        metricType: 'event_count',
        startTime,
        endTime,
        limit: 10,
      }),

      // Recent metrics
      queryMetrics({
        appId,
        startTime,
        endTime,
        limit: 100,
      }),
    ]);

    const dashboard = {
      appId,
      timeRange: {
        start: startTime,
        end: endTime,
      },
      summary: {
        totalEvents: totalEvents[0]?.value || 0,
        activeUsers: activeUsers[0]?.value || 0,
      },
      topEvents: topEvents.map((m) => ({
        name: m.metricName,
        count: m.value,
      })),
      recentMetrics,
    };

    logger.debug('Dashboard data retrieved', { appId });

    return dashboard;
  } catch (error) {
    logger.error('Failed to get app dashboard', {
      error: error.message,
      appId,
    });
    throw error;
  }
}

export default {
  recordMetric,
  recordMetricsBatch,
  queryMetrics,
  getAppDashboard,
};
