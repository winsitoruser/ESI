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
      // Manufacturing
      if (action === 'maintenance-schedules') return getMaintenanceSchedules(req, res);
      if (action === 'work-orders') return getWorkOrders(req, res);
      if (action === 'oee-records') return getOeeRecords(req, res);
      if (action === 'oee-dashboard') return getOeeDashboard(req, res);
      if (action === 'spare-parts') return getSpareParts(req, res);
      // Property
      if (action === 'tenancies') return getTenancies(req, res);
      if (action === 'utility-readings') return getUtilityReadings(req, res);
      if (action === 'facility-bookings') return getFacilityBookings(req, res);
      // IT
      if (action === 'licenses') return getLicenses(req, res);
      if (action === 'it-discoveries') return getItDiscoveries(req, res);
      if (action === 'handover-checklists') return getHandoverChecklists(req, res);
      return res.status(400).json({ error: 'Unknown GET action' });
    }

    if (req.method === 'POST') {
      // Manufacturing
      if (action === 'maintenance-schedule') return upsertMaintenanceSchedule(req, res, session);
      if (action === 'work-order') return upsertWorkOrder(req, res, session);
      if (action === 'work-order-complete') return completeWorkOrder(req, res, session);
      if (action === 'oee-record') return upsertOeeRecord(req, res, session);
      if (action === 'spare-part') return upsertSparePart(req, res, session);
      // Property
      if (action === 'tenancy') return upsertTenancy(req, res, session);
      if (action === 'utility-reading') return createUtilityReading(req, res, session);
      if (action === 'facility-booking') return upsertFacilityBooking(req, res, session);
      if (action === 'booking-cancel') return cancelBooking(req, res, session);
      // IT
      if (action === 'license') return upsertLicense(req, res, session);
      if (action === 'it-discovery') return upsertItDiscovery(req, res, session);
      if (action === 'handover-checklist') return upsertHandoverChecklist(req, res, session);
      if (action === 'handover-approve') return approveHandover(req, res, session);
      return res.status(400).json({ error: 'Unknown POST action' });
    }

    if (req.method === 'DELETE') {
      if (action === 'maintenance-schedule') return deleteById(req, res, 'asset_maintenance_schedules');
      if (action === 'work-order') return deleteById(req, res, 'asset_work_orders');
      if (action === 'spare-part') return deleteById(req, res, 'asset_spare_parts');
      if (action === 'tenancy') return deleteById(req, res, 'asset_tenancies');
      if (action === 'license') return deleteById(req, res, 'asset_licenses');
      if (action === 'facility-booking') return deleteById(req, res, 'asset_facility_bookings');
      return res.status(400).json({ error: 'Unknown DELETE action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Asset Extensions API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export default withModuleGuard('asset_management', handler);

// ===== Helper: Delete by ID =====
async function deleteById(req: NextApiRequest, res: NextApiResponse, table: string) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const { id } = req.query;
  await sequelize.query(`DELETE FROM ${table} WHERE id = :id`, { replacements: { id } });
  return res.json({ success: true, message: 'Deleted' });
}

// ============================================================
// MANUFACTURING EXTENSION
// ============================================================

async function getMaintenanceSchedules(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const session = await getServerSession(req, res, authOptions);
  const tf = buildTenantFilter(getTenantId(session), 'a');
  const { assetId, isActive } = req.query;
  let where = `WHERE 1=1 ${tf.condition}`;
  const r: any = { ...tf.replacements };
  if (assetId) { where += ' AND ms.asset_id = :assetId'; r.assetId = assetId; }
  if (isActive !== undefined) { where += ' AND ms.is_active = :isActive'; r.isActive = isActive === 'true'; }

  const [rows] = await sequelize.query(`
    SELECT ms.*, a.name as asset_name, a.asset_code
    FROM asset_maintenance_schedules ms JOIN assets a ON ms.asset_id = a.id
    ${where} ORDER BY ms.next_due_date ASC NULLS LAST
  `, { replacements: r });
  return res.json({ success: true, data: rows });
}

async function upsertMaintenanceSchedule(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const b = req.body;
  if (b.id) {
    await sequelize.query(`
      UPDATE asset_maintenance_schedules SET title = :title, description = :description,
        schedule_type = :scheduleType, frequency = :frequency, interval_value = :intervalValue,
        next_due_date = :nextDue, hour_meter_interval = :hmInterval, next_due_hour_meter = :hmNextDue,
        estimated_duration_hours = :estHours, estimated_cost = :estCost,
        assigned_to = :assignedTo, assigned_to_name = :assignedToName,
        priority = :priority, is_active = :isActive, checklist = :checklist::jsonb, updated_at = NOW()
      WHERE id = :id
    `, { replacements: buildMaintenanceReplacements(b) });
    return res.json({ success: true, message: 'Schedule updated' });
  }
  const [result] = await sequelize.query(`
    INSERT INTO asset_maintenance_schedules (tenant_id, asset_id, title, description, schedule_type, frequency, interval_value,
      next_due_date, hour_meter_interval, next_due_hour_meter, estimated_duration_hours, estimated_cost,
      assigned_to, assigned_to_name, priority, is_active, checklist)
    VALUES (:tenantId, :assetId, :title, :description, :scheduleType, :frequency, :intervalValue,
      :nextDue, :hmInterval, :hmNextDue, :estHours, :estCost,
      :assignedTo, :assignedToName, :priority, :isActive, :checklist::jsonb)
    RETURNING *
  `, { replacements: { ...buildMaintenanceReplacements(b), tenantId: getTenantId(session) } });
  return res.status(201).json({ success: true, data: result[0] });
}

function buildMaintenanceReplacements(b: any) {
  return {
    id: b.id || null, assetId: b.assetId, title: b.title, description: b.description || null,
    scheduleType: b.scheduleType || 'calendar', frequency: b.frequency || null,
    intervalValue: b.intervalValue || null, nextDue: b.nextDueDate || null,
    hmInterval: b.hourMeterInterval || null, hmNextDue: b.nextDueHourMeter || null,
    estHours: b.estimatedDurationHours || null, estCost: b.estimatedCost || null,
    assignedTo: b.assignedTo || null, assignedToName: b.assignedToName || null,
    priority: b.priority || 'medium', isActive: b.isActive !== false,
    checklist: JSON.stringify(b.checklist || [])
  };
}

async function getWorkOrders(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const session = await getServerSession(req, res, authOptions);
  const tf = buildTenantFilter(getTenantId(session), 'a');
  const { assetId, status, woType } = req.query;
  let where = `WHERE 1=1 ${tf.condition}`;
  const r: any = { ...tf.replacements };
  if (assetId) { where += ' AND wo.asset_id = :assetId'; r.assetId = assetId; }
  if (status) { where += ' AND wo.status = :status'; r.status = status; }
  if (woType) { where += ' AND wo.wo_type = :woType'; r.woType = woType; }

  const [rows] = await sequelize.query(`
    SELECT wo.*, a.name as asset_name, a.asset_code
    FROM asset_work_orders wo JOIN assets a ON wo.asset_id = a.id
    ${where} ORDER BY wo.created_at DESC
  `, { replacements: r });
  return res.json({ success: true, data: rows });
}

async function upsertWorkOrder(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const b = req.body;
  if (b.id) {
    await sequelize.query(`
      UPDATE asset_work_orders SET title = :title, description = :description, wo_type = :woType,
        status = :status, priority = :priority, planned_start = :plannedStart, planned_end = :plannedEnd,
        assigned_to = :assignedTo, assigned_to_name = :assignedToName,
        labor_cost = :laborCost, parts_cost = :partsCost,
        total_cost = COALESCE(:laborCost,0) + COALESCE(:partsCost,0),
        root_cause = :rootCause, resolution = :resolution,
        notes = :notes, updated_at = NOW()
      WHERE id = :id
    `, { replacements: buildWoReplacements(b) });
    return res.json({ success: true, message: 'Work order updated' });
  }

  // Auto-generate WO number
  const [seq] = await sequelize.query(`SELECT COUNT(*)+1 as num FROM asset_work_orders`);
  const woNumber = `WO-${String(seq[0].num).padStart(5, '0')}`;

  const [result] = await sequelize.query(`
    INSERT INTO asset_work_orders (tenant_id, asset_id, schedule_id, wo_number, wo_type, title, description,
      status, priority, planned_start, planned_end, assigned_to, assigned_to_name, created_by)
    VALUES (:tenantId, :assetId, :scheduleId, :woNumber, :woType, :title, :description,
      'open', :priority, :plannedStart, :plannedEnd, :assignedTo, :assignedToName, :createdBy)
    RETURNING *
  `, {
    replacements: {
      ...buildWoReplacements(b), woNumber, scheduleId: b.scheduleId || null,
      createdBy: (session.user as any).id || null,
      tenantId: getTenantId(session)
    }
  });
  return res.status(201).json({ success: true, data: result[0] });
}

function buildWoReplacements(b: any) {
  return {
    id: b.id || null, assetId: b.assetId, title: b.title, description: b.description || null,
    woType: b.woType || 'preventive', status: b.status || 'open', priority: b.priority || 'medium',
    plannedStart: b.plannedStart || null, plannedEnd: b.plannedEnd || null,
    assignedTo: b.assignedTo || null, assignedToName: b.assignedToName || null,
    laborCost: b.laborCost || 0, partsCost: b.partsCost || 0,
    rootCause: b.rootCause || null, resolution: b.resolution || null, notes: b.notes || null
  };
}

async function completeWorkOrder(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const b = req.body;
  await sequelize.query(`
    UPDATE asset_work_orders SET status = 'completed', actual_end = NOW(),
      completed_by = :userId, completed_by_name = :userName,
      resolution = :resolution, root_cause = :rootCause,
      labor_cost = :laborCost, parts_cost = :partsCost,
      total_cost = COALESCE(:laborCost,0) + COALESCE(:partsCost,0),
      downtime_minutes = :downtime, hour_meter_reading = :hmReading,
      parts_used = :partsUsed::jsonb, updated_at = NOW()
    WHERE id = :id
  `, {
    replacements: {
      id: b.id, userId: (session.user as any).id, userName: (session.user as any).name,
      resolution: b.resolution || null, rootCause: b.rootCause || null,
      laborCost: b.laborCost || 0, partsCost: b.partsCost || 0,
      downtime: b.downtimeMinutes || 0, hmReading: b.hourMeterReading || null,
      partsUsed: JSON.stringify(b.partsUsed || [])
    }
  });

  // Update maintenance schedule next due date if linked
  const [wo] = await sequelize.query(`SELECT schedule_id, asset_id FROM asset_work_orders WHERE id = :id`, { replacements: { id: b.id } });
  if (wo[0]?.schedule_id) {
    await sequelize.query(`
      UPDATE asset_maintenance_schedules SET last_performed_date = CURRENT_DATE,
        next_due_date = CASE
          WHEN frequency = 'daily' THEN CURRENT_DATE + (interval_value || ' days')::interval
          WHEN frequency = 'weekly' THEN CURRENT_DATE + (interval_value * 7 || ' days')::interval
          WHEN frequency = 'monthly' THEN CURRENT_DATE + (interval_value || ' months')::interval
          WHEN frequency = 'yearly' THEN CURRENT_DATE + (interval_value || ' years')::interval
          ELSE next_due_date
        END,
        current_hour_meter = COALESCE(:hmReading, current_hour_meter),
        last_hour_meter = current_hour_meter,
        next_due_hour_meter = CASE WHEN hour_meter_interval > 0 THEN COALESCE(:hmReading, current_hour_meter) + hour_meter_interval ELSE next_due_hour_meter END,
        updated_at = NOW()
      WHERE id = :scheduleId
    `, { replacements: { scheduleId: wo[0].schedule_id, hmReading: b.hourMeterReading || null } });
  }

  return res.json({ success: true, message: 'Work order completed' });
}

// ===== OEE =====
async function getOeeRecords(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const { assetId, from, to } = req.query;
  let where = 'WHERE 1=1';
  const r: any = {};
  if (assetId) { where += ' AND o.asset_id = :assetId'; r.assetId = assetId; }
  if (from) { where += ' AND o.record_date >= :from'; r.from = from; }
  if (to) { where += ' AND o.record_date <= :to'; r.to = to; }

  const [rows] = await sequelize.query(`
    SELECT o.*, a.name as asset_name, a.asset_code
    FROM asset_oee_records o JOIN assets a ON o.asset_id = a.id ${where}
    ORDER BY o.record_date DESC LIMIT 100
  `, { replacements: r });
  return res.json({ success: true, data: rows });
}

async function getOeeDashboard(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: {} });

  const [avgOee] = await sequelize.query(`
    SELECT AVG(oee_pct) as avg_oee, AVG(availability_pct) as avg_availability,
      AVG(performance_pct) as avg_performance, AVG(quality_pct) as avg_quality,
      COUNT(DISTINCT asset_id) as asset_count
    FROM asset_oee_records WHERE record_date >= CURRENT_DATE - INTERVAL '30 days'
  `);

  const [trend] = await sequelize.query(`
    SELECT record_date, AVG(oee_pct) as avg_oee FROM asset_oee_records
    WHERE record_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY record_date ORDER BY record_date
  `);

  const [byAsset] = await sequelize.query(`
    SELECT a.name, a.asset_code, AVG(o.oee_pct) as avg_oee, COUNT(o.id) as readings
    FROM asset_oee_records o JOIN assets a ON o.asset_id = a.id
    WHERE o.record_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY a.id, a.name, a.asset_code ORDER BY avg_oee ASC
  `);

  return res.json({ success: true, data: { summary: avgOee[0], trend, byAsset } });
}

