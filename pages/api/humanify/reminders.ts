import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch (e) {}

function tenantIdFrom(session: any): string | null {
  return (session?.user as any)?.tenantId || (session?.user as any)?.tenant_id || null;
}

async function ensureReminderTables() {
  if (!sequelize) return false;
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS contract_reminders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      reminder_type VARCHAR(30) NOT NULL,
      reference_id UUID NOT NULL,
      reference_table VARCHAR(50) NOT NULL,
      employee_id TEXT,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      due_date DATE NOT NULL,
      reminder_days_before INTEGER[] DEFAULT '{30,14,7,1}',
      last_notified_at TIMESTAMPTZ,
      status VARCHAR(20) DEFAULT 'active',
      is_dismissed BOOLEAN DEFAULT false,
      dismissed_by UUID,
      dismissed_at TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  return true;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { action } = req.query;

    if (req.method === 'GET') {
      if (action === 'list') return getReminders(req, res, session);
      if (action === 'upcoming') return getUpcomingReminders(req, res, session);
      if (action === 'contract-expiry') return getContractExpiry(req, res, session);
      if (action === 'cert-expiry') return getCertExpiry(req, res, session);
      if (action === 'summary') return getReminderSummary(req, res, session);
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'dismiss') return dismissReminder(req, res, session);
      if (action === 'generate') return generateReminders(req, res, session);
      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.warn('Reminders API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export default withHQAuth(handler, { module: 'hris' });

async function getReminders(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const tenantId = tenantIdFrom(session);
  if (!tenantId) return res.json({ success: true, data: [] });
  await ensureReminderTables();
  const { status = 'active' } = req.query;

  const [rows] = await sequelize.query(`
    SELECT cr.*, e.name as employee_name, e.employee_code as employee_code, e.department, e.position
    FROM contract_reminders cr
    LEFT JOIN employees e ON cr.employee_id::uuid = e.id AND e.tenant_id = :tenantId
    WHERE cr.status = :status AND cr.tenant_id = :tenantId
    ORDER BY cr.due_date ASC
    LIMIT 200
  `, { replacements: { status, tenantId } });

  return res.json({ success: true, data: rows || [] });
}

async function getUpcomingReminders(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const tenantId = tenantIdFrom(session);
  if (!tenantId) return res.json({ success: true, data: [] });
  await ensureReminderTables();
  const days = Math.min(365, Math.max(1, parseInt(String(req.query.days || '30'), 10) || 30));

  const [rows] = await sequelize.query(`
    SELECT cr.*, e.name as employee_name, e.employee_code as employee_code, e.department, e.position
    FROM contract_reminders cr
    LEFT JOIN employees e ON cr.employee_id::uuid = e.id AND e.tenant_id = :tenantId
    WHERE cr.status = 'active' AND cr.tenant_id = :tenantId
      AND cr.due_date <= CURRENT_DATE + (:days || ' days')::interval
    ORDER BY cr.due_date ASC
  `, { replacements: { tenantId, days: String(days) } });

  return res.json({ success: true, data: rows || [] });
}

async function getContractExpiry(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const tenantId = tenantIdFrom(session);
  if (!tenantId) return res.json({ success: true, data: [] });
  const days = Math.min(365, Math.max(1, parseInt(String(req.query.days || '90'), 10) || 90));

  const [rows] = await sequelize.query(`
    SELECT ec.*, e.name as employee_name, e.employee_code as employee_code, e.department, e.position,
      ec.end_date - CURRENT_DATE as days_remaining
    FROM employee_contracts ec
    LEFT JOIN employees e ON ec.employee_id::uuid = e.id AND e.tenant_id = :tenantId
    WHERE ec.status = 'active' AND ec.end_date IS NOT NULL
      AND ec.tenant_id = :tenantId
      AND ec.end_date <= CURRENT_DATE + (:days || ' days')::interval
    ORDER BY ec.end_date ASC
  `, { replacements: { tenantId, days: String(days) } });

  return res.json({ success: true, data: rows || [] });
}

async function getCertExpiry(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const tenantId = tenantIdFrom(session);
  if (!tenantId) return res.json({ success: true, data: [] });
  const days = Math.min(365, Math.max(1, parseInt(String(req.query.days || '90'), 10) || 90));

  const [rows] = await sequelize.query(`
    SELECT ec.*, e.name as employee_name, e.employee_code as employee_code, e.department,
      ec.expiry_date - CURRENT_DATE as days_remaining
    FROM employee_certifications ec
    INNER JOIN employees e ON ec.employee_id::uuid = e.id AND e.tenant_id = :tenantId
    WHERE ec.is_active = true AND ec.expiry_date IS NOT NULL
      AND ec.expiry_date <= CURRENT_DATE + (:days || ' days')::interval
    ORDER BY ec.expiry_date ASC
  `, { replacements: { tenantId, days: String(days) } });

  return res.json({ success: true, data: rows || [] });
}

async function getReminderSummary(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: {} });
  const tenantId = tenantIdFrom(session);
  if (!tenantId) {
    return res.json({
      success: true,
      data: { contractExpiring30d: 0, certExpiring30d: 0, activeReminders: 0, overdueReminders: 0 },
    });
  }
  await ensureReminderTables();

  const safeCount = async (sql: string, replacements: any) => {
    try {
      const [r] = await sequelize.query(sql, { replacements });
      return parseInt(r[0]?.cnt || 0, 10);
    } catch { return 0; }
  };

  const tid = { tenantId };
  const contractExpiring30d = await safeCount(`
    SELECT COUNT(*) as cnt FROM employee_contracts
    WHERE status = 'active' AND tenant_id = :tenantId AND end_date IS NOT NULL
      AND end_date <= CURRENT_DATE + INTERVAL '30 days'
  `, tid);
  const certExpiring30d = await safeCount(`
    SELECT COUNT(*) as cnt FROM employee_certifications ec
    INNER JOIN employees e ON ec.employee_id::uuid = e.id AND e.tenant_id = :tenantId
    WHERE ec.is_active = true AND ec.expiry_date IS NOT NULL
      AND ec.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
  `, tid);
  const activeReminders = await safeCount(`
    SELECT COUNT(*) as cnt FROM contract_reminders WHERE status = 'active' AND tenant_id = :tenantId
  `, tid);
  const overdueReminders = await safeCount(`
    SELECT COUNT(*) as cnt FROM contract_reminders
    WHERE status = 'active' AND tenant_id = :tenantId AND due_date < CURRENT_DATE
  `, tid);

  return res.json({
    success: true,
    data: { contractExpiring30d, certExpiring30d, activeReminders, overdueReminders },
  });
}

