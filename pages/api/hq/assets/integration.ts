import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { withModuleGuard } from '../../../../lib/middleware/withModuleGuard';
import { buildTenantFilter } from '../../../../lib/middleware/tenantIsolation';
import { logAudit } from '../../../../lib/audit/auditLogger';

let sequelize: any;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

function getTenantId(session: any): string | null {
  return (session?.user as any)?.tenantId || null;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const { action } = req.query;

    if (req.method === 'GET') {
      // Finance Integration
      if (action === 'finance-summary') return getFinanceSummary(req, res);
      if (action === 'depreciation-journal-preview') return getDeprJournalPreview(req, res);
      // HR Integration
      if (action === 'employee-assets') return getEmployeeAssets(req, res);
      if (action === 'offboarding-check') return getOffboardingCheck(req, res);
      // Inventory Integration
      if (action === 'spare-part-stock') return getSparePartStock(req, res);
      // Alert Generation
      if (action === 'generate-alerts') return generateAlerts(req, res, session);
      return res.status(400).json({ error: 'Unknown GET action' });
    }

    if (req.method === 'POST') {
      // Finance: Create journal entry for depreciation
      if (action === 'create-depreciation-journal') return createDepreciationJournal(req, res, session);
      // Finance: Create journal entry for disposal gain/loss
      if (action === 'create-disposal-journal') return createDisposalJournal(req, res, session);
      // Procurement: Create purchase requisition for spare parts
      if (action === 'create-spare-part-requisition') return createSparePartRequisition(req, res, session);
      // HR: Assign asset to employee
      if (action === 'assign-to-employee') return assignToEmployee(req, res, session);
      // HR: Unassign asset from employee
      if (action === 'unassign-from-employee') return unassignFromEmployee(req, res, session);
      return res.status(400).json({ error: 'Unknown POST action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Asset Integration API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export default withModuleGuard('asset_management', handler);

// ============================================================
// FINANCE INTEGRATION
// ============================================================

async function getFinanceSummary(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: {} });
  const session = await getServerSession(req, res, authOptions);
  const tf = buildTenantFilter(getTenantId(session));

  const [assetValues] = await sequelize.query(`
    SELECT
      SUM(purchase_price) as total_acquisition,
      SUM(current_book_value) as total_book_value,
      SUM(accumulated_depreciation) as total_depreciation,
      SUM(CASE WHEN status = 'disposed' THEN COALESCE(disposal_price, 0) ELSE 0 END) as total_disposal_proceeds,
      SUM(CASE WHEN status = 'disposed' THEN COALESCE(disposal_price, 0) - current_book_value ELSE 0 END) as total_disposal_gain_loss,
      COUNT(*) FILTER (WHERE status = 'disposed' AND disposal_date >= DATE_TRUNC('year', CURRENT_DATE)) as disposals_this_year
    FROM assets WHERE 1=1 ${tf.condition}
  `, { replacements: { ...tf.replacements } });

  const [monthlyDepr] = await sequelize.query(`
    SELECT SUM(depreciation_amount) as pending_amount, COUNT(*) as pending_count
    FROM asset_depreciation_schedule
    WHERE is_posted = false AND period_date <= CURRENT_DATE ${tf.condition}
  `, { replacements: { ...tf.replacements } });

  const [insuranceValue] = await sequelize.query(`
    SELECT SUM(insurance_value) as total_insured,
      COUNT(*) FILTER (WHERE insurance_expiry < CURRENT_DATE) as expired_policies,
      COUNT(*) FILTER (WHERE insurance_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_policies
    FROM assets WHERE insurance_value IS NOT NULL AND insurance_value > 0 ${tf.condition}
  `, { replacements: { ...tf.replacements } });

  return res.json({
    success: true,
    data: {
      assetValues: assetValues[0] || {},
      pendingDepreciation: monthlyDepr[0] || {},
      insurance: insuranceValue[0] || {},
      capexIndicators: {
        totalCapex: assetValues[0]?.total_acquisition || 0,
        netBookValue: assetValues[0]?.total_book_value || 0,
        depreciationRate: assetValues[0]?.total_acquisition > 0
          ? ((assetValues[0]?.total_depreciation / assetValues[0]?.total_acquisition) * 100).toFixed(1)
          : 0
      }
    }
  });
}

async function getDeprJournalPreview(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const session = await getServerSession(req, res, authOptions);
  const tf = buildTenantFilter(getTenantId(session), 'a');
  const { period } = req.query;

  let where = `WHERE ds.is_posted = false AND ds.period_date <= CURRENT_DATE ${tf.condition}`;
  const replacements: any = { ...tf.replacements };
  if (period) { where += " AND TO_CHAR(ds.period_date, 'YYYY-MM') = :period"; replacements.period = period; }

  const [items] = await sequelize.query(`
    SELECT ds.id, ds.asset_id, ds.period_date, ds.depreciation_amount,
      a.asset_code, a.name as asset_name, a.depreciation_method,
      c.name as category_name
    FROM asset_depreciation_schedule ds
    JOIN assets a ON ds.asset_id = a.id
    LEFT JOIN asset_categories c ON a.category_id = c.id
    ${where}
    ORDER BY ds.period_date, a.asset_code
  `, { replacements });

  const totalAmount = items.reduce((sum: number, i: any) => sum + parseFloat(i.depreciation_amount), 0);

  return res.json({
    success: true,
    data: {
      items,
      summary: {
        totalItems: items.length,
        totalAmount,
        journalEntries: [
          { account: 'Beban Penyusutan', debit: totalAmount, credit: 0 },
          { account: 'Akumulasi Penyusutan', debit: 0, credit: totalAmount }
        ]
      }
    }
  });
}

async function createDepreciationJournal(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const { period, scheduleIds } = req.body;

  const tf = buildTenantFilter(getTenantId(session), 'a');
  // Check if journal_entries table exists (finance module integration)
  try {
    let where = `WHERE ds.is_posted = false AND ds.period_date <= CURRENT_DATE ${tf.condition}`;
    const replacements: any = { ...tf.replacements };
    if (period) { where += " AND TO_CHAR(ds.period_date, 'YYYY-MM') = :period"; replacements.period = period; }
    if (scheduleIds?.length) {
      where += ` AND ds.id IN (${scheduleIds.map((_: any, i: number) => `:sid${i}`).join(',')})`;
      scheduleIds.forEach((s: string, i: number) => { replacements[`sid${i}`] = s; });
    }

    const [items] = await sequelize.query(`
      SELECT ds.*, a.asset_code, a.name as asset_name
      FROM asset_depreciation_schedule ds JOIN assets a ON ds.asset_id = a.id ${where}
    `, { replacements });

    if (!items.length) return res.json({ success: true, message: 'No unposted depreciation found', posted: 0 });

    const totalAmount = items.reduce((sum: number, i: any) => sum + parseFloat(i.depreciation_amount), 0);

    // Try to create journal entry in finance module
    const [journalCheck] = await sequelize.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') as exists
    `);

    let journalId = null;
    if (journalCheck[0]?.exists) {
      const [journal] = await sequelize.query(`
        INSERT INTO journal_entries (tenant_id, reference_number, journal_date, description, total_debit, total_credit,
          status, ref_type, created_by, created_at, updated_at)
        VALUES (:tenantId, :ref, :date, :desc, :amount, :amount, 'posted', 'asset_depreciation',
          :userId, NOW(), NOW())
        RETURNING id
      `, {
        replacements: {
          tenantId: getTenantId(session),
          ref: `DEPR-${period || new Date().toISOString().slice(0, 7)}`,
          date: new Date().toISOString().split('T')[0],
          desc: `Penyusutan aset periode ${period || 'current'} - ${items.length} aset`,
          amount: totalAmount,
          userId: (session.user as any).id
        }
      });
      journalId = journal[0]?.id;
    }

    // Mark as posted
    const ids = items.map((i: any) => i.id);
    await sequelize.query(`
      UPDATE asset_depreciation_schedule SET is_posted = true, posted_at = NOW(),
        journal_entry_id = :journalId WHERE id IN (:ids)
    `, { replacements: { ids, journalId } });

    // Update asset accumulated depreciation
    for (const item of items) {
      await sequelize.query(`
        UPDATE assets SET accumulated_depreciation = accumulated_depreciation + :amount,
          current_book_value = current_book_value - :amount,
          last_depreciation_date = :date, updated_at = NOW()
        WHERE id = :assetId
      `, {
        replacements: {
          amount: item.depreciation_amount,
          date: item.period_date,
          assetId: item.asset_id
        }
      });
    }

    try {
      await logAudit({ tenantId: getTenantId(session), action: 'create', entityType: 'depreciation_journal', userId: (session.user as any).id, userName: (session.user as any).name, newValues: { posted: items.length, totalAmount, journalId }, metadata: { module: 'asset_management' }, req });
    } catch (ae) {}

    return res.json({
      success: true,
      message: `Posted ${items.length} depreciation entries (total: Rp ${totalAmount.toLocaleString()})`,
      posted: items.length,
      journalId
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}

async function createDisposalJournal(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const { assetId } = req.body;
  const tf = buildTenantFilter(getTenantId(session));

  const [assets] = await sequelize.query(`
    SELECT * FROM assets WHERE id = :assetId AND status = 'disposed' ${tf.condition}
  `, { replacements: { assetId, ...tf.replacements } });

  if (!assets.length) return res.status(404).json({ error: 'Disposed asset not found' });
  const asset = assets[0];

  const bookValue = parseFloat(asset.current_book_value) || 0;
  const disposalPrice = parseFloat(asset.disposal_price) || 0;
  const gainLoss = disposalPrice - bookValue;

  const journalEntries = [
    { account: 'Kas/Bank', debit: disposalPrice, credit: 0 },
    { account: 'Akumulasi Penyusutan', debit: parseFloat(asset.accumulated_depreciation), credit: 0 },
    { account: 'Aset Tetap', debit: 0, credit: parseFloat(asset.purchase_price) },
  ];

  if (gainLoss > 0) {
    journalEntries.push({ account: 'Keuntungan Penjualan Aset', debit: 0, credit: gainLoss });
  } else if (gainLoss < 0) {
    journalEntries.push({ account: 'Kerugian Penjualan Aset', debit: Math.abs(gainLoss), credit: 0 });
  }

  // Log lifecycle event
  await sequelize.query(`
    INSERT INTO asset_lifecycle_events (tenant_id, asset_id, event_type, description, performed_by, performed_by_name, metadata)
    VALUES (:tenantId, :assetId, 'disposal_journal', :desc, :userId, :userName, :meta::jsonb)
  `, {
    replacements: {
      tenantId: getTenantId(session), assetId, desc: `Jurnal disposal dibuat: ${gainLoss >= 0 ? 'Gain' : 'Loss'} Rp ${Math.abs(gainLoss).toLocaleString()}`,
      userId: (session.user as any).id, userName: (session.user as any).name,
      meta: JSON.stringify({ bookValue, disposalPrice, gainLoss, journalEntries })
    }
  });

  try {
    await logAudit({ tenantId: getTenantId(session), action: 'create', entityType: 'disposal_journal', entityId: String(assetId), userId: (session.user as any).id, userName: (session.user as any).name, newValues: { bookValue, disposalPrice, gainLoss }, metadata: { module: 'asset_management' }, req });
  } catch (ae) {}

  return res.json({
    success: true,
    data: {
      assetCode: asset.asset_code,
      assetName: asset.name,
      bookValue, disposalPrice, gainLoss,
      journalEntries
    }
  });
}

// ============================================================
// HR INTEGRATION
// ============================================================

async function getEmployeeAssets(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const session = await getServerSession(req, res, authOptions);
  const tf = buildTenantFilter(getTenantId(session), 'a');
  const { employeeId } = req.query;

  let where = `WHERE a.custodian_id IS NOT NULL AND a.status != :disposed ${tf.condition}`;
  const replacements: any = { disposed: 'disposed', ...tf.replacements };
  if (employeeId) { where += ' AND a.custodian_id = :employeeId'; replacements.employeeId = parseInt(String(employeeId)); }

  const [rows] = await sequelize.query(`
    SELECT a.id, a.asset_code, a.name, a.status, a.condition, a.purchase_price, a.current_book_value,
      a.category_id, c.name as category_name, a.serial_number, a.barcode,
      a.custodian_id, a.custodian_name, a.department, a.location
    FROM assets a LEFT JOIN asset_categories c ON a.category_id = c.id
    ${where} ORDER BY a.custodian_name, a.name
  `, { replacements });

  return res.json({ success: true, data: rows });
}

async function getOffboardingCheck(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: { assets: [], checklist: null } });
  const session = await getServerSession(req, res, authOptions);
  const tf = buildTenantFilter(getTenantId(session), 'a');
  const { employeeId } = req.query;
  if (!employeeId) return res.status(400).json({ error: 'Employee ID required' });

  const [assets] = await sequelize.query(`
    SELECT a.id, a.asset_code, a.name, a.status, a.condition, a.serial_number, a.category_id,
      c.name as category_name
    FROM assets a LEFT JOIN asset_categories c ON a.category_id = c.id
    WHERE a.custodian_id = :empId AND a.status != 'disposed' ${tf.condition}
    ORDER BY a.name
  `, { replacements: { empId: parseInt(String(employeeId)), ...tf.replacements } });

  const tfh = buildTenantFilter(getTenantId(session));
  const [checklist] = await sequelize.query(`
    SELECT * FROM asset_handover_checklists
    WHERE employee_id = :empId AND status != 'completed' ${tfh.condition}
    ORDER BY created_at DESC LIMIT 1
  `, { replacements: { empId: parseInt(String(employeeId)), ...tfh.replacements } });

  return res.json({
    success: true,
    data: {
      assets,
      assetCount: assets.length,
      totalValue: assets.reduce((sum: number, a: any) => sum + (parseFloat(a.current_book_value) || 0), 0),
      checklist: checklist[0] || null,
      needsHandover: assets.length > 0
    }
  });
}

async function assignToEmployee(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const { assetId, employeeId, employeeName, notes } = req.body;

  const tf = buildTenantFilter(getTenantId(session));
  // Update asset custodian
  await sequelize.query(`
    UPDATE assets SET custodian_id = :empId, custodian_name = :empName, updated_at = NOW()
    WHERE id = :assetId ${tf.condition}
  `, { replacements: { assetId, empId: employeeId, empName: employeeName, ...tf.replacements } });

  // Create custody log
  await sequelize.query(`
    INSERT INTO asset_custody_logs (tenant_id, asset_id, action, custodian_id, custodian_name, condition_checkout, notes, created_by)
    VALUES (:tenantId, :assetId, 'checkout', :empId, :empName, 'good', :notes, :createdBy)
  `, {
    replacements: {
      tenantId: getTenantId(session),
      assetId, empId: employeeId, empName: employeeName,
      notes: notes || `Assigned to ${employeeName}`,
      createdBy: (session.user as any).id
    }
  });

  // Log lifecycle event
  await sequelize.query(`
    INSERT INTO asset_lifecycle_events (tenant_id, asset_id, event_type, description, performed_by, performed_by_name, metadata)
    VALUES (:tenantId, :assetId, 'assigned', :desc, :userId, :userName, :meta::jsonb)
  `, {
    replacements: {
      tenantId: getTenantId(session), assetId, desc: `Aset diserahkan ke ${employeeName} (ID: ${employeeId})`,
      userId: (session.user as any).id, userName: (session.user as any).name,
      meta: JSON.stringify({ employeeId, employeeName })
    }
  });

  try {
    await logAudit({ tenantId: getTenantId(session), action: 'assign', entityType: 'asset', entityId: String(assetId), userId: (session.user as any).id, userName: (session.user as any).name, newValues: { employeeId, employeeName }, metadata: { module: 'asset_management' }, req });
  } catch (ae) {}
  return res.json({ success: true, message: `Asset assigned to ${employeeName}` });
}

async function unassignFromEmployee(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const { assetId, condition, notes } = req.body;

  const tf = buildTenantFilter(getTenantId(session));
  // Get current custodian
  const [asset] = await sequelize.query(`SELECT custodian_id, custodian_name FROM assets WHERE id = :assetId ${tf.condition}`, { replacements: { assetId, ...tf.replacements } });

  // Create checkin log
  await sequelize.query(`
    INSERT INTO asset_custody_logs (tenant_id, asset_id, action, custodian_id, custodian_name, condition_checkin, notes, created_by)
    VALUES (:tenantId, :assetId, 'checkin', :empId, :empName, :condition, :notes, :createdBy)
  `, {
    replacements: {
      tenantId: getTenantId(session),
      assetId, empId: asset[0]?.custodian_id, empName: asset[0]?.custodian_name,
      condition: condition || 'good', notes: notes || 'Returned',
      createdBy: (session.user as any).id
    }
  });

  // Clear custodian
  await sequelize.query(`
    UPDATE assets SET custodian_id = NULL, custodian_name = NULL, condition = :condition, updated_at = NOW()
    WHERE id = :assetId ${tf.condition}
  `, { replacements: { assetId, condition: condition || 'good', ...tf.replacements } });

  // Log lifecycle
  await sequelize.query(`
    INSERT INTO asset_lifecycle_events (tenant_id, asset_id, event_type, description, performed_by, performed_by_name)
    VALUES (:tenantId, :assetId, 'unassigned', :desc, :userId, :userName)
  `, {
    replacements: {
      tenantId: getTenantId(session), assetId, desc: `Aset dikembalikan dari ${asset[0]?.custodian_name || 'N/A'}`,
      userId: (session.user as any).id, userName: (session.user as any).name
    }
  });

  try {
    await logAudit({ tenantId: getTenantId(session), action: 'assign', entityType: 'asset', entityId: String(assetId), userId: (session.user as any).id, userName: (session.user as any).name, newValues: { action: 'unassign', previousCustodian: asset[0]?.custodian_name }, metadata: { module: 'asset_management' }, req });
  } catch (ae) {}
  return res.json({ success: true, message: 'Asset unassigned from employee' });
}

// ============================================================
// INVENTORY INTEGRATION (Spare Parts)
// ============================================================

async function getSparePartStock(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const session = await getServerSession(req, res, authOptions);
  const tf = buildTenantFilter(getTenantId(session), 'a');

  const [rows] = await sequelize.query(`
    SELECT sp.id, sp.asset_id, sp.part_name, sp.part_number, sp.min_stock, sp.current_stock,
      sp.auto_reorder, sp.lead_time_days, sp.estimated_cost, sp.supplier_id,
      a.name as asset_name, a.asset_code,
      CASE WHEN sp.current_stock <= sp.min_stock THEN true ELSE false END as needs_reorder
    FROM asset_spare_parts sp
    JOIN assets a ON sp.asset_id = a.id
    WHERE sp.current_stock <= sp.min_stock ${tf.condition}
    ORDER BY (sp.min_stock - sp.current_stock) DESC
  `, { replacements: { ...tf.replacements } });

  return res.json({
    success: true,
    data: rows,
    summary: {
      totalLowStock: rows.length,
      totalEstimatedCost: rows.reduce((sum: number, r: any) => sum + (parseFloat(r.estimated_cost) || 0) * (r.min_stock - r.current_stock + 1), 0)
    }
  });
}

async function createSparePartRequisition(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const { sparePartIds } = req.body;

  if (!sparePartIds?.length) return res.status(400).json({ error: 'Spare part IDs required' });

  const placeholders = sparePartIds.map((_: any, i: number) => `:id${i}`).join(',');
  const replacements: any = {};
  sparePartIds.forEach((id: string, i: number) => { replacements[`id${i}`] = id; });

  const [parts] = await sequelize.query(`
    SELECT sp.*, a.name as asset_name, a.asset_code
    FROM asset_spare_parts sp JOIN assets a ON sp.asset_id = a.id
    WHERE sp.id IN (${placeholders})
  `, { replacements });

  // Create requisition items (this would integrate with purchase_orders module)
  const items = parts.map((p: any) => ({
    partName: p.part_name,
    partNumber: p.part_number,
    quantity: Math.max(1, p.min_stock - p.current_stock + p.quantity_required),
    estimatedCost: p.estimated_cost,
    supplierId: p.supplier_id,
    assetCode: p.asset_code,
    assetName: p.asset_name,
    leadTimeDays: p.lead_time_days
  }));

  // Log alert for tracking
  const tenantId = getTenantId(session);
  for (const part of parts) {
    await sequelize.query(`
      INSERT INTO asset_alerts (tenant_id, asset_id, alert_type, severity, title, message, reference_type, reference_id)
      VALUES (:tenantId, :assetId, 'spare_part_ordered', 'info', :title, :msg, 'spare_part', :spId)
    `, {
      replacements: {
        tenantId,
        assetId: part.asset_id,
        title: `Suku cadang dipesan: ${part.part_name}`,
        msg: `Pemesanan otomatis ${part.part_name} (${part.part_number || 'N/A'}) untuk aset ${part.asset_code}`,
        spId: part.id
      }
    });
  }

  return res.json({
    success: true,
    message: `Created requisition for ${items.length} spare parts`,
    data: { items, totalEstimatedCost: items.reduce((sum: number, i: any) => sum + (i.estimatedCost || 0) * i.quantity, 0) }
  });
}

// ============================================================
// ALERT GENERATION
// ============================================================

async function generateAlerts(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const tf = buildTenantFilter(getTenantId(session));
  const tfa = buildTenantFilter(getTenantId(session), 'a');
  const tenantId = getTenantId(session);

  let alertCount = 0;

  // 1. Warranty expiring (30 days)
  const [warrantyExpiring] = await sequelize.query(`
    SELECT id, asset_code, name, warranty_expiry FROM assets
    WHERE warranty_expiry IS NOT NULL AND warranty_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND status != 'disposed' ${tf.condition}
      AND NOT EXISTS (SELECT 1 FROM asset_alerts WHERE asset_id = assets.id AND alert_type = 'warranty_expiry' AND status = 'active')
  `, { replacements: { ...tf.replacements } });
  for (const a of warrantyExpiring) {
    await sequelize.query(`
      INSERT INTO asset_alerts (tenant_id, asset_id, alert_type, severity, title, message, due_date)
      VALUES (:tenantId, :id, 'warranty_expiry', 'high', :title, :msg, :due)
    `, {
      replacements: {
        tenantId, id: a.id, title: `Garansi segera habis: ${a.name}`,
        msg: `Garansi aset ${a.asset_code} akan berakhir pada ${a.warranty_expiry}`,
        due: a.warranty_expiry
      }
    });
    alertCount++;
  }

  // 2. License expiring (30 days)
  const [licenseExpiring] = await sequelize.query(`
    SELECT id, asset_id, license_name, expiry_date FROM asset_licenses
    WHERE expiry_date IS NOT NULL AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND status = 'active' ${tf.condition}
      AND NOT EXISTS (SELECT 1 FROM asset_alerts WHERE reference_id = asset_licenses.id AND alert_type = 'license_expiry' AND status = 'active')
  `, { replacements: { ...tf.replacements } });
  for (const l of licenseExpiring) {
    await sequelize.query(`
      INSERT INTO asset_alerts (tenant_id, asset_id, alert_type, severity, title, message, reference_type, reference_id, due_date)
      VALUES (:tenantId, :assetId, 'license_expiry', 'high', :title, :msg, 'license', :licId, :due)
    `, {
      replacements: {
        tenantId, assetId: l.asset_id, title: `Lisensi segera habis: ${l.license_name}`,
        msg: `Lisensi ${l.license_name} akan berakhir pada ${l.expiry_date}`,
        licId: l.id, due: l.expiry_date
      }
    });
    alertCount++;
  }

  // 3. Maintenance overdue
  const [maintenanceDue] = await sequelize.query(`
    SELECT ms.id, ms.asset_id, ms.title, ms.next_due_date, a.asset_code, a.name as asset_name
    FROM asset_maintenance_schedules ms JOIN assets a ON ms.asset_id = a.id
    WHERE ms.is_active = true AND ms.next_due_date IS NOT NULL AND ms.next_due_date <= CURRENT_DATE ${tfa.condition}
      AND NOT EXISTS (SELECT 1 FROM asset_alerts WHERE reference_id = ms.id AND alert_type = 'maintenance_overdue' AND status = 'active')
  `, { replacements: { ...tfa.replacements } });
  for (const m of maintenanceDue) {
    await sequelize.query(`
      INSERT INTO asset_alerts (tenant_id, asset_id, alert_type, severity, title, message, reference_type, reference_id, due_date)
      VALUES (:tenantId, :assetId, 'maintenance_overdue', 'critical', :title, :msg, 'maintenance_schedule', :msId, :due)
    `, {
      replacements: {
        tenantId, assetId: m.asset_id, title: `Maintenance terlambat: ${m.title}`,
        msg: `Jadwal maintenance "${m.title}" untuk aset ${m.asset_code} sudah lewat (jatuh tempo: ${m.next_due_date})`,
        msId: m.id, due: m.next_due_date
      }
    });
    alertCount++;
  }

  // 4. Insurance expiring (30 days)
  const [insuranceExpiring] = await sequelize.query(`
    SELECT id, asset_code, name, insurance_expiry, insurance_provider FROM assets
    WHERE insurance_expiry IS NOT NULL AND insurance_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND status != 'disposed' ${tf.condition}
      AND NOT EXISTS (SELECT 1 FROM asset_alerts WHERE asset_id = assets.id AND alert_type = 'insurance_expiry' AND status = 'active')
  `, { replacements: { ...tf.replacements } });
  for (const a of insuranceExpiring) {
    await sequelize.query(`
      INSERT INTO asset_alerts (tenant_id, asset_id, alert_type, severity, title, message, due_date)
      VALUES (:tenantId, :id, 'insurance_expiry', 'medium', :title, :msg, :due)
    `, {
      replacements: {
        tenantId, id: a.id, title: `Asuransi segera habis: ${a.name}`,
        msg: `Asuransi aset ${a.asset_code} (${a.insurance_provider || 'N/A'}) akan berakhir pada ${a.insurance_expiry}`,
        due: a.insurance_expiry
      }
    });
    alertCount++;
  }

  // 5. Spare parts low stock
  const [lowStock] = await sequelize.query(`
    SELECT sp.id, sp.asset_id, sp.part_name, sp.current_stock, sp.min_stock, a.asset_code
    FROM asset_spare_parts sp JOIN assets a ON sp.asset_id = a.id
    WHERE sp.current_stock <= sp.min_stock ${tfa.condition}
      AND NOT EXISTS (SELECT 1 FROM asset_alerts WHERE reference_id = sp.id AND alert_type = 'spare_part_low' AND status = 'active')
  `, { replacements: { ...tfa.replacements } });
  for (const sp of lowStock) {
    await sequelize.query(`
      INSERT INTO asset_alerts (tenant_id, asset_id, alert_type, severity, title, message, reference_type, reference_id)
      VALUES (:tenantId, :assetId, 'spare_part_low', 'medium', :title, :msg, 'spare_part', :spId)
    `, {
      replacements: {
        tenantId, assetId: sp.asset_id, title: `Stok suku cadang rendah: ${sp.part_name}`,
        msg: `Stok ${sp.part_name} untuk aset ${sp.asset_code}: ${sp.current_stock}/${sp.min_stock} (minimum)`,
        spId: sp.id
      }
    });
    alertCount++;
  }

  // 6. Lease expiring (tenancy) - 30 days
  const [leaseExpiring] = await sequelize.query(`
    SELECT t.id, t.asset_id, t.tenant_name, t.lease_end, a.asset_code, a.name as asset_name
    FROM asset_tenancies t JOIN assets a ON t.asset_id = a.id
    WHERE t.lease_end IS NOT NULL AND t.lease_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND t.status = 'active' ${tfa.condition}
      AND NOT EXISTS (SELECT 1 FROM asset_alerts WHERE reference_id = t.id AND alert_type = 'lease_expiry' AND status = 'active')
  `, { replacements: { ...tfa.replacements } });
  for (const t of leaseExpiring) {
    await sequelize.query(`
      INSERT INTO asset_alerts (tenant_id, asset_id, alert_type, severity, title, message, reference_type, reference_id, due_date)
      VALUES (:tenantId, :assetId, 'lease_expiry', 'high', :title, :msg, 'tenancy', :tId, :due)
    `, {
      replacements: {
        tenantId, assetId: t.asset_id, title: `Sewa segera berakhir: ${t.tenant_name}`,
        msg: `Kontrak sewa ${t.tenant_name} untuk aset ${t.asset_code} berakhir pada ${t.lease_end}`,
        tId: t.id, due: t.lease_end
      }
    });
    alertCount++;
  }

  return res.json({ success: true, message: `Generated ${alertCount} new alerts`, alertCount });
}