async function upsertOeeRecord(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const b = req.body;

  const planned = b.plannedProductionTime || 480;
  const actual = b.actualRunTime || 0;
  const downtime = planned - actual;
  const availability = planned > 0 ? (actual / planned) * 100 : 0;
  const totalCount = (b.goodCount || 0) + (b.rejectCount || 0);
  const performance = (b.idealCycleTime && actual > 0) ? ((b.idealCycleTime * totalCount) / (actual * 60)) * 100 : (totalCount > 0 ? 100 : 0);
  const quality = totalCount > 0 ? ((b.goodCount || 0) / totalCount) * 100 : 100;
  const oee = (availability * Math.min(performance, 100) * quality) / 10000;

  if (b.id) {
    await sequelize.query(`
      UPDATE asset_oee_records SET planned_production_time = :planned, actual_run_time = :actual,
        downtime_minutes = :downtime, ideal_cycle_time = :idealCycle, total_count = :totalCount,
        good_count = :good, reject_count = :reject,
        availability_pct = :avail, performance_pct = :perf, quality_pct = :qual, oee_pct = :oee,
        shift = :shift, notes = :notes, updated_at = NOW()
      WHERE id = :id
    `, {
      replacements: {
        id: b.id, planned, actual, downtime, idealCycle: b.idealCycleTime || null,
        totalCount, good: b.goodCount || 0, reject: b.rejectCount || 0,
        avail: Math.round(availability * 100) / 100, perf: Math.round(Math.min(performance, 100) * 100) / 100,
        qual: Math.round(quality * 100) / 100, oee: Math.round(oee * 100) / 100,
        shift: b.shift || null, notes: b.notes || null
      }
    });
    return res.json({ success: true, message: 'OEE record updated' });
  }

  const [result] = await sequelize.query(`
    INSERT INTO asset_oee_records (asset_id, record_date, shift, planned_production_time, actual_run_time,
      downtime_minutes, ideal_cycle_time, total_count, good_count, reject_count,
      availability_pct, performance_pct, quality_pct, oee_pct, notes, created_by)
    VALUES (:assetId, :recordDate, :shift, :planned, :actual, :downtime, :idealCycle, :totalCount,
      :good, :reject, :avail, :perf, :qual, :oee, :notes, :createdBy)
    RETURNING *
  `, {
    replacements: {
      assetId: b.assetId, recordDate: b.recordDate, shift: b.shift || null,
      planned, actual, downtime, idealCycle: b.idealCycleTime || null,
      totalCount, good: b.goodCount || 0, reject: b.rejectCount || 0,
      avail: Math.round(availability * 100) / 100, perf: Math.round(Math.min(performance, 100) * 100) / 100,
      qual: Math.round(quality * 100) / 100, oee: Math.round(oee * 100) / 100,
      notes: b.notes || null, createdBy: (session.user as any).id
    }
  });
  return res.status(201).json({ success: true, data: result[0] });
}

