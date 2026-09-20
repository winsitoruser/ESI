/**
 * Workforce compliance API — SSU policy, TKA permits, outsourcing vendors/placements.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';
import {
  defaultSsuPolicy,
  SSU_COMPLIANCE_CHECKLIST,
  SSU_DEFAULT_GRADE_TEMPLATES,
  SSU_METHODS,
  SSU_REGULATION,
  SSU_STRUCTURE_TYPES,
  ssuComplianceScore,
  validateAgainstMinimumWage,
  validateGradeBand,
  type SsuPolicy,
} from '@/lib/hris/ssu-standards';
import {
  derivePermitStatus,
  OUTSOURCE_VENDOR_TYPES,
  TKA_PERMIT_TYPES,
  WORKFORCE_SEGMENTS,
  type TkaPermitStatus,
} from '@/lib/hris/workforce-categories';

let sequelize: any;
try { sequelize = require('@/lib/sequelize'); } catch {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ensureTables() {
  if (!sequelize) return false;
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS wage_structure_policies (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'draft',
      method VARCHAR(40) NOT NULL DEFAULT 'ranking_sederhana',
      structure_type VARCHAR(40) NOT NULL DEFAULT 'traditional',
      decision_number VARCHAR(120),
      decision_date DATE,
      decided_by VARCHAR(160),
      effective_from DATE,
      next_review_date DATE,
      ump_reference NUMERIC(15,2),
      umk_region VARCHAR(120),
      notes TEXT,
      notified_at TIMESTAMPTZ,
      notified_method VARCHAR(40),
      attached_to_pp_pkb BOOLEAN DEFAULT false,
      statement_letter_url TEXT,
      checklist JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_wage_structure_policies_tenant
    ON wage_structure_policies (tenant_id)
  `).catch(() => {});

  // Enrich job_grades for Permenaker factors
  for (const col of [
    `ALTER TABLE job_grades ADD COLUMN IF NOT EXISTS mid_salary DECIMAL(15,2) DEFAULT 0`,
    `ALTER TABLE job_grades ADD COLUMN IF NOT EXISTS education_req VARCHAR(80)`,
    `ALTER TABLE job_grades ADD COLUMN IF NOT EXISTS experience_years_min INTEGER DEFAULT 0`,
    `ALTER TABLE job_grades ADD COLUMN IF NOT EXISTS competency_notes TEXT`,
    `ALTER TABLE job_grades ADD COLUMN IF NOT EXISTS job_family VARCHAR(80)`,
  ]) {
    await sequelize.query(col).catch(() => {});
  }

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS tka_permits (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL,
      employee_id UUID,
      employee_name VARCHAR(200),
      nationality VARCHAR(80),
      passport_number VARCHAR(80),
      position VARCHAR(160),
      permit_type VARCHAR(40) NOT NULL,
      permit_number VARCHAR(120),
      issued_by VARCHAR(160),
      issued_date DATE,
      expiry_date DATE,
      status VARCHAR(32) DEFAULT 'draft',
      notes TEXT,
      document_url TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tka_permits_tenant ON tka_permits(tenant_id)`).catch(() => {});
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tka_permits_expiry ON tka_permits(tenant_id, expiry_date)`).catch(() => {});

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS outsourcing_vendors (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL,
      code VARCHAR(40),
      name VARCHAR(200) NOT NULL,
      vendor_type VARCHAR(40) DEFAULT 'pkwt_provider',
      npwp VARCHAR(40),
      license_number VARCHAR(120),
      license_expiry DATE,
      contact_name VARCHAR(120),
      contact_phone VARCHAR(60),
      contact_email VARCHAR(160),
      address TEXT,
      contract_number VARCHAR(120),
      contract_start DATE,
      contract_end DATE,
      service_scope TEXT,
      is_active BOOLEAN DEFAULT true,
      notes TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_outsourcing_vendors_tenant ON outsourcing_vendors(tenant_id)`).catch(() => {});

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS outsourcing_placements (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL,
      vendor_id UUID REFERENCES outsourcing_vendors(id) ON DELETE SET NULL,
      employee_id UUID,
      worker_name VARCHAR(200) NOT NULL,
      worker_nik VARCHAR(40),
      position VARCHAR(160),
      department VARCHAR(120),
      site_location VARCHAR(200),
      start_date DATE,
      end_date DATE,
      bill_rate NUMERIC(15,2),
      pay_rate NUMERIC(15,2),
      status VARCHAR(32) DEFAULT 'active',
      notes TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_outsourcing_placements_tenant ON outsourcing_placements(tenant_id)`).catch(() => {});

  return true;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const tenantId = tenantIdFromSession(session);
    if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });

    const action = String(req.query.action || '');

    if (req.method === 'GET') {
      if (action === 'catalog') return res.json({
        success: true,
        data: {
          regulation: SSU_REGULATION,
          methods: SSU_METHODS,
          structureTypes: SSU_STRUCTURE_TYPES,
          checklist: SSU_COMPLIANCE_CHECKLIST,
          gradeTemplates: SSU_DEFAULT_GRADE_TEMPLATES,
          tkaPermitTypes: TKA_PERMIT_TYPES,
          vendorTypes: OUTSOURCE_VENDOR_TYPES,
          segments: WORKFORCE_SEGMENTS,
        },
      });
      if (action === 'overview') return getOverview(res, tenantId);
      if (action === 'ssu-policy') return getSsuPolicy(res, tenantId);
      if (action === 'tka-permits') return listTka(res, tenantId, req);
      if (action === 'outsourcing-vendors') return listVendors(res, tenantId);
      if (action === 'outsourcing-placements') return listPlacements(res, tenantId, req);
      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'ssu-policy') return saveSsuPolicy(req, res, tenantId);
      if (action === 'seed-ssu-grades') return seedSsuGrades(req, res, tenantId);
      if (action === 'tka-permit') return upsertTka(req, res, tenantId);
      if (action === 'outsourcing-vendor') return upsertVendor(req, res, tenantId);
      if (action === 'outsourcing-placement') return upsertPlacement(req, res, tenantId);
      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    if (req.method === 'DELETE') {
      if (action === 'tka-permit') return deleteRow(res, tenantId, 'tka_permits', req.body?.id);
      if (action === 'outsourcing-vendor') return softDeleteVendor(res, tenantId, req.body?.id);
      if (action === 'outsourcing-placement') return deleteRow(res, tenantId, 'outsourcing_placements', req.body?.id);
      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    console.warn('workforce-compliance error:', e?.message || e);
    return res.status(500).json({ success: false, error: e?.message || 'Internal error' });
  }
}

export default withHQAuth(handler, { module: 'hris' });

async function getOverview(res: NextApiResponse, tenantId: string) {
  if (!sequelize) {
    return res.json({
      success: true,
      data: emptyOverview(),
      dataSource: 'empty',
    });
  }
  await ensureTables();

  const [[policy]] = await sequelize.query(
    `SELECT * FROM wage_structure_policies WHERE tenant_id = :tenantId LIMIT 1`,
    { replacements: { tenantId } },
  );
  const score = ssuComplianceScore(policy?.checklist);

  const [[grades]] = await sequelize.query(
    `SELECT COUNT(*)::int AS c FROM job_grades WHERE tenant_id = :tenantId AND COALESCE(is_active,true) = true`,
    { replacements: { tenantId } },
  );

  const [[tkaActive]] = await sequelize.query(
    `SELECT COUNT(*)::int AS c FROM tka_permits WHERE tenant_id = :tenantId AND status NOT IN ('revoked','expired','draft')`,
    { replacements: { tenantId } },
  );
  const [[tkaExpiring]] = await sequelize.query(
    `SELECT COUNT(*)::int AS c FROM tka_permits
     WHERE tenant_id = :tenantId
       AND expiry_date IS NOT NULL
       AND expiry_date <= (CURRENT_DATE + INTERVAL '60 days')
       AND expiry_date >= CURRENT_DATE
       AND status NOT IN ('revoked','expired')`,
    { replacements: { tenantId } },
  );

  const [[vendors]] = await sequelize.query(
    `SELECT COUNT(*)::int AS c FROM outsourcing_vendors WHERE tenant_id = :tenantId AND COALESCE(is_active,true) = true`,
    { replacements: { tenantId } },
  );
  const [[placements]] = await sequelize.query(
    `SELECT COUNT(*)::int AS c FROM outsourcing_placements WHERE tenant_id = :tenantId AND status = 'active'`,
    { replacements: { tenantId } },
  );

  let outsourceEmployees = 0;
  let foreignEmployees = 0;
  try {
    const [[o]] = await sequelize.query(
      `SELECT COUNT(*)::int AS c FROM employees
       WHERE tenant_id = :tenantId AND COALESCE(is_active,true) = true
         AND employment_category = 'outsource'`,
      { replacements: { tenantId } },
    );
    outsourceEmployees = o?.c || 0;
  } catch { /* column may not exist */ }
  try {
    const [[f]] = await sequelize.query(
      `SELECT COUNT(*)::int AS c FROM employees
       WHERE tenant_id = :tenantId AND COALESCE(is_active,true) = true
         AND (employment_category = 'foreign'
           OR LOWER(COALESCE(nationality,'')) NOT IN ('','indonesia','idn','wni','id'))`,
      { replacements: { tenantId } },
    );
    foreignEmployees = f?.c || 0;
  } catch { /* optional cols */ }

  return res.json({
    success: true,
    data: {
      ssu: {
        status: policy?.status || 'draft',
        method: policy?.method || 'ranking_sederhana',
        structureType: policy?.structure_type || 'traditional',
        decisionNumber: policy?.decision_number || null,
        compliancePct: score.pct,
        complianceDone: score.done,
        complianceTotal: score.total,
        gradeCount: grades?.c || 0,
        nextReviewDate: policy?.next_review_date || null,
        notifiedAt: policy?.notified_at || null,
      },
      tka: {
        permitsActive: tkaActive?.c || 0,
        permitsExpiring: tkaExpiring?.c || 0,
        employeesFlagged: foreignEmployees,
      },
      outsourcing: {
        vendors: vendors?.c || 0,
        activePlacements: placements?.c || 0,
        employeesCategory: outsourceEmployees,
      },
    },
    dataSource: 'live',
  });
}

