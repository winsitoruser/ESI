import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FaMoneyBillWave, FaFileInvoice, FaCreditCard, FaExclamationTriangle } from 'react-icons/fa';

interface BillingStats {
  totalRevenue: number;
  pendingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
}

interface BillingDashboardWidgetProps {
  stats?: BillingStats;
  className?: string;
}

export const BillingDashboardWidget: React.FC<BillingDashboardWidgetProps> = ({ 
  stats = {
    totalRevenue: 125000000,
    pendingInvoices: 12,
    paidInvoices: 45,
    overdueInvoices: 3
  },
  className = ''
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FaMoneyBillWave className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Pendapatan</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs text-green-600 mt-1">Bulan ini</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FaFileInvoice className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Invoice Pending</p>
          <p className="text-2xl font-bold text-gray-900">{stats.pendingInvoices}</p>
          <p className="text-xs text-gray-500 mt-1">Menunggu pembayaran</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FaCreditCard className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Invoice Terbayar</p>
          <p className="text-2xl font-bold text-gray-900">{stats.paidInvoices}</p>
          <p className="text-xs text-gray-500 mt-1">Bulan ini</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <FaExclamationTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Invoice Jatuh Tempo</p>
          <p className="text-2xl font-bold text-gray-900">{stats.overdueInvoices}</p>
          <p className="text-xs text-red-600 mt-1">Perlu tindakan</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingDashboardWidget;
