import type { NextApiRequest, NextApiResponse } from 'next';

interface PriceTier {
  id: string;
  code: string;
  name: string;
  description: string;
  multiplier: number;
  markupPercent: number;
  region: string;
  appliedBranches: number;
  productCount: number;
  isActive: boolean;
  createdAt: string;
}

interface ProductPrice {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  basePrice: number;
  costPrice: number;
  margin: number;
  tierPrices: { tierId: string; tierName: string; price: number }[];
  isLocked: boolean;
  lockedBy: string | null;
}

const priceTiers: PriceTier[] = [
  { id: '1', code: 'STD', name: 'Harga Standar', description: 'Harga dasar untuk semua cabang', multiplier: 1.0, markupPercent: 0, region: 'Nasional', appliedBranches: 6, productCount: 1250, isActive: true, createdAt: '2024-01-01' },
  { id: '2', code: 'MALL', name: 'Harga Mall Premium', description: 'Harga untuk cabang di mall dengan markup 10%', multiplier: 1.1, markupPercent: 10, region: 'Mall Premium', appliedBranches: 2, productCount: 1250, isActive: true, createdAt: '2024-01-15' },
  { id: '3', code: 'PROMO', name: 'Harga Promosi', description: 'Harga diskon untuk periode promosi', multiplier: 0.85, markupPercent: -15, region: 'Nasional', appliedBranches: 6, productCount: 350, isActive: true, createdAt: '2024-02-01' },
  { id: '4', code: 'GROSIR', name: 'Harga Grosir', description: 'Harga khusus untuk pembelian grosir', multiplier: 0.9, markupPercent: -10, region: 'Nasional', appliedBranches: 3, productCount: 800, isActive: true, createdAt: '2024-01-20' }
];

