/**
 * Wave 17 — SEC-MON-009 / DLP: never log secrets
 */
const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [REDACTED]'],
  [/hfy_live_[A-Za-z0-9_-]+/g, 'hfy_live_[REDACTED]'],
  [/(password|passwd|pwd)\s*[:=]\s*["']?[^"'\s,}]+/gi, '$1=[REDACTED]'],
  [/(api[_-]?key|secret|token)\s*[:=]\s*["']?[^"'\s,}]+/gi, '$1=[REDACTED]'],
  [/sk_live_[A-Za-z0-9]+/g, 'sk_live_[REDACTED]'],
  [/\b\d{16}\b/g, '[REDACTED_PAN]'],
];

export function redactSecretsForLog(input: unknown): string {
  let s = typeof input === 'string' ? input : (() => {
    try { return JSON.stringify(input); } catch { return String(input); }
  })();
  for (const [re, rep] of SECRET_PATTERNS) {
    s = s.replace(re, rep);
  }
  return s;
}
