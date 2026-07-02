import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

async function q(sql: string, replacements?: any): Promise<any[]> {
  if (!sequelize) return [];
  try {
    const [rows] = await sequelize.query(sql, replacements ? { replacements } : undefined);
    return rows || [];
  } catch (e: any) { console.error('Lookup Q:', e.message); return []; }
}
async function qExec(sql: string, replacements?: any): Promise<boolean> {
  if (!sequelize) return false;
  try { await sequelize.query(sql, replacements ? { replacements } : undefined); return true; }
  catch (e: any) { console.error('Lookup Exec:', e.message); return false; }
}

// ════════════════════════════════════════════════════════════
// Default system lookup data — seeded on first load per tenant
// ════════════════════════════════════════════════════════════
const SYSTEM_DEFAULTS: Record<string, { label: string; description: string; options: { value: string; label: string; color?: string; is_default?: boolean }[] }> = {
  lead_source: {
    label: 'Sumber Lead',
    description: 'Sumber asal lead masuk',
    options: [
      { value: 'manual', label: 'Manual', is_default: true },
      { value: 'website', label: 'Website' },
      { value: 'referral', label: 'Referral' },
      { value: 'cold_call', label: 'Cold Call' },
      { value: 'social_media', label: 'Social Media' },
      { value: 'exhibition', label: 'Pameran/Exhibition' },
      { value: 'partner', label: 'Partner' },
    ],
  },
  lead_priority: {
    label: 'Prioritas Lead',
    description: 'Level prioritas lead',
    options: [
      { value: 'high', label: 'High', color: 'red' },
      { value: 'medium', label: 'Medium', color: 'yellow', is_default: true },
      { value: 'low', label: 'Low', color: 'gray' },
    ],
  },
  visit_type: {
    label: 'Tipe Kunjungan',
    description: 'Jenis kunjungan field force',
    options: [
      { value: 'regular', label: 'Reguler', is_default: true },
      { value: 'follow_up', label: 'Follow Up' },
      { value: 'demo', label: 'Demo' },
      { value: 'closing', label: 'Closing' },
      { value: 'survey', label: 'Survey' },
      { value: 'collection', label: 'Penagihan' },
    ],
  },
  payment_method: {
    label: 'Metode Pembayaran',
    description: 'Metode pembayaran order',
    options: [
      { value: 'credit', label: 'Kredit', is_default: true },
      { value: 'cash', label: 'Tunai' },
      { value: 'transfer', label: 'Transfer Bank' },
      { value: 'giro', label: 'Giro' },
      { value: 'cod', label: 'COD' },
    ],
  },
  competitor_activity_type: {
    label: 'Tipe Aktivitas Kompetitor',
    description: 'Jenis aktivitas kompetitor di lapangan',
    options: [
      { value: 'promotion', label: 'Promosi', is_default: true },
      { value: 'new_product', label: 'Produk Baru' },
      { value: 'price_change', label: 'Perubahan Harga' },
      { value: 'display', label: 'Display/Branding' },
      { value: 'event', label: 'Event' },
      { value: 'sampling', label: 'Sampling' },
    ],
  },
  impact_level: {
    label: 'Level Dampak',
    description: 'Level dampak aktivitas',
    options: [
      { value: 'low', label: 'Low', color: 'gray' },
      { value: 'medium', label: 'Medium', color: 'yellow', is_default: true },
      { value: 'high', label: 'High', color: 'red' },
      { value: 'critical', label: 'Critical', color: 'red' },
    ],
  },
  commission_type: {
    label: 'Tipe Komisi',
    description: 'Metode perhitungan komisi',
    options: [
      { value: 'percentage', label: 'Persentase', is_default: true },
      { value: 'flat', label: 'Flat / Nominal' },
      { value: 'tiered', label: 'Tiered / Bertingkat' },
    ],
  },
  customer_type: {
    label: 'Tipe Customer',
    description: 'Jenis entitas customer',
    options: [
      { value: 'company', label: 'Perusahaan', is_default: true },
      { value: 'individual', label: 'Individu' },
      { value: 'government', label: 'Pemerintah' },
      { value: 'ngo', label: 'NGO / Yayasan' },
    ],
  },
  lifecycle_stage: {
    label: 'Lifecycle Stage',
    description: 'Tahap siklus hidup customer',
    options: [
      { value: 'prospect', label: 'Prospect', color: 'gray', is_default: true },
      { value: 'lead', label: 'Lead', color: 'blue' },
      { value: 'opportunity', label: 'Opportunity', color: 'purple' },
      { value: 'customer', label: 'Customer', color: 'green' },
      { value: 'evangelist', label: 'Evangelist', color: 'yellow' },
      { value: 'churned', label: 'Churned', color: 'red' },
    ],
  },
  customer_segment: {
    label: 'Segmen Customer',
    description: 'Klasifikasi segmen customer',
    options: [
      { value: 'platinum', label: 'Platinum', color: 'purple' },
      { value: 'gold', label: 'Gold', color: 'yellow' },
      { value: 'silver', label: 'Silver', color: 'gray' },
      { value: 'bronze', label: 'Bronze', color: 'orange' },
    ],
  },
  acquisition_source: {
    label: 'Sumber Akuisisi',
    description: 'Sumber asal customer diperoleh',
    options: [
      { value: 'website', label: 'Website' },
      { value: 'referral', label: 'Referral', is_default: true },
      { value: 'cold_call', label: 'Cold Call' },
      { value: 'event', label: 'Event/Pameran' },
      { value: 'social_media', label: 'Social Media' },
      { value: 'partner', label: 'Partner' },
      { value: 'advertising', label: 'Advertising' },
      { value: 'walk_in', label: 'Walk-in' },
    ],
  },
  industry: {
    label: 'Industri',
    description: 'Sektor industri customer',
    options: [
      { value: 'retail', label: 'Retail' },
      { value: 'manufacturing', label: 'Manufaktur' },
      { value: 'technology', label: 'Teknologi' },
      { value: 'fnb', label: 'F&B' },
      { value: 'healthcare', label: 'Kesehatan' },
      { value: 'education', label: 'Pendidikan' },
      { value: 'construction', label: 'Konstruksi' },
      { value: 'finance', label: 'Keuangan' },
      { value: 'logistics', label: 'Logistik' },
      { value: 'agriculture', label: 'Pertanian' },
      { value: 'other', label: 'Lainnya', is_default: true },
    ],
  },
  comm_type: {
    label: 'Tipe Komunikasi',
    description: 'Channel komunikasi dengan customer',
    options: [
      { value: 'call', label: 'Telepon', is_default: true },
      { value: 'email', label: 'Email' },
      { value: 'meeting', label: 'Meeting' },
      { value: 'whatsapp', label: 'WhatsApp' },
      { value: 'sms', label: 'SMS' },
      { value: 'video_call', label: 'Video Call' },
      { value: 'visit', label: 'Kunjungan' },
    ],
  },
  comm_direction: {
    label: 'Arah Komunikasi',
    description: 'Arah komunikasi masuk/keluar',
    options: [
      { value: 'outbound', label: 'Outbound', is_default: true },
      { value: 'inbound', label: 'Inbound' },
    ],
  },
  comm_status: {
    label: 'Status Komunikasi',
    description: 'Status pelaksanaan komunikasi',
    options: [
      { value: 'completed', label: 'Selesai', color: 'green', is_default: true },
      { value: 'scheduled', label: 'Dijadwalkan', color: 'blue' },
      { value: 'missed', label: 'Terlewat', color: 'red' },
      { value: 'cancelled', label: 'Dibatalkan', color: 'gray' },
    ],
  },
  comm_outcome: {
    label: 'Outcome Komunikasi',
    description: 'Hasil dari komunikasi',
    options: [
      { value: 'positive', label: 'Positif', color: 'green' },
      { value: 'neutral', label: 'Netral', color: 'gray' },
      { value: 'negative', label: 'Negatif', color: 'red' },
      { value: 'no_answer', label: 'Tidak Dijawab', color: 'yellow' },
      { value: 'callback', label: 'Minta Callback', color: 'blue' },
    ],
  },
  task_type: {
    label: 'Tipe Task',
    description: 'Jenis tugas CRM',
    options: [
      { value: 'call', label: 'Call' },
      { value: 'email', label: 'Email' },
      { value: 'meeting', label: 'Meeting' },
      { value: 'follow_up', label: 'Follow Up', is_default: true },
      { value: 'review', label: 'Review' },
      { value: 'approval', label: 'Approval' },
      { value: 'document', label: 'Dokumen' },
      { value: 'custom', label: 'Custom' },
    ],
  },
  task_priority: {
    label: 'Prioritas Task',
    description: 'Level prioritas tugas',
    options: [
      { value: 'urgent', label: 'Urgent', color: 'red' },
      { value: 'high', label: 'High', color: 'orange' },
      { value: 'medium', label: 'Medium', color: 'yellow', is_default: true },
      { value: 'low', label: 'Low', color: 'gray' },
    ],
  },
  forecast_period: {
    label: 'Periode Forecast',
    description: 'Rentang waktu forecast',
    options: [
      { value: 'weekly', label: 'Mingguan' },
      { value: 'monthly', label: 'Bulanan', is_default: true },
      { value: 'quarterly', label: 'Kuartalan' },
      { value: 'yearly', label: 'Tahunan' },
    ],
  },
  forecast_status: {
    label: 'Status Forecast',
    description: 'Status persetujuan forecast',
    options: [
      { value: 'draft', label: 'Draft', color: 'gray', is_default: true },
      { value: 'submitted', label: 'Submitted', color: 'blue' },
      { value: 'approved', label: 'Approved', color: 'green' },
      { value: 'rejected', label: 'Rejected', color: 'red' },
    ],
  },
  ticket_category: {
    label: 'Kategori Tiket',
    description: 'Klasifikasi tiket support',
    options: [
      { value: 'billing', label: 'Billing' },
      { value: 'technical', label: 'Teknis' },
      { value: 'product', label: 'Produk' },
      { value: 'complaint', label: 'Komplain' },
      { value: 'request', label: 'Permintaan', is_default: true },
      { value: 'feedback', label: 'Feedback' },
      { value: 'return', label: 'Retur' },
      { value: 'warranty', label: 'Garansi' },
    ],
  },
  ticket_priority: {
    label: 'Prioritas Tiket',
    description: 'Level urgensi tiket',
    options: [
      { value: 'critical', label: 'Critical', color: 'red' },
      { value: 'high', label: 'High', color: 'orange' },
      { value: 'medium', label: 'Medium', color: 'yellow', is_default: true },
      { value: 'low', label: 'Low', color: 'gray' },
    ],
  },
  ticket_severity: {
    label: 'Severity Tiket',
    description: 'Tingkat keparahan masalah',
    options: [
      { value: 'critical', label: 'Critical', color: 'red' },
      { value: 'major', label: 'Major', color: 'orange' },
      { value: 'minor', label: 'Minor', color: 'yellow', is_default: true },
      { value: 'cosmetic', label: 'Cosmetic', color: 'gray' },
    ],
  },
  ticket_channel: {
    label: 'Channel Tiket',
    description: 'Sumber masuknya tiket',
    options: [
      { value: 'email', label: 'Email', is_default: true },
      { value: 'phone', label: 'Telepon' },
      { value: 'chat', label: 'Live Chat' },
      { value: 'whatsapp', label: 'WhatsApp' },
      { value: 'social', label: 'Social Media' },
      { value: 'portal', label: 'Customer Portal' },
    ],
  },
  automation_rule_type: {
    label: 'Tipe Rule Automation',
    description: 'Jenis trigger otomasi',
    options: [
      { value: 'trigger', label: 'Event Trigger', is_default: true },
      { value: 'scheduled', label: 'Terjadwal' },
      { value: 'manual', label: 'Manual' },
    ],
  },
  trigger_entity: {
    label: 'Trigger Entity',
    description: 'Entitas yang men-trigger otomasi',
    options: [
      { value: 'lead', label: 'Lead', is_default: true },
      { value: 'opportunity', label: 'Opportunity' },
      { value: 'customer', label: 'Customer' },
      { value: 'ticket', label: 'Ticket' },
      { value: 'task', label: 'Task' },
      { value: 'visit', label: 'Visit' },
    ],
  },
  trigger_event: {
    label: 'Trigger Event',
    description: 'Event yang men-trigger otomasi',
    options: [
      { value: 'lead_created', label: 'Lead Dibuat', is_default: true },
      { value: 'deal_stage_changed', label: 'Deal Stage Berubah' },
      { value: 'ticket_created', label: 'Tiket Dibuat' },
      { value: 'task_overdue', label: 'Task Overdue' },
      { value: 'customer_inactive', label: 'Customer Tidak Aktif' },
      { value: 'health_score_drop', label: 'Health Score Turun' },
      { value: 'visit_completed', label: 'Kunjungan Selesai' },
      { value: 'order_placed', label: 'Order Dibuat' },
    ],
  },
  team_type: {
    label: 'Tipe Tim',
    description: 'Jenis tim sales/field force',
    options: [
      { value: 'field_force', label: 'Field Force', is_default: true },
      { value: 'inside_sales', label: 'Inside Sales' },
      { value: 'key_account', label: 'Key Account' },
      { value: 'telemarketing', label: 'Telemarketing' },
      { value: 'pre_sales', label: 'Pre-Sales' },
    ],
  },
  member_role: {
    label: 'Role Anggota Tim',
    description: 'Peran dalam tim',
    options: [
      { value: 'member', label: 'Member', is_default: true },
      { value: 'leader', label: 'Leader' },
      { value: 'supervisor', label: 'Supervisor' },
      { value: 'coordinator', label: 'Koordinator' },
    ],
  },
  pipeline_stage: {
    label: 'Stage Pipeline',
    description: 'Tahapan pipeline penjualan',
    options: [
      { value: 'prospecting', label: 'Prospecting', color: 'gray', is_default: true },
      { value: 'qualification', label: 'Qualification', color: 'blue' },
      { value: 'proposal', label: 'Proposal', color: 'purple' },
      { value: 'negotiation', label: 'Negotiation', color: 'yellow' },
      { value: 'closed_won', label: 'Closed Won', color: 'green' },
      { value: 'closed_lost', label: 'Closed Lost', color: 'red' },
    ],
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId;
    const userId = (session.user as any).id;
    const isManager = ['super_admin', 'owner', 'admin', 'manager'].includes((session.user as any).role || 'staff');
    const { action } = req.query;

    // ═══════════════════════════════════════
    // GET
    // ═══════════════════════════════════════
    if (req.method === 'GET') {
      switch (action) {

        // Get all categories with their options
        case 'all': {
          const rows = await q(`
            SELECT * FROM lookup_options
            WHERE tenant_id = :tid AND is_active = true
            ORDER BY category, sort_order, label
          `, { tid: tenantId });

          // Group by category
          const grouped: Record<string, any[]> = {};
          for (const r of rows) {
            if (!grouped[r.category]) grouped[r.category] = [];
            grouped[r.category].push(r);
          }

          // Merge with system defaults for categories that have no data yet
          const categories: Record<string, { label: string; description: string; options: any[] }> = {};
          for (const [cat, meta] of Object.entries(SYSTEM_DEFAULTS)) {
            categories[cat] = {
              label: meta.label,
              description: meta.description,
              options: grouped[cat] || [],
            };
          }
          // Add any custom categories from DB that aren't in defaults
          for (const cat of Object.keys(grouped)) {
            if (!categories[cat]) {
              categories[cat] = { label: cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), description: '', options: grouped[cat] };
            }
          }

          return res.json({ success: true, data: categories });
        }

        // Get options for specific category
        case 'options': {
          const { category } = req.query;
          if (!category) return res.status(400).json({ success: false, error: 'category required' });

          const rows = await q(`
            SELECT * FROM lookup_options
            WHERE tenant_id = :tid AND category = :cat AND is_active = true
            ORDER BY sort_order, label
          `, { tid: tenantId, cat: category });

          return res.json({ success: true, data: rows });
        }

        // Get system defaults catalog (for reference)
        case 'defaults': {
          return res.json({ success: true, data: SYSTEM_DEFAULTS });
        }

        // Get summary stats
        case 'summary': {
          const rows = await q(`
            SELECT category, COUNT(*) as count,
              COUNT(*) FILTER (WHERE is_system = true) as system_count,
              COUNT(*) FILTER (WHERE is_system = false) as custom_count
            FROM lookup_options
            WHERE tenant_id = :tid AND is_active = true
            GROUP BY category ORDER BY category
          `, { tid: tenantId });

          return res.json({
            success: true,
            data: rows,
            totalCategories: Object.keys(SYSTEM_DEFAULTS).length,
            seededCategories: rows.length,
          });
        }

        default:
          return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    // ═══════════════════════════════════════
    // POST
    // ═══════════════════════════════════════
    if (req.method === 'POST') {
      if (!isManager) return res.status(403).json({ success: false, error: 'Manager only' });

      switch (action) {

        // Seed all system defaults for this tenant
        case 'seed-defaults': {
          let created = 0;
          for (const [cat, meta] of Object.entries(SYSTEM_DEFAULTS)) {
            for (let i = 0; i < meta.options.length; i++) {
              const opt = meta.options[i];
              const exists = await q(`SELECT id FROM lookup_options WHERE tenant_id = :tid AND category = :cat AND value = :val`, { tid: tenantId, cat, val: opt.value });
              if (exists.length === 0) {
                await qExec(`
                  INSERT INTO lookup_options (id, tenant_id, category, value, label, color, is_default, is_system, sort_order, created_by)
                  VALUES (gen_random_uuid(), :tid, :cat, :val, :lbl, :color, :def, true, :sort, :uid)
                `, {
                  tid: tenantId, cat, val: opt.value, lbl: opt.label,
                  color: opt.color || null, def: opt.is_default || false,
                  sort: i * 10, uid: userId,
                });
                created++;
              }
            }
          }
          return res.json({ success: true, message: `${created} opsi default di-seed`, data: { created } });
        }

        // Add single option
        case 'add-option': {
          const { category, value, label, color, icon, description, is_default, sort_order } = req.body;
          if (!category || !value || !label) return res.status(400).json({ success: false, error: 'category, value, label required' });

          // Check unique
          const exists = await q(`SELECT id FROM lookup_options WHERE tenant_id = :tid AND category = :cat AND value = :val`, { tid: tenantId, cat: category, val: value });
          if (exists.length > 0) return res.status(409).json({ success: false, error: 'Value sudah ada di kategori ini' });

          if (is_default) {
            await qExec(`UPDATE lookup_options SET is_default = false WHERE tenant_id = :tid AND category = :cat`, { tid: tenantId, cat: category });
          }

          await qExec(`
            INSERT INTO lookup_options (id, tenant_id, category, value, label, color, icon, description, is_default, is_system, sort_order, created_by)
            VALUES (gen_random_uuid(), :tid, :cat, :val, :lbl, :color, :icon, :desc, :def, false, :sort, :uid)
          `, {
            tid: tenantId, cat: category, val: value, lbl: label,
            color: color || null, icon: icon || null, desc: description || null,
            def: is_default || false, sort: sort_order ?? 999, uid: userId,
          });

          return res.json({ success: true, message: 'Opsi ditambahkan' });
        }

        // Update option
        case 'update-option': {
          const { id, label: lbl2, color: col2, icon: ico2, description: desc2, is_default: def2, sort_order: sort2, is_active: act2 } = req.body;
          if (!id) return res.status(400).json({ success: false, error: 'id required' });

          if (def2) {
            // get category first
            const [opt] = await q(`SELECT category FROM lookup_options WHERE id = :id AND tenant_id = :tid`, { id, tid: tenantId });
            if (opt) {
              await qExec(`UPDATE lookup_options SET is_default = false WHERE tenant_id = :tid AND category = :cat`, { tid: tenantId, cat: opt.category });
            }
          }

          const sets: string[] = ['updated_at = NOW()'];
          const params: any = { id, tid: tenantId };
          if (lbl2 !== undefined) { sets.push('label = :lbl'); params.lbl = lbl2; }
          if (col2 !== undefined) { sets.push('color = :col'); params.col = col2; }
          if (ico2 !== undefined) { sets.push('icon = :ico'); params.ico = ico2; }
          if (desc2 !== undefined) { sets.push('description = :desc'); params.desc = desc2; }
          if (def2 !== undefined) { sets.push('is_default = :def'); params.def = def2; }
          if (sort2 !== undefined) { sets.push('sort_order = :sort'); params.sort = sort2; }
          if (act2 !== undefined) { sets.push('is_active = :act'); params.act = act2; }

          await qExec(`UPDATE lookup_options SET ${sets.join(', ')} WHERE id = :id AND tenant_id = :tid`, params);
          return res.json({ success: true, message: 'Opsi diperbarui' });
        }

        // Delete option (soft: deactivate if system, hard delete if custom)
        case 'delete-option': {
          const { id: delId } = req.body;
          if (!delId) return res.status(400).json({ success: false, error: 'id required' });

          const [opt] = await q(`SELECT is_system FROM lookup_options WHERE id = :id AND tenant_id = :tid`, { id: delId, tid: tenantId });
          if (!opt) return res.status(404).json({ success: false, error: 'Option not found' });

          if (opt.is_system) {
            await qExec(`UPDATE lookup_options SET is_active = false, updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { id: delId, tid: tenantId });
          } else {
            await qExec(`DELETE FROM lookup_options WHERE id = :id AND tenant_id = :tid`, { id: delId, tid: tenantId });
          }

          return res.json({ success: true, message: 'Opsi dihapus' });
        }

        // Reorder options within a category
        case 'reorder': {
          const { category: rCat, order } = req.body; // order = [{ id, sort_order }]
          if (!rCat || !order) return res.status(400).json({ success: false, error: 'category & order required' });

          for (const item of order) {
            await qExec(`UPDATE lookup_options SET sort_order = :sort, updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { sort: item.sort_order, id: item.id, tid: tenantId });
          }
          return res.json({ success: true, message: 'Urutan diperbarui' });
        }

        // Seed a single category
        case 'seed-category': {
          const { category: sCat } = req.body;
          if (!sCat || !SYSTEM_DEFAULTS[sCat]) return res.status(400).json({ success: false, error: 'Invalid category' });

          let created = 0;
          const meta = SYSTEM_DEFAULTS[sCat];
          for (let i = 0; i < meta.options.length; i++) {
            const opt = meta.options[i];
            const exists = await q(`SELECT id FROM lookup_options WHERE tenant_id = :tid AND category = :cat AND value = :val`, { tid: tenantId, cat: sCat, val: opt.value });
            if (exists.length === 0) {
              await qExec(`
                INSERT INTO lookup_options (id, tenant_id, category, value, label, color, is_default, is_system, sort_order, created_by)
                VALUES (gen_random_uuid(), :tid, :cat, :val, :lbl, :color, :def, true, :sort, :uid)
              `, {
                tid: tenantId, cat: sCat, val: opt.value, lbl: opt.label,
                color: opt.color || null, def: opt.is_default || false,
                sort: i * 10, uid: userId,
              });
              created++;
            }
          }
          return res.json({ success: true, message: `${created} opsi di-seed untuk ${sCat}`, data: { created } });
        }

        default:
          return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error('Lookup Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
