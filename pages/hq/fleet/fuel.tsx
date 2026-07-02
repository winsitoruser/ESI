import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import FuelTransactionModal from '../../../components/hq/fleet/FuelTransactionModal';
import { 
  Fuel, 
  Plus,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Truck,
  Calendar,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { mockFuelTransactions } from '../../../lib/mockData/fleetAdvanced';

export default function FuelManagement() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState(mockFuelTransactions);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterFuelType, setFilterFuelType] = useState('all');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/fleet/fuel');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching fuel transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      const response = await fetch(`/api/fleet/fuel/${deleteConfirm}`, { method: 'DELETE' });
      
      if (response.ok) {
        setDeleteConfirm(null);
        fetchTransactions();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/fleet/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'fuel', format: 'csv' })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fuel-transactions-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  if (!mounted) return null;

  const totalFuelLiters = transactions.reduce((sum, t) => sum + t.quantityLiters, 0);
  const totalFuelCost = transactions.reduce((sum, t) => sum + t.totalCost, 0);
  const avgPricePerLiter = totalFuelCost / totalFuelLiters;

  const filteredTransactions = transactions.filter(t => {
    const matchSearch = searchQuery === '' || 
      t.fuelStation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchVehicle = filterVehicle === 'all' || t.vehicleId === filterVehicle;
    const matchFuelType = filterFuelType === 'all' || t.fuelType === filterFuelType;
    return matchSearch && matchVehicle && matchFuelType;
  });

  return (
    <HQLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('fleet.fuelTitle')}</h1>
          <p className="text-gray-600">{t('fleet.fuelSubtitle')}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Fuel className="w-6 h-6 text-orange-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">{t('fleet.totalFuelMonth')}</p>
            <p className="text-2xl font-bold text-gray-900">{totalFuelLiters.toLocaleString()} L</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-red-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">{t('fleet.totalCostMonth')}</p>
            <p className="text-2xl font-bold text-gray-900">
              Rp {(totalFuelCost / 1000000).toFixed(1)}Jt
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Avg Price/Liter</p>
            <p className="text-2xl font-bold text-gray-900">
              Rp {avgPricePerLiter.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-green-100 rounded-lg">
                <Truck className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Avg Efficiency</p>
            <p className="text-2xl font-bold text-gray-900">7.2 km/L</p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search fuel station..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <select
                  value={filterVehicle}
                  onChange={(e) => setFilterVehicle(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Vehicles</option>
                  <option value="veh-001">B 1234 XYZ</option>
                  <option value="veh-002">B 5678 ABC</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button 
                  onClick={fetchTransactions}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => { setSelectedTransaction(null); setShowTransactionModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Transaction
                </button>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Vehicle</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Station</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Fuel Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Price/L</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Total Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Odometer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(transaction.transactionDate).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {transaction.vehicleId === 'veh-001' ? 'B 1234 XYZ' : 'B 5678 ABC'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.fuelStation}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          transaction.fuelType === 'diesel' ? 'bg-yellow-100 text-yellow-800' :
                          transaction.fuelType === 'petrol' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {transaction.fuelType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.quantityLiters} L</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        Rp {transaction.pricePerLiter.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        Rp {transaction.totalCost.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {transaction.odometerReading.toLocaleString()} km
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          {transaction.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { setSelectedTransaction(transaction); setShowTransactionModal(true); }}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(transaction.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Fuel Efficiency Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fuel Cost Trend</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">Chart: Monthly fuel cost trend</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Efficiency by Vehicle</h3>
            <div className="space-y-3">
              {[
                { vehicle: 'B 1234 XYZ', efficiency: 8.5, cost: 2500000 },
                { vehicle: 'B 5678 ABC', efficiency: 7.8, cost: 1800000 },
                { vehicle: 'B 9999 DEF', efficiency: 6.5, cost: 3200000 }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{item.vehicle}</p>
                    <p className="text-sm text-gray-600">
                      Rp {(item.cost / 1000000).toFixed(1)}Jt this month
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{item.efficiency} km/L</p>
                    <p className="text-xs text-gray-500">Efficiency</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showTransactionModal && (
        <FuelTransactionModal
          transaction={selectedTransaction}
          onClose={() => { setShowTransactionModal(false); setSelectedTransaction(null); }}
          onSuccess={() => { fetchTransactions(); }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Konfirmasi Hapus</h3>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin menghapus transaksi ini?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </HQLayout>
  );
}
