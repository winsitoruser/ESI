/**
 * Humanify SaaS Phase 5b — tenant slug from Host subdomain
 * e.g. acme.humanify.id → "acme" (DNS wildcard opsional di Cloudflare)
 */
import { getHumanifyHosts } from '@/lib/humanify/host';
import { slugifyTenantName } from './tenant-slug';

const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'admin', 'api', 'platform', 'mail', 'cdn', 'static',
  'staging', 'dev', 'test', 'status', 'docs', 'help',
]);

/** Extract tenant slug from Host, or null on apex / reserved. */
export function extractTenantSlugFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const hostname = host.split(':')[0].toLowerCase();
  const roots = getHumanifyHosts()
    .map((h) => h.replace(/^www\./, ''))
    .filter((h, i, arr) => arr.indexOf(h) === i);

  for (const root of roots) {
    if (hostname === root || hostname === `www.${root}`) return null;
    const suffix = `.${root}`;
    if (!hostname.endsWith(suffix)) continue;
    const sub = hostname.slice(0, -suffix.length);
    if (!sub || sub.includes('.') || RESERVED_SUBDOMAINS.has(sub)) return null;
    return slugifyTenantName(sub);
  }
  return null;
}
