import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { withModuleGuard } from '../../../../lib/middleware/withModuleGuard';

let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

async function q(query: string, replacements?: any): Promise<any[]> {
  if (!sequelize) return [];
  try {
    const [rows] = await sequelize.query(query, replacements ? { replacements } : undefined);
    return rows || [];
  } catch (e: any) {
    console.error('IE Query Error:', e.message);
    return [];
  }
}

async function qExec(query: string, replacements?: any): Promise<boolean> {
  if (!sequelize) return false;
  try {
    await sequelize.query(query, replacements ? { replacements } : undefined);
    return true;
  } catch (e: any) {
    console.error('IE Exec Error:', e.message);
    return false;
  }
}

function generateNumber(prefix: string): string {
  const d = new Date();
  return `${prefix}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
}

// ════════════════════════════════════════════════════════════════
// ENTITY DEFINITIONS — columns, validations, DB mapping
// ════════════════════════════════════════════════════════════════
export interface EntityColumn {
  key: string;
  label: string;
  required?: boolean;
  type?: 'string' | 'number' | 'date' | 'boolean' | 'select';
  options?: string[];
  example?: string;
  dbColumn?: string; // if different from key
}

export interface EntityDef {
  id: string;
  label: string;
  table: string;
  module: 'sfa' | 'crm';
  category: string;
  columns: EntityColumn[];
  autoGenNumber?: { prefix: string; column: string };
  defaults?: Record<string, any>;
  exportQuery?: string;
}

export const ENTITIES: Record<string, EntityDef> = {
  // ── SFA Entities ──
  leads: {
    id: 'leads', label: 'Leads', table: 'sfa_leads', module: 'sfa', category: 'Sales',
    autoGenNumber: { prefix: 'LD', column: 'lead_number' },
    columns: [
      { key: 'contact_name', label: 'Nama Kontak', required: true, example: 'John Doe' },
      { key: 'company_name', label: 'Nama Perusahaan', example: 'PT. Contoh' },
      { key: 'contact_email', label: 'Email', example: 'john@mail.com' },
      { key: 'contact_phone', label: 'Telepon', example: '08123456789' },
      { key: 'industry', label: 'Industri', example: 'FMCG' },
      { key: 'source', label: 'Sumber', type: 'select', options: ['manual', 'website', 'referral', 'cold_call', 'social_media', 'event'], example: 'referral' },
      { key: 'status', label: 'Status', type: 'select', options: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost'], example: 'new' },
      { key: 'priority', label: 'Prioritas', type: 'select', options: ['high', 'medium', 'low'], example: 'medium' },
      { key: 'estimated_value', label: 'Estimasi Nilai', type: 'number', example: '50000000' },
      { key: 'address', label: 'Alamat', example: 'Jl. Sudirman No. 1' },
      { key: 'city', label: 'Kota', example: 'Jakarta' },
      { key: 'notes', label: 'Catatan', example: 'Prospek potensial' },
    ],
    defaults: { status: 'new', priority: 'medium', source: 'manual' },
    exportQuery: `SELECT l.*, t.name as territory_name FROM sfa_leads l LEFT JOIN sfa_territories t ON l.territory_id = t.id WHERE l.tenant_id = :tid ORDER BY l.created_at DESC`,
  },
  opportunities: {
    id: 'opportunities', label: 'Opportunities / Pipeline', table: 'sfa_opportunities', module: 'sfa', category: 'Sales',
    columns: [
      { key: 'title', label: 'Judul', required: true, example: 'Proyek A' },
      { key: 'customer_name', label: 'Nama Customer', example: 'PT. Contoh' },
      { key: 'expected_value', label: 'Nilai Ekspektasi', type: 'number', required: true, example: '100000000' },
      { key: 'stage', label: 'Stage', type: 'select', options: ['qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost'], example: 'qualification' },
      { key: 'probability', label: 'Probabilitas (%)', type: 'number', example: '25' },
      { key: 'expected_close_date', label: 'Tgl Closing', type: 'date', example: '2025-06-30' },
      { key: 'status', label: 'Status', type: 'select', options: ['open', 'won', 'lost'], example: 'open' },
      { key: 'notes', label: 'Catatan', example: '' },
    ],
    defaults: { stage: 'qualification', probability: 10, status: 'open' },
    exportQuery: `SELECT * FROM sfa_opportunities WHERE tenant_id = :tid ORDER BY created_at DESC`,
  },
  territories: {
    id: 'territories', label: 'Territories', table: 'sfa_territories', module: 'sfa', category: 'Field Force',
    columns: [
      { key: 'name', label: 'Nama Territory', required: true, example: 'Jakarta Selatan' },
      { key: 'code', label: 'Kode', required: true, example: 'JKTS' },
      { key: 'region', label: 'Region', example: 'Jabodetabek' },
      { key: 'description', label: 'Deskripsi', example: 'Wilayah Jakarta bagian selatan' },
    ],
    exportQuery: `SELECT * FROM sfa_territories WHERE tenant_id = :tid ORDER BY name`,
  },
  visits: {
    id: 'visits', label: 'Kunjungan', table: 'sfa_visits', module: 'sfa', category: 'Field Force',
    columns: [
      { key: 'customer_name', label: 'Nama Customer', required: true, example: 'Toko ABC' },
      { key: 'visit_date', label: 'Tanggal', type: 'date', required: true, example: '2025-03-15' },
      { key: 'visit_type', label: 'Tipe', type: 'select', options: ['regular', 'follow_up', 'demo', 'closing', 'collection', 'survey'], example: 'regular' },
      { key: 'purpose', label: 'Tujuan', example: 'Penawaran produk baru' },
      { key: 'status', label: 'Status', type: 'select', options: ['planned', 'in_progress', 'completed', 'cancelled'], example: 'planned' },
      { key: 'customer_address', label: 'Alamat Customer', example: 'Jl. Raya No. 5' },
      { key: 'notes', label: 'Catatan', example: '' },
    ],
    defaults: { visit_type: 'regular', status: 'planned' },
    exportQuery: `SELECT * FROM sfa_visits WHERE tenant_id = :tid ORDER BY visit_date DESC`,
  },

  // ── CRM Entities ──
  customers: {
    id: 'customers', label: 'Customers', table: 'crm_customers', module: 'crm', category: 'Customer 360°',
    autoGenNumber: { prefix: 'CUS', column: 'customer_number' },
    columns: [
      { key: 'display_name', label: 'Nama Tampilan', required: true, example: 'PT. Maju Jaya' },
      { key: 'company_name', label: 'Nama Perusahaan', example: 'PT. Maju Jaya' },
      { key: 'customer_type', label: 'Tipe', type: 'select', options: ['company', 'individual'], example: 'company' },
      { key: 'industry', label: 'Industri', example: 'FMCG' },
      { key: 'company_size', label: 'Ukuran Perusahaan', type: 'select', options: ['micro', 'small', 'medium', 'large', 'enterprise'], example: 'medium' },
      { key: 'website', label: 'Website', example: 'www.majujaya.com' },
      { key: 'address', label: 'Alamat', example: 'Jl. Sudirman No. 1' },
      { key: 'city', label: 'Kota', example: 'Jakarta' },
      { key: 'province', label: 'Provinsi', example: 'DKI Jakarta' },
      { key: 'postal_code', label: 'Kode Pos', example: '12190' },
      { key: 'lifecycle_stage', label: 'Lifecycle Stage', type: 'select', options: ['prospect', 'lead', 'opportunity', 'customer', 'evangelist', 'churned'], example: 'prospect' },
      { key: 'customer_status', label: 'Status', type: 'select', options: ['active', 'inactive', 'suspended', 'blacklisted'], example: 'active' },
      { key: 'acquisition_source', label: 'Sumber Akuisisi', type: 'select', options: ['website', 'referral', 'cold_call', 'event', 'social_media', 'partner', 'ads'], example: 'referral' },
      { key: 'segment', label: 'Segment', type: 'select', options: ['platinum', 'gold', 'silver', 'bronze'], example: 'gold' },
      { key: 'credit_limit', label: 'Credit Limit', type: 'number', example: '100000000' },
      { key: 'payment_terms', label: 'Payment Terms', example: 'Net 30' },
      { key: 'tax_id', label: 'NPWP', example: '01.234.567.8-901.000' },
      { key: 'notes', label: 'Catatan', example: '' },
    ],
    defaults: { customer_type: 'company', lifecycle_stage: 'prospect', customer_status: 'active', credit_limit: 0 },
    exportQuery: `SELECT * FROM crm_customers WHERE tenant_id = :tid ORDER BY created_at DESC`,
  },
  contacts: {
    id: 'contacts', label: 'Contacts', table: 'crm_contacts', module: 'crm', category: 'Customer 360°',
    columns: [
      { key: 'first_name', label: 'Nama Depan', required: true, example: 'Budi' },
      { key: 'last_name', label: 'Nama Belakang', example: 'Santoso' },
      { key: 'title', label: 'Jabatan', example: 'Direktur' },
      { key: 'department', label: 'Departemen', example: 'Purchasing' },
      { key: 'email', label: 'Email', example: 'budi@company.com' },
      { key: 'phone', label: 'Telepon', example: '021-5551234' },
      { key: 'mobile', label: 'HP', example: '08123456789' },
      { key: 'whatsapp', label: 'WhatsApp', example: '08123456789' },
      { key: 'is_primary', label: 'Primary?', type: 'boolean', example: 'true' },
      { key: 'is_decision_maker', label: 'Decision Maker?', type: 'boolean', example: 'false' },
      { key: 'communication_preference', label: 'Preferensi Komunikasi', type: 'select', options: ['email', 'phone', 'whatsapp', 'meeting'], example: 'whatsapp' },
      { key: 'notes', label: 'Catatan', example: '' },
    ],
    defaults: { is_primary: false, is_decision_maker: false },
    exportQuery: `SELECT ct.*, c.display_name as customer_name FROM crm_contacts ct LEFT JOIN crm_customers c ON c.id = ct.customer_id WHERE ct.tenant_id = :tid ORDER BY ct.first_name`,
  },
  communications: {
    id: 'communications', label: 'Komunikasi', table: 'crm_communications', module: 'crm', category: 'Communication',
    autoGenNumber: { prefix: 'COM', column: 'comm_number' },
    columns: [
      { key: 'comm_type', label: 'Tipe', type: 'select', required: true, options: ['call', 'email', 'meeting', 'whatsapp', 'sms'], example: 'call' },
      { key: 'direction', label: 'Arah', type: 'select', options: ['inbound', 'outbound'], example: 'outbound' },
      { key: 'subject', label: 'Subject', example: 'Follow up penawaran' },
      { key: 'body', label: 'Isi / Catatan', example: 'Diskusi harga produk A' },
      { key: 'status', label: 'Status', type: 'select', options: ['completed', 'scheduled', 'missed', 'cancelled'], example: 'completed' },
      { key: 'outcome', label: 'Outcome', type: 'select', options: ['positive', 'neutral', 'negative', 'no_answer'], example: 'positive' },
      { key: 'call_duration', label: 'Durasi (menit)', type: 'number', example: '15' },
      { key: 'next_action', label: 'Next Action', example: 'Kirim proposal' },
    ],
    defaults: { direction: 'outbound', status: 'completed' },
    exportQuery: `SELECT cm.*, c.display_name as customer_name FROM crm_communications cm LEFT JOIN crm_customers c ON c.id = cm.customer_id WHERE cm.tenant_id = :tid ORDER BY cm.created_at DESC`,
  },
  tasks: {
    id: 'tasks', label: 'Tasks', table: 'crm_tasks', module: 'crm', category: 'Produktivitas',
    autoGenNumber: { prefix: 'TSK', column: 'task_number' },
    columns: [
      { key: 'title', label: 'Judul Task', required: true, example: 'Follow up customer X' },
      { key: 'description', label: 'Deskripsi', example: 'Hubungi untuk update status PO' },
      { key: 'task_type', label: 'Tipe', type: 'select', options: ['call', 'email', 'meeting', 'follow_up', 'review', 'approval', 'custom'], example: 'follow_up' },
      { key: 'priority', label: 'Prioritas', type: 'select', options: ['urgent', 'high', 'medium', 'low'], example: 'medium' },
      { key: 'status', label: 'Status', type: 'select', options: ['open', 'in_progress', 'completed', 'cancelled', 'deferred'], example: 'open' },
      { key: 'due_date', label: 'Due Date', type: 'date', example: '2025-04-01' },
      { key: 'start_date', label: 'Start Date', type: 'date', example: '2025-03-25' },
      { key: 'estimated_hours', label: 'Estimasi Jam', type: 'number', example: '2' },
    ],
    defaults: { task_type: 'follow_up', priority: 'medium', status: 'open' },
    exportQuery: `SELECT t.*, c.display_name as customer_name FROM crm_tasks t LEFT JOIN crm_customers c ON c.id = t.customer_id WHERE t.tenant_id = :tid ORDER BY t.created_at DESC`,
  },
  tickets: {
    id: 'tickets', label: 'Tiket Support', table: 'crm_tickets', module: 'crm', category: 'Service',
    autoGenNumber: { prefix: 'TKT', column: 'ticket_number' },
    columns: [
      { key: 'subject', label: 'Subject', required: true, example: 'Produk rusak saat diterima' },
      { key: 'description', label: 'Deskripsi', example: 'Customer melaporkan barang rusak' },
      { key: 'category', label: 'Kategori', type: 'select', options: ['billing', 'technical', 'product', 'complaint', 'request', 'feedback'], example: 'complaint' },
      { key: 'priority', label: 'Prioritas', type: 'select', options: ['critical', 'high', 'medium', 'low'], example: 'medium' },
      { key: 'severity', label: 'Severity', type: 'select', options: ['critical', 'major', 'minor', 'cosmetic'], example: 'minor' },
      { key: 'source_channel', label: 'Channel', type: 'select', options: ['email', 'phone', 'chat', 'whatsapp', 'social', 'walk_in'], example: 'email' },
      { key: 'status', label: 'Status', type: 'select', options: ['open', 'in_progress', 'waiting', 'resolved', 'closed'], example: 'open' },
    ],
    defaults: { priority: 'medium', severity: 'minor', status: 'open', source_channel: 'email' },
    exportQuery: `SELECT tk.*, c.display_name as customer_name FROM crm_tickets tk LEFT JOIN crm_customers c ON c.id = tk.customer_id WHERE tk.tenant_id = :tid ORDER BY tk.created_at DESC`,
  },
  follow_ups: {
    id: 'follow_ups', label: 'Follow-Ups', table: 'crm_follow_ups', module: 'crm', category: 'Communication',
    columns: [
      { key: 'title', label: 'Judul', required: true, example: 'Follow up penawaran' },
      { key: 'description', label: 'Deskripsi', example: 'Hubungi kembali minggu depan' },
      { key: 'follow_up_type', label: 'Tipe', type: 'select', options: ['call', 'email', 'meeting', 'visit', 'whatsapp'], example: 'call' },
      { key: 'priority', label: 'Prioritas', type: 'select', options: ['urgent', 'high', 'medium', 'low'], example: 'medium' },
      { key: 'due_date', label: 'Due Date', type: 'date', required: true, example: '2025-04-01' },
      { key: 'status', label: 'Status', type: 'select', options: ['pending', 'completed', 'cancelled', 'rescheduled'], example: 'pending' },
      { key: 'notes', label: 'Catatan', example: '' },
    ],
    defaults: { priority: 'medium', status: 'pending', follow_up_type: 'call' },
    exportQuery: `SELECT fu.*, c.display_name as customer_name FROM crm_follow_ups fu LEFT JOIN crm_customers c ON c.id = fu.customer_id WHERE fu.tenant_id = :tid ORDER BY fu.due_date ASC`,
  },
  forecasts: {
    id: 'forecasts', label: 'Forecasts', table: 'crm_forecasts', module: 'crm', category: 'Produktivitas',
    columns: [
      { key: 'name', label: 'Nama Forecast', required: true, example: 'Q1 2025' },
      { key: 'forecast_period', label: 'Periode', type: 'select', options: ['monthly', 'quarterly', 'yearly'], example: 'quarterly' },
      { key: 'period_start', label: 'Mulai', type: 'date', required: true, example: '2025-01-01' },
      { key: 'period_end', label: 'Akhir', type: 'date', required: true, example: '2025-03-31' },
      { key: 'target_revenue', label: 'Target Revenue', type: 'number', example: '500000000' },
      { key: 'target_deals', label: 'Target Deals', type: 'number', example: '10' },
      { key: 'best_case', label: 'Best Case', type: 'number', example: '600000000' },
      { key: 'most_likely', label: 'Most Likely', type: 'number', example: '450000000' },
      { key: 'worst_case', label: 'Worst Case', type: 'number', example: '300000000' },
      { key: 'notes', label: 'Catatan', example: '' },
    ],
    defaults: { forecast_period: 'monthly' },
    exportQuery: `SELECT * FROM crm_forecasts WHERE tenant_id = :tid ORDER BY period_start DESC`,
  },
  automation_rules: {
    id: 'automation_rules', label: 'Automation Rules', table: 'crm_automation_rules', module: 'crm', category: 'Automasi',
    columns: [
      { key: 'name', label: 'Nama Rule', required: true, example: 'Auto-assign lead baru' },
      { key: 'description', label: 'Deskripsi', example: 'Assign lead baru ke tim sales' },
      { key: 'rule_type', label: 'Tipe', type: 'select', options: ['trigger', 'scheduled', 'manual'], example: 'trigger' },
      { key: 'trigger_event', label: 'Trigger Event', example: 'lead_created' },
      { key: 'trigger_entity', label: 'Entity', type: 'select', options: ['lead', 'opportunity', 'customer', 'ticket', 'task'], example: 'lead' },
      { key: 'is_active', label: 'Aktif?', type: 'boolean', example: 'true' },
      { key: 'priority', label: 'Prioritas (angka)', type: 'number', example: '10' },
    ],
    defaults: { rule_type: 'trigger', is_active: true, priority: 0 },
    exportQuery: `SELECT * FROM crm_automation_rules WHERE tenant_id = :tid ORDER BY priority DESC`,
  },
};

// ════════════════════════════════════════════════════════════════
// API CONFIG — disable body parser for file uploads
// ════════════════════════════════════════════════════════════════
export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { action } = req.query;
    const tenantId = (session.user as any).tenantId || null;
    const userId = (session.user as any).id || null;
    const userRole = (session.user as any).role || 'staff';
    const isManager = ['super_admin', 'owner', 'admin', 'manager'].includes(userRole);

    // Both staff and manager can import/export — staff uses it for data entry, manager for bulk operations

    if (req.method === 'GET') {
      switch (action) {
        case 'entities': return getEntities(req, res);
        case 'template': return getTemplate(req, res);
        case 'export': return exportData(req, res, tenantId);
        case 'export-history': return getExportHistory(req, res, tenantId);
        default: return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    if (req.method === 'POST') {
      switch (action) {
        case 'validate': return validateImport(req, res, tenantId);
        case 'import': return importData(req, res, tenantId, userId);
        default: return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Import/Export API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}

export default withModuleGuard(['crm', 'sfa'], handler);

// ════════════════════════════════════════════════════════════════
// ██  GET ENTITIES — list all importable/exportable entities
// ════════════════════════════════════════════════════════════════
async function getEntities(_req: NextApiRequest, res: NextApiResponse) {
  const entities = Object.values(ENTITIES).map(e => ({
    id: e.id,
    label: e.label,
    module: e.module,
    category: e.category,
    columnCount: e.columns.length,
    requiredFields: e.columns.filter(c => c.required).map(c => c.label),
  }));

  // Group by category
  const grouped: Record<string, any[]> = {};
  entities.forEach(e => {
    if (!grouped[e.category]) grouped[e.category] = [];
    grouped[e.category].push(e);
  });

  return res.json({ success: true, data: { entities, grouped } });
}

// ════════════════════════════════════════════════════════════════
// ██  GET TEMPLATE — generate professional Excel template
// ════════════════════════════════════════════════════════════════
async function getTemplate(req: NextApiRequest, res: NextApiResponse) {
  const { entity, format } = req.query;
  const ent = ENTITIES[String(entity)];
  if (!ent) return res.status(400).json({ success: false, error: 'Invalid entity' });

  const headers = ent.columns.map(c => c.label);
  const examples = ent.columns.map(c => c.example || '');
  const required = ent.columns.map(c => c.required ? 'WAJIB' : 'opsional');
  const types = ent.columns.map(c => {
    if (c.type === 'select' && c.options) return `Pilihan: ${c.options.join(' | ')}`;
    if (c.type === 'number') return 'Angka';
    if (c.type === 'date') return 'Format: YYYY-MM-DD';
    if (c.type === 'boolean') return 'true / false';
    return 'Teks';
  });

  if (format === 'json') {
    return res.json({
      success: true,
      data: { entity: ent.id, label: ent.label, columns: ent.columns, headers, examples, required, types, sampleRows: [examples] }
    });
  }

  // ── Generate professional Excel template with ExcelJS ──
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Bedagang ERP';
  wb.created = new Date();

  // ╔══════════════════════════════════════╗
  // ║  Sheet 1: DATA IMPORT               ║
  // ╚══════════════════════════════════════╝
  const ws = wb.addWorksheet('Data Import', {
    properties: { defaultColWidth: 18, defaultRowHeight: 22 },
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // ── Style constants ──
  const BLUE = '1E40AF';
  const GREEN = '166534';
  const GREEN_LIGHT = 'DCFCE7';
  const AMBER_LIGHT = 'FEF3C7';
  const GRAY = '6B7280';
  const GRAY_LIGHT = 'F3F4F6';
  const WHITE = 'FFFFFF';
  const RED = 'DC2626';

  const borderThin = { style: 'thin' as const, color: { argb: 'D1D5DB' } };
  const allBorders = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };

  // ── Row 1: Column Headers (professional dark header) ──
  const headerRow = ws.getRow(1);
  ent.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    const label = col.required ? `${col.label} *` : col.label;
    cell.value = label;
    cell.font = { bold: true, size: 11, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = allBorders;
  });
  headerRow.height = 32;

  // ── Row 2: Field info (type + required indicator) ──
  const infoRow = ws.getRow(2);
  ent.columns.forEach((col, i) => {
    const cell = infoRow.getCell(i + 1);
    const typeLabel = col.type === 'select' && col.options ? col.options.join(', ') :
      col.type === 'number' ? 'Angka' : col.type === 'date' ? 'YYYY-MM-DD' :
      col.type === 'boolean' ? 'true / false' : 'Teks bebas';
    cell.value = col.required ? `⬤ WAJIB — ${typeLabel}` : typeLabel;
    cell.font = { size: 9, italic: true, color: { argb: col.required ? RED : GRAY } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.required ? AMBER_LIGHT : GRAY_LIGHT } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = allBorders;
  });
  infoRow.height = 28;

  // ── Row 3-4: Example data rows ──
  const ex1 = ws.getRow(3);
  ent.columns.forEach((col, i) => {
    const cell = ex1.getCell(i + 1);
    cell.value = castExampleValue(col, col.example || '');
    cell.font = { size: 10, color: { argb: '6B7280' }, italic: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_LIGHT } };
    cell.alignment = { vertical: 'middle' };
    cell.border = allBorders;
  });
  ex1.height = 24;

  const ex2 = ws.getRow(4);
  ent.columns.forEach((col, i) => {
    const cell = ex2.getCell(i + 1);
    cell.value = castExampleValue(col, getExample2(col));
    cell.font = { size: 10, color: { argb: '6B7280' }, italic: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_LIGHT } };
    cell.alignment = { vertical: 'middle' };
    cell.border = allBorders;
  });
  ex2.height = 24;

  // ── Rows 5-104: Empty data entry rows with alternating colors + borders ──
  for (let r = 5; r <= 104; r++) {
    const row = ws.getRow(r);
    ent.columns.forEach((_col, i) => {
      const cell = row.getCell(i + 1);
      cell.border = allBorders;
      if (r % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };
    });
    row.height = 22;
  }

  // ── Data Validation (dropdown lists for select fields) ──
  // Helper: convert 0-based column index to Excel letter (0=A, 25=Z, 26=AA, etc.)
  const colToLetter = (idx: number): string => {
    let s = '';
    let n = idx;
    while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; }
    return s;
  };

  ent.columns.forEach((col, i) => {
    const colLetter = colToLetter(i);
    if (col.type === 'select' && col.options && col.options.length > 0) {
      for (let r = 3; r <= 104; r++) {
        ws.getCell(`${colLetter}${r}`).dataValidation = {
          type: 'list',
          allowBlank: !col.required,
          formulae: [`"${col.options.join(',')}"`],
          showErrorMessage: true,
          errorTitle: 'Pilihan Tidak Valid',
          error: `Pilih salah satu: ${col.options.join(', ')}`,
        };
      }
    }
    if (col.type === 'number') {
      for (let r = 5; r <= 104; r++) {
        ws.getCell(`${colLetter}${r}`).numFmt = '#,##0';
      }
    }
  });

  // ── Column widths (auto-sized based on header + options length) ──
  ent.columns.forEach((col, i) => {
    let w = Math.max(col.label.length + 2, 14);
    if (col.type === 'select' && col.options) w = Math.max(w, Math.max(...col.options.map(o => o.length)) + 4);
    if (col.key.includes('address') || col.key === 'description' || col.key === 'notes' || col.key === 'body') w = 30;
    if (col.key.includes('email') || col.key === 'website') w = 24;
    ws.getColumn(i + 1).width = Math.min(w, 40);
  });

  // ╔══════════════════════════════════════╗
  // ║  Sheet 2: PETUNJUK PENGISIAN        ║
  // ╚══════════════════════════════════════╝
  const wsGuide = wb.addWorksheet('Petunjuk Pengisian', {
    properties: { defaultColWidth: 20, defaultRowHeight: 20 },
  });

  // Title
  wsGuide.mergeCells('A1:D1');
  const gTitle = wsGuide.getCell('A1');
  gTitle.value = `PETUNJUK PENGISIAN — ${ent.label}`;
  gTitle.font = { bold: true, size: 14, color: { argb: BLUE } };
  gTitle.alignment = { vertical: 'middle' };
  wsGuide.getRow(1).height = 36;

  // Instructions
  const instructions = [
    ['', '', '', ''],
    ['CARA PENGGUNAAN:', '', '', ''],
    ['1.', 'Isi data pada sheet "Data Import" mulai dari baris ke-5 (setelah contoh)', '', ''],
    ['2.', 'Baris 3-4 (hijau) adalah contoh data — hapus/timpa saat mengisi data asli', '', ''],
    ['3.', 'Kolom bertanda bintang (*) di header WAJIB diisi', '', ''],
    ['4.', 'Kolom dengan dropdown otomatis — pilih dari daftar yang tersedia', '', ''],
    ['5.', 'Format tanggal: YYYY-MM-DD (contoh: 2025-03-15)', '', ''],
    ['6.', 'Upload file ini langsung tanpa perlu mengubah nama file', '', ''],
    ['', '', '', ''],
    ['DAFTAR KOLOM:', '', '', ''],
    ['Kolom', 'Tipe Data', 'Wajib?', 'Keterangan'],
  ];
  instructions.forEach((row, ri) => {
    const r = wsGuide.getRow(ri + 2);
    row.forEach((v, ci) => { r.getCell(ci + 1).value = v; });
    if (ri === 1) r.getCell(1).font = { bold: true, size: 12, color: { argb: GREEN } };
    if (ri === 9) r.getCell(1).font = { bold: true, size: 12, color: { argb: GREEN } };
    if (ri === 10) {
      row.forEach((_v, ci) => {
        const cell = r.getCell(ci + 1);
        cell.font = { bold: true, size: 10, color: { argb: WHITE } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
        cell.border = allBorders;
      });
    }
  });

  // Column detail rows
  ent.columns.forEach((col, ci) => {
    const r = wsGuide.getRow(ci + 13);
    r.getCell(1).value = col.required ? `${col.label} *` : col.label;
    r.getCell(1).font = { bold: col.required, size: 10, color: { argb: col.required ? RED : '111827' } };
    r.getCell(2).value = col.type === 'select' ? 'Pilihan' : col.type === 'number' ? 'Angka' : col.type === 'date' ? 'Tanggal' : col.type === 'boolean' ? 'Boolean' : 'Teks';
    r.getCell(3).value = col.required ? 'YA' : 'Tidak';
    r.getCell(3).font = { bold: col.required, color: { argb: col.required ? RED : GRAY } };
    r.getCell(4).value = col.type === 'select' && col.options ? col.options.join(', ') : col.example || '-';
    [1,2,3,4].forEach(c => { r.getCell(c).border = allBorders; });
    if (ci % 2 === 0) [1,2,3,4].forEach(c => { r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY_LIGHT } }; });
  });

  wsGuide.getColumn(1).width = 22;
  wsGuide.getColumn(2).width = 14;
  wsGuide.getColumn(3).width = 10;
  wsGuide.getColumn(4).width = 50;

  // ── Write and send ──
  const now = new Date().toISOString().slice(0, 10);
  const buffer = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=template_${ent.id}_${now}.xlsx`);
  return res.send(Buffer.from(buffer));
}

