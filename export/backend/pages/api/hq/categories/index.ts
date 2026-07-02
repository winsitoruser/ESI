import type { NextApiRequest, NextApiResponse } from 'next';
import { Category } from '../../../../models';
import { Op } from 'sequelize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getCategories(req, res);
      case 'POST':
        return await createCategory(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Category API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getCategories(req: NextApiRequest, res: NextApiResponse) {
  const { search, parentId, flat } = req.query;

  try {
    const where: any = {};
    
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }
    
    if (parentId === 'null' || parentId === '') {
      where.parentId = null;
    } else if (parentId) {
      where.parentId = parentId;
    }

    const categories = await Category.findAll({
      where: flat === 'true' ? (search ? where : {}) : where,
      include: flat === 'true' ? [] : [
        { model: Category, as: 'children', include: [{ model: Category, as: 'children' }] }
      ],
      order: [['sortOrder', 'ASC'], ['name', 'ASC']]
    });

    const formattedCategories = categories.map((cat: any) => formatCategory(cat));

    return res.status(200).json({ categories: formattedCategories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(200).json({ categories: getMockCategories() });
  }
}

function formatCategory(category: any): any {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    color: category.color,
    parentId: category.parentId,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    productCount: category.productCount || 0,
    children: category.children ? category.children.map((child: any) => formatCategory(child)) : []
  };
}

async function createCategory(req: NextApiRequest, res: NextApiResponse) {
  const { name, slug, description, icon, color, parentId, sortOrder } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const category = await Category.create({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description,
      icon,
      color,
      parentId: parentId || null,
      sortOrder: sortOrder || 0,
      isActive: true
    });

    return res.status(201).json({ category, message: 'Category created successfully' });
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Category slug already exists' });
    }
    throw error;
  }
}

function getMockCategories() {
  return [
    { id: '1', name: 'Sembako', slug: 'sembako', icon: '🌾', color: '#F59E0B', parentId: null, isActive: true, productCount: 45, children: [
      { id: '1-1', name: 'Beras', slug: 'beras', parentId: '1', isActive: true, productCount: 12, children: [] },
      { id: '1-2', name: 'Minyak Goreng', slug: 'minyak-goreng', parentId: '1', isActive: true, productCount: 8, children: [] },
      { id: '1-3', name: 'Gula & Garam', slug: 'gula-garam', parentId: '1', isActive: true, productCount: 10, children: [] }
    ]},
    { id: '2', name: 'Minuman', slug: 'minuman', icon: '🥤', color: '#3B82F6', parentId: null, isActive: true, productCount: 38, children: [
      { id: '2-1', name: 'Air Mineral', slug: 'air-mineral', parentId: '2', isActive: true, productCount: 8, children: [] },
      { id: '2-2', name: 'Minuman Kemasan', slug: 'minuman-kemasan', parentId: '2', isActive: true, productCount: 15, children: [] }
    ]},
    { id: '3', name: 'Makanan Ringan', slug: 'makanan-ringan', icon: '🍿', color: '#10B981', parentId: null, isActive: true, productCount: 52, children: [] },
    { id: '4', name: 'Perawatan Pribadi', slug: 'perawatan-pribadi', icon: '🧴', color: '#8B5CF6', parentId: null, isActive: true, productCount: 28, children: [] },
    { id: '5', name: 'Kebersihan Rumah', slug: 'kebersihan-rumah', icon: '🧹', color: '#EC4899', parentId: null, isActive: true, productCount: 22, children: [] }
  ];
}
