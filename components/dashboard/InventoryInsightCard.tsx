import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FaBoxes, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { Progress } from '@/components/ui/progress';

interface InventoryInsightCardProps {
  title?: string;
  data?: {
    totalProducts: number;
    lowStockItems: number;
    outOfStockItems: number;
    stockValue: number;
  };
}

const InventoryInsightCard: React.FC<InventoryInsightCardProps> = ({ 
  title = "Status Inventory",
  data = {
    totalProducts: 342,
    lowStockItems: 23,
    outOfStockItems: 5,
    stockValue: 125000000
  }
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const healthyStock = data.totalProducts - data.lowStockItems - data.outOfStockItems;
  const healthPercentage = (healthyStock / data.totalProducts) * 100;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FaBoxes className="text-purple-600" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Produk</p>
            <p className="text-2xl font-bold text-purple-600">{data.totalProducts}</p>
            <p className="text-xs text-gray-500 mt-1">
              Nilai Stok: {formatCurrency(data.stockValue)}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Kesehatan Stok</span>
              <span className="text-sm font-medium">{healthPercentage.toFixed(0)}%</span>
            </div>
            <Progress value={healthPercentage} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <FaCheckCircle className="text-green-600 text-sm" />
                <p className="text-xs text-gray-600">Stok Sehat</p>
              </div>
              <p className="text-lg font-bold text-green-600">{healthyStock}</p>
            </div>

            <div className="p-2 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <FaExclamationTriangle className="text-yellow-600 text-sm" />
                <p className="text-xs text-gray-600">Stok Rendah</p>
              </div>
              <p className="text-lg font-bold text-yellow-600">{data.lowStockItems}</p>
            </div>

            <div className="p-2 bg-red-50 rounded-lg col-span-2">
              <div className="flex items-center space-x-2 mb-1">
                <FaExclamationTriangle className="text-red-600 text-sm" />
                <p className="text-xs text-gray-600">Stok Habis</p>
              </div>
              <p className="text-lg font-bold text-red-600">{data.outOfStockItems}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryInsightCard;
