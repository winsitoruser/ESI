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
      if (action === 'schedule') return getSchedule(req, res, session);
      if (action === 'summary') return getDepreciationSummary(req, res, session);
      if (action === 'unposted') return getUnpostedPeriods(req, res, session);
      return res.status(400).json({ error: 'Unknown GET action' });
    }

    if (req.method === 'POST') {
      if (action === 'generate') return generateSchedule(req, res, session);
      if (action === 'calculate-all') return calculateAllDepreciation(req, res, session);
      if (action === 'post') return postDepreciation(req, res, session);
      if (action === 'simulate') return simulateDepreciation(req, res, session);
      return res.status(400).json({ error: 'Unknown POST action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Depreciation API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export default withModuleGuard('asset_management', handler);

// ===== Depreciation Calculation Functions =====

function calculateStraightLine(cost: number, salvage: number, usefulLifeMonths: number): number {
  if (usefulLifeMonths <= 0) return 0;
  return (cost - salvage) / usefulLifeMonths;
}

function calculateDoubleDeclining(bookValue: number, usefulLifeMonths: number, salvage: number): number {
  if (usefulLifeMonths <= 0) return 0;
  const rate = (2 / usefulLifeMonths);
  const depr = bookValue * rate;
  // Don't depreciate below salvage value
  return Math.max(0, Math.min(depr, bookValue - salvage));
}

function calculateSumOfYearsDigits(cost: number, salvage: number, usefulLifeMonths: number, periodNumber: number): number {
  const totalYears = Math.ceil(usefulLifeMonths / 12);
  const currentYear = Math.ceil(periodNumber / 12);
  const sumDigits = (totalYears * (totalYears + 1)) / 2;
  const remainingYears = totalYears - currentYear + 1;
  if (remainingYears <= 0 || sumDigits <= 0) return 0;
  return ((cost - salvage) * remainingYears) / (sumDigits * 12);
}

function calculateUnitsOfProduction(cost: number, salvage: number, totalUnits: number, unitsThisPeriod: number): number {
  if (totalUnits <= 0) return 0;
  return ((cost - salvage) / totalUnits) * unitsThisPeriod;
}

function getMonthlyDepreciation(
  method: string, cost: number, salvage: number, usefulLifeMonths: number,
  bookValue: number, periodNumber: number, totalUnits?: number, unitsThisPeriod?: number
): number {
  switch (method) {
    case 'straight_line':
      return calculateStraightLine(cost, salvage, usefulLifeMonths);
    case 'double_declining':
      return calculateDoubleDeclining(bookValue, usefulLifeMonths, salvage);
    case 'sum_of_years':
      return calculateSumOfYearsDigits(cost, salvage, usefulLifeMonths, periodNumber);
    case 'units_of_production':
      return calculateUnitsOfProduction(cost, salvage, totalUnits || 0, unitsThisPeriod || 0);
    case 'none':
      return 0;
    default:
      return calculateStraightLine(cost, salvage, usefulLifeMonths);
  }
}

// ===== GET: Depreciation Schedule for single asset =====
async function getSchedule(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const { assetId } = req.query;
  if (!assetId) return res.status(400).json({ error: 'Asset ID required' });

  const tf = buildTenantFilter(getTenantId(session));
  const [rows] = await sequelize.query(`
    SELECT * FROM asset_depreciation_schedule WHERE asset_id = :assetId ${tf.condition} ORDER BY period_number
  `, { replacements: { assetId, ...tf.replacements } });

  return res.json({ success: true, data: rows });
}

// ===== GET: Depreciation Summary (all assets) =====
async function getDepreciationSummary(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: {} });

  const tf = buildTenantFilter(getTenantId(session));
  const [summary] = await sequelize.query(`
    SELECT
      COUNT(*) as total_depreciable_assets,
      SUM(purchase_price) as total_cost,
      SUM(accumulated_depreciation) as total_accumulated,
      SUM(current_book_value) as total_book_value,
      SUM(salvage_value) as total_salvage
    FROM assets WHERE depreciation_method != 'none' AND status != 'disposed' ${tf.condition}
  `, { replacements: { ...tf.replacements } });

  const [byMethod] = await sequelize.query(`
    SELECT depreciation_method, COUNT(*) as count,
      SUM(purchase_price) as total_cost, SUM(accumulated_depreciation) as total_accumulated
    FROM assets WHERE depreciation_method != 'none' AND status != 'disposed' ${tf.condition}
    GROUP BY depreciation_method
  `, { replacements: { ...tf.replacements } });

  const [monthlyDepr] = await sequelize.query(`
    SELECT TO_CHAR(period_date, 'YYYY-MM') as month,
      SUM(depreciation_amount) as total_depreciation, COUNT(DISTINCT asset_id) as asset_count
    FROM asset_depreciation_schedule
    WHERE period_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY TO_CHAR(period_date, 'YYYY-MM')
    ORDER BY month
  `);

  const [fullyDepreciated] = await sequelize.query(`
    SELECT COUNT(*) as count FROM assets
    WHERE status != 'disposed' AND depreciation_method != 'none'
      AND current_book_value <= salvage_value
  `);

  return res.json({
    success: true,
    data: {
      summary: summary[0] || {},
      byMethod,
      monthlyTrend: monthlyDepr,
      fullyDepreciatedCount: parseInt(fullyDepreciated[0]?.count || '0')
    }
  });
}

// ===== GET: Unposted periods =====
async function getUnpostedPeriods(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });

  const [rows] = await sequelize.query(`
    SELECT ds.*, a.name as asset_name, a.asset_code
    FROM asset_depreciation_schedule ds
    JOIN assets a ON ds.asset_id = a.id
    WHERE ds.is_posted = false AND ds.period_date <= CURRENT_DATE
    ORDER BY ds.period_date, a.asset_code
  `);

  return res.json({ success: true, data: rows });
}

