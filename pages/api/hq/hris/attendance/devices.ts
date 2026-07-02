import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

let AttendanceDevice: any, Branch: any;
try {
  const models = require('../../../../../models');
  AttendanceDevice = models.AttendanceDevice;
  Branch = models.Branch;
} catch (e) {
  console.warn('Models not available for attendance devices');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET': return await getDevices(req, res, session);
      case 'POST': return await createDevice(req, res, session);
      case 'PUT': return await updateDevice(req, res, session);
      case 'DELETE': return await deleteDevice(req, res, session);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Attendance Devices API Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
}

async function getDevices(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { branchId, status, deviceType, page = '1', limit = '20' } = req.query;
  const tenantId = session.user.tenantId;

  if (!AttendanceDevice) {
    return res.status(200).json({
      success: true,
      data: getMockDevices(),
      pagination: { total: 4, page: 1, limit: 20, totalPages: 1 }
    });
  }

  const where: any = { tenantId };
  if (branchId) where.branchId = branchId;
  if (status) where.status = status;
  if (deviceType) where.deviceType = deviceType;

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const { rows, count } = await AttendanceDevice.findAndCountAll({
    where,
    include: [
      { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit as string),
    offset
  });

  return res.status(200).json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(count / parseInt(limit as string))
    }
  });
}

async function createDevice(req: NextApiRequest, res: NextApiResponse, session: any) {
  const {
    branchId, deviceName, deviceType, deviceBrand, deviceModel,
    serialNumber, ipAddress, port, communicationKey, connectionType,
    apiEndpoint, apiKey, webhookSecret, syncMode, syncInterval,
    maxCapacity, firmwareVersion, location, notes, settings
  } = req.body;

  if (!branchId || !deviceName || !deviceType) {
    return res.status(400).json({
      success: false,
      error: 'branchId, deviceName, and deviceType are required'
    });
  }

  if (!AttendanceDevice) {
    return res.status(200).json({ success: true, message: 'Device created (mock)', data: { id: 'mock-id' } });
  }

  const device = await AttendanceDevice.create({
    tenantId: session.user.tenantId,
    branchId, deviceName, deviceType, deviceBrand, deviceModel,
    serialNumber, ipAddress, port: port || 4370,
    communicationKey, connectionType: connectionType || 'tcp',
    apiEndpoint, apiKey, webhookSecret,
    syncMode: syncMode || 'push',
    syncInterval: syncInterval || 5,
    maxCapacity, firmwareVersion, location, notes,
    settings: settings || {},
    status: 'active'
  });

  return res.status(201).json({ success: true, data: device });
}

async function updateDevice(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, ...updateData } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Device id is required' });
  }

  if (!AttendanceDevice) {
    return res.status(200).json({ success: true, message: 'Device updated (mock)' });
  }

  const device = await AttendanceDevice.findOne({
    where: { id, tenantId: session.user.tenantId }
  });

  if (!device) {
    return res.status(404).json({ success: false, error: 'Device not found' });
  }

  await device.update(updateData);
  return res.status(200).json({ success: true, data: device });
}

async function deleteDevice(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Device id is required' });
  }

  if (!AttendanceDevice) {
    return res.status(200).json({ success: true, message: 'Device deleted (mock)' });
  }

  const device = await AttendanceDevice.findOne({
    where: { id, tenantId: session.user.tenantId }
  });

  if (!device) {
    return res.status(404).json({ success: false, error: 'Device not found' });
  }

  await device.update({ status: 'inactive' });
  return res.status(200).json({ success: true, message: 'Device deactivated' });
}

function getMockDevices() {
  return [
    {
      id: 'dev-1', deviceName: 'Fingerprint Entrance', deviceType: 'fingerprint',
      deviceBrand: 'ZKTeco', deviceModel: 'K40', serialNumber: 'ZK-2024-001',
      ipAddress: '192.168.1.100', port: 4370, connectionType: 'tcp',
      syncMode: 'push', status: 'active', isOnline: true,
      registeredUsers: 45, maxCapacity: 1000, totalSynced: 12500,
      lastSyncAt: new Date().toISOString(), lastSyncStatus: 'success',
      location: 'Pintu Masuk Utama',
      branch: { id: 'b1', name: 'Cabang Pusat Jakarta', code: 'JKT-01' }
    },
    {
      id: 'dev-2', deviceName: 'Face Recognition Lobby', deviceType: 'face_recognition',
      deviceBrand: 'Hikvision', deviceModel: 'DS-K1T671M', serialNumber: 'HK-2024-002',
      ipAddress: '192.168.1.101', port: 80, connectionType: 'http',
      syncMode: 'push', status: 'active', isOnline: true,
      registeredUsers: 38, maxCapacity: 500, totalSynced: 8200,
      lastSyncAt: new Date().toISOString(), lastSyncStatus: 'success',
      location: 'Lobby Utama',
      branch: { id: 'b1', name: 'Cabang Pusat Jakarta', code: 'JKT-01' }
    },
    {
      id: 'dev-3', deviceName: 'Fingerprint Bandung', deviceType: 'fingerprint',
      deviceBrand: 'ZKTeco', deviceModel: 'MB360', serialNumber: 'ZK-2024-003',
      ipAddress: '192.168.2.100', port: 4370, connectionType: 'tcp',
      syncMode: 'pull', status: 'active', isOnline: false,
      registeredUsers: 18, maxCapacity: 500, totalSynced: 3400,
      lastSyncAt: new Date(Date.now() - 3600000).toISOString(), lastSyncStatus: 'timeout',
      location: 'Pintu Masuk',
      branch: { id: 'b2', name: 'Cabang Bandung', code: 'BDG-01' }
    },
    {
      id: 'dev-4', deviceName: 'Mobile App Attendance', deviceType: 'mobile_app',
      deviceBrand: 'Bedagang', deviceModel: 'App v2.1', serialNumber: null,
      ipAddress: null, port: null, connectionType: 'http',
      syncMode: 'push', status: 'active', isOnline: true,
      registeredUsers: 80, maxCapacity: null, totalSynced: 15000,
      lastSyncAt: new Date().toISOString(), lastSyncStatus: 'success',
      location: 'All Branches',
      branch: { id: 'b1', name: 'All Branches', code: 'ALL' }
    }
  ];
}