// ===== SPARE PARTS =====
async function getSpareParts(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const { assetId, lowStock } = req.query;
  let where = 'WHERE 1=1';
  const r: any = {};
  if (assetId) { where += ' AND sp.asset_id = :assetId'; r.assetId = assetId; }
  if (lowStock === 'true') { where += ' AND sp.current_stock <= sp.min_stock'; }

  const [rows] = await sequelize.query(`
    SELECT sp.*, a.name as asset_name, a.asset_code
    FROM asset_spare_parts sp JOIN assets a ON sp.asset_id = a.id ${where}
    ORDER BY CASE WHEN sp.current_stock <= sp.min_stock THEN 0 ELSE 1 END, sp.part_name
  `, { replacements: r });
  return res.json({ success: true, data: rows });
}

async function upsertSparePart(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const b = req.body;
  if (b.id) {
    await sequelize.query(`
      UPDATE asset_spare_parts SET part_name = :partName, part_number = :partNumber,
        quantity_required = :qtyReq, min_stock = :minStock, current_stock = :currentStock,
        unit = :unit, supplier_id = :supplierId, lead_time_days = :leadTime,
        replacement_interval_days = :replInterval, estimated_cost = :estCost,
        auto_reorder = :autoReorder, notes = :notes, updated_at = NOW()
      WHERE id = :id
    `, { replacements: buildSparePartReplacements(b) });
    return res.json({ success: true, message: 'Spare part updated' });
  }
  const [result] = await sequelize.query(`
    INSERT INTO asset_spare_parts (tenant_id, asset_id, product_id, part_name, part_number, quantity_required,
      min_stock, current_stock, unit, supplier_id, lead_time_days, replacement_interval_days,
      estimated_cost, auto_reorder, notes)
    VALUES (:tenantId, :assetId, :productId, :partName, :partNumber, :qtyReq, :minStock, :currentStock,
      :unit, :supplierId, :leadTime, :replInterval, :estCost, :autoReorder, :notes)
    RETURNING *
  `, { replacements: { ...buildSparePartReplacements(b), tenantId: getTenantId(session) } });
  return res.status(201).json({ success: true, data: result[0] });
}