// ===== POST: Generate schedule for single asset =====
async function generateSchedule(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });
  const { assetId } = req.body;
  if (!assetId) return res.status(400).json({ error: 'Asset ID required' });

  // Get asset details
  const [assets] = await sequelize.query(`
    SELECT * FROM assets WHERE id = :assetId
  `, { replacements: { assetId } });

  if (!assets.length) return res.status(404).json({ error: 'Asset not found' });
  const asset = assets[0];

  if (asset.depreciation_method === 'none') {
    return res.json({ success: true, message: 'Asset not depreciable', data: [] });
  }

  // Delete existing unposted schedule
  await sequelize.query(`DELETE FROM asset_depreciation_schedule WHERE asset_id = :assetId AND is_posted = false`, { replacements: { assetId } });

  const cost = parseFloat(asset.purchase_price) || 0;
  const salvage = parseFloat(asset.salvage_value) || 0;
  const usefulLife = asset.useful_life_months || 60;
  const method = asset.depreciation_method || 'straight_line';
  const startDate = asset.acquisition_date ? new Date(asset.acquisition_date) : new Date();

  // Find last posted period
  const [lastPosted] = await sequelize.query(`
    SELECT MAX(period_number) as last_period, MAX(closing_value) as last_value
    FROM asset_depreciation_schedule WHERE asset_id = :assetId AND is_posted = true
  `, { replacements: { assetId } });

  let startPeriod = (lastPosted[0]?.last_period || 0) + 1;
  let openingValue = parseFloat(lastPosted[0]?.last_value) || cost;

  const schedule: any[] = [];

  for (let p = startPeriod; p <= usefulLife; p++) {
    if (openingValue <= salvage) break;

    const depr = getMonthlyDepreciation(method, cost, salvage, usefulLife, openingValue, p);
    const actualDepr = Math.min(depr, openingValue - salvage);
    const accumulated = cost - openingValue + actualDepr;
    const closingValue = openingValue - actualDepr;

    const periodDate = new Date(startDate);
    periodDate.setMonth(periodDate.getMonth() + p - 1);
    const dateStr = periodDate.toISOString().split('T')[0];

    schedule.push({
      period: p, date: dateStr, opening: openingValue,
      depreciation: actualDepr, accumulated, closing: closingValue
    });

    // Insert into DB
    await sequelize.query(`
      INSERT INTO asset_depreciation_schedule (tenant_id, asset_id, period_number, period_date, opening_value, depreciation_amount, accumulated, closing_value)
      VALUES (:tenantId, :assetId, :period, :date, :opening, :depr, :acc, :closing)
    `, {
      replacements: {
        tenantId: getTenantId(session), assetId, period: p, date: dateStr, opening: openingValue,
        depr: actualDepr, acc: accumulated, closing: closingValue
      }
    });

    openingValue = closingValue;
  }

  try {
    await logAudit({ tenantId: getTenantId(session), action: 'create', entityType: 'depreciation_schedule', entityId: String(assetId), userId: (session.user as any).id, userName: (session.user as any).name, newValues: { periods: schedule.length, method: asset.depreciation_method }, metadata: { module: 'asset_management' }, req });
  } catch (e) {}
  return res.json({ success: true, data: schedule, message: `Generated ${schedule.length} periods` });
}

