import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { logAudit } from '@/lib/audit/auditLogger';

let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

const ok = (res: NextApiResponse, data: any) => res.json({ success: true, ...data });
const err = (res: NextApiResponse, msg: string, code = 400) => res.status(code).json({ success: false, error: msg });

const q = async (sql: string, replacements?: any) => {
  if (!sequelize) return [];
  try { const [rows] = await sequelize.query(sql, { replacements }); return rows as any[]; }
  catch (e: any) { console.error('TMS Q:', e.message); return []; }
};
const qOne = async (sql: string, replacements?: any) => {
  const rows = await q(sql, replacements); return rows[0] || null;
};
const qExec = async (sql: string, replacements?: any) => {
  if (!sequelize) return false;
  try { await sequelize.query(sql, { replacements }); return true; }
  catch (e: any) { console.error('TMS Exec:', e.message); return false; }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const tid = (session.user as any).tenantId || null;
    const uid = (session.user as any).id;
    const uname = (session.user as any).name || '';
    const action = (req.query.action as string) || '';
    const b = req.body || {};
    const audit = (a: string, et: string, eid?: any, nv?: any) => logAudit({ tenantId: tid, userId: uid, userName: uname, action: a as any, entityType: et, entityId: eid, newValues: nv, req }).catch(() => {});

    switch (action) {
      // ═══════════════════════════════════════
      // DASHBOARD
      // ═══════════════════════════════════════
      case 'dashboard': {
        const shipments = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='draft') as draft, COUNT(*) FILTER (WHERE status='confirmed') as confirmed, COUNT(*) FILTER (WHERE status='in_transit') as in_transit, COUNT(*) FILTER (WHERE status='delivered') as delivered, COUNT(*) FILTER (WHERE status='cancelled') as cancelled, COALESCE(SUM(total_charge),0) as total_revenue FROM tms_shipments WHERE tenant_id=:tid`, { tid });
        const trips = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='planned') as planned, COUNT(*) FILTER (WHERE status='in_progress') as in_progress, COUNT(*) FILTER (WHERE status='completed') as completed FROM tms_trips WHERE tenant_id=:tid`, { tid });
        const carriers = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active=true) as active FROM tms_carriers WHERE tenant_id=:tid`, { tid });
        const billing = await qOne(`SELECT COUNT(*) as total, COALESCE(SUM(total_amount) FILTER (WHERE payment_status='paid'),0) as paid, COALESCE(SUM(balance) FILTER (WHERE payment_status IN ('unpaid','partial','overdue')),0) as outstanding FROM tms_freight_bills WHERE tenant_id=:tid`, { tid });
        const monthShipments = await q(`SELECT to_char(order_date,'YYYY-MM-DD') as date, COUNT(*) as count FROM tms_shipments WHERE tenant_id=:tid AND order_date >= CURRENT_DATE - INTERVAL '30 days' GROUP BY date ORDER BY date`, { tid });
        const recentShipments = await q(`SELECT s.*, c.carrier_name FROM tms_shipments s LEFT JOIN tms_carriers c ON s.carrier_id=c.id WHERE s.tenant_id=:tid ORDER BY s.created_at DESC LIMIT 10`, { tid });
        return ok(res, { data: { shipments, trips, carriers, billing, monthShipments, recentShipments } });
      }

      // ═══════════════════════════════════════
      // DASHBOARD CHARTS
      // ═══════════════════════════════════════
      case 'dashboard-charts': {
        const shipmentTrend = await q(`SELECT to_char(order_date,'YYYY-MM') as month, COUNT(*) as total, COUNT(*) FILTER (WHERE status='delivered') as delivered, COUNT(*) FILTER (WHERE status='cancelled') as cancelled, COALESCE(SUM(total_charge),0) as revenue FROM tms_shipments WHERE tenant_id=:tid AND order_date >= CURRENT_DATE - INTERVAL '12 months' GROUP BY month ORDER BY month`, { tid });
        const shipmentsByStatus = await q(`SELECT status, COUNT(*) as count FROM tms_shipments WHERE tenant_id=:tid GROUP BY status ORDER BY count DESC`, { tid });
        const shipmentsByType = await q(`SELECT shipment_type, COUNT(*) as count, COALESCE(SUM(total_charge),0) as revenue FROM tms_shipments WHERE tenant_id=:tid GROUP BY shipment_type ORDER BY count DESC`, { tid });
        const shipmentsByPriority = await q(`SELECT priority, COUNT(*) as count FROM tms_shipments WHERE tenant_id=:tid AND order_date >= CURRENT_DATE - INTERVAL '3 months' GROUP BY priority`, { tid });
        const revenueByMonth = await q(`SELECT to_char(order_date,'YYYY-MM') as month, COALESCE(SUM(total_charge),0) as revenue, COALESCE(SUM(freight_charge),0) as freight FROM tms_shipments WHERE tenant_id=:tid AND order_date >= CURRENT_DATE - INTERVAL '12 months' GROUP BY month ORDER BY month`, { tid });
        const tripsByStatus = await q(`SELECT status, COUNT(*) as count FROM tms_trips WHERE tenant_id=:tid GROUP BY status`, { tid });
        const carrierPerformance = await q(`SELECT c.carrier_name, c.carrier_type, COUNT(s.id) as shipments, COALESCE(AVG(c.rating),0) as rating, COALESCE(SUM(s.total_charge),0) as revenue FROM tms_carriers c LEFT JOIN tms_shipments s ON c.id=s.carrier_id WHERE c.tenant_id=:tid GROUP BY c.id, c.carrier_name, c.carrier_type ORDER BY shipments DESC LIMIT 10`, { tid });
        const topRoutes = await q(`SELECT r.route_name, r.distance_km, COUNT(t.id) as trips, COALESCE(SUM(t.total_expense),0) as cost FROM tms_routes r LEFT JOIN tms_trips t ON r.id=t.route_id WHERE r.tenant_id=:tid GROUP BY r.id, r.route_name, r.distance_km ORDER BY trips DESC LIMIT 10`, { tid });
        const billingByStatus = await q(`SELECT payment_status, COUNT(*) as count, COALESCE(SUM(total_amount),0) as amount FROM tms_freight_bills WHERE tenant_id=:tid GROUP BY payment_status`, { tid });
        const deliveryPerformance = await q(`SELECT CASE WHEN actual_delivery_date IS NOT NULL AND required_delivery_date IS NOT NULL AND actual_delivery_date <= required_delivery_date THEN 'on_time' WHEN actual_delivery_date IS NOT NULL AND required_delivery_date IS NOT NULL THEN 'late' WHEN status='delivered' THEN 'on_time' ELSE 'pending' END as perf, COUNT(*) as count FROM tms_shipments WHERE tenant_id=:tid AND status NOT IN ('draft','cancelled') GROUP BY perf`, { tid });
        const weightByMonth = await q(`SELECT to_char(order_date,'YYYY-MM') as month, COALESCE(SUM(total_weight_kg),0) as weight, COALESCE(SUM(total_pieces),0) as pieces FROM tms_shipments WHERE tenant_id=:tid AND order_date >= CURRENT_DATE - INTERVAL '12 months' GROUP BY month ORDER BY month`, { tid });
        return ok(res, { data: { shipmentTrend, shipmentsByStatus, shipmentsByType, shipmentsByPriority, revenueByMonth, tripsByStatus, carrierPerformance, topRoutes, billingByStatus, deliveryPerformance, weightByMonth } });
      }

      // ═══════════════════════════════════════
      // EXPORT
      // ═══════════════════════════════════════
      case 'export': {
        const entity = req.query.entity as string;
        let rows: any[] = [];
        switch (entity) {
          case 'shipments': rows = await q(`SELECT s.shipment_number,s.shipment_type,s.shipper_name,s.consignee_name,s.origin_name,s.destination_name,s.total_weight_kg,s.total_pieces,c.carrier_name,s.freight_charge,s.total_charge,s.priority,s.status,s.order_date FROM tms_shipments s LEFT JOIN tms_carriers c ON s.carrier_id=c.id WHERE s.tenant_id=:tid ORDER BY s.created_at DESC`, { tid }); break;
          case 'trips': rows = await q(`SELECT t.trip_number,t.trip_type,v.vehicle_code,d.full_name as driver,r.route_name,t.total_distance_km,t.total_expense,t.status,t.planned_start FROM tms_trips t LEFT JOIN fms_vehicles v ON t.vehicle_id=v.id LEFT JOIN fms_drivers d ON t.driver_id=d.id LEFT JOIN tms_routes r ON t.route_id=r.id WHERE t.tenant_id=:tid ORDER BY t.created_at DESC`, { tid }); break;
          case 'carriers': rows = await q(`SELECT carrier_code,carrier_name,carrier_type,contact_person,phone,email,rating,on_time_rate,payment_terms FROM tms_carriers WHERE tenant_id=:tid ORDER BY carrier_name`, { tid }); break;
          case 'billing': rows = await q(`SELECT bill_number,bill_type,bill_date,due_date,customer_name,subtotal,tax_amount,total_amount,paid_amount,balance,payment_status,status FROM tms_freight_bills WHERE tenant_id=:tid ORDER BY bill_date DESC`, { tid }); break;
          default: return err(res, 'Unknown entity');
        }
        return ok(res, { data: rows });
      }

      // ═══════════════════════════════════════
      // SHIPMENTS
      // ═══════════════════════════════════════
      case 'shipments': {
        const statusFilter = req.query.status ? `AND s.status=:status` : '';
        const rows = await q(`SELECT s.*, c.carrier_name, v.vehicle_code, v.license_plate, d.full_name as driver_name FROM tms_shipments s LEFT JOIN tms_carriers c ON s.carrier_id=c.id LEFT JOIN fms_vehicles v ON s.vehicle_id=v.id LEFT JOIN fms_drivers d ON s.driver_id=d.id WHERE s.tenant_id=:tid ${statusFilter} ORDER BY s.created_at DESC`, { tid, status: req.query.status });
        return ok(res, { data: rows });
      }
      case 'shipment-detail': {
        const id = req.query.id;
        const s = await qOne(`SELECT s.*, c.carrier_name, v.vehicle_code, d.full_name as driver_name FROM tms_shipments s LEFT JOIN tms_carriers c ON s.carrier_id=c.id LEFT JOIN fms_vehicles v ON s.vehicle_id=v.id LEFT JOIN fms_drivers d ON s.driver_id=d.id WHERE s.id=:id AND s.tenant_id=:tid`, { id, tid });
        if (!s) return err(res, 'Not found', 404);
        const items = await q(`SELECT * FROM tms_shipment_items WHERE shipment_id=:id ORDER BY item_number`, { id });
        const pod = await qOne(`SELECT * FROM tms_proof_of_delivery WHERE shipment_id=:id`, { id });
        const events = await q(`SELECT * FROM tms_trip_events te JOIN tms_trip_shipments ts ON te.trip_id=ts.trip_id WHERE ts.shipment_id=:id ORDER BY te.event_time`, { id });
        return ok(res, { data: { ...s, items, pod, events } });
      }
      case 'create-shipment': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        if (!b.consignee_name && !b.destination_name) return err(res, 'consignee_name atau destination_name wajib');
        const shipNum = b.shipment_number || `SHP-${Date.now().toString(36).toUpperCase()}`;
        const row = await qOne(`INSERT INTO tms_shipments (tenant_id,shipment_number,shipment_type,order_date,required_delivery_date,shipper_name,shipper_phone,shipper_address,consignee_name,consignee_phone,consignee_address,origin_name,origin_address,destination_name,destination_address,total_weight_kg,total_volume_m3,total_pieces,goods_description,goods_value,is_fragile,is_hazardous,carrier_id,route_id,vehicle_id,driver_id,freight_charge,insurance_charge,handling_charge,other_charges,tax_amount,total_charge,priority,status,special_instructions,created_by) VALUES (:tid,:snum,:stype,:odate,:rdate,:shname,:shphone,:shaddr,:cnname,:cnphone,:cnaddr,:oname,:oaddr,:dname,:daddr,:weight,:vol,:pieces,:gdesc,:gval,:fragile,:haz,:cid,:rid,:vid,:did,:freight,:ins,:handling,:other,:tax,:total,:pri,:status,:instructions,:uid) RETURNING *`,
          { tid, snum: shipNum, stype: b.shipment_type || 'standard', odate: b.order_date || new Date().toISOString().slice(0,10), rdate: b.required_delivery_date, shname: b.shipper_name, shphone: b.shipper_phone, shaddr: b.shipper_address, cnname: b.consignee_name, cnphone: b.consignee_phone, cnaddr: b.consignee_address, oname: b.origin_name, oaddr: b.origin_address, dname: b.destination_name, daddr: b.destination_address, weight: b.total_weight_kg || 0, vol: b.total_volume_m3 || 0, pieces: b.total_pieces || 0, gdesc: b.goods_description, gval: b.goods_value || 0, fragile: b.is_fragile || false, haz: b.is_hazardous || false, cid: b.carrier_id, rid: b.route_id, vid: b.vehicle_id, did: b.driver_id, freight: b.freight_charge || 0, ins: b.insurance_charge || 0, handling: b.handling_charge || 0, other: b.other_charges || 0, tax: b.tax_amount || 0, total: b.total_charge || b.freight_charge || 0, pri: b.priority || 'normal', status: b.status || 'draft', instructions: b.special_instructions, uid });
        // Add items
        if (b.items?.length > 0) {
          for (let i = 0; i < b.items.length; i++) {
            const item = b.items[i];
            await qExec(`INSERT INTO tms_shipment_items (tenant_id,shipment_id,item_number,description,sku,quantity,weight_kg,volume_m3,unit_value,total_value,packaging_type,is_fragile) VALUES (:tid,:sid,:inum,:desc,:sku,:qty,:wt,:vol,:uval,:tval,:pkg,:fragile)`,
              { tid, sid: (row as any).id, inum: i+1, desc: item.description, sku: item.sku, qty: item.quantity || 1, wt: item.weight_kg || 0, vol: item.volume_m3 || 0, uval: item.unit_value || 0, tval: item.total_value || 0, pkg: item.packaging_type, fragile: item.is_fragile || false });
          }
        }
        audit('create', 'tms_shipment', row?.id, { shipment_number: shipNum, ...b });
        return ok(res, { data: row, message: 'Shipment dibuat' });
      }
      case 'update-shipment': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const sets: string[] = []; const vals: any = { id: b.id, tid };
        ['status','carrier_id','vehicle_id','driver_id','required_delivery_date','actual_delivery_date','freight_charge','total_charge','payment_status','special_instructions','internal_notes'].forEach(f => {
          if (b[f] !== undefined) { sets.push(`${f}=:${f}`); vals[f] = b[f]; }
        });
        sets.push('updated_at=NOW()');
        await qExec(`UPDATE tms_shipments SET ${sets.join(',')} WHERE id=:id AND tenant_id=:tid`, vals);
        audit('update', 'tms_shipment', b.id, b);
        return ok(res, { message: 'Shipment diperbarui' });
      }

      // ═══════════════════════════════════════
      // CARRIERS
      // ═══════════════════════════════════════
      case 'carriers': {
        const rows = await q(`SELECT c.*, (SELECT COUNT(*) FROM tms_shipments s WHERE s.carrier_id=c.id) as shipment_count FROM tms_carriers c WHERE c.tenant_id=:tid ORDER BY c.carrier_name`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-carrier': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        if (!b.carrier_code || !b.carrier_name) return err(res, 'carrier_code dan carrier_name wajib');
        const dupCar = await qOne(`SELECT id FROM tms_carriers WHERE tenant_id=:tid AND carrier_code=:code`, { tid, code: b.carrier_code });
        if (dupCar) return err(res, 'Kode carrier sudah terdaftar');
        const row = await qOne(`INSERT INTO tms_carriers (tenant_id,carrier_code,carrier_name,carrier_type,contact_person,phone,email,address,npwp,service_areas,vehicle_types,payment_terms,bank_name,bank_account,bank_holder,notes,created_by) VALUES (:tid,:code,:name,:ctype,:contact,:phone,:email,:addr,:npwp,:areas::jsonb,:vtypes::jsonb,:terms,:bank,:acc,:holder,:notes,:uid) RETURNING *`,
          { tid, code: b.carrier_code, name: b.carrier_name, ctype: b.carrier_type || 'external', contact: b.contact_person, phone: b.phone, email: b.email, addr: b.address, npwp: b.npwp, areas: JSON.stringify(b.service_areas || []), vtypes: JSON.stringify(b.vehicle_types || []), terms: b.payment_terms || 'net30', bank: b.bank_name, acc: b.bank_account, holder: b.bank_holder, notes: b.notes, uid });
        audit('create', 'tms_carrier', row?.id, b);
        return ok(res, { data: row, message: 'Carrier ditambahkan' });
      }
      case 'carrier-rates': {
        const cid = req.query.carrier_id;
        const rows = cid 
          ? await q(`SELECT * FROM tms_carrier_rates WHERE carrier_id=:cid AND tenant_id=:tid ORDER BY rate_name`, { cid, tid })
          : await q(`SELECT r.*, c.carrier_name FROM tms_carrier_rates r JOIN tms_carriers c ON r.carrier_id=c.id WHERE r.tenant_id=:tid ORDER BY c.carrier_name, r.rate_name`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-carrier-rate': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const row = await qOne(`INSERT INTO tms_carrier_rates (tenant_id,carrier_id,rate_name,origin_zone,destination_zone,vehicle_type,rate_type,base_rate,min_charge,effective_from,effective_to) VALUES (:tid,:cid,:name,:ozone,:dzone,:vtype,:rtype,:rate,:min,:from,:to) RETURNING *`,
          { tid, cid: b.carrier_id, name: b.rate_name, ozone: b.origin_zone, dzone: b.destination_zone, vtype: b.vehicle_type, rtype: b.rate_type || 'per_kg', rate: b.base_rate || 0, min: b.min_charge || 0, from: b.effective_from, to: b.effective_to });
        audit('create', 'tms_carrier_rate', row?.id, b);
        return ok(res, { data: row, message: 'Rate ditambahkan' });
      }

      // ═══════════════════════════════════════
      // ROUTES
      // ═══════════════════════════════════════
      case 'routes': {
        const rows = await q(`SELECT * FROM tms_routes WHERE tenant_id=:tid AND is_active=true ORDER BY route_code`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-route': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        if (!b.route_code || !b.route_name) return err(res, 'route_code dan route_name wajib');
        const dupRoute = await qOne(`SELECT id FROM tms_routes WHERE tenant_id=:tid AND route_code=:code AND is_active=true`, { tid, code: b.route_code });
        if (dupRoute) return err(res, 'Kode rute sudah terdaftar');
        const row = await qOne(`INSERT INTO tms_routes (tenant_id,route_code,route_name,origin_name,origin_address,destination_name,destination_address,distance_km,estimated_duration_hours,toll_cost,fuel_estimate,route_type,created_by) VALUES (:tid,:code,:name,:oname,:oaddr,:dname,:daddr,:dist,:dur,:toll,:fuel,:rtype,:uid) RETURNING *`,
          { tid, code: b.route_code, name: b.route_name, oname: b.origin_name, oaddr: b.origin_address, dname: b.destination_name, daddr: b.destination_address, dist: b.distance_km || 0, dur: b.estimated_duration_hours || 0, toll: b.toll_cost || 0, fuel: b.fuel_estimate || 0, rtype: b.route_type || 'one_way', uid });
        audit('create', 'tms_route', row?.id, b);
        return ok(res, { data: row, message: 'Rute ditambahkan' });
      }

      // ═══════════════════════════════════════
      // TRIPS
      // ═══════════════════════════════════════
      case 'trips': {
        const rows = await q(`SELECT t.*, v.vehicle_code, v.license_plate, d.full_name as driver_name, r.route_name FROM tms_trips t JOIN fms_vehicles v ON t.vehicle_id=v.id JOIN fms_drivers d ON t.driver_id=d.id LEFT JOIN tms_routes r ON t.route_id=r.id WHERE t.tenant_id=:tid ORDER BY t.created_at DESC`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-trip': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        if (!b.vehicle_id || !b.driver_id) return err(res, 'vehicle_id dan driver_id wajib');
        const tripNum = b.trip_number || `TRP-${Date.now().toString(36).toUpperCase()}`;
        const row = await qOne(`INSERT INTO tms_trips (tenant_id,trip_number,trip_type,vehicle_id,driver_id,helper_driver_id,route_id,carrier_id,planned_start,planned_end,start_location,end_location,total_shipments,status,notes,created_by) VALUES (:tid,:tnum,:ttype,:vid,:did,:hid,:rid,:cid,:pstart,:pend,:sloc,:eloc,:tship,:status,:notes,:uid) RETURNING *`,
          { tid, tnum: tripNum, ttype: b.trip_type || 'delivery', vid: b.vehicle_id, did: b.driver_id, hid: b.helper_driver_id, rid: b.route_id, cid: b.carrier_id, pstart: b.planned_start, pend: b.planned_end, sloc: b.start_location, eloc: b.end_location, tship: b.shipment_ids?.length || 0, status: b.status || 'planned', notes: b.notes, uid });
        // Link shipments to trip
        if (b.shipment_ids?.length > 0 && row) {
          for (let i = 0; i < b.shipment_ids.length; i++) {
            await qExec(`INSERT INTO tms_trip_shipments (trip_id,shipment_id,stop_sequence) VALUES (:tripId,:shipId,:seq)`,
              { tripId: (row as any).id, shipId: b.shipment_ids[i], seq: i + 1 });
            await qExec(`UPDATE tms_shipments SET vehicle_id=:vid, driver_id=:did, status='assigned', updated_at=NOW() WHERE id=:sid AND tenant_id=:tid`,
              { vid: b.vehicle_id, did: b.driver_id, sid: b.shipment_ids[i], tid });
          }
        }
        // Update vehicle & driver status
        await qExec(`UPDATE fms_vehicles SET status='in_use', updated_at=NOW() WHERE id=:vid AND tenant_id=:tid`, { vid: b.vehicle_id, tid });
        await qExec(`UPDATE fms_drivers SET availability='on_trip', updated_at=NOW() WHERE id=:did AND tenant_id=:tid`, { did: b.driver_id, tid });
        audit('create', 'tms_trip', row?.id, { trip_number: tripNum, ...b });
        return ok(res, { data: row, message: 'Trip dibuat' });
      }
      case 'update-trip': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const sets: string[] = []; const vals: any = { id: b.id, tid };
        ['status','actual_start','actual_end','start_odometer','end_odometer','total_distance_km','fuel_used_liters','fuel_cost','toll_cost','parking_cost','meal_allowance','other_expense','total_expense','delivered_shipments','failed_shipments','notes'].forEach(f => {
          if (b[f] !== undefined) { sets.push(`${f}=:${f}`); vals[f] = b[f]; }
        });
        sets.push('updated_at=NOW()');
        await qExec(`UPDATE tms_trips SET ${sets.join(',')} WHERE id=:id AND tenant_id=:tid`, vals);
        // If completed, release vehicle & driver
        if (b.status === 'completed') {
          const trip = await qOne(`SELECT vehicle_id, driver_id FROM tms_trips WHERE id=:id`, { id: b.id });
          if (trip) {
            await qExec(`UPDATE fms_vehicles SET status='available', updated_at=NOW() WHERE id=:vid AND tenant_id=:tid`, { vid: (trip as any).vehicle_id, tid });
            await qExec(`UPDATE fms_drivers SET availability='available', updated_at=NOW() WHERE id=:did AND tenant_id=:tid`, { did: (trip as any).driver_id, tid });
          }
        }
        audit('update', 'tms_trip', b.id, b);
        return ok(res, { message: 'Trip diperbarui' });
      }
      case 'trip-events': {
        const tripId = req.query.trip_id;
        const rows = await q(`SELECT * FROM tms_trip_events WHERE trip_id=:tripId ORDER BY event_time`, { tripId });
        return ok(res, { data: rows });
      }
      case 'add-trip-event': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const row = await qOne(`INSERT INTO tms_trip_events (tenant_id,trip_id,event_type,event_time,location,lat,lng,description,created_by) VALUES (:tid,:tripId,:etype,:etime,:loc,:lat,:lng,:desc,:uid) RETURNING *`,
          { tid, tripId: b.trip_id, etype: b.event_type || 'note', etime: b.event_time || new Date().toISOString(), loc: b.location, lat: b.lat || 0, lng: b.lng || 0, desc: b.description, uid });
        audit('create', 'tms_trip_event', row?.id, b);
        return ok(res, { data: row, message: 'Event ditambahkan' });
      }

      // ═══════════════════════════════════════
      // PROOF OF DELIVERY
      // ═══════════════════════════════════════
      case 'create-pod': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        if (!b.shipment_id) return err(res, 'shipment_id wajib');
        const podNum = `POD-${Date.now().toString(36).toUpperCase()}`;
        const row = await qOne(`INSERT INTO tms_proof_of_delivery (tenant_id,shipment_id,trip_id,pod_number,received_by,receiver_title,received_at,condition,items_received,items_damaged,items_missing,damage_description,receiver_notes,driver_notes,status,created_by) VALUES (:tid,:sid,:tripId,:pnum,:rcvby,:rcvtitle,:rcvat,:cond,:rcvd,:dmg,:miss,:dmgdesc,:rcvnotes,:drvnotes,:status,:uid) RETURNING *`,
          { tid, sid: b.shipment_id, tripId: b.trip_id, pnum: b.pod_number || podNum, rcvby: b.received_by, rcvtitle: b.receiver_title, rcvat: b.received_at || new Date().toISOString(), cond: b.condition || 'good', rcvd: b.items_received || 0, dmg: b.items_damaged || 0, miss: b.items_missing || 0, dmgdesc: b.damage_description, rcvnotes: b.receiver_notes, drvnotes: b.driver_notes, status: b.status || 'confirmed', uid });
        // Update shipment status
        await qExec(`UPDATE tms_shipments SET status='pod_received', actual_delivery_date=CURRENT_DATE, updated_at=NOW() WHERE id=:sid AND tenant_id=:tid`, { sid: b.shipment_id, tid });
        audit('create', 'tms_pod', row?.id, b);
        return ok(res, { data: row, message: 'POD dicatat' });
      }

      // ═══════════════════════════════════════
      // FREIGHT BILLING
      // ═══════════════════════════════════════
      case 'freight-bills': {
        const rows = await q(`SELECT fb.*, c.carrier_name FROM tms_freight_bills fb LEFT JOIN tms_carriers c ON fb.carrier_id=c.id WHERE fb.tenant_id=:tid ORDER BY fb.created_at DESC`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-freight-bill': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const billNum = b.bill_number || `FB-${Date.now().toString(36).toUpperCase()}`;
        const row = await qOne(`INSERT INTO tms_freight_bills (tenant_id,bill_number,bill_type,bill_date,due_date,customer_name,carrier_name,carrier_id,subtotal,tax_amount,discount_amount,total_amount,paid_amount,balance,currency,status,notes,created_by) VALUES (:tid,:bnum,:btype,:bdate,:ddate,:cust,:cname,:cid,:sub,:tax,:disc,:total,:paid,:bal,:curr,:status,:notes,:uid) RETURNING *`,
          { tid, bnum: billNum, btype: b.bill_type || 'invoice_customer', bdate: b.bill_date || new Date().toISOString().slice(0,10), ddate: b.due_date, cust: b.customer_name, cname: b.carrier_name, cid: b.carrier_id, sub: b.subtotal || 0, tax: b.tax_amount || 0, disc: b.discount_amount || 0, total: b.total_amount || 0, paid: b.paid_amount || 0, bal: (parseFloat(b.total_amount||0) - parseFloat(b.paid_amount||0)), curr: b.currency || 'IDR', status: b.status || 'draft', notes: b.notes, uid });
        audit('create', 'tms_freight_bill', row?.id, b);
        return ok(res, { data: row, message: 'Tagihan dibuat' });
      }

      // ═══════════════════════════════════════
      // ZONES & RATE CARDS
      // ═══════════════════════════════════════
      case 'zones': {
        const rows = await q(`SELECT * FROM tms_zones WHERE tenant_id=:tid ORDER BY zone_code`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-zone': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const row = await qOne(`INSERT INTO tms_zones (tenant_id,zone_code,zone_name,zone_type,provinces,cities,postal_codes) VALUES (:tid,:code,:name,:ztype,:prov::jsonb,:cities::jsonb,:postal::jsonb) RETURNING *`,
          { tid, code: b.zone_code, name: b.zone_name, ztype: b.zone_type || 'city', prov: JSON.stringify(b.provinces || []), cities: JSON.stringify(b.cities || []), postal: JSON.stringify(b.postal_codes || []) });
        audit('create', 'tms_zone', row?.id, b);
        return ok(res, { data: row, message: 'Zona ditambahkan' });
      }
      case 'rate-cards': {
        const rows = await q(`SELECT rc.*, oz.zone_name as origin_zone_name, dz.zone_name as dest_zone_name FROM tms_rate_cards rc LEFT JOIN tms_zones oz ON rc.origin_zone_id=oz.id LEFT JOIN tms_zones dz ON rc.destination_zone_id=dz.id WHERE rc.tenant_id=:tid AND rc.is_active=true ORDER BY rc.rate_name`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-rate-card': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const row = await qOne(`INSERT INTO tms_rate_cards (tenant_id,rate_name,origin_zone_id,destination_zone_id,service_type,vehicle_type,rate_type,base_rate,per_unit_rate,min_charge,effective_from,effective_to) VALUES (:tid,:name,:ozid,:dzid,:stype,:vtype,:rtype,:base,:perunit,:min,:from,:to) RETURNING *`,
          { tid, name: b.rate_name, ozid: b.origin_zone_id, dzid: b.destination_zone_id, stype: b.service_type, vtype: b.vehicle_type, rtype: b.rate_type || 'per_kg', base: b.base_rate || 0, perunit: b.per_unit_rate || 0, min: b.min_charge || 0, from: b.effective_from, to: b.effective_to });
        audit('create', 'tms_rate_card', row?.id, b);
        return ok(res, { data: row, message: 'Rate card ditambahkan' });
      }

      // ═══════════════════════════════════════
      // WAREHOUSES
      // ═══════════════════════════════════════
      case 'warehouses': {
        const rows = await q(`SELECT * FROM tms_warehouses WHERE tenant_id=:tid AND is_active=true ORDER BY warehouse_code`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-warehouse': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const row = await qOne(`INSERT INTO tms_warehouses (tenant_id,warehouse_code,warehouse_name,warehouse_type,address,city,province,lat,lng,contact_person,phone,capacity_m3) VALUES (:tid,:code,:name,:wtype,:addr,:city,:prov,:lat,:lng,:contact,:phone,:cap) RETURNING *`,
          { tid, code: b.warehouse_code, name: b.warehouse_name, wtype: b.warehouse_type || 'depot', addr: b.address, city: b.city, prov: b.province, lat: b.lat || 0, lng: b.lng || 0, contact: b.contact_person, phone: b.phone, cap: b.capacity_m3 || 0 });
        audit('create', 'tms_warehouse', row?.id, b);
        return ok(res, { data: row, message: 'Gudang ditambahkan' });
      }

      default:
        return err(res, `Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error('TMS API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

export default handler;
