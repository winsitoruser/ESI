import React, { useState, useEffect, useCallback } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  Users, Search, Plus, Filter, ChevronDown, MoreHorizontal,
  Edit, Trash2, Eye, RefreshCw, Download, Mail, Phone,
  MapPin, Star, Building2, Dog, Syringe, Hotel, Truck,
  UserCheck, XCircle, AlertCircle, CheckCircle, Clock,
  ChevronLeft, ChevronRight, ArrowUpDown,
} from 'lucide-react';
import Link from 'next/link';

type PartnerType = 'vet' | 'petshop' | 'petclinic' | 'pethotel' | 'pettransport';
type PartnerStatus = 'active' | 'inactive' | 'pending' | 'suspended';

interface Partner {
  id: string;
  code: string;
  name: string;
  type: PartnerType;
  picName?: string;
  picPhone?: string;
  phone?: string;
  email?: string;
  city?: string;
  status: PartnerStatus;
  commissionRate: number;
  joinDate?: string;
  isActive: boolean;
  createdAt: string;
}

const PARTNER_TYPES: { value: PartnerType; label: string; icon: any; color: string }[] = [
  { value: 'vet', label: 'Veterinarian', icon: Syringe, color: 'text-emerald-600 bg-emerald-50' },
  { value: 'petshop', label: 'Pet Shop', icon: Building2, color: 'text-blue-600 bg-blue-50' },
  { value: 'petclinic', label: 'Pet Clinic', icon: Dog, color: 'text-purple-600 bg-purple-50' },
  { value: 'pethotel', label: 'Pet Hotel', icon: Hotel, color: 'text-amber-600 bg-amber-50' },
  { value: 'pettransport', label: 'Pet Transport', icon: Truck, color: 'text-rose-600 bg-rose-50' },
];

const STATUS_STYLES: Record<PartnerStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-600' },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700' },
};

function getPartnerTypeConfig(type: PartnerType) {
  return PARTNER_TYPES.find(t => t.value === type) || PARTNER_TYPES[0];
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/hq/partners?${params}`);
      const json = await res.json();

      if (json.success) {
        setPartners(json.data);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages);
          setTotal(json.pagination.total);
        }
      } else {
        toast.error(json.error || 'Failed to load partners');
      }
    } catch (err) {
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete partner "${name}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/hq/partners/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Partner deleted');
        fetchPartners();
      } else {
        toast.error(json.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete partner');
    }
  };

  const TypeIcon = ({ type }: { type: PartnerType }) => {
    const config = getPartnerTypeConfig(type);
    const Icon = config.icon;
    return (
      <div className={`p-1.5 rounded-lg ${config.color}`}>
        <Icon className="w-4 h-4" />
      </div>
    );
  };

  return (
    <HQLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Partner Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage Vets, Pet Shops, Clinics, Hotels & Transport partners
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchPartners()}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/hq/partners/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Partner
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, code, email, phone..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
                showFilters || typeFilter || statusFilter
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {(typeFilter || statusFilter) && (
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
              )}
            </button>
          </div>

          {showFilters && (
            <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Type:</label>
                <select
                  value={typeFilter}
                  onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Types</option>
                  {PARTNER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Status:</label>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              {(typeFilter || statusFilter) && (
                <button
                  onClick={() => { setTypeFilter(''); setStatusFilter(''); setPage(1); }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-5 gap-4">
          {PARTNER_TYPES.map(t => {
            const count = partners.filter(p => p.type === t.value).length;
            const Icon = t.icon;
            return (
              <div key={t.value} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${t.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t.label}</p>
                    <p className="text-lg font-semibold text-gray-900">{count}</p>
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Loading partners...
                      </div>
                    </td>
                  </tr>
                ) : partners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Users className="w-12 h-12" />
                        <p className="text-sm">No partners found</p>
                        <Link href="/hq/partners/new" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                          Add your first partner
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : partners.map(partner => (
                  <tr key={partner.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <TypeIcon type={partner.type} />
                        <div>
                          <Link
                            href={`/hq/partners/${partner.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                          >
                            {partner.name}
                          </Link>
                          <p className="text-xs text-gray-400">{partner.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {getPartnerTypeConfig(partner.type).label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {partner.email && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {partner.email}
                          </div>
                        )}
                        {partner.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {partner.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {partner.city && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {partner.city}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-gray-700">
                        {partner.commissionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[partner.status]?.color}`}>
                        {STATUS_STYLES[partner.status]?.label || partner.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/hq/partners/${partner.id}`}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/hq/partners/${partner.id}?edit=true`}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(partner.id, partner.name)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} partners
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
