import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

/**
 * Hardware Settings API
 * Manages all hardware configurations including printers, barcode scanners, cash drawers
 */

interface HardwareDevice {
  id: string;
  name: string;
  type: 'printer' | 'scanner' | 'cash_drawer' | 'scale' | 'display';
  connectionType: 'network' | 'usb' | 'serial' | 'bluetooth';
  ipAddress?: string;
  port?: string;
  isDefault: boolean;
  isActive: boolean;
  status: 'online' | 'offline' | 'error';
  lastChecked?: Date;
}

// In-memory storage (replace with database in production)
let hardwareDevices: HardwareDevice[] = [
  {
    id: '1',
    name: 'Printer Kasir Utama',
    type: 'printer',
    connectionType: 'network',
    ipAddress: '192.168.1.100',
    port: '9100',
    isDefault: true,
    isActive: true,
    status: 'online',
    lastChecked: new Date()
  },
  {
    id: '2',
    name: 'Printer Dapur',
    type: 'printer',
    connectionType: 'network',
    ipAddress: '192.168.1.101',
    port: '9100',
    isDefault: false,
    isActive: true,
    status: 'online',
    lastChecked: new Date()
  },
  {
    id: '3',
    name: 'Barcode Scanner',
    type: 'scanner',
    connectionType: 'usb',
    isDefault: true,
    isActive: true,
    status: 'online',
    lastChecked: new Date()
  },
  {
    id: '4',
    name: 'Cash Drawer',
    type: 'cash_drawer',
    connectionType: 'serial',
    port: 'COM3',
    isDefault: true,
    isActive: true,
    status: 'online',
    lastChecked: new Date()
  },
  {
    id: '5',
    name: 'Customer Display',
    type: 'display',
    connectionType: 'usb',
    isDefault: true,
    isActive: false,
    status: 'offline',
    lastChecked: new Date()
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET':
        return getHardwareDevices(req, res);
      case 'POST':
        return addHardwareDevice(req, res);
      case 'PUT':
        return updateHardwareDevice(req, res);
      case 'DELETE':
        return deleteHardwareDevice(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Hardware Settings API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getHardwareDevices(req: NextApiRequest, res: NextApiResponse) {
  const { type, status } = req.query;

  let filtered = [...hardwareDevices];

  if (type) {
    filtered = filtered.filter(d => d.type === type);
  }

  if (status) {
    filtered = filtered.filter(d => d.status === status);
  }

  // Group by type
  const grouped = {
    printers: filtered.filter(d => d.type === 'printer'),
    scanners: filtered.filter(d => d.type === 'scanner'),
    cashDrawers: filtered.filter(d => d.type === 'cash_drawer'),
    scales: filtered.filter(d => d.type === 'scale'),
    displays: filtered.filter(d => d.type === 'display')
  };

  // Summary stats
  const stats = {
    total: hardwareDevices.length,
    online: hardwareDevices.filter(d => d.status === 'online').length,
    offline: hardwareDevices.filter(d => d.status === 'offline').length,
    error: hardwareDevices.filter(d => d.status === 'error').length,
    printers: hardwareDevices.filter(d => d.type === 'printer').length,
    scanners: hardwareDevices.filter(d => d.type === 'scanner').length
  };

  return res.status(200).json({
    success: true,
    data: {
      devices: filtered,
      grouped,
      stats
    }
  });
}

async function addHardwareDevice(req: NextApiRequest, res: NextApiResponse) {
  const { name, type, connectionType, ipAddress, port, isDefault, isActive } = req.body;

  if (!name || !type) {
    return res.status(400).json({ success: false, error: 'Name and type are required' });
  }

  // If setting as default, unset other defaults of same type
  if (isDefault) {
    hardwareDevices = hardwareDevices.map(d => 
      d.type === type ? { ...d, isDefault: false } : d
    );
  }

  const newDevice: HardwareDevice = {
    id: Date.now().toString(),
    name,
    type,
    connectionType: connectionType || 'network',
    ipAddress,
    port,
    isDefault: isDefault || false,
    isActive: isActive !== false,
    status: 'offline',
    lastChecked: new Date()
  };

  hardwareDevices.push(newDevice);

  return res.status(201).json({
    success: true,
    message: 'Device added successfully',
    data: newDevice
  });
}

async function updateHardwareDevice(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const updates = req.body;

  const index = hardwareDevices.findIndex(d => d.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Device not found' });
  }

  // If setting as default, unset other defaults of same type
  if (updates.isDefault) {
    const deviceType = hardwareDevices[index].type;
    hardwareDevices = hardwareDevices.map(d => 
      d.type === deviceType && d.id !== id ? { ...d, isDefault: false } : d
    );
  }

  hardwareDevices[index] = { ...hardwareDevices[index], ...updates };

  return res.status(200).json({
    success: true,
    message: 'Device updated successfully',
    data: hardwareDevices[index]
  });
}

async function deleteHardwareDevice(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  const index = hardwareDevices.findIndex(d => d.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Device not found' });
  }

  hardwareDevices.splice(index, 1);

  return res.status(200).json({
    success: true,
    message: 'Device deleted successfully'
  });
}
