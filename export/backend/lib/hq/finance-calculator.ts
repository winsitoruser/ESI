/**
 * Finance Calculator & Formula Engine
 * Provides financial calculations, ratios, and standard accounting metrics
 */

// Financial Ratio Categories
export const FINANCIAL_RATIOS = {
  profitability: {
    name: 'Profitability Ratios',
    ratios: ['grossMargin', 'operatingMargin', 'netMargin', 'roa', 'roe']
  },
  liquidity: {
    name: 'Liquidity Ratios',
    ratios: ['currentRatio', 'quickRatio', 'cashRatio']
  },
  efficiency: {
    name: 'Efficiency Ratios',
    ratios: ['inventoryTurnover', 'receivablesTurnover', 'payablesTurnover', 'assetTurnover']
  },
  leverage: {
    name: 'Leverage Ratios',
    ratios: ['debtRatio', 'debtToEquity', 'interestCoverage']
  }
};

// Account Categories for P&L
export const PL_CATEGORIES = {
  revenue: {
    name: 'Revenue',
    accounts: ['sales_dine_in', 'sales_takeaway', 'sales_delivery', 'sales_catering', 'other_revenue']
  },
  cogs: {
    name: 'Cost of Goods Sold',
    accounts: ['raw_materials', 'packaging', 'direct_labor', 'freight_in']
  },
  operating_expenses: {
    name: 'Operating Expenses',
    accounts: ['salaries', 'rent', 'utilities', 'marketing', 'depreciation', 'insurance', 'maintenance', 'supplies', 'other_opex']
  },
  other_income: {
    name: 'Other Income',
    accounts: ['interest_income', 'rental_income', 'gain_on_sale']
  },
  other_expenses: {
    name: 'Other Expenses',
    accounts: ['interest_expense', 'bank_charges', 'loss_on_sale', 'penalties']
  }
};

// Cash Flow Categories
export const CASH_FLOW_CATEGORIES = {
  operating: {
    name: 'Operating Activities',
    inflows: ['sales_cash', 'receivables_collection', 'other_operating_receipts'],
    outflows: ['supplier_payments', 'payroll', 'rent', 'utilities', 'taxes', 'other_operating_payments']
  },
  investing: {
    name: 'Investing Activities',
    inflows: ['sale_of_assets', 'sale_of_investments', 'loan_collection'],
    outflows: ['purchase_of_assets', 'purchase_of_investments', 'loans_given']
  },
  financing: {
    name: 'Financing Activities',
    inflows: ['loan_proceeds', 'capital_injection', 'other_financing_receipts'],
    outflows: ['loan_repayments', 'dividend_payments', 'capital_withdrawals']
  }
};

// ============================================
// PROFIT & LOSS CALCULATIONS
// ============================================

export interface PLInput {
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  otherIncome?: number;
  otherExpenses?: number;
  interestExpense?: number;
  taxRate?: number; // Default 25%
  depreciation?: number;
}

export interface PLResult {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  operatingIncome: number;
  operatingMargin: number;
  ebitda: number;
  ebit: number;
  incomeBeforeTax: number;
  taxExpense: number;
  netIncome: number;
  netMargin: number;
}

export function calculateProfitLoss(input: PLInput): PLResult {
  const {
    revenue,
    cogs,
    operatingExpenses,
    otherIncome = 0,
    otherExpenses = 0,
    interestExpense = 0,
    taxRate = 0.25,
    depreciation = 0
  } = input;

  // Gross Profit = Revenue - COGS
  const grossProfit = revenue - cogs;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  // Operating Income = Gross Profit - Operating Expenses
  const operatingIncome = grossProfit - operatingExpenses;
  const operatingMargin = revenue > 0 ? (operatingIncome / revenue) * 100 : 0;

  // EBITDA = Operating Income + Depreciation
  const ebitda = operatingIncome + depreciation;

  // EBIT = EBITDA - Depreciation (same as Operating Income here)
  const ebit = operatingIncome;

  // Income Before Tax = EBIT + Other Income - Other Expenses - Interest
  const incomeBeforeTax = ebit + otherIncome - otherExpenses - interestExpense;

  // Tax Expense
  const taxExpense = incomeBeforeTax > 0 ? incomeBeforeTax * taxRate : 0;

  // Net Income
  const netIncome = incomeBeforeTax - taxExpense;
  const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;

  return {
    revenue,
    cogs,
    grossProfit,
    grossMargin: Math.round(grossMargin * 100) / 100,
    operatingExpenses,
    operatingIncome,
    operatingMargin: Math.round(operatingMargin * 100) / 100,
    ebitda,
    ebit,
    incomeBeforeTax,
    taxExpense: Math.round(taxExpense),
    netIncome: Math.round(netIncome),
    netMargin: Math.round(netMargin * 100) / 100
  };
}

// ============================================
// CASH FLOW CALCULATIONS
// ============================================

