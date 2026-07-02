import type { NextApiRequest, NextApiResponse } from 'next';
import { Op } from 'sequelize';

// Mock roles data - in production, this would come from a database
const mockRoles = [
  { id: '1', code: 'SUPER_ADMIN', name: 'Super Admin', description: 'Akses penuh ke semua fitur sistem', level: 1, permissions: [{ id: '1', module: 'all', action: 'all', description: 'Full Access' }], userCount: 2, isSystem: true, isActive: true, createdAt: '2024-01-01' },
  { id: '2', code: 'HQ_ADMIN', name: 'HQ Admin', description: 'Admin level HQ untuk manajemen cabang', level: 2, permissions: [{ id: '2', module: 'branches', action: 'all', description: 'Manage Branches' }, { id: '3', module: 'products', action: 'all', description: 'Manage Products' }], userCount: 5, isSystem: true, isActive: true, createdAt: '2024-01-01' },
  { id: '3', code: 'BRANCH_MANAGER', name: 'Manager Cabang', description: 'Manajer dengan akses penuh ke cabangnya', level: 3, permissions: [{ id: '6', module: 'branch', action: 'all', description: 'Manage Own Branch' }], userCount: 8, isSystem: true, isActive: true, createdAt: '2024-01-01' },
  { id: '4', code: 'SUPERVISOR', name: 'Supervisor', description: 'Supervisor dengan akses terbatas', level: 4, permissions: [{ id: '10', module: 'pos', action: 'all', description: 'POS Operations' }], userCount: 12, isSystem: false, isActive: true, createdAt: '2024-02-15' },
  { id: '5', code: 'CASHIER', name: 'Kasir', description: 'Staff kasir dengan akses POS saja', level: 5, permissions: [{ id: '13', module: 'pos', action: 'create', description: 'Create Transaction' }], userCount: 45, isSystem: true, isActive: true, createdAt: '2024-01-01' },
  { id: '6', code: 'WAREHOUSE', name: 'Staff Gudang', description: 'Staff gudang untuk manajemen stok', level: 5, permissions: [{ id: '15', module: 'inventory', action: 'all', description: 'Manage Inventory' }], userCount: 8, isSystem: false, isActive: true, createdAt: '2024-03-01' }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getRoles(req, res);
      case 'POST':
        return await createRole(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Role API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getRoles(req: NextApiRequest, res: NextApiResponse) {
  const { search } = req.query;

  let roles = [...mockRoles];
  
  if (search) {
    const searchLower = (search as string).toLowerCase();
    roles = roles.filter(r => 
      r.name.toLowerCase().includes(searchLower) || 
      r.code.toLowerCase().includes(searchLower)
    );
  }

  return res.status(200).json({ roles });
}

async function createRole(req: NextApiRequest, res: NextApiResponse) {
  const { code, name, description, level, permissions } = req.body;

  if (!code || !name) {
    return res.status(400).json({ error: 'Code and name are required' });
  }

  const newRole = {
    id: Date.now().toString(),
    code: code.toUpperCase().replace(/\s+/g, '_'),
    name,
    description: description || '',
    level: level || 5,
    permissions: permissions || [],
    userCount: 0,
    isSystem: false,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  mockRoles.push(newRole);

  return res.status(201).json({ role: newRole, message: 'Role created successfully' });
}
