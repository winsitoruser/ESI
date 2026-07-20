import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import {
  getDefaultSOP,
  generateLetterNumber,
  computeExpiryDate,
  buildLetterDocumentData,
  buildDefaultDraftContent,
  validatePrerequisites,
  parseDraftContent,
  normalizeSOPTemplate,
  DEFAULT_SOP_TEMPLATES,
  type DisciplinaryLetterType,
  type LetterSOPTemplate,
} from '../../../lib/hris/disciplinary-workflow';
import { notifyEmployeeByEmployeeId } from '../../../lib/hris/employee-notifications';
import {
  notifyHRStaff,
  notifyDisciplinaryStakeholders,
} from '../../../lib/hris/disciplinary-notifications';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch (_) {}

const LETTER_SELECT = `
  SELECT dl.*, e.name as employee_name, e.employee_code, e.department, e.position,
    e.department as department_code,
    ru.name as requester_name, ru.email as requester_email
  FROM hr_disciplinary_letters dl
  LEFT JOIN employees e ON dl.employee_id::text = e.id::text
  LEFT JOIN users ru ON dl.requested_by = ru.id
`;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { action } = req.query;
    await ensureSchema();

    if (req.method === 'GET') {
      if (action === 'list') return listLetters(req, res, session);
      if (action === 'detail') return getDetail(req, res);
      if (action === 'letter-data') return getLetterData(req, res);
      if (action === 'sop-templates') return getSOPTemplates(req, res, session);
      if (action === 'sop-detail') return getSOPDetail(req, res);
      if (action === 'employee-history') return getEmployeeHistory(req, res);
      if (action === 'summary') return getSummary(req, res);
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'create') return createLetter(req, res, session);
      if (action === 'submit') return submitLetter(req, res, session);
      if (action === 'save-draft') return saveDraft(req, res, session);
      if (action === 'regenerate-draft') return regenerateDraft(req, res, session);
      if (action === 'approve') return approveStep(req, res, session);
      if (action === 'reject') return rejectLetter(req, res, session);
      if (action === 'issue') return issueLetter(req, res, session);
      if (action === 'acknowledge') return acknowledgeLetter(req, res, session);
      if (action === 'cancel') return cancelLetter(req, res, session);
      if (action === 'start-investigation') return startInvestigation(req, res, session);
      if (action === 'complete-investigation') return completeInvestigation(req, res, session);
      if (action === 'sop-template') return saveSOPTemplate(req, res, session);
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'PUT' && action === 'sop-template') return updateSOPTemplate(req, res, session);

    if (req.method === 'DELETE') {
      if (action === 'sop-template') return deleteSOPTemplate(req, res);
      if (action === 'letter') return cancelLetter(req, res, session);
      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.warn('Disciplinary letters API error:', error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || 'Internal server error' });
  }
}

export default withHQAuth(handler, { module: 'hris' });

function getTenantId(session: any): string | null {
  return tenantIdFromSession(session);
}

async function loadLetterScoped(id: string, session: any): Promise<any | null> {
  const tenantId = getTenantId(session);
  if (!tenantId || !sequelize) return null;
  const [letters] = await sequelize.query(
    `SELECT * FROM hr_disciplinary_letters WHERE id = :id AND tenant_id = :tenantId`,
    { replacements: { id, tenantId } },
  );
  return letters?.[0] || null;
}

function getUserId(session: any): number | null {
  const id = (session.user as any)?.id;
  return id ? parseInt(String(id), 10) : null;
}

