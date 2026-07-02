/**
 * Promo Calculator Helper
 * Handles dynamic promo calculations for bundles, product-specific, and category promos
 */

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  categoryId?: string;
}

interface PromoProduct {
  productId: string;
  discountType: 'percentage' | 'fixed' | 'override_price';
  discountValue: number;
  minQuantity: number;
  maxQuantity?: number;
  overridePrice?: number;
  quantityTiers?: Array<{
    minQty: number;
    maxQty?: number;
    discount: number;
  }>;
}

interface PromoBundle {
  bundleType: 'fixed_bundle' | 'mix_match' | 'buy_x_get_y' | 'quantity_discount';
  bundleProducts: Array<{
    productId: string;
    quantity: number;
    isFree?: boolean;
    discountPercent?: number;
  }>;
  minQuantity?: number;
  bundlePrice?: number;
  discountType: 'percentage' | 'fixed' | 'free_item';
  discountValue?: number;
  requireAllProducts: boolean;
}

interface PromoResult {
  applicable: boolean;
  discountAmount: number;
  finalPrice: number;
  message: string;
  appliedTo: string[];
}

/**
 * Calculate discount for product-specific promo
 */
export function calculateProductPromo(
  cartItem: CartItem,
  promoProduct: PromoProduct
): PromoResult {
  const result: PromoResult = {
    applicable: false,
    discountAmount: 0,
    finalPrice: cartItem.price * cartItem.quantity,
    message: '',
    appliedTo: []
  };

  // Check minimum quantity
  if (cartItem.quantity < promoProduct.minQuantity) {
    result.message = `Minimum quantity ${promoProduct.minQuantity} required`;
    return result;
  }

  // Check maximum quantity
  const eligibleQty = promoProduct.maxQuantity 
    ? Math.min(cartItem.quantity, promoProduct.maxQuantity)
    : cartItem.quantity;

  // Calculate discount based on type
  if (promoProduct.discountType === 'override_price' && promoProduct.overridePrice) {
    // Override price
    const normalPrice = cartItem.price * cartItem.quantity;
    const specialPrice = promoProduct.overridePrice * eligibleQty + 
                        cartItem.price * (cartItem.quantity - eligibleQty);
    result.discountAmount = normalPrice - specialPrice;
    result.finalPrice = specialPrice;
    result.applicable = true;
    result.message = `Special price Rp ${promoProduct.overridePrice.toLocaleString()}`;
  } else if (promoProduct.quantityTiers && promoProduct.quantityTiers.length > 0) {
    // Quantity-based tiers
    const tier = promoProduct.quantityTiers.find(t => 
      cartItem.quantity >= t.minQty && 
      (!t.maxQty || cartItem.quantity <= t.maxQty)
    );

    if (tier) {
      const itemTotal = cartItem.price * cartItem.quantity;
      result.discountAmount = (itemTotal * tier.discount) / 100;
      result.finalPrice = itemTotal - result.discountAmount;
      result.applicable = true;
      result.message = `${tier.discount}% off for ${cartItem.quantity} items`;
    }
  } else {
    // Standard percentage or fixed discount
    const itemTotal = cartItem.price * eligibleQty;
    
    if (promoProduct.discountType === 'percentage') {
      result.discountAmount = (itemTotal * promoProduct.discountValue) / 100;
    } else {
      result.discountAmount = promoProduct.discountValue * eligibleQty;
    }

    result.finalPrice = (cartItem.price * cartItem.quantity) - result.discountAmount;
    result.applicable = true;
    result.message = promoProduct.discountType === 'percentage'
      ? `${promoProduct.discountValue}% off`
      : `Rp ${promoProduct.discountValue.toLocaleString()} off`;
  }

  result.appliedTo = [cartItem.productId];
  return result;
}

/**
 * Calculate discount for bundle promo
 */
