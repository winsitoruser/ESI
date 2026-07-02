import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Period = 'week' | 'month' | 'quarter' | 'year';

interface FinancePeriodContextType {
  period: Period;
  setPeriod: (p: Period) => void;
  periodLabel: string;
  dateRange: { start: Date; end: Date };
}

const FinancePeriodContext = createContext<FinancePeriodContextType>({
  period: 'month',
  setPeriod: () => {},
  periodLabel: 'Bulan Ini',
  dateRange: { start: new Date(), end: new Date() },
});

export function useFinancePeriod() {
  return useContext(FinancePeriodContext);
}

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Minggu Ini',
  month: 'Bulan Ini',
  quarter: 'Kuartal Ini',
  year: 'Tahun Ini',
};

function getDateRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date();
  switch (period) {
    case 'week': start.setDate(now.getDate() - 7); break;
    case 'month': start.setMonth(now.getMonth() - 1); break;
    case 'quarter': start.setMonth(now.getMonth() - 3); break;
    case 'year': start.setFullYear(now.getFullYear() - 1); break;
  }
  return { start, end: now };
}

export function FinancePeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriodState] = useState<Period>('month');

  const setPeriod = useCallback((p: Period) => {
    setPeriodState(p);
  }, []);

  const value: FinancePeriodContextType = {
    period,
    setPeriod,
    periodLabel: PERIOD_LABELS[period],
    dateRange: getDateRange(period),
  };

  return (
    <FinancePeriodContext.Provider value={value}>
      {children}
    </FinancePeriodContext.Provider>
  );
}

/**
 * PeriodSelector - Reusable period filter component for finance pages.
 * Drop this into any finance page to get a consistent period selector
 * that syncs with all other finance pages via FinancePeriodContext.
 */
export function PeriodSelector({ className = '' }: { className?: string }) {
  const { period, setPeriod } = useFinancePeriod();

  const periods: { value: Period; label: string }[] = [
    { value: 'week', label: 'Minggu' },
    { value: 'month', label: 'Bulan' },
    { value: 'quarter', label: 'Kuartal' },
    { value: 'year', label: 'Tahun' },
  ];

  return (
    <div className={`inline-flex rounded-lg border border-gray-200 bg-white p-1 ${className}`}>
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => setPeriod(p.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            period === p.value
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
