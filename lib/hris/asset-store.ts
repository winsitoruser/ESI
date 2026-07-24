/**
 * HR Asset Management — onboarding issue, offboarding return
 * Live data: `hris_assets` (tenant-scoped). Linked to employees via assigned_to.
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch (_) {}

export type AssetCategory = 'laptop' | 'phone' | 'id_card' | 'uniform' | 'vehicle' | 'access_card' | 'other';
export type AssetStatus = 'available' | 'assigned' | 'maintenance' | 'returned' | 'lost' | 'disposed';

export interface HrAsset {
  id: string;
  assetCode: string;
  name: string;
  category: AssetCategory;
  serialNumber?: string;
  brand?: string;
  purchaseDate?: string;
  purchaseValue?: number;
  status: AssetStatus;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: string;
  returnedAt?: string;
  condition?: string;
  notes?: string;
  lifecycleRef?: string;
}

export interface CreateAssetInput {
  assetCode?: string;
  name: string;
  category?: AssetCategory;
  serialNumber?: string;
  brand?: string;
  purchaseDate?: string;
  purchaseValue?: number;
  notes?: string;
  condition?: string;
}

const CATEGORY_PREFIX: Record<string, string> = {
  laptop: 'LT',
  phone: 'PH',
  id_card: 'ID',
  uniform: 'UN',
  vehicle: 'VH',
  access_card: 'AC',
  other: 'AS',
};

export async function ensureAssetTables(): Promise<boolean> {
  if (!sequelize) return false;
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_assets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      asset_code VARCHAR(50) NOT NULL,
      name VARCHAR(200) NOT NULL,
      category VARCHAR(30) NOT NULL DEFAULT 'other',
      serial_number VARCHAR(100),
      brand VARCHAR(100),
      purchase_date DATE,
      purchase_value NUMERIC(15,2),
      status VARCHAR(20) DEFAULT 'available',
      assigned_to TEXT,
      assigned_to_name VARCHAR(200),
      assigned_at TIMESTAMPTZ,
      returned_at TIMESTAMPTZ,
      condition VARCHAR(50),
      notes TEXT,
      lifecycle_ref VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  try {
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS hris_assets_tenant_code_uidx
      ON hris_assets (tenant_id, asset_code)
    `);
  } catch { /* index may already exist with different name */ }
  return true;
}

function mapAsset(row: any): HrAsset {
  return {
    id: row.id,
    assetCode: row.asset_code,
    name: row.name,
    category: row.category,
    serialNumber: row.serial_number,
    brand: row.brand,
    purchaseDate: row.purchase_date,
    purchaseValue: row.purchase_value != null ? parseFloat(row.purchase_value) : undefined,
    status: row.status,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to_name,
    assignedAt: row.assigned_at,
    returnedAt: row.returned_at,
    condition: row.condition,
    notes: row.notes,
    lifecycleRef: row.lifecycle_ref,
  };
}

