import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

const ok = (res: NextApiResponse, data: any) => res.json({ success: true, ...data });
const err = (res: NextApiResponse, msg: string, code = 400) => res.status(code).json({ success: false, error: msg });
const q = async (sql: string, replacements?: any) => {
  if (!sequelize) return [];
  try { const [rows] = await sequelize.query(sql, { replacements }); return rows as any[]; }
  catch (e: any) { console.error('FMS-E Q:', e.message); return []; }
};
const qOne = async (sql: string, replacements?: any) => { const rows = await q(sql, replacements); return rows[0] || null; };
const qExec = async (sql: string, replacements?: any) => {
  if (!sequelize) return false;
  try { await sequelize.query(sql, { replacements }); return true; }
  catch (e: any) { console.error('FMS-E Exec:', e.message); return false; }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const tid = (session.user as any).tenantId || null;
    const uid = (session.user as any).id;
    const action = (req.query.action as string) || '';
    const b = req.body || {};

    switch (action) {

      // ═══════════════════════════════════════
      // GPS TRACKING
      // ═══════════════════════════════════════
      case 'gps-live': {
        const rows = await q(`SELECT g.*, v.vehicle_code, v.license_plate, v.vehicle_type, d.full_name as driver_name
          FROM fms_gps_tracking g
          JOIN fms_vehicles v ON g.vehicle_id = v.id
          LEFT JOIN fms_drivers d ON g.driver_id = d.id
          WHERE g.tenant_id = :tid
          AND g.recorded_at = (SELECT MAX(g2.recorded_at) FROM fms_gps_tracking g2 WHERE g2.vehicle_id = g.vehicle_id AND g2.tenant_id = :tid)
          ORDER BY g.recorded_at DESC`, { tid });
        return ok(res, { data: rows });
      }
      case 'gps-history': {
        const vid = req.query.vehicle_id;
        const from = req.query.from || new Date(Date.now() - 86400000).toISOString();
        const to = req.query.to || new Date().toISOString();
        const rows = await q(`SELECT * FROM fms_gps_tracking WHERE vehicle_id = :vid AND tenant_id = :tid AND recorded_at BETWEEN :from AND :to ORDER BY recorded_at`, { vid, tid, from, to });
        return ok(res, { data: rows });
      }
      case 'gps-record': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const row = await qOne(`INSERT INTO fms_gps_tracking (tenant_id,vehicle_id,driver_id,lat,lng,speed_kmh,heading,altitude_m,odometer,engine_status,fuel_level,event_type,address)
          VALUES (:tid,:vid,:did,:lat,:lng,:speed,:heading,:alt,:odo,:engine,:fuel,:etype,:addr) RETURNING *`,
          { tid, vid: b.vehicle_id, did: b.driver_id, lat: b.lat, lng: b.lng, speed: b.speed_kmh || 0, heading: b.heading || 0, alt: b.altitude_m || 0, odo: b.odometer || 0, engine: b.engine_status || 'on', fuel: b.fuel_level || 0, etype: b.event_type || 'position', addr: b.address });
        // Update vehicle position
        await qExec(`UPDATE fms_vehicles SET current_lat=:lat, current_lng=:lng, current_location=:addr, current_odometer_km=GREATEST(current_odometer_km,:odo), updated_at=NOW() WHERE id=:vid AND tenant_id=:tid`,
          { lat: b.lat, lng: b.lng, addr: b.address, odo: b.odometer || 0, vid: b.vehicle_id, tid });
        return ok(res, { data: row });
      }
      case 'gps-alerts': {
        const rows = await q(`SELECT g.*, v.vehicle_code, v.license_plate, d.full_name as driver_name
          FROM fms_gps_tracking g
          JOIN fms_vehicles v ON g.vehicle_id = v.id
          LEFT JOIN fms_drivers d ON g.driver_id = d.id
          WHERE g.tenant_id = :tid AND g.event_type IN ('speeding','harsh_brake','harsh_accel','idle','geofence_enter','geofence_exit')
          ORDER BY g.recorded_at DESC LIMIT 50`, { tid });
        return ok(res, { data: rows });
      }

      // ═══════════════════════════════════════
      // GEOFENCES
      // ═══════════════════════════════════════
      case 'geofences': {
        const rows = await q(`SELECT g.*, (SELECT COUNT(*) FROM fms_geofence_events ge WHERE ge.geofence_id=g.id AND ge.event_time > CURRENT_DATE - INTERVAL '7 days') as recent_events
          FROM fms_geofences g WHERE g.tenant_id = :tid ORDER BY g.fence_name`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-geofence': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const row = await qOne(`INSERT INTO fms_geofences (tenant_id,fence_code,fence_name,fence_type,center_lat,center_lng,radius_m,polygon_points,category,speed_limit_kmh,alert_on_enter,alert_on_exit,alert_on_speeding,color,created_by)
          VALUES (:tid,:code,:name,:ftype,:lat,:lng,:radius,:polygon::jsonb,:cat,:speed,:enter,:exit,:speeding,:color,:uid) RETURNING *`,
          { tid, code: b.fence_code, name: b.fence_name, ftype: b.fence_type || 'circle', lat: b.center_lat || 0, lng: b.center_lng || 0, radius: b.radius_m || 500, polygon: JSON.stringify(b.polygon_points || []), cat: b.category || 'depot', speed: b.speed_limit_kmh, enter: b.alert_on_enter !== false, exit: b.alert_on_exit !== false, speeding: b.alert_on_speeding || false, color: b.color || '#3B82F6', uid });
        return ok(res, { data: row, message: 'Geofence ditambahkan' });
      }
      case 'geofence-events': {
        const fid = req.query.geofence_id;
        const filter = fid ? 'AND ge.geofence_id = :fid' : '';
        const rows = await q(`SELECT ge.*, g.fence_name, v.vehicle_code, v.license_plate, d.full_name as driver_name
          FROM fms_geofence_events ge
          JOIN fms_geofences g ON ge.geofence_id = g.id
          JOIN fms_vehicles v ON ge.vehicle_id = v.id
          LEFT JOIN fms_drivers d ON ge.driver_id = d.id
          WHERE ge.tenant_id = :tid ${filter}
          ORDER BY ge.event_time DESC LIMIT 100`, { tid, fid });
        return ok(res, { data: rows });
      }

      // ═══════════════════════════════════════
      // TIRE MANAGEMENT
      // ═══════════════════════════════════════
      case 'tires': {
        const vid = req.query.vehicle_id;
        const filter = vid ? 'AND t.vehicle_id = :vid' : '';
        const rows = await q(`SELECT t.*, v.vehicle_code, v.license_plate
          FROM fms_tires t LEFT JOIN fms_vehicles v ON t.vehicle_id = v.id
          WHERE t.tenant_id = :tid ${filter} ORDER BY t.vehicle_id, t.position`, { tid, vid });
        return ok(res, { data: rows });
      }
      case 'create-tire': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const row = await qOne(`INSERT INTO fms_tires (tenant_id,tire_serial,vehicle_id,position,brand,model,size,type,purchase_date,purchase_price,install_date,install_odometer,max_km,current_tread_depth,min_tread_depth,status)
          VALUES (:tid,:serial,:vid,:pos,:brand,:model,:size,:ttype,:pdate,:price,:idate,:iodo,:maxkm,:tread,:mintread,:status) RETURNING *`,
          { tid, serial: b.tire_serial, vid: b.vehicle_id, pos: b.position, brand: b.brand, model: b.model, size: b.size, ttype: b.type || 'radial', pdate: b.purchase_date, price: b.purchase_price || 0, idate: b.install_date, iodo: b.install_odometer || 0, maxkm: b.max_km || 50000, tread: b.current_tread_depth || 8, mintread: b.min_tread_depth || 2, status: b.status || 'in_use' });
        return ok(res, { data: row, message: 'Ban ditambahkan' });
      }
      case 'update-tire': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const sets: string[] = []; const vals: any = { id: b.id, tid };
        ['vehicle_id','position','current_tread_depth','status','retread_count','notes'].forEach(f => {
          if (b[f] !== undefined) { sets.push(`${f}=:${f}`); vals[f] = b[f]; }
        });
        sets.push('updated_at=NOW()');
        await qExec(`UPDATE fms_tires SET ${sets.join(',')} WHERE id=:id AND tenant_id=:tid`, vals);
        return ok(res, { message: 'Ban diperbarui' });
      }
      case 'tire-summary': {
        const total = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='in_use') as in_use, COUNT(*) FILTER (WHERE status='spare') as spare, COUNT(*) FILTER (WHERE status='retread') as retread, COUNT(*) FILTER (WHERE status='disposed') as disposed, COUNT(*) FILTER (WHERE current_tread_depth <= min_tread_depth AND status='in_use') as need_replace FROM fms_tires WHERE tenant_id=:tid`, { tid });
        const byBrand = await q(`SELECT brand, COUNT(*) as count, AVG(current_tread_depth) as avg_tread FROM fms_tires WHERE tenant_id=:tid AND brand IS NOT NULL GROUP BY brand ORDER BY count DESC`, { tid });
        return ok(res, { data: { ...total, byBrand } });
      }

      // ═══════════════════════════════════════
      // RENTAL PAYMENTS
      // ═══════════════════════════════════════
      case 'rental-payments': {
        const rid = req.query.rental_id;
        const filter = rid ? 'AND rp.rental_id = :rid' : '';
        const rows = await q(`SELECT rp.*, r.rental_number, v.vehicle_code
          FROM fms_rental_payments rp
          JOIN fms_rentals r ON rp.rental_id = r.id
          JOIN fms_vehicles v ON r.vehicle_id = v.id
          WHERE rp.tenant_id = :tid ${filter}
          ORDER BY rp.payment_date DESC`, { tid, rid });
        return ok(res, { data: rows });
      }
      case 'create-rental-payment': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const payNum = `PAY-${Date.now().toString(36).toUpperCase()}`;
        const row = await qOne(`INSERT INTO fms_rental_payments (tenant_id,rental_id,payment_number,payment_date,amount,payment_method,reference_number,payment_type,notes,created_by)
          VALUES (:tid,:rid,:pnum,:pdate,:amt,:method,:ref,:ptype,:notes,:uid) RETURNING *`,
          { tid, rid: b.rental_id, pnum: b.payment_number || payNum, pdate: b.payment_date || new Date().toISOString().slice(0,10), amt: b.amount || 0, method: b.payment_method || 'transfer', ref: b.reference_number, ptype: b.payment_type || 'rental', notes: b.notes, uid });
        // Update rental payment status
        if (row) {
          const totals = await qOne(`SELECT COALESCE(SUM(amount),0) as paid FROM fms_rental_payments WHERE rental_id=:rid`, { rid: b.rental_id });
          const rental = await qOne(`SELECT total_amount FROM fms_rentals WHERE id=:rid`, { rid: b.rental_id });
          const paidAmt = parseFloat((totals as any)?.paid || 0);
          const totalAmt = parseFloat((rental as any)?.total_amount || 0);
          const pstatus = paidAmt >= totalAmt ? 'paid' : paidAmt > 0 ? 'partial' : 'unpaid';
          await qExec(`UPDATE fms_rentals SET payment_status=:ps, updated_at=NOW() WHERE id=:rid AND tenant_id=:tid`, { ps: pstatus, rid: b.rental_id, tid });
        }
        return ok(res, { data: row, message: 'Pembayaran dicatat' });
      }

      // ═══════════════════════════════════════
      // DRIVER VIOLATIONS
      // ═══════════════════════════════════════
      case 'driver-violations': {
        const did = req.query.driver_id;
        const filter = did ? 'AND dv.driver_id = :did' : '';
        const rows = await q(`SELECT dv.*, d.driver_code, d.full_name, v.vehicle_code
          FROM fms_driver_violations dv
          JOIN fms_drivers d ON dv.driver_id = d.id
          LEFT JOIN fms_vehicles v ON dv.vehicle_id = v.id
          WHERE dv.tenant_id = :tid ${filter}
          ORDER BY dv.violation_date DESC LIMIT 100`, { tid, did });
        return ok(res, { data: rows });
      }
      case 'create-violation': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const row = await qOne(`INSERT INTO fms_driver_violations (tenant_id,driver_id,vehicle_id,trip_id,violation_type,violation_date,location,lat,lng,speed_kmh,speed_limit_kmh,severity,deduction_points,fine_amount,description)
          VALUES (:tid,:did,:vid,:tripId,:vtype,:vdate,:loc,:lat,:lng,:speed,:limit,:sev,:points,:fine,:desc) RETURNING *`,
          { tid, did: b.driver_id, vid: b.vehicle_id, tripId: b.trip_id, vtype: b.violation_type, vdate: b.violation_date || new Date().toISOString(), loc: b.location, lat: b.lat || 0, lng: b.lng || 0, speed: b.speed_kmh || 0, limit: b.speed_limit_kmh, sev: b.severity || 'minor', points: b.deduction_points || 0, fine: b.fine_amount || 0, desc: b.description });
        // Update driver violation count & safety score
        if (row) {
          await qExec(`UPDATE fms_drivers SET violations_count = violations_count + 1, safety_score = GREATEST(0, safety_score - :pts), updated_at=NOW() WHERE id=:did AND tenant_id=:tid`,
            { pts: b.deduction_points || 1, did: b.driver_id, tid });
        }
        return ok(res, { data: row, message: 'Pelanggaran dicatat' });
      }
      case 'violation-summary': {
        const byType = await q(`SELECT violation_type, COUNT(*) as count, COALESCE(SUM(fine_amount),0) as total_fines FROM fms_driver_violations WHERE tenant_id=:tid AND violation_date >= CURRENT_DATE - INTERVAL '30 days' GROUP BY violation_type ORDER BY count DESC`, { tid });
        const topOffenders = await q(`SELECT d.driver_code, d.full_name, COUNT(dv.id) as violation_count, d.safety_score FROM fms_driver_violations dv JOIN fms_drivers d ON dv.driver_id=d.id WHERE dv.tenant_id=:tid AND dv.violation_date >= CURRENT_DATE - INTERVAL '30 days' GROUP BY d.id, d.driver_code, d.full_name, d.safety_score ORDER BY violation_count DESC LIMIT 10`, { tid });
        return ok(res, { data: { byType, topOffenders } });
      }

      // ═══════════════════════════════════════
      // REMINDERS
      // ═══════════════════════════════════════
      case 'reminders': {
        const statusFilter = req.query.status === 'all' ? '' : `AND r.status IN ('pending','sent')`;
        const rows = await q(`SELECT r.*,
          CASE WHEN r.entity_type='vehicle' THEN v.vehicle_code WHEN r.entity_type='driver' THEN d.driver_code ELSE NULL END as entity_code,
          CASE WHEN r.entity_type='vehicle' THEN v.license_plate WHEN r.entity_type='driver' THEN d.full_name ELSE NULL END as entity_name
          FROM fms_reminders r
          LEFT JOIN fms_vehicles v ON r.entity_type='vehicle' AND r.entity_id=v.id
          LEFT JOIN fms_drivers d ON r.entity_type='driver' AND r.entity_id=d.id
          WHERE r.tenant_id = :tid ${statusFilter}
          ORDER BY r.due_date ASC LIMIT 50`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-reminder': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const row = await qOne(`INSERT INTO fms_reminders (tenant_id,reminder_type,entity_type,entity_id,title,description,due_date,days_before,priority,assigned_to)
          VALUES (:tid,:rtype,:etype,:eid,:title,:desc,:due,:days,:pri,:assigned) RETURNING *`,
          { tid, rtype: b.reminder_type, etype: b.entity_type, eid: b.entity_id, title: b.title, desc: b.description, due: b.due_date, days: b.days_before || 7, pri: b.priority || 'medium', assigned: b.assigned_to });
        return ok(res, { data: row, message: 'Reminder dibuat' });
      }
      case 'resolve-reminder': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        await qExec(`UPDATE fms_reminders SET status='resolved', resolved_at=NOW(), resolved_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { id: b.id, uid, tid });
        return ok(res, { message: 'Reminder resolved' });
      }
      case 'generate-reminders': {
        // Auto-generate reminders from document expiry dates
        const expiring = await q(`SELECT d.id, d.entity_type, d.entity_id, d.document_type, d.document_number, d.expiry_date,
          CASE WHEN d.entity_type='vehicle' THEN v.vehicle_code ELSE dr.driver_code END as code
          FROM fms_documents d
          LEFT JOIN fms_vehicles v ON d.entity_type='vehicle' AND d.entity_id=v.id
          LEFT JOIN fms_drivers dr ON d.entity_type='driver' AND d.entity_id=dr.id
          WHERE d.tenant_id=:tid AND d.status='active' AND d.expiry_date <= CURRENT_DATE + INTERVAL '60 days'
          AND d.expiry_date > CURRENT_DATE
          AND NOT EXISTS (SELECT 1 FROM fms_reminders r WHERE r.entity_id=d.entity_id AND r.reminder_type='document_expiry' AND r.status IN ('pending','sent') AND r.due_date=d.expiry_date)`, { tid });
        let created = 0;
        for (const doc of expiring) {
          await qExec(`INSERT INTO fms_reminders (tenant_id,reminder_type,entity_type,entity_id,title,description,due_date,priority) VALUES (:tid,'document_expiry',:etype,:eid,:title,:desc,:due,:pri)`,
            { tid, etype: (doc as any).entity_type, eid: (doc as any).entity_id,
              title: `${(doc as any).document_type?.toUpperCase()} ${(doc as any).code} segera expired`,
              desc: `Dokumen ${(doc as any).document_type} #${(doc as any).document_number || '-'} akan expired pada ${(doc as any).expiry_date}`,
              due: (doc as any).expiry_date,
              pri: new Date((doc as any).expiry_date) < new Date(Date.now() + 14*86400000) ? 'high' : 'medium' });
          created++;
        }
        // Maintenance schedule reminders
        const dueMaint = await q(`SELECT ms.id, ms.vehicle_id, ms.maintenance_type, ms.next_due_at, v.vehicle_code
          FROM fms_maintenance_schedules ms
          JOIN fms_vehicles v ON ms.vehicle_id=v.id
          WHERE ms.tenant_id=:tid AND ms.is_active=true AND ms.next_due_at <= CURRENT_DATE + INTERVAL '14 days' AND ms.next_due_at >= CURRENT_DATE
          AND NOT EXISTS (SELECT 1 FROM fms_reminders r WHERE r.entity_id=ms.vehicle_id AND r.reminder_type='maintenance_due' AND r.status IN ('pending','sent') AND r.title LIKE '%' || ms.maintenance_type || '%')`, { tid });
        for (const m of dueMaint) {
          await qExec(`INSERT INTO fms_reminders (tenant_id,reminder_type,entity_type,entity_id,title,description,due_date,priority) VALUES (:tid,'maintenance_due','vehicle',:vid,:title,:desc,:due,'high')`,
            { tid, vid: (m as any).vehicle_id,
              title: `Maintenance ${(m as any).maintenance_type} - ${(m as any).vehicle_code}`,
              desc: `Jadwal ${(m as any).maintenance_type} untuk ${(m as any).vehicle_code} jatuh tempo ${(m as any).next_due_at}`,
              due: (m as any).next_due_at });
          created++;
        }
        return ok(res, { message: `${created} reminder baru dibuat`, data: { created } });
      }

      // ═══════════════════════════════════════
      // FLEET ANALYTICS / KPI
      // ═══════════════════════════════════════
      case 'fleet-analytics': {
        // Real-time fleet analytics
        const utilization = await qOne(`SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status='in_use') as in_use,
          COUNT(*) FILTER (WHERE status='available') as available,
          COUNT(*) FILTER (WHERE status='maintenance') as maintenance,
          COUNT(*) FILTER (WHERE status='reserved') as reserved,
          ROUND(COUNT(*) FILTER (WHERE status='in_use')::numeric / NULLIF(COUNT(*),0) * 100, 1) as utilization_pct
          FROM fms_vehicles WHERE tenant_id=:tid AND is_active=true`, { tid });

        const fuelEfficiency = await q(`SELECT v.vehicle_code, v.license_plate, v.vehicle_type,
          COUNT(f.id) as fill_count,
          COALESCE(SUM(f.quantity_liters),0) as total_liters,
          COALESCE(SUM(f.total_cost),0) as total_cost,
          COALESCE(AVG(f.consumption_rate),0) as avg_consumption
          FROM fms_vehicles v
          LEFT JOIN fms_fuel_records f ON v.id=f.vehicle_id AND f.fill_date >= CURRENT_DATE - INTERVAL '30 days'
          WHERE v.tenant_id=:tid AND v.is_active=true
          GROUP BY v.id, v.vehicle_code, v.license_plate, v.vehicle_type
          HAVING SUM(f.quantity_liters) > 0
          ORDER BY total_cost DESC LIMIT 15`, { tid });

        const costBreakdown = await q(`SELECT cost_category, COUNT(*) as count, COALESCE(SUM(amount),0) as total
          FROM fms_cost_records WHERE tenant_id=:tid AND cost_date >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY cost_category ORDER BY total DESC`, { tid });

        const monthlyCost = await q(`SELECT to_char(cost_date,'YYYY-MM') as month, cost_category, COALESCE(SUM(amount),0) as total
          FROM fms_cost_records WHERE tenant_id=:tid AND cost_date >= CURRENT_DATE - INTERVAL '6 months'
          GROUP BY month, cost_category ORDER BY month`, { tid });

        const driverPerformance = await q(`SELECT d.driver_code, d.full_name, d.total_trips, d.total_distance_km, d.safety_score, d.on_time_rate, d.violations_count, d.customer_rating,
          (SELECT COUNT(*) FROM fms_driver_violations dv WHERE dv.driver_id=d.id AND dv.violation_date >= CURRENT_DATE - INTERVAL '30 days') as recent_violations
          FROM fms_drivers d WHERE d.tenant_id=:tid AND d.is_active=true
          ORDER BY d.safety_score DESC`, { tid });

        const vehicleAge = await q(`SELECT vehicle_type, COUNT(*) as count,
          ROUND(AVG(EXTRACT(YEAR FROM CURRENT_DATE) - year),1) as avg_age,
          MIN(year) as oldest, MAX(year) as newest
          FROM fms_vehicles WHERE tenant_id=:tid AND is_active=true AND year IS NOT NULL
          GROUP BY vehicle_type ORDER BY count DESC`, { tid });

        const tcoPerVehicle = await q(`SELECT v.vehicle_code, v.license_plate, v.vehicle_type,
          v.purchase_price,
          COALESCE(v.current_odometer_km,0) as odometer,
          COALESCE((SELECT SUM(amount) FROM fms_cost_records WHERE vehicle_id=v.id),0) as total_costs,
          COALESCE((SELECT SUM(total_cost) FROM fms_fuel_records WHERE vehicle_id=v.id),0) as total_fuel,
          COALESCE((SELECT SUM(total_cost) FROM fms_maintenance_records WHERE vehicle_id=v.id),0) as total_maintenance,
          COALESCE((SELECT SUM(total_cost) FROM fms_incidents WHERE vehicle_id=v.id),0) as total_incident
          FROM fms_vehicles v WHERE v.tenant_id=:tid AND v.is_active=true
          ORDER BY total_costs DESC LIMIT 15`, { tid });

        return ok(res, { data: { utilization, fuelEfficiency, costBreakdown, monthlyCost, driverPerformance, vehicleAge, tcoPerVehicle } });
      }

      case 'fleet-kpi-snapshot': {
        // Generate and return today's KPI
        const today = new Date().toISOString().slice(0,10);
        let kpi = await qOne(`SELECT * FROM fms_fleet_kpi WHERE tenant_id=:tid AND kpi_date=:d`, { tid, d: today });
        if (!kpi) {
          // Compute
          const v = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status IN ('in_use','on_trip')) as active, COUNT(*) FILTER (WHERE status='maintenance') as maint FROM fms_vehicles WHERE tenant_id=:tid AND is_active=true`, { tid });
          const d = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='active') as active FROM fms_drivers WHERE tenant_id=:tid AND is_active=true`, { tid });
          const trips = await qOne(`SELECT COUNT(*) as total, COALESCE(SUM(total_distance_km),0) as dist FROM tms_trips WHERE tenant_id=:tid AND created_at::date=:d`, { tid, d: today });
          const fuel = await qOne(`SELECT COALESCE(SUM(quantity_liters),0) as liters, COALESCE(SUM(total_cost),0) as cost FROM fms_fuel_records WHERE tenant_id=:tid AND fill_date::date=:d`, { tid, d: today });
          const maint = await qOne(`SELECT COALESCE(SUM(total_cost),0) as cost FROM fms_maintenance_records WHERE tenant_id=:tid AND created_at::date=:d`, { tid, d: today });
          const ops = await qOne(`SELECT COALESCE(SUM(amount),0) as cost FROM fms_cost_records WHERE tenant_id=:tid AND cost_date=:d`, { tid, d: today });
          const inc = await qOne(`SELECT COUNT(*) as total FROM fms_incidents WHERE tenant_id=:tid AND incident_date::date=:d`, { tid, d: today });
          const vio = await qOne(`SELECT COUNT(*) as total FROM fms_driver_violations WHERE tenant_id=:tid AND violation_date::date=:d`, { tid, d: today });

          const totalV = parseInt((v as any)?.total || '0');
          const activeV = parseInt((v as any)?.active || '0');
          const utilRate = totalV > 0 ? (activeV / totalV * 100) : 0;
          const totalDist = parseFloat((trips as any)?.dist || '0');
          const fuelCost = parseFloat((fuel as any)?.cost || '0');
          const costPerKm = totalDist > 0 ? ((fuelCost + parseFloat((ops as any)?.cost || '0')) / totalDist) : 0;

          kpi = await qOne(`INSERT INTO fms_fleet_kpi (tenant_id,kpi_date,total_vehicles,active_vehicles,utilization_rate,in_maintenance,total_drivers,active_drivers,total_trips,total_distance_km,total_fuel_liters,total_fuel_cost,total_maintenance_cost,total_operational_cost,cost_per_km,total_incidents,total_violations)
            VALUES (:tid,:d,:tv,:av,:ur,:im,:td,:ad,:tt,:dist,:fl,:fc,:mc,:oc,:cpk,:ti,:tvi)
            ON CONFLICT (tenant_id,kpi_date) DO UPDATE SET total_vehicles=EXCLUDED.total_vehicles, active_vehicles=EXCLUDED.active_vehicles, utilization_rate=EXCLUDED.utilization_rate
            RETURNING *`,
            { tid, d: today, tv: totalV, av: activeV, ur: utilRate, im: parseInt((v as any)?.maint||'0'), td: parseInt((d as any)?.total||'0'), ad: parseInt((d as any)?.active||'0'), tt: parseInt((trips as any)?.total||'0'), dist: totalDist, fl: parseFloat((fuel as any)?.liters||'0'), fc: fuelCost, mc: parseFloat((maint as any)?.cost||'0'), oc: parseFloat((ops as any)?.cost||'0'), cpk: costPerKm, ti: parseInt((inc as any)?.total||'0'), tvi: parseInt((vio as any)?.total||'0') });
        }
        // Historical
        const history = await q(`SELECT * FROM fms_fleet_kpi WHERE tenant_id=:tid ORDER BY kpi_date DESC LIMIT 30`, { tid });
        return ok(res, { data: { today: kpi, history } });
      }

      // ═══════════════════════════════════════
      // DRIVER PERFORMANCE DETAIL
      // ═══════════════════════════════════════
      case 'driver-performance': {
        const did = req.query.driver_id;
        if (!did) return err(res, 'driver_id required');
        const driver = await qOne(`SELECT * FROM fms_drivers WHERE id=:did AND tenant_id=:tid`, { did, tid });
        if (!driver) return err(res, 'Not found', 404);
        const violations = await q(`SELECT violation_type, COUNT(*) as count FROM fms_driver_violations WHERE driver_id=:did AND tenant_id=:tid GROUP BY violation_type ORDER BY count DESC`, { did, tid });
        const monthlyTrips = await q(`SELECT to_char(t.actual_start,'YYYY-MM') as month, COUNT(*) as trips, COALESCE(SUM(t.total_distance_km),0) as distance FROM tms_trips t WHERE t.driver_id=:did AND t.tenant_id=:tid AND t.actual_start >= CURRENT_DATE - INTERVAL '6 months' GROUP BY month ORDER BY month`, { did, tid });
        const fuelUsage = await q(`SELECT to_char(fill_date,'YYYY-MM') as month, COALESCE(SUM(quantity_liters),0) as liters, COALESCE(SUM(total_cost),0) as cost FROM fms_fuel_records WHERE driver_id=:did AND tenant_id=:tid AND fill_date >= CURRENT_DATE - INTERVAL '6 months' GROUP BY month ORDER BY month`, { did, tid });
        const incidents = await q(`SELECT * FROM fms_incidents WHERE driver_id=:did AND tenant_id=:tid ORDER BY incident_date DESC LIMIT 10`, { did, tid });
        const inspections = await q(`SELECT * FROM fms_inspections WHERE driver_id=:did AND tenant_id=:tid ORDER BY inspection_date DESC LIMIT 10`, { did, tid });
        return ok(res, { data: { ...driver, violations, monthlyTrips, fuelUsage, incidents, inspections } });
      }

      // ═══════════════════════════════════════
      // MAINTENANCE SCHEDULES (ENHANCED)
      // ═══════════════════════════════════════
      case 'maintenance-schedules': {
        const rows = await q(`SELECT ms.*, v.vehicle_code, v.license_plate, v.current_odometer_km,
          CASE WHEN ms.next_due_at <= CURRENT_DATE THEN 'overdue'
               WHEN ms.next_due_at <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
               ELSE 'ok' END as urgency
          FROM fms_maintenance_schedules ms
          JOIN fms_vehicles v ON ms.vehicle_id = v.id
          WHERE ms.tenant_id = :tid AND ms.is_active = true
          ORDER BY ms.next_due_at ASC NULLS LAST`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-schedule': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const row = await qOne(`INSERT INTO fms_maintenance_schedules (tenant_id,vehicle_id,schedule_type,maintenance_type,description,interval_km,interval_days,interval_hours,next_due_at,next_due_km,alert_before_days,alert_before_km,estimated_cost,vendor)
          VALUES (:tid,:vid,:stype,:mtype,:desc,:ikm,:idays,:ihrs,:due,:duekm,:abdays,:abkm,:cost,:vendor) RETURNING *`,
          { tid, vid: b.vehicle_id, stype: b.schedule_type || 'time_based', mtype: b.maintenance_type, desc: b.description, ikm: b.interval_km, idays: b.interval_days, ihrs: b.interval_hours, due: b.next_due_at, duekm: b.next_due_km, abdays: b.alert_before_days || 7, abkm: b.alert_before_km || 500, cost: b.estimated_cost || 0, vendor: b.vendor });
        return ok(res, { data: row, message: 'Jadwal maintenance dibuat' });
      }

      default:
        return err(res, `Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error('FMS Enhanced API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

export default handler;
