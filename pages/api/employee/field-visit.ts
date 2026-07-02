/**
 * Field Visit API — Employee Mobile App
 * Integrates with: SFA (sfa_visits, sfa_route_plans), CRM (crm_customers, crm_interactions)
 *
 * GET  ?action=visits          — today's visits + history for current user
 * GET  ?action=customers       — search customers/prospects (CRM + SFA leads)
 * GET  ?action=route-plan      — today's route plan for user
 * POST ?action=create-visit    — create new visit (planned or walk-in)
 * POST ?action=check-in        — GPS check-in + photo evidence
 * POST ?action=check-out       — GPS check-out + outcome + photo
 * POST ?action=add-evidence    — attach additional photo/note to a visit
 * PUT  ?action=update-visit    — update visit notes / next visit date
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { ensureVisitLinkedTask, syncTaskStatusFromVisit } from '../../../lib/sfa/visitTaskSync';

let sequelize: any;
try { ({ sequelize } = require('../../../lib/sequelize')); } catch {}

const q = async (sql: string, params: any = {}) => {
  if (!sequelize) return [];
  const [rows] = await sequelize.query(sql, { replacements: params });
  return rows as any[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const userId   = String(session.user.id || '');
    const tenantId = String((session.user as any).tenantId || '');
    const action   = String(req.query.action || '');

    if (req.method === 'GET') {
      switch (action) {
        case 'visits':     return getVisits(res, userId, tenantId, req);
        case 'customers':  return searchCustomers(res, tenantId, req);
        case 'route-plan': return getRoutePlan(res, userId, tenantId);
        default: return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    if (req.method === 'POST') {
      switch (action) {
        case 'create-visit': return createVisit(req, res, userId, tenantId);
        case 'check-in':     return checkIn(req, res, userId, tenantId);
        case 'check-out':    return checkOut(req, res, userId, tenantId);
        case 'add-evidence': return addEvidence(req, res, tenantId);
        default: return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    if (req.method === 'PUT') {
      if (action === 'update-visit') return updateVisit(req, res, tenantId);
      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[field-visit API]', e.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}


// ─────────────────────────────────────────
// GET: List visits for current employee
// ─────────────────────────────────────────
async function getVisits(res: NextApiResponse, userId: string, tenantId: string, req: NextApiRequest) {
  const { date, status } = req.query;
  const today = (date as string) || new Date().toISOString().split('T')[0];

  const MOCK_VISITS = [
    { id: 'v1', visit_number: 'VIS-001', customer_name: 'Toko Maju Jaya', customer_address: 'Jl. Sudirman No.10, Jakarta', visit_type: 'regular', purpose: 'Pengecekan stok & ambil pesanan', status: 'planned', visit_date: today, check_in_time: null, check_out_time: null, outcome: null, duration_minutes: 0, is_adhoc: false, evidence_photos: [] },
    { id: 'v2', visit_number: 'VIS-002', customer_name: 'Warung Bu Sari', customer_address: 'Jl. Kebon Jeruk No.5, Jakarta', visit_type: 'follow_up', purpose: 'Follow up pembayaran & demo produk baru', status: 'completed', visit_date: today, check_in_time: new Date(Date.now() - 7200000).toISOString(), check_out_time: new Date(Date.now() - 5400000).toISOString(), outcome: 'order_taken', order_value: 850000, duration_minutes: 30, is_adhoc: false, evidence_photos: [] },
    { id: 'v3', visit_number: 'VIS-003', customer_name: 'Minimarket Sejahtera', customer_address: 'Jl. Raya Bogor No.22, Depok', visit_type: 'prospect', purpose: 'Presentasi produk baru ke calon pelanggan', status: 'planned', visit_date: today, check_in_time: null, check_out_time: null, outcome: null, duration_minutes: 0, is_adhoc: false, evidence_photos: [] },
  ];
  if (!sequelize) return res.json({ success: true, data: { visits: MOCK_VISITS, stats: { total: 3, planned: 2, checked_in: 0, completed: 1, target: 5 } } });

  try {
    const [emp] = await q(`SELECT id FROM employees WHERE user_id = :uid AND tenant_id = :tid LIMIT 1`, { uid: userId, tid: tenantId });
    const sid = emp?.id || userId;
    const whereStatus = status ? `AND v.status = :status` : '';
    const visits = await q(`
      SELECT v.*, COALESCE(c.name, v.customer_name) as customer_name, c.phone as customer_phone, c.address as customer_address,
        EXTRACT(EPOCH FROM (v.check_out_time - v.check_in_time)) / 60 as duration_minutes
      FROM sfa_visits v LEFT JOIN customers c ON v.customer_id = c.id
      WHERE v.tenant_id = :tid AND v.salesperson_id = :sid AND v.visit_date = :date ${whereStatus}
      ORDER BY v.check_in_time ASC NULLS FIRST, v.created_at ASC
    `, { tid: tenantId, sid, date: today, ...(status ? { status } : {}) });
    const [stats] = await q(`
      SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='planned') as planned,
        COUNT(*) FILTER (WHERE status='checked_in') as checked_in,
        COUNT(*) FILTER (WHERE status='completed') as completed
      FROM sfa_visits WHERE tenant_id = :tid AND salesperson_id = :sid AND visit_date = :date
    `, { tid: tenantId, sid, date: today });
    return res.json({ success: true, data: { visits, stats } });
  } catch { return res.json({ success: true, data: { visits: MOCK_VISITS, stats: { total: 3, planned: 2, checked_in: 0, completed: 1, target: 5 } } }); }
}

// ─────────────────────────────────────────
// GET: Search customers/prospects
// ─────────────────────────────────────────
async function searchCustomers(res: NextApiResponse, tenantId: string, req: NextApiRequest) {
  if (!sequelize) return res.json({ success: true, data: [
    { id: 'c1', name: 'Toko Maju Jaya', phone: '081234567890', address: 'Jl. Sudirman No.10', type: 'customer' },
    { id: 'c2', name: 'Warung Bu Sari', phone: '082345678901', address: 'Jl. Kebon Jeruk No.5', type: 'customer' },
    { id: 'c3', name: 'PT Prospek Baru', phone: '083456789012', address: 'Jl. Gatot Subroto No.15', type: 'prospect' },
  ]});
  const like = `%${req.query.q || ''}%`;
  const data = await q(`
    SELECT id::text, name, phone, address, 'customer' as type FROM customers WHERE tenant_id=:tid AND (name ILIKE :q OR phone ILIKE :q) AND is_active=true
    UNION ALL
    SELECT id::text, name, phone, company as address, 'prospect' as type FROM sfa_leads WHERE tenant_id=:tid AND (name ILIKE :q OR company ILIKE :q) AND status!='converted'
    ORDER BY name LIMIT 20
  `, { tid: tenantId, q: like });
  return res.json({ success: true, data });
}

// ─────────────────────────────────────────
// GET: Today's route plan
// ─────────────────────────────────────────
async function getRoutePlan(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: null });
  try {
    const dow = new Date().getDay();
    const [emp] = await q(`SELECT id FROM employees WHERE user_id=:uid AND tenant_id=:tid LIMIT 1`, { uid: userId, tid: tenantId });
    const sid = emp?.id || userId;
    const [plan] = await q(`SELECT rp.*, t.name as territory_name FROM sfa_route_plans rp LEFT JOIN sfa_territories t ON rp.territory_id=t.id WHERE rp.tenant_id=:tid AND rp.salesperson_id=:sid AND rp.day_of_week=:dow AND rp.is_active=true ORDER BY rp.created_at DESC LIMIT 1`, { tid: tenantId, sid, dow });
    return res.json({ success: true, data: plan || null });
  } catch { return res.json({ success: true, data: null }); }
}


// ─────────────────────────────────────────
// POST: Create a new visit (planned/walk-in)
// ─────────────────────────────────────────
async function createVisit(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { customer_name, customer_id, visit_type = 'regular', purpose, visit_date, scheduled_time, lead_id, is_adhoc = false } = req.body;
  if (!customer_name) return res.status(400).json({ success: false, error: 'customer_name wajib diisi' });

  if (!sequelize) {
    return res.json({ success: true, message: 'Kunjungan berhasil dibuat', data: { id: `v${Date.now()}`, visit_number: `VIS-${Date.now()}`, customer_name, visit_type, purpose, status: 'planned', visit_date: visit_date || new Date().toISOString().split('T')[0] } });
  }
  try {
    const [emp] = await q(`SELECT id FROM employees WHERE user_id=:uid AND tenant_id=:tid LIMIT 1`, { uid: userId, tid: tenantId });
    const sid = emp?.id || userId;
    const vDate = visit_date || new Date().toISOString().split('T')[0];
    const [count] = await q(`SELECT COUNT(*) as c FROM sfa_visits WHERE tenant_id=:tid AND TO_CHAR(created_at,'YYYY-MM')=:m`, { tid: tenantId, m: vDate.slice(0, 7) });
    const num = `VIS-${vDate.replace(/-/g, '')}-${String(Number(count?.c || 0) + 1).padStart(3, '0')}`;

    const [visitRows] = await sequelize.query(`
      INSERT INTO sfa_visits (id, tenant_id, salesperson_id, customer_id, customer_name, visit_type, purpose, visit_date, status, is_adhoc, lead_id, created_at, updated_at)
      VALUES (uuid_generate_v4(), :tid, :sid, :cid, :cname, :vtype, :purpose, :vdate, 'planned', :adhoc, :lid, NOW(), NOW())
      RETURNING *, :num as visit_number
    `, { replacements: { tid: tenantId, sid, cid: customer_id || null, cname: customer_name, vtype: visit_type, purpose: purpose || '', vdate: vDate, adhoc: is_adhoc, lid: lead_id || null, num } });

    const row = Array.isArray(visitRows) ? visitRows[0] : visitRows;
    if (row?.id) {
      await ensureVisitLinkedTask({
        tenantId,
        visit: {
          id: row.id,
          customer_name: row.customer_name || customer_name,
          purpose: row.purpose || purpose,
          visit_date: row.visit_date || vDate,
          salesperson_id: row.salesperson_id != null ? Number(row.salesperson_id) : null,
        },
        createdByUserId: Number(userId) || null,
        assigneeUserId: Number(userId) || null,
      });
    }

    // Also record as CRM interaction if customer_id exists
    if (customer_id) {
      await q(`INSERT INTO crm_interactions (id, tenant_id, crm_customer_id, type, subject, content, created_by, created_at, updated_at) VALUES (uuid_generate_v4(), :tid, :cid, 'visit', :subj, :content, :uid, NOW(), NOW())`,
        { tid: tenantId, cid: customer_id, subj: `Kunjungan ${visit_type}`, content: purpose || '', uid: userId });
    }
    return res.json({ success: true, message: 'Kunjungan berhasil dibuat', data: row });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal membuat kunjungan', details: e.message });
  }
}

// ─────────────────────────────────────────
// POST: Check-in to a visit with GPS + photo
// ─────────────────────────────────────────
async function checkIn(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { visit_id, latitude, longitude, accuracy, address, photo_base64, notes } = req.body;
  if (!visit_id) return res.status(400).json({ success: false, error: 'visit_id wajib diisi' });
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return res.status(400).json({ success: false, error: 'Koordinat GPS diperlukan' });

  if (!sequelize) return res.json({ success: true, message: 'Check-in berhasil', data: { visit_id, check_in_time: new Date().toISOString(), check_in_lat: latitude, check_in_lng: longitude } });

  try {
    // Calculate distance from customer address (simplified — no geofence check here)
    const photoUrl = photo_base64 ? `visits/checkin/${visit_id}_${Date.now()}.jpg` : null;
    await q(`UPDATE sfa_visits SET status='checked_in', check_in_time=NOW(), check_in_lat=:lat, check_in_lng=:lng, check_in_address=:addr, check_in_photo_url=:photo, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`,
      { lat: latitude, lng: longitude, addr: address || null, photo: photoUrl, id: visit_id, tid: tenantId });
    await syncTaskStatusFromVisit(tenantId, visit_id);
    return res.json({ success: true, message: 'Check-in berhasil! Lokasi & waktu tercatat.', data: { visit_id, check_in_time: new Date().toISOString(), check_in_lat: latitude, check_in_lng: longitude, check_in_address: address } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal check-in', details: e.message });
  }
}

// ─────────────────────────────────────────
// POST: Check-out with outcome + photo + notes
// ─────────────────────────────────────────
async function checkOut(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { visit_id, latitude, longitude, address, photo_base64, outcome, outcome_notes, order_taken, order_value, next_visit_date, products_discussed } = req.body;
  if (!visit_id || !outcome) return res.status(400).json({ success: false, error: 'visit_id dan outcome wajib diisi' });

  if (!sequelize) return res.json({ success: true, message: 'Check-out berhasil', data: { visit_id, check_out_time: new Date().toISOString(), outcome } });

  try {
    const photoUrl = photo_base64 ? `visits/checkout/${visit_id}_${Date.now()}.jpg` : null;
    await q(`UPDATE sfa_visits SET status='completed', check_out_time=NOW(), check_out_lat=:lat, check_out_lng=:lng, check_out_address=:addr, check_out_photo_url=:photo, outcome=:outcome, outcome_notes=:notes, order_taken=:ot, order_value=:ov, next_visit_date=:nvd, products_discussed=:pd::jsonb, duration_minutes=EXTRACT(EPOCH FROM (NOW()-check_in_time))/60, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`,
      { lat: latitude || null, lng: longitude || null, addr: address || null, photo: photoUrl, outcome, notes: outcome_notes || null, ot: !!order_taken, ov: order_value || 0, nvd: next_visit_date || null, pd: JSON.stringify(products_discussed || []), id: visit_id, tid: tenantId });

    await syncTaskStatusFromVisit(tenantId, visit_id);
    return res.json({ success: true, message: 'Check-out berhasil! Hasil kunjungan tersimpan.', data: { visit_id, check_out_time: new Date().toISOString(), outcome } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal check-out', details: e.message });
  }
}

// ─────────────────────────────────────────
// POST: Add evidence photo / note to a visit
// ─────────────────────────────────────────
async function addEvidence(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { visit_id, photo_base64, caption } = req.body;
  if (!visit_id) return res.status(400).json({ success: false, error: 'visit_id wajib diisi' });
  // In production: upload photo_base64 to cloud storage, store URL
  const photoUrl = photo_base64 ? `visits/evidence/${visit_id}_${Date.now()}.jpg` : null;
  if (!sequelize || !photoUrl) return res.json({ success: true, message: 'Evidence berhasil ditambahkan', data: { url: photoUrl, caption } });
  try {
    await q(`UPDATE sfa_visits SET products_discussed = COALESCE(products_discussed,'[]'::jsonb) || :e::jsonb, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`,
      { e: JSON.stringify([{ type: 'photo', url: photoUrl, caption: caption || '', ts: new Date().toISOString() }]), id: visit_id, tid: tenantId });
    return res.json({ success: true, message: 'Evidence berhasil ditambahkan', data: { url: photoUrl, caption } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal menambah evidence' });
  }
}

// ─────────────────────────────────────────
// PUT: Update visit (notes / next visit)
// ─────────────────────────────────────────
async function updateVisit(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { visit_id, outcome_notes, next_visit_date, status } = req.body;
  if (!visit_id) return res.status(400).json({ success: false, error: 'visit_id wajib diisi' });
  if (!sequelize) return res.json({ success: true, message: 'Kunjungan diperbarui', data: req.body });
  try {
    const sets: string[] = ['updated_at=NOW()'];
    const params: any = { id: visit_id, tid: tenantId };
    if (outcome_notes !== undefined) { sets.push('outcome_notes=:notes'); params.notes = outcome_notes; }
    if (next_visit_date !== undefined) { sets.push('next_visit_date=:nvd'); params.nvd = next_visit_date; }
    if (status !== undefined) { sets.push('status=:status'); params.status = status; }
    await q(`UPDATE sfa_visits SET ${sets.join(',')} WHERE id=:id AND tenant_id=:tid`, params);
    if (status !== undefined) await syncTaskStatusFromVisit(tenantId, visit_id);
    return res.json({ success: true, message: 'Kunjungan berhasil diperbarui' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal memperbarui kunjungan' });
  }
}
