/**
 * Sync employee contract documents ↔ employee_contracts for unified history.
 * When HR uploads KONTRAK_KERJA / PKWT / PKWTT, upsert matching row in
 * employee_contracts (and optionally mirror snapshot fields on employees).
 *
 * All optional / schema-flexible queries run inside SAVEPOINT so a missing
 * column cannot abort the request-bound RLS transaction (which would roll
 * back the document INSERT while the API still returns success).
 */
import { safeQueryWithSavepoint, withDbSavepoint } from '../saas/tenant-request-bound';

export const CONTRACT_DOCUMENT_TYPES = new Set(['KONTRAK_KERJA', 'PKWT', 'PKWTT']);

function asUuidOrNull(value?: string | null): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) {
    return null;
  }
  return s;
}

function mapDocTypeToContractType(documentType: string, empHint?: string | null): string {
  if (documentType === 'PKWT' || documentType === 'PKWTT') return documentType;
  const hint = String(empHint || '').toUpperCase();
  if (['PKWT', 'PKWTT', 'MAGANG', 'FREELANCE'].includes(hint)) return hint;
  return 'PKWT';
}

export function isContractDocumentType(documentType: string | null | undefined): boolean {
  return CONTRACT_DOCUMENT_TYPES.has(String(documentType || '').toUpperCase());
}

/** Lean prod `employees` historically lacked these — add without aborting the request TX. */
export async function ensureEmployeeContractSnapshotColumns(sequelize: any): Promise<void> {
  if (!sequelize) return;
  await withDbSavepoint(sequelize, async () => {
    await sequelize.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20)`);
    await sequelize.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_start DATE`);
    await sequelize.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_end DATE`);
    await sequelize.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_number VARCHAR(100)`);
  }, 'emp_contract_cols');
}

async function mirrorEmployeeContractSnapshot(
  sequelize: any,
  employeeId: string | number,
  snap: {
    contractNumber?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    contractType?: string | null;
  },
) {
  await ensureEmployeeContractSnapshotColumns(sequelize);
  await withDbSavepoint(sequelize, async () => {
    await sequelize.query(
      `UPDATE employees SET
         contract_number = COALESCE(:contractNumber, contract_number),
         contract_start = COALESCE(:startDate, contract_start),
         contract_end = COALESCE(:endDate, contract_end),
         contract_type = COALESCE(:contractType, contract_type),
         updated_at = NOW()
       WHERE id = :employeeId`,
      {
        replacements: {
          employeeId,
          contractNumber: snap.contractNumber || null,
          startDate: snap.startDate || null,
          endDate: snap.endDate || null,
          contractType: snap.contractType || null,
        },
      },
    );
  }, 'emp_contract_snap');
}

