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
  catch (e: any) { console.error('FMS Q:', e.message); return []; }
};
const qOne = async (sql: string, replacements?: any) => {
  const rows = await q(sql, replacements); return rows[0] || null;
};
const qExec = async (sql: string, replacements?: any) => {
  if (!sequelize) return false;
  try { await sequelize.query(sql, { replacements }); return true; }
  catch (e: any) { console.error('FMS Exec:', e.message); return false; }
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
        const vehicles = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='available') as available, COUNT(*) FILTER (WHERE status='in_use') as in_use, COUNT(*) FILTER (WHERE status='maintenance') as maintenance, COUNT(*) FILTER (WHERE status='reserved') as reserved, COUNT(*) FILTER (WHERE status='retired') as retired FROM fms_vehicles WHERE tenant_id=:tid AND is_active=true`, { tid });
        const drivers = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='active') as active, COUNT(*) FILTER (WHERE availability='available') as available, COUNT(*) FILTER (WHERE availability='on_trip') as on_trip FROM fms_drivers WHERE tenant_id=:tid AND is_active=true`, { tid });
        const maintenance = await qOne(`SELECT COUNT(*) FILTER (WHERE status='scheduled') as scheduled, COUNT(*) FILTER (WHERE status='in_progress') as in_progress, COUNT(*) FILTER (WHERE status='completed') as completed, COALESCE(SUM(total_cost) FILTER (WHERE status='completed' AND created_at >= date_trunc('month', CURRENT_DATE)), 0) as month_cost FROM fms_maintenance_records WHERE tenant_id=:tid`, { tid });
        const fuel = await qOne(`SELECT COUNT(*) as records, COALESCE(SUM(total_cost), 0) as total_cost, COALESCE(SUM(quantity_liters), 0) as total_liters FROM fms_fuel_records WHERE tenant_id=:tid AND fill_date >= date_trunc('month', CURRENT_DATE)`, { tid });
        const rentals = await qOne(`SELECT COUNT(*) FILTER (WHERE status='active') as active, COUNT(*) FILTER (WHERE status='completed') as completed, COALESCE(SUM(total_amount) FILTER (WHERE status IN ('active','completed')), 0) as revenue FROM fms_rentals WHERE tenant_id=:tid`, { tid });
        const incidents = await qOne(`SELECT COUNT(*) FILTER (WHERE status='open') as open_count, COUNT(*) as total FROM fms_incidents WHERE tenant_id=:tid`, { tid });
        const expiringDocs = await q(`SELECT d.*, CASE WHEN d.entity_type='vehicle' THEN v.vehicle_code ELSE dr.driver_code END as entity_code FROM fms_documents d LEFT JOIN fms_vehicles v ON d.entity_type='vehicle' AND d.entity_id=v.id LEFT JOIN fms_drivers dr ON d.entity_type='driver' AND d.entity_id=dr.id WHERE d.tenant_id=:tid AND d.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND d.status='active' ORDER BY d.expiry_date LIMIT 10`, { tid });
        return ok(res, { data: { vehicles, drivers, maintenance, fuel, rentals, incidents, expiringDocs } });
      }

      // ═══════════════════════════════════════
      // DASHBOARD CHARTS
      // ═══════════════════════════════════════
      case 'dashboard-charts': {
        const costTrend = await q(`SELECT to_char(cost_date,'YYYY-MM') as month, cost_category, COALESCE(SUM(amount),0) as total FROM fms_cost_records WHERE tenant_id=:tid AND cost_date >= CURRENT_DATE - INTERVAL '12 months' GROUP BY month, cost_category ORDER BY month`, { tid });
        const fuelTrend = await q(`SELECT to_char(fill_date,'YYYY-MM') as month, COALESCE(SUM(total_cost),0) as cost, COALESCE(SUM(quantity_liters),0) as liters, COUNT(*) as fills FROM fms_fuel_records WHERE tenant_id=:tid AND fill_date >= CURRENT_DATE - INTERVAL '12 months' GROUP BY month ORDER BY month`, { tid });
        const vehiclesByType = await q(`SELECT vehicle_type, COUNT(*) as count FROM fms_vehicles WHERE tenant_id=:tid AND is_active=true GROUP BY vehicle_type ORDER BY count DESC`, { tid });
        const vehiclesByStatus = await q(`SELECT status, COUNT(*) as count FROM fms_vehicles WHERE tenant_id=:tid AND is_active=true GROUP BY status ORDER BY count DESC`, { tid });
        const maintenanceByCategory = await q(`SELECT category, COUNT(*) as count, COALESCE(SUM(total_cost),0) as cost FROM fms_maintenance_records WHERE tenant_id=:tid AND created_at >= CURRENT_DATE - INTERVAL '6 months' GROUP BY category ORDER BY cost DESC`, { tid });
        const maintenanceByType = await q(`SELECT maintenance_type, COUNT(*) as count, COALESCE(SUM(total_cost),0) as cost FROM fms_maintenance_records WHERE tenant_id=:tid AND created_at >= CURRENT_DATE - INTERVAL '6 months' GROUP BY maintenance_type ORDER BY cost DESC`, { tid });
        const driversByStatus = await q(`SELECT status, COUNT(*) as count FROM fms_drivers WHERE tenant_id=:tid AND is_active=true GROUP BY status`, { tid });
        const driversByAvailability = await q(`SELECT availability, COUNT(*) as count FROM fms_drivers WHERE tenant_id=:tid AND is_active=true GROUP BY availability`, { tid });
        const monthlyMaintenance = await q(`SELECT to_char(created_at,'YYYY-MM') as month, COUNT(*) as count, COALESCE(SUM(total_cost),0) as cost FROM fms_maintenance_records WHERE tenant_id=:tid AND created_at >= CURRENT_DATE - INTERVAL '12 months' GROUP BY month ORDER BY month`, { tid });
        const incidentTrend = await q(`SELECT to_char(incident_date,'YYYY-MM') as month, COUNT(*) as count, COALESCE(SUM(total_cost),0) as cost FROM fms_incidents WHERE tenant_id=:tid AND incident_date >= CURRENT_DATE - INTERVAL '12 months' GROUP BY month ORDER BY month`, { tid });
        const fuelByType = await q(`SELECT fuel_type, COALESCE(SUM(total_cost),0) as cost, COALESCE(SUM(quantity_liters),0) as liters FROM fms_fuel_records WHERE tenant_id=:tid AND fill_date >= CURRENT_DATE - INTERVAL '3 months' GROUP BY fuel_type`, { tid });
        const topCostVehicles = await q(`SELECT v.vehicle_code, v.license_plate, v.vehicle_type, COALESCE(SUM(c.amount),0) as total_cost FROM fms_vehicles v LEFT JOIN fms_cost_records c ON v.id=c.vehicle_id AND c.cost_date >= CURRENT_DATE - INTERVAL '3 months' WHERE v.tenant_id=:tid AND v.is_active=true GROUP BY v.id, v.vehicle_code, v.license_plate, v.vehicle_type ORDER BY total_cost DESC LIMIT 10`, { tid });
        return ok(res, { data: { costTrend, fuelTrend, vehiclesByType, vehiclesByStatus, maintenanceByCategory, maintenanceByType, driversByStatus, driversByAvailability, monthlyMaintenance, incidentTrend, fuelByType, topCostVehicles } });
      }

      // ═══════════════════════════════════════
      // EXPORT
      // ═══════════════════════════════════════
      case 'export': {
        const entity = req.query.entity as string;
        let rows: any[] = [];
        switch (entity) {
          case 'vehicles': rows = await q(`SELECT vehicle_code,license_plate,vehicle_type,vehicle_category,brand,model,year,fuel_type,ownership_type,status,current_odometer_km,created_at FROM fms_vehicles WHERE tenant_id=:tid AND is_active=true ORDER BY vehicle_code`, { tid }); break;
          case 'drivers': rows = await q(`SELECT driver_code,full_name,phone,email,license_number,license_type,license_expiry_date,employment_type,status,availability,total_trips,total_distance_km,safety_score FROM fms_drivers WHERE tenant_id=:tid AND is_active=true ORDER BY driver_code`, { tid }); break;
          case 'maintenance': rows = await q(`SELECT m.work_order_number,v.vehicle_code,v.license_plate,m.maintenance_type,m.category,m.priority,m.vendor_name,m.total_cost,m.status,m.created_at FROM fms_maintenance_records m JOIN fms_vehicles v ON m.vehicle_id=v.id WHERE m.tenant_id=:tid ORDER BY m.created_at DESC`, { tid }); break;
          case 'fuel': rows = await q(`SELECT f.fill_date,v.vehicle_code,v.license_plate,d.full_name as driver,f.fuel_type,f.quantity_liters,f.price_per_liter,f.total_cost,f.odometer_reading,f.station_name,f.payment_method FROM fms_fuel_records f JOIN fms_vehicles v ON f.vehicle_id=v.id LEFT JOIN fms_drivers d ON f.driver_id=d.id WHERE f.tenant_id=:tid ORDER BY f.fill_date DESC`, { tid }); break;
          case 'costs': rows = await q(`SELECT c.cost_date,v.vehicle_code,c.cost_category,c.description,c.amount,c.receipt_number FROM fms_cost_records c JOIN fms_vehicles v ON c.vehicle_id=v.id WHERE c.tenant_id=:tid ORDER BY c.cost_date DESC`, { tid }); break;
          default: return err(res, 'Unknown entity');
        }
        return ok(res, { data: rows });
      }

      // ═══════════════════════════════════════
      // VEHICLES
      // ═══════════════════════════════════════
      case 'vehicles': {
        const rows = await q(`SELECT v.*, d.full_name as driver_name FROM fms_vehicles v LEFT JOIN fms_drivers d ON v.assigned_driver_id = d.id WHERE v.tenant_id=:tid AND v.is_active=true ORDER BY v.vehicle_code`, { tid });
        return ok(res, { data: rows });
      }
      case 'vehicle-detail': {
        const id = req.query.id;
        const v = await qOne(`SELECT * FROM fms_vehicles WHERE id=:id AND tenant_id=:tid`, { id, tid });
        if (!v) return err(res, 'Not found', 404);
        const maint = await q(`SELECT * FROM fms_maintenance_records WHERE vehicle_id=:id AND tenant_id=:tid ORDER BY created_at DESC LIMIT 10`, { id, tid });
        const fuel = await q(`SELECT * FROM fms_fuel_records WHERE vehicle_id=:id AND tenant_id=:tid ORDER BY fill_date DESC LIMIT 10`, { id, tid });
        const docs = await q(`SELECT * FROM fms_documents WHERE entity_type='vehicle' AND entity_id=:id AND tenant_id=:tid ORDER BY expiry_date`, { id, tid });
        const costs = await q(`SELECT cost_category, SUM(amount) as total FROM fms_cost_records WHERE vehicle_id=:id AND tenant_id=:tid GROUP BY cost_category ORDER BY total DESC`, { id, tid });
        return ok(res, { data: { ...v, maintenance: maint, fuel, documents: docs, costBreakdown: costs } });
      }
      case 'create-vehicle': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        if (!b.vehicle_code || !b.license_plate) return err(res, 'vehicle_code dan license_plate wajib');
        const dupVeh = await qOne(`SELECT id FROM fms_vehicles WHERE tenant_id=:tid AND (vehicle_code=:code OR license_plate=:plate) AND is_active=true`, { tid, code: b.vehicle_code, plate: b.license_plate });
        if (dupVeh) return err(res, 'Kode kendaraan atau plat nomor sudah terdaftar');
        const row = await qOne(`INSERT INTO fms_vehicles (tenant_id,vehicle_code,license_plate,vehicle_type,vehicle_category,brand,model,year,color,engine_type,fuel_type,transmission,seating_capacity,max_weight_kg,max_volume_m3,fuel_tank_capacity_l,ownership_type,purchase_price,registration_number,registration_expiry,insurance_provider,insurance_expiry,status,notes,created_by) VALUES (:tid,:code,:plate,:vtype,:vcat,:brand,:model,:year,:color,:etype,:ftype,:trans,:seats,:maxw,:maxv,:ftank,:owntype,:pprice,:regnum,:regexp,:insprov,:insexp,:status,:notes,:uid) RETURNING *`,
          { tid, code: b.vehicle_code, plate: b.license_plate, vtype: b.vehicle_type || 'truck', vcat: b.vehicle_category || 'delivery', brand: b.brand, model: b.model, year: b.year, color: b.color, etype: b.engine_type, ftype: b.fuel_type, trans: b.transmission, seats: b.seating_capacity, maxw: b.max_weight_kg || 0, maxv: b.max_volume_m3 || 0, ftank: b.fuel_tank_capacity_l || 0, owntype: b.ownership_type || 'owned', pprice: b.purchase_price || 0, regnum: b.registration_number, regexp: b.registration_expiry, insprov: b.insurance_provider, insexp: b.insurance_expiry, status: b.status || 'available', notes: b.notes, uid });
        audit('create', 'fms_vehicle', row?.id, b);
        return ok(res, { data: row, message: 'Kendaraan ditambahkan' });
      }
      case 'update-vehicle': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const sets: string[] = []; const vals: any = { id: b.id, tid };
        const fields = ['vehicle_code','license_plate','vehicle_type','vehicle_category','brand','model','year','color','engine_type','fuel_type','transmission','seating_capacity','max_weight_kg','max_volume_m3','fuel_tank_capacity_l','ownership_type','purchase_price','registration_number','registration_expiry','insurance_provider','insurance_expiry','status','condition_rating','current_odometer_km','notes','assigned_driver_id'];
        fields.forEach(f => { if (b[f] !== undefined) { sets.push(`${f}=:${f}`); vals[f] = b[f]; } });
        if (sets.length === 0) return err(res, 'No fields to update');
        sets.push('updated_at=NOW()');
        await qExec(`UPDATE fms_vehicles SET ${sets.join(',')} WHERE id=:id AND tenant_id=:tid`, vals);
        audit('update', 'fms_vehicle', b.id, b);
        return ok(res, { message: 'Kendaraan diperbarui' });
      }

      // ═══════════════════════════════════════
      // DRIVERS
      // ═══════════════════════════════════════
      case 'drivers': {
        const rows = await q(`SELECT d.*, v.vehicle_code, v.license_plate as assigned_vehicle_plate FROM fms_drivers d LEFT JOIN fms_vehicles v ON d.assigned_vehicle_id = v.id WHERE d.tenant_id=:tid AND d.is_active=true ORDER BY d.driver_code`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-driver': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        if (!b.driver_code || !b.full_name) return err(res, 'driver_code dan full_name wajib');
        const dupDrv = await qOne(`SELECT id FROM fms_drivers WHERE tenant_id=:tid AND driver_code=:code AND is_active=true`, { tid, code: b.driver_code });
        if (dupDrv) return err(res, 'Kode driver sudah terdaftar');
        const row = await qOne(`INSERT INTO fms_drivers (tenant_id,driver_code,full_name,phone,email,license_number,license_type,license_expiry_date,employment_type,hire_date,base_salary,allowance_per_trip,status,notes,created_by) VALUES (:tid,:code,:name,:phone,:email,:licnum,:lictype,:licexp,:emptype,:hire,:salary,:allowance,:status,:notes,:uid) RETURNING *`,
          { tid, code: b.driver_code, name: b.full_name, phone: b.phone, email: b.email, licnum: b.license_number, lictype: b.license_type, licexp: b.license_expiry_date, emptype: b.employment_type || 'permanent', hire: b.hire_date, salary: b.base_salary || 0, allowance: b.allowance_per_trip || 0, status: b.status || 'active', notes: b.notes, uid });
        audit('create', 'fms_driver', row?.id, b);
        return ok(res, { data: row, message: 'Driver ditambahkan' });
      }
      case 'update-driver': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const sets: string[] = []; const vals: any = { id: b.id, tid };
        ['full_name','phone','email','license_number','license_type','license_expiry_date','employment_type','base_salary','allowance_per_trip','status','availability','assigned_vehicle_id','notes'].forEach(f => {
          if (b[f] !== undefined) { sets.push(`${f}=:${f}`); vals[f] = b[f]; }
        });
        if (sets.length === 0) return err(res, 'No fields');
        sets.push('updated_at=NOW()');
        await qExec(`UPDATE fms_drivers SET ${sets.join(',')} WHERE id=:id AND tenant_id=:tid`, vals);
        audit('update', 'fms_driver', b.id, b);
        return ok(res, { message: 'Driver diperbarui' });
      }

      // ═══════════════════════════════════════
      // MAINTENANCE
      // ═══════════════════════════════════════
      case 'maintenance-records': {
        const rows = await q(`SELECT m.*, v.vehicle_code, v.license_plate FROM fms_maintenance_records m JOIN fms_vehicles v ON m.vehicle_id=v.id WHERE m.tenant_id=:tid ORDER BY m.created_at DESC`, { tid });
        return ok(res, { data: rows });
      }
      case 'maintenance-schedules': {
        const rows = await q(`SELECT s.*, v.vehicle_code, v.license_plate FROM fms_maintenance_schedules s JOIN fms_vehicles v ON s.vehicle_id=v.id WHERE s.tenant_id=:tid AND s.is_active=true ORDER BY s.next_due_at`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-maintenance': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        if (!b.vehicle_id) return err(res, 'vehicle_id wajib');
        const woNum = `WO-${Date.now().toString(36).toUpperCase()}`;
        const row = await qOne(`INSERT INTO fms_maintenance_records (tenant_id,vehicle_id,work_order_number,maintenance_type,category,priority,description,vendor_name,odometer_at_service,parts_cost,labor_cost,other_cost,total_cost,status,created_by) VALUES (:tid,:vid,:wo,:mtype,:cat,:pri,:desc,:vendor,:odo,:parts,:labor,:other,:total,:status,:uid) RETURNING *`,
          { tid, vid: b.vehicle_id, wo: b.work_order_number || woNum, mtype: b.maintenance_type || 'general', cat: b.category || 'preventive', pri: b.priority || 'medium', desc: b.description, vendor: b.vendor_name, odo: b.odometer_at_service || 0, parts: b.parts_cost || 0, labor: b.labor_cost || 0, other: b.other_cost || 0, total: (parseFloat(b.parts_cost||0) + parseFloat(b.labor_cost||0) + parseFloat(b.other_cost||0)), status: b.status || 'scheduled', uid });
        audit('create', 'fms_maintenance', row?.id, b);
        return ok(res, { data: row, message: 'Work order dibuat' });
      }
      case 'update-maintenance': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const sets: string[] = []; const vals: any = { id: b.id, tid };
        ['maintenance_type','category','priority','description','vendor_name','parts_cost','labor_cost','other_cost','total_cost','status','completed_at','notes'].forEach(f => {
          if (b[f] !== undefined) { sets.push(`${f}=:${f}`); vals[f] = b[f]; }
        });
        sets.push('updated_at=NOW()');
        await qExec(`UPDATE fms_maintenance_records SET ${sets.join(',')} WHERE id=:id AND tenant_id=:tid`, vals);
        audit('update', 'fms_maintenance', b.id, b);
        return ok(res, { message: 'Work order diperbarui' });
      }

      // ═══════════════════════════════════════
      // FUEL
      // ═══════════════════════════════════════
      case 'fuel-records': {
        const rows = await q(`SELECT f.*, v.vehicle_code, v.license_plate, d.full_name as driver_name FROM fms_fuel_records f JOIN fms_vehicles v ON f.vehicle_id=v.id LEFT JOIN fms_drivers d ON f.driver_id=d.id WHERE f.tenant_id=:tid ORDER BY f.fill_date DESC`, { tid });
        return ok(res, { data: rows });
      }
      case 'fuel-summary': {
        const rows = await q(`SELECT v.vehicle_code, v.license_plate, COUNT(f.id) as fill_count, COALESCE(SUM(f.quantity_liters),0) as total_liters, COALESCE(SUM(f.total_cost),0) as total_cost, COALESCE(AVG(f.consumption_rate),0) as avg_consumption FROM fms_vehicles v LEFT JOIN fms_fuel_records f ON v.id=f.vehicle_id AND f.fill_date >= date_trunc('month', CURRENT_DATE) WHERE v.tenant_id=:tid AND v.is_active=true GROUP BY v.id, v.vehicle_code, v.license_plate ORDER BY total_cost DESC`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-fuel-record': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        if (!b.vehicle_id) return err(res, 'vehicle_id wajib');
        const totalCost = (parseFloat(b.quantity_liters||0) * parseFloat(b.price_per_liter||0));
        const row = await qOne(`INSERT INTO fms_fuel_records (tenant_id,vehicle_id,driver_id,fill_date,fuel_type,quantity_liters,price_per_liter,total_cost,odometer_reading,fill_type,station_name,payment_method,notes,created_by) VALUES (:tid,:vid,:did,:fdate,:ftype,:qty,:price,:total,:odo,:filltype,:station,:payment,:notes,:uid) RETURNING *`,
          { tid, vid: b.vehicle_id, did: b.driver_id, fdate: b.fill_date || new Date().toISOString(), ftype: b.fuel_type || 'diesel', qty: b.quantity_liters || 0, price: b.price_per_liter || 0, total: totalCost, odo: b.odometer_reading || 0, filltype: b.fill_type || 'full_tank', station: b.station_name, payment: b.payment_method || 'cash', notes: b.notes, uid });
        // auto-create cost record
        if (row) {
          await qExec(`INSERT INTO fms_cost_records (tenant_id,vehicle_id,driver_id,cost_category,reference_type,reference_id,cost_date,amount,description,created_by) VALUES (:tid,:vid,:did,'fuel','fuel_record',:rid,:cdate,:amt,'BBM: ' || :qty || 'L',:uid)`,
            { tid, vid: b.vehicle_id, did: b.driver_id, rid: (row as any).id, cdate: b.fill_date || new Date().toISOString().slice(0,10), amt: totalCost, qty: b.quantity_liters || '0', uid });
        }
        audit('create', 'fms_fuel', row?.id, b);
        return ok(res, { data: row, message: 'Pengisian BBM dicatat' });
      }

      // ═══════════════════════════════════════
      // RENTALS
      // ═══════════════════════════════════════
      case 'rentals': {
        const rows = await q(`SELECT r.*, v.vehicle_code, v.license_plate, v.brand, v.model as vehicle_model, d.full_name as driver_name FROM fms_rentals r JOIN fms_vehicles v ON r.vehicle_id=v.id LEFT JOIN fms_drivers d ON r.driver_id=d.id WHERE r.tenant_id=:tid ORDER BY r.created_at DESC`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-rental': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        if (!b.vehicle_id || !b.start_date || !b.end_date) return err(res, 'vehicle_id, start_date, end_date wajib');
        const rentalNum = `RNT-${Date.now().toString(36).toUpperCase()}`;
        const row = await qOne(`INSERT INTO fms_rentals (tenant_id,rental_number,rental_type,vehicle_id,driver_id,customer_name,customer_phone,customer_company,contract_type,start_date,end_date,pickup_location,return_location,rate_type,rate_amount,include_driver,include_fuel,deposit_amount,subtotal,tax_amount,total_amount,status,notes,created_by) VALUES (:tid,:rnum,:rtype,:vid,:did,:cname,:cphone,:ccompany,:ctype,:start,:end,:pickup,:ret,:ratetype,:rate,:incdriver,:incfuel,:deposit,:sub,:tax,:total,:status,:notes,:uid) RETURNING *`,
          { tid, rnum: b.rental_number || rentalNum, rtype: b.rental_type || 'rent_out', vid: b.vehicle_id, did: b.driver_id, cname: b.customer_name, cphone: b.customer_phone, ccompany: b.customer_company, ctype: b.contract_type || 'daily', start: b.start_date, end: b.end_date, pickup: b.pickup_location, ret: b.return_location, ratetype: b.rate_type || 'per_day', rate: b.rate_amount || 0, incdriver: b.include_driver || false, incfuel: b.include_fuel || false, deposit: b.deposit_amount || 0, sub: b.subtotal || b.rate_amount || 0, tax: b.tax_amount || 0, total: b.total_amount || b.rate_amount || 0, status: b.status || 'confirmed', notes: b.notes, uid });
        // Mark vehicle as reserved
        if (row) await qExec(`UPDATE fms_vehicles SET status='reserved', updated_at=NOW() WHERE id=:vid AND tenant_id=:tid`, { vid: b.vehicle_id, tid });
        audit('create', 'fms_rental', row?.id, b);
        return ok(res, { data: row, message: 'Kontrak rental dibuat' });
      }
      case 'update-rental': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const sets: string[] = []; const vals: any = { id: b.id, tid };
        ['status','actual_return_date','end_odometer','penalty_amount','payment_status','notes'].forEach(f => {
          if (b[f] !== undefined) { sets.push(`${f}=:${f}`); vals[f] = b[f]; }
        });
        sets.push('updated_at=NOW()');
        await qExec(`UPDATE fms_rentals SET ${sets.join(',')} WHERE id=:id AND tenant_id=:tid`, vals);
        // If completed, release vehicle
        if (b.status === 'completed') {
          const rental = await qOne(`SELECT vehicle_id FROM fms_rentals WHERE id=:id`, { id: b.id });
          if (rental) await qExec(`UPDATE fms_vehicles SET status='available', updated_at=NOW() WHERE id=:vid AND tenant_id=:tid`, { vid: (rental as any).vehicle_id, tid });
        }
        audit('update', 'fms_rental', b.id, b);
        return ok(res, { message: 'Rental diperbarui' });
      }

      // ═══════════════════════════════════════
      // INSPECTIONS
      // ═══════════════════════════════════════
      case 'inspections': {
        const rows = await q(`SELECT i.*, v.vehicle_code, v.license_plate, d.full_name as driver_name FROM fms_inspections i JOIN fms_vehicles v ON i.vehicle_id=v.id LEFT JOIN fms_drivers d ON i.driver_id=d.id WHERE i.tenant_id=:tid ORDER BY i.inspection_date DESC`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-inspection': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        if (!b.vehicle_id) return err(res, 'vehicle_id wajib');
        const checklist = b.checklist_data || [];
        const passed = checklist.filter((c: any) => c.status === 'pass').length;
        const failed = checklist.filter((c: any) => c.status === 'fail').length;
        const row = await qOne(`INSERT INTO fms_inspections (tenant_id,vehicle_id,driver_id,inspection_type,inspection_date,odometer_reading,overall_status,items_checked,items_passed,items_failed,checklist_data,defects_found,inspector_name,follow_up_required,notes,created_by) VALUES (:tid,:vid,:did,:itype,:idate,:odo,:ostatus,:checked,:passed,:failed,:checklist::jsonb,:defects::jsonb,:inspector,:followup,:notes,:uid) RETURNING *`,
          { tid, vid: b.vehicle_id, did: b.driver_id, itype: b.inspection_type || 'pre_trip', idate: b.inspection_date || new Date().toISOString(), odo: b.odometer_reading || 0, ostatus: failed > 0 ? 'fail' : 'pass', checked: checklist.length, passed, failed, checklist: JSON.stringify(checklist), defects: JSON.stringify(b.defects_found || []), inspector: b.inspector_name, followup: failed > 0, notes: b.notes, uid });
        audit('create', 'fms_inspection', row?.id, b);
        return ok(res, { data: row, message: 'Inspeksi dicatat' });
      }

      // ═══════════════════════════════════════
      // INCIDENTS
      // ═══════════════════════════════════════
      case 'incidents': {
        const rows = await q(`SELECT i.*, v.vehicle_code, v.license_plate, d.full_name as driver_name FROM fms_incidents i JOIN fms_vehicles v ON i.vehicle_id=v.id LEFT JOIN fms_drivers d ON i.driver_id=d.id WHERE i.tenant_id=:tid ORDER BY i.incident_date DESC`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-incident': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        if (!b.vehicle_id) return err(res, 'vehicle_id wajib');
        const incNum = `INC-${Date.now().toString(36).toUpperCase()}`;
        const row = await qOne(`INSERT INTO fms_incidents (tenant_id,incident_number,vehicle_id,driver_id,incident_type,severity,incident_date,location,description,repair_cost,total_cost,status,created_by) VALUES (:tid,:num,:vid,:did,:itype,:sev,:idate,:loc,:desc,:repair,:total,'open',:uid) RETURNING *`,
          { tid, num: b.incident_number || incNum, vid: b.vehicle_id, did: b.driver_id, itype: b.incident_type || 'accident', sev: b.severity || 'minor', idate: b.incident_date || new Date().toISOString(), loc: b.location, desc: b.description, repair: b.repair_cost || 0, total: b.total_cost || b.repair_cost || 0, uid });
        audit('create', 'fms_incident', row?.id, b);
        return ok(res, { data: row, message: 'Insiden dilaporkan' });
      }

      // ═══════════════════════════════════════
      // COSTS
      // ═══════════════════════════════════════
      case 'cost-records': {
        const rows = await q(`SELECT c.*, v.vehicle_code, v.license_plate FROM fms_cost_records c JOIN fms_vehicles v ON c.vehicle_id=v.id WHERE c.tenant_id=:tid ORDER BY c.cost_date DESC`, { tid });
        return ok(res, { data: rows });
      }
      case 'cost-summary': {
        const byCategory = await q(`SELECT cost_category, COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM fms_cost_records WHERE tenant_id=:tid AND cost_date >= date_trunc('month', CURRENT_DATE) GROUP BY cost_category ORDER BY total DESC`, { tid });
        const byVehicle = await q(`SELECT v.vehicle_code, v.license_plate, COALESCE(SUM(c.amount),0) as total FROM fms_vehicles v LEFT JOIN fms_cost_records c ON v.id=c.vehicle_id AND c.cost_date >= date_trunc('month', CURRENT_DATE) WHERE v.tenant_id=:tid AND v.is_active=true GROUP BY v.id, v.vehicle_code, v.license_plate ORDER BY total DESC LIMIT 10`, { tid });
        const monthly = await q(`SELECT to_char(cost_date, 'YYYY-MM') as month, COALESCE(SUM(amount),0) as total FROM fms_cost_records WHERE tenant_id=:tid AND cost_date >= CURRENT_DATE - INTERVAL '6 months' GROUP BY month ORDER BY month`, { tid });
        return ok(res, { data: { byCategory, byVehicle, monthly } });
      }
      case 'create-cost': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        if (!b.vehicle_id) return err(res, 'vehicle_id wajib');
        if (!b.amount || parseFloat(b.amount) <= 0) return err(res, 'amount harus lebih dari 0');
        const row = await qOne(`INSERT INTO fms_cost_records (tenant_id,vehicle_id,driver_id,cost_category,cost_subcategory,cost_date,amount,description,receipt_number,created_by) VALUES (:tid,:vid,:did,:cat,:subcat,:cdate,:amt,:desc,:receipt,:uid) RETURNING *`,
          { tid, vid: b.vehicle_id, did: b.driver_id, cat: b.cost_category || 'other', subcat: b.cost_subcategory, cdate: b.cost_date || new Date().toISOString().slice(0,10), amt: b.amount || 0, desc: b.description, receipt: b.receipt_number, uid });
        audit('create', 'fms_cost', row?.id, b);
        return ok(res, { data: row, message: 'Biaya dicatat' });
      }

      // ═══════════════════════════════════════
      // DOCUMENTS
      // ═══════════════════════════════════════
      case 'documents': {
        const rows = await q(`SELECT d.*, CASE WHEN d.entity_type='vehicle' THEN v.vehicle_code ELSE dr.driver_code END as entity_code, CASE WHEN d.entity_type='vehicle' THEN v.license_plate ELSE dr.full_name END as entity_name FROM fms_documents d LEFT JOIN fms_vehicles v ON d.entity_type='vehicle' AND d.entity_id=v.id LEFT JOIN fms_drivers dr ON d.entity_type='driver' AND d.entity_id=dr.id WHERE d.tenant_id=:tid ORDER BY d.expiry_date`, { tid });
        return ok(res, { data: rows });
      }
      case 'create-document': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const row = await qOne(`INSERT INTO fms_documents (tenant_id,entity_type,entity_id,document_type,document_number,issued_date,expiry_date,issuing_authority,reminder_days,notes) VALUES (:tid,:etype,:eid,:dtype,:dnum,:issued,:expiry,:authority,:reminder,:notes) RETURNING *`,
          { tid, etype: b.entity_type, eid: b.entity_id, dtype: b.document_type, dnum: b.document_number, issued: b.issued_date, expiry: b.expiry_date, authority: b.issuing_authority, reminder: b.reminder_days || 30, notes: b.notes });
        audit('create', 'fms_document', row?.id, b);
        return ok(res, { data: row, message: 'Dokumen ditambahkan' });
      }

      // ═══════════════════════════════════════
      // ASSIGNMENTS
      // ═══════════════════════════════════════
      case 'assign-vehicle': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        if (!b.vehicle_id || !b.driver_id) return err(res, 'vehicle_id dan driver_id wajib');
        // Release old assignment
        await qExec(`UPDATE fms_vehicle_assignments SET status='released', released_date=CURRENT_DATE, updated_at=NOW() WHERE vehicle_id=:vid AND status='active' AND tenant_id=:tid`, { vid: b.vehicle_id, tid });
        // Create new
        await qExec(`INSERT INTO fms_vehicle_assignments (tenant_id,vehicle_id,driver_id,assigned_date,start_odometer,reason,created_by) VALUES (:tid,:vid,:did,CURRENT_DATE,:odo,:reason,:uid)`,
          { tid, vid: b.vehicle_id, did: b.driver_id, odo: b.start_odometer || 0, reason: b.reason, uid });
        // Update vehicle & driver
        await qExec(`UPDATE fms_vehicles SET assigned_driver_id=:did, updated_at=NOW() WHERE id=:vid AND tenant_id=:tid`, { vid: b.vehicle_id, did: b.driver_id, tid });
        await qExec(`UPDATE fms_drivers SET assigned_vehicle_id=:vid, updated_at=NOW() WHERE id=:did AND tenant_id=:tid`, { vid: b.vehicle_id, did: b.driver_id, tid });
        audit('assign', 'fms_vehicle', b.vehicle_id, { driver_id: b.driver_id });
        return ok(res, { message: 'Kendaraan di-assign ke driver' });
      }

      default:
        return err(res, `Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error('FMS API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

export default handler;