export function calculateBundlePromo(
  cart: CartItem[],
  bundle: PromoBundle
): PromoResult {
  const result: PromoResult = {
    applicable: false,
    discountAmount: 0,
    finalPrice: 0,
    message: '',
    appliedTo: []
  };

  // Check if all required products are in cart
  const cartProductIds = cart.map(item => item.productId);
  const bundleProductIds = bundle.bundleProducts.map(bp => bp.productId);

  if (bundle.requireAllProducts) {
    const hasAllProducts = bundleProductIds.every(pid => cartProductIds.includes(pid));
    if (!hasAllProducts) {
      result.message = 'Not all bundle products in cart';
      return result;
    }
  }

  // Calculate based on bundle type
  if (bundle.bundleType === 'fixed_bundle') {
    // Fixed bundle with set price
    let bundleTotal = 0;
    const bundleItems: string[] = [];

    for (const bp of bundle.bundleProducts) {
      const cartItem = cart.find(item => item.productId === bp.productId);
      if (cartItem && cartItem.quantity >= bp.quantity) {
        bundleTotal += cartItem.price * bp.quantity;
        bundleItems.push(bp.productId);
      }
    }

    if (bundleItems.length === bundle.bundleProducts.length) {
      if (bundle.bundlePrice) {
        result.discountAmount = bundleTotal - bundle.bundlePrice;
        result.finalPrice = bundle.bundlePrice;
      } else if (bundle.discountType === 'percentage' && bundle.discountValue) {
        result.discountAmount = (bundleTotal * bundle.discountValue) / 100;
        result.finalPrice = bundleTotal - result.discountAmount;
      }
      result.applicable = true;
      result.appliedTo = bundleItems;
      result.message = `Bundle discount applied`;
    }
  } else if (bundle.bundleType === 'buy_x_get_y') {
    // Buy X Get Y free
    const buyProducts = bundle.bundleProducts.filter(bp => !bp.isFree);
    const freeProducts = bundle.bundleProducts.filter(bp => bp.isFree);

    let canApply = true;
    for (const bp of buyProducts) {
      const cartItem = cart.find(item => item.productId === bp.productId);
      if (!cartItem || cartItem.quantity < bp.quantity) {
        canApply = false;
        break;
      }
    }

    if (canApply) {
      for (const fp of freeProducts) {
        const cartItem = cart.find(item => item.productId === fp.productId);
        if (cartItem) {
          const freeQty = Math.min(fp.quantity, cartItem.quantity);
          result.discountAmount += cartItem.price * freeQty;
          result.appliedTo.push(fp.productId);
        }
      }
      result.applicable = true;
      result.message = `Buy ${buyProducts.length} Get ${freeProducts.length} Free`;
    }
  } else if (bundle.bundleType === 'quantity_discount') {
    // Quantity-based discount
    const totalQty = cart.reduce((sum, item) => {
      if (bundleProductIds.includes(item.productId)) {
        return sum + item.quantity;
      }
      return sum;
    }, 0);

    if (bundle.minQuantity && totalQty >= bundle.minQuantity) {
      const bundleTotal = cart
        .filter(item => bundleProductIds.includes(item.productId))
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);

      if (bundle.discountType === 'percentage' && bundle.discountValue) {
        result.discountAmount = (bundleTotal * bundle.discountValue) / 100;
      } else if (bundle.discountType === 'fixed' && bundle.discountValue) {
        result.discountAmount = bundle.discountValue;
      }

      result.finalPrice = bundleTotal - result.discountAmount;
      result.applicable = true;
      result.appliedTo = bundleProductIds;
      result.message = `${totalQty} items bundle discount`;
    }
  }

  return result;
}

/**
 * Find best applicable promo for cart
 */
export function findBestPromo(
  cart: CartItem[],
  availablePromos: {
    productPromos: PromoProduct[];
    bundles: PromoBundle[];
  }
): PromoResult {
  const results: PromoResult[] = [];

  // Calculate all product-specific promos
  for (const cartItem of cart) {
    const productPromo = availablePromos.productPromos.find(
      pp => pp.productId === cartItem.productId
    );
    if (productPromo) {
      const result = calculateProductPromo(cartItem, productPromo);
      if (result.applicable) {
        results.push(result);
      }
    }
  }

  // Calculate all bundle promos
  for (const bundle of availablePromos.bundles) {
    const result = calculateBundlePromo(cart, bundle);
    if (result.applicable) {
      results.push(result);
    }
  }

  // Return best promo (highest discount)
  if (results.length === 0) {
    return {
      applicable: false,
      discountAmount: 0,
      finalPrice: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      message: 'No applicable promos',
      appliedTo: []
    };
  }

  return results.reduce((best, current) => 
    current.discountAmount > best.discountAmount ? current : best
  );
}

/**
 * Validate stock for bundle
 */
export async function validateBundleStock(
  bundleProducts: Array<{ productId: string; quantity: number }>,
  Product: any
): Promise<{ available: boolean; insufficientProducts: string[] }> {
  const insufficientProducts: string[] = [];

  for (const bp of bundleProducts) {
    const product = await Product.findByPk(bp.productId);
    if (!product || product.stock < bp.quantity) {
      insufficientProducts.push(bp.productId);
    }
  }

  return {
    available: insufficientProducts.length === 0,
    insufficientProducts
  };
}