function emptyOverview() {
  return {
    ssu: { status: 'draft', method: 'ranking_sederhana', structureType: 'traditional', decisionNumber: null, compliancePct: 0, complianceDone: 0, complianceTotal: SSU_COMPLIANCE_CHECKLIST.length, gradeCount: 0, nextReviewDate: null, notifiedAt: null },
    tka: { permitsActive: 0, permitsExpiring: 0, employeesFlagged: 0 },
    outsourcing: { vendors: 0, activePlacements: 0, employeesCategory: 0 },
  };
}

async function getSsuPolicy(res: NextApiResponse, tenantId: string) {
  if (!sequelize) {
    return res.json({ success: true, data: mapPolicy(defaultSsuPolicy()), dataSource: 'empty' });
  }
  await ensureTables();
  const [[row]] = await sequelize.query(
    `SELECT * FROM wage_structure_policies WHERE tenant_id = :tenantId LIMIT 1`,
    { replacements: { tenantId } },
  );
  const policy = row ? mapPolicyRow(row) : defaultSsuPolicy();
  const score = ssuComplianceScore(policy.checklist);
  return res.json({
    success: true,
    data: { ...policy, compliance: score },
    regulation: SSU_REGULATION,
    dataSource: row ? 'live' : 'empty',
  });
}

