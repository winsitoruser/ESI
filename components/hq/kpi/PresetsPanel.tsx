import { Users, UserCheck, TrendingUp } from 'lucide-react';
import { KPI_CATEGORIES, KPI_TEMPLATES, ROLE_KPI_PRESETS } from '@/lib/hq/kpi-calculator';

const cc: Record<string,string> = { sales:'bg-blue-100 text-blue-700', marketing:'bg-rose-100 text-rose-700', operations:'bg-green-100 text-green-700', customer:'bg-yellow-100 text-yellow-700', financial:'bg-purple-100 text-purple-700', hr:'bg-pink-100 text-pink-700', quality:'bg-cyan-100 text-cyan-700' };

export default function PresetsPanel({ templates, salesMarketingTemplates, setSelectedRole, setActiveTab }: any) {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg"><Users className="w-6 h-6 text-indigo-600"/></div>
        <div><h3 className="font-semibold text-lg">Preset KPI per Role</h3><p className="text-sm text-gray-500">Konfigurasi KPI yang direkomendasikan untuk setiap jabatan</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(ROLE_KPI_PRESETS).map(([key, preset]) => (
          <div key={key} className="border rounded-xl p-5 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center"><UserCheck className="w-5 h-5 text-indigo-600"/></div>
              <div><h4 className="font-semibold">{preset.label}</h4><p className="text-xs text-gray-500">{preset.kpis.length} metrik KPI</p></div>
            </div>
            <div className="space-y-2 mb-4">
              {preset.kpis.map((kpi: any, i: number) => {
                const tmpl = KPI_TEMPLATES.find((t: any) => t.code === kpi.code);
                const catKey = tmpl?.category || 'sales';
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: (KPI_CATEGORIES as any)[catKey]?.color || '#888' }}/>
                      <span className="text-gray-700 truncate">{tmpl?.name || kpi.code}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${kpi.weight}%` }}/></div>
                      <span className="text-xs font-bold text-gray-600 w-8 text-right">{kpi.weight}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pt-3 border-t">
              <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
                {(() => { const cw: Record<string,number>={}; preset.kpis.forEach((k:any)=>{const t=KPI_TEMPLATES.find((tp:any)=>tp.code===k.code);const c=t?.category||'other';cw[c]=(cw[c]||0)+k.weight;}); return Object.entries(cw).map(([c,w])=>(<div key={c} style={{width:`${w}%`,backgroundColor:(KPI_CATEGORIES as any)[c]?.color||'#888'}} title={`${(KPI_CATEGORIES as any)[c]?.name}: ${w}%`}/>)); })()}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {(() => { const cw: Record<string,number>={}; preset.kpis.forEach((k:any)=>{const t=KPI_TEMPLATES.find((tp:any)=>tp.code===k.code);const c=t?.category||'other';cw[c]=(cw[c]||0)+k.weight;}); return Object.entries(cw).map(([c,w])=>(<span key={c} className="text-[10px] text-gray-500"><span className="inline-block w-2 h-2 rounded-full mr-0.5" style={{backgroundColor:(KPI_CATEGORIES as any)[c]?.color}}/>{(KPI_CATEGORIES as any)[c]?.name} {w}%</span>)); })()}
              </div>
            </div>
            <button onClick={() => { setSelectedRole(key); setActiveTab('ai-analysis'); }} className="w-full mt-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100">Analisis Detail →</button>
          </div>
        ))}
      </div>
      <div className="mt-8 border-2 border-blue-200 rounded-xl p-6 bg-blue-50/50">
        <div className="flex items-center gap-3 mb-4"><TrendingUp className="w-6 h-6 text-blue-600"/><h3 className="font-semibold text-lg text-blue-900">KPI Sales & Marketing Tersedia</h3></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {salesMarketingTemplates.map((t: any) => (
            <div key={t.code} className="bg-white rounded-lg p-3 border border-blue-100">
              <div className="flex items-center gap-2 mb-1"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cc[t.category]||'bg-gray-100'}`}>{t.category.toUpperCase()}</span><span className="text-[10px] text-gray-400 font-mono">{t.code}</span></div>
              <p className="text-sm font-medium text-gray-900">{t.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.formulaType} · {t.measurementFrequency} · {t.defaultWeight}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