export interface CashFlowInput {
  openingBalance: number;
  operatingInflows: number;
  operatingOutflows: number;
  investingInflows: number;
  investingOutflows: number;
  financingInflows: number;
  financingOutflows: number;
}

export interface CashFlowResult {
  openingBalance: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  closingBalance: number;
  freeCashFlow: number;
  cashBurnRate: number;
  runwayMonths: number;
}

export function calculateCashFlow(input: CashFlowInput): CashFlowResult {
  const {
    openingBalance,
    operatingInflows,
    operatingOutflows,
    investingInflows,
    investingOutflows,
    financingInflows,
    financingOutflows
  } = input;

  // Operating Cash Flow = Operating Inflows - Operating Outflows
  const operatingCashFlow = operatingInflows - operatingOutflows;

  // Investing Cash Flow = Investing Inflows - Investing Outflows
  const investingCashFlow = investingInflows - investingOutflows;

  // Financing Cash Flow = Financing Inflows - Financing Outflows
  const financingCashFlow = financingInflows - financingOutflows;

  // Net Cash Flow = Sum of all cash flows
  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

  // Closing Balance = Opening + Net Cash Flow
  const closingBalance = openingBalance + netCashFlow;

  // Free Cash Flow = Operating Cash Flow - Capital Expenditures (investing outflows)
  const freeCashFlow = operatingCashFlow - investingOutflows;

  // Cash Burn Rate (monthly) - if negative cash flow
  const cashBurnRate = netCashFlow < 0 ? Math.abs(netCashFlow) : 0;

  // Runway in months (how long cash will last at current burn rate)
  const runwayMonths = cashBurnRate > 0 ? Math.floor(closingBalance / cashBurnRate) : 999;

  return {
    openingBalance,
    operatingCashFlow,
    investingCashFlow,
    financingCashFlow,
    netCashFlow,
    closingBalance,
    freeCashFlow,
    cashBurnRate,
    runwayMonths
  };
}

// ============================================
// FINANCIAL RATIOS
// ============================================

export interface FinancialRatiosInput {
  // Balance Sheet Items
  currentAssets: number;
  currentLiabilities: number;
  inventory: number;
  cash: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  receivables: number;
  payables: number;
  // P&L Items
  revenue: number;
  cogs: number;
  operatingIncome: number;
  netIncome: number;
  interestExpense: number;
  depreciation: number;
}

export interface FinancialRatiosResult {
  // Profitability
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  roa: number;
  roe: number;
  // Liquidity
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  // Efficiency (Days)
  daysInventory: number;
  daysReceivables: number;
  daysPayables: number;
  cashConversionCycle: number;
  // Leverage
  debtRatio: number;
  debtToEquity: number;
  interestCoverage: number;
}

export function calculateFinancialRatios(input: FinancialRatiosInput): FinancialRatiosResult {
  const {
    currentAssets,
    currentLiabilities,
    inventory,
    cash,
    totalAssets,
    totalLiabilities,
    totalEquity,
    receivables,
    payables,
    revenue,
    cogs,
    operatingIncome,
    netIncome,
    interestExpense,
    depreciation
  } = input;

  // Profitability Ratios
  const grossProfit = revenue - cogs;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const operatingMargin = revenue > 0 ? (operatingIncome / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;
  const roa = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0;
  const roe = totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0;

  // Liquidity Ratios
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
  const quickRatio = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;
  const cashRatio = currentLiabilities > 0 ? cash / currentLiabilities : 0;

  // Efficiency Ratios (Days - annualized)
  const avgDailyRevenue = revenue / 365;
  const avgDailyCogs = cogs / 365;
  const daysInventory = avgDailyCogs > 0 ? inventory / avgDailyCogs : 0;
  const daysReceivables = avgDailyRevenue > 0 ? receivables / avgDailyRevenue : 0;
  const daysPayables = avgDailyCogs > 0 ? payables / avgDailyCogs : 0;
  const cashConversionCycle = daysInventory + daysReceivables - daysPayables;

  // Leverage Ratios
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const debtToEquity = totalEquity > 0 ? totalLiabilities / totalEquity : 0;
  const ebit = operatingIncome + depreciation;
  const interestCoverage = interestExpense > 0 ? ebit / interestExpense : 999;

  return {
    grossMargin: Math.round(grossMargin * 100) / 100,
    operatingMargin: Math.round(operatingMargin * 100) / 100,
    netMargin: Math.round(netMargin * 100) / 100,
    roa: Math.round(roa * 100) / 100,
    roe: Math.round(roe * 100) / 100,
    currentRatio: Math.round(currentRatio * 100) / 100,
    quickRatio: Math.round(quickRatio * 100) / 100,
    cashRatio: Math.round(cashRatio * 100) / 100,
    daysInventory: Math.round(daysInventory),
    daysReceivables: Math.round(daysReceivables),
    daysPayables: Math.round(daysPayables),
    cashConversionCycle: Math.round(cashConversionCycle),
    debtRatio: Math.round(debtRatio * 100) / 100,
    debtToEquity: Math.round(debtToEquity * 100) / 100,
    interestCoverage: Math.round(interestCoverage * 100) / 100
  };
}

// ============================================
// BUDGET CALCULATIONS
// ============================================

export interface BudgetVariance {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: 'under' | 'on_track' | 'over';
}

export function calculateBudgetVariance(budgeted: number, actual: number): BudgetVariance {
  const variance = budgeted - actual;
  const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;
  
  let status: 'under' | 'on_track' | 'over';
  if (variancePercent > 5) {
    status = 'under'; // Under budget (good for expenses)
  } else if (variancePercent < -5) {
    status = 'over'; // Over budget (bad for expenses)
  } else {
    status = 'on_track';
  }

  return {
    category: '',
    budgeted,
    actual,
    variance,
    variancePercent: Math.round(variancePercent * 100) / 100,
    status
  };
}

// ============================================
// TAX CALCULATIONS
// ============================================

export interface TaxCalculation {
  grossRevenue: number;
  deductibleExpenses: number;
  taxableIncome: number;
  taxRate: number;
  taxPayable: number;
  effectiveTaxRate: number;
}

export function calculateTax(
  grossRevenue: number,
  deductibleExpenses: number,
  taxRate: number = 0.25
): TaxCalculation {
  const taxableIncome = grossRevenue - deductibleExpenses;
  const taxPayable = taxableIncome > 0 ? taxableIncome * taxRate : 0;
  const effectiveTaxRate = grossRevenue > 0 ? (taxPayable / grossRevenue) * 100 : 0;

  return {
    grossRevenue,
    deductibleExpenses,
    taxableIncome,
    taxRate,
    taxPayable: Math.round(taxPayable),
    effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100
  };
}

// ============================================
// GROWTH CALCULATIONS
// ============================================

export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
}

