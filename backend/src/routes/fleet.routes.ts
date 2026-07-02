import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { FleetVehicle, FleetDriver, FleetGpsLocation, FleetMaintenanceSchedule, FleetFuelTransaction, GeofenceLocation } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Vehicles
const vehCtrl = new CrudController(FleetVehicle, 'Vehicle', ['plate_number', 'brand', 'model']);
router.get('/vehicles', authenticate, vehCtrl.list);
router.get('/vehicles/:id', authenticate, vehCtrl.getById);
router.post('/vehicles', authenticate, authorize('admin', 'manager'), vehCtrl.create);
router.put('/vehicles/:id', authenticate, authorize('admin', 'manager'), vehCtrl.update);
router.delete('/vehicles/:id', authenticate, authorize('admin'), vehCtrl.delete);

// Vehicle GPS
router.get('/vehicles/:id/gps', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const locations = await FleetGpsLocation.findAll({
      where: { vehicle_id: req.params.id },
      order: [['recorded_at', 'DESC']], limit: 100,
    });
    sendSuccess(res, locations);
  } catch (error) { sendError(res, 'Failed to get GPS data', 500); }
});
router.post('/vehicles/:id/gps', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const loc = await FleetGpsLocation.create({ vehicle_id: req.params.id, ...req.body });
    sendSuccess(res, loc, 'GPS recorded', 201);
  } catch (error) { sendError(res, 'Failed to record GPS', 500); }
});

// Vehicle Maintenance
router.get('/vehicles/:id/maintenance', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const records = await FleetMaintenanceSchedule.findAll({
      where: { vehicle_id: req.params.id, tenant_id: req.tenantId },
      order: [['scheduled_date', 'DESC']],
    });
    sendSuccess(res, records);
  } catch (error) { sendError(res, 'Failed to get maintenance', 500); }
});

// Vehicle Fuel
router.get('/vehicles/:id/fuel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const records = await FleetFuelTransaction.findAll({
      where: { vehicle_id: req.params.id, tenant_id: req.tenantId },
      order: [['fueled_at', 'DESC']],
    });
    sendSuccess(res, records);
  } catch (error) { sendError(res, 'Failed to get fuel records', 500); }
});

// Drivers
const drvCtrl = new CrudController(FleetDriver, 'Driver', ['name', 'phone', 'license_number']);
router.get('/drivers', authenticate, drvCtrl.list);
router.get('/drivers/:id', authenticate, drvCtrl.getById);
router.post('/drivers', authenticate, authorize('admin', 'manager'), drvCtrl.create);
router.put('/drivers/:id', authenticate, authorize('admin', 'manager'), drvCtrl.update);

// Maintenance Schedules
const mntCtrl = new CrudController(FleetMaintenanceSchedule, 'Maintenance', ['description']);
router.get('/maintenance', authenticate, mntCtrl.list);
router.post('/maintenance', authenticate, authorize('admin', 'manager'), mntCtrl.create);
router.put('/maintenance/:id', authenticate, authorize('admin', 'manager'), mntCtrl.update);

// Fuel Transactions
const fuelCtrl = new CrudController(FleetFuelTransaction, 'FuelTransaction', []);
router.get('/fuel', authenticate, fuelCtrl.list);
router.post('/fuel', authenticate, fuelCtrl.create);

// Geofences
const geoCtrl = new CrudController(GeofenceLocation, 'Geofence', ['name']);
router.get('/geofences', authenticate, geoCtrl.list);
router.post('/geofences', authenticate, authorize('admin', 'manager'), geoCtrl.create);
router.put('/geofences/:id', authenticate, authorize('admin', 'manager'), geoCtrl.update);
router.delete('/geofences/:id', authenticate, authorize('admin'), geoCtrl.delete);

export default router;