async function ensureSchema() {
  if (!sequelize) return;
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hr_letter_sop_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      name VARCHAR(100) NOT NULL,
      letter_type VARCHAR(30) NOT NULL,
      description TEXT,
      phases JSONB NOT NULL DEFAULT '[]',
      approval_levels JSONB NOT NULL DEFAULT '[]',
      prerequisites JSONB DEFAULT '{}',
      validity_months INTEGER DEFAULT 6,
      is_active BOOLEAN DEFAULT true,
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hr_disciplinary_letters (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL,
      letter_type VARCHAR(30) NOT NULL,
      letter_number VARCHAR(50),
      reference_number VARCHAR(50),
      current_phase VARCHAR(30) DEFAULT 'request',
      status VARCHAR(30) DEFAULT 'draft',
      violation_type VARCHAR(50) DEFAULT 'discipline',
      violation_description TEXT,
      regulation_id UUID,
      previous_letter_id UUID,
      incident_date DATE,
      effective_date DATE,
      expiry_date DATE,
      request_reason TEXT,
      investigation_notes TEXT,
      draft_content JSONB DEFAULT '{}',
      requested_by INTEGER,
      drafted_by INTEGER,
      issued_by INTEGER,
      issued_at TIMESTAMPTZ,
      acknowledged BOOLEAN DEFAULT false,
      acknowledged_at TIMESTAMPTZ,
      sop_template_id UUID REFERENCES hr_letter_sop_templates(id),
      current_approval_step INTEGER DEFAULT 1,
      total_approval_steps INTEGER DEFAULT 1,
      related_case_id UUID,
      related_termination_id UUID,
      termination_type VARCHAR(30),
      severance_amount DECIMAL(15,2) DEFAULT 0,
      attachments JSONB DEFAULT '[]',
      audit_trail JSONB DEFAULT '[]',
      notes TEXT,
      e_file_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hr_disciplinary_approval_steps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      letter_id UUID NOT NULL REFERENCES hr_disciplinary_letters(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL DEFAULT 1,
      phase VARCHAR(30) DEFAULT 'approval',
      approver_id INTEGER,
      approver_role VARCHAR(50),
      approver_title VARCHAR(100),
      status VARCHAR(20) DEFAULT 'waiting',
      comments TEXT,
      acted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  try {
    const [cols] = await sequelize.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'hr_disciplinary_letters' AND column_name = 'employee_id'
    `);
    if (cols[0]?.data_type === 'integer') {
      await sequelize.query(`DELETE FROM hr_disciplinary_approval_steps`);
      await sequelize.query(`DELETE FROM hr_disciplinary_letters`);
      await sequelize.query(`ALTER TABLE hr_disciplinary_letters ALTER COLUMN employee_id TYPE UUID USING NULL`);
      await sequelize.query(`ALTER TABLE hr_disciplinary_letters ALTER COLUMN employee_id SET NOT NULL`);
    }
  } catch { /* noop */ }

  try {
    await sequelize.query(`
      ALTER TABLE hr_disciplinary_letters
      ADD COLUMN IF NOT EXISTS request_source VARCHAR(30) DEFAULT 'hr_direct'
    `);
  } catch { /* noop */ }

  try {
    const [existing] = await sequelize.query(`SELECT COUNT(*)::int as cnt FROM hr_letter_sop_templates`);
    if ((existing[0]?.cnt || 0) === 0) {
      for (const tpl of DEFAULT_SOP_TEMPLATES) {
        await sequelize.query(`
          INSERT INTO hr_letter_sop_templates (name, letter_type, description, phases, approval_levels, prerequisites, validity_months, is_active, is_default)
          VALUES (:name, :letterType, :description, :phases::jsonb, :approvalLevels::jsonb, :prerequisites::jsonb, :validityMonths, true, true)
        `, {
          replacements: {
            name: tpl.name,
            letterType: tpl.letterType,
            description: tpl.description,
            phases: JSON.stringify(tpl.phases),
            approvalLevels: JSON.stringify(tpl.approvalLevels),
            prerequisites: JSON.stringify(tpl.prerequisites),
            validityMonths: tpl.validityMonths,
          },
        });
      }
    }
  } catch (seedErr: any) {
    console.warn('[disciplinary] SOP seed skipped:', seedErr?.message || seedErr);
  }
}

async function getActiveSOP(letterType: DisciplinaryLetterType, tenantId: string | null): Promise<LetterSOPTemplate & { id?: string }> {
  if (!sequelize) return getDefaultSOP(letterType);
  try {
    if (!tenantId) return getDefaultSOP(letterType);
    const [rows] = await sequelize.query(`
      SELECT * FROM hr_letter_sop_templates
      WHERE letter_type = :letterType AND is_active = true
      AND tenant_id = :tenantId
      ORDER BY is_default DESC, created_at ASC LIMIT 1
    `, { replacements: { letterType, tenantId } });
    if (rows[0]) {
      const n = normalizeSOPTemplate(rows[0])!;
      return {
        id: n.id,
        name: n.name,
        letterType: n.letter_type as DisciplinaryLetterType,
        description: n.description,
        phases: n.phases,
        approvalLevels: n.approval_levels,
        prerequisites: n.prerequisites,
        validityMonths: n.validity_months,
      };
    }
  } catch { /* table may not exist */ }
  return getDefaultSOP(letterType);
}

async function fetchEmployee(employeeId: string) {
  const [rows] = await sequelize.query(`
    SELECT id, name, employee_code, department, position FROM employees WHERE id = :id
  `, { replacements: { id: employeeId } });
  return rows[0] || null;
}

async function appendAudit(letterId: string, entry: object) {
  await sequelize.query(`
    UPDATE hr_disciplinary_letters SET
      audit_trail = COALESCE(audit_trail, '[]'::jsonb) || :entry::jsonb,
      updated_at = NOW()
    WHERE id = :id
  `, { replacements: { id: letterId, entry: JSON.stringify(entry) } });
}

async function listLetters(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const tenantId = getTenantId(session);
  const { status, letter_type, employee_id, request_source } = req.query;
  let where = 'WHERE 1=1';
  const rep: any = {};
  if (tenantId) { where += ' AND dl.tenant_id = :tenantId'; rep.tenantId = tenantId; }
  if (status) { where += ' AND dl.status = :status'; rep.status = status; }
  if (letter_type) { where += ' AND dl.letter_type = :letter_type'; rep.letter_type = letter_type; }
  if (employee_id) { where += ' AND dl.employee_id = :employee_id'; rep.employee_id = employee_id; }
  if (request_source) { where += ' AND dl.request_source = :request_source'; rep.request_source = request_source; }

  const [rows] = await sequelize.query(`${LETTER_SELECT} ${where} ORDER BY dl.created_at DESC LIMIT 200`, { replacements: rep });
  return res.json({ success: true, data: rows || [] });
}

async function getDetail(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: null });
  const { id } = req.query;
  const [letters] = await sequelize.query(`${LETTER_SELECT} WHERE dl.id = :id`, { replacements: { id } });
  if (!letters[0]) return res.status(404).json({ success: false, error: 'Surat tidak ditemukan' });

  const letter = letters[0];
  letter.draft_content = parseDraftContent(letter.draft_content);

  const [steps] = await sequelize.query(`
    SELECT s.* FROM hr_disciplinary_approval_steps s
    WHERE s.letter_id = :id ORDER BY s.step_order
  `, { replacements: { id } });

  let sop = null;
  if (letter.sop_template_id) {
    const [sopRows] = await sequelize.query(`SELECT * FROM hr_letter_sop_templates WHERE id = :id`, { replacements: { id: letter.sop_template_id } });
    sop = normalizeSOPTemplate(sopRows[0]);
  }

  return res.json({ success: true, data: { ...letter, approval_steps: steps || [], sop_template: sop } });
}

async function getLetterData(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  const [letters] = await sequelize.query(`${LETTER_SELECT} WHERE dl.id = :id`, { replacements: { id } });
  if (!letters[0]) return res.status(404).json({ success: false, error: 'Not found' });
  const letter = letters[0];
  letter.draft_content = parseDraftContent(letter.draft_content);
  const letterData = buildLetterDocumentData(letter);
  const dc = parseDraftContent(letter.draft_content);
  if (dc.body) letterData.body = dc.body;
  if (dc.closing) letterData.closing = dc.closing;

  const { buildMergeContext, mergeLetterTexts, LETTER_MERGE_FIELDS } = await import('@/lib/hris/letter-merge-fields');
  const mergeContext = buildMergeContext({
    letterData: letterData as Record<string, unknown>,
    meta: {
      documentNumber: letter.letter_number || letter.reference_number,
      documentDate: letter.effective_date || letter.incident_date || new Date().toISOString().split('T')[0],
    },
  });
  const mergedTexts = mergeLetterTexts(
    {
      body: letterData.body as string | undefined,
      closing: letterData.closing as string | undefined,
      subject: (dc as any).subject || letterData.subject,
      salutation: (dc as any).salutation || letterData.salutation,
    },
    mergeContext,
  );

  return res.json({
    success: true,
    data: {
      letterData,
      draftContent: dc,
      mergeContext,
      mergedTexts,
      mergeFields: LETTER_MERGE_FIELDS,
      meta: {
        documentNumber: letter.letter_number || letter.reference_number,
        documentDate: letter.effective_date || letter.incident_date || new Date().toISOString().split('T')[0],
        title: letter.letter_type,
      },
      letterType: letter.letter_type,
    },
  });
}

async function getSOPTemplates(req: NextApiRequest, res: NextApiResponse, session: any) {
  const tenantId = getTenantId(session);
  if (!sequelize) {
    return res.json({ success: true, data: DEFAULT_SOP_TEMPLATES.map((t, i) => ({ ...t, id: `default-${i}`, letter_type: t.letterType, is_default: true })) });
  }
  if (!tenantId) {
    return res.json({
      success: true,
      data: DEFAULT_SOP_TEMPLATES.map((t, i) =>
        normalizeSOPTemplate({
          ...t,
          id: `default-${i}`,
          letter_type: t.letterType,
          approval_levels: t.approvalLevels,
          validity_months: t.validityMonths,
          is_default: true,
        })
      ),
    });
  }
  const [rows] = await sequelize.query(`
    SELECT * FROM hr_letter_sop_templates
    WHERE is_active = true AND tenant_id = :tenantId
    ORDER BY letter_type, is_default DESC, name ASC
  `, { replacements: { tenantId } });
  const data = (rows?.length ? rows : []).map(normalizeSOPTemplate).filter(Boolean);
  if (!data.length) {
    return res.json({ success: true, data: DEFAULT_SOP_TEMPLATES.map((t, i) => normalizeSOPTemplate({ ...t, id: `default-${i}`, letter_type: t.letterType, approval_levels: t.approvalLevels, validity_months: t.validityMonths, is_default: true })) });
  }
  return res.json({ success: true, data });
}

async function getSOPDetail(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });
  const [rows] = await sequelize.query(`SELECT * FROM hr_letter_sop_templates WHERE id = :id`, { replacements: { id } });
  if (!rows[0]) return res.status(404).json({ success: false, error: 'SOP not found' });
  return res.json({ success: true, data: normalizeSOPTemplate(rows[0]) });
}

async function getEmployeeHistory(req: NextApiRequest, res: NextApiResponse) {
  const { employee_id } = req.query;
  if (!employee_id) return res.status(400).json({ error: 'employee_id required' });
  if (!sequelize) return res.json({ success: true, data: [] });
  const [rows] = await sequelize.query(`
    SELECT id, letter_type, letter_number, reference_number, status,
      effective_date as issue_date, expiry_date, violation_type, violation_description, created_at
    FROM hr_disciplinary_letters WHERE employee_id = :employee_id
    ORDER BY created_at DESC
  `, { replacements: { employee_id } });
  return res.json({ success: true, data: rows || [] });
}

async function getSummary(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: { pending: 0, issued: 0, draft: 0, total: 0 } });
  const safeCount = async (sql: string) => {
    try {
      const [r] = await sequelize.query(sql);
      return parseInt(r[0]?.cnt || 0, 10);
    } catch { return 0; }
  };
  const pending = await safeCount(`SELECT COUNT(*) as cnt FROM hr_disciplinary_letters WHERE status IN ('submitted','investigating','drafting','review','pending_approval')`);
  const issued = await safeCount(`SELECT COUNT(*) as cnt FROM hr_disciplinary_letters WHERE status IN ('issued','acknowledged')`);
  const draft = await safeCount(`SELECT COUNT(*) as cnt FROM hr_disciplinary_letters WHERE status IN ('draft','drafting')`);
  const managerRequests = await safeCount(`SELECT COUNT(*) as cnt FROM hr_disciplinary_letters WHERE request_source = 'manager_portal' AND status IN ('submitted','investigating')`);
  const total = await safeCount(`SELECT COUNT(*) as cnt FROM hr_disciplinary_letters`);
  return res.json({ success: true, data: { pending, issued, draft, managerRequests, total } });
}

async function createLetter(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ success: false, error: 'Database tidak tersedia' });

  const tenantId = getTenantId(session);
  const userId = getUserId(session);
  const {
    employee_id, letter_type, violation_type, violation_description,
    incident_date, request_reason, regulation_id, related_case_id,
    termination_type, severance_amount, notes, sop_template_id,
  } = req.body;

  if (!employee_id || !letter_type || !violation_description) {
    return res.status(400).json({ success: false, error: 'employee_id, letter_type, violation_description wajib diisi' });
  }

  const emp = await fetchEmployee(String(employee_id));
  if (!emp) return res.status(404).json({ success: false, error: 'Karyawan tidak ditemukan' });

  const letterType = letter_type as DisciplinaryLetterType;
  let sop = await getActiveSOP(letterType, tenantId);
  if (sop_template_id) {
    const [sopRow] = await sequelize.query(`SELECT * FROM hr_letter_sop_templates WHERE id = :id AND is_active = true`, { replacements: { id: sop_template_id } });
    if (sopRow[0]) {
      const n = normalizeSOPTemplate(sopRow[0])!;
      sop = { ...sop, id: n.id, name: n.name, approvalLevels: n.approval_levels, prerequisites: n.prerequisites, validityMonths: n.validity_months };
    }
  }

  const [prevLetters] = await sequelize.query(`
    SELECT letter_type, status, effective_date as issue_date, expiry_date
    FROM hr_disciplinary_letters WHERE employee_id = :employee_id ORDER BY created_at DESC
  `, { replacements: { employee_id } });
  const validation = validatePrerequisites(letterType, sop, prevLetters || []);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.errors.join('. '), errors: validation.errors });
  }

  const [countRes] = await sequelize.query(`SELECT COUNT(*) as cnt FROM hr_disciplinary_letters`);
  const refNumber = `REF-${generateLetterNumber(letterType, parseInt(countRes[0]?.cnt || 0) + 1)}`;

  const defaultDraft = buildDefaultDraftContent({
    letterType,
    employeeName: emp.name,
    employeeCode: emp.employee_code,
    position: emp.position,
    department: emp.department,
    violationType: violation_type,
    violationDescription: violation_description,
    incidentDate: incident_date,
  });

  const levels = sop.approvalLevels || [];
  const totalSteps = levels.length || 1;

  const [result] = await sequelize.query(`
    INSERT INTO hr_disciplinary_letters (
      tenant_id, employee_id, letter_type, reference_number, status, current_phase,
      violation_type, violation_description, incident_date, request_reason,
      regulation_id, related_case_id, termination_type, severance_amount,
      draft_content, requested_by, sop_template_id, current_approval_step, total_approval_steps, notes,
      audit_trail
    ) VALUES (
      :tenantId, :employee_id, :letter_type, :refNumber, 'draft', 'drafting',
      :violation_type, :violation_description, :incident_date, :request_reason,
      :regulation_id, :related_case_id, :termination_type, :severance_amount,
      :draftContent::jsonb, :requested_by, :sop_template_id, 0, :totalSteps, :notes,
      :auditTrail::jsonb
    ) RETURNING *
  `, {
    replacements: {
      tenantId, employee_id, letter_type: letterType, refNumber,
      violation_type: violation_type || 'discipline',
      violation_description, incident_date: incident_date || null,
      request_reason: request_reason || null,
      regulation_id: regulation_id || null,
      related_case_id: related_case_id || null,
      termination_type: termination_type || null,
      severance_amount: severance_amount || 0,
      draftContent: JSON.stringify(defaultDraft),
      requested_by: userId,
      sop_template_id: sop.id || sop_template_id || null,
      totalSteps,
      notes: notes || null,
      auditTrail: JSON.stringify([{ action: 'created', by: userId, at: new Date().toISOString(), phase: 'draft' }]),
    },
  });

  const letter = result[0];
  const letterId = letter.id;

  for (const level of levels) {
    await sequelize.query(`
      INSERT INTO hr_disciplinary_approval_steps (letter_id, step_order, phase, approver_role, approver_title, status)
      VALUES (:letterId, :stepOrder, :phase, :role, :title, 'waiting')
    `, {
      replacements: {
        letterId,
        stepOrder: level.level,
        phase: level.phase,
        role: level.role,
        title: level.title,
      },
    });
  }

  const [enriched] = await sequelize.query(`${LETTER_SELECT} WHERE dl.id = :id`, { replacements: { id: letterId } });
  enriched[0].draft_content = defaultDraft;

  return res.json({
    success: true,
    data: enriched[0] || letter,
    message: `Draft ${letterType} berhasil dibuat. Edit surat di pratinjau sebelum diajukan (${totalSteps} tahap persetujuan).`,
  });
}

async function regenerateDraft(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  const [letters] = await sequelize.query(`${LETTER_SELECT} WHERE dl.id = :id`, { replacements: { id } });
  const letter = letters[0];
  if (!letter) return res.status(404).json({ success: false, error: 'Not found' });

  const defaultDraft = buildDefaultDraftContent({
    letterType: letter.letter_type,
    employeeName: letter.employee_name,
    employeeCode: letter.employee_code,
    position: letter.position,
    department: letter.department,
    violationType: letter.violation_type,
    violationDescription: letter.violation_description,
    incidentDate: letter.incident_date,
  });

  await sequelize.query(`
    UPDATE hr_disciplinary_letters SET draft_content = :draft::jsonb, updated_at = NOW() WHERE id = :id
  `, { replacements: { id, draft: JSON.stringify(defaultDraft) } });

  return res.json({ success: true, data: defaultDraft, message: 'Draft diregenerasi dari template' });
}

async function submitLetter(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  const userId = getUserId(session);

  const letter = await loadLetterScoped(id, session);
  if (!letter) return res.status(404).json({ success: false, error: 'Not found' });
  if (!['draft', 'drafting'].includes(letter.status)) {
    return res.status(400).json({ success: false, error: 'Hanya draft yang dapat diajukan' });
  }

  // Activate first approval step
  await sequelize.query(`
    UPDATE hr_disciplinary_approval_steps SET status = 'pending'
    WHERE letter_id = :id AND step_order = (SELECT MIN(step_order) FROM hr_disciplinary_approval_steps WHERE letter_id = :id)
  `, { replacements: { id } });

  await sequelize.query(`
    UPDATE hr_disciplinary_letters SET status = 'pending_approval', current_phase = 'approval',
      current_approval_step = 1, updated_at = NOW()
    WHERE id = :id AND tenant_id = :tenantId
  `, { replacements: { id, tenantId: letter.tenant_id } });

  await appendAudit(id, { action: 'submitted', by: userId, at: new Date().toISOString() });

  return res.json({ success: true, message: 'Surat diajukan — menunggu persetujuan tahap 1' });
}

async function saveDraft(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, draft_content, investigation_notes, violation_description, notes } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  const userId = getUserId(session);

  await sequelize.query(`
    UPDATE hr_disciplinary_letters SET
      draft_content = CASE WHEN :draft_content IS NOT NULL THEN :draft_content::jsonb ELSE draft_content END,
      investigation_notes = COALESCE(:investigation_notes, investigation_notes),
      violation_description = COALESCE(:violation_description, violation_description),
      notes = COALESCE(:notes, notes),
      drafted_by = :drafted_by,
      status = CASE WHEN status = 'draft' THEN 'drafting' ELSE status END,
      current_phase = CASE WHEN status IN ('draft','drafting') THEN 'drafting' ELSE current_phase END,
      updated_at = NOW()
    WHERE id = :id
  `, {
    replacements: {
      id,
      draft_content: draft_content ? JSON.stringify(draft_content) : null,
      investigation_notes: investigation_notes ?? null,
      violation_description: violation_description ?? null,
      notes: notes ?? null,
      drafted_by: userId,
    },
  });

  return res.json({ success: true, message: 'Draft disimpan' });
}

async function approveStep(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, step_id, comments } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  const userId = getUserId(session);

  const [letters] = await sequelize.query(`SELECT * FROM hr_disciplinary_letters WHERE id = :id AND tenant_id = :tenantId`, { replacements: { id, tenantId: getTenantId(session) } });
  const letter = letters[0];
  if (!letter) return res.status(404).json({ error: 'Not found' });
  if (!['pending_approval', 'review'].includes(letter.status)) {
    return res.status(400).json({ success: false, error: 'Surat tidak dalam status menunggu persetujuan' });
  }

  const stepFilter = step_id
    ? 'AND id = :stepId'
    : `AND step_order = (SELECT MIN(step_order) FROM hr_disciplinary_approval_steps WHERE letter_id = :id AND status = 'pending')`;

  const [updated] = await sequelize.query(`
    UPDATE hr_disciplinary_approval_steps SET status = 'approved', approver_id = :userId,
      comments = :comments, acted_at = NOW()
    WHERE letter_id = :id AND status = 'pending' ${stepFilter}
    RETURNING id
  `, { replacements: { id, stepId: step_id, userId, comments: comments || null } });

  if (!updated?.length) {
    return res.status(400).json({ success: false, error: 'Tidak ada tahap pending untuk disetujui' });
  }

  const [waiting] = await sequelize.query(`
    SELECT id, step_order, phase FROM hr_disciplinary_approval_steps
    WHERE letter_id = :id AND status = 'waiting' ORDER BY step_order LIMIT 1
  `, { replacements: { id } });

  if (waiting[0]) {
    await sequelize.query(`UPDATE hr_disciplinary_approval_steps SET status = 'pending' WHERE id = :sid`, { replacements: { sid: waiting[0].id } });
    await sequelize.query(`
      UPDATE hr_disciplinary_letters SET current_approval_step = :step, current_phase = :phase,
        status = 'pending_approval', updated_at = NOW() WHERE id = :id
    `, { replacements: { id, step: waiting[0].step_order, phase: waiting[0].phase } });
    await appendAudit(id, { action: 'approved_step', by: userId, step: waiting[0].step_order - 1, at: new Date().toISOString() });
    return res.json({ success: true, message: `Disetujui — menunggu tahap ${waiting[0].step_order}` });
  }

  await sequelize.query(`
    UPDATE hr_disciplinary_letters SET status = 'approved', current_phase = 'issuance', current_approval_step = :total, updated_at = NOW()
    WHERE id = :id
  `, { replacements: { id, total: letter.total_approval_steps } });

  await appendAudit(id, { action: 'fully_approved', by: userId, at: new Date().toISOString() });

  await notifyDisciplinaryStakeholders(sequelize, letter, 'approved');

  return res.json({ success: true, message: 'Semua persetujuan selesai — siap diterbitkan' });
}

async function issueLetter(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, effective_date } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  const userId = getUserId(session);

  const [letters] = await sequelize.query(`SELECT * FROM hr_disciplinary_letters WHERE id = :id AND tenant_id = :tenantId`, { replacements: { id, tenantId: getTenantId(session) } });
  const letter = letters[0];
  if (!letter) return res.status(404).json({ error: 'Not found' });
  if (letter.status !== 'approved') {
    return res.status(400).json({ success: false, error: 'Surat harus disetujui penuh sebelum diterbitkan' });
  }

  const letterType = letter.letter_type as DisciplinaryLetterType;
  const sop = await getActiveSOP(letterType, letter.tenant_id);
  const issueDate = effective_date || new Date().toISOString().split('T')[0];
  const expiryDate = computeExpiryDate(issueDate, sop.validityMonths);

  const [countRes] = await sequelize.query(`SELECT COUNT(*) as cnt FROM hr_disciplinary_letters WHERE letter_type = :letterType AND status IN ('issued','acknowledged')`, { replacements: { letterType } });
  const letterNumber = generateLetterNumber(letterType, parseInt(countRes[0]?.cnt || 0) + 1);

  const eFileId = await createDisciplinaryEFile({ ...letter, expiry_date: expiryDate }, letterNumber, issueDate);

  await sequelize.query(`
    UPDATE hr_disciplinary_letters SET
      status = 'issued', current_phase = 'acknowledgment',
      letter_number = :letterNumber, effective_date = :issueDate, expiry_date = :expiryDate,
      issued_by = :userId, issued_at = NOW(), e_file_id = :eFileId, updated_at = NOW()
    WHERE id = :id
  `, { replacements: { id, letterNumber, issueDate, expiryDate, userId, eFileId } });

  await appendAudit(id, { action: 'issued', by: userId, letterNumber, at: new Date().toISOString() });

  await notifyDisciplinaryStakeholders(sequelize, {
    ...letter,
    letter_number: letterNumber,
    letter_type: letterType,
  }, 'issued');

  if (['SP1', 'SP2', 'SP3'].includes(letterType)) {
    try {
      // warning_letters.employee_id may be integer legacy — skip if incompatible
      const [wCols] = await sequelize.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'warning_letters' AND column_name = 'employee_id'
      `);
      if (wCols[0]?.data_type === 'uuid') {
        await sequelize.query(`
          INSERT INTO warning_letters (tenant_id, employee_id, warning_type, letter_number, issue_date, expiry_date,
            violation_type, violation_description, issued_by, status)
          VALUES (:tenantId, :employeeId, :warningType, :letterNumber, :issueDate, :expiryDate,
            :violationType, :violationDescription, :issuedBy, 'active')
        `, {
          replacements: {
            tenantId: letter.tenant_id, employeeId: letter.employee_id,
            warningType: letterType, letterNumber, issueDate, expiryDate,
            violationType: letter.violation_type, violationDescription: letter.violation_description,
            issuedBy: userId,
          },
        });
      }
    } catch (e) { console.warn('warning_letters sync skipped:', (e as Error)?.message); }
  }

  return res.json({ success: true, message: `Surat ${letterNumber} berhasil diterbitkan`, letterNumber, eFileId });
}

