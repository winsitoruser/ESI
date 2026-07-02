import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import Modal from '../../../components/hq/ui/Modal';
import { StatusBadge } from '../../../components/hq/ui/Badge';
import {
  UserCog,
  RefreshCw,
  Search,
  Building2,
  Phone,
  Mail,
  Calendar,
  Award,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Star,
  MapPin,
  BarChart3,
  Users,
  Target,
  CheckCircle
} from 'lucide-react';

interface Manager {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  branchId: string;
  branchName: string;
  branchCode: string;
  branchCity: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'on_leave';
  performance: {
    salesTarget: number;
    salesActual: number;
    achievement: number;
    rating: number;
    employeeCount: number;
    activeEmployees: number;
  };
  lastActive: string;
}

export default function ManagersPage() {
  const [mounted, setMounted] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);

  const fetchManagers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hq/managers');
      if (response.ok) {
        const json = await response.json();
        const payload = json.data || json;
        if (payload.managers) setManagers(payload.managers);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchManagers();
  }, []);

  if (!mounted) {
    return null;
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(2)}M`;
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)}Jt`;
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <StatusBadge status="active" />;
      case 'inactive': return <StatusBadge status="inactive" />;
      case 'on_leave': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Cuti</span>;
      default: return <StatusBadge status="inactive" />;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star 
            key={star} 
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const filteredManagers = managers.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: managers.length,
    active: managers.filter(m => m.status === 'active').length,
    onTarget: managers.filter(m => m.performance.achievement >= 100).length,
    avgRating: managers.length > 0 
      ? managers.reduce((sum, m) => sum + m.performance.rating, 0) / managers.length 
      : 0
  };

  return (
    <HQLayout title="Daftar Manager" subtitle="Kelola manager cabang">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserCog className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Manager</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                <p className="text-sm text-gray-500">Aktif</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.onTarget}</p>
                <p className="text-sm text-gray-500">On Target</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.avgRating.toFixed(1)}</p>
                <p className="text-sm text-gray-500">Avg Rating</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari manager..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="on_leave">Cuti</option>
                <option value="inactive">Tidak Aktif</option>
              </select>
            </div>
            <button
              onClick={fetchManagers}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Manager Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredManagers.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-gray-500">
              Tidak ada manager ditemukan
            </div>
          ) : (
            filteredManagers.map((manager) => (
              <div key={manager.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                        {manager.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{manager.name}</h3>
                        <p className="text-sm text-gray-500">{manager.email}</p>
                      </div>
                    </div>
                    {getStatusBadge(manager.status)}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Building2 className="w-4 h-4" />
                      <span className="font-medium">{manager.branchName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="w-4 h-4" />
                      <span>{manager.branchCity}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Achievement</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              manager.performance.achievement >= 100 ? 'bg-green-500' : 
                              manager.performance.achievement >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(manager.performance.achievement, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${
                          manager.performance.achievement >= 100 ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {manager.performance.achievement}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Rating</span>
                      {renderStars(manager.performance.rating)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Tim</span>
                      <span className="text-sm font-medium">
                        {manager.performance.activeEmployees}/{manager.performance.employeeCount} aktif
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>Bergabung {new Date(manager.joinDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedManager(manager);
                      setShowViewModal(true);
                    }}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    Detail
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* View Modal */}
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title={selectedManager?.name || 'Detail Manager'}
          size="lg"
        >
          {selectedManager && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                  {selectedManager.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{selectedManager.name}</h3>
                    {getStatusBadge(selectedManager.status)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      {selectedManager.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      {selectedManager.phone}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Cabang yang Dikelola
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nama Cabang</p>
                    <p className="font-medium">{selectedManager.branchName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kode</p>
                    <p className="font-medium font-mono">{selectedManager.branchCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kota</p>
                    <p className="font-medium">{selectedManager.branchCity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Jumlah Karyawan</p>
                    <p className="font-medium">{selectedManager.performance.employeeCount}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Performa
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-600 mb-1">Target</p>
                    <p className="text-xl font-bold text-blue-900">{formatCurrency(selectedManager.performance.salesTarget)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-green-600 mb-1">Aktual</p>
                    <p className="text-xl font-bold text-green-900">{formatCurrency(selectedManager.performance.salesActual)}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Achievement</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            selectedManager.performance.achievement >= 100 ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${Math.min(selectedManager.performance.achievement, 100)}%` }}
                        />
                      </div>
                      <span className={`font-bold ${
                        selectedManager.performance.achievement >= 100 ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {selectedManager.performance.achievement}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Rating</span>
                    {renderStars(selectedManager.performance.rating)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-200">
                <span>Bergabung: {new Date(selectedManager.joinDate).toLocaleDateString('id-ID')}</span>
                <span>Terakhir aktif: {new Date(selectedManager.lastActive).toLocaleString('id-ID')}</span>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </HQLayout>
  );
}
