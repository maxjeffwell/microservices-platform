import { getConsumer } from '../config/kafka.js';
import { getWriteApi } from '../config/influxdb.js';
import Event from '../models/Event.js';
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
    const topic = process.env.KAFKA_EVENTS_TOPIC || 'analytics.events';

    await consumer.subscribe({
      topic,
      fromBeginning: false,
    });

    logger.info('Kafka consumer subscribed to topic', { topic });

    isRunning = true;

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
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
