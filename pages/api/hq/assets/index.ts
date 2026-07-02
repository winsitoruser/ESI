import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { withModuleGuard } from '../../../../lib/middleware/withModuleGuard';
import { buildTenantFilter } from '../../../../lib/middleware/tenantIsolation';
import { logAudit } from '../../../../lib/audit/auditLogger';

let sequelize: any;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const { action } = req.query;

    if (req.method === 'GET') {
      if (action === 'dashboard') return getDashboard(req, res, session);
      if (action === 'list') return getAssetList(req, res, session);
      if (action === 'detail') return getAssetDetail(req, res, session);
      if (action === 'categories') return getCategories(req, res, session);
      if (action === 'movements') return getMovements(req, res, session);
      if (action === 'custody') return getCustodyLogs(req, res, session);
      if (action === 'lifecycle') return getLifecycleEvents(req, res, session);
      if (action === 'alerts') return getAlerts(req, res, session);
      if (action === 'settings') return getSettings(req, res, session);
      if (action === 'attributes') return getAttributes(req, res, session);
      return res.status(400).json({ error: 'Unknown GET action' });
    }

    if (req.method === 'POST') {
      if (action === 'create') return createAsset(req, res, session);
      if (action === 'update') return updateAsset(req, res, session);
      if (action === 'dispose') return disposeAsset(req, res, session);
      if (action === 'movement') return createMovement(req, res, session);
      if (action === 'movement-approve') return approveMovement(req, res, session);
      if (action === 'movement-receive') return receiveMovement(req, res, session);
      if (action === 'custody-checkout') return custodyCheckout(req, res, session);
      if (action === 'custody-checkin') return custodyCheckin(req, res, session);
      if (action === 'category') return upsertCategory(req, res, session);
      if (action === 'alert-acknowledge') return acknowledgeAlert(req, res, session);
      if (action === 'settings') return updateSettings(req, res, session);
      if (action === 'attribute-value') return saveAttributeValue(req, res, session);
      return res.status(400).json({ error: 'Unknown POST action' });
    }

    if (req.method === 'DELETE') {
      if (action === 'asset') return deleteAsset(req, res, session);
      if (action === 'category') return deleteCategory(req, res, session);
      return res.status(400).json({ error: 'Unknown DELETE action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Asset API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export default withModuleGuard('asset_management', handler);

// Helper: extract tenantId from session
function getTenantId(session: any): string | null {
  return (session?.user as any)?.tenantId || null;
}

// ===== DASHBOARD =====
async function getDashboard(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: { stats: {}, recentAssets: [], alerts: [] } });
  const tf = buildTenantFilter(getTenantId(session));

  const [statsResult] = await sequelize.query(`
    SELECT
      COUNT(*) as total_assets,
      COUNT(*) FILTER (WHERE status = 'active') as active_count,
      COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_count,
      COUNT(*) FILTER (WHERE status = 'disposed') as disposed_count,
      COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
      COALESCE(SUM(purchase_price), 0) as total_acquisition_value,
      COALESCE(SUM(current_book_value), 0) as total_book_value,
      COALESCE(SUM(accumulated_depreciation), 0) as total_depreciation,
      COUNT(DISTINCT category_id) as category_count,
      COUNT(DISTINCT branch_id) as branch_count,
      COUNT(*) FILTER (WHERE warranty_expiry IS NOT NULL AND warranty_expiry <= CURRENT_DATE + INTERVAL '30 days' AND warranty_expiry >= CURRENT_DATE) as warranty_expiring,
      COUNT(*) FILTER (WHERE warranty_expiry IS NOT NULL AND warranty_expiry < CURRENT_DATE) as warranty_expired
    FROM assets WHERE 1=1 ${tf.condition}
  `, { replacements: { ...tf.replacements } });

  const [recentAssets] = await sequelize.query(`
    SELECT a.id, a.asset_code, a.name, a.status, a.condition, a.purchase_price, a.current_book_value,
      a.department, a.location, a.custodian_name, a.created_at,
      c.name as category_name, c.icon as category_icon
    FROM assets a LEFT JOIN asset_categories c ON a.category_id = c.id
    WHERE 1=1 ${tf.condition.replace('tenant_id', 'a.tenant_id')}
    ORDER BY a.created_at DESC LIMIT 10
  `, { replacements: { ...tf.replacements } });

  const [categoryBreakdown] = await sequelize.query(`
    SELECT c.name, c.icon, COUNT(a.id) as count, COALESCE(SUM(a.purchase_price), 0) as total_value
    FROM asset_categories c LEFT JOIN assets a ON a.category_id = c.id ${tf.condition.replace('tenant_id', 'a.tenant_id') ? 'AND a.tenant_id = :_tenantId' : ''}
    WHERE (c.tenant_id IS NULL ${getTenantId(session) ? 'OR c.tenant_id = :_tenantId' : ''})
    GROUP BY c.id, c.name, c.icon ORDER BY count DESC
  `, { replacements: { ...tf.replacements } });

  const [statusBreakdown] = await sequelize.query(`
    SELECT status, COUNT(*) as count FROM assets WHERE 1=1 ${tf.condition} GROUP BY status ORDER BY count DESC
  `, { replacements: { ...tf.replacements } });

  const [activeAlerts] = await sequelize.query(`
    SELECT id, alert_type, severity, title, message, asset_id, due_date, created_at
    FROM asset_alerts WHERE status = 'active' ${tf.condition} ORDER BY
      CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      created_at DESC LIMIT 10
  `, { replacements: { ...tf.replacements } });

  // Condition breakdown
  const [conditionBreakdown] = await sequelize.query(`
    SELECT condition, COUNT(*) as count FROM assets WHERE status != 'disposed' AND 1=1 ${tf.condition} GROUP BY condition ORDER BY count DESC
  `, { replacements: { ...tf.replacements } });

  // Department / location distribution
  const [departmentBreakdown] = await sequelize.query(`
    SELECT COALESCE(department, 'Belum ditentukan') as department, COUNT(*) as count,
      COALESCE(SUM(purchase_price), 0) as total_value
    FROM assets WHERE status != 'disposed' AND 1=1 ${tf.condition}
    GROUP BY department ORDER BY count DESC LIMIT 10
  `, { replacements: { ...tf.replacements } });

  // Top 5 highest value assets
  const [topValueAssets] = await sequelize.query(`
    SELECT a.id, a.asset_code, a.name, a.status, a.purchase_price, a.current_book_value,
      a.accumulated_depreciation, a.depreciation_method, c.name as category_name
    FROM assets a LEFT JOIN asset_categories c ON a.category_id = c.id
    WHERE a.status != 'disposed' AND 1=1 ${tf.condition}
    ORDER BY a.purchase_price DESC LIMIT 5
  `, { replacements: { ...tf.replacements } });

  // Depreciation health (fully depreciated, partially, not started)
  const [deprHealth] = await sequelize.query(`
    SELECT
      COUNT(*) FILTER (WHERE depreciation_method != 'none' AND current_book_value <= COALESCE(salvage_value, 0)) as fully_depreciated,
      COUNT(*) FILTER (WHERE depreciation_method != 'none' AND current_book_value > COALESCE(salvage_value, 0) AND accumulated_depreciation > 0) as partially_depreciated,
      COUNT(*) FILTER (WHERE depreciation_method != 'none' AND (accumulated_depreciation IS NULL OR accumulated_depreciation = 0)) as not_started,
      COUNT(*) FILTER (WHERE depreciation_method = 'none' OR depreciation_method IS NULL) as non_depreciable,
      COALESCE(SUM(CASE WHEN depreciation_method != 'none' THEN accumulated_depreciation ELSE 0 END), 0) as total_accumulated,
      COALESCE(SUM(CASE WHEN depreciation_method != 'none' THEN purchase_price - COALESCE(salvage_value, 0) ELSE 0 END), 0) as total_depreciable_base
    FROM assets WHERE status != 'disposed' AND 1=1 ${tf.condition}
  `, { replacements: { ...tf.replacements } });

  // Monthly acquisition trend (last 12 months)
  const [monthlyTrend] = await sequelize.query(`
    SELECT TO_CHAR(acquisition_date, 'YYYY-MM') as month,
      COUNT(*) as count, COALESCE(SUM(purchase_price), 0) as total_value
    FROM assets
    WHERE acquisition_date IS NOT NULL AND acquisition_date >= CURRENT_DATE - INTERVAL '12 months' AND 1=1 ${tf.condition}
    GROUP BY TO_CHAR(acquisition_date, 'YYYY-MM')
    ORDER BY month
  `, { replacements: { ...tf.replacements } });

  // Maintenance summary
  let maintenanceSummary = { overdue: 0, upcoming: 0, open_wo: 0, in_progress_wo: 0 };
  try {
    const [maint] = await sequelize.query(`
      SELECT
        COUNT(*) FILTER (WHERE ms.next_due_date < CURRENT_DATE) as overdue,
        COUNT(*) FILTER (WHERE ms.next_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as upcoming
      FROM asset_maintenance_schedules ms
      JOIN assets a ON ms.asset_id = a.id
      WHERE ms.is_active = true ${buildTenantFilter(getTenantId(session), 'a').condition}
    `, { replacements: { ...tf.replacements } });
    const [wo] = await sequelize.query(`
      SELECT
        COUNT(*) FILTER (WHERE wo.status = 'open') as open_wo,
        COUNT(*) FILTER (WHERE wo.status = 'in_progress') as in_progress_wo
      FROM asset_work_orders wo
      JOIN assets a ON wo.asset_id = a.id
      WHERE 1=1 ${buildTenantFilter(getTenantId(session), 'a').condition}
    `, { replacements: { ...tf.replacements } });
    maintenanceSummary = { ...maint[0], ...wo[0] };
  } catch (e) {}

  return res.json({
    success: true,
    data: {
      stats: statsResult[0] || {},
      recentAssets,
      categoryBreakdown,
      statusBreakdown,
      conditionBreakdown,
      departmentBreakdown,
      topValueAssets,
      depreciationHealth: deprHealth[0] || {},
      monthlyTrend,
      maintenanceSummary,
      alerts: activeAlerts
    }
  });
}

// ===== ASSET LIST =====
async function getAssetList(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [], total: 0 });
  const { search, status, category, department, branch, condition: cond, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(String(page)) - 1) * parseInt(String(limit));
  const lim = Math.min(parseInt(String(limit)), 100);
  const tf = buildTenantFilter(getTenantId(session), 'a');

  let where = `WHERE 1=1 ${tf.condition}`;
  const replacements: any = { ...tf.replacements };

  if (search) { where += " AND (a.name ILIKE :search OR a.asset_code ILIKE :search OR a.serial_number ILIKE :search OR a.barcode ILIKE :search)"; replacements.search = `%${search}%`; }
  if (status) { where += " AND a.status = :status"; replacements.status = status; }
  if (category) { where += " AND a.category_id = :category"; replacements.category = category; }
  if (department) { where += " AND a.department = :department"; replacements.department = department; }
  if (branch) { where += " AND a.branch_id = :branch"; replacements.branch = branch; }
  if (cond) { where += " AND a.condition = :cond"; replacements.cond = cond; }

  const [countResult] = await sequelize.query(`SELECT COUNT(*) as total FROM assets a ${where}`, { replacements });
  const total = parseInt(countResult[0]?.total || '0');

  const [rows] = await sequelize.query(`
    SELECT a.*, c.name as category_name, c.icon as category_icon, c.code as category_code
    FROM assets a LEFT JOIN asset_categories c ON a.category_id = c.id
    ${where}
    ORDER BY a.created_at DESC LIMIT :lim OFFSET :offset
  `, { replacements: { ...replacements, lim, offset } });

  return res.json({ success: true, data: rows, total, page: parseInt(String(page)), limit: lim });
}

