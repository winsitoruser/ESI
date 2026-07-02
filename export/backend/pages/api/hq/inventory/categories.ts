import type { NextApiRequest, NextApiResponse } from 'next';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  parentName: string | null;
  level: number;
  productCount: number;
  isActive: boolean;
  sortOrder: number;
  icon: string;
  color: string;
  children?: Category[];
}

const categories: Category[] = [
  {
    id: '1', name: 'Sembako', slug: 'sembako', description: 'Sembilan bahan pokok', parentId: null, parentName: null, level: 0, productCount: 156, isActive: true, sortOrder: 1, icon: '🌾', color: '#F59E0B',
    children: [
      { id: '1-1', name: 'Beras', slug: 'beras', description: 'Berbagai jenis beras', parentId: '1', parentName: 'Sembako', level: 1, productCount: 45, isActive: true, sortOrder: 1, icon: '🍚', color: '#F59E0B' },
      { id: '1-2', name: 'Minyak Goreng', slug: 'minyak-goreng', description: 'Minyak untuk memasak', parentId: '1', parentName: 'Sembako', level: 1, productCount: 28, isActive: true, sortOrder: 2, icon: '🫗', color: '#F59E0B' },
      { id: '1-3', name: 'Gula', slug: 'gula', description: 'Gula pasir dan gula merah', parentId: '1', parentName: 'Sembako', level: 1, productCount: 18, isActive: true, sortOrder: 3, icon: '🍬', color: '#F59E0B' },
      { id: '1-4', name: 'Tepung', slug: 'tepung', description: 'Tepung terigu dan lainnya', parentId: '1', parentName: 'Sembako', level: 1, productCount: 22, isActive: true, sortOrder: 4, icon: '🥖', color: '#F59E0B' }
    ]
  },
  {
    id: '2', name: 'Minuman', slug: 'minuman', description: 'Berbagai jenis minuman', parentId: null, parentName: null, level: 0, productCount: 128, isActive: true, sortOrder: 2, icon: '🥤', color: '#3B82F6',
    children: [
      { id: '2-1', name: 'Air Mineral', slug: 'air-mineral', description: 'Air mineral kemasan', parentId: '2', parentName: 'Minuman', level: 1, productCount: 35, isActive: true, sortOrder: 1, icon: '💧', color: '#3B82F6' },
      { id: '2-2', name: 'Minuman Ringan', slug: 'minuman-ringan', description: 'Soft drink dan soda', parentId: '2', parentName: 'Minuman', level: 1, productCount: 48, isActive: true, sortOrder: 2, icon: '🥤', color: '#3B82F6' },
      { id: '2-3', name: 'Jus', slug: 'jus', description: 'Jus buah kemasan', parentId: '2', parentName: 'Minuman', level: 1, productCount: 25, isActive: true, sortOrder: 3, icon: '🧃', color: '#3B82F6' }
    ]
  },
  {
    id: '3', name: 'Makanan Ringan', slug: 'makanan-ringan', description: 'Snack dan cemilan', parentId: null, parentName: null, level: 0, productCount: 215, isActive: true, sortOrder: 3, icon: '🍿', color: '#10B981',
    children: [
      { id: '3-1', name: 'Keripik', slug: 'keripik', description: 'Berbagai keripik', parentId: '3', parentName: 'Makanan Ringan', level: 1, productCount: 68, isActive: true, sortOrder: 1, icon: '🥔', color: '#10B981' },
      { id: '3-2', name: 'Biskuit', slug: 'biskuit', description: 'Biskuit dan cookies', parentId: '3', parentName: 'Makanan Ringan', level: 1, productCount: 82, isActive: true, sortOrder: 2, icon: '🍪', color: '#10B981' }
    ]
  },
  { id: '4', name: 'Produk Susu', slug: 'produk-susu', description: 'Susu dan olahannya', parentId: null, parentName: null, level: 0, productCount: 85, isActive: true, sortOrder: 4, icon: '🥛', color: '#8B5CF6' },
  { id: '5', name: 'Perawatan Pribadi', slug: 'perawatan-pribadi', description: 'Produk perawatan diri', parentId: null, parentName: null, level: 0, productCount: 142, isActive: true, sortOrder: 5, icon: '🧴', color: '#EC4899' },
  { id: '6', name: 'Kebersihan Rumah', slug: 'kebersihan-rumah', description: 'Produk kebersihan rumah tangga', parentId: null, parentName: null, level: 0, productCount: 98, isActive: true, sortOrder: 6, icon: '🧹', color: '#06B6D4' }
];

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
    console.error('Inventory Categories API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getCategories(req: NextApiRequest, res: NextApiResponse) {
  const { parentId, flat, search } = req.query;

  let result = categories;

  if (search) {
    const searchStr = (search as string).toLowerCase();
    const flattenAndFilter = (cats: Category[]): Category[] => {
      const filtered: Category[] = [];
      cats.forEach(cat => {
        if (cat.name.toLowerCase().includes(searchStr) || cat.description.toLowerCase().includes(searchStr)) {
          filtered.push(cat);
        }
        if (cat.children) {
          filtered.push(...flattenAndFilter(cat.children));
        }
      });
      return filtered;
    };
    result = flattenAndFilter(categories);
    return res.status(200).json({ categories: result });
  }

  if (parentId) {
    if (parentId === 'null') {
      result = categories.filter(c => c.parentId === null);
    } else {
      const parent = categories.find(c => c.id === parentId);
      result = parent?.children || [];
    }
  }

  if (flat === 'true') {
    const flatten = (cats: Category[]): Category[] => {
      const flattened: Category[] = [];
      cats.forEach(cat => {
        flattened.push({ ...cat, children: undefined });
        if (cat.children) {
          flattened.push(...flatten(cat.children));
        }
      });
      return flattened;
    };
    result = flatten(categories);
  }

  return res.status(200).json({ categories: result });
}

