import type { NextApiRequest, NextApiResponse } from 'next';
import { Branch, User, Store } from '../../../../models';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Branch ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getBranch(req, res, id as string);
      case 'PUT':
        return await updateBranch(req, res, id as string);
      case 'DELETE':
        return await deleteBranch(req, res, id as string);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Branch API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getBranch(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const branch = await Branch.findByPk(id, {
      include: [
        { model: User, as: 'manager', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Store, as: 'store', attributes: ['id', 'name'] }
      ]
    });

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    return res.status(200).json({ branch });
  } catch (error) {
    console.error('Error fetching branch:', error);
    return res.status(500).json({ error: 'Failed to fetch branch' });
  }
}

async function updateBranch(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { name, type, address, city, province, phone, email, managerId, isActive } = req.body;

  try {
    const branch = await Branch.findByPk(id);

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    await branch.update({
      name: name ?? branch.get('name'),
      type: type ?? branch.get('type'),
      address: address ?? branch.get('address'),
      city: city ?? branch.get('city'),
      province: province ?? branch.get('province'),
      phone: phone ?? branch.get('phone'),
      email: email ?? branch.get('email'),
      managerId: managerId ?? branch.get('managerId'),
      isActive: isActive ?? branch.get('isActive')
    });

    return res.status(200).json({ branch, message: 'Branch updated successfully' });
  } catch (error) {
    console.error('Error updating branch:', error);
    return res.status(500).json({ error: 'Failed to update branch' });
  }
}

async function deleteBranch(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const branch = await Branch.findByPk(id);

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    await branch.destroy();

    return res.status(200).json({ message: 'Branch deleted successfully' });
  } catch (error) {
    console.error('Error deleting branch:', error);
    return res.status(500).json({ error: 'Failed to delete branch' });
  }
}
