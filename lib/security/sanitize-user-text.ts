/** Strip HTML/script from stored user text (names, announcements, job posts). */
export function stripHtmlTags(raw: unknown): string {
  return String(raw || '')
    .replace(/<\s*script[\s\S]*?>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*\/?\s*[a-zA-Z][^>]*>/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

export function sanitizePlainText(raw: unknown, maxLen = 2000): string {
  return stripHtmlTags(raw)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, maxLen);
}

/** JSON-LD in a <script> tag: escape `<` so stored XSS cannot break out. */
export function toJsonLdScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}
