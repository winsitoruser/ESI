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
import { loadActiveGeofences, matchGeofences, geofenceStatusLabel } from '../../../lib/hris/geofence-utils';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
};

async function ensureSfaVisitsTable() {
  if (!sequelize) return;
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS sfa_visits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        salesperson_id INTEGER,
        employee_id UUID,
        lead_id UUID,
        customer_id UUID,
        customer_name VARCHAR(200),
        visit_type VARCHAR(30) DEFAULT 'regular',
        purpose TEXT,
        visit_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'planned',
        is_adhoc BOOLEAN DEFAULT false,
        check_in_time TIMESTAMPTZ,
        check_in_lat DECIMAL(10,7),
        check_in_lng DECIMAL(10,7),
        check_in_address TEXT,
        check_in_photo_url TEXT,
        check_out_time TIMESTAMPTZ,
        check_out_lat DECIMAL(10,7),
        check_out_lng DECIMAL(10,7),
        check_out_address TEXT,
        check_out_photo_url TEXT,
        duration_minutes INTEGER DEFAULT 0,
        outcome VARCHAR(30),
        outcome_notes TEXT,
        order_taken BOOLEAN DEFAULT false,
        order_value DECIMAL(15,2) DEFAULT 0,
        next_visit_date DATE,
        products_discussed JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sfa_visits_tenant_date ON sfa_visits(tenant_id, visit_date)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sfa_visits_salesperson ON sfa_visits(salesperson_id, visit_date)`);
    await sequelize.query(`ALTER TABLE sfa_visits ADD COLUMN IF NOT EXISTS check_in_geofence_name VARCHAR(120)`);
    await sequelize.query(`ALTER TABLE sfa_visits ADD COLUMN IF NOT EXISTS check_in_geofence_status VARCHAR(30)`);
    await sequelize.query(`ALTER TABLE sfa_visits ADD COLUMN IF NOT EXISTS check_in_geofence_distance_m INTEGER`);
    await sequelize.query(`ALTER TABLE sfa_visits ADD COLUMN IF NOT EXISTS check_out_geofence_name VARCHAR(120)`);
    await sequelize.query(`ALTER TABLE sfa_visits ADD COLUMN IF NOT EXISTS check_out_geofence_status VARCHAR(30)`);
  } catch { /* table may partially exist */ }
}

async function resolveSalesperson(userId: string, tenantId: string) {
  const uid = parseInt(userId, 10) || 0;
  const [emp] = await q(`
    SELECT id FROM employees
    WHERE user_id = :uid
      AND (:tid = '' OR tenant_id IS NULL OR tenant_id = :tid::uuid)
    LIMIT 1
  `, { uid, tid: tenantId || '' });
  return { userId: uid, employeeId: emp?.id || null };
}

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
    console.warn('[field-visit API]', e.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}


// ─────────────────────────────────────────
// GET: List visits for current employee
// ─────────────────────────────────────────
async function getVisits(res: NextApiResponse, userId: string, tenantId: string, req: NextApiRequest) {
  const { date, status } = req.query;
  const today = (date as string) || new Date().toISOString().split('T')[0];

  if (!sequelize) {
    const MOCK_VISITS = [
      { id: 'v1', visit_number: 'VIS-001', customer_name: 'Toko Maju Jaya', customer_address: 'Jl. Sudirman No.10, Jakarta', visit_type: 'regular', purpose: 'Pengecekan stok & ambil pesanan', status: 'planned', visit_date: today, check_in_time: null, check_out_time: null, outcome: null, duration_minutes: 0, is_adhoc: false, evidence_photos: [] },
    ];
    return res.json({ success: true, data: { visits: MOCK_VISITS, stats: { total: 1, planned: 1, checked_in: 0, completed: 0, target: 5 } } });
  }

  await ensureSfaVisitsTable();
  try {
    const { userId: spId } = await resolveSalesperson(userId, tenantId);
    const whereStatus = status ? `AND v.status = :status` : '';
    const visits = await q(`
      SELECT v.*, v.customer_name,
        COALESCE(v.check_in_address, '') as customer_address,
        COALESCE(v.duration_minutes, 0) as duration_minutes,
        COALESCE(v.products_discussed, '[]'::jsonb) as evidence_photos,
        v.check_in_photo_url,
        v.check_out_photo_url,
        v.check_in_geofence_name,
        v.check_in_geofence_status,
        v.check_in_geofence_distance_m
      FROM sfa_visits v
      WHERE (v.tenant_id IS NULL OR v.tenant_id = :tid::uuid OR :tid = '')
        AND (v.salesperson_id = :sp OR v.employee_id IN (
          SELECT id FROM employees WHERE user_id = :sp
        ))
        AND v.visit_date = :date ${whereStatus}
      ORDER BY v.check_in_time ASC NULLS FIRST, v.created_at ASC
    `, { tid: tenantId || null, sp: spId, date: today, ...(status ? { status } : {}) });
    const [stats] = await q(`
      SELECT COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status='planned')::int as planned,
        COUNT(*) FILTER (WHERE status='checked_in')::int as checked_in,
        COUNT(*) FILTER (WHERE status='completed')::int as completed
      FROM sfa_visits
      WHERE (tenant_id IS NULL OR tenant_id = :tid::uuid OR :tid = '')
        AND (salesperson_id = :sp OR employee_id IN (SELECT id FROM employees WHERE user_id = :sp))
        AND visit_date = :date
    `, { tid: tenantId || null, sp: spId, date: today });
    return res.json({ success: true, data: { visits, stats: { ...stats, target: 5 } } });
  } catch (e: any) {
    console.warn('[field-visit getVisits]', e.message);
    return res.json({ success: true, data: { visits: [], stats: { total: 0, planned: 0, checked_in: 0, completed: 0, target: 5 } } });
  }
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
  const { customer_name, customer_id, visit_type = 'regular', purpose, visit_date, lead_id, is_adhoc = false } = req.body;
  if (!customer_name) return res.status(400).json({ success: false, error: 'customer_name wajib diisi' });

  if (!sequelize) {
    return res.json({ success: true, message: 'Kunjungan berhasil dibuat', data: { id: `v${Date.now()}`, visit_number: `VIS-${Date.now()}`, customer_name, visit_type, purpose, status: 'planned', visit_date: visit_date || new Date().toISOString().split('T')[0], customer_address: '', duration_minutes: 0, is_adhoc: true, evidence_photos: [] } });
  }

  await ensureSfaVisitsTable();
  try {
    const { userId: spId, employeeId } = await resolveSalesperson(userId, tenantId);
    const vDate = visit_date || new Date().toISOString().split('T')[0];
    const [count] = await q(`SELECT COUNT(*)::int as c FROM sfa_visits WHERE tenant_id = :tid AND TO_CHAR(created_at,'YYYY-MM') = :m`, { tid: tenantId || null, m: vDate.slice(0, 7) });
    const num = `VIS-${vDate.replace(/-/g, '')}-${String(Number(count?.c || 0) + 1).padStart(3, '0')}`;

    const [visitRows] = await sequelize.query(`
      INSERT INTO sfa_visits (
        tenant_id, salesperson_id, employee_id, customer_id, customer_name,
        visit_type, purpose, visit_date, status, is_adhoc, lead_id, created_at, updated_at
      ) VALUES (
        :tid, :sp, :eid, :cid, :cname, :vtype, :purpose, :vdate, 'planned', :adhoc, :lid, NOW(), NOW()
      ) RETURNING *
    `, { replacements: {
      tid: tenantId || null, sp: spId, eid: employeeId, cid: customer_id || null,
      cname: customer_name, vtype: visit_type, purpose: purpose || '', vdate: vDate,
      adhoc: !!is_adhoc, lid: lead_id || null,
    } });

    const row = Array.isArray(visitRows) ? visitRows[0] : visitRows;
    const data = row ? {
      ...row,
      visit_number: num,
      customer_address: row.check_in_address || '',
      duration_minutes: 0,
      evidence_photos: [],
    } : null;

    if (row?.id) {
      try {
        await ensureVisitLinkedTask({
          tenantId,
          visit: {
            id: row.id,
            customer_name: row.customer_name || customer_name,
            purpose: row.purpose || purpose,
            visit_date: row.visit_date || vDate,
            salesperson_id: spId,
          },
          createdByUserId: spId || null,
          assigneeUserId: spId || null,
        });
      } catch { /* task sync optional */ }
    }

    return res.json({ success: true, message: 'Kunjungan berhasil dibuat', data });
  } catch (e: any) {
    console.warn('[field-visit createVisit]', e.message);
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
    const [visitRows] = await sequelize.query(`SELECT customer_id FROM sfa_visits WHERE id = :id LIMIT 1`, { replacements: { id: visit_id } });
    const customerId = visitRows?.[0]?.customer_id || null;
    const fences = await loadActiveGeofences(sequelize, tenantId || null, customerId);
    const geofence = matchGeofences(latitude, longitude, fences);
    const photoUrl = photo_base64 && String(photo_base64).startsWith('data:')
      ? String(photo_base64).slice(0, 500000)
      : (photo_base64 ? `visits/checkin/${visit_id}_${Date.now()}.jpg` : null);

    await q(`UPDATE sfa_visits SET status='checked_in', check_in_time=NOW(), check_in_lat=:lat, check_in_lng=:lng, check_in_address=:addr, check_in_photo_url=:photo,
      check_in_geofence_name=:gfName, check_in_geofence_status=:gfStatus, check_in_geofence_distance_m=:gfDist, updated_at=NOW()
      WHERE id=:id AND (tenant_id IS NULL OR tenant_id = :tid::uuid OR :tid = '')`,
      {
        lat: latitude, lng: longitude, addr: address || null, photo: photoUrl, id: visit_id, tid: tenantId || null,
        gfName: geofence?.name || null,
        gfStatus: geofence ? (geofence.inside ? 'inside' : 'outside') : 'unknown',
        gfDist: geofence?.distanceM ?? null,
      });
    await syncTaskStatusFromVisit(tenantId, visit_id);
    return res.json({
      success: true,
      message: geofence ? `Check-in berhasil · ${geofenceStatusLabel(geofence)}` : 'Check-in berhasil! Lokasi & waktu tercatat.',
      data: {
        visit_id,
        check_in_time: new Date().toISOString(),
        check_in_lat: latitude,
        check_in_lng: longitude,
        check_in_address: address,
        geofence,
        photoSaved: !!photo_base64,
      },
    });
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
    const lat = latitude != null ? Number(latitude) : null;
    const lng = longitude != null ? Number(longitude) : null;
    let geofence = null;
    if (lat != null && lng != null) {
      const [visitRows] = await sequelize.query(`SELECT customer_id FROM sfa_visits WHERE id = :id LIMIT 1`, { replacements: { id: visit_id } });
      const fences = await loadActiveGeofences(sequelize, tenantId || null, visitRows?.[0]?.customer_id || null);
      geofence = matchGeofences(lat, lng, fences);
    }
    const photoUrl = photo_base64 && String(photo_base64).startsWith('data:')
      ? String(photo_base64).slice(0, 500000)
      : (photo_base64 ? `visits/checkout/${visit_id}_${Date.now()}.jpg` : null);
    await q(`UPDATE sfa_visits SET status='completed', check_out_time=NOW(), check_out_lat=:lat, check_out_lng=:lng, check_out_address=:addr, check_out_photo_url=:photo,
      check_out_geofence_name=:gfName, check_out_geofence_status=:gfStatus,
      outcome=:outcome, outcome_notes=:notes, order_taken=:ot, order_value=:ov, next_visit_date=:nvd, products_discussed=:pd::jsonb,
      duration_minutes=EXTRACT(EPOCH FROM (NOW()-check_in_time))/60, updated_at=NOW()
      WHERE id=:id AND (tenant_id IS NULL OR tenant_id = :tid::uuid OR :tid = '')`,
      {
        lat, lng, addr: address || null, photo: photoUrl, outcome, notes: outcome_notes || null,
        ot: !!order_taken, ov: order_value || 0, nvd: next_visit_date || null,
        pd: JSON.stringify(products_discussed || []), id: visit_id, tid: tenantId || null,
        gfName: geofence?.name || null,
        gfStatus: geofence ? (geofence.inside ? 'inside' : 'outside') : null,
      });

    await syncTaskStatusFromVisit(tenantId, visit_id);
    return res.json({
      success: true,
      message: 'Check-out berhasil! Hasil kunjungan tersimpan.',
      data: { visit_id, check_out_time: new Date().toISOString(), outcome, geofence, photoSaved: !!photo_base64 },
    });
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
  const photoUrl = photo_base64 && String(photo_base64).startsWith('data:')
    ? String(photo_base64).slice(0, 500000)
    : (photo_base64 ? `visits/evidence/${visit_id}_${Date.now()}.jpg` : null);
  if (!sequelize || !photoUrl) return res.json({ success: true, message: 'Evidence berhasil ditambahkan', data: { url: photoUrl, caption } });
  try {
    await q(`UPDATE sfa_visits SET products_discussed = COALESCE(products_discussed,'[]'::jsonb) || :e::jsonb, updated_at=NOW() WHERE id=:id AND (tenant_id IS NULL OR tenant_id = :tid::uuid OR :tid = '')`,
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
