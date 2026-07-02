import { useState, useEffect } from 'react';

interface DashboardData {
  finance: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
  inventory: {
    totalProducts: number;
    lowStockItems: number;
    outOfStockItems: number;
    stockValue: number;
  };
  sales: {
    totalSales: number;
    salesGrowth: number;
    totalPurchases: number;
    pendingOrders: number;
  };
  employees: {
    totalEmployees: number;
    activeShifts: number;
    todaySchedule: number;
    attendance: number;
  };
}

export const useIntegratedDashboardData = () => {
  const [data, setData] = useState<DashboardData>({
    finance: {
      totalRevenue: 45200000,
      totalExpenses: 32500000,
      netProfit: 12700000,
      profitMargin: 28.1
    },
    inventory: {
      totalProducts: 342,
      lowStockItems: 23,
      outOfStockItems: 5,
      stockValue: 125000000
    },
    sales: {
      totalSales: 45200000,
      salesGrowth: 12.5,
      totalPurchases: 32500000,
      pendingOrders: 8
    },
    employees: {
      totalEmployees: 24,
      activeShifts: 6,
      todaySchedule: 18,
      attendance: 94.5
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API calls
      // const response = await fetch('/api/dashboard/integrated');
      // const result = await response.json();
      // setData(result);
      
      // For now, using mock data
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};

export default useIntegratedDashboardData;