function castExampleValue(col: EntityColumn, val: string): string | number | boolean {
  if (!val) return '';
  if (col.type === 'number') { const n = Number(val); return isNaN(n) ? val : n; }
  if (col.type === 'boolean') return val.toLowerCase() === 'true';
  return val;
}

function getExample2(col: EntityColumn): string {
  if (col.type === 'select' && col.options && col.options.length > 1) return col.options[1];
  if (col.type === 'number') return String(Math.round(Number(col.example || 0) * 0.8) || '0');
  if (col.type === 'date') return '2025-06-15';
  if (col.type === 'boolean') return col.example === 'true' ? 'false' : 'true';
  if (col.key === 'contact_name' || col.key === 'display_name') return 'Jane Smith';
  if (col.key === 'company_name') return 'CV. Abadi Makmur';
  if (col.key === 'contact_email' || col.key === 'email') return 'jane@example.com';
  if (col.key === 'contact_phone' || col.key === 'phone' || col.key === 'mobile') return '08198765432';
  if (col.key === 'title' || col.key === 'subject' || col.key === 'name') return 'Contoh Data Kedua';
  if (col.key === 'first_name') return 'Sari';
  if (col.key === 'last_name') return 'Dewi';
  if (col.key === 'address' || col.key === 'customer_address') return 'Jl. Gatot Subroto No. 10';
  if (col.key === 'city') return 'Surabaya';
  return '';
}