async function createDisciplinaryEFile(letter: any, letterNumber: string, issueDate: string): Promise<string | null> {
  try {
    const docTypeMap: Record<string, string> = {
      TEGURAN: 'SURAT_TEGURAN', SP1: 'SP', SP2: 'SP', SP3: 'SP', TERMINATION: 'SK_PHK',
    };
    const docType = docTypeMap[letter.letter_type] || 'SP';
    const [result] = await sequelize.query(`
      INSERT INTO employee_documents (tenant_id, employee_id, document_type, document_number, title, description, status, issue_date, expiry_date, created_at, updated_at)
      VALUES (:tenantId, :employeeId, :docType, :docNumber, :title, :desc, 'active', :issueDate, :expiryDate, NOW(), NOW())
      RETURNING id
    `, {
      replacements: {
        tenantId: letter.tenant_id,
        employeeId: letter.employee_id,
        docType,
        docNumber: letterNumber,
        title: `${letter.letter_type} — ${letterNumber}`,
        desc: `Surat disiplin — ${(letter.violation_description || '').substring(0, 200)}`,
        issueDate,
        expiryDate: letter.expiry_date,
      },
    });
    return result[0]?.id || null;
  } catch (e) {
    console.warn('E-file insert skipped:', (e as Error)?.message);
    return null;
  }
}