function buildSparePartReplacements(b: any) {
  return {
    id: b.id || null, assetId: b.assetId, productId: b.productId || null,
    partName: b.partName, partNumber: b.partNumber || null,
    qtyReq: b.quantityRequired || 1, minStock: b.minStock || 1,
    currentStock: b.currentStock || 0, unit: b.unit || 'pcs',
    supplierId: b.supplierId || null, leadTime: b.leadTimeDays || 7,
    replInterval: b.replacementIntervalDays || null, estCost: b.estimatedCost || null,
    autoReorder: b.autoReorder || false, notes: b.notes || null
  };
}

// ============================================================
// PROPERTY EXTENSION
// ============================================================

async function getTenancies(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const session = await getServerSession(req, res, authOptions);
  const tf = buildTenantFilter(getTenantId(session), 'a');
  const { assetId, status } = req.query;
  let where = `WHERE 1=1 ${tf.condition}`;
  const r: any = { ...tf.replacements };
  if (assetId) { where += ' AND t.asset_id = :assetId'; r.assetId = assetId; }
  if (status) { where += ' AND t.status = :status'; r.status = status; }

  const [rows] = await sequelize.query(`
    SELECT t.*, a.name as asset_name, a.asset_code
    FROM asset_tenancies t JOIN assets a ON t.asset_id = a.id ${where}
    ORDER BY t.lease_end DESC NULLS LAST
  `, { replacements: r });
  return res.json({ success: true, data: rows });
}

