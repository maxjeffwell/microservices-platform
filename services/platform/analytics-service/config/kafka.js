import { Kafka, logLevel } from 'kafkajs';
import logger from '@platform/logger';

let kafka = null;
let producer = null;
let consumer = null;

/**
 * Initialize Kafka client
 */
export function initKafka() {
  try {
    const brokers = process.env.KAFKA_BROKERS
      ? process.env.KAFKA_BROKERS.split(',')
      : ['localhost:9092'];
    const clientId = process.env.KAFKA_CLIENT_ID || 'analytics-service';

    kafka = new Kafka({
      clientId,
      brokers,
      logLevel: logLevel.ERROR,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    logger.info('Kafka client initialized', {
      clientId,
      brokers,
    });

    return kafka;
  } catch (error) {
    logger.error('Failed to initialize Kafka', { error: error.message });
    throw error;
  }
}

/**
 * Initialize Kafka producer
 */
export async function initProducer() {
  try {
    if (!kafka) {
      initKafka();
    }

    producer = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });

    await producer.connect();
    logger.info('Kafka producer connected');

    return producer;
  } catch (error) {
    logger.error('Failed to initialize Kafka producer', { error: error.message });
    throw error;
  }
}

/**
 * Initialize Kafka consumer
 */
export async function initConsumer() {
  try {
    if (!kafka) {
      initKafka();
    }

    const groupId = process.env.KAFKA_GROUP_ID || 'analytics-service-group';

    consumer = kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    await consumer.connect();
    logger.info('Kafka consumer connected', { groupId });

    return consumer;
  } catch (error) {
    logger.error('Failed to initialize Kafka consumer', { error: error.message });
    throw error;
  }
}

/**
 * Get producer instance
 */
export function getProducer() {
  if (!producer) {
    throw new Error('Kafka producer not initialized. Call initProducer() first.');
  }
  return producer;
}

/**
 * Get consumer instance
 */
export function getConsumer() {
  if (!consumer) {
    throw new Error('Kafka consumer not initialized. Call initConsumer() first.');
  }
  return consumer;
}

/**
 * Send event to Kafka topic
 */
export async function sendEvent(topic, event) {
  try {
    const prod = getProducer();
    await prod.send({
      topic,
      messages: [
        {
          key: event.userId || event.appId,
          value: JSON.stringify(event),
          timestamp: Date.now().toString(),
        },
      ],
    });

    logger.debug('Event sent to Kafka', { topic, eventType: event.eventType });
  } catch (error) {
    logger.error('Failed to send event to Kafka', {
      error: error.message,
      topic,
      event,
    });
    throw error;
  }
}

/**
 * Disconnect producer and consumer
 */
export async function closeKafka() {
  try {
    if (producer) {
      await producer.disconnect();
      logger.info('Kafka producer disconnected');
    }

    if (consumer) {
      await consumer.disconnect();
      logger.info('Kafka consumer disconnected');
    }
  } catch (error) {
    logger.error('Error closing Kafka connections', { error: error.message });
    throw error;
  }
}

export default {
  initKafka,
  initProducer,
  initConsumer,
  getProducer,
  getConsumer,
  sendEvent,
  closeKafka,
};
