import React, { useState, useEffect, useCallback } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  Calendar, Search, Plus, Filter, ChevronDown, RefreshCw,
  CheckCircle, XCircle, Clock, Target, TrendingUp,
  ChevronLeft, ChevronRight, FileText, ListChecks,
} from 'lucide-react';
import Link from 'next/link';

type PlanningType = 'visit_plan' | 'daily_report' | 'weekly_report' | 'weekly_plan';
type PlanStatus = 'planned' | 'completed' | 'cancelled';

interface PlanningItem {
  id: string;
  leadId: string;
  companyName: string;
  partnerType: string;
  type: PlanningType;
  title: string;
  description: string;
  plannedDate: string;
  actualDate: string | null;
  status: PlanStatus;
  targetCount: number;
  actualCount: number;
  outcome: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const PLANNING_TYPES: Record<PlanningType, { label: string; color: string }> = {
  visit_plan: { label: 'Kunjungan', color: 'bg-blue-100 text-blue-700' },
  daily_report: { label: 'Laporan Harian', color: 'bg-emerald-100 text-emerald-700' },
  weekly_report: { label: 'Laporan Mingguan', color: 'bg-purple-100 text-purple-700' },
  weekly_plan: { label: 'Rencana Mingguan', color: 'bg-amber-100 text-amber-700' },
};

const STATUS_CONFIG: Record<PlanStatus, { label: string; color: string }> = {
  planned: { label: 'Direncanakan', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
};

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CrmPlanningPage() {
  const [items, setItems] = useState<PlanningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (typeFilter) params.set('type', typeFilter);

      const res = await fetch(`/api/hq/crm/planning?${params}`);
      const json = await res.json();

      if (json.success) {
        setItems(json.data);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages);
        }
      } else {
        toast.error(json.error || 'Gagal memuat data planning');
      }
    } catch {
      toast.error('Gagal memuat data planning');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Stats
  const totalPlanned = items.filter(i => i.status === 'planned').length;
  const totalCompleted = items.filter(i => i.status === 'completed').length;
  const visitPlans = items.filter(i => i.type === 'visit_plan').length;

  const TypeBadge = ({ type }: { type: PlanningType }) => {
    const config = PLANNING_TYPES[type];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const StatusBadge = ({ status }: { status: PlanStatus }) => {
    const config = STATUS_CONFIG[status];
    const Icon = status === 'completed' ? CheckCircle : status === 'cancelled' ? XCircle : Clock;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  return (
    <HQLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CRM Planning</h1>
            <p className="text-sm text-gray-500 mt-1">
              Rencana kunjungan, laporan harian & mingguan tim sales
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <Link
                href="/hq/crm"
                className="px-3 py-1.5 text-sm rounded-md text-gray-500 hover:text-gray-700"
              >
                Pipeline
              </Link>
              <span className="px-3 py-1.5 text-sm rounded-md bg-white shadow text-gray-900 font-medium">
                Planning
              </span>
              <Link
                href="/hq/crm/targets"
                className="px-3 py-1.5 text-sm rounded-md text-gray-500 hover:text-gray-700"
              >
                Target
              </Link>
            </div>
            <button
              onClick={() => { setPage(1); fetchItems(); }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Aktivitas', value: total, color: 'text-blue-600', bg: 'bg-blue-50', icon: ListChecks },
            { label: 'Direncanakan', value: totalPlanned, color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock },
            { label: 'Selesai', value: totalCompleted, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
            { label: 'Rencana Kunjungan', value: visitPlans, color: 'text-purple-600', bg: 'bg-purple-50', icon: Target },
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

        {/* Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Semua Tipe</option>
              {Object.entries(PLANNING_TYPES).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Judul</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipe</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Partner</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Target/Realisasi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Memuat data...
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">Belum ada data planning</p>
                      <p className="text-sm mt-1">Data planning akan muncul di sini.</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={item.type} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{item.companyName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-700">{formatDate(item.plannedDate)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-gray-700">
                          {item.actualCount}/{item.targetCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">Halaman {page} dari {totalPages}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg disabled:opacity-50">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">{page}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg disabled:opacity-50">
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
