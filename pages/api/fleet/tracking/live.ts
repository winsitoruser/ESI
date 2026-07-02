import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let FleetGpsLocation: any, FleetVehicle: any;
try {
  const models = require('../../../../models');
  FleetGpsLocation = models.FleetGpsLocation;
  FleetVehicle = models.FleetVehicle;
} catch (e) { console.warn('GPS models not available'); }

import { mockGPSLocations } from '@/lib/mockData/fleetPhase2';
import { mockVehicles } from '@/lib/mockData/fleet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      // Try DB first
      if (FleetGpsLocation && FleetVehicle) {
        try {
          const sequelize = require('../../../../lib/sequelize');
          const { QueryTypes } = require('sequelize');

          // Get latest GPS location per vehicle using subquery
          const vehicles = await FleetVehicle.findAll({
            where: session.user?.tenantId ? { tenantId: session.user.tenantId } : {},
            attributes: ['id', 'vehicleNumber', 'licensePlate', 'status']
          });

          const vehicleIds = vehicles.map((v: any) => v.id);
          if (vehicleIds.length > 0) {
            const { Op } = require('sequelize');
            const locations = await FleetGpsLocation.findAll({
              where: { vehicleId: { [Op.in]: vehicleIds } },
              order: [['timestamp', 'DESC']]
            });

            // Group by vehicle, take latest
            const latestMap: Record<string, any> = {};
            locations.forEach((loc: any) => {
              if (!latestMap[loc.vehicleId]) latestMap[loc.vehicleId] = loc;
            });

            const data = vehicles.map((v: any) => {
              const loc = latestMap[v.id];
              return {
                vehicleId: v.id,
                vehicleNumber: v.vehicleNumber,
                licensePlate: v.licensePlate,
                status: v.status,
                location: loc ? {
                  latitude: parseFloat(loc.latitude),
                  longitude: parseFloat(loc.longitude),
                  speedKmh: parseFloat(loc.speedKmh || 0),
                  heading: parseFloat(loc.heading || 0),
                  timestamp: loc.timestamp,
                  isMoving: loc.isMoving,
                  isIdle: loc.isIdle,
                  idleDurationMinutes: loc.idleDurationMinutes || 0
                } : null
              };
            }).filter((v: any) => v.location !== null);

            if (data.length > 0) {
              return res.status(200).json({ success: true, data, timestamp: new Date().toISOString() });
            }
          }
        } catch (e: any) {
          console.warn('GPS DB failed:', e.message);
        }
      }

      // Mock fallback
      const vehicleLocations = mockVehicles.map(vehicle => {
        const locations = mockGPSLocations.filter(l => l.vehicleId === vehicle.id);
        const latest = locations.length > 0
          ? locations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
          : null;
        return {
          vehicleId: vehicle.id,
          vehicleNumber: vehicle.vehicleNumber,
          licensePlate: vehicle.licensePlate,
          location: latest ? {
            latitude: latest.latitude, longitude: latest.longitude,
            speedKmh: latest.speedKmh, heading: latest.heading,
            timestamp: latest.timestamp, isMoving: latest.isMoving,
            isIdle: latest.isIdle, idleDurationMinutes: latest.idleDurationMinutes
          } : null
        };
      });

      return res.status(200).json({
        success: true,
        data: vehicleLocations.filter(v => v.location !== null),
        timestamp: new Date().toISOString()
      });

    } else if (req.method === 'POST') {
      // Push GPS location from device/app
      const { vehicleId, driverId, latitude, longitude, speedKmh, heading, accuracyMeters } = req.body;
      if (!vehicleId || !latitude || !longitude) {
        return res.status(400).json({ error: 'vehicleId, latitude, longitude required' });
      }

      if (FleetGpsLocation) {
        try {
          const loc = await FleetGpsLocation.create({
            vehicleId, driverId: driverId || null,
            latitude, longitude, speedKmh: speedKmh || 0,
            heading: heading || 0, accuracyMeters: accuracyMeters || null,
            timestamp: new Date(),
            isMoving: (speedKmh || 0) > 2,
            isIdle: (speedKmh || 0) <= 2
          });
          return res.status(201).json({ success: true, data: loc });
        } catch (e: any) {
          return res.status(500).json({ error: 'Failed to save GPS', details: e.message });
        }
      }

      return res.status(201).json({ success: true, data: { id: `gps-${Date.now()}`, ...req.body } });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Live tracking API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
