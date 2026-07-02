import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// In-memory cart storage (in production, use Redis or database)
const carts: Map<string, any[]> = new Map();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = (session.user as any).id;
    const cartKey = `cart_${userId}`;

    switch (req.method) {
      case 'GET':
        return getCart(cartKey, res);
      case 'POST':
        return addToCart(cartKey, req, res);
      case 'PUT':
        return updateCartItem(cartKey, req, res);
      case 'DELETE':
        return removeFromCart(cartKey, req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Cart API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function getCart(cartKey: string, res: NextApiResponse) {
  const cart = carts.get(cartKey) || [];
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return res.status(200).json({
    success: true,
    data: {
      items: cart,
      total,
      totalItems,
      tax: total * 0.11,
      grandTotal: total * 1.11
    }
  });
}

function addToCart(cartKey: string, req: NextApiRequest, res: NextApiResponse) {
  const { productId, name, price, quantity = 1, variants = [], notes = '' } = req.body;

  if (!productId || !name || !price) {
    return res.status(400).json({ error: 'Product ID, name, and price are required' });
  }

  let cart = carts.get(cartKey) || [];
  
  const existingIndex = cart.findIndex(item => 
    item.productId === productId && 
    JSON.stringify(item.variants) === JSON.stringify(variants)
  );

  if (existingIndex >= 0) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({
      id: `item_${Date.now()}`,
      productId,
      name,
      price,
      quantity,
      variants,
      notes,
      addedAt: new Date()
    });
  }

  carts.set(cartKey, cart);

  return res.status(200).json({
    success: true,
    message: 'Item added to cart',
    data: cart
  });
}

function updateCartItem(cartKey: string, req: NextApiRequest, res: NextApiResponse) {
  const { itemId, quantity, notes } = req.body;

  let cart = carts.get(cartKey) || [];
  const itemIndex = cart.findIndex(item => item.id === itemId);

  if (itemIndex < 0) {
    return res.status(404).json({ error: 'Item not found in cart' });
  }

  if (quantity !== undefined) {
    if (quantity <= 0) {
      cart.splice(itemIndex, 1);
    } else {
      cart[itemIndex].quantity = quantity;
    }
  }

  if (notes !== undefined) {
    cart[itemIndex].notes = notes;
  }

  carts.set(cartKey, cart);

  return res.status(200).json({
    success: true,
    message: 'Cart updated',
    data: cart
  });
}

function removeFromCart(cartKey: string, req: NextApiRequest, res: NextApiResponse) {
  const { itemId, clearAll } = req.body;

  if (clearAll) {
    carts.delete(cartKey);
    return res.status(200).json({
      success: true,
      message: 'Cart cleared',
      data: []
    });
  }

  let cart = carts.get(cartKey) || [];
  cart = cart.filter(item => item.id !== itemId);
  carts.set(cartKey, cart);

  return res.status(200).json({
    success: true,
    message: 'Item removed from cart',
    data: cart
  });
}
