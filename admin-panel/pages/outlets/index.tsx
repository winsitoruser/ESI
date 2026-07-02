import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  Store,
  Search,
  Filter,
  MapPin,
  Activity,
  CheckCircle,
  XCircle,
  ChevronLeft,
  Eye,
  Wifi,
  WifiOff
} from 'lucide-react';

interface Outlet {
  id: string;
  outlet_name: string;
  outlet_code: string;
  partner: {
    id: string;
    business_name: string;
    status: string;
  };
  address: string;
  city: string;
  province: string;
  phone: string;
  manager_name: string;
  is_active: boolean;
  pos_device_id: string | null;
  last_sync_at: string | null;
  today_transactions: number;
  monthly_transactions: number;
  created_at: string;
}

export default function OutletsManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOutlets, setTotalOutlets] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session && !['ADMIN', 'SUPER_ADMIN'].includes(session.user?.role as string)) {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      fetchOutlets();
    }
  }, [status, session, router, currentPage, activeFilter, cityFilter]);

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(activeFilter && { is_active: activeFilter }),
        ...(cityFilter && { city: cityFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/admin/outlets?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch outlets');
      }

      const data = await response.json();
      setOutlets(data.data);
      setTotalPages(data.pagination.total_pages);
      setTotalOutlets(data.pagination.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchOutlets();
  };

  const getSyncStatus = (lastSyncAt: string | null) => {
    if (!lastSyncAt) {
      return { status: 'never', color: 'text-gray-400', icon: WifiOff };
    }

    const lastSync = new Date(lastSyncAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60));

    if (diffMinutes < 5) {
      return { status: 'online', color: 'text-green-600', icon: Wifi };
    } else if (diffMinutes < 30) {
      return { status: 'recent', color: 'text-blue-600', icon: Wifi };
    } else {
      return { status: 'offline', color: 'text-red-600', icon: WifiOff };
    }
  };

  const formatLastSync = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return 'Never synced';
    
    const lastSync = new Date(lastSyncAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  if (loading && outlets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading outlets...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Outlets Management - Admin Bedagang</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/admin" className="text-gray-400 hover:text-gray-600">
                  <ChevronLeft className="h-6 w-6" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Outlets Management</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Monitor all POS outlets across partners
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{totalOutlets}</p>
                  <p className="text-xs text-gray-500">Total Outlets</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by name, code, manager..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              {/* City Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder="Filter by city"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {outlets.length} of {totalOutlets} outlets
              </p>
              <button
                onClick={handleSearch}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </button>
            </div>
          </div>

          {/* Outlets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outlets.map((outlet) => {
              const syncStatus = getSyncStatus(outlet.last_sync_at);
              const SyncIcon = syncStatus.icon;

              return (
                <div
                  key={outlet.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/admin/outlets/${outlet.id}`)}
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Store className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{outlet.outlet_name}</h3>
                          <p className="text-xs text-gray-500">{outlet.outlet_code}</p>
                        </div>
                      </div>
                      {outlet.is_active ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>

                    {/* Partner Info */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Partner</p>
                      <p className="text-sm font-medium text-gray-900">
                        {outlet.partner.business_name}
                      </p>
                    </div>

                    {/* Location */}
                    <div className="flex items-start space-x-2 mb-3">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div className="text-sm text-gray-600">
                        <p>{outlet.city}</p>
                        {outlet.manager_name && (
                          <p className="text-xs text-gray-500">Manager: {outlet.manager_name}</p>
                        )}
                      </div>
                    </div>

                    {/* Sync Status */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                      <div className="flex items-center space-x-2">
                        <SyncIcon className={`h-4 w-4 ${syncStatus.color}`} />
                        <span className={`text-xs font-medium ${syncStatus.color}`}>
                          {formatLastSync(outlet.last_sync_at)}
                        </span>
                      </div>
                      {outlet.pos_device_id && (
                        <span className="text-xs text-gray-500">
                          Device: {outlet.pos_device_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>

                    {/* Transaction Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Today</p>
                        <p className="text-lg font-bold text-gray-900">
                          {outlet.today_transactions}
                        </p>
                        <p className="text-xs text-gray-500">transactions</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">This Month</p>
                        <p className="text-lg font-bold text-gray-900">
                          {outlet.monthly_transactions}
                        </p>
                        <p className="text-xs text-gray-500">transactions</p>
                      </div>
                    </div>

                    {/* View Details Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/outlets/${outlet.id}`);
                      }}
                      className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}

          {outlets.length === 0 && !loading && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No outlets found</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
