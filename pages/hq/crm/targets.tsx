import React, { useState, useEffect, useCallback } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  Calendar, RefreshCw, Target, TrendingUp, DollarSign, UserCheck, Users,
  ChevronLeft, ChevronRight, BarChart3,
} from 'lucide-react';
import Link from 'next/link';

interface TargetRealization {
  period: string;
  periodLabel: string;
  targetVisits: number;
  actualVisits: number;
  achievementPct: number;
  targetValue: number;
  actualValue: number;
  valueAchievementPct: number;
  totalLeads: number;
  convertedLeads: number;
}

function formatCurrency(val: number) {
  return `Rp ${val.toLocaleString('id-ID')}`;
}

const PERIOD_OPTIONS = [
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'daily', label: 'Harian' },
];

export default function CrmTargetsPage() {
  const [data, setData] = useState<TargetRealization[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState('weekly');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hq/crm/targets?type=${periodType}`);
      const json = await res.json();

      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.error || 'Gagal memuat data target');
      }
    } catch {
      toast.error('Gagal memuat data target');
    } finally {
      setLoading(false);
    }
  }, [periodType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Aggregated stats
  const totalTargetVisits = data.reduce((sum, d) => sum + d.targetVisits, 0);
  const totalActualVisits = data.reduce((sum, d) => sum + d.actualVisits, 0);
  const totalTargetValue = data.reduce((sum, d) => sum + d.targetValue, 0);
  const totalActualValue = data.reduce((sum, d) => sum + d.actualValue, 0);
  const totalLeads = data.reduce((sum, d) => sum + d.totalLeads, 0);
  const totalConverted = data.reduce((sum, d) => sum + d.convertedLeads, 0);
  const overallAchievement = totalTargetVisits > 0 ? Math.round((totalActualVisits / totalTargetVisits) * 100) : 0;
  const overallValueAchievement = totalTargetValue > 0 ? Math.round((totalActualValue / totalTargetValue) * 100) : 0;

  function getAchievementColor(pct: number): string {
    if (pct >= 100) return 'text-emerald-600';
    if (pct >= 75) return 'text-amber-600';
    if (pct >= 50) return 'text-orange-600';
    return 'text-red-600';
  }

  function getAchievementBarColor(pct: number): string {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 75) return 'bg-amber-500';
    if (pct >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  }

  return (
    <HQLayout>
      <div className="p-6 space-y-6">
        {/* Header with Tab Navigation */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Target & Realisasi</h1>
            <p className="text-sm text-gray-500 mt-1">
              Pantau pencapaian target kunjungan dan nilai pipeline
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
              <Link
                href="/hq/crm/planning"
                className="px-3 py-1.5 text-sm rounded-md text-gray-500 hover:text-gray-700"
              >
                Planning
              </Link>
              <span className="px-3 py-1.5 text-sm rounded-md bg-white shadow text-gray-900 font-medium">
                Target
              </span>
            </div>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Periode:</label>
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPeriodType(opt.value)}
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    periodType === opt.value
                      ? 'bg-white shadow text-gray-900 font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Rata-rata Pencapaian</p>
                <p className={`text-xl font-bold ${getAchievementColor(overallAchievement)}`}>
                  {overallAchievement}%
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Kunjungan</p>
                <p className="text-xl font-bold text-gray-900">
                  {totalActualVisits} <span className="text-sm font-normal text-gray-500">/ {totalTargetVisits}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Nilai Realisasi</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalActualValue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Konversi Lead</p>
                <p className="text-xl font-bold text-gray-900">
                  {totalConverted} <span className="text-sm font-normal text-gray-500">/ {totalLeads}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Detail Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">
              Detail {PERIOD_OPTIONS.find(o => o.value === periodType)?.label}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Periode</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Target</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Realisasi</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pencapaian</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Target Value</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Realisasi Value</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Lead Baru</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Konversi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Memuat data...
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">Belum ada data target</p>
                    </td>
                  </tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={row.period} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">{row.periodLabel}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-gray-700">{row.targetVisits}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-gray-700">{row.actualVisits}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getAchievementBarColor(row.achievementPct)}`}
                              style={{ width: `${Math.min(row.achievementPct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold w-10 text-right ${getAchievementColor(row.achievementPct)}`}>
                            {row.achievementPct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-700">{formatCurrency(row.targetValue)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(row.actualValue)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-700">{row.totalLeads}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-emerald-600">{row.convertedLeads}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
