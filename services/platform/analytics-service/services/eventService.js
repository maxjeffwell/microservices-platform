import { getWriteApi, getQueryApi } from '../config/influxdb.js';
import { sendEvent as sendToKafka } from '../config/kafka.js';
import Event from '../models/Event.js';
import logger from '@platform/logger';

/**
 * Track a single event
 */
export async function trackEvent(eventData, async = false) {
  try {
    const event = Event.fromObject(eventData);

    // Validate event
    const validation = event.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid event data: ${validation.errors.join(', ')}`);
    }

    if (async) {
      // Send to Kafka for async processing
      const topic = process.env.KAFKA_EVENTS_TOPIC || 'analytics.events';
      await sendToKafka(topic, eventData);
      logger.debug('Event sent to Kafka for async processing', {
        eventName: event.eventName,
        userId: event.userId,
      });
    } else {
      // Write directly to InfluxDB
      const writeApi = getWriteApi();
      const point = event.toInfluxPoint();
      writeApi.writePoint(point);
      await writeApi.flush();

      logger.debug('Event tracked to InfluxDB', {
        eventName: event.eventName,
        userId: event.userId,
      });
    }

    return {
      success: true,
      event: {
        appId: event.appId,
        userId: event.userId,
        eventType: event.eventType,
        eventName: event.eventName,
        timestamp: event.timestamp,
      },
    };
  } catch (error) {
    logger.error('Failed to track event', {
      error: error.message,
      eventData,
    });
    throw error;
  }
}

/**
 * Track multiple events in batch
 */
export async function trackEventsBatch(eventsData) {
  try {
    const events = Event.fromArray(eventsData);

    // Validate all events
    const validationErrors = [];
    events.forEach((event, index) => {
      const validation = event.validate();
      if (!validation.isValid) {
        validationErrors.push({
          index,
          errors: validation.errors,
        });
      }
    });

    if (validationErrors.length > 0) {
      throw new Error(`Invalid events: ${JSON.stringify(validationErrors)}`);
    }

    // Write all events to InfluxDB
    const writeApi = getWriteApi();
    events.forEach((event) => {
      const point = event.toInfluxPoint();
      writeApi.writePoint(point);
    });

    await writeApi.flush();

    logger.info('Batch events tracked', { count: events.length });

    return {
      success: true,
      count: events.length,
    };
  } catch (error) {
    logger.error('Failed to track batch events', {
      error: error.message,
      count: eventsData.length,
    });
    throw error;
  }
}

/**
 * Get user events with filters
 */
export async function getUserEvents(userId, filters = {}) {
  try {
    const queryApi = getQueryApi();
    const bucket = process.env.INFLUXDB_BUCKET;

    // Build Flux query
    const {
      appId,
      eventType,
      eventName,
      startTime,
      endTime,
      limit = 100,
    } = filters;

    let fluxQuery = `
      from(bucket: "${bucket}")
        |> range(start: ${startTime || '-30d'}, stop: ${endTime || 'now()'})
        |> filter(fn: (r) => r["_measurement"] == "events")
        |> filter(fn: (r) => r["userId"] == "${userId}")
    `;

    if (appId) {
      fluxQuery += `\n  |> filter(fn: (r) => r["appId"] == "${appId}")`;
    }

    if (eventType) {
      fluxQuery += `\n  |> filter(fn: (r) => r["eventType"] == "${eventType}")`;
    }

    if (eventName) {
      fluxQuery += `\n  |> filter(fn: (r) => r["eventName"] == "${eventName}")`;
    }

    fluxQuery += `\n  |> limit(n: ${limit})`;
    fluxQuery += `\n  |> sort(columns: ["_time"], desc: true)`;

    const events = [];

    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const row = tableMeta.toObject(values);
      events.push({
        timestamp: row._time,
        appId: row.appId,
        userId: row.userId,
        eventType: row.eventType,
        eventName: row.eventName,
        properties: row.properties ? JSON.parse(row.properties) : {},
        sessionId: row.sessionId,
        userAgent: row.userAgent,
        ipAddress: row.ipAddress,
      });
    }

    logger.debug('User events retrieved', {
      userId,
      count: events.length,
    });

    return events;
  } catch (error) {
    logger.error('Failed to get user events', {
      error: error.message,
      userId,
      filters,
    });
    throw error;
  }
}

export default {
  trackEvent,
  trackEventsBatch,
  getUserEvents,
};