function createCategory(req: NextApiRequest, res: NextApiResponse) {
  const { name, slug, description, parentId, icon, color, isActive } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const categorySlug = slug || name.toLowerCase().replace(/\s+/g, '-');
  
  // Check for duplicate slug
  const checkSlug = (cats: Category[]): boolean => {
    for (const cat of cats) {
      if (cat.slug === categorySlug) return true;
      if (cat.children && checkSlug(cat.children)) return true;
    }
    return false;
  };
  
  if (checkSlug(categories)) {
    return res.status(400).json({ error: 'Category slug already exists' });
  }

  const newCategory: Category = {
    id: Date.now().toString(),
    name,
    slug: categorySlug,
    description: description || '',
    parentId: parentId || null,
    parentName: parentId ? categories.find(c => c.id === parentId)?.name || null : null,
    level: parentId ? 1 : 0,
    productCount: 0,
    isActive: isActive !== false,
    sortOrder: categories.length + 1,
    icon: icon || '📦',
    color: color || '#3B82F6'
  };

  if (parentId) {
    const parentIndex = categories.findIndex(c => c.id === parentId);
    if (parentIndex !== -1) {
      if (!categories[parentIndex].children) {
        categories[parentIndex].children = [];
      }
      categories[parentIndex].children!.push(newCategory);
    }
  } else {
    categories.push(newCategory);
  }

  return res.status(201).json({ category: newCategory, message: 'Category created successfully' });
}

function updateCategory(req: NextApiRequest, res: NextApiResponse) {
  const { id, name, slug, description, icon, color, isActive, sortOrder } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Category ID is required' });
  }

  const updateCat = (cats: Category[]): boolean => {
    for (let i = 0; i < cats.length; i++) {
      if (cats[i].id === id) {
        if (name) cats[i].name = name;
        if (slug) cats[i].slug = slug;
        if (description !== undefined) cats[i].description = description;
        if (icon) cats[i].icon = icon;
        if (color) cats[i].color = color;
        if (isActive !== undefined) cats[i].isActive = isActive;
        if (sortOrder !== undefined) cats[i].sortOrder = sortOrder;
        return true;
      }
      if (cats[i].children) {
        if (updateCat(cats[i].children as Category[])) {
          return true;
        }
      }
    }
    return false;
  };

  if (!updateCat(categories)) {
    return res.status(404).json({ error: 'Category not found' });
  }

  return res.status(200).json({ message: 'Category updated successfully' });
}

function deleteCategory(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Category ID is required' });
  }

  const deleteCat = (cats: Category[]): { found: boolean; hasChildren: boolean; hasProducts: boolean } => {
    for (let i = 0; i < cats.length; i++) {
      if (cats[i].id === id) {
        const children = cats[i].children;
        if (children && children.length > 0) {
          return { found: true, hasChildren: true, hasProducts: false };
        }
        if (cats[i].productCount > 0) {
          return { found: true, hasChildren: false, hasProducts: true };
        }
        cats.splice(i, 1);
        return { found: true, hasChildren: false, hasProducts: false };
      }
      if (cats[i].children) {
        const result = deleteCat(cats[i].children as Category[]);
        if (result.found) return result;
      }
    }
    return { found: false, hasChildren: false, hasProducts: false };
  };

  const result = deleteCat(categories);

  if (!result.found) {
    return res.status(404).json({ error: 'Category not found' });
  }

  if (result.hasChildren) {
    return res.status(400).json({ error: 'Cannot delete category with children' });
  }

  if (result.hasProducts) {
    return res.status(400).json({ error: 'Cannot delete category with products' });
  }

  return res.status(200).json({ message: 'Category deleted successfully' });
}