async function dismissReminder(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true });
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  const tenantId = tenantIdFrom(session);
  if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });

  const [, meta] = await sequelize.query(`
    UPDATE contract_reminders SET status = 'dismissed', is_dismissed = true,
      dismissed_at = NOW(), updated_at = NOW()
    WHERE id = :id AND tenant_id = :tenantId
  `, { replacements: { id, tenantId } });
  if ((meta as any)?.rowCount === 0) return res.status(404).json({ success: false, error: 'Not found' });

  return res.json({ success: true, message: 'Dismissed' });
}

async function generateReminders(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, message: 'No DB' });
  await ensureReminderTables();
  const tenantId = tenantIdFrom(session);
  if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });
  let created = 0;

  const [contracts] = await sequelize.query(`
    SELECT ec.id, ec.employee_id, ec.contract_type, ec.contract_number, ec.end_date, e.name as emp_name
    FROM employee_contracts ec
    LEFT JOIN employees e ON ec.employee_id::uuid = e.id AND e.tenant_id = :tenantId
    WHERE ec.status = 'active' AND ec.end_date IS NOT NULL AND ec.tenant_id = :tenantId
      AND NOT EXISTS (
        SELECT 1 FROM contract_reminders cr
        WHERE cr.reference_id::text = ec.id::text AND cr.reminder_type = 'contract_expiry'
          AND cr.status = 'active' AND cr.tenant_id = :tenantId
      )
  `, { replacements: { tenantId } });

  for (const c of (contracts || [])) {
    await sequelize.query(`
      INSERT INTO contract_reminders (tenant_id, reminder_type, reference_id, reference_table, employee_id, title, description, due_date)
      VALUES (:tenantId, 'contract_expiry', :refId, 'employee_contracts', :empId, :title, :desc, :dueDate)
    `, {
      replacements: {
        tenantId, refId: c.id, empId: c.employee_id,
        title: `Kontrak ${c.contract_type} ${c.emp_name} akan berakhir`,
        desc: `Kontrak ${c.contract_number || c.contract_type} karyawan ${c.emp_name} berakhir pada ${c.end_date}`,
        dueDate: c.end_date,
      },
    });
    created++;
  }

  try {
    const [certs] = await sequelize.query(`
      SELECT ec.id, ec.employee_id, ec.certification_name, ec.expiry_date, e.name as emp_name
      FROM employee_certifications ec
      INNER JOIN employees e ON ec.employee_id::uuid = e.id AND e.tenant_id = :tenantId
      WHERE ec.is_active = true AND ec.expiry_date IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM contract_reminders cr
          WHERE cr.reference_id::text = ec.id::text AND cr.reminder_type = 'certification_expiry'
            AND cr.status = 'active' AND cr.tenant_id = :tenantId
        )
    `, { replacements: { tenantId } });

    for (const c of (certs || [])) {
      await sequelize.query(`
        INSERT INTO contract_reminders (tenant_id, reminder_type, reference_id, reference_table, employee_id, title, description, due_date)
        VALUES (:tenantId, 'certification_expiry', :refId, 'employee_certifications', :empId, :title, :desc, :dueDate)
      `, {
        replacements: {
          tenantId, refId: c.id, empId: c.employee_id,
          title: `Sertifikasi ${c.certification_name} ${c.emp_name} akan berakhir`,
          desc: `Sertifikasi ${c.certification_name} karyawan ${c.emp_name} berakhir pada ${c.expiry_date}`,
          dueDate: c.expiry_date,
        },
      });
      created++;
    }
  } catch { /* table may not exist */ }

  return res.json({ success: true, message: `Generated ${created} reminders`, data: { created } });
}
