/**
 * Lazy Redis singleton for Humanify Next.js app (server-only).
 * Never import this from client components.
 */
let client: any = null;
let initAttempted = false;
let logged = false;

export function getRedis(): any | null {
  if (typeof window !== 'undefined') return null;
  if (initAttempted) return client;
  initAttempted = true;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    // eval(require) prevents webpack from parsing/bundling ioredis into client graphs
    // that accidentally import NextAuth helpers.
    // eslint-disable-next-line no-eval
    const Redis = eval('require')('ioredis');
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
  return Boolean(process.env.REDIS_URL) && typeof window === 'undefined';
}
