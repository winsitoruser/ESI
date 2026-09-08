import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { resolveDataSource } from '@/lib/hris/data-source';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';
import {
  calculateAchievementPercentage,
  calculateOverallScore,
  getKPIStatus,
} from '@/lib/hq/kpi-calculator';

let sequelize: any;
try {
  sequelize = require('../../../lib/sequelize');
} catch (e) {}

try {
  require('../../../models');
} catch (e) {
  console.warn('KPI models not available:', e);
}

function parsePeriod(raw: unknown): string | null {
  const s = String(raw || '').trim();
  if (!s) return new Date().toISOString().substring(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) return null;
  return s;
}

/** Run SQL inside SAVEPOINT so a failure doesn't abort withHQAuth's request transaction. */
async function safeQuery(sql: string, replacements?: Record<string, unknown>) {
  if (!sequelize) return [[], null] as any;
  const sp = `kpi_sp_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  try {
    await sequelize.query(`SAVEPOINT ${sp}`);
    const result = await sequelize.query(sql, { replacements });
    await sequelize.query(`RELEASE SAVEPOINT ${sp}`);
    return result;
  } catch (e) {
    try {
      await sequelize.query(`ROLLBACK TO SAVEPOINT ${sp}`);
    } catch { /* ignore */ }
    throw e;
  }
}

async function softQuery(sql: string, replacements?: Record<string, unknown>) {
  try {
    return await safeQuery(sql, replacements);
  } catch {
    return [[], null] as any;
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const tenantId = tenantIdFromSession(session);

    switch (req.method) {
      case 'GET':
        return await getKPIData(req, res, tenantId);
      case 'POST':
        return await createKPI(req, res, tenantId);
      case 'PUT':
        return await updateKPI(req, res, tenantId);
      case 'DELETE':
        return await deleteKPI(req, res, tenantId);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.warn('KPI API Error: (table may not exist):', error?.message);
    return res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
}

export default withHQAuth(handler, { module: 'hris' });

// ========== GET: Fetch KPI data with real branch calculations ==========
async function getKPIData(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { period, employeeId, branchId } = req.query;
  const currentPeriod = parsePeriod(period);
  if (!currentPeriod) {
    return res.status(400).json({ success: false, error: 'Invalid period — use YYYY-MM' });
  }

  if (!tenantId) {
    return res.status(200).json({
      success: true,
      employeeKPIs: [],
      branchKPIs: [],
      templates: [],
      employees: [],
      period: currentPeriod,
      dataSource: 'empty',
      summary: { totalEmployees: 0, exceeded: 0, achieved: 0, partial: 0, notAchieved: 0, avgAchievement: 0 },
    });
  }

  // Fetch employee KPIs from DB
  let employeeKPIs: any[] = [];
  let branchKPIs: any[] = [];

  try {
    if (sequelize) {
      // Get employee KPI records (tenant-scoped via employees)
      const [kpiRows] = await sequelize.query(`
        SELECT ek.*, e.name as emp_name, e.position as emp_position, e.department as emp_department,
               e.photo_url as emp_photo_url,
               b.name as branch_name, b.code as branch_code
        FROM employee_kpis ek
        INNER JOIN employees e ON ek.employee_id = e.id AND e.tenant_id = :tenantId
        LEFT JOIN branches b ON COALESCE(ek.branch_id, e.branch_id) = b.id
        WHERE ek.period = :period
        ${employeeId ? 'AND ek.employee_id = :employeeId' : ''}
        ${branchId ? 'AND COALESCE(ek.branch_id, e.branch_id) = :branchId' : ''}
        ORDER BY e.name ASC, ek.category ASC
      `, { replacements: { period: currentPeriod, employeeId, branchId, tenantId } });

      if (kpiRows.length > 0) {
        // Group by employee
        const grouped: Record<string, any[]> = {};
        kpiRows.forEach((k: any) => {
          const eid = k.employee_id;
          if (!grouped[eid]) grouped[eid] = [];
          grouped[eid].push(k);
        });

        employeeKPIs = Object.entries(grouped).map(([eid, metrics]) => {
          const first = metrics[0];
          const metricInputs = metrics.map((m: any) => ({
            actual: parseFloat(m.actual) || 0,
            target: parseFloat(m.target) || 0,
            weight: Number(m.weight) || 0,
          }));
          const totalWeight = metricInputs.reduce((s, m) => s + m.weight, 0);
          // If weights missing/zero, treat equally
          const normalized = totalWeight > 0
            ? metricInputs
            : metricInputs.map((m) => ({ ...m, weight: 100 / Math.max(metricInputs.length, 1) }));
          const scored = calculateOverallScore(normalized);
          const overallAchievement = Math.round(
            normalized.reduce((s, m) => {
              const ach = calculateAchievementPercentage(m.actual, m.target);
              return s + ach * m.weight;
            }, 0) / (normalized.reduce((s, m) => s + m.weight, 0) || 1),
          );
          const status = getKPIStatus(overallAchievement);
          const weightSum = metrics.reduce((s: number, m: any) => s + (Number(m.weight) || 0), 0);

          return {
            employeeId: eid,
            employeeName: first.emp_name || 'Unknown',
            photo_url: first.emp_photo_url || null,
            position: first.emp_position || '-',
            branchName: first.branch_name || '-',
            branchCode: first.branch_code || '-',
            department: first.emp_department || '-',
            period: first.period || currentPeriod,
            // 0–100 score aligned with achievement (no arbitrary 0.92 discount)
            overallScore: Math.min(Math.round(overallAchievement), 200),
            overallAchievement,
            scoreLevel: scored.level?.level ?? null,
            scoreLabel: scored.level?.label ?? null,
            weightSum,
            weightBalanced: Math.abs(weightSum - 100) < 0.5 || metrics.length === 0,
            metrics: metrics.map((m: any) => ({
              id: m.id,
              name: m.metric_name,
              category: m.category,
              target: parseFloat(m.target),
              actual: parseFloat(m.actual),
              unit: m.unit,
              weight: m.weight,
              trend: determineTrend(parseFloat(m.actual), parseFloat(m.target)),
              period: m.period,
              status: m.status,
              achievement: calculateAchievementPercentage(parseFloat(m.actual) || 0, parseFloat(m.target) || 0),
            })),
            status,
            lastUpdated: first.updated_at
          };
        });
      }

      // Branch KPIs — prefer tenant branches; fall back to branches referenced by employees/KPIs
      branchKPIs = await calculateBranchKPIs(currentPeriod, branchId as string | undefined, tenantId);
    }
  } catch (e: any) {
    console.warn('KPI DB query failed:', e.message);
  }

  // Summary stats
  const total = employeeKPIs.length;
  const exceeded = employeeKPIs.filter(e => e.status === 'exceeded').length;
  const achieved = employeeKPIs.filter(e => e.status === 'achieved').length;
  const partial = employeeKPIs.filter(e => e.status === 'partial').length;
  const notAchieved = employeeKPIs.filter(e => e.status === 'not_achieved').length;
  const avgAchievement = total > 0 ? Math.round(employeeKPIs.reduce((s, e) => s + e.overallAchievement, 0) / total) : 0;

  // Get templates + employees for the UI (isolated so one failure doesn't blank both)
  let templates: any[] = [];
  let employees: any[] = [];
  if (sequelize && tenantId) {
    try {
      const [tplRows] = await softQuery(
        `SELECT * FROM kpi_templates
         WHERE tenant_id = :tenantId
           AND COALESCE(is_active, true) = true
         ORDER BY category, code`,
        { tenantId },
      );
      templates = (tplRows || []).map(normalizeTemplate);
    } catch (e: any) {
      console.warn('KPI templates query failed:', e?.message);
    }

    const empSelects = [
      `SELECT e.id, e.employee_code AS employee_id, e.name, e.position, e.department,
              e.branch_id, e.work_location, e.photo_url, b.name as branch_name
       FROM employees e LEFT JOIN branches b ON e.branch_id = b.id
       WHERE e.tenant_id = :tenantId
         AND (
           e.is_active = true
           OR LOWER(COALESCE(e.status::text, 'active')) = 'active'
           OR e.status IS NULL
         )
       ORDER BY e.name ASC`,
      `SELECT e.id, e.employee_code AS employee_id, e.name, e.position, e.department,
              e.branch_id, NULL::varchar AS work_location, NULL::varchar AS photo_url, b.name as branch_name
       FROM employees e LEFT JOIN branches b ON e.branch_id = b.id
       WHERE e.tenant_id = :tenantId
       ORDER BY e.name ASC`,
    ];
    for (const sql of empSelects) {
      try {
        const [rows] = await softQuery(sql, { tenantId });
        if ((rows || []).length || sql.includes('NULL::varchar AS photo_url')) {
          employees = (rows || []).map((e: any) => ({
            id: e.id,
            employeeId: e.employee_id || e.id,
            name: e.name,
            position: e.position || '-',
            department: e.department || '-',
            branchId: e.branch_id,
            branchName: e.branch_name || '-',
            workLocation: e.work_location || '',
            photo_url: e.photo_url || null,
          }));
          if (employees.length > 0 || sql.includes('NULL::varchar AS photo_url')) break;
        }
      } catch (e: any) {
        console.warn('KPI employees query failed:', e?.message);
      }
    }
  }

  return res.status(200).json({
    success: true,
    employeeKPIs,
    branchKPIs,
    templates,
    employees,
    period: currentPeriod,
    dataSource: resolveDataSource(total > 0, false),
    summary: { totalEmployees: total, exceeded, achieved, partial, notAchieved, avgAchievement }
  });
}

// ========== Calculate branch KPIs (tenant branches OR derived from employees) ==========
async function calculateBranchKPIs(period: string, filterBranchId?: string, tenantId?: string | null) {
  if (!sequelize || !tenantId) return [];

  try {
    const [year, month] = period.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(parseInt(year, 10), parseInt(month, 10), 0).toISOString().split('T')[0];

    let branches: any[] = [];
    const replacements: any = { tenantId, period };
    if (filterBranchId) replacements.branchId = filterBranchId;

    // 1) Prefer branches owned by tenant
    let branchQuery = 'SELECT id, name, code FROM branches WHERE tenant_id = :tenantId';
    if (filterBranchId) branchQuery += ' AND id = :branchId';
    branchQuery += ' ORDER BY name';
    try {
      const [rows] = await softQuery(branchQuery, replacements);
      branches = rows || [];
    } catch { branches = []; }

    // 2) Fallback: branches referenced by tenant employees / KPIs (common when branch.tenant_id unset)
    if (branches.length === 0) {
      try {
        const [derived] = await softQuery(`
          SELECT DISTINCT
            COALESCE(ek.branch_id, e.branch_id) AS id,
            COALESCE(b.name, 'Tanpa Cabang') AS name,
            COALESCE(b.code, '-') AS code
          FROM employees e
          LEFT JOIN employee_kpis ek ON ek.employee_id = e.id AND ek.period = :period
          LEFT JOIN branches b ON COALESCE(ek.branch_id, e.branch_id) = b.id
          WHERE e.tenant_id = :tenantId
            AND COALESCE(ek.branch_id, e.branch_id) IS NOT NULL
            ${filterBranchId ? 'AND COALESCE(ek.branch_id, e.branch_id) = :branchId' : ''}
          ORDER BY name
        `, replacements);
        branches = derived || [];
      } catch {
        branches = [];
      }
    }

    if (branches.length === 0) return [];

    // NOTE: do NOT run UPDATE here — withHQAuth wraps requests in a transaction;
    // a failed UPDATE aborts the txn and blanks subsequent template/employee queries.

    const result = [];
    for (const branch of branches) {
      const branchId = String(branch.id || '');
      if (!branchId) continue;

      let salesRevenue = 0;
      let txnCount = 0;
      try {
        const [salesData] = await softQuery(`
          SELECT COALESCE(SUM(grand_total), 0) as revenue, COUNT(*) as txn_count
          FROM pos_transactions
          WHERE branch_id::text = :branchId AND status = 'closed'
            AND created_at >= :startDate AND created_at <= :endDate
        `, { branchId, startDate, endDate: endDate + ' 23:59:59' });
        salesRevenue = parseFloat(salesData[0]?.revenue || 0);
        txnCount = parseInt(salesData[0]?.txn_count || 0, 10);
      } catch { /* POS optional */ }

      let empCount = 0;
      try {
        const [empData] = await softQuery(`
          SELECT COUNT(*)::int as cnt FROM employees
          WHERE tenant_id = :tenantId
            AND branch_id::text = :branchId
            AND (
              is_active = true
              OR LOWER(COALESCE(status::text, 'active')) = 'active'
              OR status IS NULL
            )
        `, { branchId, tenantId });
        empCount = parseInt(empData[0]?.cnt || 0, 10);
      } catch {
        empCount = 0;
      }

      const salesKPI = 0;

      let opsKPI = 0;
      let custKPI = 0;
      let hasOps = false;
      let hasCust = false;
      try {
        const [opsData] = await softQuery(`
          SELECT
            AVG(CASE WHEN category = 'operations' AND target > 0 THEN (actual / target) * 100 END) as ops_avg,
            AVG(CASE WHEN category = 'customer' AND target > 0 THEN (actual / target) * 100 END) as cust_avg,
            COUNT(*) FILTER (WHERE category = 'operations' AND target > 0)::int as ops_n,
            COUNT(*) FILTER (WHERE category = 'customer' AND target > 0)::int as cust_n
          FROM employee_kpis ek
          INNER JOIN employees e ON ek.employee_id = e.id AND e.tenant_id = :tenantId
          WHERE COALESCE(ek.branch_id, e.branch_id)::text = :branchId AND ek.period = :period
        `, { branchId, period, tenantId });
        hasOps = parseInt(opsData[0]?.ops_n || 0, 10) > 0;
        hasCust = parseInt(opsData[0]?.cust_n || 0, 10) > 0;
        if (hasOps) opsKPI = Math.round(parseFloat(opsData[0]?.ops_avg || 0));
        if (hasCust) custKPI = Math.round(parseFloat(opsData[0]?.cust_avg || 0));
      } catch { /* ignore */ }

      let empAvgAch = 0;
      let empWithKpi = 0;
      try {
        const [perfData] = await softQuery(`
          SELECT ek.employee_id,
            AVG(CASE WHEN ek.target > 0 THEN (ek.actual / ek.target) * 100 ELSE NULL END) as avg_ach
          FROM employee_kpis ek
          INNER JOIN employees e ON ek.employee_id = e.id AND e.tenant_id = :tenantId
          WHERE COALESCE(ek.branch_id, e.branch_id)::text = :branchId AND ek.period = :period
          GROUP BY ek.employee_id
        `, { branchId, period, tenantId });
        empWithKpi = (perfData || []).length;
        if (empWithKpi > 0) {
          empAvgAch = Math.round(
            perfData.reduce((s: number, p: any) => s + (parseFloat(p.avg_ach) || 0), 0) / empWithKpi,
          );
        }
      } catch { /* ignore */ }

      let overallAchievement = 0;
      if (empWithKpi > 0) {
        overallAchievement = empAvgAch;
      } else if (hasOps || hasCust) {
        const parts: { v: number; w: number }[] = [];
        if (hasOps) parts.push({ v: opsKPI, w: 0.6 });
        if (hasCust) parts.push({ v: custKPI, w: 0.4 });
        const tw = parts.reduce((s, p) => s + p.w, 0) || 1;
        overallAchievement = Math.round(parts.reduce((s, p) => s + p.v * p.w, 0) / tw);
      }

      if (!hasOps && empWithKpi > 0) opsKPI = empAvgAch;
      if (!hasCust && empWithKpi > 0) custKPI = empAvgAch;

      let topPerformers = 0;
      let lowPerformers = 0;
      try {
        const [perfData] = await softQuery(`
          SELECT ek.employee_id,
            AVG(CASE WHEN ek.target > 0 THEN (ek.actual / ek.target) * 100 ELSE 0 END) as avg_ach
          FROM employee_kpis ek
          INNER JOIN employees e ON ek.employee_id = e.id AND e.tenant_id = :tenantId
          WHERE COALESCE(ek.branch_id, e.branch_id)::text = :branchId AND ek.period = :period
          GROUP BY ek.employee_id
        `, { branchId, period, tenantId });
        topPerformers = perfData.filter((p: any) => parseFloat(p.avg_ach) >= 100).length;
        lowPerformers = perfData.filter((p: any) => parseFloat(p.avg_ach) < 80).length;
      } catch { /* ignore */ }

      let manager = '-';
      try {
        const [mgrData] = await softQuery(`
          SELECT u.name FROM users u
          WHERE u.assigned_branch_id::text = :branchId
            AND u.role IN ('manager', 'owner', 'admin', 'branch_manager')
          LIMIT 1
        `, { branchId });
        if (mgrData.length > 0) manager = mgrData[0].name;
      } catch { /* ignore */ }

      result.push({
        branchId,
        branchName: branch.name,
        branchCode: branch.code || '-',
        manager,
        overallAchievement,
        salesKPI,
        operationsKPI: opsKPI,
        customerKPI: custKPI,
        employeeCount: empCount || empWithKpi,
        topPerformers,
        lowPerformers,
        totalRevenue: salesRevenue,
        transactionCount: txnCount,
        derived: true,
      });
    }
    return result;
  } catch (e: any) {
    console.warn('Branch KPI calc error:', e.message);
    return [];
  }
}

// ========== POST: Create/Assign KPI ==========
async function createKPI(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { employeeId, branchId, metrics, period, templateId } = req.body;

  if (!tenantId) {
    return res.status(403).json({ error: 'Tenant context required' });
  }
  if (!employeeId || !metrics || metrics.length === 0) {
    return res.status(400).json({ error: 'Employee ID and metrics are required' });
  }

  const targetPeriod = period || new Date().toISOString().substring(0, 7);

  if (sequelize) {
    try {
      // Resolve branch from employee if not provided — verify employee belongs to tenant
      let resolvedBranchId = branchId || null;
      const [empRow] = await sequelize.query(
        'SELECT branch_id FROM employees WHERE id = :employeeId AND tenant_id = :tenantId LIMIT 1',
        { replacements: { employeeId, tenantId } }
      );
      if (!empRow?.length) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      if (!resolvedBranchId) {
        resolvedBranchId = empRow[0]?.branch_id || null;
      }

      const created = [];
      for (const m of metrics) {
        const [result] = await sequelize.query(`
          INSERT INTO employee_kpis (id, employee_id, branch_id, period, metric_name, category, target, actual, unit, weight, status, template_id)
          VALUES (gen_random_uuid(), :employeeId, :branchId, :period, :name, :category, :target, :actual, :unit, :weight, 'pending', :templateId)
          ON CONFLICT (employee_id, metric_name, period) DO UPDATE SET
            target = EXCLUDED.target, weight = EXCLUDED.weight, branch_id = COALESCE(EXCLUDED.branch_id, employee_kpis.branch_id),
            template_id = COALESCE(EXCLUDED.template_id, employee_kpis.template_id), updated_at = NOW()
          RETURNING *
        `, {
          replacements: {
            employeeId,
            branchId: resolvedBranchId || m.branchId || null,
            period: targetPeriod,
            name: m.name,
            category: m.category || 'operations',
            target: m.target,
            actual: m.actual || 0,
            unit: m.unit || '%',
            weight: m.weight || 100,
            templateId: templateId || m.templateId || null
          }
        });
        created.push(result[0]);
      }
      return res.status(201).json({ success: true, kpis: created, message: `${created.length} KPI berhasil dibuat` });
    } catch (e: any) {
      console.warn('KPI create error:', e.message);
      return res.status(500).json({ error: 'Gagal membuat KPI', details: e.message });
    }
  }

  return res.status(201).json({
    success: true,
    message: 'KPI created (mock)',
    kpi: { id: Date.now().toString(), employeeId, metrics, period: targetPeriod }
  });
}

// ========== PUT: Update KPI actual/status ==========
async function updateKPI(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { id, actual, status, notes } = req.body;

  if (!tenantId) {
    return res.status(403).json({ error: 'Tenant context required' });
  }
  if (!id) {
    return res.status(400).json({ error: 'KPI ID is required' });
  }

  if (sequelize) {
    try {
      // Get current KPI — must belong to tenant employee
      const [kpiRows] = await sequelize.query(`
        SELECT ek.* FROM employee_kpis ek
        INNER JOIN employees e ON ek.employee_id = e.id AND e.tenant_id = :tenantId
        WHERE ek.id = :id
      `, { replacements: { id, tenantId } });
      if (kpiRows.length === 0) return res.status(404).json({ error: 'KPI not found' });

      const kpi = kpiRows[0];
      const newActual = actual !== undefined ? actual : kpi.actual;
      let newStatus = status;

      // Auto-determine status
      if (actual !== undefined && !status) {
        const target = parseFloat(kpi.target) || 0;
        const achievement = target > 0 ? (parseFloat(newActual) / target) * 100 : 0;
        if (achievement >= 110) newStatus = 'exceeded';
        else if (achievement >= 100) newStatus = 'achieved';
        else if (achievement >= 80) newStatus = 'in_progress';
        else newStatus = 'not_achieved';
      }

      await sequelize.query(`
        UPDATE employee_kpis SET actual = :actual, status = :status, notes = :notes, updated_at = NOW()
        WHERE id = :id
      `, { replacements: { id, actual: newActual, status: newStatus || kpi.status, notes: notes || kpi.notes } });

      return res.status(200).json({ success: true, message: 'KPI berhasil diperbarui' });
    } catch (e: any) {
      return res.status(500).json({ error: 'Gagal memperbarui KPI', details: e.message });
    }
  }

  return res.status(200).json({ success: true, message: 'KPI updated (mock)' });
}

// ========== DELETE: Remove KPI ==========
async function deleteKPI(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { id } = req.query;
  if (!tenantId) {
    return res.status(403).json({ error: 'Tenant context required' });
  }
  if (!id) return res.status(400).json({ error: 'KPI ID is required' });

  if (sequelize) {
    try {
      const [result] = await sequelize.query(`
        DELETE FROM employee_kpis ek
        USING employees e
        WHERE ek.id = :id AND ek.employee_id = e.id AND e.tenant_id = :tenantId
        RETURNING ek.id
      `, { replacements: { id, tenantId } });
      if (!result?.length) return res.status(404).json({ error: 'KPI not found' });
      return res.status(200).json({ success: true, message: 'KPI berhasil dihapus' });
    } catch (e: any) {
      return res.status(500).json({ error: 'Gagal menghapus KPI', details: e.message });
    }
  }
  return res.status(200).json({ success: true, message: 'KPI deleted (mock)' });
}

// ========== Helpers ==========
function normalizeTemplate(row: any) {
  if (!row) return row;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || '',
    category: row.category,
    unit: row.unit || '%',
    data_type: row.data_type || row.dataType || 'number',
    formula_type: row.formula_type || row.formulaType || 'simple',
    formula: row.formula || '(actual / target) * 100',
    default_weight: Number(row.default_weight ?? row.defaultWeight ?? 100),
    measurement_frequency: row.measurement_frequency || row.measurementFrequency || 'monthly',
    is_active: row.is_active ?? row.isActive ?? true,
  };
}

function determineTrend(actual: number, target: number): 'up' | 'down' | 'stable' {
  const ratio = target > 0 ? actual / target : 0;
  if (ratio >= 1.05) return 'up';
  if (ratio < 0.9) return 'down';
  return 'stable';
}

