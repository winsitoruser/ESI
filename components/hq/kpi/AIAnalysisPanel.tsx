import { CheckCircle, AlertCircle, Star, Brain, Zap, Lightbulb, Info, ChevronRight } from 'lucide-react';
import { KPI_CATEGORIES, ROLE_KPI_PRESETS, getScoreLevel, analyzeWeightDistribution } from '@/lib/hq/kpi-calculator';

export default function AIAnalysisPanel(props: any) {
  const { analysis, metrics, setMetrics, setAnalysis, selectedRole, setSelectedRole } = props;
  if (!analysis) return null;
  const upd = (i: number, v: number) => {
    const u = [...metrics]; u[i].weight = v; setMetrics(u); setAnalysis(analyzeWeightDistribution(u));
  };
  const hc: Record<string,string> = { excellent:'bg-green-50 text-green-700', good:'bg-blue-50 text-blue-700', needs_improvement:'bg-yellow-50 text-yellow-700', poor:'bg-red-50 text-red-700' };
  const hl: Record<string,string> = { excellent:'Sangat Baik', good:'Baik', needs_improvement:'Perlu Perbaikan', poor:'Kurang' };
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg"><Brain className="w-6 h-6 text-purple-600"/></div>
        <div><h3 className="font-semibold text-lg">AI Analisis Bobot KPI</h3><p className="text-sm text-gray-500">Rekomendasi distribusi bobot per role</p></div>
      </div>
      <div className="border rounded-xl p-4 mb-6">
        <label className="text-sm font-medium mb-2 block">Pilih Role</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ROLE_KPI_PRESETS).map(([k,p])=>(<button key={k} onClick={()=>setSelectedRole(k)} className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedRole===k?'bg-purple-600 text-white':'bg-gray-100 hover:bg-gray-200'}`}>{p.label}</button>))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className={`border rounded-xl p-5 ${hc[analysis.overallHealth]||'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-2"><h4 className="font-semibold">Kesehatan KPI</h4><span className="text-xl font-bold">{hl[analysis.overallHealth]||'-'}</span></div>
            <div className="flex items-center gap-2 text-sm">{analysis.isBalanced?<CheckCircle className="w-4 h-4"/>:<AlertCircle className="w-4 h-4"/>}<span>Total Bobot: {analysis.totalWeight}%</span></div>
          </div>
          <div className="border rounded-xl p-5"><h4 className="font-semibold mb-3">Distribusi Kategori</h4>
            <div className="space-y-3">{Object.entries(analysis.categoryBreakdown).map(([c,d]:[string,any])=>{const ci=(KPI_CATEGORIES as any)[c];return(<div key={c}><div className="flex justify-between text-sm mb-1"><span className="font-medium">{ci?.name||c}</span><span className="text-gray-600">{d.weight}% ({d.count})</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${d.weight}%`,backgroundColor:ci?.color||'#888'}}/></div></div>);})}</div>
          </div>
          <div className="border rounded-xl p-5"><h4 className="font-semibold mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500"/>Best Practice</h4>
            <div className="space-y-1 text-sm text-gray-600"><p>• <b>Sales:</b> 25-40%</p><p>• <b>Produk Target:</b> 15-25%</p><p>• <b>Kunjungan:</b> 10-20%</p><p>• <b>Customer:</b> 10-15%</p><p>• <b>Marketing:</b> 15-25%</p><p>• <b>Operasional:</b> 10-15%</p></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="border rounded-xl p-5"><h4 className="font-semibold mb-3">Detail ({ROLE_KPI_PRESETS[selectedRole]?.label})</h4>
            <div className="space-y-3">{metrics.map((m:any,i:number)=>{const lv=getScoreLevel(m.achievement);return(<div key={i} className="p-3 bg-gray-50 rounded-lg"><div className="flex items-center justify-between mb-1"><span className="text-sm font-medium">{m.name}</span><span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{backgroundColor:lv.color}}>{lv.level}</span></div><div className="flex items-center gap-2"><div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${Math.min(m.achievement,100)}%`,backgroundColor:lv.color}}/></div><span className="text-xs font-semibold" style={{color:lv.color}}>{m.achievement}%</span></div><span className="text-[10px] text-gray-400">{m.code} · Bobot: {m.weight}%</span></div>);})}</div>
          </div>
          <div className="border rounded-xl p-5"><h4 className="font-semibold mb-3">Sesuaikan Bobot</h4>
            <div className="space-y-2">{metrics.map((m:any,i:number)=>(<div key={i} className="flex items-center gap-2"><span className="text-xs text-gray-600 w-28 truncate">{m.name}</span><input type="range" min={0} max={50} value={m.weight} onChange={e=>upd(i,+e.target.value)} className="flex-1 h-2 accent-purple-600"/><span className="text-xs font-bold w-8 text-right">{m.weight}%</span></div>))}</div>
            <div className={`mt-3 p-2 rounded-lg text-sm flex items-center gap-2 ${analysis.totalWeight===100?'bg-green-50 text-green-700':'bg-yellow-50 text-yellow-700'}`}>{analysis.totalWeight===100?<CheckCircle className="w-4 h-4"/>:<AlertCircle className="w-4 h-4"/>}Total: {analysis.totalWeight}%{analysis.totalWeight!==100&&' (harus 100%)'}</div>
          </div>
        </div>
        <div className="space-y-4">
          {analysis.recommendations.length>0&&(<div className="border rounded-xl p-5 border-orange-200 bg-orange-50/50"><h4 className="font-semibold mb-3 flex items-center gap-2 text-orange-700"><Zap className="w-4 h-4"/>Rekomendasi</h4>
            <div className="space-y-3">{analysis.recommendations.map((r:any,i:number)=>(<div key={i} className="p-3 bg-white rounded-lg border border-orange-200"><div className="flex items-center gap-2 mb-1"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.impact==='high'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>{r.impact.toUpperCase()}</span><span className="text-sm font-medium">{r.name}</span></div><p className="text-xs text-gray-600">{r.reason}</p><div className="flex items-center gap-2 mt-1 text-xs"><span className="text-red-500">{r.currentWeight}%</span><ChevronRight className="w-3 h-3"/><span className="text-green-600 font-bold">{r.recommendedWeight}%</span></div></div>))}</div>
          </div>)}
          {analysis.insights.length>0&&(<div className="border rounded-xl p-5 border-blue-200 bg-blue-50/50"><h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-700"><Lightbulb className="w-4 h-4"/>Insight AI</h4>
            <div className="space-y-2">{analysis.insights.map((s:string,i:number)=>(<div key={i} className="flex items-start gap-2 text-sm text-gray-700"><Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/><span>{s}</span></div>))}</div>
          </div>)}
        </div>
      </div>
    </div>
  );
}
