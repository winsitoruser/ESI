import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FaMoneyBillWave, FaArrowUp, FaArrowDown } from 'react-icons/fa';

interface FinanceInsightCardProps {
  title?: string;
  data?: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
}

const FinanceInsightCard: React.FC<FinanceInsightCardProps> = ({ 
  title = "Ringkasan Keuangan",
  data = {
    totalRevenue: 45200000,
    totalExpenses: 32500000,
    netProfit: 12700000,
    profitMargin: 28.1
  }
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FaMoneyBillWave className="text-green-600" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Total Pendapatan</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(data.totalRevenue)}
              </p>
            </div>
            <FaArrowUp className="text-green-600 text-2xl" />
          </div>

          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Total Pengeluaran</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(data.totalExpenses)}
              </p>
            </div>
            <FaArrowDown className="text-red-600 text-2xl" />
          </div>

          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Laba Bersih</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(data.netProfit)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Margin</p>
              <p className="text-lg font-bold text-blue-600">
                {data.profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinanceInsightCard;
