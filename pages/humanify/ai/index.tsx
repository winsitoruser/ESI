import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import EnterprisePageHeader from '@/components/humanify/EnterprisePageHeader';
import { PageGuard } from '@/components/permissions';
import { useTranslation } from '@/lib/i18n';
import {
  Sparkles, Brain, Zap, Bot, Play, RefreshCw, ToggleLeft, ToggleRight,
  ChevronRight, AlertTriangle, CheckCircle2, Clock, Settings,
  UserCircle2,
} from 'lucide-react';
import { AIMAN_GREETING, AIMAN_SUGGESTIONS, AIMAN_THINKING_LABEL } from '@/lib/hris/ai-persona';

const API = '/api/humanify/ai-hub';

type Tab = 'overview' | 'copilot' | 'automation' | 'insights';

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

export default function AiHubPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [insightSource, setInsightSource] = useState('rules');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, rulesRes, logsRes] = await Promise.all([
        fetch(`${API}?action=dashboard`),
        fetch(`${API}?action=automation-rules`),
        fetch(`${API}?action=automation-logs`),
      ]);
      const dash = await dashRes.json();
      const rulesJson = await rulesRes.json();
      const logsJson = await logsRes.json();
      if (dash.success) {
        setDashboard(dash.data);
        setInsights(dash.data?.insights || []);
        setInsightSource(dash.data?.insightSource || 'rules');
      }
      if (rulesJson.success) setRules(rulesJson.data || []);
      if (logsJson.success) setLogs(logsJson.data || []);
    } catch { /* keep empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const q = router.query.tab as Tab | undefined;
    if (q && ['overview', 'copilot', 'automation', 'insights'].includes(q)) setTab(q);
  }, [router.query.tab]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatHistory(h => [...h, { role: 'user', content: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch(`${API}?action=chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: chatHistory }),
      });
      const data = await res.json();
      if (data.success) {
        setChatHistory(h => [...h, { role: 'assistant', content: data.data.reply }]);
      }
    } finally { setChatLoading(false); }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      await fetch(`${API}?action=automation-scan`, { method: 'POST' });
      await load();
    } finally { setScanning(false); }
  };

  const executeRule = async (ruleId: string) => {
    await fetch(`${API}?action=automation-execute`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule_id: ruleId }),
    });
    await load();
  };

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    await fetch(`${API}?action=toggle-rule`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule_id: ruleId, is_active: !isActive }),
    });
    await load();
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Ringkasan', icon: Sparkles },
    { key: 'copilot', label: t('hris.aimanTab'), icon: Bot },
    { key: 'automation', label: 'Otomasi', icon: Zap },
    { key: 'insights', label: 'AI Insights', icon: Brain },
  ];

  const quickLinks = [
    { href: '/humanify/hr-analytics', label: 'HR Analytics', desc: 'Prediktif & advisor' },
    { href: '/humanify/recruitment', label: 'AI Screening', desc: 'Skor kandidat otomatis' },
    { href: '/humanify/lms/ai-assistant', label: 'LMS AI', desc: 'Generate soal & learning path' },
    { href: '/humanify/kpi-settings', label: 'Analisis KPI', desc: 'Bobot & rekomendasi' },
    { href: '/humanify/reimbursement', label: 'OCR Klaim', desc: 'Scan struk otomatis' },
  ];

  return (
    <PageGuard anyPermission={['hris.view', 'hris.*', 'humanify.*']}>
      <HumanifyLayout title={t('hris.aiHubTitle')} subtitle={t('hris.aiHubSubtitle')}>
        <EnterprisePageHeader
          title={t('hris.aiHubTitle')}
          subtitle={t('hris.aiHubSubtitle')}
          badge="Humanify AI Center"
          icon={Sparkles}
          variant="corporate"
          gradient="corporate"
          actions={
            <div className="flex gap-2">
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${dashboard?.llmEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {dashboard?.llmEnabled ? `AIMAN · ${dashboard?.llmModel || 'LLM'}` : 'Mode Rules'}
              </span>
              <button type="button" onClick={load} className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          }
        />

        <div className="mt-6 flex flex-wrap gap-2 border-b pb-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
                tab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="mt-6 space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Aturan Otomasi', value: dashboard?.totalRules ?? 0, icon: Zap, color: 'text-amber-600' },
                { label: 'Aturan Aktif', value: dashboard?.activeRules ?? 0, icon: CheckCircle2, color: 'text-emerald-600' },
                { label: 'Total Eksekusi', value: dashboard?.totalTriggers ?? 0, icon: Play, color: 'text-indigo-600' },
                { label: 'AI Insights', value: insights.length, icon: Brain, color: 'text-purple-600' },
              ].map((s) => (
                <div key={s.label} className="bg-white border rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{s.label}</p>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white border rounded-xl p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-5 w-5 text-indigo-500" /> Modul AI Terintegrasi</h3>
                <div className="space-y-2">
                  {quickLinks.map((l) => (
                    <Link key={l.href} href={l.href} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 group">
                      <div>
                        <p className="font-medium text-sm">{l.label}</p>
                        <p className="text-xs text-slate-500">{l.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="bg-white border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2"><Clock className="h-5 w-5 text-slate-500" /> Log Otomasi Terbaru</h3>
                  <button type="button" onClick={runScan} disabled={scanning} className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
                    {scanning ? 'Scanning...' : 'Jalankan Scan'}
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {logs.length ? logs.map((l: any) => (
                    <div key={l.id} className="text-sm border rounded-lg p-2">
                      <span className="font-medium">{l.rule_name}</span>
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${l.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>{l.status}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{new Date(l.executed_at).toLocaleString('id-ID')}</p>
                    </div>
                  )) : <p className="text-sm text-slate-400">Belum ada log. Jalankan scan otomasi.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'copilot' && (
          <div className="mt-6 bg-white border rounded-xl flex flex-col h-[600px] shadow-sm">
            <div className="p-4 border-b flex items-center gap-3 bg-gradient-to-r from-indigo-50/80 to-white">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-sm shadow-md">
                AI
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{t('hris.aimanName')} <span className="text-indigo-600">· {t('hris.aimanTitle')}</span></p>
                <p className="text-xs text-slate-500">{t('hris.aimanTagline')}</p>
              </div>
              <span className="hidden sm:inline text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium">AI Guide HR</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!chatHistory.length && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 text-sm text-slate-700">
                  <div className="flex items-start gap-3">
                    <UserCircle2 className="h-8 w-8 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="space-y-3">
                      <p className="whitespace-pre-wrap leading-relaxed">{AIMAN_GREETING.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                      <div className="flex flex-wrap gap-2">
                        {AIMAN_SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => { setChatInput(s); }}
                            className="text-xs px-3 py-1.5 rounded-full border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {chatHistory.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white mt-0.5">AI</div>
                  )}
                  <div className={`max-w-[78%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 border border-slate-200/80 rounded-bl-sm'
                  }`}>
                    {m.role === 'assistant' && (
                      <p className="text-[10px] font-semibold text-indigo-600 mb-1 uppercase tracking-wide">AIMAN</p>
                    )}
                    {m.content.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 animate-pulse">AI</div>
                  <span className="animate-pulse">{AIMAN_THINKING_LABEL}</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t bg-slate-50/50 flex gap-2">
              <input
                className="flex-1 border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder={t('hris.aimanPlaceholder')}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
              />
              <button type="button" onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors">
                Kirim
              </button>
            </div>
          </div>
        )}

        {tab === 'automation' && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">{rules.length} aturan otomasi HR</p>
              <button type="button" onClick={runScan} disabled={scanning} className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">
                <Zap className="h-4 w-4" /> {scanning ? 'Memindai...' : 'Scan Semua Aturan'}
              </button>
            </div>
            <div className="space-y-3">
              {rules.map((rule: any) => (
                <div key={rule.id} className="bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{rule.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{rule.rule_type}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{rule.description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Trigger: {rule.trigger_count || 0}x · Terakhir: {rule.last_triggered_at ? new Date(rule.last_triggered_at).toLocaleString('id-ID') : 'belum pernah'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => toggleRule(rule.id, rule.is_active)} title={rule.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                      {rule.is_active ? <ToggleRight className="h-7 w-7 text-emerald-500" /> : <ToggleLeft className="h-7 w-7 text-slate-400" />}
                    </button>
                    <button type="button" onClick={() => executeRule(rule.id)} className="px-3 py-1.5 border rounded-lg text-xs hover:bg-slate-50 flex items-center gap-1">
                      <Play className="h-3 w-3" /> Jalankan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'insights' && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Settings className="h-4 w-4" />
              Sumber: <span className="font-medium text-slate-700">{insightSource}</span>
              {insightSource === 'rules' && (
                <span className="text-xs text-amber-600">· Set HRIS_AI_LLM=true untuk LLM enhancement</span>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {insights.map((ins: any, i: number) => (
                <div key={i} className="bg-white border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm">{ins.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${PRIORITY_COLORS[ins.priority] || PRIORITY_COLORS.low}`}>
                      {ins.priority}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-600 mt-1 uppercase">{ins.module}</p>
                  <p className="text-sm text-slate-600 mt-2">{ins.summary}</p>
                  {ins.actions?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {ins.actions.map((a: string, j: number) => (
                        <li key={j} className="text-xs text-slate-500 flex items-start gap-1">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              {!insights.length && !loading && (
                <p className="text-slate-400 text-sm col-span-2">Belum ada insight. Refresh untuk memuat data.</p>
              )}
            </div>
            <Link href="/humanify/hr-analytics" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
              Buka HR Analytics lengkap <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </HumanifyLayout>
    </PageGuard>
  );
}
