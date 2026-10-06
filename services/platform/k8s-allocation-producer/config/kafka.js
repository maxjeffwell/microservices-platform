import { Kafka, logLevel, CompressionTypes } from 'kafkajs';
import logger from '@platform/logger';

let kafka = null;
let producer = null;

/**
 * Kafka client — same conventions as analytics-service/config/kafka.js
 * (KAFKA_BROKERS comma list, optional SASL/SSL, no auto topic creation).
 */
export function initKafka() {
  const brokers = process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'];
  const clientId = process.env.KAFKA_CLIENT_ID || 'k8s-allocation-producer';
  const config = {
    clientId,
    brokers,
    logLevel: logLevel.ERROR,
    retry: { initialRetryTime: 100, retries: 8 },
  };
  if (process.env.KAFKA_SASL_USERNAME && process.env.KAFKA_SASL_PASSWORD) {
    config.ssl = true;
    config.sasl = {
      mechanism: 'plain',
      username: process.env.KAFKA_SASL_USERNAME,
      password: process.env.KAFKA_SASL_PASSWORD,
    };
  }
  kafka = new Kafka(config);
  logger.info('Kafka client initialized', { clientId, brokers, ssl: !!config.ssl });
  return kafka;
}

export async function initProducer() {
  if (!kafka) initKafka();
  producer = kafka.producer({ allowAutoTopicCreation: false, idempotent: false });
  await producer.connect();
  logger.info('Kafka producer connected');
  return producer;
}

/** Send a batch of JSON messages to one topic; key keeps a series on one partition. */
export async function sendJson(topic, messages) {
  if (!producer) throw new Error('Kafka producer not initialized');
  if (!messages.length) return;
  await producer.send({
    topic,
    compression: CompressionTypes.GZIP,
    messages: messages.map((m) => ({
      key: m.key,
      value: JSON.stringify(m.value),
      timestamp: String(m.value.ts || Date.now()),
    })),
  });
}

export async function closeKafka() {
  if (producer) {
    await producer.disconnect();
    producer = null;
    logger.info('Kafka producer disconnected');
  }
}