async function upsertTenancy(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const b = req.body;
  const r = {
    id: b.id || null, assetId: b.assetId, tenantName: b.tenantName,
    tenantContact: b.tenantContact || null, tenantEmail: b.tenantEmail || null,
    tenantPhone: b.tenantPhone || null, tenantCompany: b.tenantCompany || null,
    leaseNumber: b.leaseNumber || null, leaseStart: b.leaseStart || null, leaseEnd: b.leaseEnd || null,
    monthlyRent: b.monthlyRent || null, depositAmount: b.depositAmount || null,
    paymentDueDay: b.paymentDueDay || 1, billingCycle: b.billingCycle || 'monthly',
    status: b.status || 'active', autoRenew: b.autoRenew || false,
    renewalTerms: b.renewalTerms || null, unitSizeSqm: b.unitSizeSqm || null,
    occupancyDate: b.occupancyDate || null, notes: b.notes || null, contractUrl: b.contractUrl || null
  };

  if (b.id) {
    await sequelize.query(`
      UPDATE asset_tenancies SET tenant_name = :tenantName, tenant_contact = :tenantContact,
        tenant_email = :tenantEmail, tenant_phone = :tenantPhone, tenant_company = :tenantCompany,
        lease_number = :leaseNumber, lease_start = :leaseStart, lease_end = :leaseEnd,
        monthly_rent = :monthlyRent, deposit_amount = :depositAmount, payment_due_day = :paymentDueDay,
        billing_cycle = :billingCycle, status = :status, auto_renew = :autoRenew,
        renewal_terms = :renewalTerms, unit_size_sqm = :unitSizeSqm, notes = :notes, updated_at = NOW()
      WHERE id = :id
    `, { replacements: r });
    return res.json({ success: true, message: 'Tenancy updated' });
  }
  const [result] = await sequelize.query(`
    INSERT INTO asset_tenancies (tenant_id, asset_id, tenant_name, tenant_contact, tenant_email, tenant_phone,
      tenant_company, lease_number, lease_start, lease_end, monthly_rent, deposit_amount,
      payment_due_day, billing_cycle, status, auto_renew, renewal_terms, unit_size_sqm, notes, contract_url)
    VALUES (:tenantId, :assetId, :tenantName, :tenantContact, :tenantEmail, :tenantPhone,
      :tenantCompany, :leaseNumber, :leaseStart, :leaseEnd, :monthlyRent, :depositAmount,
      :paymentDueDay, :billingCycle, :status, :autoRenew, :renewalTerms, :unitSizeSqm, :notes, :contractUrl)
    RETURNING *
  `, { replacements: { ...r, tenantId: getTenantId(session) } });
  return res.status(201).json({ success: true, data: result[0] });
}

async function getUtilityReadings(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const { assetId, utilityType } = req.query;
  let where = 'WHERE 1=1';
  const r: any = {};
  if (assetId) { where += ' AND ur.asset_id = :assetId'; r.assetId = assetId; }
  if (utilityType) { where += ' AND ur.utility_type = :utilityType'; r.utilityType = utilityType; }

  const [rows] = await sequelize.query(`
    SELECT ur.*, a.name as asset_name FROM asset_utility_readings ur
    JOIN assets a ON ur.asset_id = a.id ${where} ORDER BY ur.reading_date DESC LIMIT 100
  `, { replacements: r });
  return res.json({ success: true, data: rows });
}

