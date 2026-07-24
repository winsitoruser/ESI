/**
 * Sync employee contract documents ↔ employee_contracts for unified history.
 * When HR uploads KONTRAK_KERJA / PKWT / PKWTT, upsert matching row in
 * employee_contracts (and optionally mirror snapshot fields on employees).
 */
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
  try {
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
  } catch {
    /* snapshot columns optional on some schemas */
  }
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
    let emp: any = null;
    try {
      const [rows]: any = await sequelize.query(
        `SELECT id, position, department, contract_type, branch_id
         FROM employees WHERE id = :employeeId ${tenantId ? 'AND tenant_id = :tenantId' : ''} LIMIT 1`,
        { replacements: { employeeId, tenantId } },
      );
      emp = rows?.[0] || null;
    } catch {
      try {
        const [rows]: any = await sequelize.query(
          `SELECT id, position, department, branch_id FROM employees WHERE id = :employeeId LIMIT 1`,
          { replacements: { employeeId } },
        );
        emp = rows?.[0] || null;
      } catch {
        emp = null;
      }
    }

    const contractType = mapDocTypeToContractType(docType, emp?.contract_type);
    const position = emp?.position || null;
    const department = emp?.department || null;
    const branchId = emp?.branch_id || null;

    let existing: any = null;
    try {
      const [byDoc]: any = await sequelize.query(
        `SELECT id FROM employee_contracts
         WHERE document_id = :documentId ${tenantId ? 'AND tenant_id = :tenantId' : ''} LIMIT 1`,
        { replacements: { documentId, tenantId } },
      );
      existing = byDoc?.[0] || null;
    } catch {
      /* document_id column may be missing */
    }

    if (!existing && documentNumber) {
      const [byNum]: any = await sequelize.query(
        `SELECT id FROM employee_contracts
         WHERE employee_id = :employeeId AND contract_number = :documentNumber
           ${tenantId ? 'AND tenant_id = :tenantId' : ''}
         ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC
         LIMIT 1`,
        { replacements: { employeeId, documentNumber, tenantId } },
      );
      existing = byNum?.[0] || null;
    }

    if (!existing) {
      const [byActive]: any = await sequelize.query(
        `SELECT id FROM employee_contracts
         WHERE employee_id = :employeeId AND status = 'active' AND contract_type = :contractType
           ${tenantId ? 'AND tenant_id = :tenantId' : ''}
         ORDER BY created_at DESC LIMIT 1`,
        { replacements: { employeeId, contractType, tenantId } },
      );
      existing = byActive?.[0] || null;
    }

    if (existing?.id) {
      try {
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
      } catch {
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
      }
      await mirrorEmployeeContractSnapshot(sequelize, employeeId, {
        contractNumber: documentNumber,
        startDate,
        endDate,
        contractType,
      });
      return { action: 'updated', contractId: String(existing.id) };
    }

    if (documentNumber) {
      try {
        await sequelize.query(
          `UPDATE employee_contracts SET status = 'renewed', updated_at = NOW()
           WHERE employee_id = :employeeId AND status = 'active'
             ${tenantId ? 'AND tenant_id = :tenantId' : ''}`,
          { replacements: { employeeId, tenantId } },
        );
      } catch {
        /* ignore */
      }
    }

    let created: any = null;
    try {
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
        {
          replacements: {
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
          },
        },
      );
      created = ins?.[0] || null;
    } catch {
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
        {
          replacements: {
            tenantId: asUuidOrNull(tenantId),
            employeeId,
            contractType,
            documentNumber,
            startDate,
            endDate,
            position,
            department,
            branchId: asUuidOrNull(branchId),
            notes,
            createdBy: asUuidOrNull(createdBy),
          },
        },
      );
      created = ins?.[0] || null;
    }

    if (!created?.id) return { action: 'skipped' };

    await mirrorEmployeeContractSnapshot(sequelize, employeeId, {
      contractNumber: documentNumber,
      startDate,
      endDate,
      contractType,
    });

    return { action: 'created', contractId: String(created.id) };
  } catch (e: any) {
    console.warn('[contract-document-sync]', e?.message || e);
    return { action: 'skipped' };
  }
}