export function calculateCAGR(
  startValue: number,
  endValue: number,
  years: number
): number {
  if (startValue <= 0 || years <= 0) return 0;
  const cagr = Math.pow(endValue / startValue, 1 / years) - 1;
  return Math.round(cagr * 100 * 100) / 100;
}

// ============================================
// BRANCH PERFORMANCE
// ============================================

export interface BranchPerformance {
  branchId: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  growth: number;
  contribution: number;
  rank: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

export function calculateBranchPerformance(
  branchId: string,
  revenue: number,
  expenses: number,
  previousRevenue: number,
  totalCompanyRevenue: number
): BranchPerformance {
  const profit = revenue - expenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const growth = calculateGrowth(revenue, previousRevenue);
  const contribution = totalCompanyRevenue > 0 ? (revenue / totalCompanyRevenue) * 100 : 0;

  let status: 'excellent' | 'good' | 'warning' | 'critical';
  if (margin >= 25 && growth >= 10) {
    status = 'excellent';
  } else if (margin >= 15 && growth >= 0) {
    status = 'good';
  } else if (margin >= 5 || growth >= -10) {
    status = 'warning';
  } else {
    status = 'critical';
  }

  return {
    branchId,
    revenue,
    expenses,
    profit,
    margin: Math.round(margin * 100) / 100,
    growth,
    contribution: Math.round(contribution * 100) / 100,
    rank: 0, // Set externally after sorting
    status
  };
}

// ============================================
// INVOICE AGING
// ============================================

export interface InvoiceAging {
  current: number; // 0-30 days
  days30: number;  // 31-60 days
  days60: number;  // 61-90 days
  days90: number;  // 90+ days
  total: number;
  averageDaysOutstanding: number;
}

export function calculateInvoiceAging(
  invoices: { amount: number; daysOutstanding: number }[]
): InvoiceAging {
  const aging: InvoiceAging = {
    current: 0,
    days30: 0,
    days60: 0,
    days90: 0,
    total: 0,
    averageDaysOutstanding: 0
  };

  let totalWeightedDays = 0;

  invoices.forEach(inv => {
    aging.total += inv.amount;
    totalWeightedDays += inv.amount * inv.daysOutstanding;

    if (inv.daysOutstanding <= 30) {
      aging.current += inv.amount;
    } else if (inv.daysOutstanding <= 60) {
      aging.days30 += inv.amount;
    } else if (inv.daysOutstanding <= 90) {
      aging.days60 += inv.amount;
    } else {
      aging.days90 += inv.amount;
    }
  });

  aging.averageDaysOutstanding = aging.total > 0 
    ? Math.round(totalWeightedDays / aging.total) 
    : 0;

  return aging;
}

// Export all
export default {
  FINANCIAL_RATIOS,
  PL_CATEGORIES,
  CASH_FLOW_CATEGORIES,
  calculateProfitLoss,
  calculateCashFlow,
  calculateFinancialRatios,
  calculateBudgetVariance,
  calculateTax,
  calculateGrowth,
  calculateCAGR,
  calculateBranchPerformance,
  calculateInvoiceAging
};
