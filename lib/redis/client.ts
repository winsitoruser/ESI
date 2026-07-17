/**
 * Lazy Redis singleton for Humanify Next.js app.
 * Returns null when REDIS_URL is unset or connection fails (callers fall back to memory).
 */
let client: any = null;
let initAttempted = false;
let logged = false;

export function getRedis(): any | null {
  if (initAttempted) return client;
  initAttempted = true;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis');
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: false,
      connectTimeout: 2000,
    });
    client.on('error', (err: Error) => {
      if (!logged) {
        console.warn('[redis] connection error — falling back to memory stores:', err.message);
        logged = true;
      }
    });
    return client;
  } catch (e: any) {
    console.warn('[redis] init failed:', e?.message || e);
    client = null;
    return null;
  }
}

export function redisEnabled(): boolean {
  return Boolean(process.env.REDIS_URL);
}