async function acknowledgeLetter(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  await sequelize.query(`
    UPDATE hr_disciplinary_letters SET status = 'acknowledged', acknowledged = true,
      acknowledged_at = NOW(), current_phase = 'acknowledgment', updated_at = NOW()
    WHERE id = :id AND status = 'issued'
  `, { replacements: { id } });
  return res.json({ success: true, message: 'Konfirmasi penerimaan surat dicatat' });
}

async function rejectLetter(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, comments } = req.body;
  if (!id || !comments) return res.status(400).json({ error: 'id dan alasan penolakan wajib diisi' });
  const userId = getUserId(session);

  const [letters] = await sequelize.query(`SELECT * FROM hr_disciplinary_letters WHERE id = :id AND tenant_id = :tenantId`, { replacements: { id, tenantId: getTenantId(session) } });
  const letter = letters[0];
  if (!letter) return res.status(404).json({ success: false, error: 'Not found' });

  await sequelize.query(`
    UPDATE hr_disciplinary_approval_steps SET status = 'rejected', comments = :comments, acted_at = NOW()
    WHERE letter_id = :id AND status IN ('pending','waiting')
  `, { replacements: { id, comments } });

  await sequelize.query(`UPDATE hr_disciplinary_letters SET status = 'rejected', notes = :comments, updated_at = NOW() WHERE id = :id`, { replacements: { id, comments } });
  await appendAudit(id, { action: 'rejected', by: userId, reason: comments, at: new Date().toISOString() });

  await notifyDisciplinaryStakeholders(sequelize, letter, 'rejected', { reason: comments });

  return res.json({ success: true, message: 'Pengajuan surat ditolak' });
}

