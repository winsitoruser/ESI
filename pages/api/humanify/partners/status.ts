/**
 * Public partner lead + commission status lookup (Wave-55 / MKT-L4-1).
 * GET /api/humanify/partners/status?email=&id=
 * Soft: email + lead id required (no enumeration of other leads).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { ensurePartnerLeadsTable } from '@/lib/hris/partner-leads';
import { listPartnerPayouts } from '@/lib/saas/partner-payouts';

let sequelize: any;
try { sequelize = require('../../../../lib/sequelize'); } catch {}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const email = String(req.query.email || '').trim().toLowerCase();
  const id = String(req.query.id || '').trim();
  if (!email || !email.includes('@') || !id) {
    return res.status(400).json({
      success: false,
      error: 'email dan id lead wajib',
    });
  }

  if (!sequelize) {
    return res.json({
      success: true,
      data: { available: false, lead: null, payouts: [] },
    });
  }

  try {
    await ensurePartnerLeadsTable(sequelize);
    const [rows] = await sequelize.query(
      `SELECT id, company_name, contact_name, email, partner_type, region, status, created_at, updated_at
       FROM humanify_partner_leads
       WHERE id = :id AND LOWER(email) = :email
       LIMIT 1`,
      { replacements: { id, email } },
    );
    const lead = rows?.[0] || null;
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead tidak ditemukan' });
    }

    // Optional: payouts for matching partner code if contact email matches saas_partners
    let payouts: any[] = [];
    try {
      const [partners] = await sequelize.query(
        `SELECT code FROM saas_partners
         WHERE LOWER(contact_email) = :email AND status = 'active'
         LIMIT 1`,
        { replacements: { email } },
      );
      const code = partners?.[0]?.code;
      if (code) payouts = await listPartnerPayouts({ partnerCode: code, limit: 12 });
    } catch { /* optional */ }

    return res.json({
      success: true,
      data: {
        available: true,
        lead: {
          id: lead.id,
          companyName: lead.company_name,
          contactName: lead.contact_name,
          email: lead.email,
          partnerType: lead.partner_type,
          region: lead.region,
          status: lead.status,
          createdAt: lead.created_at,
          updatedAt: lead.updated_at,
        },
        payouts: (payouts || []).map((p: any) => ({
          id: p.id,
          partnerCode: p.partner_code,
          amountIdr: Number(p.amount_idr) || 0,
          status: p.status,
          periodFrom: p.period_from,
          periodTo: p.period_to,
          paidAt: p.paid_at,
        })),
      },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'error' });
  }
}