async function createUtilityReading(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const b = req.body;
  const usage = (b.currentReading || 0) - (b.previousReading || 0);
  const totalCost = usage * (b.ratePerUnit || 0);

  const [result] = await sequelize.query(`
    INSERT INTO asset_utility_readings (asset_id, tenancy_id, utility_type, reading_date,
      previous_reading, current_reading, usage_amount, unit, rate_per_unit, total_cost, recorded_by, notes)
    VALUES (:assetId, :tenancyId, :utilityType, :readingDate, :prev, :curr, :usage, :unit, :rate, :total, :recordedBy, :notes)
    RETURNING *
  `, {
    replacements: {
      assetId: b.assetId, tenancyId: b.tenancyId || null, utilityType: b.utilityType,
      readingDate: b.readingDate, prev: b.previousReading || 0, curr: b.currentReading || 0,
      usage, unit: b.unit || 'kWh', rate: b.ratePerUnit || 0, total: totalCost,
      recordedBy: (session.user as any).id, notes: b.notes || null
    }
  });
  return res.status(201).json({ success: true, data: result[0] });
}

async function getFacilityBookings(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const { assetId, date, status } = req.query;
  let where = 'WHERE 1=1';
  const r: any = {};
  if (assetId) { where += ' AND fb.asset_id = :assetId'; r.assetId = assetId; }
  if (date) { where += ' AND fb.booking_date = :date'; r.date = date; }
  if (status) { where += ' AND fb.status = :status'; r.status = status; }

  const [rows] = await sequelize.query(`
    SELECT fb.*, a.name as asset_name FROM asset_facility_bookings fb
    JOIN assets a ON fb.asset_id = a.id ${where} ORDER BY fb.booking_date, fb.start_time
  `, { replacements: r });
  return res.json({ success: true, data: rows });
}

async function upsertFacilityBooking(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const b = req.body;

  if (b.id) {
    await sequelize.query(`
      UPDATE asset_facility_bookings SET title = :title, booking_date = :bookingDate,
        start_time = :startTime, end_time = :endTime, attendees = :attendees,
        purpose = :purpose, equipment_needed = :equipment::jsonb, catering = :catering,
        notes = :notes, updated_at = NOW()
      WHERE id = :id
    `, {
      replacements: {
        id: b.id, title: b.title, bookingDate: b.bookingDate, startTime: b.startTime,
        endTime: b.endTime, attendees: b.attendees || 1, purpose: b.purpose || null,
        equipment: JSON.stringify(b.equipmentNeeded || []), catering: b.catering || false,
        notes: b.notes || null
      }
    });
    return res.json({ success: true, message: 'Booking updated' });
  }

  const [seq] = await sequelize.query(`SELECT COUNT(*)+1 as num FROM asset_facility_bookings`);
  const bookingNumber = `BK-${String(seq[0].num).padStart(5, '0')}`;

  const [result] = await sequelize.query(`
    INSERT INTO asset_facility_bookings (asset_id, booking_number, title, booked_by, booked_by_name,
      department, booking_date, start_time, end_time, attendees, purpose, equipment_needed, catering, notes)
    VALUES (:assetId, :bookingNumber, :title, :bookedBy, :bookedByName, :department,
      :bookingDate, :startTime, :endTime, :attendees, :purpose, :equipment::jsonb, :catering, :notes)
    RETURNING *
  `, {
    replacements: {
      assetId: b.assetId, bookingNumber, title: b.title,
      bookedBy: (session.user as any).id, bookedByName: (session.user as any).name,
      department: b.department || null, bookingDate: b.bookingDate, startTime: b.startTime,
      endTime: b.endTime, attendees: b.attendees || 1, purpose: b.purpose || null,
      equipment: JSON.stringify(b.equipmentNeeded || []), catering: b.catering || false,
      notes: b.notes || null
    }
  });
  return res.status(201).json({ success: true, data: result[0] });
}

async function cancelBooking(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const { id, reason } = req.body;
  await sequelize.query(`
    UPDATE asset_facility_bookings SET status = 'cancelled', cancelled_by = :userId,
      cancelled_reason = :reason, updated_at = NOW() WHERE id = :id
  `, { replacements: { id, userId: (session.user as any).id, reason: reason || null } });
  return res.json({ success: true, message: 'Booking cancelled' });
}

// ============================================================
// IT & OFFICE EXTENSION
// ============================================================

async function getLicenses(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const session = await getServerSession(req, res, authOptions);
  const tf = buildTenantFilter(getTenantId(session), 'l');
  const { assetId, status, expiringSoon } = req.query;
  let where = `WHERE 1=1 ${tf.condition}`;
  const r: any = { ...tf.replacements };
  if (assetId) { where += ' AND l.asset_id = :assetId'; r.assetId = assetId; }
  if (status) { where += ' AND l.status = :status'; r.status = status; }
  if (expiringSoon === 'true') {
    where += " AND l.expiry_date IS NOT NULL AND l.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND l.expiry_date >= CURRENT_DATE";
  }

  const [rows] = await sequelize.query(`
    SELECT l.*, a.name as asset_name, a.asset_code
    FROM asset_licenses l LEFT JOIN assets a ON l.asset_id = a.id ${where}
    ORDER BY l.expiry_date ASC NULLS LAST
  `, { replacements: r });
  return res.json({ success: true, data: rows });
}

