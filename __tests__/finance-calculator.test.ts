import {
  calculateProfitLoss,
  calculateCashFlow,
  calculateFinancialRatios,
  calculateBudgetVariance,
  calculateTax,
  calculateGrowth,
  calculateCAGR,
  calculateBranchPerformance,
  calculateInvoiceAging,
} from '@/lib/hq/finance-calculator';

// ─── Profit & Loss ───

describe('calculateProfitLoss', () => {
  it('calculates basic P&L correctly', () => {
    const result = calculateProfitLoss({
      revenue: 1_000_000_000,
      cogs: 600_000_000,
      operatingExpenses: 250_000_000,
    });

    expect(result.revenue).toBe(1_000_000_000);
    expect(result.cogs).toBe(600_000_000);
    expect(result.grossProfit).toBe(400_000_000);
    expect(result.grossMargin).toBe(40);
    expect(result.operatingIncome).toBe(150_000_000);
    expect(result.operatingMargin).toBe(15);
    expect(result.netIncome).toBe(112_500_000);
    expect(result.netMargin).toBe(11.25);
  });

  it('includes other income and expenses', () => {
    const result = calculateProfitLoss({
      revenue: 500_000_000,
      cogs: 300_000_000,
      operatingExpenses: 100_000_000,
      otherIncome: 50_000_000,
      otherExpenses: 10_000_000,
      interestExpense: 5_000_000,
    });

    expect(result.grossProfit).toBe(200_000_000);
    expect(result.operatingIncome).toBe(100_000_000);
    expect(result.incomeBeforeTax).toBe(135_000_000); // 100M + 50M - 10M - 5M
    expect(result.netIncome).toBe(101_250_000); // 135M * 0.75
  });

  it('handles loss scenario (negative net income)', () => {
    const result = calculateProfitLoss({
      revenue: 200_000_000,
      cogs: 250_000_000,
      operatingExpenses: 100_000_000,
    });

    expect(result.grossProfit).toBe(-50_000_000);
    expect(result.netIncome).toBe(-150_000_000); // loss, no tax
    expect(result.taxExpense).toBe(0);
  });

  it('handles zero revenue gracefully', () => {
    const result = calculateProfitLoss({
      revenue: 0,
      cogs: 0,
      operatingExpenses: 50_000_000,
    });

    expect(result.grossMargin).toBe(0);
    expect(result.operatingMargin).toBe(0);
    expect(result.netMargin).toBe(0);
    expect(result.netIncome).toBe(-50_000_000);
  });
});

// ─── Cash Flow ───

describe('calculateCashFlow', () => {
  it('calculates cash flow correctly', () => {
    const result = calculateCashFlow({
      openingBalance: 500_000_000,
      operatingInflows: 1_200_000_000,
      operatingOutflows: 900_000_000,
      investingInflows: 50_000_000,
      investingOutflows: 200_000_000,
      financingInflows: 300_000_000,
      financingOutflows: 100_000_000,
    });

    expect(result.operatingCashFlow).toBe(300_000_000);
    expect(result.investingCashFlow).toBe(-150_000_000);
    expect(result.financingCashFlow).toBe(200_000_000);
    expect(result.netCashFlow).toBe(350_000_000);
    expect(result.closingBalance).toBe(850_000_000);
    expect(result.freeCashFlow).toBe(100_000_000); // 300M - 200M
  });

  it('calculates burn rate and runway for negative cash flow', () => {
    const result = calculateCashFlow({
      openingBalance: 500_000_000,
      operatingInflows: 200_000_000,
      operatingOutflows: 600_000_000,
      investingInflows: 0,
      investingOutflows: 50_000_000,
      financingInflows: 0,
      financingOutflows: 0,
    });

    expect(result.netCashFlow).toBe(-450_000_000);
    expect(result.cashBurnRate).toBe(450_000_000);
    expect(result.runwayMonths).toBe(0); // 50M left / 450M burn = 0 month fully covered
  });

  it('returns 999 runway when cash flow positive', () => {
    const result = calculateCashFlow({
      openingBalance: 100_000_000,
      operatingInflows: 500_000_000,
      operatingOutflows: 300_000_000,
      investingInflows: 0,
      investingOutflows: 0,
      financingInflows: 0,
      financingOutflows: 0,
    });

    expect(result.cashBurnRate).toBe(0);
    expect(result.runwayMonths).toBe(999);
  });
});

// ─── Financial Ratios ───

