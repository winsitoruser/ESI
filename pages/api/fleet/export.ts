import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

let FleetVehicle: any, FleetDriver: any, FleetFuelTransaction: any;
try {
  const models = require('../../../models');
  FleetVehicle = models.FleetVehicle;
  FleetDriver = models.FleetDriver;
  FleetFuelTransaction = models.FleetFuelTransaction;
} catch (e) { console.warn('Export models not available'); }

import { mockVehicles, mockDrivers } from '@/lib/mockData/fleet';
import { mockFuelTransactions } from '@/lib/mockData/fleetAdvanced';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { type, format } = req.body;

    // Get data from DB or mock
    let data: any[] = [];
    if (type === 'vehicles') {
      if (FleetVehicle) {
        try {
          const where: any = {};
          if (session.user?.tenantId) where.tenantId = session.user.tenantId;
          data = await FleetVehicle.findAll({ where, order: [['vehicleNumber', 'ASC']] });
        } catch (e) { data = mockVehicles; }
      } else { data = mockVehicles; }
    } else if (type === 'drivers') {
      if (FleetDriver) {
        try {
          const where: any = {};
          if (session.user?.tenantId) where.tenantId = session.user.tenantId;
          data = await FleetDriver.findAll({ where, order: [['fullName', 'ASC']] });
        } catch (e) { data = mockDrivers; }
      } else { data = mockDrivers; }
    } else if (type === 'fuel') {
      if (FleetFuelTransaction) {
        try {
          const where: any = {};
          if (session.user?.tenantId) where.tenantId = session.user.tenantId;
          data = await FleetFuelTransaction.findAll({ where, order: [['transactionDate', 'DESC']] });
        } catch (e) { data = mockFuelTransactions; }
      } else { data = mockFuelTransactions; }
    } else {
      return res.status(400).json({ error: 'Invalid type. Use vehicles, drivers, or fuel' });
    }

    if (format === 'csv') {
      let csvContent = '';

      if (type === 'vehicles') {
        csvContent = 'No. Plat,Tipe,Merk,Model,Tahun,Warna,Kepemilikan,Status,Odometer (km),Lokasi\n';
        data.forEach((v: any) => {
          csvContent += `"${v.licensePlate || ''}","${v.vehicleType || ''}","${v.brand || ''}","${v.model || ''}",${v.year || ''},"${v.color || ''}","${v.ownershipType || ''}","${v.status || ''}",${v.currentOdometerKm || 0},"${v.currentLocation || ''}"\n`;
        });
      } else if (type === 'drivers') {
        csvContent = 'Nama,No. Driver,Telepon,Email,Tipe SIM,Total Pengiriman,Safety Score,Status,Availability\n';
        data.forEach((d: any) => {
          csvContent += `"${d.fullName || ''}","${d.driverNumber || ''}","${d.phone || ''}","${d.email || ''}","${d.licenseType || ''}",${d.totalDeliveries || 0},${d.safetyScore || 0},"${d.status || ''}","${d.availabilityStatus || ''}"\n`;
        });
      } else if (type === 'fuel') {
        csvContent = 'Tanggal,Kendaraan,BBM,Liter,Harga/L,Total,SPBU,Pembayaran,No. Kwitansi\n';
        data.forEach((f: any) => {
          csvContent += `"${f.transactionDate || ''}","${f.vehicleId || ''}","${f.fuelType || ''}",${f.quantityLiters || 0},${f.pricePerLiter || 0},${f.totalCost || 0},"${f.fuelStation || ''}","${f.paymentMethod || ''}","${f.receiptNumber || ''}"\n`;
        });
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=fleet-${type}-${Date.now()}.csv`);
      return res.status(200).send('\uFEFF' + csvContent);

    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=fleet-${type}-${Date.now()}.json`);
      return res.status(200).json(data);

    } else {
      return res.status(400).json({ error: 'Invalid format. Use csv or json' });
    }
  } catch (error: any) {
    console.error('Export API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