// ===== ASSET DETAIL =====
async function getAssetDetail(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: null });
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Asset ID required' });

  const tf = buildTenantFilter(getTenantId(session), 'a');
  const [assets] = await sequelize.query(`
    SELECT a.*, c.name as category_name, c.icon as category_icon, c.code as category_code,
      c.depreciation_method as category_depr_method, c.default_useful_life as category_useful_life
    FROM assets a LEFT JOIN asset_categories c ON a.category_id = c.id
    WHERE a.id = :id ${tf.condition}
  `, { replacements: { id, ...tf.replacements } });

  if (!assets.length) return res.status(404).json({ error: 'Asset not found' });

  // Get EAV attribute values
  const [attrValues] = await sequelize.query(`
    SELECT av.*, at.name as attr_name, at.code as attr_code, at.data_type
    FROM asset_attribute_values av
    JOIN asset_attributes at ON av.attribute_id = at.id
    WHERE av.asset_id = :id ORDER BY at.sort_order
  `, { replacements: { id } });

  // Get recent lifecycle events
  const [lifecycle] = await sequelize.query(`
    SELECT * FROM asset_lifecycle_events WHERE asset_id = :id ORDER BY event_date DESC LIMIT 20
  `, { replacements: { id } });

  // Get depreciation schedule
  const [depreciation] = await sequelize.query(`
    SELECT * FROM asset_depreciation_schedule WHERE asset_id = :id ORDER BY period_number
  `, { replacements: { id } });

  // Get recent movements
  const [movements] = await sequelize.query(`
    SELECT * FROM asset_movements WHERE asset_id = :id ORDER BY movement_date DESC LIMIT 10
  `, { replacements: { id } });

  // Get custody logs
  const [custody] = await sequelize.query(`
    SELECT * FROM asset_custody_logs WHERE asset_id = :id ORDER BY handover_date DESC LIMIT 10
  `, { replacements: { id } });

  return res.json({
    success: true,
    data: {
      ...assets[0],
      attributeValues: attrValues,
      lifecycle,
      depreciation,
      movements,
      custody
    }
  });
}

