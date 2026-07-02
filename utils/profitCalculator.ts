/**
 * Profit Calculator Utility
 * Calculate profit, margin, and markup for products
 */

export interface ProfitCalculation {
  cost: number;
  sellingPrice: number;
  profit: number;
  profitMargin: number;  // Profit as % of selling price
  markup: number;        // Profit as % of cost
  profitAmount: number;
}

/**
 * Calculate profit from cost and selling price
 */
export const calculateProfit = (cost: number, sellingPrice: number): ProfitCalculation => {
  const profit = sellingPrice - cost;
  const profitMargin = cost > 0 ? (profit / sellingPrice) * 100 : 0;
  const markup = cost > 0 ? (profit / cost) * 100 : 0;

  return {
    cost,
    sellingPrice,
    profit,
    profitMargin: parseFloat(profitMargin.toFixed(2)),
    markup: parseFloat(markup.toFixed(2)),
    profitAmount: parseFloat(profit.toFixed(2))
  };
};

/**
 * Calculate selling price from cost and desired markup
 */
export const calculateSellingPriceFromMarkup = (cost: number, markupPercentage: number): number => {
  return cost * (1 + markupPercentage / 100);
};

/**
 * Calculate selling price from cost and desired profit margin
 */
export const calculateSellingPriceFromMargin = (cost: number, marginPercentage: number): number => {
  return cost / (1 - marginPercentage / 100);
};

/**
 * Calculate cost from selling price and markup
 */
export const calculateCostFromMarkup = (sellingPrice: number, markupPercentage: number): number => {
  return sellingPrice / (1 + markupPercentage / 100);
};

/**
 * Format currency to IDR
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Get profit status (good, fair, poor)
 */
export const getProfitStatus = (profitMargin: number): {
  status: 'excellent' | 'good' | 'fair' | 'poor';
  color: string;
  label: string;
} => {
  if (profitMargin >= 40) {
    return { status: 'excellent', color: 'text-green-600 bg-green-100', label: 'Sangat Baik' };
  } else if (profitMargin >= 25) {
    return { status: 'good', color: 'text-blue-600 bg-blue-100', label: 'Baik' };
  } else if (profitMargin >= 15) {
    return { status: 'fair', color: 'text-yellow-600 bg-yellow-100', label: 'Cukup' };
  } else {
    return { status: 'poor', color: 'text-red-600 bg-red-100', label: 'Rendah' };
  }
};