// ===== POST: Calculate depreciation for all assets (batch) =====
async function calculateAllDepreciation(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });

  const tf = buildTenantFilter(getTenantId(session));
  const [assets] = await sequelize.query(`
    SELECT id, purchase_price, salvage_value, useful_life_months, depreciation_method, acquisition_date,
      accumulated_depreciation, current_book_value
    FROM assets WHERE depreciation_method != 'none' AND status IN ('active', 'in_use')
      AND current_book_value > salvage_value ${tf.condition}
  `, { replacements: { ...tf.replacements } });

  let generated = 0;
  const currentDate = new Date();
  const currentPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  for (const asset of assets) {
    // Check if current month already has a schedule entry
    const [existing] = await sequelize.query(`
      SELECT id FROM asset_depreciation_schedule
      WHERE asset_id = :assetId AND TO_CHAR(period_date, 'YYYY-MM') = :period
    `, { replacements: { assetId: asset.id, period: currentPeriod } });

    if (existing.length > 0) continue;

    const cost = parseFloat(asset.purchase_price) || 0;
    const salvage = parseFloat(asset.salvage_value) || 0;
    const usefulLife = asset.useful_life_months || 60;
    const bookValue = parseFloat(asset.current_book_value) || cost;

    // Get period number
    const [periodCount] = await sequelize.query(`
      SELECT COUNT(*) as cnt FROM asset_depreciation_schedule WHERE asset_id = :assetId
    `, { replacements: { assetId: asset.id } });
    const periodNum = parseInt(periodCount[0].cnt) + 1;

    const depr = getMonthlyDepreciation(asset.depreciation_method, cost, salvage, usefulLife, bookValue, periodNum);
    const actualDepr = Math.min(depr, bookValue - salvage);

    if (actualDepr <= 0) continue;

    const newAccum = parseFloat(asset.accumulated_depreciation) + actualDepr;
    const newBookValue = bookValue - actualDepr;

    await sequelize.query(`
      INSERT INTO asset_depreciation_schedule (tenant_id, asset_id, period_number, period_date, opening_value, depreciation_amount, accumulated, closing_value)
      VALUES (:tenantId, :assetId, :period, :date, :opening, :depr, :acc, :closing)
    `, {
      replacements: {
        tenantId: getTenantId(session), assetId: asset.id, period: periodNum, date: `${currentPeriod}-01`,
        opening: bookValue, depr: actualDepr, acc: newAccum, closing: newBookValue
      }
    });

    // Update asset
    await sequelize.query(`
      UPDATE assets SET accumulated_depreciation = :acc, current_book_value = :bv,
        last_depreciation_date = :date, updated_at = NOW()
      WHERE id = :id
    `, { replacements: { id: asset.id, acc: newAccum, bv: newBookValue, date: `${currentPeriod}-01` } });

    generated++;
  }

  try {
    await logAudit({ tenantId: getTenantId(session), action: 'create', entityType: 'depreciation_batch', userId: (session.user as any).id, userName: (session.user as any).name, newValues: { generated, period: currentPeriod }, metadata: { module: 'asset_management' }, req });
  } catch (e) {}
  return res.json({ success: true, message: `Calculated depreciation for ${generated} assets` });
}

