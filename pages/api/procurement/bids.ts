import type { NextApiRequest, NextApiResponse } from 'next';

const sequelize = require('../../../lib/sequelize');

const ok = (data: any) => ({ success: true, data });
const fail = (code: string, msg: string) => ({ success: false, error: { code, message: msg } });

function getVendorUser(authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return JSON.parse(Buffer.from(authHeader.slice(7), 'base64').toString());
  } catch { return null; }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const payload = getVendorUser(req.headers.authorization);
  if (!payload) return res.status(401).json(fail('UNAUTHORIZED', 'Login required'));

  // Get the full user
  const [user] = await sequelize.query(
    `SELECT * FROM epr_vendor_portal_users WHERE id = :id LIMIT 1`,
    { replacements: { id: payload.id }, type: sequelize.QueryTypes.SELECT }
  );
  if (!user) return res.status(401).json(fail('UNAUTHORIZED', 'User not found'));
  if (user.status !== 'approved' && user.status !== 'pending') {
    return res.status(403).json(fail('FORBIDDEN', 'Akun belum disetujui atau ditangguhkan'));
  }

  try {
    switch (req.method) {
      case 'GET': return handleGetBids(req, res, user);
      case 'POST': return handleSubmitBid(req, res, user);
      default: return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Method not allowed'));
    }
  } catch (error: any) {
    console.error('[Procurement Bids]', error.message);
    return res.status(500).json(fail('INTERNAL_ERROR', error.message));
  }
}

async function handleGetBids(req: NextApiRequest, res: NextApiResponse, user: any) {
  // Get all bids by this vendor user
  const tenderBids = await sequelize.query(`
    SELECT b.id, b.bid_number, b.bid_amount, b.currency, b.status, b.submitted_at, b.ranking,
      b.technical_score, b.price_score, b.overall_score,
      t.title, t.tender_number, t.submission_deadline, t.status AS tender_status,
      'tender' AS source_type
    FROM epr_tender_bids b
    JOIN epr_tenders t ON t.id = b.tender_id
    WHERE b.vendor_id = :vendorId
    ORDER BY b.submitted_at DESC
  `, { replacements: { vendorId: user.vendor_id || user.id }, type: sequelize.QueryTypes.SELECT });

  const rfqResponses = await sequelize.query(`
    SELECT rr.id, rr.status, rr.total_amount AS bid_amount, 'IDR' AS currency, rr.submitted_at,
      rr.delivery_time_days, rr.technical_score, rr.price_score, rr.overall_score,
      r.title, r.rfq_number AS tender_number, r.closing_date AS submission_deadline, r.status AS tender_status,
      'rfq' AS source_type
    FROM epr_rfq_responses rr
    JOIN epr_rfqs r ON r.id = rr.rfq_id
    WHERE rr.vendor_id = :vendorId
    ORDER BY rr.submitted_at DESC
  `, { replacements: { vendorId: user.vendor_id || user.id }, type: sequelize.QueryTypes.SELECT });

  return res.json(ok({ tenderBids, rfqResponses, total: tenderBids.length + rfqResponses.length }));
}

async function handleSubmitBid(req: NextApiRequest, res: NextApiResponse, user: any) {
  const { sourceType, sourceId, bidAmount, deliveryTimeDays, warrantyMonths, paymentTerms, deliverySchedule, warrantyTerms, notes, itemPrices } = req.body;

  if (!sourceType || !sourceId || !bidAmount) {
    return res.status(400).json(fail('VALIDATION', 'sourceType, sourceId, dan bidAmount wajib diisi'));
  }

  const vendorId = user.vendor_id || user.id;

  if (sourceType === 'tender') {
    // Verify tender exists and is open
    const [tender] = await sequelize.query(
      `SELECT id, status FROM epr_tenders WHERE id = :id AND status IN ('announcement','registration','submission','published') LIMIT 1`,
      { replacements: { id: sourceId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tender) return res.status(404).json(fail('NOT_FOUND', 'Tender tidak ditemukan atau sudah ditutup'));

    // Check duplicate bid
    const [existingBid] = await sequelize.query(
      `SELECT id FROM epr_tender_bids WHERE tender_id = :tenderId AND vendor_id = :vendorId LIMIT 1`,
      { replacements: { tenderId: sourceId, vendorId }, type: sequelize.QueryTypes.SELECT }
    );
    if (existingBid) return res.status(409).json(fail('DUPLICATE', 'Anda sudah mengajukan bid untuk tender ini'));

    const bidNumber = `BID-${Date.now().toString(36).toUpperCase()}`;
    const [result] = await sequelize.query(`
      INSERT INTO epr_tender_bids (id, tender_id, vendor_id, bid_number, bid_amount, currency, status,
        delivery_schedule, warranty_terms, notes, submitted_at)
      VALUES (gen_random_uuid(), :tenderId, :vendorId, :bidNumber, :bidAmount, 'IDR', 'submitted',
        :deliverySchedule, :warrantyTerms, :notes, NOW())
      RETURNING *
    `, {
      replacements: {
        tenderId: sourceId, vendorId, bidNumber, bidAmount: parseFloat(bidAmount),
        deliverySchedule: deliverySchedule || null, warrantyTerms: warrantyTerms || null, notes: notes || null,
      }
    });

    return res.status(201).json(ok(result[0]));
  }

  if (sourceType === 'rfq') {
    const [rfq] = await sequelize.query(
      `SELECT id, status FROM epr_rfqs WHERE id = :id AND status IN ('published') LIMIT 1`,
      { replacements: { id: sourceId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!rfq) return res.status(404).json(fail('NOT_FOUND', 'RFQ tidak ditemukan atau sudah ditutup'));

    const [existingResp] = await sequelize.query(
      `SELECT id FROM epr_rfq_responses WHERE rfq_id = :rfqId AND vendor_id = :vendorId LIMIT 1`,
      { replacements: { rfqId: sourceId, vendorId }, type: sequelize.QueryTypes.SELECT }
    );
    if (existingResp) return res.status(409).json(fail('DUPLICATE', 'Anda sudah mengajukan penawaran untuk RFQ ini'));

    const [result] = await sequelize.query(`
      INSERT INTO epr_rfq_responses (id, rfq_id, vendor_id, status, total_amount, delivery_time_days,
        warranty_months, payment_terms, item_prices, notes, submitted_at)
      VALUES (gen_random_uuid(), :rfqId, :vendorId, 'submitted', :totalAmount, :deliveryTimeDays,
        :warrantyMonths, :paymentTerms, :itemPrices, :notes, NOW())
      RETURNING *
    `, {
      replacements: {
        rfqId: sourceId, vendorId, totalAmount: parseFloat(bidAmount),
        deliveryTimeDays: deliveryTimeDays ? parseInt(deliveryTimeDays) : null,
        warrantyMonths: warrantyMonths ? parseInt(warrantyMonths) : null,
        paymentTerms: paymentTerms || null,
        itemPrices: itemPrices ? JSON.stringify(itemPrices) : '[]',
        notes: notes || null,
      }
    });

    return res.status(201).json(ok(result[0]));
  }

  return res.status(400).json(fail('INVALID_TYPE', 'sourceType must be tender or rfq'));
}
