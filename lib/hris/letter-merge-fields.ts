/**
 * Merge fields for HR letter / contract templates (HRS-4).
 * Placeholders: {{employee_name}}, {{position}}, …
 */
export const LETTER_MERGE_FIELDS = [
  { key: 'employee_name', label: 'Nama karyawan', aliases: ['employeeName', 'nama'] },
  { key: 'employee_code', label: 'NIK / kode karyawan', aliases: ['employeeId', 'employee_id', 'nik'] },
  { key: 'position', label: 'Jabatan', aliases: ['jabatan'] },
  { key: 'department', label: 'Departemen', aliases: ['dept'] },
  { key: 'company_name', label: 'Nama perusahaan', aliases: ['companyName', 'perusahaan'] },
  { key: 'letter_number', label: 'Nomor surat', aliases: ['letterNumber', 'documentNumber'] },
  { key: 'letter_date', label: 'Tanggal surat', aliases: ['letterDate', 'documentDate', 'today'] },
  { key: 'incident_date', label: 'Tanggal kejadian', aliases: ['incidentDate'] },
  { key: 'expiry_date', label: 'Tanggal berlaku / expiry', aliases: ['expiryDate'] },
  { key: 'violation_type', label: 'Jenis pelanggaran', aliases: ['violationType', 'violationTypeLabel'] },
  { key: 'violation_description', label: 'Uraian pelanggaran', aliases: ['violationDescription'] },
  { key: 'effective_date', label: 'Tanggal efektif', aliases: ['effectiveDate'] },
] as const;

export type LetterMergeContext = Record<string, string | number | null | undefined>;

/** Flatten letterData / employee into merge context. */
export function buildMergeContext(parts: {
  letterData?: Record<string, unknown>;
  employee?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  companyName?: string;
}): LetterMergeContext {
  const ld = parts.letterData || {};
  const emp = parts.employee || {};
  const meta = parts.meta || {};
  const today = new Date().toISOString().slice(0, 10);
  return {
    employee_name: str(ld.employeeName || emp.name || emp.employee_name),
    employee_code: str(ld.employeeId || emp.employee_code || emp.employeeCode),
    position: str(ld.position || emp.position),
    department: str(ld.department || emp.department),
    company_name: str(parts.companyName || meta.companyName || process.env.HUMANIFY_COMPANY_NAME || 'Perusahaan'),
    letter_number: str(meta.documentNumber || ld.letter_number || meta.letterNumber),
    letter_date: str(meta.documentDate || ld.letter_date || today),
    incident_date: str(ld.incidentDate || ld.incident_date),
    expiry_date: str(ld.expiryDate || ld.expiry_date),
    violation_type: str(ld.violationTypeLabel || ld.violationType || ld.violation_type),
    violation_description: str(ld.violationDescription || ld.violation_description),
    effective_date: str(ld.effectiveDate || ld.effective_date),
  };
}

function str(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

/**
 * Replace {{key}} / {{ alias }} in template. Unknown keys left as-is.
 * Also supports ${key} for legacy drafts.
 */
export function applyMergeFields(template: string, context: LetterMergeContext): string {
  if (!template) return '';
  const lookup = new Map<string, string>();
  for (const field of LETTER_MERGE_FIELDS) {
    const val = str(context[field.key]);
    lookup.set(field.key.toLowerCase(), val);
    for (const a of field.aliases) lookup.set(a.toLowerCase(), val);
  }
  // Also allow any extra context keys
  for (const [k, v] of Object.entries(context)) {
    if (!lookup.has(k.toLowerCase())) lookup.set(k.toLowerCase(), str(v));
  }

  const replaceToken = (_: string, rawKey: string) => {
    const key = rawKey.trim().toLowerCase();
    if (lookup.has(key)) return lookup.get(key)!;
    return `{{${rawKey.trim()}}}`;
  };

  return template
    .replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, replaceToken)
    .replace(/\$\{\s*([a-zA-Z0-9_.]+)\s*\}/g, replaceToken);
}

/** Apply merge to common letter text fields. */
export function mergeLetterTexts(
  texts: { body?: string; closing?: string; subject?: string; salutation?: string; title?: string },
  context: LetterMergeContext,
): typeof texts & { merged: true } {
  return {
    body: texts.body != null ? applyMergeFields(texts.body, context) : texts.body,
    closing: texts.closing != null ? applyMergeFields(texts.closing, context) : texts.closing,
    subject: texts.subject != null ? applyMergeFields(texts.subject, context) : texts.subject,
    salutation: texts.salutation != null ? applyMergeFields(texts.salutation, context) : texts.salutation,
    title: texts.title != null ? applyMergeFields(texts.title, context) : texts.title,
    merged: true,
  };
}