function mapPolicy(p: SsuPolicy) {
  return { ...p, compliance: ssuComplianceScore(p.checklist) };
}

function mapPolicyRow(row: any): SsuPolicy {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    status: row.status || 'draft',
    method: row.method || 'ranking_sederhana',
    structureType: row.structure_type || 'traditional',
    decisionNumber: row.decision_number || undefined,
    decisionDate: row.decision_date || undefined,
    decidedBy: row.decided_by || undefined,
    effectiveFrom: row.effective_from || undefined,
    nextReviewDate: row.next_review_date || undefined,
    umpReference: row.ump_reference != null ? Number(row.ump_reference) : undefined,
    umkRegion: row.umk_region || undefined,
    notes: row.notes || undefined,
    notifiedAt: row.notified_at || undefined,
    notifiedMethod: row.notified_method || undefined,
    attachedToPpPkb: Boolean(row.attached_to_pp_pkb),
    statementLetterUrl: row.statement_letter_url || undefined,
    checklist: typeof row.checklist === 'object' && row.checklist ? row.checklist : {},
    updatedAt: row.updated_at || undefined,
  };
}

async function saveSsuPolicy(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  if (!sequelize) return res.status(503).json({ success: false, error: 'Database tidak tersedia' });
  await ensureTables();
  const b = req.body || {};
  const checklist = b.checklist && typeof b.checklist === 'object' ? b.checklist : {};

  const [[existing]] = await sequelize.query(
    `SELECT id FROM wage_structure_policies WHERE tenant_id = :tenantId LIMIT 1`,
    { replacements: { tenantId } },
  );

  const params = {
    tenantId,
    status: String(b.status || 'draft').slice(0, 32),
    method: String(b.method || 'ranking_sederhana').slice(0, 40),
    structureType: String(b.structureType || b.structure_type || 'traditional').slice(0, 40),
    decisionNumber: b.decisionNumber || b.decision_number || null,
    decisionDate: b.decisionDate || b.decision_date || null,
    decidedBy: b.decidedBy || b.decided_by || null,
    effectiveFrom: b.effectiveFrom || b.effective_from || null,
    nextReviewDate: b.nextReviewDate || b.next_review_date || null,
    umpReference: b.umpReference ?? b.ump_reference ?? null,
    umkRegion: b.umkRegion || b.umk_region || null,
    notes: b.notes || null,
    notifiedAt: b.notifiedAt || b.notified_at || null,
    notifiedMethod: b.notifiedMethod || b.notified_method || null,
    attachedToPpPkb: b.attachedToPpPkb ?? b.attached_to_pp_pkb ?? false,
    statementLetterUrl: b.statementLetterUrl || b.statement_letter_url || null,
    checklist: JSON.stringify(checklist),
  };

  if (existing?.id) {
    await sequelize.query(`
      UPDATE wage_structure_policies SET
        status = :status, method = :method, structure_type = :structureType,
        decision_number = :decisionNumber, decision_date = :decisionDate, decided_by = :decidedBy,
        effective_from = :effectiveFrom, next_review_date = :nextReviewDate,
        ump_reference = :umpReference, umk_region = :umkRegion, notes = :notes,
        notified_at = :notifiedAt, notified_method = :notifiedMethod,
        attached_to_pp_pkb = :attachedToPpPkb, statement_letter_url = :statementLetterUrl,
        checklist = CAST(:checklist AS jsonb), updated_at = NOW()
      WHERE tenant_id = :tenantId
    `, { replacements: params });
  } else {
    await sequelize.query(`
      INSERT INTO wage_structure_policies (
        tenant_id, status, method, structure_type, decision_number, decision_date, decided_by,
        effective_from, next_review_date, ump_reference, umk_region, notes,
        notified_at, notified_method, attached_to_pp_pkb, statement_letter_url, checklist
      ) VALUES (
        :tenantId, :status, :method, :structureType, :decisionNumber, :decisionDate, :decidedBy,
        :effectiveFrom, :nextReviewDate, :umpReference, :umkRegion, :notes,
        :notifiedAt, :notifiedMethod, :attachedToPpPkb, :statementLetterUrl, CAST(:checklist AS jsonb)
      )
    `, { replacements: params });
  }

  return getSsuPolicy(res, tenantId);
}