// ════════════════════════════════════════════════════════════════
// ██  EXPORT DATA — generate professional Excel export directly
// ════════════════════════════════════════════════════════════════
async function exportData(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { entity, format: fmt } = req.query;
  const ent = ENTITIES[String(entity)];
  if (!ent) return res.status(400).json({ success: false, error: 'Invalid entity' });

  const query = ent.exportQuery || `SELECT * FROM ${ent.table} WHERE tenant_id = :tid ORDER BY created_at DESC`;
  const rows = await q(query, { tid: tenantId });

  // Map DB columns to friendly headers
  const allHeaders = ['No', ...ent.columns.map(c => c.label), 'Dibuat'];

  const exportRows = rows.map((row, idx) => {
    const mapped: Record<string, any> = {};
    mapped['No'] = idx + 1;
    ent.columns.forEach(col => {
      const k = col.dbColumn || col.key;
      let val = row[k];
      if (val === null || val === undefined) val = '';
      if (col.type === 'boolean') val = val ? 'Ya' : 'Tidak';
      if (col.type === 'date' && val) val = String(val).slice(0, 10);
      mapped[col.label] = val;
    });
    mapped['Dibuat'] = row.created_at ? String(row.created_at).slice(0, 19) : '';
    return mapped;
  });

  // If format=json, return JSON (for backward compat)
  if (fmt === 'json') {
    return res.json({ success: true, data: { entity: ent.id, label: ent.label, totalRows: rows.length, headers: allHeaders, rows: exportRows } });
  }

  // Generate Excel export
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Bedagang ERP';
  const ws = wb.addWorksheet(ent.label, {
    properties: { defaultColWidth: 16 },
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const BLUE = '1E40AF';
  const borderThin = { style: 'thin' as const, color: { argb: 'D1D5DB' } };
  const allBorders = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };

  // Header row
  const hRow = ws.getRow(1);
  allHeaders.forEach((h, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = allBorders;
  });
  hRow.height = 30;

  // Data rows
  exportRows.forEach((rowData, ri) => {
    const row = ws.getRow(ri + 2);
    allHeaders.forEach((h, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = rowData[h] ?? '';
      cell.border = allBorders;
      cell.alignment = { vertical: 'middle' };
      if (ri % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };
    });
    row.height = 22;
  });

  // Auto column widths
  ws.getColumn(1).width = 6; // No
  ent.columns.forEach((col, i) => {
    let w = Math.max(col.label.length + 2, 14);
    if (col.key.includes('address') || col.key === 'description' || col.key === 'notes') w = 28;
    ws.getColumn(i + 2).width = Math.min(w, 36);
  });
  ws.getColumn(allHeaders.length).width = 20; // Dibuat

  // Auto-filter
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: allHeaders.length } };

  const now = new Date().toISOString().slice(0, 10);
  const buffer = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=export_${ent.id}_${now}.xlsx`);
  return res.send(Buffer.from(buffer));
}

// ════════════════════════════════════════════════════════════════
// ██  VALIDATE IMPORT — parse & validate uploaded data
// ════════════════════════════════════════════════════════════════
async function validateImport(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { entity, rows: rawRows } = req.body;
  const ent = ENTITIES[String(entity)];
  if (!ent) return res.status(400).json({ success: false, error: 'Invalid entity' });
  if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
    return res.status(400).json({ success: false, error: 'No data rows provided' });
  }

  const results: Array<{ row: number; status: 'valid' | 'warning' | 'error'; data: Record<string, any>; errors: string[]; warnings: string[] }> = [];
  let validCount = 0;
  let errorCount = 0;
  let warningCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const errors: string[] = [];
    const warnings: string[] = [];
    const mapped: Record<string, any> = {};

    // Map from label-keyed or key-keyed data
    ent.columns.forEach(col => {
      let val = raw[col.label] ?? raw[col.key] ?? raw[col.label.toLowerCase()] ?? raw[col.key.toLowerCase()] ?? '';
      if (typeof val === 'string') val = val.trim();

      // Required check
      if (col.required && (!val && val !== 0 && val !== false)) {
        errors.push(`${col.label} wajib diisi`);
      }

      // Type validation
      if (val !== '' && val !== null && val !== undefined) {
        if (col.type === 'number') {
          const num = Number(val);
          if (isNaN(num)) errors.push(`${col.label} harus berupa angka`);
          else val = num;
        }
        if (col.type === 'date') {
          const d = new Date(val);
          if (isNaN(d.getTime())) errors.push(`${col.label} format tanggal tidak valid (gunakan YYYY-MM-DD)`);
          else val = d.toISOString().slice(0, 10);
        }
        if (col.type === 'boolean') {
          if (typeof val === 'string') {
            val = ['true', '1', 'ya', 'yes', 'y'].includes(val.toLowerCase());
          }
        }
        if (col.type === 'select' && col.options) {
          const strVal = String(val).toLowerCase();
          if (!col.options.map(o => o.toLowerCase()).includes(strVal)) {
            warnings.push(`${col.label}: "${val}" bukan pilihan valid (${col.options.join(', ')})`);
          }
        }
      }

      mapped[col.key] = val === '' ? null : val;
    });

    // Apply defaults
    if (ent.defaults) {
      Object.entries(ent.defaults).forEach(([k, v]) => {
        if (mapped[k] === null || mapped[k] === undefined || mapped[k] === '') mapped[k] = v;
      });
    }

    const status = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid';
    if (status === 'error') errorCount++;
    else if (status === 'warning') warningCount++;
    else validCount++;

    results.push({ row: i + 1, status, data: mapped, errors, warnings });
  }

  return res.json({
    success: true,
    data: {
      entity: ent.id,
      label: ent.label,
      totalRows: rawRows.length,
      validCount,
      errorCount,
      warningCount,
      results,
      canImport: errorCount === 0,
    }
  });
}

// ════════════════════════════════════════════════════════════════
// ██  IMPORT DATA — bulk insert validated rows
// ════════════════════════════════════════════════════════════════
async function importData(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: number) {
  const { entity, rows: validatedRows } = req.body;
  const ent = ENTITIES[String(entity)];
  if (!ent) return res.status(400).json({ success: false, error: 'Invalid entity' });
  if (!validatedRows || !Array.isArray(validatedRows) || validatedRows.length === 0) {
    return res.status(400).json({ success: false, error: 'No rows to import' });
  }

  let inserted = 0;
  let failed = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < validatedRows.length; i++) {
    const rowData = validatedRows[i];
    try {
      // Build columns/values
      const cols: string[] = ['tenant_id'];
      const vals: string[] = [':tenant_id'];
      const params: Record<string, any> = { tenant_id: tenantId };

      // Auto-generate number
      if (ent.autoGenNumber) {
        const num = generateNumber(ent.autoGenNumber.prefix);
        cols.push(ent.autoGenNumber.column);
        vals.push(`:_auto_num`);
        params._auto_num = num;
      }

      // Add created_by if table supports it
      cols.push('created_by');
      vals.push(':_created_by');
      params._created_by = userId;

      // Map data columns
      ent.columns.forEach(col => {
        const k = col.key;
        let v = rowData[k];
        if (v === null || v === undefined || v === '') return;
        cols.push(k);
        vals.push(`:${k}`);
        params[k] = v;
      });

      const sql = `INSERT INTO ${ent.table} (${cols.join(', ')}) VALUES (${vals.join(', ')})`;
      const ok = await qExec(sql, params);
      if (ok) inserted++;
      else { failed++; errors.push({ row: i + 1, error: 'Insert gagal' }); }
    } catch (e: any) {
      failed++;
      errors.push({ row: i + 1, error: e.message || 'Unknown error' });
    }
  }

  return res.json({
    success: true,
    data: {
      entity: ent.id,
      totalRows: validatedRows.length,
      inserted,
      failed,
      errors,
    }
  });
}

// ════════════════════════════════════════════════════════════════
// ██  EXPORT HISTORY (placeholder)
// ════════════════════════════════════════════════════════════════
async function getExportHistory(_req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  return res.json({ success: true, data: [] });
}
