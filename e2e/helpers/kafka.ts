import { Kafka, logLevel } from 'kafkajs';

const KAFKA_BROKER = process.env.KAFKA_BROKER ?? 'localhost:9093';
const LOG_TOPIC = 'destrova-logs';
const OPENSEARCH_HOST = process.env.OPENSEARCH_HOST ?? 'http://localhost:9200';

export type LogEvent = {
  timestamp?: string;
  level?: string;
  action?: string;
  ticketId?: number;
  userId?: number;
  message?: string;
  serviceName?: string;
};

export async function isKafkaReachable(): Promise<boolean> {
  const kafka = new Kafka({
    clientId: 'e2e-kafka-probe',
    brokers: [KAFKA_BROKER],
    logLevel: logLevel.NOTHING,
    connectionTimeout: 3_000,
    requestTimeout: 3_000,
  });
  const admin = kafka.admin();
  try {
    await admin.connect();
    await admin.listTopics();
    return true;
  } catch {
    return false;
  } finally {
    await admin.disconnect().catch(() => undefined);
  }
}

export async function isOpenSearchReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${OPENSEARCH_HOST}/destrova-logs`);
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

async function scanRecentLogs(
  predicate: (event: LogEvent) => boolean,
  lookbackMessages = 250,
): Promise<LogEvent | null> {
  const kafka = new Kafka({
    clientId: `e2e-kafka-scan-${Date.now()}`,
    brokers: [KAFKA_BROKER],
    logLevel: logLevel.NOTHING,
    connectionTimeout: 3_000,
    requestTimeout: 5_000,
  });
  const admin = kafka.admin();
  await admin.connect();
  const offsets = await admin.fetchTopicOffsets(LOG_TOPIC);
  await admin.disconnect();

  const partition = offsets[0]?.partition ?? 0;
  const high = Number.parseInt(offsets[0]?.high ?? '0', 10);
  const low = Number.parseInt(offsets[0]?.low ?? '0', 10);
  const startOffset = Math.max(high - lookbackMessages, low);

  const consumer = kafka.consumer({ groupId: `e2e-scan-${Date.now()}` });
  await consumer.connect();
  await consumer.subscribe({ topic: LOG_TOPIC, fromBeginning: true });

  try {
    return await new Promise<LogEvent | null>((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, 6_000);

      consumer
        .run({
          eachMessage: async ({ message }) => {
            if (settled || !message.value) {
              return;
            }
            const offset = Number(message.offset);
            if (offset < startOffset) {
              return;
            }
            try {
              const event = JSON.parse(message.value.toString()) as LogEvent;
              if (predicate(event)) {
                settled = true;
                clearTimeout(timer);
                resolve(event);
              }
            } catch {
              // ignore malformed payloads
            }
          },
        })
        .catch(() => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(null);
          }
        });
    });
  } finally {
    await consumer.disconnect().catch(() => undefined);
    void partition;
  }
}

export async function waitForKafkaLog(
  predicate: (event: LogEvent) => boolean,
  options: { timeoutMs?: number; lookbackMessages?: number } = {},
): Promise<LogEvent> {
  const timeoutMs = options.timeoutMs ?? 45_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const event = await scanRecentLogs(predicate, options.lookbackMessages ?? 250);
    if (event) {
      return event;
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }

  throw new Error(`Kafka log not received within ${timeoutMs}ms`);
}

export async function waitForKafkaLogAfter<T>(
  action: () => Promise<T>,
  predicate: (event: LogEvent, result: T) => boolean,
  options: { timeoutMs?: number } = {},
): Promise<{ result: T; event: LogEvent }> {
  const result = await action();
  const event = await waitForKafkaLog((log) => predicate(log, result), options);
  return { result, event };
}

export async function waitForOpenSearchLog(
  ticketId: number,
  action: string,
  options: { timeoutMs?: number } = {},
): Promise<LogEvent> {
  const timeoutMs = options.timeoutMs ?? 45_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetch(`${OPENSEARCH_HOST}/destrova-logs/_search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: {
          bool: {
            must: [{ term: { ticketId } }, { term: { 'action.keyword': action } }],
          },
        },
        sort: [{ timestamp: 'desc' }],
        size: 1,
      }),
    });

    if (response.ok) {
      const body = (await response.json()) as {
        hits?: { hits?: Array<{ _source?: LogEvent }> };
      };
      const hit = body.hits?.hits?.[0]?._source;
      if (hit) {
        return hit;
      }
    }

    await new Promise((r) => setTimeout(r, 1_000));
  }

  throw new Error(`OpenSearch log ${action} for ticket #${ticketId} not indexed within ${timeoutMs}ms`);
}