async function startInvestigation(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, investigation_notes } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  const userId = getUserId(session);
  const investigatorName = (session.user as any)?.name || (session.user as any)?.email || 'HR';

  const [letters] = await sequelize.query(`SELECT * FROM hr_disciplinary_letters WHERE id = :id AND tenant_id = :tenantId`, { replacements: { id, tenantId: getTenantId(session) } });
  const letter = letters[0];
  if (!letter) return res.status(404).json({ success: false, error: 'Surat tidak ditemukan' });
  if (!['submitted', 'draft'].includes(letter.status)) {
    return res.status(400).json({ success: false, error: 'Hanya permohonan yang dapat diinvestigasi' });
  }

  await sequelize.query(`
    UPDATE hr_disciplinary_letters SET
      status = 'investigating', current_phase = 'investigation',
      investigation_notes = COALESCE(:investigation_notes, investigation_notes),
      drafted_by = :userId, updated_at = NOW()
    WHERE id = :id
  `, { replacements: { id, investigation_notes: investigation_notes || null, userId } });

  await appendAudit(id, { action: 'investigation_started', by: userId, at: new Date().toISOString() });

  await notifyDisciplinaryStakeholders(sequelize, letter, 'investigating', { investigatorName });

  return res.json({ success: true, message: 'Investigasi dimulai — manajer pengaju telah diberi notifikasi' });
}

