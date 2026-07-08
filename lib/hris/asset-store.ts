/**
 * HR Asset Management — onboarding issue, offboarding return
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

export async function listAssets(filters?: { status?: AssetStatus; category?: AssetCategory; assignedTo?: string }): Promise<HrAsset[]> {
  if (!sequelize) return getMockAssets(filters);
  await ensureAssetTables();
  let sql = 'SELECT * FROM hris_assets WHERE 1=1';
  const params: any[] = [];
  if (filters?.status) { params.push(filters.status); sql += ` AND status = $${params.length}`; }
  if (filters?.category) { params.push(filters.category); sql += ` AND category = $${params.length}`; }
  if (filters?.assignedTo) { params.push(filters.assignedTo); sql += ` AND assigned_to = $${params.length}`; }
  sql += ' ORDER BY asset_code ASC';
  const [rows] = await sequelize.query(sql, { bind: params });
  if (!rows?.length) return getMockAssets(filters);
  return rows.map(mapAsset);
}

export async function assignAsset(assetId: string, employeeId: string, employeeName: string, lifecycleRef?: string): Promise<HrAsset | null> {
  if (!sequelize) return null;
  const [rows] = await sequelize.query(`
    UPDATE hris_assets SET status = 'assigned', assigned_to = $2, assigned_to_name = $3,
      assigned_at = NOW(), lifecycle_ref = $4, updated_at = NOW()
    WHERE id = $1 RETURNING *
  `, { bind: [assetId, employeeId, employeeName, lifecycleRef || null] });
  return rows?.[0] ? mapAsset(rows[0]) : null;
}

export async function returnAsset(assetId: string, condition?: string): Promise<HrAsset | null> {
  if (!sequelize) return null;
  const [rows] = await sequelize.query(`
    UPDATE hris_assets SET status = 'returned', returned_at = NOW(), condition = $2,
      assigned_to = NULL, assigned_to_name = NULL, updated_at = NOW()
    WHERE id = $1 RETURNING *
  `, { bind: [assetId, condition || 'good'] });
  return rows?.[0] ? mapAsset(rows[0]) : null;
}

export async function getAssetSummary() {
  const assets = await listAssets();
  return {
    total: assets.length,
    assigned: assets.filter(a => a.status === 'assigned').length,
    available: assets.filter(a => a.status === 'available').length,
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
