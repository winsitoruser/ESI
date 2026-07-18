/**
 * LMS Integrations API — recruitment, payroll, KPI, webhooks
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { assertLmsLabApi } from '@/lib/humanify/assert-lms-lab';
import {
  getIntegrationRules,
  updateIntegrationRule,
  enrollEmployeeOnHire,
  syncCompetencyToKpi,
  createTrainingAllowance,
} from '../../../../lib/hris/lms/integrations';

const sequelize = require('../../../../lib/sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!assertLmsLabApi(req, res)) return;

    const tenantId = (session.user as any).tenantId || null;
    const { action } = req.query;

    if (req.method === 'GET') {
      if (action === 'rules') {
        const rules = await getIntegrationRules(tenantId);
        return res.json({ success: true, data: rules });
      }

      if (action === 'overview') {
        const [notif] = await sequelize.query(`
          SELECT COUNT(*)::int AS total FROM hris_lms_notification_log WHERE tenant_id = :tid
        `, { replacements: { tid: tenantId } }).catch(() => [[{ total: 0 }]]);

        const [allowances] = await sequelize.query(`
          SELECT COUNT(*)::int AS total, COALESCE(SUM(amount),0)::decimal(12,2) AS amount
          FROM hris_payroll_inputs
          WHERE tenant_id = :tid AND category = 'training_allowance'
        `, { replacements: { tid: tenantId } }).catch(() => [[{ total: 0, amount: 0 }]]);

        const [kpiSync] = await sequelize.query(`
          SELECT COUNT(*)::int AS total FROM employee_kpis
          WHERE category = 'hr' AND metric_name LIKE 'COURSE_%' OR metric_name LIKE 'COMP_%' OR metric_name LIKE 'PSYCHO_%'
        `).catch(() => [[{ total: 0 }]]);

        return res.json({
          success: true,
          data: {
            notifications_sent: notif[0]?.total || 0,
            training_allowances: allowances[0],
            kpi_competency_rows: kpiSync[0]?.total || 0,
          },
        });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'update-rule') {
        const { rule_type, enabled, config } = req.body;
        const row = await updateIntegrationRule(tenantId, rule_type, enabled, config || {});
        return res.json({ success: true, data: row });
      }

      if (action === 'test-hire-enroll') {
        const { employee_id, employee_name } = req.body;
        const result = await enrollEmployeeOnHire({
          tenantId,
          employeeId: employee_id,
          employeeName: employee_name || 'Karyawan',
        });
        return res.json({ success: true, data: result });
      }

      if (action === 'sync-competency-kpi') {
        const { employee_id, employee_name, competency_code, competency_name, score } = req.body;
        const id = await syncCompetencyToKpi({
          tenantId,
          employeeId: employee_id,
          employeeName: employee_name,
          competencyCode: competency_code,
          competencyName: competency_name,
          score: score || 0,
        });
        return res.json({ success: true, data: { kpi_id: id } });
      }

      if (action === 'create-allowance') {
        const { employee_id, employee_name, amount, reason, source_id } = req.body;
        const id = await createTrainingAllowance({
          tenantId,
          employeeId: employee_id,
          employeeName: employee_name,
          amount: Number(amount),
          reason: reason || 'Training allowance',
          sourceId: source_id || '',
        });
        return res.json({ success: true, data: { payroll_input_id: id } });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[LMS Integrations]', err);
    return res.status(500).json({ error: err.message });
  }
}
