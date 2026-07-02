import type { NextApiRequest, NextApiResponse } from 'next';

const sequelize = require('../../../lib/sequelize');

const ok = (data: any) => ({ success: true, data });
const fail = (code: string, msg: string) => ({ success: false, error: { code, message: msg } });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Method not allowed'));
  }

  try {
    const { type, category, search, page = '1', limit = '12' } = req.query;
    const offset = (Math.max(1, parseInt(page as string)) - 1) * parseInt(limit as string);
    const lim = Math.min(50, parseInt(limit as string));

    // Fetch published tenders
    let tenderWhere = `WHERE t.status IN ('announcement', 'registration', 'submission', 'published')`;
    let rfqWhere = `WHERE r.status IN ('published')`;
    const replacements: any = { lim, offset };

    if (category && category !== 'all') {
      tenderWhere += ` AND t.category = :category`;
      rfqWhere += ` AND r.category = :category`;
      replacements.category = category;
    }
    if (search) {
      tenderWhere += ` AND (t.title ILIKE :search OR t.description ILIKE :search OR t.tender_number ILIKE :search)`;
      rfqWhere += ` AND (r.title ILIKE :search OR r.description ILIKE :search OR r.rfq_number ILIKE :search)`;
      replacements.search = `%${search}%`;
    }

    if (type === 'tenders') {
      const tenders = await sequelize.query(`
        SELECT t.id, t.tender_number AS number, t.title, t.description, t.tender_type, t.category,
          t.status, t.announcement_date, t.registration_deadline, t.submission_deadline,
          t.estimated_value, t.currency, t.requirements, t.evaluation_criteria,
          t.created_at, 'tender' AS source_type,
          (SELECT COUNT(*) FROM epr_tender_bids b WHERE b.tender_id = t.id) AS bid_count
        FROM epr_tenders t ${tenderWhere}
        ORDER BY t.created_at DESC LIMIT :lim OFFSET :offset
      `, { replacements, type: sequelize.QueryTypes.SELECT });

      const [{ count: total }] = await sequelize.query(
        `SELECT COUNT(*) AS count FROM epr_tenders t ${tenderWhere}`,
        { replacements, type: sequelize.QueryTypes.SELECT }
      );

      return res.json(ok({ rows: tenders, total: parseInt(total) }));
    }

    if (type === 'rfqs') {
      const rfqs = await sequelize.query(`
        SELECT r.id, r.rfq_number AS number, r.title, r.description, r.category,
          r.status, r.publish_date, r.closing_date, r.estimated_budget AS estimated_value,
          r.currency, r.evaluation_criteria, r.delivery_terms, r.payment_terms,
          r.created_at, 'rfq' AS source_type,
          (SELECT COUNT(*) FROM epr_rfq_responses rr WHERE rr.rfq_id = r.id) AS bid_count
        FROM epr_rfqs r ${rfqWhere}
        ORDER BY r.created_at DESC LIMIT :lim OFFSET :offset
      `, { replacements, type: sequelize.QueryTypes.SELECT });

      const [{ count: total }] = await sequelize.query(
        `SELECT COUNT(*) AS count FROM epr_rfqs r ${rfqWhere}`,
        { replacements, type: sequelize.QueryTypes.SELECT }
      );

      return res.json(ok({ rows: rfqs, total: parseInt(total) }));
    }

    // Default: combined (all announcements)
    const combined = await sequelize.query(`
      (
        SELECT t.id, t.tender_number AS number, t.title, t.description, t.tender_type AS sub_type, t.category,
          t.status, t.submission_deadline AS deadline, t.estimated_value, t.currency,
          t.created_at, 'tender' AS source_type,
          (SELECT COUNT(*) FROM epr_tender_bids b WHERE b.tender_id = t.id) AS bid_count
        FROM epr_tenders t ${tenderWhere}
      )
      UNION ALL
      (
        SELECT r.id, r.rfq_number AS number, r.title, r.description, 'rfq' AS sub_type, r.category,
          r.status, r.closing_date AS deadline, r.estimated_budget AS estimated_value, r.currency,
          r.created_at, 'rfq' AS source_type,
          (SELECT COUNT(*) FROM epr_rfq_responses rr WHERE rr.rfq_id = r.id) AS bid_count
        FROM epr_rfqs r ${rfqWhere}
      )
      ORDER BY created_at DESC LIMIT :lim OFFSET :offset
    `, { replacements, type: sequelize.QueryTypes.SELECT });

    const [tc] = await sequelize.query(
      `SELECT COUNT(*) AS count FROM epr_tenders t ${tenderWhere}`,
      { replacements, type: sequelize.QueryTypes.SELECT }
    );
    const [rc] = await sequelize.query(
      `SELECT COUNT(*) AS count FROM epr_rfqs r ${rfqWhere}`,
      { replacements, type: sequelize.QueryTypes.SELECT }
    );

    return res.json(ok({
      rows: combined,
      total: parseInt(tc.count) + parseInt(rc.count),
      tenderCount: parseInt(tc.count),
      rfqCount: parseInt(rc.count),
    }));
  } catch (error: any) {
    console.error('[Procurement Announcements]', error.message);
    return res.status(500).json(fail('INTERNAL_ERROR', error.message));
  }
}
