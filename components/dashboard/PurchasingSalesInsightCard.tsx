import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FaShoppingCart, FaArrowUp, FaTruck } from 'react-icons/fa';

interface PurchasingSalesInsightCardProps {
  title?: string;
  data?: {
    totalSales: number;
    salesGrowth: number;
    totalPurchases: number;
    pendingOrders: number;
  };
}

const PurchasingSalesInsightCard: React.FC<PurchasingSalesInsightCardProps> = ({ 
  title = "Penjualan & Pembelian",
  data = {
    totalSales: 45200000,
    salesGrowth: 12.5,
    totalPurchases: 32500000,
    pendingOrders: 8
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
          <FaShoppingCart className="text-blue-600" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Penjualan</p>
              <div className="flex items-center space-x-1 text-green-600">
                <FaArrowUp className="text-xs" />
                <span className="text-xs font-medium">{data.salesGrowth}%</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(data.totalSales)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Bulan ini</p>
          </div>

          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <FaTruck className="text-orange-600" />
              <p className="text-sm text-gray-600">Total Pembelian</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(data.totalPurchases)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Bulan ini</p>
          </div>

          <div className="p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Purchase Order Pending</p>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-yellow-600">{data.pendingOrders}</p>
              <span className="text-xs text-gray-500">order menunggu</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PurchasingSalesInsightCard;
