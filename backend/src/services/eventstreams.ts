import EventSource from 'eventsource';
import pino from 'pino';
import { cache } from '../store/cache';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const STREAM_URL = 'https://stream.wikimedia.org/v2/stream/recentchange';

// A simple dirty set of QIDs that have recent changes
const dirtyQids = new Set<string>();

let es: EventSource | null = null;
let reconnectAttempts = 0;

function scheduleCacheInvalidation() {
  // Simple approach: invalidate the whole events namespace periodically when dirty QIDs appear
  if (dirtyQids.size === 0) return;
  cache.invalidateNamespace('wikidata-events');
  dirtyQids.clear();
}

setInterval(scheduleCacheInvalidation, 60_000).unref();

export function startEventStream(): void {
  if (es) return; // already running

  const connect = () => {
    logger.info({ url: STREAM_URL }, 'Connecting to Wikimedia EventStreams');
    es = new EventSource(STREAM_URL);

    es.onopen = () => {
      reconnectAttempts = 0;
      logger.info('EventStreams connected');
    };

    es.onerror = (err) => {
      logger.warn({ err }, 'EventStreams error; will attempt to reconnect');
      if (es) {
        try { es.close(); } catch {}
        es = null;
      }
      const backoff = Math.min(30000, 1000 * 2 ** reconnectAttempts);
      reconnectAttempts += 1;
      setTimeout(connect, backoff).unref();
    };

    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (!data) return;
        if (data.wiki !== 'wikidatawiki') return;
        if (data.type !== 'edit' && data.type !== 'new') return;
        // Extract QID from title when available: e.g., "Q12345"
        const title: string | undefined = data.title;
        if (title && /^Q\d+$/.test(title)) {
          dirtyQids.add(title);
        }
      } catch (err) {
        logger.warn({ err }, 'Failed to parse EventStreams message');
      }
    };
  };

  connect();
}

