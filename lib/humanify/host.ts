/** Host detection — Humanify production domain vs ESI / other tenants */

const DEFAULT_HUMANIFY_HOSTS = ['humanify.id', 'www.humanify.id'];

function parseHostList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export function getHumanifyHosts(): string[] {
  const fromEnv = parseHostList(process.env.HUMANIFY_HOSTS)
    .concat(parseHostList(process.env.NEXT_PUBLIC_HUMANIFY_HOSTS));
  if (fromEnv.length) return [...new Set(fromEnv)];
  return DEFAULT_HUMANIFY_HOSTS;
}

/** True when request Host header belongs to the Humanify public site (e.g. humanify.id). */
export function isHumanifyHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const normalized = host.split(':')[0].toLowerCase();
  return getHumanifyHosts().some(
    (h) => normalized === h || normalized.endsWith(`.${h}`),
  );
}
