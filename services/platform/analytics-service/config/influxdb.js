import { InfluxDB } from '@influxdata/influxdb-client';
import logger from '@platform/logger';

let influxDB = null;
let writeApi = null;
let queryApi = null;

/**
 * Initialize InfluxDB connection
 */
export function initInfluxDB() {
  try {
    const url = process.env.INFLUXDB_URL;
    const token = process.env.INFLUXDB_TOKEN;
    const org = process.env.INFLUXDB_ORG;
    const bucket = process.env.INFLUXDB_BUCKET;

    if (!url || !token || !org || !bucket) {
      throw new Error('Missing required InfluxDB environment variables');
    }

    influxDB = new InfluxDB({ url, token });

    // Get write API for inserting data
    writeApi = influxDB.getWriteApi(org, bucket, 'ms');

    // Configure write options
    writeApi.useDefaultTags({ service: 'analytics-service' });

    // Get query API for reading data
    queryApi = influxDB.getQueryApi(org);

    logger.info('InfluxDB connection initialized', {
      url,
      org,
      bucket,
    });

    return { writeApi, queryApi };
  } catch (error) {
    logger.error('Failed to initialize InfluxDB', { error: error.message });
    throw error;
  }
}

/**
 * Get write API instance
 */
export function getWriteApi() {
  if (!writeApi) {
    throw new Error('InfluxDB write API not initialized. Call initInfluxDB() first.');
  }
  return writeApi;
}

/**
 * Batched write APIs for the Kafka-fed buckets (k8s-allocation, web-perf).
 * Unlike the events path (flush per message), these buffer and flush every
 * 5 s or 2000 points. One instance per bucket, created on first use.
 */
const bucketWriteApis = new Map();
export function getBucketWriteApi(bucket) {
  if (!influxDB) {
    throw new Error('InfluxDB not initialized. Call initInfluxDB() first.');
  }
  if (!bucketWriteApis.has(bucket)) {
    const org = process.env.INFLUXDB_ORG;
    bucketWriteApis.set(
      bucket,
      influxDB.getWriteApi(org, bucket, 'ms', {
        batchSize: 2000,
        flushInterval: 5000,
        maxRetries: 5,
        maxBufferLines: 50000,
      })
    );
    logger.info('InfluxDB batched write API ready', { org, bucket });
  }
  return bucketWriteApis.get(bucket);
}

export function getAllocationWriteApi() {
  return getBucketWriteApi(process.env.ALLOCATION_INFLUXDB_BUCKET || 'k8s-allocation');
}

export function getWebPerfWriteApi() {
  return getBucketWriteApi(process.env.WEBPERF_INFLUXDB_BUCKET || 'web-perf');
}

/**
 * Get query API instance
 */
export function getQueryApi() {
  if (!queryApi) {
    throw new Error('InfluxDB query API not initialized. Call initInfluxDB() first.');
  }
  return queryApi;
}

/**
 * Flush any pending writes and close connection
 */
export async function closeInfluxDB() {
  try {
    if (writeApi) {
      await writeApi.close();
      logger.info('InfluxDB write API closed');
    }
    for (const [bucket, api] of bucketWriteApis) {
      await api.close();
      logger.info('InfluxDB batched write API closed', { bucket });
    }
    bucketWriteApis.clear();
  } catch (error) {
    logger.error('Error closing InfluxDB connection', { error: error.message });
    throw error;
  }
}

export default {
  initInfluxDB,
  getWriteApi,
  getBucketWriteApi,
  getAllocationWriteApi,
  getWebPerfWriteApi,
  getQueryApi,
  closeInfluxDB,
};