async function completeInvestigation(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, investigation_notes } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  const userId = getUserId(session);

  const [letters] = await sequelize.query(`${LETTER_SELECT} WHERE dl.id = :id`, { replacements: { id } });
  const letter = letters[0];
  if (!letter) return res.status(404).json({ success: false, error: 'Surat tidak ditemukan' });
  if (letter.status !== 'investigating') {
    return res.status(400).json({ success: false, error: 'Surat tidak dalam tahap investigasi' });
  }

  let draftContent = parseDraftContent(letter.draft_content);
  if (!draftContent?.body) {
    draftContent = buildDefaultDraftContent({
      letterType: letter.letter_type,
      employeeName: letter.employee_name,
      employeeCode: letter.employee_code,
      position: letter.position,
      department: letter.department,
      violationType: letter.violation_type,
      violationDescription: letter.violation_description,
      incidentDate: letter.incident_date,
    });
  }

  await sequelize.query(`
    UPDATE hr_disciplinary_letters SET
      status = 'drafting', current_phase = 'drafting',
      investigation_notes = COALESCE(:investigation_notes, investigation_notes),
      draft_content = :draftContent::jsonb,
      drafted_by = :userId, updated_at = NOW()
    WHERE id = :id
  `, {
    replacements: {
      id,
      investigation_notes: investigation_notes ?? letter.investigation_notes ?? null,
      draftContent: JSON.stringify(draftContent),
      userId,
    },
  });

  await appendAudit(id, { action: 'investigation_completed', by: userId, at: new Date().toISOString() });

  return res.json({ success: true, message: 'Investigasi selesai — lanjut penyusunan draft surat' });
}

