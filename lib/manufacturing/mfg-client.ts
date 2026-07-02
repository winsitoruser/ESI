/**
 * Manufacturing module — unified API client (base / enhanced / advanced / integration).
 * Mirrors modular integration pattern: single entry for HQ MFG endpoints + cross-module calls.
 */

export type MfgApiType = 'base' | 'enhanced' | 'advanced' | 'integration';

const BASE: Record<MfgApiType, string> = {
  base: '/api/hq/manufacturing',
  enhanced: '/api/hq/manufacturing/enhanced',
  advanced: '/api/hq/manufacturing/advanced',
  integration: '/api/hq/manufacturing/integration',
};

function buildUrl(action: string, apiType: MfgApiType, query?: Record<string, string>) {
  const qs = new URLSearchParams();
  qs.set('action', action);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== '') qs.set(k, v);
    }
  }
  return `${BASE[apiType]}?${qs.toString()}`;
}

export async function mfgRequest<T = unknown>(
  action: string,
  options: {
    method?: string;
    body?: Record<string, unknown> | unknown[];
    apiType?: MfgApiType;
    query?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = 'GET', body, apiType = 'base', query } = options;
  const url = buildUrl(action, apiType, query);
  const opts: RequestInit = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body != null && method !== 'GET' && method !== 'DELETE') {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`API ${action} returned non-JSON (${res.status})`);
  }
  const text = await res.text();
  let json: { data?: T; error?: { message?: string } };
  try {
    json = text ? (JSON.parse(text) as typeof json) : ({} as typeof json);
  } catch {
    throw new Error(`API ${action} returned invalid JSON (${res.status})`);
  }
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } })?.error?.message || 'API Error';
    throw new Error(msg);
  }
  return (json as { data: T }).data;
}

/** Same as mfgRequest but preserves pagination `meta` (e.g. work-orders list). */
export async function mfgRequestFull<T = unknown>(
  action: string,
  options: {
    method?: string;
    body?: Record<string, unknown> | unknown[];
    apiType?: MfgApiType;
    query?: Record<string, string>;
  } = {}
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const { method = 'GET', body, apiType = 'base', query } = options;
  const url = buildUrl(action, apiType, query);
  const opts: RequestInit = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body != null && method !== 'GET' && method !== 'DELETE') {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`API ${action} returned non-JSON (${res.status})`);
  }
  const text = await res.text();
  let json: { data: T; meta?: Record<string, unknown>; error?: { message?: string } };
  try {
    json = text ? (JSON.parse(text) as typeof json) : ({} as typeof json);
  } catch {
    throw new Error(`API ${action} returned invalid JSON (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(json.error?.message || 'API Error');
  }
  return { data: json.data, meta: json.meta };
}

export async function mfgPut(action: string, body: Record<string, unknown>) {
  return mfgRequest(action, { method: 'PUT', body, apiType: 'base' });
}

export async function mfgDelete(action: string, id: string) {
  const url = `${BASE.base}?action=${encodeURIComponent(action)}&id=${encodeURIComponent(id)}`;
  const res = await fetch(url, { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`DELETE ${action} non-JSON (${res.status})`);
  }
  const text = await res.text();
  let json: { data?: unknown; error?: { message?: string } };
  try {
    json = text ? (JSON.parse(text) as typeof json) : ({} as typeof json);
  } catch {
    throw new Error(`DELETE ${action} invalid JSON (${res.status})`);
  }
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } })?.error?.message || 'Delete failed';
    throw new Error(msg);
  }
  return (json as { data: unknown }).data;
}

/** Cross-module: material check, FG receipt, unified dashboard */
export const mfgIntegration = {
  checkMaterialAvailability: (work_order_id?: string, bom_id?: string) =>
    mfgRequest('check-material-availability', {
      apiType: 'integration',
      query: work_order_id ? { work_order_id } : bom_id ? { bom_id } : undefined,
    }),
  materialShortage: () => mfgRequest('material-shortage', { apiType: 'integration' }),
  integratedDashboard: () => mfgRequest('integrated-dashboard', { apiType: 'integration' }),
  receiveFinishedGoods: (body: { work_order_id: string; quantity: number; warehouse_id?: number }) =>
    mfgRequest('receive-finished-goods', { method: 'POST', body, apiType: 'integration' }),
};
