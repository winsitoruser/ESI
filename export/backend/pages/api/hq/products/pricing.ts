import type { NextApiRequest, NextApiResponse } from 'next';

interface PriceTier {
  id: string;
  name: string;
  code: string;
  description: string;
  multiplier: number;
  markup: number;
  appliedBranches: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface ProductPrice {
  productId: string;
  productName: string;
  sku: string;
  basePrice: number;
  tierPrices: { tierId: string; tierName: string; price: number }[];
  isLocked: boolean;
  lockedBy: string | null;
  lockedAt: string | null;
}

// Mock data
const priceTiers: PriceTier[] = [
  { id: '1', name: 'Harga Standar', code: 'STANDARD', description: 'Harga default untuk semua cabang', multiplier: 1.0, markup: 0, appliedBranches: ['1', '3', '5'], isDefault: true, isActive: true, createdAt: '2024-01-01' },
  { id: '2', name: 'Premium Jakarta', code: 'PREMIUM_JKT', description: 'Markup 5% untuk area Jakarta', multiplier: 1.05, markup: 5, appliedBranches: ['1'], isDefault: false, isActive: true, createdAt: '2024-02-01' },
  { id: '3', name: 'Ekonomis Daerah', code: 'ECO_REGION', description: 'Diskon 3% untuk cabang daerah', multiplier: 0.97, markup: -3, appliedBranches: ['4', '5'], isDefault: false, isActive: true, createdAt: '2024-03-01' },
  { id: '4', name: 'Grosir', code: 'WHOLESALE', description: 'Harga grosir dengan diskon 10%', multiplier: 0.90, markup: -10, appliedBranches: ['6'], isDefault: false, isActive: true, createdAt: '2024-04-01' }
];

const productPrices: ProductPrice[] = [
  { productId: '1', productName: 'Beras Premium 5kg', sku: 'BRS-001', basePrice: 75000, tierPrices: [
    { tierId: '1', tierName: 'Harga Standar', price: 75000 },
    { tierId: '2', tierName: 'Premium Jakarta', price: 78750 },
    { tierId: '3', tierName: 'Ekonomis Daerah', price: 72750 }
  ], isLocked: true, lockedBy: 'Admin HQ', lockedAt: '2026-02-15T10:00:00Z' },
  { productId: '2', productName: 'Minyak Goreng 2L', sku: 'MNY-001', basePrice: 35000, tierPrices: [
    { tierId: '1', tierName: 'Harga Standar', price: 35000 },
    { tierId: '2', tierName: 'Premium Jakarta', price: 36750 },
    { tierId: '3', tierName: 'Ekonomis Daerah', price: 33950 }
  ], isLocked: true, lockedBy: 'Admin HQ', lockedAt: '2026-02-15T10:00:00Z' },
  { productId: '3', productName: 'Gula Pasir 1kg', sku: 'GLA-001', basePrice: 15000, tierPrices: [
    { tierId: '1', tierName: 'Harga Standar', price: 15000 }
  ], isLocked: false, lockedBy: null, lockedAt: null }
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
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Product Pricing API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getPricing(req: NextApiRequest, res: NextApiResponse) {
  const { type } = req.query;

  if (type === 'tiers') {
    return res.status(200).json({ priceTiers });
  }

  if (type === 'products') {
    return res.status(200).json({ productPrices });
  }

  return res.status(200).json({ priceTiers, productPrices });
}

function createPriceTier(req: NextApiRequest, res: NextApiResponse) {
  const { name, code, description, multiplier, markup, appliedBranches } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Name and code are required' });
  }

  const newTier: PriceTier = {
    id: Date.now().toString(),
    name,
    code: code.toUpperCase(),
    description: description || '',
    multiplier: multiplier || 1.0,
    markup: markup || 0,
    appliedBranches: appliedBranches || [],
    isDefault: false,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  priceTiers.push(newTier);

  return res.status(201).json({ priceTier: newTier, message: 'Price tier created successfully' });
}

function updatePricing(req: NextApiRequest, res: NextApiResponse) {
  const { productId, basePrice, isLocked, lockedBy } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  const productIndex = productPrices.findIndex(p => p.productId === productId);
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (basePrice !== undefined) {
    productPrices[productIndex].basePrice = basePrice;
    // Recalculate tier prices
    productPrices[productIndex].tierPrices = priceTiers
      .filter(t => t.isActive)
      .map(tier => ({
        tierId: tier.id,
        tierName: tier.name,
        price: Math.round(basePrice * tier.multiplier)
      }));
  }

  if (isLocked !== undefined) {
    productPrices[productIndex].isLocked = isLocked;
    productPrices[productIndex].lockedBy = isLocked ? lockedBy : null;
    productPrices[productIndex].lockedAt = isLocked ? new Date().toISOString() : null;
  }

  return res.status(200).json({ 
    productPrice: productPrices[productIndex], 
    message: 'Product pricing updated successfully' 
  });
}
