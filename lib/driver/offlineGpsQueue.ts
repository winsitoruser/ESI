/**
 * Offline GPS queue (IndexedDB)
 *
 * Dipakai oleh Driver Portal agar ping GPS tidak hilang saat sinyal buruk.
 * Alur:
 *   1. `pushGps(point)`   → coba kirim, kalau gagal simpan ke queue
 *   2. `flush()`          → kirim semua yang tertahan dalam batch
 *   3. listener `online`  → auto-flush saat koneksi kembali
 *
 * Storage: DB = "bedagang-driver", store = "gps_queue"
 */

export interface GpsPing {
  latitude: number;
  longitude: number;
  speed_kmh?: number;
  heading?: number;
  accuracy_meters?: number | null;
  timestamp?: string; // ISO
}

type Row = GpsPing & { id?: number };

const DB_NAME = 'bedagang-driver';
const STORE   = 'gps_queue';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function putOne(ping: GpsPing) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add({ ...ping, timestamp: ping.timestamp || new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn('[gps-queue] put failed', e);
  }
}

async function getAll(): Promise<Row[]> {
  try {
    const db = await openDb();
    const rows = await new Promise<Row[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as Row[]);
      req.onerror   = () => reject(req.error);
    });
    db.close();
    return rows;
  } catch {
    return [];
  }
}

async function clearAll() {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn('[gps-queue] clear failed', e);
  }
}

async function removeIds(ids: number[]) {
  if (ids.length === 0) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const os = tx.objectStore(STORE);
      for (const id of ids) os.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn('[gps-queue] remove failed', e);
  }
}

/** Try to POST single ping; return `true` if successful. */
async function postSingle(ping: GpsPing): Promise<boolean> {
  try {
    const r = await fetch('/api/driver/dashboard?action=push-gps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ping),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Push batch — resolves `saved`. */
async function postBatch(points: GpsPing[]): Promise<number> {
  try {
    const r = await fetch('/api/driver/dashboard?action=push-gps-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points }),
    });
    if (!r.ok) return 0;
    const j = await r.json();
    return j?.data?.saved || 0;
  } catch {
    return 0;
  }
}

/** Push or queue GPS ping. */
export async function pushGps(ping: GpsPing): Promise<'sent' | 'queued'> {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (online) {
    const ok = await postSingle(ping);
    if (ok) return 'sent';
  }
  await putOne(ping);
  return 'queued';
}

/** Flush pending queue. Returns `{ sent, remaining }`. */
export async function flush(): Promise<{ sent: number; remaining: number }> {
  const rows = await getAll();
  if (rows.length === 0) return { sent: 0, remaining: 0 };
  const ids: number[] = rows.map(r => r.id as number).filter(Boolean);
  const sent = await postBatch(rows.map(({ id, ...rest }) => rest));
  if (sent > 0) await removeIds(ids);
  const remaining = (await getAll()).length;
  return { sent, remaining };
}

/** Count currently queued pings. */
export async function queueSize(): Promise<number> {
  return (await getAll()).length;
}

/** Wipe the queue (use with care). */
export async function resetQueue() {
  await clearAll();
}

/** Auto-flush on `online` event. Call once in a `useEffect`. */
export function startAutoFlush(onFlush?: (r: { sent: number; remaining: number }) => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = async () => {
    if (!navigator.onLine) return;
    const r = await flush();
    if (onFlush) onFlush(r);
  };
  window.addEventListener('online', handler);
  // periodic safety net (every 60 sec)
  const t = window.setInterval(handler, 60_000);
  return () => {
    window.removeEventListener('online', handler);
    window.clearInterval(t);
  };
}
