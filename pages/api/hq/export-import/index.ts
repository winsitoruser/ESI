import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

const sequelize = require('../../../../lib/sequelize');

// Safe query helper - returns empty results if table doesn't exist
async function safeQuery(sql: string, options?: any): Promise<any[]> {
  try {
    const [result] = await sequelize.query(sql, options);
    return result;
  } catch (err: any) {
    if (err.message?.includes('does not exist') || err.message?.includes('relation') || err.original?.code === '42P01') {
      return [];
    }
    throw err;
  }
}

async function safeQueryOne(sql: string, options?: any): Promise<any> {
  const rows = await safeQuery(sql, options);
  return rows[0] || null;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const action = (req.query.action as string) || 'dashboard';

  try {
    switch (method) {
      case 'GET': return handleGet(req, res, action);
      case 'POST': return handlePost(req, res, action);
      case 'PUT': return handlePut(req, res, action);
      case 'DELETE': return handleDelete(req, res, action);
      default: return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'Method not allowed'));
    }
  } catch (error: any) {
    console.error(`[EXIM API] Error (${action}):`, error.message);
    // Handle table not found gracefully
    if (error.message?.includes('does not exist') || error.original?.code === '42P01') {
      return res.status(200).json(successResponse(getEmptyDataForAction(action)));
    }
    return res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
}

function getEmptyDataForAction(action: string): any {
  switch (action) {
    case 'dashboard': return {
      shipmentStats: {}, customsStats: {}, lcStats: {}, containerStats: {}, documentStats: {},
      recentShipments: [], activeContainers: [], monthlyTrend: [], statusDistribution: [],
      transportBreakdown: [], costBreakdown: [], topPartners: [], topCountries: []
    };
    case 'shipments': case 'customs': case 'lcs': case 'partners': case 'hs-codes':
      return { rows: [], total: 0, page: 1 };
    case 'documents': case 'containers': case 'costs':
      return [];
    case 'analytics': return { tradeBalance: [], byCountry: [], byTransport: [], monthlySummary: [], costBreakdown: [] };
    default: return {};
  }
}

export default withHQAuth(handler);

// ==========================================
// GET HANDLERS
// ==========================================
async function handleGet(req: NextApiRequest, res: NextApiResponse, action: string) {
  switch (action) {
    case 'dashboard': return getDashboard(req, res);
    case 'shipments': return getShipments(req, res);
    case 'shipment-detail': return getShipmentDetail(req, res);
    case 'documents': return getDocuments(req, res);
    case 'customs': return getCustoms(req, res);
    case 'customs-detail': return getCustomsDetail(req, res);
    case 'lcs': return getLCs(req, res);
    case 'lc-detail': return getLCDetail(req, res);
    case 'containers': return getContainers(req, res);
    case 'partners': return getPartners(req, res);
    case 'partner-detail': return getPartnerDetail(req, res);
    case 'costs': return getCosts(req, res);
    case 'hs-codes': return getHsCodes(req, res);
    case 'analytics': return getAnalytics(req, res);
    case 'settings': return getSettings(req, res);
    default:
      return res.status(400).json(errorResponse('INVALID_ACTION', `Unknown GET action: ${action}`));
  }
}

