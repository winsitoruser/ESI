/**
 * Tenant-wide employee document compliance (HRM-2 executive view).
 */
import { REQUIRED_DOCUMENT_TYPES } from './employee-document-types';

export type DocumentComplianceSummary = {
  activeEmployees: number;
  complete: number;
  incomplete: number;
  avgPercent: number;
  expiredDocs: number;
  expiringSoonDocs: number;
  requiredTypes: string[];
  topMissing: { type: string; label: string; count: number }[];
};

const REQUIRED = REQUIRED_DOCUMENT_TYPES.map((t) => t.value.toUpperCase());

export async function getTenantDocumentComplianceSummary(
  sequelize: any,
  tenantId: string,
): Promise<DocumentComplianceSummary> {
  const empty: DocumentComplianceSummary = {
    activeEmployees: 0,
    complete: 0,
    incomplete: 0,
    avgPercent: 0,
    expiredDocs: 0,
    expiringSoonDocs: 0,
    requiredTypes: REQUIRED,
    topMissing: [],
  };
  if (!sequelize || !tenantId || !REQUIRED.length) return empty;

  try {
    const [empRows] = await sequelize.query(
      `SELECT id FROM employees
       WHERE tenant_id = :tid AND COALESCE(is_active, true) = true
         AND LOWER(COALESCE(status, 'active')) IN ('active', 'on_leave', 'leave')`,
      { replacements: { tid: tenantId } },
    );
    const empIds = (empRows || []).map((r: any) => String(r.id));
    const activeEmployees = empIds.length;
    if (!activeEmployees) return empty;

    const [docRows] = await sequelize.query(
      `SELECT employee_id::text AS employee_id, UPPER(document_type) AS document_type,
              file_url, expiry_date
       FROM employee_documents
       WHERE tenant_id = :tid
         AND COALESCE(is_active, true) = true
         AND employee_id::text IN (:ids)`,
      { replacements: { tid: tenantId, ids: empIds } },
    );

    const byEmp = new Map<string, Set<string>>();
    let expiredDocs = 0;
    let expiringSoonDocs = 0;
    const soonLimit = new Date();
    soonLimit.setDate(soonLimit.getDate() + 30);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const d of docRows || []) {
      if (!d.file_url) continue;
      const eid = String(d.employee_id);
      if (!byEmp.has(eid)) byEmp.set(eid, new Set());
      byEmp.get(eid)!.add(String(d.document_type || '').toUpperCase());
      if (d.expiry_date) {
        const exp = new Date(d.expiry_date);
        if (exp < today) expiredDocs++;
        else if (exp <= soonLimit) expiringSoonDocs++;
      }
    }

    const missingCounts = new Map<string, number>();
    let complete = 0;
    let percentSum = 0;
    const totalRequired = REQUIRED.length;

    for (const eid of empIds) {
      const have = byEmp.get(eid) || new Set();
      let uploaded = 0;
      for (const req of REQUIRED) {
        if (have.has(req)) uploaded++;
        else missingCounts.set(req, (missingCounts.get(req) || 0) + 1);
      }
      const pct = totalRequired ? Math.round((uploaded / totalRequired) * 100) : 100;
      percentSum += pct;
      if (uploaded >= totalRequired) complete++;
    }

    const labelMap = Object.fromEntries(
      REQUIRED_DOCUMENT_TYPES.map((t) => [t.value.toUpperCase(), t.label]),
    );
    const topMissing = [...missingCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({
        type,
        label: labelMap[type] || type,
        count,
      }));

    return {
      activeEmployees,
      complete,
      incomplete: activeEmployees - complete,
      avgPercent: activeEmployees ? Math.round(percentSum / activeEmployees) : 0,
      expiredDocs,
      expiringSoonDocs,
      requiredTypes: REQUIRED,
      topMissing,
    };
  } catch (e: any) {
    console.warn('[doc-compliance]', e?.message || e);
    return empty;
  }
}
