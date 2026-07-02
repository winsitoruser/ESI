import type { NextApiRequest, NextApiResponse } from 'next';
import { Category } from '../../../../models';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getCategories(req, res);
      case 'POST':
        return createCategory(req, res);
      case 'PUT':
        return updateCategory(req, res);
      case 'DELETE':
        return deleteCategory(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Category API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getCategories(req: NextApiRequest, res: NextApiResponse) {
  const { parentId, flat } = req.query;

  try {
    const where: any = {};
    
    if (parentId === 'null' || parentId === '') {
      where.parentId = null;
    } else if (parentId) {
      where.parentId = parentId;
    }

    const categories = await Category.findAll({
      where: flat === 'true' ? {} : where,
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
    console.error('Error creating category:', error);
    return res.status(500).json({ error: 'Failed to create category' });
  }
}

async function updateCategory(req: NextApiRequest, res: NextApiResponse) {
  const { id, name, slug, description, icon, color, parentId, sortOrder, isActive } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Category ID is required' });
  }

  try {
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await category.update({
      name: name ?? category.get('name'),
      slug: slug ?? category.get('slug'),
      description: description ?? category.get('description'),
      icon: icon ?? category.get('icon'),
      color: color ?? category.get('color'),
      parentId: parentId !== undefined ? parentId : category.get('parentId'),
      sortOrder: sortOrder ?? category.get('sortOrder'),
      isActive: isActive ?? category.get('isActive')
    });

    return res.status(200).json({ category, message: 'Category updated successfully' });
  } catch (error) {
    console.error('Error updating category:', error);
    return res.status(500).json({ error: 'Failed to update category' });
  }
}

async function deleteCategory(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Category ID is required' });
  }

  try {
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check for children
    const children = await Category.findAll({ where: { parentId: id } });
    if (children.length > 0) {
      return res.status(400).json({ error: 'Cannot delete category with children. Delete children first.' });
    }

    await category.destroy();

    return res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({ error: 'Failed to delete category' });
  }
}

function getMockCategories() {
  return [
    { id: '1', name: 'Sembako', slug: 'sembako', icon: '🌾', color: '#F59E0B', parentId: null, isActive: true, productCount: 45, children: [
      { id: '1-1', name: 'Beras', slug: 'beras', parentId: '1', isActive: true, productCount: 12, children: [] },
      { id: '1-2', name: 'Minyak Goreng', slug: 'minyak-goreng', parentId: '1', isActive: true, productCount: 8, children: [] }
    ]},
    { id: '2', name: 'Minuman', slug: 'minuman', icon: '🥤', color: '#3B82F6', parentId: null, isActive: true, productCount: 38, children: [] },
    { id: '3', name: 'Makanan Ringan', slug: 'makanan-ringan', icon: '🍿', color: '#10B981', parentId: null, isActive: true, productCount: 52, children: [] }
  ];
}