async function cancelLetter(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, reason } = req.body.id ? req.body : { id: req.query.id, reason: req.body?.reason };
  if (!id) return res.status(400).json({ error: 'id required' });

  await sequelize.query(`
    UPDATE hr_disciplinary_letters SET status = 'cancelled', notes = COALESCE(:reason, notes), updated_at = NOW()
    WHERE id = :id AND status IN ('draft','drafting','submitted','pending_approval')
  `, { replacements: { id, reason: reason || null } });

  return res.json({ success: true, message: 'Pengajuan dibatalkan' });
}

async function saveSOPTemplate(req: NextApiRequest, res: NextApiResponse, session: any) {
  const tenantId = getTenantId(session);
  const { name, letter_type, description, phases, approval_levels, prerequisites, validity_months } = req.body;
  if (!name || !letter_type) return res.status(400).json({ error: 'name dan letter_type wajib' });

  const [result] = await sequelize.query(`
    INSERT INTO hr_letter_sop_templates (tenant_id, name, letter_type, description, phases, approval_levels, prerequisites, validity_months, is_active, is_default)
    VALUES (:tenantId, :name, :letter_type, :description, :phases::jsonb, :approval_levels::jsonb, :prerequisites::jsonb, :validity_months, true, false)
    RETURNING *
  `, {
    replacements: {
      tenantId, name, letter_type, description: description || null,
      phases: JSON.stringify(phases || []),
      approval_levels: JSON.stringify(approval_levels || []),
      prerequisites: JSON.stringify(prerequisites || {}),
      validity_months: validity_months ?? 6,
    },
  });

  return res.json({ success: true, data: normalizeSOPTemplate(result[0]), message: 'Template SOP berhasil dibuat' });
}