describe('calculateFinancialRatios', () => {
  it('calculates all ratios correctly', () => {
    const result = calculateFinancialRatios({
      currentAssets: 800_000_000,
      currentLiabilities: 400_000_000,
      inventory: 200_000_000,
      cash: 100_000_000,
      totalAssets: 2_000_000_000,
      totalLiabilities: 1_200_000_000,
      totalEquity: 800_000_000,
      receivables: 300_000_000,
      payables: 250_000_000,
      revenue: 5_000_000_000,
      cogs: 3_000_000_000,
      operatingIncome: 1_000_000_000,
      netIncome: 700_000_000,
      interestExpense: 50_000_000,
      depreciation: 100_000_000,
    });

    // Profitability
    expect(result.grossMargin).toBe(40); // (5B-3B)/5B * 100
    expect(result.operatingMargin).toBe(20); // 1B/5B * 100
    expect(result.netMargin).toBe(14); // 700M/5B * 100
    expect(result.roa).toBe(35); // 700M/2B * 100
    expect(result.roe).toBe(87.5); // 700M/800M * 100

    // Liquidity
    expect(result.currentRatio).toBe(2); // 800M/400M
    expect(result.quickRatio).toBe(1.5); // (800M-200M)/400M
    expect(result.cashRatio).toBe(0.25); // 100M/400M

    // Leverage
    expect(result.debtRatio).toBe(60); // 1.2B/2B * 100
    expect(result.debtToEquity).toBe(1.5); // 1.2B/800M
    expect(result.interestCoverage).toBe(22); // (1B+100M)/50M
  });

  it('handles zero values without division by zero', () => {
    const result = calculateFinancialRatios({
      currentAssets: 0, currentLiabilities: 0, inventory: 0, cash: 0,
      totalAssets: 0, totalLiabilities: 0, totalEquity: 0,
      receivables: 0, payables: 0, revenue: 0, cogs: 0,
      operatingIncome: 0, netIncome: 0, interestExpense: 0, depreciation: 0,
    });

    expect(result.currentRatio).toBe(0);
    expect(result.roa).toBe(0);
    expect(result.interestCoverage).toBe(999);
  });
});

// ─── Budget Variance ───

describe('calculateBudgetVariance', () => {
  it('returns "under" when under budget', () => {
    const result = calculateBudgetVariance(100_000_000, 80_000_000);
    expect(result.variance).toBe(20_000_000);
    expect(result.variancePercent).toBe(20);
    expect(result.status).toBe('under');
  });

  it('returns "over" when over budget', () => {
    const result = calculateBudgetVariance(100_000_000, 130_000_000);
    expect(result.variance).toBe(-30_000_000);
    expect(result.variancePercent).toBe(-30);
    expect(result.status).toBe('over');
  });

  it('returns "on_track" within ±5%', () => {
    const result = calculateBudgetVariance(100_000_000, 102_000_000);
    expect(result.status).toBe('on_track');
  });
});

// ─── Tax ───

describe('calculateTax', () => {
  it('calculates tax correctly', () => {
    const result = calculateTax(1_000_000_000, 600_000_000);
    expect(result.taxableIncome).toBe(400_000_000);
    expect(result.taxPayable).toBe(100_000_000);
    expect(result.effectiveTaxRate).toBe(10);
  });

  it('returns 0 tax for loss', () => {
    const result = calculateTax(500_000_000, 700_000_000);
    expect(result.taxableIncome).toBe(-200_000_000);
    expect(result.taxPayable).toBe(0);
  });
});

// ─── Growth ───

describe('calculateGrowth', () => {
  it('calculates positive growth', () => {
    expect(calculateGrowth(120, 100)).toBe(20);
  });

  it('calculates negative growth', () => {
    expect(calculateGrowth(80, 100)).toBe(-20);
  });

  it('returns 100% when previous is 0 and current > 0', () => {
    expect(calculateGrowth(50, 0)).toBe(100);
  });
});

describe('calculateCAGR', () => {
  it('calculates CAGR correctly', () => {
    // 100 -> 200 over 2 years = ~41.42%
    const result = calculateCAGR(100, 200, 2);
    expect(result).toBeGreaterThan(41);
    expect(result).toBeLessThan(42);
  });

  it('returns 0 for invalid inputs', () => {
    expect(calculateCAGR(0, 100, 2)).toBe(0);
    expect(calculateCAGR(100, 200, 0)).toBe(0);
  });
});

// ─── Branch Performance ───

describe('calculateBranchPerformance', () => {
  it('classifies as excellent', () => {
    const result = calculateBranchPerformance('b1', 500_000_000, 300_000_000, 400_000_000, 2_000_000_000);
    expect(result.profit).toBe(200_000_000);
    expect(result.margin).toBe(40);
    expect(result.status).toBe('excellent');
  });

  it('classifies as critical', () => {
    const result = calculateBranchPerformance('b2', 100_000_000, 120_000_000, 200_000_000, 2_000_000_000);
    expect(result.margin).toBe(-20);
    expect(result.growth).toBe(-50);
    expect(result.status).toBe('critical');
  });
});

// ─── Invoice Aging ───

describe('calculateInvoiceAging', () => {
  it('correctly buckets invoices by age', () => {
    const invoices = [
      { amount: 50_000_000, daysOutstanding: 10 },
      { amount: 30_000_000, daysOutstanding: 45 },
      { amount: 20_000_000, daysOutstanding: 75 },
      { amount: 10_000_000, daysOutstanding: 120 },
    ];

    const result = calculateInvoiceAging(invoices);

    expect(result.current).toBe(50_000_000);
    expect(result.days30).toBe(30_000_000);
    expect(result.days60).toBe(20_000_000);
    expect(result.days90).toBe(10_000_000);
    expect(result.total).toBe(110_000_000);
    expect(result.averageDaysOutstanding).toBeGreaterThan(0);
  });

  it('handles empty array', () => {
    const result = calculateInvoiceAging([]);
    expect(result.total).toBe(0);
    expect(result.averageDaysOutstanding).toBe(0);
  });
});