async function nextAssetCode(tenantId: string, category: AssetCategory): Promise<string> {
  const prefix = CATEGORY_PREFIX[category] || 'AS';
  const [rows] = await sequelize.query(
    `SELECT COUNT(*)::int AS n FROM hris_assets WHERE tenant_id = $1 AND category = $2`,
    { bind: [tenantId, category] },
  );
  const n = (rows?.[0]?.n || 0) + 1;
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

export async function createAsset(
  input: CreateAssetInput,
  tenantId: string,
): Promise<HrAsset | null> {
  if (!sequelize || !tenantId) return null;
  const name = String(input.name || '').trim();
  if (!name) throw new Error('Nama aset wajib diisi');
  const category = (input.category || 'other') as AssetCategory;
  await ensureAssetTables();
  const code = String(input.assetCode || '').trim() || (await nextAssetCode(tenantId, category));
  const [rows] = await sequelize.query(
    `INSERT INTO hris_assets (
      tenant_id, asset_code, name, category, serial_number, brand,
      purchase_date, purchase_value, status, condition, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'available',$9,$10)
    RETURNING *`,
    {
      bind: [
        tenantId,
        code,
        name,
        category,
        input.serialNumber || null,
        input.brand || null,
        input.purchaseDate || null,
        input.purchaseValue != null ? Number(input.purchaseValue) : null,
        input.condition || 'good',
        input.notes || null,
      ],
    },
  );
  return rows?.[0] ? mapAsset(rows[0]) : null;
}

export async function listAssets(filters?: {
  status?: AssetStatus;
  category?: AssetCategory;
  assignedTo?: string;
  tenantId?: string | null;
}): Promise<HrAsset[]> {
  const { allowHrMockFallback } = await import('./data-source');
  // SaaS: without a tenant, never leak cross-tenant / mock inventory.
  if (!filters?.tenantId) {
    return allowHrMockFallback() ? getMockAssets(filters) : [];
  }
  if (!sequelize) {
    return allowHrMockFallback() ? getMockAssets(filters) : [];
  }
  await ensureAssetTables();
  let sql = 'SELECT * FROM hris_assets WHERE tenant_id = $1';
  const params: any[] = [filters.tenantId];
  if (filters?.status) { params.push(filters.status); sql += ` AND status = $${params.length}`; }
  if (filters?.category) { params.push(filters.category); sql += ` AND category = $${params.length}`; }
  if (filters?.assignedTo) { params.push(filters.assignedTo); sql += ` AND assigned_to = $${params.length}`; }
  sql += ' ORDER BY asset_code ASC';
  const [rows] = await sequelize.query(sql, { bind: params });
  // Empty tenant inventory must stay empty in production (no MacBook demos).
  if (!rows?.length) {
    return allowHrMockFallback() ? getMockAssets(filters) : [];
  }
  return rows.map(mapAsset);
}

export async function assignAsset(
  assetId: string,
  employeeId: string,
  employeeName: string,
  lifecycleRef?: string,
  tenantId?: string | null,
): Promise<HrAsset | null> {
  if (!sequelize) return null;
  if (!tenantId) return null;
  if (!employeeId) throw new Error('Karyawan wajib dipilih');
  const [rows] = await sequelize.query(`
    UPDATE hris_assets SET status = 'assigned', assigned_to = $2, assigned_to_name = $3,
      assigned_at = NOW(), returned_at = NULL, lifecycle_ref = $4, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $5
      AND status IN ('available', 'returned')
    RETURNING *
  `, { bind: [assetId, employeeId, employeeName || null, lifecycleRef || null, tenantId] });
  return rows?.[0] ? mapAsset(rows[0]) : null;
}

export async function returnAsset(
  assetId: string,
  condition?: string,
  tenantId?: string | null,
  lifecycleRef?: string,
): Promise<HrAsset | null> {
  if (!sequelize) return null;
  if (!tenantId) return null;
  // Back to pool as available so it can be re-issued (onboarding / transfer)
  const [rows] = await sequelize.query(`
    UPDATE hris_assets SET status = 'available', returned_at = NOW(), condition = $2,
      assigned_to = NULL, assigned_to_name = NULL,
      lifecycle_ref = COALESCE($4, lifecycle_ref),
      updated_at = NOW()
    WHERE id = $1 AND tenant_id = $3 AND status = 'assigned'
    RETURNING *
  `, { bind: [assetId, condition || 'good', tenantId, lifecycleRef || null] });
  return rows?.[0] ? mapAsset(rows[0]) : null;
}

/** Return every asset currently assigned to an employee (offboarding clearance). */
export async function returnAllAssetsForEmployee(
  employeeId: string,
  tenantId: string,
  lifecycleRef?: string,
): Promise<HrAsset[]> {
  if (!sequelize || !tenantId || !employeeId) return [];
  await ensureAssetTables();
  const assigned = await listAssets({ assignedTo: employeeId, tenantId, status: 'assigned' });
  const out: HrAsset[] = [];
  for (const a of assigned) {
    const returned = await returnAsset(a.id, 'good', tenantId, lifecycleRef);
    if (returned) out.push(returned);
  }
  return out;
}

export async function getAssetSummary(tenantId?: string | null) {
  const assets = await listAssets({ tenantId });
  return {
    total: assets.length,
    assigned: assets.filter(a => a.status === 'assigned').length,
    available: assets.filter(a => a.status === 'available' || a.status === 'returned').length,
    pendingReturn: assets.filter(a => a.status === 'assigned').length,
    totalValue: assets.reduce((s, a) => s + (a.purchaseValue || 0), 0),
  };
}

function getMockAssets(filters?: { status?: AssetStatus }): HrAsset[] {
  const all: HrAsset[] = [
    { id: 'a1', assetCode: 'LT-001', name: 'MacBook Pro 14"', category: 'laptop', serialNumber: 'C02XL0FDJHD3', brand: 'Apple', purchaseValue: 25000000, status: 'assigned', assignedTo: '1', assignedToName: 'Andi Saputra' },
    { id: 'a2', assetCode: 'LT-002', name: 'ThinkPad X1 Carbon', category: 'laptop', serialNumber: 'PF-2K3M4N', brand: 'Lenovo', purchaseValue: 18000000, status: 'assigned', assignedTo: '3', assignedToName: 'Budi Santoso' },
    { id: 'a3', assetCode: 'PH-001', name: 'iPhone 15 Pro', category: 'phone', serialNumber: 'F17DLT2', brand: 'Apple', purchaseValue: 18000000, status: 'available' },
    { id: 'a4', assetCode: 'ID-045', name: 'Kartu ID Karyawan', category: 'id_card', status: 'assigned', assignedTo: '2', assignedToName: 'Maya Putri' },
    { id: 'a5', assetCode: 'AC-012', name: 'Access Card Lantai 5', category: 'access_card', status: 'assigned', assignedTo: '5', assignedToName: 'Dimas Prasetyo' },
  ];
  return filters?.status ? all.filter(a => a.status === filters.status) : all;
}