export async function syncContractFromDocument(opts: {
  sequelize: any;
  tenantId: string | null;
  employeeId: string | number;
  document: {
    id: string;
    document_type?: string;
    document_number?: string | null;
    title?: string | null;
    issue_date?: string | null;
    expiry_date?: string | null;
  };
  createdBy?: string | null;
}): Promise<{ action: 'created' | 'updated' | 'skipped'; contractId?: string } | null> {
  const { sequelize, tenantId, employeeId, document, createdBy } = opts;
  if (!sequelize || !document?.id) return null;

  const docType = String(document.document_type || '').toUpperCase();
  if (!isContractDocumentType(docType)) return { action: 'skipped' };

  const documentId = String(document.id);
  const documentNumber = String(document.document_number || '').trim() || null;
  const startDate = document.issue_date || new Date().toISOString().slice(0, 10);
  const endDate = document.expiry_date || null;
  const notes = document.title
    ? `Disinkron dari dokumen: ${document.title}`
    : 'Disinkron dari upload dokumen kontrak';

  try {
    await ensureEmployeeContractSnapshotColumns(sequelize);

    let empRows = await safeQueryWithSavepoint(
      sequelize,
      `SELECT id, position, department, contract_type, branch_id
       FROM employees WHERE id = :employeeId ${tenantId ? 'AND tenant_id = :tenantId' : ''} LIMIT 1`,
      { employeeId, tenantId },
      'emp_for_contract',
    );
    if (!empRows.length) {
      empRows = await safeQueryWithSavepoint(
        sequelize,
        `SELECT id, position, department, branch_id FROM employees WHERE id = :employeeId LIMIT 1`,
        { employeeId },
        'emp_for_contract_lean',
      );
    }
    const emp = empRows[0] || null;

    const contractType = mapDocTypeToContractType(docType, emp?.contract_type);
    const position = emp?.position || null;
    const department = emp?.department || null;
    const branchId = emp?.branch_id || null;

    let existing = (await safeQueryWithSavepoint(
      sequelize,
      `SELECT id FROM employee_contracts
       WHERE document_id = :documentId ${tenantId ? 'AND tenant_id = :tenantId' : ''} LIMIT 1`,
      { documentId, tenantId },
      'contract_by_doc',
    ))[0] || null;

    if (!existing && documentNumber) {
      existing = (await safeQueryWithSavepoint(
        sequelize,
        `SELECT id FROM employee_contracts
         WHERE employee_id = :employeeId AND contract_number = :documentNumber
           ${tenantId ? 'AND tenant_id = :tenantId' : ''}
         ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC
         LIMIT 1`,
        { employeeId, documentNumber, tenantId },
        'contract_by_num',
      ))[0] || null;
    }

    if (!existing) {
      existing = (await safeQueryWithSavepoint(
        sequelize,
        `SELECT id FROM employee_contracts
         WHERE employee_id = :employeeId AND status = 'active' AND contract_type = :contractType
           ${tenantId ? 'AND tenant_id = :tenantId' : ''}
         ORDER BY created_at DESC LIMIT 1`,
        { employeeId, contractType, tenantId },
        'contract_by_active',
      ))[0] || null;
    }

    const snap = {
      contractNumber: documentNumber,
      startDate,
      endDate,
      contractType,
    };

    if (existing?.id) {
      const withDoc = await withDbSavepoint(sequelize, async () => {
        await sequelize.query(
          `UPDATE employee_contracts SET
             contract_number = COALESCE(:documentNumber, contract_number),
             start_date = :startDate,
             end_date = :endDate,
             contract_type = :contractType,
             document_id = :documentId,
             position = COALESCE(:position, position),
             department = COALESCE(:department, department),
             notes = CASE WHEN notes IS NULL OR notes = '' THEN :notes ELSE notes END,
             updated_at = NOW()
           WHERE id = :id`,
          {
            replacements: {
              id: existing.id,
              documentNumber,
              startDate,
              endDate,
              contractType,
              documentId,
              position,
              department,
              notes,
            },
          },
        );
        return true;
      }, 'contract_upd');
      if (!withDoc) {
        await withDbSavepoint(sequelize, async () => {
          await sequelize.query(
            `UPDATE employee_contracts SET
               contract_number = COALESCE(:documentNumber, contract_number),
               start_date = :startDate,
               end_date = :endDate,
               contract_type = :contractType,
               position = COALESCE(:position, position),
               department = COALESCE(:department, department),
               updated_at = NOW()
             WHERE id = :id`,
            {
              replacements: {
                id: existing.id,
                documentNumber,
                startDate,
                endDate,
                contractType,
                position,
                department,
              },
            },
          );
        }, 'contract_upd_nodoc');
      }
      await mirrorEmployeeContractSnapshot(sequelize, employeeId, snap);
      return { action: 'updated', contractId: String(existing.id) };
    }

    if (documentNumber) {
      await withDbSavepoint(sequelize, async () => {
        await sequelize.query(
          `UPDATE employee_contracts SET status = 'renewed', updated_at = NOW()
           WHERE employee_id = :employeeId AND status = 'active'
             ${tenantId ? 'AND tenant_id = :tenantId' : ''}`,
          { replacements: { employeeId, tenantId } },
        );
      }, 'contract_renew_mark');
    }

    const insertReplacements = {
      tenantId: asUuidOrNull(tenantId),
      employeeId,
      contractType,
      documentNumber,
      startDate,
      endDate,
      position,
      department,
      branchId: asUuidOrNull(branchId),
      documentId,
      notes,
      createdBy: asUuidOrNull(createdBy),
    };

    let created = await withDbSavepoint(sequelize, async () => {
      const [ins]: any = await sequelize.query(
        `INSERT INTO employee_contracts (
           id, tenant_id, employee_id, contract_type, contract_number,
           start_date, end_date, status, position, department, branch_id,
           document_id, notes, created_by, created_at, updated_at
         ) VALUES (
           uuid_generate_v4(), :tenantId, :employeeId, :contractType, :documentNumber,
           :startDate, :endDate, 'active', :position, :department, :branchId,
           :documentId, :notes, :createdBy, NOW(), NOW()
         ) RETURNING id`,
        { replacements: insertReplacements },
      );
      return ins?.[0] || null;
    }, 'contract_ins');

    if (!created?.id) {
      created = await withDbSavepoint(sequelize, async () => {
        const [ins]: any = await sequelize.query(
          `INSERT INTO employee_contracts (
             id, tenant_id, employee_id, contract_type, contract_number,
             start_date, end_date, status, position, department, branch_id,
             notes, created_by, created_at, updated_at
           ) VALUES (
             uuid_generate_v4(), :tenantId, :employeeId, :contractType, :documentNumber,
             :startDate, :endDate, 'active', :position, :department, :branchId,
             :notes, :createdBy, NOW(), NOW()
           ) RETURNING id`,
          { replacements: insertReplacements },
        );
        return ins?.[0] || null;
      }, 'contract_ins_nodoc');
    }

    if (!created?.id) return { action: 'skipped' };

    await mirrorEmployeeContractSnapshot(sequelize, employeeId, snap);
    return { action: 'created', contractId: String(created.id) };
  } catch (e: any) {
    console.warn('[contract-document-sync]', e?.message || e);
    return { action: 'skipped' };
  }
}
