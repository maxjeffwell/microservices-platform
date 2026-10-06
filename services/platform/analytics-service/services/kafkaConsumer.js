import { getConsumer } from '../config/kafka.js';
import { getWriteApi, getAllocationWriteApi } from '../config/influxdb.js';
import Event from '../models/Event.js';
import { allocationToPoint } from '../models/Allocation.js';
import logger from '@platform/logger';

let isRunning = false;

/**
 * Start Kafka consumer to process events
 */
export async function startConsumer() {
  try {
    if (isRunning) {
      logger.warn('Kafka consumer already running');
      return;
    }

    const consumer = getConsumer();
    const eventsTopic = process.env.KAFKA_EVENTS_TOPIC || 'analytics.events';
    // k8s-allocation-producer topics (snapshots + scheduling/scaling events).
    // Empty KAFKA_ALLOCATION_TOPICS disables the allocation path.
    const allocationTopics = (process.env.KAFKA_ALLOCATION_TOPICS || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const allocationEventsTopic =
      process.env.KAFKA_ALLOCATION_EVENTS_TOPIC || 'k8s.allocation.events';
    const topics = [eventsTopic, ...allocationTopics];

    await consumer.subscribe({
      topics,
      fromBeginning: false,
    });

    logger.info('Kafka consumer subscribed to topics', { topics });

    isRunning = true;

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (topic !== eventsTopic) {
            // Allocation snapshot/event: buffered write, flushed by the client
            // every 5 s (see getAllocationWriteApi) instead of per message.
            const point = allocationToPoint(
              topic,
              JSON.parse(message.value.toString()),
              allocationEventsTopic
            );
            if (point) getAllocationWriteApi().writePoint(point);
            return;
          }

          const eventData = JSON.parse(message.value.toString());

          // Create and validate event
          const event = Event.fromObject(eventData);
          const validation = event.validate();

          if (!validation.isValid) {
            logger.error('Invalid event received from Kafka', {
              errors: validation.errors,
              eventData,
            });
            return;
          }

          // Write to InfluxDB
          const writeApi = getWriteApi();
          const point = event.toInfluxPoint();
          writeApi.writePoint(point);
          await writeApi.flush();

          logger.debug('Event processed from Kafka', {
            topic,
            partition,
            offset: message.offset,
            eventName: event.eventName,
          });
        } catch (error) {
          logger.error('Error processing Kafka message', {
            error: error.message,
            topic,
            partition,
            offset: message.offset,
          });
        }
      },
    });
  } catch (error) {
    logger.error('Failed to start Kafka consumer', { error: error.message });
    isRunning = false;
    throw error;
  }
}

/**
 * Stop Kafka consumer
 */
export async function stopConsumer() {
  try {
    if (!isRunning) {
      logger.warn('Kafka consumer not running');
      return;
    }

    const consumer = getConsumer();
    await consumer.stop();
    isRunning = false;

    logger.info('Kafka consumer stopped');
  } catch (error) {
    logger.error('Error stopping Kafka consumer', { error: error.message });
    throw error;
  }
}

/**
 * Check if consumer is running
 */
export function isConsumerRunning() {
  return isRunning;
}

export default {
  startConsumer,
  stopConsumer,
  isConsumerRunning,
};