async function seedSsuGrades(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  if (!sequelize) return res.status(503).json({ success: false, error: 'Database tidak tersedia' });
  await ensureTables();

  const replace = Boolean(req.body?.replace);
  const ump = Number(req.body?.umpReference || req.body?.ump_reference || 0) || 0;

  if (!replace) {
    const [[c]] = await sequelize.query(
      `SELECT COUNT(*)::int AS c FROM job_grades WHERE tenant_id = :tenantId AND COALESCE(is_active,true) = true`,
      { replacements: { tenantId } },
    );
    if ((c?.c || 0) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Golongan sudah ada. Kirim replace:true untuk menonaktifkan yang lama dan seed template SSU.',
      });
    }
  } else {
    await sequelize.query(
      `UPDATE job_grades SET is_active = false, updated_at = NOW() WHERE tenant_id = :tenantId`,
      { replacements: { tenantId } },
    );
  }

  let inserted = 0;
  for (const g of SSU_DEFAULT_GRADE_TEMPLATES) {
    let min = g.minSalary;
    if (ump > 0 && min < ump) min = ump;
    const mid = Math.max(min, g.midSalary);
    const max = Math.max(mid, g.maxSalary);
    const err = validateGradeBand(min, mid, max) || validateAgainstMinimumWage(min, ump || null);
    if (err) continue;

    await sequelize.query(`
      INSERT INTO job_grades (
        tenant_id, code, name, level, min_salary, mid_salary, max_salary,
        education_req, experience_years_min, competency_notes, description, is_active, sort_order
      ) VALUES (
        :tenantId, :code, :name, :level, :min, :mid, :max,
        :edu, :exp, :comp, :desc, true, :level
      )
    `, {
      replacements: {
        tenantId, code: g.code, name: g.name, level: g.level,
        min, mid, max,
        edu: g.educationHint, exp: g.experienceYearsMin,
        comp: g.competencyHint, desc: g.description,
      },
    });
    inserted++;
  }

  return res.json({
    success: true,
    message: `${inserted} golongan template SSU (Permenaker 1/2017) ditambahkan`,
    data: { inserted },
  });
}