async function upsertLicense(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const b = req.body;
  const r = {
    id: b.id || null, assetId: b.assetId || null, licenseName: b.licenseName,
    vendor: b.vendor || null, licenseKey: b.licenseKey || null,
    licenseType: b.licenseType || 'perpetual', purchaseDate: b.purchaseDate || null,
    activationDate: b.activationDate || null, expiryDate: b.expiryDate || null,
    renewalDate: b.renewalDate || null, totalSeats: b.totalSeats || 1,
    usedSeats: b.usedSeats || 0, purchaseCost: b.purchaseCost || null,
    renewalCost: b.renewalCost || null, billingCycle: b.billingCycle || null,
    status: b.status || 'active', autoRenew: b.autoRenew || false,
    alertDays: b.alertDaysBefore || 30, version: b.version || null,
    edition: b.edition || null, assignedUsers: JSON.stringify(b.assignedUsers || []),
    notes: b.notes || null, contractUrl: b.contractUrl || null
  };

  if (b.id) {
    await sequelize.query(`
      UPDATE asset_licenses SET license_name = :licenseName, vendor = :vendor,
        license_key = :licenseKey, license_type = :licenseType, expiry_date = :expiryDate,
        renewal_date = :renewalDate, total_seats = :totalSeats, used_seats = :usedSeats,
        purchase_cost = :purchaseCost, renewal_cost = :renewalCost, billing_cycle = :billingCycle,
        status = :status, auto_renew = :autoRenew, alert_days_before = :alertDays,
        version = :version, edition = :edition, assigned_users = :assignedUsers::jsonb,
        notes = :notes, updated_at = NOW()
      WHERE id = :id
    `, { replacements: r });
    return res.json({ success: true, message: 'License updated' });
  }
  const [result] = await sequelize.query(`
    INSERT INTO asset_licenses (tenant_id, asset_id, license_name, vendor, license_key, license_type,
      purchase_date, activation_date, expiry_date, renewal_date, total_seats, used_seats,
      purchase_cost, renewal_cost, billing_cycle, status, auto_renew, alert_days_before,
      version, edition, assigned_users, notes, contract_url)
    VALUES (:tenantId, :assetId, :licenseName, :vendor, :licenseKey, :licenseType,
      :purchaseDate, :activationDate, :expiryDate, :renewalDate, :totalSeats, :usedSeats,
      :purchaseCost, :renewalCost, :billingCycle, :status, :autoRenew, :alertDays,
      :version, :edition, :assignedUsers::jsonb, :notes, :contractUrl)
    RETURNING *
  `, { replacements: { ...r, tenantId: getTenantId(session) } });
  return res.status(201).json({ success: true, data: result[0] });
}

async function getItDiscoveries(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const { isManaged, isOnline } = req.query;
  let where = 'WHERE 1=1';
  const r: any = {};
  if (isManaged !== undefined) { where += ' AND d.is_managed = :isManaged'; r.isManaged = isManaged === 'true'; }
  if (isOnline !== undefined) { where += ' AND d.is_online = :isOnline'; r.isOnline = isOnline === 'true'; }

  const [rows] = await sequelize.query(`
    SELECT d.*, a.name as asset_name, a.asset_code
    FROM asset_it_discoveries d LEFT JOIN assets a ON d.asset_id = a.id ${where}
    ORDER BY d.last_seen DESC NULLS LAST
  `, { replacements: r });
  return res.json({ success: true, data: rows });
}

