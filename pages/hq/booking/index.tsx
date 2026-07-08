import React, { useState, useEffect, useCallback } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  Calendar, Search, Plus, Filter, ChevronDown, MoreHorizontal,
  Edit, Trash2, Eye, RefreshCw, Phone, Mail,
  Clock, DollarSign, Dog, Syringe, Heart, Hotel,
  CheckCircle, XCircle, AlertCircle, Clock as ClockIcon,
  ChevronLeft, ChevronRight, User, MapPin, Truck,
} from 'lucide-react';
import Link from 'next/link';

type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
type ServiceType = 'grooming' | 'clinic' | 'hotel' | 'transport' | 'daycare' | 'training' | 'other';

interface Booking {
  id: string;
  code: string;
  status: BookingStatus;
  petOwnerName: string;
  petOwnerPhone: string;
  petOwnerEmail: string;
  petName: string;
  petType: string;
  petBreed: string;
  serviceType: ServiceType;
  partnerName: string;
  partnerType: string;
  notes: string;
  scheduledAt: string;
  completedAt: string | null;
  totalFee: number;
  rating: number | null;
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: ClockIcon },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
  no_show: { label: 'No Show', color: 'bg-gray-100 text-gray-600', icon: AlertCircle },
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  grooming: 'Grooming',
  clinic: 'Klinik',
  hotel: 'Pet Hotel',
  transport: 'Pet Transport',
  daycare: 'Daycare',
  training: 'Training',
  other: 'Lainnya',
};

const SERVICE_TYPE_ICONS: Record<string, any> = {
  grooming: Dog,
  clinic: Syringe,
  hotel: Hotel,
  transport: Truck,
  daycare: Heart,
  training: Dog,
  other: Calendar,
};

const PARTNER_TYPE_LABELS: Record<string, string> = {
  petshop: 'Pet Shop',
  petclinic: 'Pet Clinic',
  pethotel: 'Pet Hotel',
  pettransport: 'Pet Transport',
};

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function BookingPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (serviceFilter) params.set('serviceType', serviceFilter);

      const res = await fetch(`/api/hq/booking?${params}`);
      const json = await res.json();

      if (json.success) {
        setBookings(json.data);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages);
          setTotal(json.pagination.total);
        }
      } else {
        toast.error(json.error || 'Gagal memuat data booking');
      }
    } catch {
      toast.error('Gagal memuat data booking');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, serviceFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Hapus booking "${code}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/hq/booking/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Booking dihapus');
        fetchBookings();
      } else {
        toast.error(json.error || 'Gagal menghapus');
      }
    } catch {
      toast.error('Gagal menghapus booking');
    }
  };

  const StatusBadge = ({ status }: { status: BookingStatus }) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const ServiceIcon = ({ type }: { type: string }) => {
    const Icon = SERVICE_TYPE_ICONS[type] || Calendar;
    const colors: Record<string, string> = {
      grooming: 'text-amber-600 bg-amber-50',
      clinic: 'text-red-600 bg-red-50',
      hotel: 'text-purple-600 bg-purple-50',
      transport: 'text-blue-600 bg-blue-50',
      daycare: 'text-green-600 bg-green-50',
      training: 'text-indigo-600 bg-indigo-50',
    };
    return (
      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${colors[type] || 'text-gray-600 bg-gray-50'}`}>
        <Icon className="w-4 h-4" />
      </span>
    );
  };

  const handleRefresh = () => {
    setPage(1);
    fetchBookings();
  };

  return (
    <HQLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Kelola booking layanan dari pet owner ke partner
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari pet owner, hewan, atau kode booking..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Semua Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <select
              value={serviceFilter}
              onChange={(e) => { setServiceFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Semua Layanan</option>
              {Object.entries(SERVICE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Booking', value: total, color: 'text-blue-600', bg: 'bg-blue-50', icon: Calendar },
            { label: 'Pending', value: bookings.filter(b => b.status === 'pending').length, color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock },
            { label: 'Completed', value: bookings.filter(b => b.status === 'completed').length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
            { label: 'In Progress', value: bookings.filter(b => b.status === 'in_progress').length, color: 'text-amber-600', bg: 'bg-amber-50', icon: ClockIcon },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className={`${stat.bg} p-2 rounded-lg`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kode</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pet Owner</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hewan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Layanan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Partner</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jadwal</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Biaya</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Memuat data...
                      </div>
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">Belum ada booking</p>
                      <p className="text-sm mt-1">Booking dari pet owner akan muncul di sini.</p>
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => {
                    const ServiceIconComp = SERVICE_TYPE_ICONS[booking.serviceType] || Calendar;
                    return (
                      <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono font-medium text-blue-600">{booking.code}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{booking.petOwnerName}</p>
                              <p className="text-xs text-gray-500">{booking.petOwnerPhone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ServiceIcon type={booking.petType} />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{booking.petName}</p>
                              <p className="text-xs text-gray-500">{booking.petBreed}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ServiceIconComp className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{SERVICE_TYPE_LABELS[booking.serviceType] || booking.serviceType}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{booking.partnerName}</p>
                            <p className="text-xs text-gray-500">{PARTNER_TYPE_LABELS[booking.partnerType] || booking.partnerType}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm text-gray-700">{formatDate(booking.scheduledAt)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={booking.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            Rp {booking.totalFee.toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleDelete(booking.id, booking.code)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Halaman {page} dari {totalPages} (total {total} booking)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-700 font-medium">{page}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </HQLayout>
  );
}