async function listTka(res: NextApiResponse, tenantId: string, req: NextApiRequest) {
  if (!sequelize) return res.json({ success: true, data: [], dataSource: 'empty' });
  await ensureTables();
  const status = req.query.status ? String(req.query.status) : '';
  let where = 'WHERE tenant_id = :tenantId';
  const replacements: any = { tenantId };
  if (status && status !== 'all') {
    where += ' AND status = :status';
    replacements.status = status;
  }
  const [rows] = await sequelize.query(
    `SELECT * FROM tka_permits ${where} ORDER BY expiry_date NULLS LAST, updated_at DESC LIMIT 300`,
    { replacements },
  );
  const data = (rows || []).map((r: any) => ({
    ...r,
    derived_status: derivePermitStatus(r.expiry_date, r.status as TkaPermitStatus),
  }));
  return res.json({ success: true, data, dataSource: 'live' });
}

async function upsertTka(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  if (!sequelize) return res.status(503).json({ success: false, error: 'Database tidak tersedia' });
  await ensureTables();
  const b = req.body || {};
  if (!b.permit_type && !b.permitType) {
    return res.status(400).json({ success: false, error: 'Jenis izin wajib' });
  }
  const permitType = b.permit_type || b.permitType;
  const expiry = b.expiry_date || b.expiryDate || null;
  const status = derivePermitStatus(expiry, b.status || 'active');
  const id = b.id && UUID_RE.test(b.id) ? b.id : null;

  const params = {
    tenantId,
    id,
    employeeId: b.employee_id || b.employeeId || null,
    employeeName: b.employee_name || b.employeeName || null,
    nationality: b.nationality || null,
    passportNumber: b.passport_number || b.passportNumber || null,
    position: b.position || null,
    permitType,
    permitNumber: b.permit_number || b.permitNumber || null,
    issuedBy: b.issued_by || b.issuedBy || null,
    issuedDate: b.issued_date || b.issuedDate || null,
    expiryDate: expiry,
    status,
    notes: b.notes || null,
    documentUrl: b.document_url || b.documentUrl || null,
  };

  if (id) {
    await sequelize.query(`
      UPDATE tka_permits SET
        employee_id = :employeeId, employee_name = :employeeName, nationality = :nationality,
        passport_number = :passportNumber, position = :position, permit_type = :permitType,
        permit_number = :permitNumber, issued_by = :issuedBy, issued_date = :issuedDate,
        expiry_date = :expiryDate, status = :status, notes = :notes, document_url = :documentUrl,
        updated_at = NOW()
      WHERE id = :id AND tenant_id = :tenantId
    `, { replacements: params });
    return res.json({ success: true, message: 'Izin TKA diperbarui' });
  }

  const [ins] = await sequelize.query(`
    INSERT INTO tka_permits (
      tenant_id, employee_id, employee_name, nationality, passport_number, position,
      permit_type, permit_number, issued_by, issued_date, expiry_date, status, notes, document_url
    ) VALUES (
      :tenantId, :employeeId, :employeeName, :nationality, :passportNumber, :position,
      :permitType, :permitNumber, :issuedBy, :issuedDate, :expiryDate, :status, :notes, :documentUrl
    ) RETURNING *
  `, { replacements: params });
  return res.json({ success: true, data: ins?.[0], message: 'Izin TKA ditambahkan' });
}

