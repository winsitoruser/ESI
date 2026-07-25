/**
 * Proxy aman data daerah Indonesia (provinsi / kab-kota).
 * Upstream: https://wilayah.id (static JSON, Kepmendagri) — allowlist only.
 *
 * GET ?level=provinces
 * GET ?level=regencies&provinceCode=31
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import {
  WILAYAH_UPSTREAM_BASE,
  isValidProvinceCode,
  type WilayahItem,
} from '@/lib/humanify/wilayah-id';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h in-memory
const FETCH_MS = 12_000;

type CacheEntry = { at: number; items: WilayahItem[]; updatedAt?: string };
const memoryCache = new Map<string, CacheEntry>();

function abortSignal(ms: number) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

async function fetchUpstream(path: string): Promise<{ items: WilayahItem[]; updatedAt?: string }> {
  const url = `${WILAYAH_UPSTREAM_BASE}/${path}`;
  if (!url.startsWith(WILAYAH_UPSTREAM_BASE + '/')) {
    throw new Error('Upstream URL rejected');
  }
  const res = await fetch(url, {
    signal: abortSignal(FETCH_MS),
    headers: { Accept: 'application/json', 'User-Agent': 'HumanifyHRIS/1.0' },
  });
  if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`);
  const json = await res.json();
  const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  const items: WilayahItem[] = rows
    .map((r: any) => ({
      code: String(r.code || r.id || '').trim(),
      name: String(r.name || r.nama || '').trim(),
    }))
    .filter((r: WilayahItem) => r.code && r.name)
    .map((r) => ({ ...r, name: r.name.replace(/\s+$/g, '') }));
  return { items, updatedAt: json?.meta?.updated_at };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const level = String(req.query.level || 'provinces');
  let cacheKey = '';
  let upstreamPath = '';

  if (level === 'provinces') {
    cacheKey = 'provinces';
    upstreamPath = 'provinces.json';
  } else if (level === 'regencies') {
    const provinceCode = String(req.query.provinceCode || req.query.province || '').trim();
    if (!isValidProvinceCode(provinceCode)) {
      return res.status(400).json({ success: false, error: 'provinceCode wajib (2 digit, mis. 31)' });
    }
    cacheKey = `regencies:${provinceCode}`;
    upstreamPath = `regencies/${provinceCode}.json`;
  } else {
    return res.status(400).json({ success: false, error: 'level harus provinces|regencies' });
  }

  try {
    const hit = memoryCache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('X-Wilayah-Cache', 'HIT');
      return res.json({
        success: true,
        data: hit.items,
        meta: { source: 'wilayah.id', updatedAt: hit.updatedAt, cached: true },
      });
    }

    const { items, updatedAt } = await fetchUpstream(upstreamPath);
    memoryCache.set(cacheKey, { at: Date.now(), items, updatedAt });
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Wilayah-Cache', 'MISS');
    return res.json({
      success: true,
      data: items,
      meta: { source: 'wilayah.id', updatedAt, cached: false },
    });
  } catch (e: any) {
    const stale = memoryCache.get(cacheKey);
    if (stale?.items?.length) {
      res.setHeader('X-Wilayah-Cache', 'STALE');
      return res.json({
        success: true,
        data: stale.items,
        meta: { source: 'wilayah.id', updatedAt: stale.updatedAt, cached: true, stale: true },
      });
    }
    return res.status(502).json({
      success: false,
      error: e?.name === 'TimeoutError' || e?.name === 'AbortError'
        ? 'Timeout mengambil data daerah'
        : (e?.message || 'Gagal mengambil data daerah'),
    });
  }
}

export default withHQAuth(handler);
