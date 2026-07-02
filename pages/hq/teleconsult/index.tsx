import React, { useState, useEffect, useCallback } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  Activity, Search, Plus, Filter, ChevronDown, MoreHorizontal,
  Edit, Trash2, Eye, RefreshCw, Phone, Mail,
  Calendar, Clock, DollarSign, Heart, Dog, Syringe,
  CheckCircle, XCircle, AlertCircle, Clock as ClockIcon,
  ChevronLeft, ChevronRight, User, Video, UserCheck,
} from 'lucide-react';
import Link from 'next/link';

type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

interface TeleconsultSession {
  id: string;
  code: string;
  status: SessionStatus;
  petOwnerName: string;
  petOwnerPhone: string;
  petOwnerEmail: string;
  petName: string;
  petType: string;
  petBreed: string;
  petAge: string;
  petWeight: number;
  symptoms: string;
  diagnosis: string;
  prescription: string;
  notes: string;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  rating: number | null;
  fee: number;
  vet: { id: string; name: string; code: string; type: string } | null;
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; color: string; icon: any }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: Video },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
  no_show: { label: 'No Show', color: 'bg-gray-100 text-gray-600', icon: AlertCircle },
};

const PET_TYPES = ['dog', 'cat', 'bird', 'fish', 'reptile', 'small_mammal', 'other'];

const PET_TYPE_LABELS: Record<string, string> = {
  dog: 'Dog', cat: 'Cat', bird: 'Bird', fish: 'Fish',
  reptile: 'Reptile', small_mammal: 'Small Mammal', other: 'Other',
};

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TeleconsultPage() {
  const [sessions, setSessions] = useState<TeleconsultSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/hq/teleconsult?${params}`);
      const json = await res.json();

      if (json.success) {
        setSessions(json.data);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages);
          setTotal(json.pagination.total);
        }
      } else {
        toast.error(json.error || 'Failed to load sessions');
      }
    } catch {
      toast.error('Failed to load teleconsult sessions');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete session "${code}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/hq/teleconsult/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Session deleted');
        fetchSessions();
      } else {
        toast.error(json.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete session');
    }
  };

  const StatusBadge = ({ status }: { status: SessionStatus }) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const PetTypeIcon = ({ type }: { type: string }) => {
    const colors: Record<string, string> = {
      dog: 'text-amber-600 bg-amber-50',
      cat: 'text-purple-600 bg-purple-50',
      bird: 'text-sky-600 bg-sky-50',
      reptile: 'text-green-600 bg-green-50',
      fish: 'text-blue-600 bg-blue-50',
    };
    return (
      <div className={`p-1.5 rounded-lg ${colors[type] || 'bg-gray-50 text-gray-500'}`}>
        <Dog className="w-4 h-4" />
      </div>
    );
  };

  return (
    <HQLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teleconsult Sessions</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage vet teleconsultation sessions, schedule & history
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchSessions()}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/hq/teleconsult/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Session
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
                placeholder="Search by pet owner, pet name, code, phone..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
                showFilters || statusFilter
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {statusFilter && (
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
              )}
            </button>
          </div>

          {showFilters && (
            <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Status:</label>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Status</option>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              {statusFilter && (
                <button
                  onClick={() => { setStatusFilter(''); setPage(1); }}
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
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = sessions.filter(s => s.status === key).length;
            const Icon = cfg.icon;
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${cfg.color.replace('text-', 'bg-').replace('700', '50')}`}>
                    <Icon className={`w-5 h-5 ${cfg.color.split(' ')[0]}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{cfg.label}</p>
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Pet Owner</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Pet</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vet</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Loading sessions...
                      </div>
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Activity className="w-12 h-12" />
                        <p className="text-sm">No teleconsult sessions found</p>
                        <Link href="/hq/teleconsult/new" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                          Create your first session
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : sessions.map(session => (
                  <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/hq/teleconsult/${session.id}`}
                        className="text-sm font-mono font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        {session.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{session.petOwnerName}</p>
                        {session.petOwnerPhone && (
                          <p className="text-xs text-gray-400">{session.petOwnerPhone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PetTypeIcon type={session.petType} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{session.petName}</p>
                          <p className="text-xs text-gray-400">
                            {PET_TYPE_LABELS[session.petType] || session.petType}
                            {session.petBreed ? ` · ${session.petBreed}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{session.vet?.name || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatDate(session.scheduledAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-700">
                        {session.fee ? `Rp ${Number(session.fee).toLocaleString('id-ID')}` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/hq/teleconsult/${session.id}`}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/hq/teleconsult/${session.id}?edit=true`}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(session.id, session.code)}
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
                Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} sessions
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