async function listVendors(res: NextApiResponse, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: [], dataSource: 'empty' });
  await ensureTables();
  const [rows] = await sequelize.query(`
    SELECT v.*,
      (SELECT COUNT(*)::int FROM outsourcing_placements p
       WHERE p.vendor_id = v.id AND p.status = 'active') AS active_placements
    FROM outsourcing_vendors v
    WHERE v.tenant_id = :tenantId AND COALESCE(v.is_active, true) = true
    ORDER BY v.name ASC
  `, { replacements: { tenantId } });
  return res.json({ success: true, data: rows || [], dataSource: 'live' });
}

async function upsertVendor(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  if (!sequelize) return res.status(503).json({ success: false, error: 'Database tidak tersedia' });
  await ensureTables();
  const b = req.body || {};
  const name = String(b.name || '').trim();
  if (!name) return res.status(400).json({ success: false, error: 'Nama vendor wajib' });
  const id = b.id && UUID_RE.test(b.id) ? b.id : null;
  const params = {
    tenantId, id, name,
    code: b.code || null,
    vendorType: b.vendor_type || b.vendorType || 'pkwt_provider',
    npwp: b.npwp || null,
    licenseNumber: b.license_number || b.licenseNumber || null,
    licenseExpiry: b.license_expiry || b.licenseExpiry || null,
    contactName: b.contact_name || b.contactName || null,
    contactPhone: b.contact_phone || b.contactPhone || null,
    contactEmail: b.contact_email || b.contactEmail || null,
    address: b.address || null,
    contractNumber: b.contract_number || b.contractNumber || null,
    contractStart: b.contract_start || b.contractStart || null,
    contractEnd: b.contract_end || b.contractEnd || null,
    serviceScope: b.service_scope || b.serviceScope || null,
    notes: b.notes || null,
  };

  if (id) {
    await sequelize.query(`
      UPDATE outsourcing_vendors SET
        name = :name, code = :code, vendor_type = :vendorType, npwp = :npwp,
        license_number = :licenseNumber, license_expiry = :licenseExpiry,
        contact_name = :contactName, contact_phone = :contactPhone, contact_email = :contactEmail,
        address = :address, contract_number = :contractNumber, contract_start = :contractStart,
        contract_end = :contractEnd, service_scope = :serviceScope, notes = :notes, updated_at = NOW()
      WHERE id = :id AND tenant_id = :tenantId
    `, { replacements: params });
    return res.json({ success: true, message: 'Vendor diperbarui' });
  }

  const [ins] = await sequelize.query(`
    INSERT INTO outsourcing_vendors (
      tenant_id, code, name, vendor_type, npwp, license_number, license_expiry,
      contact_name, contact_phone, contact_email, address,
      contract_number, contract_start, contract_end, service_scope, notes
    ) VALUES (
      :tenantId, :code, :name, :vendorType, :npwp, :licenseNumber, :licenseExpiry,
      :contactName, :contactPhone, :contactEmail, :address,
      :contractNumber, :contractStart, :contractEnd, :serviceScope, :notes
    ) RETURNING *
  `, { replacements: params });
  return res.json({ success: true, data: ins?.[0], message: 'Vendor ditambahkan' });
}

