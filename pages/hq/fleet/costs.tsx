import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { 
  DollarSign, 
  Plus,
  Download,
  TrendingUp,
  TrendingDown,
  Fuel,
  Wrench,
  Users,
  Shield,
  Calendar,
  Filter
} from 'lucide-react';

const MOCK_FLEET_COSTS = [
  { id: 'fc1', vehicleId: 'v1', licensePlate: 'B 1234 CD', costCategory: 'fuel', description: 'BBM Pertamax', amount: 850000, date: '2026-03-14', vendor: 'SPBU 31.101' },
  { id: 'fc2', vehicleId: 'v2', licensePlate: 'B 5678 EF', costCategory: 'maintenance', description: 'Service berkala 10.000km', amount: 2500000, date: '2026-03-12', vendor: 'Bengkel Resmi Toyota' },
  { id: 'fc3', vehicleId: 'v1', licensePlate: 'B 1234 CD', costCategory: 'insurance', description: 'Asuransi tahunan', amount: 4500000, date: '2026-03-01', vendor: 'Asuransi Jasindo' },
];
const MOCK_FLEET_COST_SUMMARY = { totalAmount: 28500000, byCategory: { fuel: 12500000, maintenance: 8500000, salary: 5000000, insurance: 2500000 } };

export default function CostReporting() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [costs, setCosts] = useState<any[]>(MOCK_FLEET_COSTS);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<any>(MOCK_FLEET_COST_SUMMARY);

  useEffect(() => {
    setMounted(true);
    fetchCosts();
  }, [selectedCategory]);

  const fetchCosts = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      const res = await fetch(`/api/fleet/costs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCosts(data.data || []);
        setSummary(data.summary || { totalAmount: 0, byCategory: {} });
      }
    } catch (e) { console.error('Costs fetch failed:', e); setCosts(MOCK_FLEET_COSTS); setSummary(MOCK_FLEET_COST_SUMMARY); }
  };

  if (!mounted) return null;

  const totalCost = summary.totalAmount || costs.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  const fuelCost = summary.byCategory?.fuel || 0;
  const maintenanceCost = summary.byCategory?.maintenance || 0;
  const salaryCost = summary.byCategory?.salary || 0;
  const insuranceCost = summary.byCategory?.insurance || 0;

  const costByCategory = [
    { category: 'Fuel', amount: fuelCost, icon: Fuel, color: 'bg-orange-100 text-orange-600', percentage: (fuelCost / totalCost) * 100 },
    { category: 'Maintenance', amount: maintenanceCost, icon: Wrench, color: 'bg-purple-100 text-purple-600', percentage: (maintenanceCost / totalCost) * 100 },
    { category: 'Salary', amount: salaryCost, icon: Users, color: 'bg-blue-100 text-blue-600', percentage: (salaryCost / totalCost) * 100 },
    { category: 'Insurance', amount: insuranceCost, icon: Shield, color: 'bg-green-100 text-green-600', percentage: (insuranceCost / totalCost) * 100 }
  ];

  const filteredCosts = costs.filter(c => {
    if (selectedCategory !== 'all' && c.costCategory !== selectedCategory) return false;
    return true;
  });

  return (
    <HQLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('fleet.costsTitle')}</h1>
          <p className="text-gray-600">{t('fleet.costsSubtitle')}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-red-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">{t('fleet.totalOperatingCost')}</p>
            <p className="text-2xl font-bold text-gray-900">
              Rp {(totalCost / 1000000).toFixed(1)}Jt
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Fuel className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">{t('fleet.fuelCost')}</p>
            <p className="text-2xl font-bold text-gray-900">
              Rp {(fuelCost / 1000000).toFixed(1)}Jt
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {((fuelCost / totalCost) * 100).toFixed(0)}% of total
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Wrench className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">{t('fleet.maintenanceCost')}</p>
            <p className="text-2xl font-bold text-gray-900">
              Rp {(maintenanceCost / 1000000).toFixed(1)}Jt
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {((maintenanceCost / totalCost) * 100).toFixed(0)}% of total
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">{t('fleet.driverCost')}</p>
            <p className="text-2xl font-bold text-gray-900">
              Rp {(salaryCost / 1000000).toFixed(1)}Jt
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {((salaryCost / totalCost) * 100).toFixed(0)}% of total
            </p>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost by Category</h3>
            <div className="space-y-4">
              {costByCategory.map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${item.color}`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{item.category}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      Rp {(item.amount / 1000000).toFixed(1)}Jt
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{item.percentage.toFixed(1)}% of total</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Trend</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">Chart: Monthly cost trend would display here</p>
            </div>
          </div>
        </div>

        {/* Cost Records */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Cost Records</h3>
              <div className="flex items-center gap-3">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="fuel">Fuel</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="salary">Salary</option>
                  <option value="insurance">Insurance</option>
                  <option value="parking">Parking</option>
                  <option value="fines">Fines</option>
                </select>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                  Add Cost
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Vehicle/Driver</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Vendor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCosts.map(cost => (
                    <tr key={cost.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(cost.costDate).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          cost.costCategory === 'fuel' ? 'bg-orange-100 text-orange-800' :
                          cost.costCategory === 'maintenance' ? 'bg-purple-100 text-purple-800' :
                          cost.costCategory === 'salary' ? 'bg-blue-100 text-blue-800' :
                          cost.costCategory === 'insurance' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {cost.costCategory}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{cost.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {cost.vehicleId ? (cost.vehicleId === 'veh-001' ? 'B 1234 XYZ' : 'B 5678 ABC') :
                         cost.driverId ? (cost.driverId === 'drv-001' ? 'Budi Santoso' : 'Ahmad Hidayat') :
                         '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{cost.vendor || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{cost.paymentMethod}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        Rp {cost.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
