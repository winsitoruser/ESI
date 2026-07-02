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
  catch (e: any) { console.error('TMS-E Q:', e.message); return []; }
};
const qOne = async (sql: string, replacements?: any) => { const rows = await q(sql, replacements); return rows[0] || null; };
const qExec = async (sql: string, replacements?: any) => {
  if (!sequelize) return false;
  try { await sequelize.query(sql, { replacements }); return true; }
  catch (e: any) { console.error('TMS-E Exec:', e.message); return false; }
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
      // SHIPMENT TRACKING (real-time status timeline)
      // ═══════════════════════════════════════
      case 'shipment-tracking': {
        const sid = req.query.shipment_id;
        if (sid) {
          const tracking = await q(`SELECT st.*, u.name as performed_by_name
            FROM tms_shipment_tracking st
            LEFT JOIN users u ON st.performed_by = u.id::text
            WHERE st.shipment_id = :sid AND st.tenant_id = :tid
            ORDER BY st.created_at ASC`, { sid, tid });
          return ok(res, { data: tracking });
        }
        // List all shipments with latest tracking info
        const rows = await q(`SELECT s.id, s.shipment_number, s.consignee_name, s.destination_name,
          s.status as current_status, s.total_weight_kg, s.priority,
          s.required_delivery_date, s.actual_delivery_date,
          CASE WHEN s.required_delivery_date IS NOT NULL AND s.required_delivery_date < CURRENT_DATE AND s.status NOT IN ('delivered','pod_received','cancelled') THEN true ELSE false END as is_delayed,
          (SELECT st2.location FROM tms_shipment_tracking st2 WHERE st2.shipment_id=s.id ORDER BY st2.created_at DESC LIMIT 1) as current_location,
          (SELECT st2.created_at FROM tms_shipment_tracking st2 WHERE st2.shipment_id=s.id ORDER BY st2.created_at DESC LIMIT 1) as last_update
          FROM tms_shipments s
          WHERE s.tenant_id=:tid AND s.status NOT IN ('draft','cancelled')
          ORDER BY s.updated_at DESC LIMIT 100`, { tid });
        return ok(res, { data: rows });
      }
      case 'add-tracking': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        if (!b.shipment_id || !b.status) return err(res, 'shipment_id dan status wajib');
        const row = await qOne(`INSERT INTO tms_shipment_tracking (tenant_id,shipment_id,status,location,lat,lng,description,performed_by,photo_url,is_customer_visible)
          VALUES (:tid,:sid,:status,:loc,:lat,:lng,:desc,:uid,:photo,:visible) RETURNING *`,
          { tid, sid: b.shipment_id, status: b.status, loc: b.location, lat: b.lat || 0, lng: b.lng || 0, desc: b.description, uid, photo: b.photo_url, visible: b.is_customer_visible !== false });
        // Update shipment main status
        await qExec(`UPDATE tms_shipments SET status=:status, updated_at=NOW() WHERE id=:sid AND tenant_id=:tid`, { status: b.status, sid: b.shipment_id, tid });
        // Auto-set delivery date
        if (b.status === 'delivered') {
          await qExec(`UPDATE tms_shipments SET actual_delivery_date=CURRENT_DATE, updated_at=NOW() WHERE id=:sid AND tenant_id=:tid`, { sid: b.shipment_id, tid });
        }
        return ok(res, { data: row, message: 'Tracking diperbarui' });
      }
      case 'tracking-public': {
        // Public tracking by shipment number (no auth required in real scenario)
        const num = req.query.number;
        const shipment = await qOne(`SELECT id, shipment_number, status, shipper_name, consignee_name, origin_name, destination_name, order_date, required_delivery_date, actual_delivery_date, total_pieces, total_weight_kg FROM tms_shipments WHERE shipment_number=:num AND tenant_id=:tid`, { num, tid });
        if (!shipment) return err(res, 'Shipment not found', 404);
        const tracking = await q(`SELECT status, location, description, created_at FROM tms_shipment_tracking WHERE shipment_id=:sid AND is_customer_visible=true ORDER BY created_at ASC`, { sid: (shipment as any).id });
        return ok(res, { data: { ...shipment, tracking } });
      }

      // ═══════════════════════════════════════
      // DISPATCH WORKFLOW
      // ═══════════════════════════════════════
      case 'dispatch-board': {
        // Pending shipments ready for dispatch
        const pendingShipments = await q(`SELECT s.*, c.carrier_name FROM tms_shipments s LEFT JOIN tms_carriers c ON s.carrier_id=c.id WHERE s.tenant_id=:tid AND s.status IN ('confirmed','assigned') ORDER BY s.priority DESC, s.required_delivery_date ASC`, { tid });
        // Available vehicles
        const availableVehicles = await q(`SELECT v.id, v.vehicle_code, v.license_plate, v.vehicle_type, v.max_weight_kg, v.max_volume_m3, v.current_location FROM fms_vehicles v WHERE v.tenant_id=:tid AND v.status='available' AND v.is_active=true ORDER BY v.vehicle_code`, { tid });
        // Available drivers
        const availableDrivers = await q(`SELECT d.id, d.driver_code, d.full_name, d.license_type, d.safety_score, d.total_trips FROM fms_drivers d WHERE d.tenant_id=:tid AND d.status='active' AND d.availability='available' AND d.is_active=true ORDER BY d.safety_score DESC`, { tid });
        // Active trips
        const activeTrips = await q(`SELECT t.*, v.vehicle_code, v.license_plate, d.full_name as driver_name, r.route_name, (SELECT COUNT(*) FROM tms_trip_shipments ts WHERE ts.trip_id=t.id) as shipment_count FROM tms_trips t JOIN fms_vehicles v ON t.vehicle_id=v.id JOIN fms_drivers d ON t.driver_id=d.id LEFT JOIN tms_routes r ON t.route_id=r.id WHERE t.tenant_id=:tid AND t.status IN ('planned','dispatched','in_progress') ORDER BY t.planned_start`, { tid });
        return ok(res, { data: { pendingShipments, availableVehicles, availableDrivers, activeTrips } });
      }
      case 'auto-dispatch': {
        // Auto-assign shipments to optimal vehicle+driver based on weight, route, driver score
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const shipmentIds: string[] = b.shipment_ids || [];
        if (shipmentIds.length === 0) return err(res, 'No shipments selected');
        // Get shipments
        const shipments = await q(`SELECT * FROM tms_shipments WHERE id = ANY(:ids::uuid[]) AND tenant_id=:tid AND status IN ('confirmed','assigned')`, { ids: `{${shipmentIds.join(',')}}`, tid });
        if (shipments.length === 0) return err(res, 'No valid shipments found');
        // Get available vehicles sorted by capacity
        const vehicles = await q(`SELECT * FROM fms_vehicles WHERE tenant_id=:tid AND status='available' AND is_active=true ORDER BY max_weight_kg DESC`, { tid });
        const drivers = await q(`SELECT * FROM fms_drivers WHERE tenant_id=:tid AND status='active' AND availability='available' AND is_active=true ORDER BY safety_score DESC`, { tid });
        if (vehicles.length === 0 || drivers.length === 0) return err(res, 'No available vehicles or drivers');

        // Simple greedy dispatch: assign to first available vehicle+driver
        const vehicle = vehicles[0] as any;
        const driver = drivers[0] as any;
        const tripNum = `TRP-${Date.now().toString(36).toUpperCase()}`;
        const trip = await qOne(`INSERT INTO tms_trips (tenant_id,trip_number,trip_type,vehicle_id,driver_id,planned_start,total_shipments,status,created_by) VALUES (:tid,:tnum,'delivery',:vid,:did,NOW(),:cnt,'planned',:uid) RETURNING *`,
          { tid, tnum: tripNum, vid: vehicle.id, did: driver.id, cnt: shipments.length, uid });

        if (trip) {
          for (let i = 0; i < shipments.length; i++) {
            const s = shipments[i] as any;
            await qExec(`INSERT INTO tms_trip_shipments (trip_id,shipment_id,stop_sequence) VALUES (:tripId,:sid,:seq)`, { tripId: (trip as any).id, sid: s.id, seq: i+1 });
            await qExec(`UPDATE tms_shipments SET vehicle_id=:vid, driver_id=:did, status='assigned', updated_at=NOW() WHERE id=:sid AND tenant_id=:tid`, { vid: vehicle.id, did: driver.id, sid: s.id, tid });
            // Add tracking entry
            await qExec(`INSERT INTO tms_shipment_tracking (tenant_id,shipment_id,status,description,performed_by) VALUES (:tid,:sid,'assigned','Auto-dispatched ke trip ${tripNum}',:uid)`, { tid, sid: s.id, uid });
          }
          await qExec(`UPDATE fms_vehicles SET status='in_use', updated_at=NOW() WHERE id=:vid AND tenant_id=:tid`, { vid: vehicle.id, tid });
          await qExec(`UPDATE fms_drivers SET availability='on_trip', updated_at=NOW() WHERE id=:did AND tenant_id=:tid`, { did: driver.id, tid });
        }
        return ok(res, { data: trip, message: `${shipments.length} shipment di-dispatch ke trip ${tripNum}` });
      }

      // ═══════════════════════════════════════
      // CARRIER SCORING
      // ═══════════════════════════════════════
      case 'carrier-scores': {
        const period = req.query.period || new Date().toISOString().slice(0,7);
        const rows = await q(`SELECT cs.carrier_id, c.carrier_name, c.carrier_type,
          cs.total_shipments, cs.delivered_on_time, cs.delivered_late,
          cs.on_time_rate as on_time_pct,
          cs.damage_rate as damage_pct,
          COALESCE(cs.damaged_shipments,0) + COALESCE(cs.lost_shipments,0) as claim_count,
          CASE WHEN cs.total_shipments > 0 THEN ROUND(cs.total_cost / cs.total_shipments, 2) ELSE 0 END as avg_cost_per_kg,
          COALESCE(c.rating, 0) as avg_rating,
          cs.overall_score, cs.rank
          FROM tms_carrier_scores cs
          JOIN tms_carriers c ON cs.carrier_id = c.id
          WHERE cs.tenant_id = :tid AND cs.score_period = :period
          ORDER BY cs.overall_score DESC`, { tid, period });
        return ok(res, { data: rows });
      }
      case 'compute-carrier-scores': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const period = b.period || new Date().toISOString().slice(0,7);
        const carriers = await q(`SELECT id, carrier_name FROM tms_carriers WHERE tenant_id=:tid AND is_active=true`, { tid });
        let computed = 0;
        for (const c of carriers) {
          const cid = (c as any).id;
          const stats = await qOne(`SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status='delivered' AND (actual_delivery_date IS NULL OR actual_delivery_date <= required_delivery_date)) as on_time,
            COUNT(*) FILTER (WHERE status='delivered' AND actual_delivery_date > required_delivery_date) as late,
            COUNT(*) FILTER (WHERE status='cancelled') as cancelled,
            COALESCE(SUM(total_charge),0) as revenue
            FROM tms_shipments WHERE carrier_id=:cid AND tenant_id=:tid AND to_char(order_date,'YYYY-MM')=:period`, { cid, tid, period });
          const s = stats as any;
          const total = parseInt(s?.total || '0');
          if (total === 0) continue;
          const onTime = parseInt(s?.on_time || '0');
          const late = parseInt(s?.late || '0');
          const otRate = total > 0 ? (onTime / total * 100) : 0;
          const score = Math.min(100, Math.max(0, otRate * 0.7 + (total > 0 ? 30 : 0) - late * 2));

          await qExec(`INSERT INTO tms_carrier_scores (tenant_id,carrier_id,score_period,total_shipments,delivered_on_time,delivered_late,cancelled_shipments,on_time_rate,overall_score,total_revenue)
            VALUES (:tid,:cid,:period,:total,:ot,:late,:cancel,:otr,:score,:rev)
            ON CONFLICT (tenant_id,carrier_id,score_period) DO UPDATE SET total_shipments=EXCLUDED.total_shipments, delivered_on_time=EXCLUDED.delivered_on_time, delivered_late=EXCLUDED.delivered_late, on_time_rate=EXCLUDED.on_time_rate, overall_score=EXCLUDED.overall_score, total_revenue=EXCLUDED.total_revenue`,
            { tid, cid, period, total, ot: onTime, late, cancel: parseInt(s?.cancelled||'0'), otr: otRate, score, rev: parseFloat(s?.revenue||'0') });
          // Update carrier rating
          await qExec(`UPDATE tms_carriers SET rating=:score, completed_shipments=:total, on_time_rate=:otr, updated_at=NOW() WHERE id=:cid AND tenant_id=:tid`, { score: score/20, total, otr: otRate, cid, tid });
          computed++;
        }
        return ok(res, { message: `${computed} carrier scores computed for ${period}` });
      }

      // ═══════════════════════════════════════
      // LOGISTICS KPI / ANALYTICS
      // ═══════════════════════════════════════
      case 'logistics-analytics': {
        const overview = await qOne(`SELECT
          COUNT(*) as total_shipments,
          COUNT(*) FILTER (WHERE status='delivered' OR status='pod_received') as delivered,
          COUNT(*) FILTER (WHERE status IN ('draft','confirmed','assigned','picked_up','in_transit')) as in_progress,
          COUNT(*) FILTER (WHERE status='cancelled') as cancelled,
          ROUND(COUNT(*) FILTER (WHERE (status='delivered' OR status='pod_received') AND (actual_delivery_date IS NULL OR actual_delivery_date <= required_delivery_date))::numeric / NULLIF(COUNT(*) FILTER (WHERE status='delivered' OR status='pod_received'),0) * 100, 1) as on_time_pct,
          COALESCE(SUM(total_charge),0) as total_revenue,
          ROUND(COALESCE(SUM(total_charge),0) / NULLIF(COUNT(*),0), 0) as avg_cost_per_shipment,
          COALESCE(AVG(EXTRACT(EPOCH FROM (actual_delivery_date::timestamp - order_date::timestamp))/3600) FILTER (WHERE actual_delivery_date IS NOT NULL),0) as avg_delivery_hours
          FROM tms_shipments WHERE tenant_id=:tid AND order_date >= CURRENT_DATE - INTERVAL '30 days'`, { tid });

        const revenueByService = await q(`SELECT shipment_type as service_type, COUNT(*) as count, COALESCE(SUM(total_charge),0) as revenue FROM tms_shipments WHERE tenant_id=:tid AND order_date >= CURRENT_DATE - INTERVAL '30 days' GROUP BY shipment_type ORDER BY revenue DESC`, { tid });

        const topRoutes = await q(`SELECT r.route_name, r.route_code,
          COUNT(DISTINCT t.id) as trip_count, COUNT(s.id) as shipment_count,
          COALESCE(SUM(t.total_distance_km),0) as total_distance, COALESCE(SUM(s.total_charge),0) as revenue
          FROM tms_shipments s
          LEFT JOIN tms_trip_shipments ts ON s.id=ts.shipment_id
          LEFT JOIN tms_trips t ON ts.trip_id=t.id
          JOIN tms_routes r ON s.route_id=r.id
          WHERE s.tenant_id=:tid AND s.order_date >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY r.id, r.route_name, r.route_code ORDER BY trip_count DESC LIMIT 10`, { tid });

        const monthlyTrend = await q(`SELECT to_char(order_date,'YYYY-MM') as month,
          COUNT(*) as shipments,
          COUNT(*) FILTER (WHERE status='delivered' OR status='pod_received') as delivered,
          COALESCE(SUM(total_charge),0) as revenue,
          ROUND(COUNT(*) FILTER (WHERE (status='delivered' OR status='pod_received') AND (actual_delivery_date IS NULL OR actual_delivery_date <= required_delivery_date))::numeric / NULLIF(COUNT(*) FILTER (WHERE status='delivered' OR status='pod_received'),0) * 100, 1) as on_time_pct,
          COALESCE(AVG(EXTRACT(EPOCH FROM (actual_delivery_date::timestamp - order_date::timestamp))/3600) FILTER (WHERE actual_delivery_date IS NOT NULL),0) as avg_hours
          FROM tms_shipments WHERE tenant_id=:tid AND order_date >= CURRENT_DATE - INTERVAL '12 months' GROUP BY month ORDER BY month`, { tid });

        const carrierSplit = await q(`SELECT c.carrier_name, COUNT(s.id) as shipments, COALESCE(SUM(s.total_charge),0) as revenue FROM tms_shipments s JOIN tms_carriers c ON s.carrier_id=c.id WHERE s.tenant_id=:tid AND s.order_date >= CURRENT_DATE - INTERVAL '30 days' GROUP BY c.id, c.carrier_name ORDER BY shipments DESC`, { tid });

        return ok(res, { data: { overview, revenueByService, topRoutes, monthlyTrend, carrierSplit } });
      }

      case 'logistics-kpi-snapshot': {
        const today = new Date().toISOString().slice(0,10);
        let kpi = await qOne(`SELECT * FROM tms_logistics_kpi WHERE tenant_id=:tid AND kpi_date=:d`, { tid, d: today });
        if (!kpi) {
          const s = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='delivered' OR status='pod_received') as delivered, COUNT(*) FILTER (WHERE status IN ('draft','confirmed','assigned','in_transit')) as pending, COUNT(*) FILTER (WHERE status='cancelled') as cancelled, COALESCE(SUM(total_charge),0) as revenue, COALESCE(SUM(total_weight_kg),0) as weight, COALESCE(SUM(total_volume_m3),0) as volume FROM tms_shipments WHERE tenant_id=:tid AND order_date=:d`, { tid, d: today });
          const t = await qOne(`SELECT COUNT(*) as trips, COALESCE(SUM(total_distance_km),0) as dist, COALESCE(SUM(fuel_cost),0) as fuel, COALESCE(SUM(toll_cost),0) as toll FROM tms_trips WHERE tenant_id=:tid AND created_at::date=:d`, { tid, d: today });
          kpi = await qOne(`INSERT INTO tms_logistics_kpi (tenant_id,kpi_date,total_shipments,delivered_shipments,pending_shipments,cancelled_shipments,total_revenue,total_weight_kg,total_volume_m3,total_trips,total_distance_km,fuel_cost,toll_cost)
            VALUES (:tid,:d,:ts,:ds,:ps,:cs,:rev,:wt,:vol,:tt,:dist,:fuel,:toll) ON CONFLICT (tenant_id,kpi_date) DO UPDATE SET total_shipments=EXCLUDED.total_shipments RETURNING *`,
            { tid, d: today, ts: parseInt((s as any)?.total||'0'), ds: parseInt((s as any)?.delivered||'0'), ps: parseInt((s as any)?.pending||'0'), cs: parseInt((s as any)?.cancelled||'0'), rev: parseFloat((s as any)?.revenue||'0'), wt: parseFloat((s as any)?.weight||'0'), vol: parseFloat((s as any)?.volume||'0'), tt: parseInt((t as any)?.trips||'0'), dist: parseFloat((t as any)?.dist||'0'), fuel: parseFloat((t as any)?.fuel||'0'), toll: parseFloat((t as any)?.toll||'0') });
        }
        const history = await q(`SELECT * FROM tms_logistics_kpi WHERE tenant_id=:tid ORDER BY kpi_date DESC LIMIT 30`, { tid });
        return ok(res, { data: { today: kpi, history } });
      }

      // ═══════════════════════════════════════
      // DELIVERY SLAs
      // ═══════════════════════════════════════
      case 'delivery-slas': {
        const rows = await q(`SELECT s.*, oz.zone_name as origin_zone_name, dz.zone_name as dest_zone_name
          FROM tms_delivery_slas s
          LEFT JOIN tms_zones oz ON s.origin_zone_id=oz.id
          LEFT JOIN tms_zones dz ON s.destination_zone_id=dz.id
          WHERE s.tenant_id=:tid ORDER BY s.sla_name`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-sla': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        // Accept both frontend field names (target_hours, penalty_type, penalty_value) and raw DB names
        const hours = b.target_hours || b.max_delivery_hours || 24;
        const penaltyHr = b.penalty_type === 'percentage' ? (b.penalty_value || 0) : (b.penalty_per_hour_late || 0);
        const penaltyDay = b.penalty_per_day_late || 0;
        const row = await qOne(`INSERT INTO tms_delivery_slas (tenant_id,sla_name,sla_type,origin_zone_id,destination_zone_id,service_type,max_delivery_hours,max_delivery_days,penalty_per_hour_late,penalty_per_day_late,max_damage_rate_pct,max_loss_rate_pct,is_active)
          VALUES (:tid,:name,:stype,:ozid,:dzid,:service,:hours,:days,:phr,:pday,:dmg,:loss,true) RETURNING *`,
          { tid, name: b.sla_name, stype: b.sla_type || 'delivery_time', ozid: b.origin_zone_id || null, dzid: b.destination_zone_id || null, service: b.service_type || null, hours, days: b.max_delivery_days || Math.ceil(hours/24), phr: penaltyHr, pday: penaltyDay, dmg: b.max_damage_rate_pct || 0, loss: b.max_loss_rate_pct || 0 });
        return ok(res, { data: row, message: 'SLA ditambahkan' });
      }

      // ═══════════════════════════════════════
      // CUSTOMER ADDRESSES
      // ═══════════════════════════════════════
      case 'customer-addresses': {
        const search = req.query.search ? `AND (ca.customer_name ILIKE :s OR ca.company_name ILIKE :s OR ca.city ILIKE :s)` : '';
        const rows = await q(`SELECT ca.*, z.zone_name FROM tms_customer_addresses ca LEFT JOIN tms_zones z ON ca.zone_id=z.id WHERE ca.tenant_id=:tid AND ca.is_active=true ${search} ORDER BY ca.customer_name`, { tid, s: `%${req.query.search || ''}%` });
        return ok(res, { data: rows });
      }
      case 'create-customer-address': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const row = await qOne(`INSERT INTO tms_customer_addresses (tenant_id,customer_name,customer_phone,customer_email,company_name,address_type,address_label,address,city,province,postal_code,lat,lng,zone_id,contact_person,contact_phone,special_instructions,is_default)
          VALUES (:tid,:name,:phone,:email,:company,:atype,:label,:addr,:city,:prov,:postal,:lat,:lng,:zid,:contact,:cphone,:instructions,:def) RETURNING *`,
          { tid, name: b.customer_name, phone: b.customer_phone, email: b.customer_email, company: b.company_name, atype: b.address_type || 'both', label: b.address_label, addr: b.address, city: b.city, prov: b.province, postal: b.postal_code, lat: b.lat || 0, lng: b.lng || 0, zid: b.zone_id, contact: b.contact_person, cphone: b.contact_phone, instructions: b.special_instructions, def: b.is_default || false });
        return ok(res, { data: row, message: 'Alamat pelanggan ditambahkan' });
      }

      // ═══════════════════════════════════════
      // FREIGHT BILL ITEMS
      // ═══════════════════════════════════════
      case 'freight-bill-items': {
        const bid = req.query.bill_id;
        if (!bid) return err(res, 'bill_id required');
        const rows = await q(`SELECT fbi.*, s.shipment_number, t.trip_number FROM tms_freight_bill_items fbi LEFT JOIN tms_shipments s ON fbi.shipment_id=s.id LEFT JOIN tms_trips t ON fbi.trip_id=t.id WHERE fbi.bill_id=:bid ORDER BY fbi.created_at`, { bid });
        return ok(res, { data: rows });
      }
      case 'add-bill-item': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const row = await qOne(`INSERT INTO tms_freight_bill_items (bill_id,shipment_id,trip_id,description,quantity,unit,rate,amount) VALUES (:bid,:sid,:tid2,:desc,:qty,:unit,:rate,:amt) RETURNING *`,
          { bid: b.bill_id, sid: b.shipment_id, tid2: b.trip_id, desc: b.description, qty: b.quantity || 1, unit: b.unit || 'unit', rate: b.rate || 0, amt: b.amount || 0 });
        // Update bill totals
        if (row) {
          const totals = await qOne(`SELECT COALESCE(SUM(amount),0) as sub FROM tms_freight_bill_items WHERE bill_id=:bid`, { bid: b.bill_id });
          const sub = parseFloat((totals as any)?.sub || '0');
          await qExec(`UPDATE tms_freight_bills SET subtotal=:sub, total_amount=:sub+tax_amount-discount_amount, balance=:sub+tax_amount-discount_amount-paid_amount, updated_at=NOW() WHERE id=:bid AND tenant_id=:tid`, { sub, bid: b.bill_id, tid });
        }
        return ok(res, { data: row, message: 'Item ditambahkan' });
      }

      // ═══════════════════════════════════════
      // DISPATCH QUEUE + ASSIGN (frontend-compatible)
      // ═══════════════════════════════════════
      case 'dispatch-queue': {
        const rows = await q(`SELECT s.*, c.carrier_name
          FROM tms_shipments s
          LEFT JOIN tms_carriers c ON s.carrier_id=c.id
          WHERE s.tenant_id=:tid AND s.status IN ('confirmed','assigned','picked_up','in_transit','delivered')
          ORDER BY CASE s.status WHEN 'confirmed' THEN 0 WHEN 'assigned' THEN 1 ELSE 2 END, s.priority DESC, s.required_delivery_date ASC`, { tid });
        return ok(res, { data: rows });
      }
      case 'dispatch-assign': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        if (!b.shipment_id) return err(res, 'shipment_id required');
        // Create trip for single shipment
        const tripNum = `TRP-${Date.now().toString(36).toUpperCase()}`;
        const trip = await qOne(`INSERT INTO tms_trips (tenant_id,trip_number,trip_type,vehicle_id,driver_id,planned_start,total_shipments,status,created_by,notes)
          VALUES (:tid,:tnum,'delivery',:vid,:did,:ps,1,'dispatched',:uid,:notes) RETURNING *`,
          { tid, tnum: tripNum, vid: b.vehicle_id, did: b.driver_id, ps: b.planned_start || new Date().toISOString(), uid, notes: b.notes });
        if (trip) {
          await qExec(`INSERT INTO tms_trip_shipments (trip_id,shipment_id,stop_sequence) VALUES (:tripId,:sid,1)`, { tripId: (trip as any).id, sid: b.shipment_id });
          await qExec(`UPDATE tms_shipments SET vehicle_id=:vid, driver_id=:did, status='assigned', updated_at=NOW() WHERE id=:sid AND tenant_id=:tid`, { vid: b.vehicle_id, did: b.driver_id, sid: b.shipment_id, tid });
          await qExec(`INSERT INTO tms_shipment_tracking (tenant_id,shipment_id,status,description,performed_by) VALUES (:tid,:sid,'assigned',:desc,:uid)`, { tid, sid: b.shipment_id, desc: `Dispatched to trip ${tripNum}`, uid });
          if (b.vehicle_id) await qExec(`UPDATE fms_vehicles SET status='in_use', updated_at=NOW() WHERE id=:vid AND tenant_id=:tid`, { vid: b.vehicle_id, tid });
          if (b.driver_id) await qExec(`UPDATE fms_drivers SET availability='on_trip', updated_at=NOW() WHERE id=:did AND tenant_id=:tid`, { did: b.driver_id, tid });
        }
        return ok(res, { data: trip, message: `Shipment dispatched to trip ${tripNum}` });
      }

      // ═══════════════════════════════════════
      // SLA PERFORMANCE
      // ═══════════════════════════════════════
      case 'sla-performance': {
        const perf = await qOne(`SELECT
          COUNT(*) as total_shipments,
          COUNT(*) FILTER (WHERE (status='delivered' OR status='pod_received') AND (actual_delivery_date IS NULL OR actual_delivery_date <= required_delivery_date)) as on_time,
          COUNT(*) FILTER (WHERE (status='delivered' OR status='pod_received') AND actual_delivery_date > required_delivery_date) as late,
          ROUND(COUNT(*) FILTER (WHERE (status='delivered' OR status='pod_received') AND (actual_delivery_date IS NULL OR actual_delivery_date <= required_delivery_date))::numeric / NULLIF(COUNT(*) FILTER (WHERE status='delivered' OR status='pod_received'),0) * 100, 1) as on_time_pct,
          ROUND(COUNT(*) FILTER (WHERE (status='delivered' OR status='pod_received') AND actual_delivery_date > required_delivery_date)::numeric / NULLIF(COUNT(*) FILTER (WHERE status='delivered' OR status='pod_received'),0) * 100, 1) as late_pct,
          COALESCE(AVG(EXTRACT(EPOCH FROM (actual_delivery_date::timestamp - order_date::timestamp))/3600) FILTER (WHERE actual_delivery_date IS NOT NULL),0) as avg_delivery_hours
          FROM tms_shipments WHERE tenant_id=:tid AND order_date >= CURRENT_DATE - INTERVAL '30 days'`, { tid });
        return ok(res, { data: perf || { total_shipments: 0, on_time: 0, late: 0, on_time_pct: 0, late_pct: 0, avg_delivery_hours: 0 } });
      }

      default:
        return err(res, `Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error('TMS Enhanced API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

export default handler;
