/**
 * SKU Generator Utility
 * Generates SKU based on product type, category, and timestamp
 */

export interface SKUGeneratorOptions {
  productType?: 'finished' | 'raw_material' | 'manufactured';
  category?: string;
  prefix?: string;
  includeDate?: boolean;
}

/**
 * Generate SKU automatically
 */
export const generateSKU = (options: SKUGeneratorOptions = {}): string => {
  const {
    productType = 'finished',
    category = 'GENERAL',
    prefix,
    includeDate = true
  } = options;

  // Product type codes
  const typeCode = {
    finished: 'FIN',
    raw_material: 'RAW',
    manufactured: 'MFG'
  }[productType];

  // Category code (first 3 letters, uppercase)
  const categoryCode = category.substring(0, 3).toUpperCase();

  // Date code (YYMMDD)
  const now = new Date();
  const dateCode = includeDate
    ? `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    : '';

  // Random number (4 digits)
  const randomNum = Math.floor(1000 + Math.random() * 9000);

  // Build SKU
  const parts = [
    prefix || typeCode,
    categoryCode,
    dateCode,
    randomNum
  ].filter(Boolean);

  return parts.join('-');
};

/**
 * Validate SKU format
 */
export const validateSKU = (sku: string): boolean => {
  // SKU should be alphanumeric with hyphens, 8-30 characters
  const skuRegex = /^[A-Z0-9-]{8,30}$/;
  return skuRegex.test(sku);
};

/**
 * Generate SKU suggestions based on product name
 */
export const generateSKUSuggestions = (productName: string, count: number = 3): string[] => {
  const suggestions: string[] = [];
  
  // Extract first letters of words
  const words = productName.trim().split(/\s+/);
  const initials = words.map(w => w[0]).join('').toUpperCase().substring(0, 4);
  
  for (let i = 0; i < count; i++) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    suggestions.push(`${initials}-${randomNum}`);
  }
  
  return suggestions;
};

/**
 * Check if SKU already exists (to be called with API)
 */
export const checkSKUAvailability = async (sku: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/products/check-sku?sku=${encodeURIComponent(sku)}`);
    const result = await response.json();
    return result.available;
  } catch (error) {
    console.error('Error checking SKU availability:', error);
    return false;
  }
};
