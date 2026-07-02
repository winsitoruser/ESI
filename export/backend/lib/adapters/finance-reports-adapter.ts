import axios from 'axios';

// Types for Finance reports
export interface IncomeStatement {
  summary: {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    profitMargin: number;
  };
  incomeByCategory: CategoryBreakdown[];
  expenseByCategory: CategoryBreakdown[];
}

export interface CategoryBreakdown {
  id: string;
  categoryName: string;
  categoryCode: string;
  amount: number;
  transactionCount: number;
  percentage: number;
}

export interface CashFlow {
  cashFlowByDate: CashFlowByDate[];
  cashFlowByMethod: CashFlowByMethod[];
  summary: {
    totalCashIn: number;
    totalCashOut: number;
    netCashFlow: number;
    endingBalance: number;
  };
}

export interface CashFlowByDate {
  date: Date;
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
}

export interface CashFlowByMethod {
  paymentMethod: string;
  cashIn: number;
  cashOut: number;
  netFlow: number;
}

export interface ExpenseBreakdown {
  expenseByCategory: ExpenseCategory[];
  topExpenses: TopExpense[];
  summary: {
    totalExpenses: number;
    totalTransactions: number;
    averageExpense: number;
  };
}

export interface ExpenseCategory {
  id: string;
  categoryName: string;
  categoryCode: string;
  icon?: string;
  color?: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  maxAmount: number;
  minAmount: number;
  percentage: number;
}

export interface TopExpense {
  id: string;
  description: string;
  amount: number;
  transactionDate: Date;
  categoryName: string;
  paymentMethod: string;
}

export interface MonthlyTrend {
  month: string;
  monthLabel: string;
  income: number;
  expense: number;
  profit: number;
  profitMargin: number;
}

export interface BudgetVsActual {
  id: string;
  categoryName: string;
  type: 'income' | 'expense';
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
}

export interface FinanceReportsFilter {
  reportType?: 'income-statement' | 'cash-flow' | 'expense-breakdown' | 'monthly-trend' | 'budget-vs-actual';
  period?: string;
  dateFrom?: string;
  dateTo?: string;
  months?: number;
}

// Fetch income statement report
export async function fetchIncomeStatementReport(filter?: FinanceReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/finance/reports', {
      signal: controller.signal,
      params: {
        reportType: 'income-statement',
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      return {
        data: response.data.data as IncomeStatement,
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data laporan laba rugi',
        success: true
      };
    } else {
      console.warn('API returned success=false:', response.data);
      return {
        data: null,
        isFromMock: true,
        message: 'Respons API tidak sukses, menggunakan data sementara',
        success: false
      };
    }
  } catch (error) {
    console.error('Error fetching income statement report:', error);
    return {
      data: null,
      isFromMock: true,
      message: 'Gagal mengambil data laporan laba rugi, menggunakan data sementara',
      success: false
    };
  }
}

// Fetch cash flow report
export async function fetchCashFlowReport(filter?: FinanceReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/finance/reports', {
      signal: controller.signal,
      params: {
        reportType: 'cash-flow',
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      // Process dates
      const processedData = {
        ...response.data.data,
        cashFlowByDate: response.data.data.cashFlowByDate.map((item: any) => ({
          ...item,
          date: new Date(item.date)
        }))
      };

      return {
        data: processedData as CashFlow,
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data arus kas',
        success: true
      };
    } else {
      console.warn('API returned success=false:', response.data);
      return {
        data: null,
        isFromMock: true,
        message: 'Respons API tidak sukses, menggunakan data sementara',
        success: false
      };
    }
  } catch (error) {
    console.error('Error fetching cash flow report:', error);
    return {
      data: null,
      isFromMock: true,
      message: 'Gagal mengambil data arus kas, menggunakan data sementara',
      success: false
    };
  }
}

// Fetch expense breakdown report
export async function fetchExpenseBreakdownReport(filter?: FinanceReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/finance/reports', {
      signal: controller.signal,
      params: {
        reportType: 'expense-breakdown',
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      // Process dates in topExpenses
      const processedData = {
        ...response.data.data,
        topExpenses: response.data.data.topExpenses.map((expense: any) => ({
          ...expense,
          transactionDate: new Date(expense.transactionDate)
        }))
      };

      return {
        data: processedData as ExpenseBreakdown,
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data breakdown pengeluaran',
        success: true
      };
    } else {
      console.warn('API returned success=false:', response.data);
      return {
        data: null,
        isFromMock: true,
        message: 'Respons API tidak sukses, menggunakan data sementara',
        success: false
      };
    }
  } catch (error) {
    console.error('Error fetching expense breakdown report:', error);
    return {
      data: null,
      isFromMock: true,
      message: 'Gagal mengambil data breakdown pengeluaran, menggunakan data sementara',
      success: false
    };
  }
}

// Fetch monthly trend report
export async function fetchMonthlyTrendReport(filter?: FinanceReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/finance/reports', {
      signal: controller.signal,
      params: {
        reportType: 'monthly-trend',
        months: filter?.months || 12,
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      return {
        data: response.data.data as MonthlyTrend[],
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data tren bulanan',
        success: true
      };
    } else {
      console.warn('API returned success=false:', response.data);
      return {
        data: [],
        isFromMock: true,
        message: 'Respons API tidak sukses, menggunakan data sementara',
        success: false
      };
    }
  } catch (error) {
    console.error('Error fetching monthly trend report:', error);
    return {
      data: [],
      isFromMock: true,
      message: 'Gagal mengambil data tren bulanan, menggunakan data sementara',
      success: false
    };
  }
}

// Fetch budget vs actual report
export async function fetchBudgetVsActualReport(filter?: FinanceReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/finance/reports', {
      signal: controller.signal,
      params: {
        reportType: 'budget-vs-actual',
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      return {
        data: response.data.data as BudgetVsActual[],
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data budget vs aktual',
        success: true
      };
    } else {
      console.warn('API returned success=false:', response.data);
      return {
        data: [],
        isFromMock: true,
        message: 'Respons API tidak sukses, menggunakan data sementara',
        success: false
      };
    }
  } catch (error) {
    console.error('Error fetching budget vs actual report:', error);
    return {
      data: [],
      isFromMock: true,
      message: 'Gagal mengambil data budget vs aktual, menggunakan data sementara',
      success: false
    };
  }
}

// Generate/export report
export async function generateFinanceReport(reportType: string, parameters: any, format: string = 'pdf') {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await axios.post('/api/finance/reports', {
      reportType,
      ...parameters,
      format
    }, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      return {
        data: response.data.data,
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Laporan berhasil dibuat',
        success: true
      };
    } else {
      console.warn('API returned success=false:', response.data);
      return {
        data: null,
        isFromMock: true,
        message: 'Gagal membuat laporan',
        success: false
      };
    }
  } catch (error) {
    console.error('Error generating Finance report:', error);
    return {
      data: null,
      isFromMock: true,
      message: 'Gagal membuat laporan, silakan coba lagi',
      success: false
    };
  }
}
