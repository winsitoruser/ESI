/**
 * HQ — Driver Leaderboard
 *
 * Ranking driver bulanan (trip, jarak, on-time, safety, rating)
 * dengan medal podium & filter cabang.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import HQLayout from '../../../components/hq/HQLayout';
import {
  Trophy, Medal, Award, RefreshCw, Filter, TrendingUp, MapPin,
  Star, Shield, Activity, Package, AlertTriangle, Truck, Navigation,
  Loader2, Crown,
} from 'lucide-react';

const METRIC_LABEL: Record<string, string> = {
  overall: 'Skor Total',
  trips:   'Jumlah Trip',
  distance:'Total Jarak',
  safety:  'Safety Score',
  rating:  'Rating',
  pod:     'Delivery (POD)',
};

function fmtNum(n: number) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Number(n || 0)));
}

export default function HQDriverLeaderboardPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [metric, setMetric] = useState<string>('overall');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ month, metric });
      const r = await fetch(`/api/hq/fleet/leaderboard?${qs}`);
      const j = await r.json();
      if (j.success) setData(j.data || []);
    } catch {}
    setLoading(false);
  }, [month, metric]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchData(); }, [mounted, fetchData]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return data;
    return data.filter((d: any) =>
      d.full_name?.toLowerCase().includes(s) ||
      d.driver_number?.toLowerCase().includes(s) ||
      d.license_plate?.toLowerCase().includes(s) ||
      d.branch_name?.toLowerCase().includes(s)
    );
  }, [data, search]);

  const podium = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  if (!mounted) return null;

  return (
    <HQLayout>
      <Head><title>Leaderboard Driver · Bedagang HQ</title></Head>
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 rounded-2xl shadow-lg p-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Leaderboard Driver</h1>
                <p className="text-orange-100 text-xs md:text-sm">
                  Peringkat performa bulanan · {METRIC_LABEL[metric]}
                </p>
              </div>
            </div>
            <button
              onClick={fetchData}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 backdrop-blur-sm flex items-center gap-1.5 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
          />
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 flex-wrap">
            {Object.entries(METRIC_LABEL).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setMetric(k)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  metric === k ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Cari nama / cabang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[150px] text-sm border border-gray-200 rounded-lg px-3 py-1.5"
          />
        </div>

        {/* Podium */}
        {podium.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Re-order: 2nd | 1st | 3rd for classic podium look */}
            {[podium[1], podium[0], podium[2]]
              .filter(Boolean)
              .map((d: any, i: number) => {
                const realRank = i === 1 ? 1 : i === 0 ? 2 : 3;
                return <PodiumCard key={d.driver_id} driver={d} rank={realRank} metric={metric} />;
              })}
          </div>
        )}

        {/* Rest of list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold">Peringkat 4 ke bawah</h3>
            <span className="text-xs text-gray-400">{rest.length} driver</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] text-gray-600 uppercase">
                <tr>
                  <th className="p-2 text-left w-12">#</th>
                  <th className="p-2 text-left">Driver</th>
                  <th className="p-2 text-right">Skor</th>
                  <th className="p-2 text-right">Trip</th>
                  <th className="p-2 text-right">Jarak (km)</th>
                  <th className="p-2 text-right">On-Time %</th>
                  <th className="p-2 text-right">Safety</th>
                  <th className="p-2 text-right">Rating</th>
                  <th className="p-2 text-right">POD</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} className="text-center p-8 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  </td></tr>
                )}
                {!loading && rest.length === 0 && (
                  <tr><td colSpan={9} className="text-center p-8 text-gray-400">Tidak ada data</td></tr>
                )}
                {rest.map((d: any) => (
                  <tr key={d.driver_id} className="border-t border-gray-50 hover:bg-amber-50/30 transition">
                    <td className="p-2 font-bold text-gray-500">{d.rank}</td>
                    <td className="p-2">
                      <p className="font-semibold text-xs">{d.full_name}</p>
                      <p className="text-[10px] text-gray-500">
                        {d.driver_number} · {d.license_plate || '-'} · {d.branch_name || '-'}
                      </p>
                    </td>
                    <td className="p-2 text-right font-bold text-amber-600">{d.overall_score}</td>
                    <td className="p-2 text-right">{fmtNum(d.trips_completed)}</td>
                    <td className="p-2 text-right">{fmtNum(d.distance_km)}</td>
                    <td className="p-2 text-right">{d.on_time_rate}%</td>
                    <td className="p-2 text-right">{Number(d.safety_score || 0).toFixed(1)}</td>
                    <td className="p-2 text-right">{Number(d.customer_rating || 0).toFixed(1)}</td>
                    <td className="p-2 text-right">{fmtNum(d.pod_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </HQLayout>
  );
}

function PodiumCard({ driver: d, rank, metric }: { driver: any; rank: number; metric: string }) {
  const colors: Record<number, { bg: string; border: string; icon: React.ReactNode; scale: string }> = {
    1: { bg: 'bg-gradient-to-b from-amber-50 to-white',   border: 'border-amber-400',   icon: <Crown className="w-6 h-6 text-amber-500" />, scale: 'md:scale-110 md:-translate-y-2' },
    2: { bg: 'bg-gradient-to-b from-gray-50 to-white',    border: 'border-gray-300',    icon: <Medal className="w-6 h-6 text-gray-400" />, scale: '' },
    3: { bg: 'bg-gradient-to-b from-orange-50 to-white',  border: 'border-orange-300',  icon: <Award className="w-6 h-6 text-orange-500" />, scale: '' },
  };
  const c = colors[rank];
  const primaryValue =
    metric === 'trips'    ? fmtNum(d.trips_completed) + ' trip'    :
    metric === 'distance' ? fmtNum(d.distance_km) + ' km'          :
    metric === 'safety'   ? Number(d.safety_score || 0).toFixed(1) :
    metric === 'rating'   ? Number(d.customer_rating || 0).toFixed(2) + ' ★' :
    metric === 'pod'      ? fmtNum(d.pod_count) + ' POD'           :
    d.overall_score;
  return (
    <div className={`${c.bg} border-2 ${c.border} rounded-2xl p-4 shadow-md transition ${c.scale}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {c.icon}
          <span className="text-xs font-bold uppercase text-gray-500">Peringkat #{rank}</span>
        </div>
        <span className="text-3xl font-black text-amber-600">{d.overall_score}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
          {d.full_name?.charAt(0) || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 truncate">{d.full_name}</p>
          <p className="text-[11px] text-gray-500 truncate">
            {d.driver_number} · {d.license_plate || '-'}
          </p>
          <p className="text-[11px] text-gray-400 truncate">{d.branch_name || '-'}</p>
        </div>
      </div>
      <div className="mt-3 bg-white rounded-lg p-2 text-center">
        <p className="text-[10px] uppercase text-gray-500">{METRIC_LABEL[metric]}</p>
        <p className="text-lg font-bold text-gray-900">{primaryValue}</p>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1 text-center">
        <Stat icon={<Truck className="w-3 h-3" />}     value={d.trips_completed} />
        <Stat icon={<Navigation className="w-3 h-3" />} value={fmtNum(d.distance_km)} />
        <Stat icon={<Shield className="w-3 h-3" />}    value={Number(d.safety_score || 0).toFixed(0)} />
        <Stat icon={<Star className="w-3 h-3" />}      value={Number(d.customer_rating || 0).toFixed(1)} />
      </div>
    </div>
  );
}

function Stat({ icon, value }: any) {
  return (
    <div className="bg-white/60 rounded py-1">
      <div className="flex items-center justify-center text-gray-500">{icon}</div>
      <p className="text-[11px] font-semibold">{value}</p>
    </div>
  );
}