const productPrices: ProductPrice[] = [
  { id: '1', productId: '1', productName: 'Beras Premium 5kg', sku: 'BRS-001', category: 'Sembako', basePrice: 75000, costPrice: 65000, margin: 15.38,
    tierPrices: [
      { tierId: '1', tierName: 'Standar', price: 75000 },
      { tierId: '2', tierName: 'Mall', price: 82500 },
      { tierId: '3', tierName: 'Promo', price: 63750 },
      { tierId: '4', tierName: 'Grosir', price: 67500 }
    ], isLocked: true, lockedBy: 'Admin HQ' },
  { id: '2', productId: '2', productName: 'Minyak Goreng 2L', sku: 'MYK-001', category: 'Sembako', basePrice: 35000, costPrice: 30000, margin: 16.67,
    tierPrices: [
      { tierId: '1', tierName: 'Standar', price: 35000 },
      { tierId: '2', tierName: 'Mall', price: 38500 },
      { tierId: '3', tierName: 'Promo', price: 29750 }
    ], isLocked: true, lockedBy: 'Admin HQ' },
  { id: '3', productId: '3', productName: 'Gula Pasir 1kg', sku: 'GLA-001', category: 'Sembako', basePrice: 15000, costPrice: 12500, margin: 20,
    tierPrices: [
      { tierId: '1', tierName: 'Standar', price: 15000 },
      { tierId: '2', tierName: 'Mall', price: 16500 }
    ], isLocked: false, lockedBy: null },
  { id: '4', productId: '4', productName: 'Kopi Arabica 250g', sku: 'KPI-001', category: 'Minuman', basePrice: 85000, costPrice: 70000, margin: 21.43,
    tierPrices: [
      { tierId: '1', tierName: 'Standar', price: 85000 },
      { tierId: '2', tierName: 'Mall', price: 93500 }
    ], isLocked: false, lockedBy: null },
  { id: '5', productId: '5', productName: 'Susu UHT 1L', sku: 'SSU-001', category: 'Minuman', basePrice: 18000, costPrice: 15000, margin: 20,
    tierPrices: [
      { tierId: '1', tierName: 'Standar', price: 18000 },
      { tierId: '2', tierName: 'Mall', price: 19800 },
      { tierId: '3', tierName: 'Promo', price: 15300 }
    ], isLocked: true, lockedBy: 'Admin HQ' }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getPricing(req, res);
      case 'POST':
        return createPriceTier(req, res);
      case 'PUT':
        return updatePricing(req, res);
      case 'DELETE':
        return deletePriceTier(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Inventory Pricing API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getPricing(req: NextApiRequest, res: NextApiResponse) {
  const { type, search, category, lockedOnly } = req.query;

  if (type === 'tiers') {
    let filteredTiers = priceTiers;
    if (search) {
      const searchStr = (search as string).toLowerCase();
      filteredTiers = filteredTiers.filter(t => 
        t.name.toLowerCase().includes(searchStr) || 
        t.code.toLowerCase().includes(searchStr)
      );
    }
    return res.status(200).json({ priceTiers: filteredTiers });
  }

  if (type === 'products') {
    let filteredProducts = productPrices;
    if (search) {
      const searchStr = (search as string).toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.productName.toLowerCase().includes(searchStr) || 
        p.sku.toLowerCase().includes(searchStr)
      );
    }
    if (category && category !== 'Semua Kategori') {
      filteredProducts = filteredProducts.filter(p => p.category === category);
    }
    if (lockedOnly === 'true') {
      filteredProducts = filteredProducts.filter(p => p.isLocked);
    }
    return res.status(200).json({ productPrices: filteredProducts });
  }

  return res.status(200).json({ priceTiers, productPrices });
}

function createPriceTier(req: NextApiRequest, res: NextApiResponse) {
  const { code, name, description, multiplier, markupPercent, region } = req.body;

  if (!code || !name) {
    return res.status(400).json({ error: 'Code and name are required' });
  }

  const existingTier = priceTiers.find(t => t.code === code.toUpperCase());
  if (existingTier) {
    return res.status(400).json({ error: 'Tier code already exists' });
  }

  const newTier: PriceTier = {
    id: Date.now().toString(),
    code: code.toUpperCase(),
    name,
    description: description || '',
    multiplier: multiplier || 1.0,
    markupPercent: markupPercent || 0,
    region: region || 'Nasional',
    appliedBranches: 0,
    productCount: 0,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  priceTiers.push(newTier);

  return res.status(201).json({ priceTier: newTier, message: 'Price tier created successfully' });
}

function updatePricing(req: NextApiRequest, res: NextApiResponse) {
  const { id, productId, basePrice, costPrice, isLocked, lockedBy, code, name, description, multiplier, markupPercent, region, isActive } = req.body;

  // Update price tier
  if (id && !productId) {
    const tierIndex = priceTiers.findIndex(t => t.id === id);
    if (tierIndex === -1) {
      return res.status(404).json({ error: 'Price tier not found' });
    }

    if (code) priceTiers[tierIndex].code = code;
    if (name) priceTiers[tierIndex].name = name;
    if (description !== undefined) priceTiers[tierIndex].description = description;
    if (multiplier !== undefined) priceTiers[tierIndex].multiplier = multiplier;
    if (markupPercent !== undefined) priceTiers[tierIndex].markupPercent = markupPercent;
    if (region) priceTiers[tierIndex].region = region;
    if (isActive !== undefined) priceTiers[tierIndex].isActive = isActive;

    return res.status(200).json({ priceTier: priceTiers[tierIndex], message: 'Price tier updated successfully' });
  }

  // Update product price
  if (productId) {
    const productIndex = productPrices.findIndex(p => p.productId === productId);
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (basePrice !== undefined) {
      productPrices[productIndex].basePrice = basePrice;
      // Recalculate margin
      if (productPrices[productIndex].costPrice > 0) {
        productPrices[productIndex].margin = ((basePrice - productPrices[productIndex].costPrice) / basePrice) * 100;
      }
      // Recalculate tier prices
      productPrices[productIndex].tierPrices = priceTiers
        .filter(t => t.isActive)
        .map(tier => ({
          tierId: tier.id,
          tierName: tier.name,
          price: Math.round(basePrice * tier.multiplier)
        }));
    }

    if (costPrice !== undefined) {
      productPrices[productIndex].costPrice = costPrice;
      if (productPrices[productIndex].basePrice > 0) {
        productPrices[productIndex].margin = ((productPrices[productIndex].basePrice - costPrice) / productPrices[productIndex].basePrice) * 100;
      }
    }

    if (isLocked !== undefined) {
      productPrices[productIndex].isLocked = isLocked;
      productPrices[productIndex].lockedBy = isLocked ? (lockedBy || 'Admin HQ') : null;
    }

    return res.status(200).json({ productPrice: productPrices[productIndex], message: 'Product pricing updated successfully' });
  }

  return res.status(400).json({ error: 'Invalid request' });
}

function deletePriceTier(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Tier ID is required' });
  }

  const tierIndex = priceTiers.findIndex(t => t.id === id);
  if (tierIndex === -1) {
    return res.status(404).json({ error: 'Price tier not found' });
  }

  if (priceTiers[tierIndex].code === 'STD') {
    return res.status(400).json({ error: 'Cannot delete standard price tier' });
  }

  priceTiers.splice(tierIndex, 1);

  return res.status(200).json({ message: 'Price tier deleted successfully' });
}