async function getDashboard(req: NextApiRequest, res: NextApiResponse) {
  const shipmentStats = await safeQueryOne(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE trade_type = 'export') as total_export,
      COUNT(*) FILTER (WHERE trade_type = 'import') as total_import,
      COUNT(*) FILTER (WHERE status = 'in_transit') as in_transit,
      COUNT(*) FILTER (WHERE status = 'customs_clearance') as at_customs,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'draft') as draft,
      COUNT(*) FILTER (WHERE status = 'booked') as booked,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
      COUNT(*) FILTER (WHERE status = 'at_port') as at_port,
      COALESCE(SUM(goods_value), 0) as total_goods_value,
      COALESCE(SUM(goods_value) FILTER (WHERE trade_type = 'export'), 0) as export_value,
      COALESCE(SUM(goods_value) FILTER (WHERE trade_type = 'import'), 0) as import_value,
      COALESCE(SUM(total_cost), 0) as total_cost,
      COALESCE(SUM(freight_cost), 0) as total_freight,
      COALESCE(SUM(total_weight), 0) as total_weight,
      COALESCE(SUM(total_volume), 0) as total_volume,
      COALESCE(SUM(total_packages), 0) as total_packages
    FROM exim_shipments
  `);

  const customsStats = await safeQueryOne(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
      COUNT(*) FILTER (WHERE status = 'cleared') as cleared,
      COUNT(*) FILTER (WHERE status IN ('red_lane', 'rejected')) as issues,
      COUNT(*) FILTER (WHERE status = 'red_lane') as red_lane,
      COUNT(*) FILTER (WHERE status = 'green_lane') as green_lane,
      COUNT(*) FILTER (WHERE status = 'yellow_lane') as yellow_lane,
      COALESCE(SUM(total_duty), 0) as total_duty,
      COALESCE(SUM(total_tax), 0) as total_tax,
      COALESCE(SUM(total_excise), 0) as total_excise
    FROM exim_customs
  `);

  const lcStats = await safeQueryOne(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'issued') as active,
      COUNT(*) FILTER (WHERE status = 'expired') as expired,
      COUNT(*) FILTER (WHERE status = 'paid') as paid,
      COUNT(*) FILTER (WHERE status = 'draft') as draft,
      COUNT(*) FILTER (WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND status = 'issued') as expiring_soon,
      COALESCE(SUM(amount), 0) as total_amount,
      COALESCE(SUM(amount) FILTER (WHERE status = 'issued'), 0) as active_amount
    FROM exim_lcs
  `);

  const containerStats = await safeQueryOne(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'empty') as empty,
      COUNT(*) FILTER (WHERE status = 'loaded') as loaded,
      COUNT(*) FILTER (WHERE status = 'in_transit') as in_transit,
      COUNT(*) FILTER (WHERE is_hazardous = true) as hazardous,
      COALESCE(SUM(gross_weight), 0) as total_weight,
      COALESCE(SUM(packages), 0) as total_packages
    FROM exim_containers
  `);

  const recentShipments = await safeQuery(`
    SELECT id, shipment_number, trade_type, title, status, transport_mode, partner_name,
      origin_port, destination_port, etd, eta, goods_value, currency
    FROM exim_shipments ORDER BY created_at DESC LIMIT 10
  `);

  const activeContainers = await safeQuery(`
    SELECT c.*, s.shipment_number, s.trade_type
    FROM exim_containers c JOIN exim_shipments s ON c.shipment_id = s.id
    WHERE c.status IN ('loaded', 'in_transit') ORDER BY c.created_at DESC LIMIT 10
  `);

  const monthlyTrend = await safeQuery(`
    SELECT TO_CHAR(created_at, 'YYYY-MM') as month,
      TO_CHAR(created_at, 'Mon') as month_label,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE trade_type = 'export') as export_count,
      COUNT(*) FILTER (WHERE trade_type = 'import') as import_count,
      COALESCE(SUM(goods_value) FILTER (WHERE trade_type = 'export'), 0) as export_value,
      COALESCE(SUM(goods_value) FILTER (WHERE trade_type = 'import'), 0) as import_value,
      COALESCE(SUM(goods_value), 0) as total_value
    FROM exim_shipments
    GROUP BY TO_CHAR(created_at, 'YYYY-MM'), TO_CHAR(created_at, 'Mon')
    ORDER BY month ASC LIMIT 12
  `);

  const statusDistribution = await safeQuery(`
    SELECT status, COUNT(*) as count
    FROM exim_shipments GROUP BY status ORDER BY count DESC
  `);

  const transportBreakdown = await safeQuery(`
    SELECT transport_mode, COUNT(*) as count,
      COALESCE(SUM(goods_value), 0) as value
    FROM exim_shipments GROUP BY transport_mode ORDER BY count DESC
  `);

  const costBreakdown = await safeQuery(`
    SELECT cost_category, COALESCE(SUM(amount_idr), 0) as total,
      COUNT(*) as count
    FROM exim_costs GROUP BY cost_category ORDER BY total DESC
  `);

  const topPartners = await safeQuery(`
    SELECT partner_name, COUNT(*) as shipment_count,
      COALESCE(SUM(goods_value), 0) as total_value
    FROM exim_shipments WHERE partner_name IS NOT NULL
    GROUP BY partner_name ORDER BY total_value DESC LIMIT 5
  `);

  const topCountries = await safeQuery(`
    SELECT COALESCE(destination_country, origin_country) as country, trade_type,
      COUNT(*) as count, COALESCE(SUM(goods_value), 0) as value
    FROM exim_shipments
    WHERE COALESCE(destination_country, origin_country) IS NOT NULL
    GROUP BY COALESCE(destination_country, origin_country), trade_type
    ORDER BY value DESC LIMIT 10
  `);

  const documentStats = await safeQueryOne(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'draft') as draft,
      COUNT(*) FILTER (WHERE status = 'issued') as issued,
      COUNT(*) FILTER (WHERE status = 'verified') as verified,
      COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE AND status != 'expired') as expiring
    FROM exim_documents
  `);

  return res.status(200).json(successResponse({
    shipmentStats: shipmentStats || {},
    customsStats: customsStats || {},
    lcStats: lcStats || {},
    containerStats: containerStats || {},
    documentStats: documentStats || {},
    recentShipments: recentShipments || [],
    activeContainers: activeContainers || [],
    monthlyTrend: monthlyTrend || [],
    statusDistribution: statusDistribution || [],
    transportBreakdown: transportBreakdown || [],
    costBreakdown: costBreakdown || [],
    topPartners: topPartners || [],
    topCountries: topCountries || []
  }));
}

async function getShipments(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '20', tradeType, status, transportMode, search } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE 1=1';
  if (tradeType && tradeType !== 'all') where += ` AND trade_type = '${tradeType}'`;
  if (status && status !== 'all') where += ` AND status = '${status}'`;
  if (transportMode && transportMode !== 'all') where += ` AND transport_mode = '${transportMode}'`;
  if (search) where += ` AND (title ILIKE '%${search}%' OR shipment_number ILIKE '%${search}%' OR partner_name ILIKE '%${search}%')`;

  const rows = await safeQuery(`
    SELECT *,
      (SELECT COUNT(*) FROM exim_containers WHERE shipment_id = exim_shipments.id) as container_count,
      (SELECT COUNT(*) FROM exim_documents WHERE shipment_id = exim_shipments.id) as document_count
    FROM exim_shipments ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
  `);
  const countRow = await safeQueryOne(`SELECT COUNT(*) as count FROM exim_shipments ${where}`);

  return res.status(200).json(successResponse({ rows, total: parseInt(countRow?.count || '0'), page: parseInt(page as string) }));
}

async function getShipmentDetail(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const shipment = await safeQueryOne(`SELECT * FROM exim_shipments WHERE id = :id`, { replacements: { id } });
  if (!shipment) return res.status(404).json(errorResponse('NOT_FOUND', 'Pengiriman tidak ditemukan'));

  const documents = await safeQuery(`SELECT * FROM exim_documents WHERE shipment_id = :id ORDER BY document_type`, { replacements: { id } });
  const containers = await safeQuery(`SELECT * FROM exim_containers WHERE shipment_id = :id`, { replacements: { id } });
  const costs = await safeQuery(`SELECT * FROM exim_costs WHERE shipment_id = :id ORDER BY cost_category`, { replacements: { id } });
  const customs = await safeQuery(`SELECT * FROM exim_customs WHERE shipment_id = :id`, { replacements: { id } });

  const costSummary = await safeQueryOne(`
    SELECT COALESCE(SUM(amount_idr), 0) as total_cost_idr,
      COALESCE(SUM(CASE WHEN cost_category = 'freight' THEN amount_idr ELSE 0 END), 0) as freight_cost,
      COALESCE(SUM(CASE WHEN cost_category = 'customs_duty' THEN amount_idr ELSE 0 END), 0) as duty_cost,
      COALESCE(SUM(CASE WHEN cost_category = 'insurance' THEN amount_idr ELSE 0 END), 0) as insurance_cost
    FROM exim_costs WHERE shipment_id = :id
  `, { replacements: { id } });

  return res.status(200).json(successResponse({ ...shipment, documents, containers, costs, customs, costSummary }));
}

async function getDocuments(req: NextApiRequest, res: NextApiResponse) {
  const { shipmentId, documentType, status } = req.query;
  let where = 'WHERE 1=1';
  if (shipmentId) where += ` AND d.shipment_id = '${shipmentId}'`;
  if (documentType) where += ` AND d.document_type = '${documentType}'`;
  if (status && status !== 'all') where += ` AND d.status = '${status}'`;

  const rows = await safeQuery(`
    SELECT d.*, s.shipment_number, s.trade_type
    FROM exim_documents d JOIN exim_shipments s ON d.shipment_id = s.id
    ${where} ORDER BY d.created_at DESC
  `);

  return res.status(200).json(successResponse(rows));
}

async function getCustoms(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '20', status, declarationType, search } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE 1=1';
  if (status && status !== 'all') where += ` AND c.status = '${status}'`;
  if (declarationType) where += ` AND c.declaration_type = '${declarationType}'`;
  if (search) where += ` AND c.declaration_number ILIKE '%${search}%'`;

  const rows = await safeQuery(`
    SELECT c.*, s.shipment_number, s.trade_type, s.partner_name
    FROM exim_customs c JOIN exim_shipments s ON c.shipment_id = s.id
    ${where} ORDER BY c.created_at DESC LIMIT ${limit} OFFSET ${offset}
  `);
  const countRow = await safeQueryOne(`SELECT COUNT(*) as count FROM exim_customs c ${where}`);

  return res.status(200).json(successResponse({ rows, total: parseInt(countRow?.count || '0') }));
}

async function getCustomsDetail(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const customs = await safeQueryOne(`
    SELECT c.*, s.shipment_number, s.trade_type, s.partner_name, s.title as shipment_title
    FROM exim_customs c JOIN exim_shipments s ON c.shipment_id = s.id WHERE c.id = :id
  `, { replacements: { id } });
  if (!customs) return res.status(404).json(errorResponse('NOT_FOUND', 'Data kepabeanan tidak ditemukan'));
  return res.status(200).json(successResponse(customs));
}

async function getLCs(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '20', status, search } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE 1=1';
  if (status && status !== 'all') where += ` AND status = '${status}'`;
  if (search) where += ` AND (lc_number ILIKE '%${search}%' OR applicant_name ILIKE '%${search}%' OR beneficiary_name ILIKE '%${search}%')`;

  const rows = await safeQuery(`SELECT * FROM exim_lcs ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`);
  const countRow = await safeQueryOne(`SELECT COUNT(*) as count FROM exim_lcs ${where}`);

  return res.status(200).json(successResponse({ rows, total: parseInt(countRow?.count || '0') }));
}

async function getLCDetail(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const lc = await safeQueryOne(`SELECT * FROM exim_lcs WHERE id = :id`, { replacements: { id } });
  if (!lc) return res.status(404).json(errorResponse('NOT_FOUND', 'L/C tidak ditemukan'));
  return res.status(200).json(successResponse(lc));
}

async function getContainers(req: NextApiRequest, res: NextApiResponse) {
  const { shipmentId, status } = req.query;
  let where = 'WHERE 1=1';
  if (shipmentId) where += ` AND c.shipment_id = '${shipmentId}'`;
  if (status && status !== 'all') where += ` AND c.status = '${status}'`;

  const rows = await safeQuery(`
    SELECT c.*, s.shipment_number, s.trade_type
    FROM exim_containers c JOIN exim_shipments s ON c.shipment_id = s.id
    ${where} ORDER BY c.created_at DESC
  `);

  return res.status(200).json(successResponse(rows));
}

async function getPartners(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '20', partnerType, status, search } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE 1=1';
  if (partnerType && partnerType !== 'all') where += ` AND partner_type = '${partnerType}'`;
  if (status && status !== 'all') where += ` AND status = '${status}'`;
  if (search) where += ` AND (name ILIKE '%${search}%' OR partner_code ILIKE '%${search}%')`;

  const rows = await safeQuery(`SELECT * FROM exim_partners ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`);
  const countRow = await safeQueryOne(`SELECT COUNT(*) as count FROM exim_partners ${where}`);

  return res.status(200).json(successResponse({ rows, total: parseInt(countRow?.count || '0') }));
}

async function getPartnerDetail(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const partner = await safeQueryOne(`SELECT * FROM exim_partners WHERE id = :id`, { replacements: { id } });
  if (!partner) return res.status(404).json(errorResponse('NOT_FOUND', 'Mitra tidak ditemukan'));
  return res.status(200).json(successResponse(partner));
}

async function getCosts(req: NextApiRequest, res: NextApiResponse) {
  const { shipmentId, category } = req.query;
  let where = 'WHERE 1=1';
  if (shipmentId) where += ` AND c.shipment_id = '${shipmentId}'`;
  if (category) where += ` AND c.cost_category = '${category}'`;

  const rows = await safeQuery(`
    SELECT c.*, s.shipment_number, s.trade_type
    FROM exim_costs c JOIN exim_shipments s ON c.shipment_id = s.id
    ${where} ORDER BY c.created_at DESC
  `);

  return res.status(200).json(successResponse(rows));
}

async function getHsCodes(req: NextApiRequest, res: NextApiResponse) {
  const { search, chapter, page = '1', limit = '50' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE is_active = true';
  if (search) where += ` AND (hs_code ILIKE '%${search}%' OR description ILIKE '%${search}%' OR description_id ILIKE '%${search}%')`;
  if (chapter) where += ` AND chapter = '${chapter}'`;

  const rows = await safeQuery(`SELECT * FROM exim_hs_codes ${where} ORDER BY hs_code LIMIT ${limit} OFFSET ${offset}`);
  const countRow = await safeQueryOne(`SELECT COUNT(*) as count FROM exim_hs_codes ${where}`);

  return res.status(200).json(successResponse({ rows, total: parseInt(countRow?.count || '0') }));
}

async function getAnalytics(req: NextApiRequest, res: NextApiResponse) {
  const tradeBalance = await safeQuery(`
    SELECT trade_type, COUNT(*) as shipment_count, COALESCE(SUM(goods_value), 0) as total_value,
      COALESCE(SUM(total_cost), 0) as total_cost
    FROM exim_shipments GROUP BY trade_type
  `);

  const byCountry = await safeQuery(`
    SELECT COALESCE(destination_country, origin_country) as country, trade_type,
      COUNT(*) as count, COALESCE(SUM(goods_value), 0) as value
    FROM exim_shipments GROUP BY COALESCE(destination_country, origin_country), trade_type
    ORDER BY value DESC LIMIT 20
  `);

  const byTransport = await safeQuery(`
    SELECT transport_mode, COUNT(*) as count, COALESCE(SUM(goods_value), 0) as value
    FROM exim_shipments GROUP BY transport_mode ORDER BY count DESC
  `);

  const monthlySummary = await safeQuery(`
    SELECT TO_CHAR(created_at, 'YYYY-MM') as month, trade_type,
      COUNT(*) as count, COALESCE(SUM(goods_value), 0) as value
    FROM exim_shipments GROUP BY TO_CHAR(created_at, 'YYYY-MM'), trade_type
    ORDER BY month DESC LIMIT 24
  `);

  const costBreakdown = await safeQuery(`
    SELECT cost_category, COALESCE(SUM(amount_idr), 0) as total
    FROM exim_costs GROUP BY cost_category ORDER BY total DESC
  `);

  return res.status(200).json(successResponse({ tradeBalance, byCountry, byTransport, monthlySummary, costBreakdown }));
}

async function getSettings(req: NextApiRequest, res: NextApiResponse) {
  const rows = await safeQuery(`SELECT * FROM exim_settings ORDER BY setting_key`);
  return res.status(200).json(successResponse(rows));
}

// ==========================================
// POST HANDLERS
// ==========================================
async function handlePost(req: NextApiRequest, res: NextApiResponse, action: string) {
  const data = req.body;

  switch (action) {
    case 'shipments': {
      const num = `${data.tradeType === 'export' ? 'EXP' : 'IMP'}-${Date.now().toString(36).toUpperCase()}`;
      const [result] = await sequelize.query(`
        INSERT INTO exim_shipments (id, tenant_id, shipment_number, trade_type, title, description, status, priority,
          incoterm, transport_mode, partner_name, partner_country, forwarder_name, shipping_line, vessel_name,
          voyage_number, flight_number, origin_port, origin_country, destination_port, destination_country,
          etd, eta, total_weight, total_volume, total_packages, goods_value, insurance_value, freight_cost,
          currency, exchange_rate, po_reference, notes, created_by)
        VALUES (gen_random_uuid(), :tenantId, :num, :tradeType, :title, :description, :status, :priority,
          :incoterm, :transportMode, :partnerName, :partnerCountry, :forwarderName, :shippingLine, :vesselName,
          :voyageNumber, :flightNumber, :originPort, :originCountry, :destinationPort, :destinationCountry,
          :etd, :eta, :totalWeight, :totalVolume, :totalPackages, :goodsValue, :insuranceValue, :freightCost,
          :currency, :exchangeRate, :poReference, :notes, :createdBy)
        RETURNING *
      `, { replacements: { tenantId: data.tenantId || null, num, tradeType: data.tradeType || 'import',
        title: data.title, description: data.description || null, status: data.status || 'draft',
        priority: data.priority || 'normal', incoterm: data.incoterm || null,
        transportMode: data.transportMode || 'sea', partnerName: data.partnerName || null,
        partnerCountry: data.partnerCountry || null, forwarderName: data.forwarderName || null,
        shippingLine: data.shippingLine || null, vesselName: data.vesselName || null,
        voyageNumber: data.voyageNumber || null, flightNumber: data.flightNumber || null,
        originPort: data.originPort || null, originCountry: data.originCountry || null,
        destinationPort: data.destinationPort || null, destinationCountry: data.destinationCountry || null,
        etd: data.etd || null, eta: data.eta || null, totalWeight: data.totalWeight || 0,
        totalVolume: data.totalVolume || 0, totalPackages: data.totalPackages || 0,
        goodsValue: data.goodsValue || 0, insuranceValue: data.insuranceValue || 0,
        freightCost: data.freightCost || 0, currency: data.currency || 'USD',
        exchangeRate: data.exchangeRate || 1, poReference: data.poReference || null,
        notes: data.notes || null, createdBy: data.createdBy || null }});
      return res.status(201).json(successResponse(result[0]));
    }
    case 'documents': {
      const [result] = await sequelize.query(`
        INSERT INTO exim_documents (id, tenant_id, shipment_id, document_type, document_number, title,
          issuer, issue_date, expiry_date, status, file_url, file_name, notes, metadata, created_by)
        VALUES (gen_random_uuid(), :tenantId, :shipmentId, :documentType, :documentNumber, :title,
          :issuer, :issueDate, :expiryDate, :status, :fileUrl, :fileName, :notes, :metadata, :createdBy)
        RETURNING *
      `, { replacements: { tenantId: data.tenantId || null, shipmentId: data.shipmentId,
        documentType: data.documentType, documentNumber: data.documentNumber || null,
        title: data.title || null, issuer: data.issuer || null, issueDate: data.issueDate || null,
        expiryDate: data.expiryDate || null, status: data.status || 'draft',
        fileUrl: data.fileUrl || null, fileName: data.fileName || null,
        notes: data.notes || null, metadata: JSON.stringify(data.metadata || {}),
        createdBy: data.createdBy || null }});
      return res.status(201).json(successResponse(result[0]));
    }
    case 'customs': {
      const [result] = await sequelize.query(`
        INSERT INTO exim_customs (id, tenant_id, shipment_id, declaration_type, declaration_number,
          declaration_date, customs_office, status, hs_items, total_duty, total_tax, total_excise,
          ppjk_name, ppjk_license, notes, created_by)
        VALUES (gen_random_uuid(), :tenantId, :shipmentId, :declarationType, :declarationNumber,
          :declarationDate, :customsOffice, :status, :hsItems, :totalDuty, :totalTax, :totalExcise,
          :ppjkName, :ppjkLicense, :notes, :createdBy)
        RETURNING *
      `, { replacements: { tenantId: data.tenantId || null, shipmentId: data.shipmentId,
        declarationType: data.declarationType, declarationNumber: data.declarationNumber || null,
        declarationDate: data.declarationDate || null, customsOffice: data.customsOffice || null,
        status: data.status || 'pending', hsItems: JSON.stringify(data.hsItems || []),
        totalDuty: data.totalDuty || 0, totalTax: data.totalTax || 0, totalExcise: data.totalExcise || 0,
        ppjkName: data.ppjkName || null, ppjkLicense: data.ppjkLicense || null,
        notes: data.notes || null, createdBy: data.createdBy || null }});
      return res.status(201).json(successResponse(result[0]));
    }
    case 'lcs': {
      const num = `LC-${Date.now().toString(36).toUpperCase()}`;
      const [result] = await sequelize.query(`
        INSERT INTO exim_lcs (id, tenant_id, lc_number, lc_type, status, applicant_name, beneficiary_name,
          issuing_bank, advising_bank, confirming_bank, amount, currency, tolerance, issue_date, expiry_date,
          latest_ship_date, presentation_days, payment_terms, tenor_days, partial_shipment, transhipment,
          goods_description, required_documents, special_conditions, notes, created_by)
        VALUES (gen_random_uuid(), :tenantId, :num, :lcType, :status, :applicantName, :beneficiaryName,
          :issuingBank, :advisingBank, :confirmingBank, :amount, :currency, :tolerance, :issueDate, :expiryDate,
          :latestShipDate, :presentationDays, :paymentTerms, :tenorDays, :partialShipment, :transhipment,
          :goodsDescription, :requiredDocuments, :specialConditions, :notes, :createdBy)
        RETURNING *
      `, { replacements: { tenantId: data.tenantId || null, num, lcType: data.lcType || 'irrevocable',
        status: data.status || 'draft', applicantName: data.applicantName || null,
        beneficiaryName: data.beneficiaryName || null, issuingBank: data.issuingBank || null,
        advisingBank: data.advisingBank || null, confirmingBank: data.confirmingBank || null,
        amount: data.amount, currency: data.currency || 'USD', tolerance: data.tolerance || 0,
        issueDate: data.issueDate || null, expiryDate: data.expiryDate || null,
        latestShipDate: data.latestShipDate || null, presentationDays: data.presentationDays || 21,
        paymentTerms: data.paymentTerms || 'at sight', tenorDays: data.tenorDays || null,
        partialShipment: data.partialShipment !== false, transhipment: data.transhipment !== false,
        goodsDescription: data.goodsDescription || null,
        requiredDocuments: JSON.stringify(data.requiredDocuments || []),
        specialConditions: data.specialConditions || null,
        notes: data.notes || null, createdBy: data.createdBy || null }});
      return res.status(201).json(successResponse(result[0]));
    }
    case 'containers': {
      const [result] = await sequelize.query(`
        INSERT INTO exim_containers (id, tenant_id, shipment_id, container_number, container_type, seal_number,
          status, gross_weight, tare_weight, net_weight, volume, packages, goods_description,
          temperature, humidity, is_hazardous, hazard_class, notes, created_by)
        VALUES (gen_random_uuid(), :tenantId, :shipmentId, :containerNumber, :containerType, :sealNumber,
          :status, :grossWeight, :tareWeight, :netWeight, :volume, :packages, :goodsDescription,
          :temperature, :humidity, :isHazardous, :hazardClass, :notes, :createdBy)
        RETURNING *
      `, { replacements: { tenantId: data.tenantId || null, shipmentId: data.shipmentId,
        containerNumber: data.containerNumber, containerType: data.containerType || '20GP',
        sealNumber: data.sealNumber || null, status: data.status || 'empty',
        grossWeight: data.grossWeight || 0, tareWeight: data.tareWeight || 0,
        netWeight: data.netWeight || 0, volume: data.volume || 0, packages: data.packages || 0,
        goodsDescription: data.goodsDescription || null, temperature: data.temperature || null,
        humidity: data.humidity || null, isHazardous: data.isHazardous || false,
        hazardClass: data.hazardClass || null, notes: data.notes || null, createdBy: data.createdBy || null }});
      return res.status(201).json(successResponse(result[0]));
    }
    case 'partners': {
      const code = `EP-${Date.now().toString(36).toUpperCase()}`;
      const [result] = await sequelize.query(`
        INSERT INTO exim_partners (id, tenant_id, partner_code, name, partner_type, status, country, city,
          address, phone, email, contact_person, tax_id, bank_details, notes, created_by)
        VALUES (gen_random_uuid(), :tenantId, :code, :name, :partnerType, :status, :country, :city,
          :address, :phone, :email, :contactPerson, :taxId, :bankDetails, :notes, :createdBy)
        RETURNING *
      `, { replacements: { tenantId: data.tenantId || null, code, name: data.name,
        partnerType: data.partnerType, status: data.status || 'active', country: data.country || null,
        city: data.city || null, address: data.address || null, phone: data.phone || null,
        email: data.email || null, contactPerson: data.contactPerson || null, taxId: data.taxId || null,
        bankDetails: JSON.stringify(data.bankDetails || {}), notes: data.notes || null,
        createdBy: data.createdBy || null }});
      return res.status(201).json(successResponse(result[0]));
    }
    case 'costs': {
      const amountIdr = (data.amount || 0) * (data.exchangeRate || 1);
      const [result] = await sequelize.query(`
        INSERT INTO exim_costs (id, tenant_id, shipment_id, cost_category, description, vendor_name,
          invoice_number, amount, currency, exchange_rate, amount_idr, status, notes, created_by)
        VALUES (gen_random_uuid(), :tenantId, :shipmentId, :costCategory, :description, :vendorName,
          :invoiceNumber, :amount, :currency, :exchangeRate, :amountIdr, :status, :notes, :createdBy)
        RETURNING *
      `, { replacements: { tenantId: data.tenantId || null, shipmentId: data.shipmentId,
        costCategory: data.costCategory, description: data.description || null,
        vendorName: data.vendorName || null, invoiceNumber: data.invoiceNumber || null,
        amount: data.amount, currency: data.currency || 'IDR', exchangeRate: data.exchangeRate || 1,
        amountIdr, status: data.status || 'pending', notes: data.notes || null,
        createdBy: data.createdBy || null }});
      return res.status(201).json(successResponse(result[0]));
    }
    case 'hs-codes': {
      const [result] = await sequelize.query(`
        INSERT INTO exim_hs_codes (id, tenant_id, hs_code, description, description_id, chapter, section,
          duty_rate, vat_rate, excise_rate, pph_rate, unit, restrictions)
        VALUES (gen_random_uuid(), :tenantId, :hsCode, :description, :descriptionId, :chapter, :section,
          :dutyRate, :vatRate, :exciseRate, :pphRate, :unit, :restrictions)
        RETURNING *
      `, { replacements: { tenantId: data.tenantId || null, hsCode: data.hsCode, description: data.description,
        descriptionId: data.descriptionId || null, chapter: data.chapter || null, section: data.section || null,
        dutyRate: data.dutyRate || 0, vatRate: data.vatRate || 11, exciseRate: data.exciseRate || 0,
        pphRate: data.pphRate || 0, unit: data.unit || null, restrictions: JSON.stringify(data.restrictions || []) }});
      return res.status(201).json(successResponse(result[0]));
    }
    default:
      return res.status(400).json(errorResponse('INVALID_ACTION', `Unknown POST action: ${action}`));
  }
}

// ==========================================
// PUT HANDLERS
// ==========================================
async function handlePut(req: NextApiRequest, res: NextApiResponse, action: string) {
  const { id } = req.query;
  const data = req.body;
  if (!id) return res.status(400).json(errorResponse('MISSING_ID', 'ID is required'));

  const buildUpdate = (fieldMap: Record<string, string>, data: any) => {
    const fields: string[] = [];
    const replacements: any = { id };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) { fields.push(`${col} = :${key}`); replacements[key] = data[key]; }
    }
    return { fields, replacements };
  };

  switch (action) {
    case 'shipments': {
      const { fields, replacements } = buildUpdate({
        title: 'title', description: 'description', status: 'status', priority: 'priority',
        incoterm: 'incoterm', transportMode: 'transport_mode', partnerName: 'partner_name',
        forwarderName: 'forwarder_name', shippingLine: 'shipping_line', vesselName: 'vessel_name',
        voyageNumber: 'voyage_number', etd: 'etd', eta: 'eta', atd: 'atd', ata: 'ata',
        totalWeight: 'total_weight', totalVolume: 'total_volume', totalPackages: 'total_packages',
        goodsValue: 'goods_value', freightCost: 'freight_cost', totalCost: 'total_cost',
        customsStatus: 'customs_status', notes: 'notes'
      }, data);
      if (fields.length === 0) return res.status(400).json(errorResponse('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE exim_shipments SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(successResponse(result[0]));
    }
    case 'documents': {
      const { fields, replacements } = buildUpdate({
        status: 'status', documentNumber: 'document_number', issuer: 'issuer',
        issueDate: 'issue_date', expiryDate: 'expiry_date', notes: 'notes'
      }, data);
      if (fields.length === 0) return res.status(400).json(errorResponse('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE exim_documents SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(successResponse(result[0]));
    }
    case 'customs': {
      const { fields, replacements } = buildUpdate({
        status: 'status', declarationNumber: 'declaration_number', declarationDate: 'declaration_date',
        customsOffice: 'customs_office', totalDuty: 'total_duty', totalTax: 'total_tax',
        totalExcise: 'total_excise', inspectionResult: 'inspection_result',
        clearanceDate: 'clearance_date', releaseDate: 'release_date', notes: 'notes'
      }, data);
      if (data.hsItems !== undefined) { fields.push('hs_items = :hsItems'); replacements.hsItems = JSON.stringify(data.hsItems); }
      if (fields.length === 0) return res.status(400).json(errorResponse('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE exim_customs SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(successResponse(result[0]));
    }
    case 'lcs': {
      const { fields, replacements } = buildUpdate({
        status: 'status', amount: 'amount', expiryDate: 'expiry_date',
        latestShipDate: 'latest_ship_date', notes: 'notes'
      }, data);
      if (data.amendments !== undefined) { fields.push('amendments = :amendments'); replacements.amendments = JSON.stringify(data.amendments); }
      if (data.discrepancies !== undefined) { fields.push('discrepancies = :discrepancies'); replacements.discrepancies = JSON.stringify(data.discrepancies); }
      if (fields.length === 0) return res.status(400).json(errorResponse('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE exim_lcs SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(successResponse(result[0]));
    }
    case 'containers': {
      const { fields, replacements } = buildUpdate({
        status: 'status', sealNumber: 'seal_number', grossWeight: 'gross_weight',
        netWeight: 'net_weight', packages: 'packages', notes: 'notes'
      }, data);
      if (fields.length === 0) return res.status(400).json(errorResponse('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE exim_containers SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(successResponse(result[0]));
    }
    case 'partners': {
      const { fields, replacements } = buildUpdate({
        name: 'name', partnerType: 'partner_type', status: 'status', country: 'country',
        city: 'city', address: 'address', phone: 'phone', email: 'email',
        contactPerson: 'contact_person', notes: 'notes'
      }, data);
      if (fields.length === 0) return res.status(400).json(errorResponse('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE exim_partners SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(successResponse(result[0]));
    }
    case 'costs': {
      const { fields, replacements } = buildUpdate({
        status: 'status', amount: 'amount', description: 'description', paidDate: 'paid_date', notes: 'notes'
      }, data);
      if (fields.length === 0) return res.status(400).json(errorResponse('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE exim_costs SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(successResponse(result[0]));
    }
    default:
      return res.status(400).json(errorResponse('INVALID_ACTION', `Unknown PUT action: ${action}`));
  }
}

// ==========================================
// DELETE HANDLERS
// ==========================================
async function handleDelete(req: NextApiRequest, res: NextApiResponse, action: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json(errorResponse('MISSING_ID', 'ID is required'));

  const tableMap: Record<string, string> = {
    shipments: 'exim_shipments', documents: 'exim_documents', customs: 'exim_customs',
    lcs: 'exim_lcs', containers: 'exim_containers', partners: 'exim_partners',
    costs: 'exim_costs', 'hs-codes': 'exim_hs_codes'
  };

  const table = tableMap[action];
  if (!table) return res.status(400).json(errorResponse('INVALID_ACTION', `Unknown DELETE action: ${action}`));

  await sequelize.query(`DELETE FROM ${table} WHERE id = :id`, { replacements: { id } });
  return res.status(200).json(successResponse({ deleted: true }));
}
