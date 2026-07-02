import React, { useState, useEffect } from 'react';
import { 
  FaChartLine, FaMoneyBillWave, FaArrowUp, FaArrowDown, 
  FaCalendar, FaDownload, FaInfoCircle, FaChartBar, FaWallet
} from 'react-icons/fa';
import {
  fetchIncomeStatementReport,
  fetchCashFlowReport,
  fetchExpenseBreakdownReport,
  fetchMonthlyTrendReport,
  IncomeStatement,
  CashFlow,
  ExpenseBreakdown,
  MonthlyTrend
} from '@/lib/adapters/finance-reports-adapter';

const ReportsComponent: React.FC = () => {
  const [period, setPeriod] = useState('month');
  const [isLoading, setIsLoading] = useState(false);
  const [isFromMock, setIsFromMock] = useState(false);
  const [activeTab, setActiveTab] = useState<'income' | 'cashflow' | 'expense' | 'trend'>('income');
  
  // State for each report type
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlow | null>(null);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);

  // Load reports data
  const loadReportsData = async () => {
    setIsLoading(true);
    try {
      // Fetch all reports in parallel
      const [incomeResult, cashFlowResult, expenseResult, trendResult] = await Promise.all([
        fetchIncomeStatementReport({ period }),
        fetchCashFlowReport({ period }),
        fetchExpenseBreakdownReport({ period }),
        fetchMonthlyTrendReport({ months: 6 })
      ]);

      if (incomeResult.success && incomeResult.data) {
        setIncomeStatement(incomeResult.data);
        setIsFromMock(incomeResult.isFromMock);
      }

      if (cashFlowResult.success && cashFlowResult.data) {
        setCashFlow(cashFlowResult.data);
      }

      if (expenseResult.success && expenseResult.data) {
        setExpenseBreakdown(expenseResult.data);
      }

      if (trendResult.success && trendResult.data) {
        setMonthlyTrend(trendResult.data);
      }
    } catch (error) {
      console.error('Error loading finance reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount and period change
  useEffect(() => {
    loadReportsData();
  }, [period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button 
              onClick={() => setPeriod('today')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                period === 'today' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hari Ini
            </button>
            <button 
              onClick={() => setPeriod('week')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                period === 'week' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Minggu Ini
            </button>
            <button 
              onClick={() => setPeriod('month')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                period === 'month' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Bulan Ini
            </button>
            <button 
              onClick={() => setPeriod('year')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                period === 'year' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tahun Ini
            </button>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
              <FaDownload />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mock Data Indicator */}
      {isFromMock && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
          <FaInfoCircle className="text-orange-600 text-xl" />
          <div>
            <p className="text-sm font-medium text-orange-800">Menggunakan Data Sample</p>
            <p className="text-xs text-orange-600">Database belum terhubung. Data yang ditampilkan adalah contoh.</p>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 w-32 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total Income */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FaMoneyBillWave className="w-6 h-6 text-green-600" />
              </div>
              <span className="flex items-center text-green-600 text-sm font-medium">
                <FaArrowUp className="mr-1" />
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Pendapatan</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(incomeStatement?.summary.totalIncome || 0)}
            </p>
          </div>

          {/* Total Expense */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <FaWallet className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Pengeluaran</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(incomeStatement?.summary.totalExpense || 0)}
            </p>
          </div>

          {/* Net Profit */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaChartLine className="w-6 h-6 text-blue-600" />
              </div>
              <span className={`flex items-center text-sm font-medium ${
                (incomeStatement?.summary.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(incomeStatement?.summary.netProfit || 0) >= 0 ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Laba Bersih</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(incomeStatement?.summary.netProfit || 0)}
            </p>
          </div>

          {/* Profit Margin */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FaChartBar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Margin Keuntungan</p>
            <p className="text-2xl font-bold text-gray-900">
              {(incomeStatement?.summary.profitMargin || 0).toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setActiveTab('income')}
              className={`py-4 px-4 border-b-2 transition-colors ${
                activeTab === 'income'
                  ? 'border-orange-600 text-orange-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Laporan Laba Rugi
            </button>
            <button
              onClick={() => setActiveTab('cashflow')}
              className={`py-4 px-4 border-b-2 transition-colors ${
                activeTab === 'cashflow'
                  ? 'border-orange-600 text-orange-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Arus Kas
            </button>
            <button
              onClick={() => setActiveTab('expense')}
              className={`py-4 px-4 border-b-2 transition-colors ${
                activeTab === 'expense'
                  ? 'border-orange-600 text-orange-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Breakdown Pengeluaran
            </button>
            <button
              onClick={() => setActiveTab('trend')}
              className={`py-4 px-4 border-b-2 transition-colors ${
                activeTab === 'trend'
                  ? 'border-orange-600 text-orange-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Tren Bulanan
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Income Statement Tab */}
          {activeTab === 'income' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Income by Category */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Pendapatan per Kategori</h3>
                  <div className="space-y-3">
                    {incomeStatement?.incomeByCategory.map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{category.categoryName}</p>
                          <p className="text-sm text-gray-600">{category.transactionCount} transaksi</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(category.amount)}</p>
                          <p className="text-sm text-gray-600">{category.percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expense by Category */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Pengeluaran per Kategori</h3>
                  <div className="space-y-3">
                    {incomeStatement?.expenseByCategory.map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{category.categoryName}</p>
                          <p className="text-sm text-gray-600">{category.transactionCount} transaksi</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(category.amount)}</p>
                          <p className="text-sm text-gray-600">{category.percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cash Flow Tab */}
          {activeTab === 'cashflow' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-700 mb-1">Total Kas Masuk</p>
                  <p className="text-xl font-bold text-green-900">
                    {formatCurrency(cashFlow?.summary.totalCashIn || 0)}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-700 mb-1">Total Kas Keluar</p>
                  <p className="text-xl font-bold text-red-900">
                    {formatCurrency(cashFlow?.summary.totalCashOut || 0)}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700 mb-1">Saldo Akhir</p>
                  <p className="text-xl font-bold text-blue-900">
                    {formatCurrency(cashFlow?.summary.endingBalance || 0)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Arus Kas per Metode Pembayaran</h3>
                <div className="space-y-3">
                  {cashFlow?.cashFlowByMethod.map((method, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{method.paymentMethod}</p>
                      </div>
                      <div className="flex gap-6 text-right">
                        <div>
                          <p className="text-xs text-gray-600">Masuk</p>
                          <p className="font-semibold text-green-600">{formatCurrency(method.cashIn)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Keluar</p>
                          <p className="font-semibold text-red-600">{formatCurrency(method.cashOut)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Net</p>
                          <p className={`font-semibold ${method.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(method.netFlow)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Expense Breakdown Tab */}
          {activeTab === 'expense' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm text-orange-700 mb-1">Total Pengeluaran</p>
                  <p className="text-xl font-bold text-orange-900">
                    {formatCurrency(expenseBreakdown?.summary.totalExpenses || 0)}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-700 mb-1">Total Transaksi</p>
                  <p className="text-xl font-bold text-purple-900">
                    {expenseBreakdown?.summary.totalTransactions || 0}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700 mb-1">Rata-rata</p>
                  <p className="text-xl font-bold text-blue-900">
                    {formatCurrency(expenseBreakdown?.summary.averageExpense || 0)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pengeluaran per Kategori</h3>
                <div className="space-y-3">
                  {expenseBreakdown?.expenseByCategory.map((category) => (
                    <div key={category.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900">{category.categoryName}</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(category.totalAmount)}</p>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>{category.transactionCount} transaksi</span>
                        <span>{category.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="mt-2 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-orange-600 h-2 rounded-full transition-all"
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Monthly Trend Tab */}
          {activeTab === 'trend' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Tren 6 Bulan Terakhir</h3>
              <div className="space-y-3">
                {monthlyTrend.map((trend, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-gray-900">{trend.monthLabel}</p>
                      <span className={`text-sm font-medium ${
                        trend.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(trend.profitMargin)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Pendapatan</p>
                        <p className="font-semibold text-green-600">{formatCurrency(trend.income)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Pengeluaran</p>
                        <p className="font-semibold text-red-600">{formatCurrency(trend.expense)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Laba</p>
                        <p className={`font-semibold ${trend.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(trend.profit)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsComponent;