// ===== CREATE ASSET =====
async function createAsset(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });
  const body = req.body;

  // Auto-generate asset code
  const [seqResult] = await sequelize.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(asset_code FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num
    FROM assets
  `);
  const nextNum = seqResult[0]?.next_num || 1;
  const assetCode = body.assetCode || `AST-${String(nextNum).padStart(5, '0')}`;

  const [result] = await sequelize.query(`
    INSERT INTO assets (
      tenant_id, asset_code, name, description, category_id, status, condition,
      acquisition_type, acquisition_date, purchase_price, supplier_id, po_number, invoice_number,
      warranty_expiry, serial_number, barcode, qr_code, rfid_tag,
      branch_id, department, location, floor, room, gps_latitude, gps_longitude,
      custodian_id, custodian_name, brand, model, manufacturer, year_manufactured,
      depreciation_method, useful_life_months, salvage_value, current_book_value,
      insurance_policy, insurance_provider, insurance_expiry, insurance_value,
      photo_url, attachments, tags, custom_fields, notes,
      created_by, created_at, updated_at
    ) VALUES (
      :tenantId, :assetCode, :name, :description, :categoryId, :status, :condition,
      :acquisitionType, :acquisitionDate, :purchasePrice, :supplierId, :poNumber, :invoiceNumber,
      :warrantyExpiry, :serialNumber, :barcode, :qrCode, :rfidTag,
      :branchId, :department, :location, :floor, :room, :gpsLat, :gpsLng,
      :custodianId, :custodianName, :brand, :model, :manufacturer, :yearManufactured,
      :depreciationMethod, :usefulLifeMonths, :salvageValue, :purchasePrice,
      :insurancePolicy, :insuranceProvider, :insuranceExpiry, :insuranceValue,
      :photoUrl, :attachments::jsonb, :tags::jsonb, :customFields::jsonb, :notes,
      :createdBy, NOW(), NOW()
    ) RETURNING *
  `, {
    replacements: {
      assetCode,
      name: body.name,
      description: body.description || null,
      categoryId: body.categoryId || null,
      status: body.status || 'active',
      condition: body.condition || 'good',
      acquisitionType: body.acquisitionType || 'purchase',
      acquisitionDate: body.acquisitionDate || null,
      purchasePrice: body.purchasePrice || 0,
      supplierId: body.supplierId || null,
      poNumber: body.poNumber || null,
      invoiceNumber: body.invoiceNumber || null,
      warrantyExpiry: body.warrantyExpiry || null,
      serialNumber: body.serialNumber || null,
      barcode: body.barcode || null,
      qrCode: body.qrCode || null,
      rfidTag: body.rfidTag || null,
      branchId: body.branchId || null,
      department: body.department || null,
      location: body.location || null,
      floor: body.floor || null,
      room: body.room || null,
      gpsLat: body.gpsLatitude || null,
      gpsLng: body.gpsLongitude || null,
      custodianId: body.custodianId || null,
      custodianName: body.custodianName || null,
      brand: body.brand || null,
      model: body.model || null,
      manufacturer: body.manufacturer || null,
      yearManufactured: body.yearManufactured || null,
      depreciationMethod: body.depreciationMethod || 'straight_line',
      usefulLifeMonths: body.usefulLifeMonths || 60,
      salvageValue: body.salvageValue || 0,
      insurancePolicy: body.insurancePolicy || null,
      insuranceProvider: body.insuranceProvider || null,
      insuranceExpiry: body.insuranceExpiry || null,
      insuranceValue: body.insuranceValue || null,
      photoUrl: body.photoUrl || null,
      attachments: JSON.stringify(body.attachments || []),
      tags: JSON.stringify(body.tags || []),
      customFields: JSON.stringify(body.customFields || {}),
      notes: body.notes || null,
      createdBy: (session.user as any).id || null,
      tenantId: getTenantId(session)
    }
  });

  // Log lifecycle event
  if (result.length > 0) {
    await sequelize.query(`
      INSERT INTO asset_lifecycle_events (tenant_id, asset_id, event_type, to_status, description, performed_by, performed_by_name)
      VALUES (:tenantId, :assetId, 'created', :status, 'Aset baru didaftarkan', :userId, :userName)
    `, {
      replacements: {
        tenantId: getTenantId(session),
        assetId: result[0].id,
        status: body.status || 'active',
        userId: (session.user as any).id || null,
        userName: (session.user as any).name || 'System'
      }
    });

    try {
      await logAudit({ tenantId: getTenantId(session), action: 'create', entityType: 'asset', entityId: result[0].id, userId: (session.user as any).id, userName: (session.user as any).name, newValues: { name: body.name, assetCode: result[0].asset_code }, metadata: { module: 'asset_management' }, req });
    } catch (e) {}
  }

  return res.status(201).json({ success: true, data: result[0] });
}

// ===== UPDATE ASSET =====
async function updateAsset(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });
  const { id } = req.query;
  const body = req.body;
  if (!id) return res.status(400).json({ error: 'Asset ID required' });

  // Get current status for lifecycle tracking
  const tf = buildTenantFilter(getTenantId(session));
  const [current] = await sequelize.query(`SELECT status FROM assets WHERE id = :id ${tf.condition}`, { replacements: { id, ...tf.replacements } });
  if (!current.length) return res.status(404).json({ error: 'Asset not found' });

  const fields: string[] = [];
  const replacements: any = { id };

  const fieldMap: Record<string, string> = {
    name: 'name', description: 'description', categoryId: 'category_id', status: 'status',
    condition: 'condition', acquisitionType: 'acquisition_type', acquisitionDate: 'acquisition_date',
    purchasePrice: 'purchase_price', warrantyExpiry: 'warranty_expiry', serialNumber: 'serial_number',
    barcode: 'barcode', qrCode: 'qr_code', rfidTag: 'rfid_tag', branchId: 'branch_id',
    department: 'department', location: 'location', floor: 'floor', room: 'room',
    gpsLatitude: 'gps_latitude', gpsLongitude: 'gps_longitude',
    custodianId: 'custodian_id', custodianName: 'custodian_name',
    brand: 'brand', model: 'model', manufacturer: 'manufacturer',
    depreciationMethod: 'depreciation_method', usefulLifeMonths: 'useful_life_months',
    salvageValue: 'salvage_value', photoUrl: 'photo_url', notes: 'notes'
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (body[key] !== undefined) {
      fields.push(`${col} = :${key}`);
      replacements[key] = body[key];
    }
  }

  if (body.tags !== undefined) { fields.push("tags = :tags::jsonb"); replacements.tags = JSON.stringify(body.tags); }
  if (body.customFields !== undefined) { fields.push("custom_fields = :customFields::jsonb"); replacements.customFields = JSON.stringify(body.customFields); }
  if (body.attachments !== undefined) { fields.push("attachments = :attachments::jsonb"); replacements.attachments = JSON.stringify(body.attachments); }

  fields.push("updated_by = :updatedBy", "updated_at = NOW()");
  replacements.updatedBy = (session.user as any).id || null;

  await sequelize.query(`UPDATE assets SET ${fields.join(', ')} WHERE id = :id ${tf.condition}`, { replacements: { ...replacements, ...tf.replacements } });

  // Log status change
  if (body.status && body.status !== current[0].status) {
    await sequelize.query(`
      INSERT INTO asset_lifecycle_events (tenant_id, asset_id, event_type, from_status, to_status, description, performed_by, performed_by_name)
      VALUES (:tenantId, :assetId, 'status_change', :fromStatus, :toStatus, :desc, :userId, :userName)
    `, {
      replacements: {
        tenantId: getTenantId(session),
        assetId: id,
        fromStatus: current[0].status,
        toStatus: body.status,
        desc: `Status diubah dari ${current[0].status} ke ${body.status}`,
        userId: (session.user as any).id || null,
        userName: (session.user as any).name || 'System'
      }
    });
  }

  try {
    await logAudit({ tenantId: getTenantId(session), action: 'update', entityType: 'asset', entityId: String(id), userId: (session.user as any).id, userName: (session.user as any).name, newValues: body, metadata: { module: 'asset_management' }, req });
  } catch (e) {}

  return res.json({ success: true, message: 'Asset updated' });
}

// ===== DISPOSE ASSET =====
async function disposeAsset(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });
  const body = req.body;
  if (!body.id) return res.status(400).json({ error: 'Asset ID required' });

  const tf = buildTenantFilter(getTenantId(session));
  await sequelize.query(`
    UPDATE assets SET status = 'disposed', disposal_date = :disposalDate, disposal_method = :method,
      disposal_price = :price, disposal_reason = :reason, disposal_approved_by = :approvedBy,
      updated_at = NOW() WHERE id = :id ${tf.condition}
  `, {
    replacements: {
      id: body.id,
      disposalDate: body.disposalDate || new Date().toISOString().split('T')[0],
      method: body.disposalMethod || 'sold',
      price: body.disposalPrice || 0,
      reason: body.disposalReason || null,
      approvedBy: (session.user as any).id || null,
      ...tf.replacements
    }
  });

  await sequelize.query(`
    INSERT INTO asset_lifecycle_events (tenant_id, asset_id, event_type, to_status, description, performed_by, performed_by_name, metadata)
    VALUES (:tenantId, :id, 'disposed', 'disposed', :desc, :userId, :userName, :meta::jsonb)
  `, {
    replacements: {
      tenantId: getTenantId(session), id: body.id,
      desc: `Aset dihapuskan via ${body.disposalMethod || 'sold'}`,
      userId: (session.user as any).id || null,
      userName: (session.user as any).name || 'System',
      meta: JSON.stringify({ disposal_price: body.disposalPrice, method: body.disposalMethod, reason: body.disposalReason })
    }
  });

  return res.json({ success: true, message: 'Asset disposed' });
}

// ===== DELETE ASSET =====
async function deleteAsset(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Asset ID required' });

  const tf = buildTenantFilter(getTenantId(session));
  const [check] = await sequelize.query(`SELECT status FROM assets WHERE id = :id ${tf.condition}`, { replacements: { id, ...tf.replacements } });
  if (!check.length) return res.status(404).json({ error: 'Asset not found' });
  if (check[0].status === 'active') return res.status(400).json({ error: 'Cannot delete active asset. Dispose it first.' });

  await sequelize.query(`DELETE FROM assets WHERE id = :id ${tf.condition}`, { replacements: { id, ...tf.replacements } });
  try {
    await logAudit({ tenantId: getTenantId(session), action: 'delete', entityType: 'asset', entityId: String(id), userId: (session.user as any).id, userName: (session.user as any).name, metadata: { module: 'asset_management' }, req });
  } catch (e) {}
  return res.json({ success: true, message: 'Asset deleted' });
}

// ===== CATEGORIES =====
async function getCategories(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const tenantId = getTenantId(session);
  const [rows] = await sequelize.query(`
    SELECT c.*, (SELECT COUNT(*) FROM assets a WHERE a.category_id = c.id ${tenantId ? 'AND a.tenant_id = :_tenantId' : ''}) as asset_count
    FROM asset_categories c WHERE (c.tenant_id IS NULL ${tenantId ? 'OR c.tenant_id = :_tenantId' : ''})
    ORDER BY c.sort_order, c.name
  `, { replacements: tenantId ? { _tenantId: tenantId } : {} });
  return res.json({ success: true, data: rows });
}

async function upsertCategory(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });
  const body = req.body;
  if (body.id) {
    await sequelize.query(`
      UPDATE asset_categories SET name = :name, code = :code, description = :description,
        icon = :icon, depreciation_method = :deprMethod, default_useful_life = :usefulLife,
        default_salvage_pct = :salvagePct, industry_pack = :industryPack, is_active = :isActive,
        sort_order = :sortOrder, parent_id = :parentId, updated_at = NOW()
      WHERE id = :id
    `, {
      replacements: {
        id: body.id, name: body.name, code: body.code, description: body.description || null,
        icon: body.icon || null, deprMethod: body.depreciationMethod || 'straight_line',
        usefulLife: body.defaultUsefulLife || 60, salvagePct: body.defaultSalvagePct || 0,
        industryPack: body.industryPack || null, isActive: body.isActive !== false,
        sortOrder: body.sortOrder || 0, parentId: body.parentId || null
      }
    });
    return res.json({ success: true, message: 'Category updated' });
  } else {
    const [result] = await sequelize.query(`
      INSERT INTO asset_categories (tenant_id, code, name, description, icon, depreciation_method, default_useful_life, default_salvage_pct, industry_pack, is_active, sort_order, parent_id)
      VALUES (:tenantId, :code, :name, :description, :icon, :deprMethod, :usefulLife, :salvagePct, :industryPack, :isActive, :sortOrder, :parentId) RETURNING *
    `, {
      replacements: {
        tenantId: getTenantId(session), code: body.code, name: body.name, description: body.description || null,
        icon: body.icon || null, deprMethod: body.depreciationMethod || 'straight_line',
        usefulLife: body.defaultUsefulLife || 60, salvagePct: body.defaultSalvagePct || 0,
        industryPack: body.industryPack || null, isActive: body.isActive !== false,
        sortOrder: body.sortOrder || 0, parentId: body.parentId || null
      }
    });
    return res.status(201).json({ success: true, data: result[0] });
  }
}

async function deleteCategory(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });
  const { id } = req.query;
  const [check] = await sequelize.query(`SELECT COUNT(*) as c FROM assets WHERE category_id = :id`, { replacements: { id } });
  if (parseInt(check[0].c) > 0) return res.status(400).json({ error: 'Category still has assets assigned' });
  await sequelize.query(`DELETE FROM asset_categories WHERE id = :id`, { replacements: { id } });
  return res.json({ success: true, message: 'Category deleted' });
}

// ===== MOVEMENTS =====
async function getMovements(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const tf = buildTenantFilter(getTenantId(session), 'a');
  const { assetId, status: st, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(String(page)) - 1) * parseInt(String(limit));
  let where = `WHERE 1=1 ${tf.condition}`;
  const replacements: any = { ...tf.replacements };
  if (assetId) { where += ' AND m.asset_id = :assetId'; replacements.assetId = assetId; }
  if (st) { where += ' AND m.status = :st'; replacements.st = st; }

  const [rows] = await sequelize.query(`
    SELECT m.*, a.name as asset_name, a.asset_code FROM asset_movements m
    JOIN assets a ON m.asset_id = a.id ${where}
    ORDER BY m.movement_date DESC LIMIT :limit OFFSET :offset
  `, { replacements: { ...replacements, limit: parseInt(String(limit)), offset } });

  return res.json({ success: true, data: rows });
}

async function createMovement(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });
  const body = req.body;

  // Generate reference number
  const [seqRes] = await sequelize.query(`SELECT COUNT(*)+1 as num FROM asset_movements`);
  const refNum = `MOV-${String(seqRes[0].num).padStart(5, '0')}`;

  // Get current asset location
  const [asset] = await sequelize.query(`SELECT branch_id, department, location, custodian_id, custodian_name FROM assets WHERE id = :id`, { replacements: { id: body.assetId } });

  const [result] = await sequelize.query(`
    INSERT INTO asset_movements (
      tenant_id, asset_id, movement_type, reference_number,
      from_branch_id, from_department, from_location, from_custodian_id, from_custodian_name,
      to_branch_id, to_department, to_location, to_custodian_id, to_custodian_name,
      status, requested_by, requested_by_name, reason, condition_on_transfer, notes
    ) VALUES (
      :tenantId, :assetId, :type, :ref,
      :fromBranch, :fromDept, :fromLoc, :fromCustId, :fromCustName,
      :toBranch, :toDept, :toLoc, :toCustId, :toCustName,
      'pending', :reqBy, :reqByName, :reason, :condition, :notes
    ) RETURNING *
  `, {
    replacements: {
      tenantId: getTenantId(session), assetId: body.assetId, type: body.movementType || 'transfer', ref: refNum,
      fromBranch: asset[0]?.branch_id || null, fromDept: asset[0]?.department || null,
      fromLoc: asset[0]?.location || null, fromCustId: asset[0]?.custodian_id || null,
      fromCustName: asset[0]?.custodian_name || null,
      toBranch: body.toBranchId || null, toDept: body.toDepartment || null,
      toLoc: body.toLocation || null, toCustId: body.toCustodianId || null,
      toCustName: body.toCustodianName || null,
      reqBy: (session.user as any).id || null, reqByName: (session.user as any).name || 'System',
      reason: body.reason || null, condition: body.conditionOnTransfer || 'good',
      notes: body.notes || null
    }
  });

  return res.status(201).json({ success: true, data: result[0] });
}

async function approveMovement(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });
  const { id } = req.body;
  await sequelize.query(`
    UPDATE asset_movements SET status = 'approved', approved_by = :userId, approved_by_name = :userName, approved_at = NOW()
    WHERE id = :id AND status = 'pending'
  `, { replacements: { id, userId: (session.user as any).id, userName: (session.user as any).name } });
  return res.json({ success: true, message: 'Movement approved' });
}

async function receiveMovement(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });
  const { id } = req.body;

  // Get movement details
  const [mov] = await sequelize.query(`SELECT * FROM asset_movements WHERE id = :id AND status = 'approved'`, { replacements: { id } });
  if (!mov.length) return res.status(404).json({ error: 'Movement not found or not approved' });

  // Update movement
  await sequelize.query(`
    UPDATE asset_movements SET status = 'received', received_by = :userId, received_by_name = :userName, received_at = NOW()
    WHERE id = :id
  `, { replacements: { id, userId: (session.user as any).id, userName: (session.user as any).name } });

  // Update asset location
  await sequelize.query(`
    UPDATE assets SET branch_id = :branch, department = :dept, location = :loc,
      custodian_id = :custId, custodian_name = :custName, updated_at = NOW()
    WHERE id = :assetId
  `, {
    replacements: {
      assetId: mov[0].asset_id, branch: mov[0].to_branch_id, dept: mov[0].to_department,
      loc: mov[0].to_location, custId: mov[0].to_custodian_id, custName: mov[0].to_custodian_name
    }
  });

  // Log lifecycle
  await sequelize.query(`
    INSERT INTO asset_lifecycle_events (tenant_id, asset_id, event_type, description, performed_by, performed_by_name, metadata)
    VALUES (:tenantId, :assetId, 'movement', 'Aset dipindahkan', :userId, :userName, :meta::jsonb)
  `, {
    replacements: {
      tenantId: getTenantId(session), assetId: mov[0].asset_id, userId: (session.user as any).id, userName: (session.user as any).name,
      meta: JSON.stringify({ movement_id: id, from: mov[0].from_department, to: mov[0].to_department })
    }
  });

  return res.json({ success: true, message: 'Movement received, asset location updated' });
}

// ===== CUSTODY =====
async function getCustodyLogs(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const tf = buildTenantFilter(getTenantId(session), 'a');
  const { assetId } = req.query;
  let where = `WHERE 1=1 ${tf.condition}`;
  const replacements: any = { ...tf.replacements };
  if (assetId) { where += ' AND cl.asset_id = :assetId'; replacements.assetId = assetId; }

  const [rows] = await sequelize.query(`
    SELECT cl.*, a.name as asset_name, a.asset_code FROM asset_custody_logs cl
    JOIN assets a ON cl.asset_id = a.id ${where} ORDER BY cl.handover_date DESC LIMIT 50
  `, { replacements });
  return res.json({ success: true, data: rows });
}

async function custodyCheckout(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });
  const body = req.body;

  const tf = buildTenantFilter(getTenantId(session));
  await sequelize.query(`
    INSERT INTO asset_custody_logs (tenant_id, asset_id, action, custodian_id, custodian_name, handover_date, condition_checkout, checklist, notes, created_by)
    VALUES (:tenantId, :assetId, 'checkout', :custId, :custName, NOW(), :condition, :checklist::jsonb, :notes, :createdBy)
  `, {
    replacements: {
      tenantId: getTenantId(session), assetId: body.assetId, custId: body.custodianId, custName: body.custodianName,
      condition: body.condition || 'good', checklist: JSON.stringify(body.checklist || []),
      notes: body.notes || null, createdBy: (session.user as any).id
    }
  });

  // Update asset custodian
  await sequelize.query(`UPDATE assets SET custodian_id = :custId, custodian_name = :custName, updated_at = NOW() WHERE id = :assetId ${tf.condition}`, {
    replacements: { assetId: body.assetId, custId: body.custodianId, custName: body.custodianName, ...tf.replacements }
  });

  return res.json({ success: true, message: 'Asset checked out' });
}

async function custodyCheckin(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });
  const body = req.body;
  const tf = buildTenantFilter(getTenantId(session));

  // Update last checkout record
  await sequelize.query(`
    UPDATE asset_custody_logs SET return_date = NOW(), condition_checkin = :condition
    WHERE asset_id = :assetId AND action = 'checkout' AND return_date IS NULL
    ORDER BY handover_date DESC LIMIT 1
  `, { replacements: { assetId: body.assetId, condition: body.condition || 'good' } });

  // Insert checkin log
  await sequelize.query(`
    INSERT INTO asset_custody_logs (tenant_id, asset_id, action, custodian_id, custodian_name, handover_date, condition_checkin, notes, created_by)
    VALUES (:tenantId, :assetId, 'checkin', :custId, :custName, NOW(), :condition, :notes, :createdBy)
  `, {
    replacements: {
      tenantId: getTenantId(session), assetId: body.assetId, custId: body.custodianId || null, custName: body.custodianName || null,
      condition: body.condition || 'good', notes: body.notes || null, createdBy: (session.user as any).id
    }
  });

  // Clear custodian
  await sequelize.query(`UPDATE assets SET custodian_id = NULL, custodian_name = NULL, updated_at = NOW() WHERE id = :assetId ${tf.condition}`, {
    replacements: { assetId: body.assetId, ...tf.replacements }
  });

  return res.json({ success: true, message: 'Asset checked in' });
}

// ===== LIFECYCLE =====
async function getLifecycleEvents(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const { assetId } = req.query;
  const [rows] = await sequelize.query(`
    SELECT * FROM asset_lifecycle_events WHERE asset_id = :assetId ORDER BY event_date DESC
  `, { replacements: { assetId } });
  return res.json({ success: true, data: rows });
}

// ===== ALERTS =====
async function getAlerts(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const tf = buildTenantFilter(getTenantId(session), 'al');
  const { status: st } = req.query;
  let where = `WHERE 1=1 ${tf.condition}`;
  const replacements: any = { ...tf.replacements };
  if (st) { where += ' AND al.status = :st'; replacements.st = st; }

  const [rows] = await sequelize.query(`
    SELECT al.*, a.name as asset_name, a.asset_code FROM asset_alerts al
    LEFT JOIN assets a ON al.asset_id = a.id ${where}
    ORDER BY CASE al.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, al.created_at DESC
    LIMIT 50
  `, { replacements });
  return res.json({ success: true, data: rows });
}

async function acknowledgeAlert(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });
  const { id, resolve: resolveAlert } = req.body;
  const newStatus = resolveAlert ? 'resolved' : 'acknowledged';
  const field = resolveAlert ? 'resolved_by' : 'acknowledged_by';
  const timeField = resolveAlert ? 'resolved_at' : 'acknowledged_at';

  await sequelize.query(`UPDATE asset_alerts SET status = :status, ${field} = :userId, ${timeField} = NOW() WHERE id = :id`, {
    replacements: { id, status: newStatus, userId: (session.user as any).id }
  });
  return res.json({ success: true, message: `Alert ${newStatus}` });
}

// ===== SETTINGS =====
async function getSettings(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: {} });
  const tf = buildTenantFilter(getTenantId(session));
  const [rows] = await sequelize.query(`SELECT setting_key, setting_value FROM asset_settings WHERE 1=1 ${tf.condition} ORDER BY setting_key`, { replacements: { ...tf.replacements } });
  const settings: any = {};
  rows.forEach((r: any) => { settings[r.setting_key] = r.setting_value; });
  return res.json({ success: true, data: settings });
}

async function updateSettings(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });
  const { key, value } = req.body;
  await sequelize.query(`
    INSERT INTO asset_settings (tenant_id, setting_key, setting_value, updated_at)
    VALUES (:tenantId, :key, :value::jsonb, NOW())
    ON CONFLICT (tenant_id, setting_key) DO UPDATE SET setting_value = :value::jsonb, updated_at = NOW()
  `, { replacements: { tenantId: getTenantId(session), key, value: JSON.stringify(value) } });
  return res.json({ success: true, message: 'Settings updated' });
}

// ===== ATTRIBUTES (EAV) =====
async function getAttributes(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const { categoryId, industryPack } = req.query;
  let where = 'WHERE 1=1';
  const replacements: any = {};
  if (categoryId) { where += ' AND (category_id = :categoryId OR category_id IS NULL)'; replacements.categoryId = categoryId; }
  if (industryPack) { where += ' AND (industry_pack = :industryPack OR industry_pack IS NULL)'; replacements.industryPack = industryPack; }

  const [rows] = await sequelize.query(`SELECT * FROM asset_attributes ${where} ORDER BY sort_order`, { replacements });
  return res.json({ success: true, data: rows });
}

async function saveAttributeValue(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });
  const { assetId, attributeId, value, dataType } = req.body;

  const valueCol = dataType === 'number' ? 'value_number' : dataType === 'date' ? 'value_date' : dataType === 'boolean' ? 'value_boolean' : 'value_string';
  const otherCols = ['value_string', 'value_number', 'value_date', 'value_boolean'].filter(c => c !== valueCol);

  await sequelize.query(`
    INSERT INTO asset_attribute_values (asset_id, attribute_id, ${valueCol})
    VALUES (:assetId, :attributeId, :val)
    ON CONFLICT (asset_id, attribute_id) DO UPDATE SET ${valueCol} = :val, ${otherCols.map(c => `${c} = NULL`).join(', ')}, updated_at = NOW()
  `, { replacements: { assetId, attributeId, val: value } });

  return res.json({ success: true, message: 'Attribute value saved' });
}
