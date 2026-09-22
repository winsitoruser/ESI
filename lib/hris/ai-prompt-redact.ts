/**
 * Redact secrets / Highly Sensitive patterns before sending text to LLM providers.
 * SEC-AI-001
 */
const PATTERNS: Array<{ re: RegExp; replace: string }> = [
  { re: /\b(sk_live_|sk_test_|SB-Mid-server-|Mid-server-)[A-Za-z0-9_-]{8,}\b/gi, replace: '[REDACTED_KEY]' },
  { re: /\b(Bearer\s+)[A-Za-z0-9._\-+=\/]{20,}/gi, replace: '$1[REDACTED_TOKEN]' },
  { re: /\b(api[_-]?key|secret|password|passwd|pwd)\s*[:=]\s*['"]?[^\s'"]{6,}/gi, replace: '$1=[REDACTED]' },
  // Indonesian bank account-ish (10–16 digits) — conservative mask
  { re: /\b(\d{4})\d{4,10}(\d{2})\b/g, replace: '$1****$2' },
  // NIK 16 digits
  { re: /\b(\d{4})\d{8}(\d{4})\b/g, replace: '$1********$2' },
  { re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replace: '[REDACTED_EMAIL]' },
];

export function redactForLlm(input: string): string {
  let out = String(input || '');
  for (const { re, replace } of PATTERNS) {
    out = out.replace(re, replace);
  }
  return out;
}

export function redactMessagesForLlm<T extends { role: string; content: string }>(messages: T[]): T[] {
  return messages.map((m) => ({
    ...m,
    content: typeof m.content === 'string' ? redactForLlm(m.content) : m.content,
  }));
}