async function updateSOPTemplate(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });
  const { name, description, phases, approval_levels, prerequisites, validity_months, is_active } = req.body;

  await sequelize.query(`
    UPDATE hr_letter_sop_templates SET
      name = COALESCE(:name, name),
      description = COALESCE(:description, description),
      phases = COALESCE(:phases::jsonb, phases),
      approval_levels = COALESCE(:approval_levels::jsonb, approval_levels),
      prerequisites = COALESCE(:prerequisites::jsonb, prerequisites),
      validity_months = COALESCE(:validity_months, validity_months),
      is_active = COALESCE(:is_active, is_active),
      updated_at = NOW()
    WHERE id = :id::uuid
  `, {
    replacements: {
      id,
      name: name || null,
      description: description ?? null,
      phases: phases ? JSON.stringify(phases) : null,
      approval_levels: approval_levels ? JSON.stringify(approval_levels) : null,
      prerequisites: prerequisites ? JSON.stringify(prerequisites) : null,
      validity_months: validity_months ?? null,
      is_active: is_active !== undefined ? is_active : null,
    },
  });

  const [rows] = await sequelize.query(`SELECT * FROM hr_letter_sop_templates WHERE id = :id`, { replacements: { id } });
  return res.json({ success: true, data: normalizeSOPTemplate(rows[0]), message: 'Template SOP diperbarui' });
}

async function deleteSOPTemplate(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });
  const [rows] = await sequelize.query(`SELECT is_default FROM hr_letter_sop_templates WHERE id = :id`, { replacements: { id } });
  if (rows[0]?.is_default) return res.status(400).json({ success: false, error: 'Template default tidak dapat dihapus' });
  await sequelize.query(`UPDATE hr_letter_sop_templates SET is_active = false, updated_at = NOW() WHERE id = :id`, { replacements: { id } });
  return res.json({ success: true, message: 'Template SOP dinonaktifkan' });
}
