import type { NextApiRequest, NextApiResponse } from 'next';

const sequelize = require('../../../lib/sequelize');

const ok = (data: any) => ({ success: true, data });
const fail = (code: string, msg: string) => ({ success: false, error: { code, message: msg } });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Method not allowed'));
  }

  try {
    const { id, type } = req.query;

    if (!id || !type) {
      return res.status(400).json(fail('VALIDATION', 'id and type are required'));
    }

    if (type === 'tender') {
      const [tender] = await sequelize.query(`
        SELECT t.*,
          (SELECT COUNT(*) FROM epr_tender_bids b WHERE b.tender_id = t.id) AS bid_count
        FROM epr_tenders t
        WHERE t.id = :id AND t.status IN ('announcement', 'registration', 'submission', 'published', 'evaluation', 'awarded', 'completed')
        LIMIT 1
      `, { replacements: { id }, type: sequelize.QueryTypes.SELECT });

      if (!tender) return res.status(404).json(fail('NOT_FOUND', 'Tender tidak ditemukan'));

      // Get items/requirements if any
      const bids = await sequelize.query(`
        SELECT b.id, b.bid_number, b.bid_amount, b.currency, b.status, b.submitted_at,
          v.name AS vendor_name, v.vendor_code
        FROM epr_tender_bids b
        LEFT JOIN epr_vendors v ON v.id = b.vendor_id
        WHERE b.tender_id = :id
        ORDER BY b.submitted_at DESC
      `, { replacements: { id }, type: sequelize.QueryTypes.SELECT });

      return res.json(ok({ ...tender, bids }));
    }

    if (type === 'rfq') {
      const [rfq] = await sequelize.query(`
        SELECT r.*,
          (SELECT COUNT(*) FROM epr_rfq_responses rr WHERE rr.rfq_id = r.id) AS response_count
        FROM epr_rfqs r
        WHERE r.id = :id AND r.status IN ('published', 'closed', 'awarded')
        LIMIT 1
      `, { replacements: { id }, type: sequelize.QueryTypes.SELECT });

      if (!rfq) return res.status(404).json(fail('NOT_FOUND', 'RFQ tidak ditemukan'));

      // Get items
      const items = await sequelize.query(`
        SELECT * FROM epr_rfq_items WHERE rfq_id = :id ORDER BY created_at
      `, { replacements: { id }, type: sequelize.QueryTypes.SELECT });

      const responses = await sequelize.query(`
        SELECT rr.id, rr.status, rr.total_amount, rr.delivery_time_days, rr.submitted_at,
          v.name AS vendor_name, v.vendor_code
        FROM epr_rfq_responses rr
        LEFT JOIN epr_vendors v ON v.id = rr.vendor_id
        WHERE rr.rfq_id = :id
        ORDER BY rr.submitted_at DESC
      `, { replacements: { id }, type: sequelize.QueryTypes.SELECT });

      return res.json(ok({ ...rfq, items, responses }));
    }

    return res.status(400).json(fail('INVALID_TYPE', 'type must be tender or rfq'));
  } catch (error: any) {
    console.error('[Procurement Detail]', error.message);
    return res.status(500).json(fail('INTERNAL_ERROR', error.message));
  }
}
