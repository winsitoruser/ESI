import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

let sequelize: any;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { action } = req.query;

    if (req.method === 'GET') {
      if (action === 'list') return getReminders(req, res);
      if (action === 'upcoming') return getUpcomingReminders(req, res);
      if (action === 'contract-expiry') return getContractExpiry(req, res);
      if (action === 'cert-expiry') return getCertExpiry(req, res);
      if (action === 'summary') return getReminderSummary(req, res);
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'dismiss') return dismissReminder(req, res, session);
      if (action === 'generate') return generateReminders(req, res, session);
      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Reminders API Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ===== GET: All active reminders =====
async function getReminders(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const { status = 'active' } = req.query;

  const [rows] = await sequelize.query(`
    SELECT cr.*, e.name as employee_name, e.employee_id as employee_code, e.department, e.position
    FROM contract_reminders cr
    LEFT JOIN employees e ON cr.employee_id = e.id
    WHERE cr.status = :status
    ORDER BY cr.due_date ASC
    LIMIT 200
  `, { replacements: { status } });

  return res.json({ success: true, data: rows || [] });
}

// ===== GET: Upcoming reminders (within 30 days) =====
async function getUpcomingReminders(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const days = parseInt(String(req.query.days || '30'));

  const [rows] = await sequelize.query(`
    SELECT cr.*, e.name as employee_name, e.employee_id as employee_code, e.department, e.position
    FROM contract_reminders cr
    LEFT JOIN employees e ON cr.employee_id = e.id
    WHERE cr.status = 'active' AND cr.due_date <= CURRENT_DATE + INTERVAL '${days} days'
    ORDER BY cr.due_date ASC
  `);

  return res.json({ success: true, data: rows || [] });
}

// ===== GET: Contracts expiring soon =====
async function getContractExpiry(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const days = parseInt(String(req.query.days || '90'));

  const [rows] = await sequelize.query(`
    SELECT ec.*, e.name as employee_name, e.employee_id as employee_code, e.department, e.position,
      ec.end_date - CURRENT_DATE as days_remaining
    FROM employee_contracts ec
    LEFT JOIN employees e ON ec.employee_id = e.id
    WHERE ec.status = 'active' AND ec.end_date IS NOT NULL 
      AND ec.end_date <= CURRENT_DATE + INTERVAL '${days} days'
    ORDER BY ec.end_date ASC
  `);

  return res.json({ success: true, data: rows || [] });
}

// ===== GET: Certifications expiring soon =====
async function getCertExpiry(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const days = parseInt(String(req.query.days || '90'));

  const [rows] = await sequelize.query(`
    SELECT ec.*, e.name as employee_name, e.employee_id as employee_code, e.department,
      ec.expiry_date - CURRENT_DATE as days_remaining
    FROM employee_certifications ec
    LEFT JOIN employees e ON ec.employee_id = e.id
    WHERE ec.is_active = true AND ec.expiry_date IS NOT NULL 
      AND ec.expiry_date <= CURRENT_DATE + INTERVAL '${days} days'
    ORDER BY ec.expiry_date ASC
  `);

  return res.json({ success: true, data: rows || [] });
}

// ===== GET: Summary counts =====
async function getReminderSummary(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: {} });

  const [contractExpiring] = await sequelize.query(`
    SELECT COUNT(*) as cnt FROM employee_contracts 
    WHERE status = 'active' AND end_date IS NOT NULL AND end_date <= CURRENT_DATE + INTERVAL '30 days'
  `);
  const [certExpiring] = await sequelize.query(`
    SELECT COUNT(*) as cnt FROM employee_certifications 
    WHERE is_active = true AND expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
  `);
  const [activeReminders] = await sequelize.query(`
    SELECT COUNT(*) as cnt FROM contract_reminders WHERE status = 'active'
  `);
  const [overdueReminders] = await sequelize.query(`
    SELECT COUNT(*) as cnt FROM contract_reminders WHERE status = 'active' AND due_date < CURRENT_DATE
  `);

  return res.json({
    success: true,
    data: {
      contractExpiring30d: parseInt(contractExpiring[0].cnt),
      certExpiring30d: parseInt(certExpiring[0].cnt),
      activeReminders: parseInt(activeReminders[0].cnt),
      overdueReminders: parseInt(overdueReminders[0].cnt)
    }
  });
}

// ===== POST: Dismiss reminder =====
async function dismissReminder(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true });
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  await sequelize.query(`
    UPDATE contract_reminders SET status = 'dismissed', is_dismissed = true, 
      dismissed_at = NOW(), updated_at = NOW()
    WHERE id = :id
  `, { replacements: { id } });

  return res.json({ success: true, message: 'Dismissed' });
}

// ===== POST: Generate reminders from contracts & certifications =====
async function generateReminders(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, message: 'No DB' });
  const tenantId = (session.user as any).tenantId;
  let created = 0;

  // Contract reminders
  const [contracts] = await sequelize.query(`
    SELECT ec.id, ec.employee_id, ec.contract_type, ec.contract_number, ec.end_date, e.name as emp_name
    FROM employee_contracts ec
    LEFT JOIN employees e ON ec.employee_id = e.id
    WHERE ec.status = 'active' AND ec.end_date IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM contract_reminders cr 
        WHERE cr.reference_id = ec.id AND cr.reminder_type = 'contract_expiry' AND cr.status = 'active'
      )
  `);

  for (const c of (contracts || [])) {
    await sequelize.query(`
      INSERT INTO contract_reminders (tenant_id, reminder_type, reference_id, reference_table, employee_id, title, description, due_date)
      VALUES (:tenantId, 'contract_expiry', :refId, 'employee_contracts', :empId, :title, :desc, :dueDate)
    `, {
      replacements: {
        tenantId, refId: c.id, empId: c.employee_id,
        title: `Kontrak ${c.contract_type} ${c.emp_name} akan berakhir`,
        desc: `Kontrak ${c.contract_number || c.contract_type} karyawan ${c.emp_name} berakhir pada ${c.end_date}`,
        dueDate: c.end_date
      }
    });
    created++;
  }

  // Certification reminders
  const [certs] = await sequelize.query(`
    SELECT ec.id, ec.employee_id, ec.name as cert_name, ec.expiry_date, e.name as emp_name
    FROM employee_certifications ec
    LEFT JOIN employees e ON ec.employee_id = e.id
    WHERE ec.is_active = true AND ec.expiry_date IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM contract_reminders cr 
        WHERE cr.reference_id = ec.id AND cr.reminder_type = 'certification_expiry' AND cr.status = 'active'
      )
  `);

  for (const c of (certs || [])) {
    await sequelize.query(`
      INSERT INTO contract_reminders (tenant_id, reminder_type, reference_id, reference_table, employee_id, title, description, due_date)
      VALUES (:tenantId, 'certification_expiry', :refId, 'employee_certifications', :empId, :title, :desc, :dueDate)
    `, {
      replacements: {
        tenantId, refId: c.id, empId: c.employee_id,
        title: `Sertifikasi ${c.cert_name} ${c.emp_name} akan kadaluarsa`,
        desc: `Sertifikasi ${c.cert_name} karyawan ${c.emp_name} kadaluarsa pada ${c.expiry_date}`,
        dueDate: c.expiry_date
      }
    });
    created++;
  }

  return res.json({ success: true, message: `${created} reminders generated` });
}