// ===== POST: Post depreciation to finance journal =====
async function postDepreciation(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ error: 'Database not available' });
  const { scheduleIds, period } = req.body;

  let where = 'WHERE is_posted = false';
  const replacements: any = {};

  if (scheduleIds && scheduleIds.length > 0) {
    where += ` AND id IN (${scheduleIds.map((_: any, i: number) => `:id${i}`).join(',')})`;
    scheduleIds.forEach((sid: string, i: number) => { replacements[`id${i}`] = sid; });
  } else if (period) {
    where += ` AND TO_CHAR(period_date, 'YYYY-MM') = :period AND period_date <= CURRENT_DATE`;
    replacements.period = period;
  } else {
    where += ` AND period_date <= CURRENT_DATE`;
  }

  const [items] = await sequelize.query(`
    SELECT ds.*, a.name as asset_name, a.asset_code
    FROM asset_depreciation_schedule ds JOIN assets a ON ds.asset_id = a.id ${where}
  `, { replacements });

  if (!items.length) return res.json({ success: true, message: 'No unposted depreciation found', posted: 0 });

  // Mark as posted
  const ids = items.map((i: any) => i.id);
  await sequelize.query(`
    UPDATE asset_depreciation_schedule SET is_posted = true, posted_at = NOW() WHERE id IN (:ids)
  `, { replacements: { ids } });

  // Log lifecycle events
  for (const item of items) {
    await sequelize.query(`
      INSERT INTO asset_lifecycle_events (tenant_id, asset_id, event_type, description, performed_by, performed_by_name, metadata)
      VALUES (:tenantId, :assetId, 'depreciation_posted', :desc, :userId, :userName, :meta::jsonb)
    `, {
      replacements: {
        tenantId: getTenantId(session), assetId: item.asset_id,
        desc: `Penyusutan periode ${item.period_number} diposting: Rp ${parseFloat(item.depreciation_amount).toLocaleString()}`,
        userId: (session.user as any).id, userName: (session.user as any).name,
        meta: JSON.stringify({ period: item.period_number, amount: item.depreciation_amount, date: item.period_date })
      }
    });
  }

  try {
    await logAudit({ tenantId: getTenantId(session), action: 'approve', entityType: 'depreciation_posting', userId: (session.user as any).id, userName: (session.user as any).name, newValues: { posted: items.length }, metadata: { module: 'asset_management' }, req });
  } catch (e) {}
  return res.json({ success: true, message: `Posted ${items.length} depreciation entries`, posted: items.length });
}

// ===== POST: Simulate depreciation (what-if) =====
async function simulateDepreciation(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { cost, salvageValue, usefulLifeMonths, method } = req.body;

  if (!cost || !usefulLifeMonths) return res.status(400).json({ error: 'Cost and useful life required' });

  const salvage = salvageValue || 0;
  const schedule: any[] = [];
  let openingValue = cost;

  for (let p = 1; p <= usefulLifeMonths; p++) {
    if (openingValue <= salvage) break;

    const depr = getMonthlyDepreciation(method || 'straight_line', cost, salvage, usefulLifeMonths, openingValue, p);
    const actualDepr = Math.min(depr, openingValue - salvage);
    const accumulated = cost - openingValue + actualDepr;
    const closingValue = openingValue - actualDepr;

    schedule.push({
      period: p,
      year: Math.ceil(p / 12),
      month: ((p - 1) % 12) + 1,
      openingValue: Math.round(openingValue * 100) / 100,
      depreciation: Math.round(actualDepr * 100) / 100,
      accumulated: Math.round(accumulated * 100) / 100,
      closingValue: Math.round(closingValue * 100) / 100,
      depreciatedPct: Math.round((accumulated / (cost - salvage)) * 10000) / 100
    });

    openingValue = closingValue;
  }

  // Yearly summary
  const yearlyMap = new Map<number, { depreciation: number; closingValue: number }>();
  for (const s of schedule) {
    if (!yearlyMap.has(s.year)) yearlyMap.set(s.year, { depreciation: 0, closingValue: s.closingValue });
    const y = yearlyMap.get(s.year)!;
    y.depreciation += s.depreciation;
    y.closingValue = s.closingValue;
  }
  const yearlySummary = Array.from(yearlyMap.entries()).map(([year, data]) => ({
    year, annualDepreciation: Math.round(data.depreciation * 100) / 100,
    closingValue: Math.round(data.closingValue * 100) / 100
  }));

  return res.json({
    success: true,
    data: {
      method: method || 'straight_line',
      cost, salvageValue: salvage, usefulLifeMonths,
      monthlySchedule: schedule,
      yearlySummary,
      totalPeriods: schedule.length
    }
  });
}
