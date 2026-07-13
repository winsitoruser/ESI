/**
 * Privy ID B2B e-sign — optional live integration when credentials are set.
 * Docs: https://docs.privy.id
 */

export type PrivyMode = 'live' | 'sandbox' | 'disabled';

export function getPrivyMode(): PrivyMode {
  const key = process.env.PRIVY_API_KEY || process.env.PRIVY_MERCHANT_KEY;
  const secret = process.env.PRIVY_API_SECRET || process.env.PRIVY_API_KEY_SECRET;
  if (key && secret) {
    const base = process.env.PRIVY_API_URL || 'https://api-b2b-stg.privy.io';
    return base.includes('stg') || base.includes('sandbox') ? 'sandbox' : 'live';
  }
  return 'disabled';
}

export function isPrivyConfigured(): boolean {
  return getPrivyMode() !== 'disabled';
}

function authHeader(): string {
  const key = process.env.PRIVY_API_KEY || process.env.PRIVY_MERCHANT_KEY || '';
  const secret = process.env.PRIVY_API_SECRET || process.env.PRIVY_API_KEY_SECRET || '';
  return `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;
}

export async function createPrivySigningRequest(payload: {
  title: string;
  docType: string;
  signers: { name: string; email: string; role: string }[];
  documentUrl?: string;
}): Promise<{ token: string; status: string; raw?: unknown } | null> {
  if (!isPrivyConfigured()) return null;

  const baseUrl = (process.env.PRIVY_API_URL || 'https://api-b2b-stg.privy.io').replace(/\/$/, '');
  try {
    const res = await fetch(`${baseUrl}/v1/documents`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        title: payload.title,
        document_type: payload.docType,
        signers: payload.signers.map((s) => ({
          name: s.name,
          email: s.email,
          role: s.role,
        })),
        document_url: payload.documentUrl,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('Privy create document failed:', res.status, text.slice(0, 200));
      return null;
    }

    const json = await res.json();
    const token = json?.data?.doc_token || json?.doc_token || json?.token || `PRIVY-${Date.now().toString(36).toUpperCase()}`;
    return { token, status: json?.data?.status || 'pending', raw: json };
  } catch (e: any) {
    console.warn('Privy API error:', e?.message || e);
    return null;
  }
}

export async function notifyPrivySigner(docToken: string, signerEmail: string): Promise<boolean> {
  if (!isPrivyConfigured()) return false;
  const baseUrl = (process.env.PRIVY_API_URL || 'https://api-b2b-stg.privy.io').replace(/\/$/, '');
  try {
    const res = await fetch(`${baseUrl}/v1/documents/${encodeURIComponent(docToken)}/sign`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: signerEmail }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