async function upsertItDiscovery(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const b = req.body;
  if (b.id) {
    await sequelize.query(`
      UPDATE asset_it_discoveries SET hostname = :hostname, ip_address = :ipAddress,
        mac_address = :macAddress, os_name = :osName, os_version = :osVersion,
        device_type = :deviceType, cpu = :cpu, ram_gb = :ramGb, storage_gb = :storageGb,
        is_online = :isOnline, is_managed = :isManaged, is_compliant = :isCompliant,
        asset_id = :assetId, last_seen = NOW(), notes = :notes, updated_at = NOW()
      WHERE id = :id
    `, {
      replacements: {
        id: b.id, hostname: b.hostname, ipAddress: b.ipAddress, macAddress: b.macAddress,
        osName: b.osName || null, osVersion: b.osVersion || null, deviceType: b.deviceType || null,
        cpu: b.cpu || null, ramGb: b.ramGb || null, storageGb: b.storageGb || null,
        isOnline: b.isOnline || false, isManaged: b.isManaged || false, isCompliant: b.isCompliant !== false,
        assetId: b.assetId || null, notes: b.notes || null
      }
    });
    return res.json({ success: true, message: 'Discovery updated' });
  }
  const [result] = await sequelize.query(`
    INSERT INTO asset_it_discoveries (asset_id, hostname, ip_address, mac_address, os_name, os_version,
      device_type, cpu, ram_gb, storage_gb, is_online, is_managed, is_compliant, last_seen, notes)
    VALUES (:assetId, :hostname, :ipAddress, :macAddress, :osName, :osVersion,
      :deviceType, :cpu, :ramGb, :storageGb, :isOnline, :isManaged, :isCompliant, NOW(), :notes)
    RETURNING *
  `, {
    replacements: {
      assetId: b.assetId || null, hostname: b.hostname, ipAddress: b.ipAddress,
      macAddress: b.macAddress || null, osName: b.osName || null, osVersion: b.osVersion || null,
      deviceType: b.deviceType || null, cpu: b.cpu || null, ramGb: b.ramGb || null,
      storageGb: b.storageGb || null, isOnline: b.isOnline || false,
      isManaged: b.isManaged || false, isCompliant: b.isCompliant !== false, notes: b.notes || null
    }
  });
  return res.status(201).json({ success: true, data: result[0] });
}

async function getHandoverChecklists(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const { employeeId, status } = req.query;
  let where = 'WHERE 1=1';
  const r: any = {};
  if (employeeId) { where += ' AND hc.employee_id = :employeeId'; r.employeeId = employeeId; }
  if (status) { where += ' AND hc.status = :status'; r.status = status; }

  const [rows] = await sequelize.query(`
    SELECT hc.* FROM asset_handover_checklists hc ${where} ORDER BY hc.handover_date DESC
  `, { replacements: r });
  return res.json({ success: true, data: rows });
}

async function upsertHandoverChecklist(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const b = req.body;

  // Auto-populate items from employee's assigned assets
  let items = b.items || [];
  if (!b.id && items.length === 0 && b.employeeId) {
    const [assets] = await sequelize.query(`
      SELECT id, asset_code, name, category_id FROM assets WHERE custodian_id = :empId AND status != 'disposed'
    `, { replacements: { empId: b.employeeId } });
    items = assets.map((a: any) => ({ assetId: a.id, assetCode: a.asset_code, assetName: a.name, returned: false, condition: '', notes: '' }));
  }

  const completedCount = items.filter((i: any) => i.returned).length;
  const completionPct = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  if (b.id) {
    await sequelize.query(`
      UPDATE asset_handover_checklists SET items = :items::jsonb, status = :status,
        completion_pct = :pct, notes = :notes, updated_at = NOW()
      WHERE id = :id
    `, {
      replacements: {
        id: b.id, items: JSON.stringify(items), status: b.status || 'pending',
        pct: completionPct, notes: b.notes || null
      }
    });
    return res.json({ success: true, message: 'Checklist updated' });
  }

  const [result] = await sequelize.query(`
    INSERT INTO asset_handover_checklists (employee_id, employee_name, handover_type, handover_date,
      status, items, completion_pct, notes, created_by)
    VALUES (:empId, :empName, :type, :date, 'pending', :items::jsonb, :pct, :notes, :createdBy)
    RETURNING *
  `, {
    replacements: {
      empId: b.employeeId, empName: b.employeeName, type: b.handoverType || 'offboarding',
      date: b.handoverDate || new Date().toISOString().split('T')[0],
      items: JSON.stringify(items), pct: completionPct, notes: b.notes || null,
      createdBy: (session.user as any).id
    }
  });
  return res.status(201).json({ success: true, data: result[0] });
}

async function approveHandover(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'DB not available' });
  const { id, approvalType } = req.body;
  const col = approvalType === 'it' ? 'it' : approvalType === 'manager' ? 'manager' : 'hr';

  await sequelize.query(`
    UPDATE asset_handover_checklists SET ${col}_approved_by = :userId, ${col}_approved_name = :userName,
      ${col}_approved_at = NOW(), updated_at = NOW()
    WHERE id = :id
  `, { replacements: { id, userId: (session.user as any).id, userName: (session.user as any).name } });

  // Check if all approved → mark completed
  const [check] = await sequelize.query(`
    SELECT hr_approved_at, it_approved_at, manager_approved_at FROM asset_handover_checklists WHERE id = :id
  `, { replacements: { id } });

  if (check[0]?.hr_approved_at && check[0]?.it_approved_at && check[0]?.manager_approved_at) {
    await sequelize.query(`
      UPDATE asset_handover_checklists SET status = 'completed', completed_at = NOW(), completion_pct = 100 WHERE id = :id
    `, { replacements: { id } });
  }

  return res.json({ success: true, message: `${col.toUpperCase()} approval recorded` });
}
