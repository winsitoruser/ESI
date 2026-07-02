import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  Brain, Cpu, Sparkles, Activity, CheckCircle, XCircle, AlertTriangle,
  DollarSign, RefreshCw, Trash2, ToggleLeft, ToggleRight, Star,
  ArrowLeft, Loader2, Clock, TrendingUp, Users, Zap, Search
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

interface AIStats {
  totalModels: number;
  totalWorkflows: number;
  totalExecutions: number;
  successExecutions: number;
  failedExecutions: number;
  totalCost: number;
}

export default function AdminAIModels() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AIStats | null>(null);
  const [models, setModels] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [tenantUsage, setTenantUsage] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'workflows' | 'executions'>('overview');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/admin/login'); return; }
    const role = ((session?.user as any)?.role || '').toLowerCase();
    if (session && !['admin', 'super_admin', 'superadmin'].includes(role)) { router.push('/admin/login'); }
  }, [status, session, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await (await fetch('/api/admin/ai-models?action=overview')).json();
      if (r.success) {
        setStats(r.data.stats);
        setModels(r.data.models || []);
        setWorkflows(r.data.workflows || []);
        setExecutions(r.data.recentExecutions || []);
        setTenantUsage(r.data.tenantUsage || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { if (status === 'authenticated') fetchData(); }, [status, fetchData]);

  const apiAction = async (action: string, body: any) => {
    const r = await (await fetch(`/api/admin/ai-models?action=${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })).json();
    if (r.success) { showToast(r.message); fetchData(); } else showToast(r.error || 'Gagal');
  };

  const providerColors: Record<string, string> = {
    openai: 'bg-green-100 text-green-700 border-green-200',
    anthropic: 'bg-orange-100 text-orange-700 border-orange-200',
    google: 'bg-blue-100 text-blue-700 border-blue-200',
    deepseek: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    groq: 'bg-purple-100 text-purple-700 border-purple-200',
    local: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  if (loading && !stats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
            <p className="mt-3 text-gray-500 text-sm">Memuat data AI...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head><title>AI Models & Workflows - Admin</title></Head>

      <AdminLayout>
        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-[60]">
            <div className="bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> {toast}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Brain className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Models & Workflows</h1>
                <p className="text-gray-500 text-sm">Kelola model AI, workflow, dan pantau eksekusi di seluruh tenant</p>
              </div>
            </div>
            <button onClick={fetchData} className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all text-gray-700">
              <RefreshCw className="w-4 h-4 inline mr-1.5" /> Refresh
            </button>
          </div>
        </div>

        <div>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              {[
                { label: 'Models', value: stats.totalModels, icon: Cpu, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Workflows', value: stats.totalWorkflows, icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Eksekusi', value: stats.totalExecutions, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Berhasil', value: stats.successExecutions, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Gagal', value: stats.failedExecutions, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
                { label: 'Total Biaya', value: `$${stats.totalCost.toFixed(4)}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-[11px] text-gray-400 font-medium">{s.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-xl border border-gray-200 p-1.5 mb-6 shadow-sm">
            <div className="flex gap-1">
              {([
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'models', label: 'Models', icon: Cpu },
                { id: 'workflows', label: 'Workflows', icon: Sparkles },
                { id: 'executions', label: 'Eksekusi', icon: Clock },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                  }`}>
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Models Overview */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Cpu className="w-4 h-4 text-blue-500" /> AI Models ({models.length})</h3>
                </div>
                <div className="p-4 space-y-3">
                  {models.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Belum ada model AI dikonfigurasi</div>
                  ) : models.slice(0, 6).map((m: any) => (
                    <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg border ${m.is_default ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 bg-gray-50/50'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${providerColors[m.provider] || 'bg-gray-100'}`}>{m.provider}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{m.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{m.model_id}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.is_default && <span className="px-1.5 py-0.5 rounded bg-blue-500 text-white text-[9px] font-bold">DEFAULT</span>}
                        <span className="text-[10px] text-gray-400">{m.exec_count || 0} runs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workflows Overview */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> Workflows ({workflows.length})</h3>
                </div>
                <div className="p-4 space-y-3">
                  {workflows.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Belum ada workflow</div>
                  ) : workflows.slice(0, 6).map((wf: any) => (
                    <div key={wf.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{wf.name}</div>
                        <div className="text-[10px] text-gray-400">{wf.category} • {wf.module} • {wf.model_name || 'Tanpa model'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${wf.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="text-[10px] text-gray-400">{wf.exec_count || 0} runs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Executions */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-purple-500" /> Eksekusi Terbaru</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Workflow</th>
                        <th className="px-4 py-3 text-left">Model</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-right">Tokens</th>
                        <th className="px-4 py-3 text-right">Cost</th>
                        <th className="px-4 py-3 text-right">Duration</th>
                        <th className="px-4 py-3 text-right">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {executions.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Belum ada eksekusi</td></tr>
                      ) : executions.slice(0, 10).map((ex: any) => (
                        <tr key={ex.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{ex.workflow_name || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${providerColors[ex.provider] || 'bg-gray-100'}`}>{ex.provider}</span>
                            <span className="ml-1.5 text-gray-600 text-xs">{ex.model_name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ex.status === 'completed' ? 'bg-green-100 text-green-700' :
                              ex.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {ex.status === 'completed' ? <CheckCircle className="w-3 h-3" /> : ex.status === 'failed' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {ex.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500 text-xs">{ex.input_tokens || 0}+{ex.output_tokens || 0}</td>
                          <td className="px-4 py-3 text-right text-gray-500 text-xs">${(parseFloat(ex.total_cost) || 0).toFixed(4)}</td>
                          <td className="px-4 py-3 text-right text-gray-500 text-xs">{ex.execution_time_ms || 0}ms</td>
                          <td className="px-4 py-3 text-right text-gray-400 text-xs">{ex.created_at ? new Date(ex.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tenant Usage */}
              {tenantUsage.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Users className="w-4 h-4 text-teal-500" /> Penggunaan per Tenant</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="px-4 py-3 text-left">Tenant ID</th>
                          <th className="px-4 py-3 text-right">Eksekusi</th>
                          <th className="px-4 py-3 text-right">Input Tokens</th>
                          <th className="px-4 py-3 text-right">Output Tokens</th>
                          <th className="px-4 py-3 text-right">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {tenantUsage.map((t: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-xs text-gray-700">{t.tenant_id || 'global'}</td>
                            <td className="px-4 py-3 text-right font-medium">{t.executions}</td>
                            <td className="px-4 py-3 text-right text-gray-500">{parseInt(t.input_tokens || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-gray-500">{parseInt(t.output_tokens || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-medium text-emerald-600">${parseFloat(t.cost || 0).toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Models Tab */}
          {activeTab === 'models' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Semua Model AI ({models.length})</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {models.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Belum ada model AI dikonfigurasi</p>
                    <p className="text-xs mt-1">Model dibuat melalui halaman CRM & Sales Force → AI Workflow</p>
                  </div>
                ) : models.map((m: any) => (
                  <div key={m.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        m.provider === 'openai' ? 'bg-green-100' : m.provider === 'anthropic' ? 'bg-orange-100' :
                        m.provider === 'google' ? 'bg-blue-100' : m.provider === 'deepseek' ? 'bg-indigo-100' :
                        m.provider === 'groq' ? 'bg-purple-100' : 'bg-gray-100'
                      }`}>
                        <Cpu className={`w-5 h-5 ${
                          m.provider === 'openai' ? 'text-green-600' : m.provider === 'anthropic' ? 'text-orange-600' :
                          m.provider === 'google' ? 'text-blue-600' : m.provider === 'deepseek' ? 'text-indigo-600' :
                          m.provider === 'groq' ? 'text-purple-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{m.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${providerColors[m.provider] || 'bg-gray-100'}`}>{m.provider}</span>
                          {m.is_default && <span className="px-1.5 py-0.5 rounded bg-blue-500 text-white text-[9px] font-bold">DEFAULT</span>}
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{m.model_id}</div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                          <span>{m.workflow_count || 0} workflows</span>
                          <span>{m.exec_count || 0} executions</span>
                          <span>${parseFloat(m.total_cost_used || 0).toFixed(4)} cost</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!m.is_default && (
                        <button onClick={() => apiAction('set-default-model', { id: m.id })}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                          <Star className="w-3 h-3 inline mr-1" /> Set Default
                        </button>
                      )}
                      <button onClick={() => apiAction('toggle-model', { id: m.id, is_active: !m.is_active })}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${m.is_active ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}>
                        {m.is_active ? <><ToggleRight className="w-3 h-3 inline mr-1" /> Nonaktifkan</> : <><ToggleLeft className="w-3 h-3 inline mr-1" /> Aktifkan</>}
                      </button>
                      <button onClick={() => { if (confirm('Hapus model ini?')) apiAction('delete-model', { id: m.id }); }}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                        <Trash2 className="w-3 h-3 inline mr-1" /> Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workflows Tab */}
          {activeTab === 'workflows' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Semua Workflows ({workflows.length})</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {workflows.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Belum ada workflow</p>
                  </div>
                ) : workflows.map((wf: any) => (
                  <div key={wf.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{wf.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[9px] font-bold">{wf.category}</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-bold uppercase">{wf.module}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xl">{wf.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                        <span>Model: {wf.model_name || 'None'} {wf.provider ? `(${wf.provider})` : ''}</span>
                        <span>{wf.exec_count || 0} runs</span>
                        <span>${parseFloat(wf.total_cost || 0).toFixed(4)} cost</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <button onClick={() => apiAction('toggle-workflow', { id: wf.id, is_active: !wf.is_active })}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${wf.is_active ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}>
                        {wf.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button onClick={() => { if (confirm('Hapus workflow dan semua riwayat eksekusinya?')) apiAction('delete-workflow', { id: wf.id }); }}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                        <Trash2 className="w-3 h-3 inline mr-1" /> Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Executions Tab */}
          {activeTab === 'executions' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Riwayat Eksekusi</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Workflow</th>
                      <th className="px-4 py-3 text-left">Model</th>
                      <th className="px-4 py-3 text-left">Tenant</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Tokens</th>
                      <th className="px-4 py-3 text-right">Cost</th>
                      <th className="px-4 py-3 text-right">Duration</th>
                      <th className="px-4 py-3 text-right">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {executions.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Belum ada eksekusi</td></tr>
                    ) : executions.map((ex: any) => (
                      <tr key={ex.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{ex.workflow_name || '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{ex.model_name || '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{ex.tenant_id || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ex.status === 'completed' ? 'bg-green-100 text-green-700' :
                            ex.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>{ex.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs">{(ex.input_tokens || 0) + (ex.output_tokens || 0)}</td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs">${(parseFloat(ex.total_cost) || 0).toFixed(4)}</td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs">{ex.execution_time_ms || 0}ms</td>
                        <td className="px-4 py-3 text-right text-gray-400 text-xs">{ex.created_at ? new Date(ex.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
