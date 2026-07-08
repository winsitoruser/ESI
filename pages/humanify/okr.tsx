import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import Link from 'next/link';
import {
  Target, ChevronRight, Plus, TrendingUp, AlertTriangle, CheckCircle2,
  Building2, Users, User, ArrowLeft, Layers,
} from 'lucide-react';

type OkrLevel = 'company' | 'department' | 'team' | 'individual';

const LEVEL_LABELS: Record<OkrLevel, string> = {
  company: 'Perusahaan', department: 'Departemen', team: 'Tim', individual: 'Individu',
};
const LEVEL_COLORS: Record<OkrLevel, string> = {
  company: 'bg-purple-600', department: 'bg-blue-600', team: 'bg-teal-600', individual: 'bg-indigo-600',
};
const CONFIDENCE_COLORS: Record<string, string> = {
  on_track: 'text-green-600 bg-green-50', at_risk: 'text-amber-600 bg-amber-50', off_track: 'text-red-600 bg-red-50',
};

export default function OkrPage() {
  const [okrs, setOkrs] = useState<any[]>([]);
  const [filterLevel, setFilterLevel] = useState<OkrLevel | ''>('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filterLevel ? `?level=${filterLevel}` : '';
      const r = await fetch(`/api/humanify/okr${q}`);
      const j = await r.json();
      setOkrs(j.data || []);
    } catch { setOkrs([]); }
    setLoading(false);
  }, [filterLevel]);

  useEffect(() => { load(); }, [load]);

  const avgProgress = okrs.length ? Math.round(okrs.reduce((s, o) => s + o.progress, 0) / okrs.length) : 0;

  return (
    <PageGuard anyPermission={['kpi.view', 'kpi.*', 'employees.*']} title="OKR" description="Objectives & Key Results">
      <HQLayout title="OKR / KPI" subtitle="Cascading alignment — Perusahaan → Departemen → Individu">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/humanify/kpi" className="p-2 border rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></Link>
            <div className="flex-1">
              <h2 className="text-xl font-bold flex items-center gap-2"><Target className="w-5 h-5 text-purple-600" /> OKR — Objectives & Key Results</h2>
              <p className="text-sm text-gray-500">Setup unlimited cascading, monitoring progress, check-in & reminder</p>
            </div>
            <Link href="/humanify/kpi" className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">KPI Dashboard →</Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Objectives', value: okrs.length, icon: Target, color: 'purple' },
              { label: 'Avg Progress', value: `${avgProgress}%`, icon: TrendingUp, color: 'green' },
              { label: 'On Track', value: okrs.filter(o => o.progress >= 70).length, icon: CheckCircle2, color: 'blue' },
              { label: 'At Risk', value: okrs.filter(o => o.progress < 50).length, icon: AlertTriangle, color: 'amber' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-4 border shadow-sm">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterLevel('')} className={`px-3 py-1.5 rounded-lg text-sm ${!filterLevel ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}>Semua</button>
            {(['company', 'department', 'individual'] as OkrLevel[]).map(l => (
              <button key={l} onClick={() => setFilterLevel(l)} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${filterLevel === l ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}>
                {l === 'company' ? <Building2 className="w-3 h-3" /> : l === 'department' ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                {LEVEL_LABELS[l]}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Memuat OKR...</div>
          ) : (
            <div className="space-y-4">
              {okrs.map(okr => (
                <div key={okr.id} className="bg-white rounded-xl border shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-[10px] font-bold text-white rounded ${LEVEL_COLORS[okr.level as OkrLevel]}`}>{LEVEL_LABELS[okr.level as OkrLevel]}</span>
                        <span className="text-xs text-gray-400">{okr.period}</span>
                        {okr.ownerName && <span className="text-xs text-gray-500">· {okr.ownerName}</span>}
                      </div>
                      <h3 className="font-semibold text-gray-900">{okr.title}</h3>
                      {okr.parentId && (
                        <p className="text-xs text-purple-500 mt-0.5 flex items-center gap-1"><Layers className="w-3 h-3" /> Cascaded from parent objective</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-600">{okr.progress}%</p>
                      <div className="w-24 h-2 bg-gray-100 rounded-full mt-1">
                        <div className="h-2 bg-purple-500 rounded-full" style={{ width: `${okr.progress}%` }} />
                      </div>
                    </div>
                  </div>
                  {okr.keyResults?.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {okr.keyResults.map((kr: any) => {
                        const pct = kr.targetValue > 0 ? Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100)) : 0;
                        return (
                          <div key={kr.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{kr.title}</p>
                              <p className="text-xs text-gray-500">{kr.currentValue?.toLocaleString('id-ID')} / {kr.targetValue?.toLocaleString('id-ID')} {kr.unit}</p>
                            </div>
                            <span className={`px-2 py-0.5 text-[10px] rounded font-medium ${CONFIDENCE_COLORS[kr.confidence] || 'bg-gray-100'}`}>{kr.confidence?.replace('_', ' ')}</span>
                            <span className="text-sm font-semibold w-10 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </HQLayout>
    </PageGuard>
  );
}