async function listPlacements(res: NextApiResponse, tenantId: string, req: NextApiRequest) {
  if (!sequelize) return res.json({ success: true, data: [], dataSource: 'empty' });
  await ensureTables();
  const vendorId = req.query.vendorId || req.query.vendor_id;
  let where = 'WHERE p.tenant_id = :tenantId';
  const replacements: any = { tenantId };
  if (vendorId && UUID_RE.test(String(vendorId))) {
    where += ' AND p.vendor_id = :vendorId';
    replacements.vendorId = vendorId;
  }
  const [rows] = await sequelize.query(`
    SELECT p.*, v.name AS vendor_name, v.code AS vendor_code
    FROM outsourcing_placements p
    LEFT JOIN outsourcing_vendors v ON v.id = p.vendor_id
    ${where}
    ORDER BY p.start_date DESC NULLS LAST, p.worker_name ASC
    LIMIT 400
  `, { replacements });
  return res.json({ success: true, data: rows || [], dataSource: 'live' });
}

async function upsertPlacement(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  if (!sequelize) return res.status(503).json({ success: false, error: 'Database tidak tersedia' });
  await ensureTables();
  const b = req.body || {};
  const workerName = String(b.worker_name || b.workerName || '').trim();
  if (!workerName) return res.status(400).json({ success: false, error: 'Nama pekerja wajib' });
  const id = b.id && UUID_RE.test(b.id) ? b.id : null;
  const params = {
    tenantId, id,
    vendorId: b.vendor_id || b.vendorId || null,
    employeeId: b.employee_id || b.employeeId || null,
    workerName,
    workerNik: b.worker_nik || b.workerNik || null,
    position: b.position || null,
    department: b.department || null,
    siteLocation: b.site_location || b.siteLocation || null,
    startDate: b.start_date || b.startDate || null,
    endDate: b.end_date || b.endDate || null,
    billRate: b.bill_rate ?? b.billRate ?? null,
    payRate: b.pay_rate ?? b.payRate ?? null,
    status: b.status || 'active',
    notes: b.notes || null,
  };

  if (id) {
    await sequelize.query(`
      UPDATE outsourcing_placements SET
        vendor_id = :vendorId, employee_id = :employeeId, worker_name = :workerName,
        worker_nik = :workerNik, position = :position, department = :department,
        site_location = :siteLocation, start_date = :startDate, end_date = :endDate,
        bill_rate = :billRate, pay_rate = :payRate, status = :status, notes = :notes, updated_at = NOW()
      WHERE id = :id AND tenant_id = :tenantId
    `, { replacements: params });
    return res.json({ success: true, message: 'Penempatan diperbarui' });
  }

  const [ins] = await sequelize.query(`
    INSERT INTO outsourcing_placements (
      tenant_id, vendor_id, employee_id, worker_name, worker_nik, position, department,
      site_location, start_date, end_date, bill_rate, pay_rate, status, notes
    ) VALUES (
      :tenantId, :vendorId, :employeeId, :workerName, :workerNik, :position, :department,
      :siteLocation, :startDate, :endDate, :billRate, :payRate, :status, :notes
    ) RETURNING *
  `, { replacements: params });
  return res.json({ success: true, data: ins?.[0], message: 'Penempatan ditambahkan' });
}

async function deleteRow(res: NextApiResponse, tenantId: string, table: string, id: string) {
  if (!sequelize) return res.status(503).json({ success: false, error: 'Database tidak tersedia' });
  if (!id || !UUID_RE.test(id)) return res.status(400).json({ success: false, error: 'ID tidak valid' });
  if (!['tka_permits', 'outsourcing_placements'].includes(table)) {
    return res.status(400).json({ success: false, error: 'Tabel tidak diizinkan' });
  }
  await sequelize.query(`DELETE FROM ${table} WHERE id = :id AND tenant_id = :tenantId`, {
    replacements: { id, tenantId },
  });
  return res.json({ success: true, message: 'Dihapus' });
}

async function softDeleteVendor(res: NextApiResponse, tenantId: string, id: string) {
  if (!sequelize) return res.status(503).json({ success: false, error: 'Database tidak tersedia' });
  if (!id || !UUID_RE.test(id)) return res.status(400).json({ success: false, error: 'ID tidak valid' });
  await sequelize.query(
    `UPDATE outsourcing_vendors SET is_active = false, updated_at = NOW() WHERE id = :id AND tenant_id = :tenantId`,
    { replacements: { id, tenantId } },
  );
  return res.json({ success: true, message: 'Vendor dinonaktifkan' });
}
