import React, { useState, useEffect, useCallback } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  Shield, ShieldAlert, ShieldCheck, ShieldX,
  AlertTriangle, AlertCircle, Info, CheckCircle2,
  Brain, Scan, RefreshCw, ChevronLeft, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Wallet, FileWarning,
  Calendar, Target, Zap, Eye, Sparkles,
  ArrowRight, Clock, DollarSign, Receipt,
  Play, PlayCircle, History, Tag, BookOpen, Bell,
  Lock, Calculator, ArrowLeftRight, CheckCircle, Loader2,
  ThumbsUp, ThumbsDown, Bot, Cog, ListChecks
} from 'lucide-react';

interface GuardianAlert {
  id: string;
  category: string;
  severity: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  suggestedAction?: string;
  autoFixable?: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface ScanResult {
  score: number;
  grade: string;
  alerts: GuardianAlert[];
  summary: { critical: number; high: number; medium: number; low: number; info: number; total: number };
  scannedAt: string;
  scanDurationMs: number;
}

interface QuickStats {
  monthlyRevenue: number;
  monthlyExpenses: number;
  netIncome: number;
  overdueInvoices: number;
  overdueAmount: number;
  pendingTransactions: number;
}

const formatCurrency = (v: number) => `Rp ${Math.abs(v).toLocaleString('id-ID')}`;

const severityConfig: Record<string, { color: string; bg: string; border: string; icon: any; label: string }> = {
  critical: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: ShieldX, label: 'Kritis' },
  high: { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertTriangle, label: 'Tinggi' },
  medium: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertCircle, label: 'Sedang' },
  low: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: Info, label: 'Rendah' },
  info: { color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', icon: Info, label: 'Info' },
};

const categoryConfig: Record<string, { label: string; icon: any }> = {
  input_error: { label: 'Kesalahan Input', icon: FileWarning },
  accounting_violation: { label: 'Pelanggaran Akuntansi', icon: ShieldAlert },
  anomaly: { label: 'Anomali', icon: Zap },
  compliance: { label: 'Kepatuhan', icon: Target },
  cash_flow: { label: 'Arus Kas', icon: TrendingDown },
  reminder: { label: 'Pengingat', icon: Calendar },
};

const gradeColors: Record<string, string> = {
  A: 'from-emerald-500 to-green-600',
  B: 'from-blue-500 to-blue-600',
  C: 'from-amber-500 to-yellow-600',
  D: 'from-orange-500 to-orange-600',
  F: 'from-red-500 to-red-600',
};

const taskIcons: Record<string, any> = {
  auto_categorize: Tag,
  auto_journal: BookOpen,
  auto_invoice_followup: Bell,
  auto_expense_approve: CheckCircle,
  auto_period_close: Lock,
  auto_tax_calc: Calculator,
  auto_reconcile: ArrowLeftRight,
};

const taskStatusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  needs_approval: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  running: 'bg-blue-100 text-blue-700',
  pending: 'bg-gray-100 text-gray-600',
};

const taskStatusLabels: Record<string, string> = {
  completed: 'Selesai',
  needs_approval: 'Perlu Persetujuan',
  failed: 'Gagal',
  running: 'Berjalan',
  pending: 'Menunggu',
};

const MOCK_QUICK_STATS: QuickStats = { monthlyRevenue: 485000000, monthlyExpenses: 312000000, netIncome: 173000000, overdueInvoices: 3, overdueAmount: 15600000, pendingTransactions: 8 };
const MOCK_SCAN_RESULT: ScanResult = {
  score: 78, grade: 'B',
  alerts: [
    { id: 'ga1', category: 'cash_flow', severity: 'medium', title: 'Arus kas operasional menurun', message: 'Arus kas operasional turun 15% dibanding bulan lalu', suggestedAction: 'Review pengeluaran operasional', autoFixable: false, createdAt: '2026-03-15T08:00:00Z' },
    { id: 'ga2', category: 'compliance', severity: 'high', title: '3 invoice jatuh tempo', message: 'Terdapat 3 invoice pelanggan yang sudah melewati jatuh tempo', suggestedAction: 'Kirim pengingat pembayaran', autoFixable: true, createdAt: '2026-03-15T08:00:00Z' },
    { id: 'ga3', category: 'anomaly', severity: 'low', title: 'Transaksi void meningkat', message: 'Jumlah transaksi void meningkat 20% di Cabang Bandung', suggestedAction: 'Investigasi penyebab void', autoFixable: false, createdAt: '2026-03-14T16:00:00Z' },
  ],
  summary: { critical: 0, high: 1, medium: 1, low: 1, info: 0, total: 3 },
  scannedAt: '2026-03-15T08:00:00Z', scanDurationMs: 1250,
};

export default function AIGuardianPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'guardian' | 'autonomous'>('guardian');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(MOCK_SCAN_RESULT);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(MOCK_QUICK_STATS);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [aiReviewing, setAiReviewing] = useState(false);
  const [aiReview, setAiReview] = useState<any>(null);
  const [aiSuggesting, setAiSuggesting] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, any>>({});

  // Autonomous state
  const [autoStatus, setAutoStatus] = useState<any>(null);
  const [autoRunning, setAutoRunning] = useState<string | null>(null);
  const [autoResults, setAutoResults] = useState<any[]>([]);
  const [autoHistory, setAutoHistory] = useState<any[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  useEffect(() => { setMounted(true); }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/hq/finance/ai-guardian?action=dashboard');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data.quickStats) setQuickStats(data.quickStats);
      }
    } catch (e) { console.error('Dashboard fetch error:', e); setQuickStats(MOCK_QUICK_STATS); }
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/hq/finance/ai-guardian?action=scan');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setScanResult(data);
        toast.success(`Scan selesai dalam ${data.scanDurationMs}ms - Score: ${data.score}/100 (${data.grade})`);
      } else {
        toast.error('Scan gagal');
      }
    } catch (e) {
      toast.error('Error saat scanning');
    } finally {
      setScanning(false);
    }
  }, []);

  const runAiReview = useCallback(async () => {
    setAiReviewing(true);
    setAiReview(null);
    try {
      const res = await fetch('/api/hq/finance/ai-guardian?action=ai-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'openai', model: 'gpt-4o-mini' }),
      });
      if (res.ok) {
        const json = await res.json();
        setAiReview(json.data || json);
        toast.success('AI Review selesai');
      }
    } catch (e) {
      toast.error('AI Review gagal');
    } finally {
      setAiReviewing(false);
    }
  }, []);

  const getAiSuggestion = useCallback(async (alert: GuardianAlert) => {
    setAiSuggesting(alert.id);
    try {
      const res = await fetch('/api/hq/finance/ai-guardian?action=ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert, provider: 'openai', model: 'gpt-4o-mini' }),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setAiSuggestions(prev => ({ ...prev, [alert.id]: data.suggestion || data.fallbackSuggestion }));
      }
    } catch (e) {
      toast.error('Gagal mendapatkan saran AI');
    } finally {
      setAiSuggesting(null);
    }
  }, []);

  const fetchAutoStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/hq/finance/ai-autonomous?action=status');
      if (res.ok) {
        const json = await res.json();
        setAutoStatus(json.data || json);
      }
    } catch (e) { console.error('Auto status error:', e); }
  }, []);

  const fetchAutoHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/hq/finance/ai-autonomous?action=history&limit=20');
      if (res.ok) {
        const json = await res.json();
        setAutoHistory(json.data || []);
      }
    } catch (e) {}
  }, []);

  const runAutoTask = useCallback(async (action: string) => {
    setAutoRunning(action);
    try {
      const res = await fetch(`/api/hq/finance/ai-autonomous?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data.tasks) {
          setAutoResults(data.tasks);
          toast.success(`${data.tasksExecuted} tugas selesai dieksekusi`);
        } else if (data.type) {
          setAutoResults(prev => [data, ...prev.filter(r => r.type !== data.type)]);
          toast.success(data.title || 'Tugas selesai');
        } else if (data.task) {
          setAutoResults(prev => [data.task, ...prev.filter(r => r.type !== data.task.type)]);
          toast.success(data.task.title || 'Tugas selesai');
        } else {
          toast.success(data.message || 'Tugas selesai');
        }
        fetchAutoStatus();
        fetchAutoHistory();
      } else {
        toast.error('Gagal menjalankan tugas');
      }
    } catch (e) {
      toast.error('Error menjalankan tugas');
    } finally {
      setAutoRunning(null);
    }
  }, [fetchAutoStatus, fetchAutoHistory]);

  const approveTask = useCallback(async (taskId: string, approved: boolean) => {
    try {
      const res = await fetch('/api/hq/finance/ai-autonomous?action=approve-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, approved }),
      });
      if (res.ok) {
        toast.success(approved ? 'Tugas disetujui' : 'Tugas ditolak');
        setAutoResults(prev => prev.map(r => r.id === taskId ? { ...r, status: approved ? 'completed' : 'failed' } : r));
        fetchAutoHistory();
      }
    } catch (e) { toast.error('Gagal memproses persetujuan'); }
  }, [fetchAutoHistory]);

  useEffect(() => {
    if (mounted) {
      fetchDashboard();
      runScan();
      fetchAutoStatus();
      fetchAutoHistory();
    }
  }, [mounted, fetchDashboard, runScan, fetchAutoStatus, fetchAutoHistory]);

  const toggleAlert = (id: string) => {
    setExpandedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredAlerts = (scanResult?.alerts || []).filter(a => {
    if (filterCategory !== 'all' && a.category !== filterCategory) return false;
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    return true;
  });

  if (!mounted) return null;

  return (
    <HQLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hq/finance" className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('finance.aiTitle')}</h1>
                <p className="text-gray-500 text-sm">{t('finance.aiSubtitle')}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={runScan} disabled={scanning} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 text-sm font-medium">
              {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
              {scanning ? 'Scanning...' : 'Scan Ulang'}
            </button>
            <button onClick={runAiReview} disabled={aiReviewing} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm font-medium">
              {aiReviewing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              {aiReviewing ? 'Reviewing...' : 'AI Deep Review'}
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 max-w-md">
          <button onClick={() => setActiveTab('guardian')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'guardian' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Shield className="w-4 h-4" /> Pengawas
          </button>
          <button onClick={() => setActiveTab('autonomous')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'autonomous' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Bot className="w-4 h-4" /> Akuntan Otonom
          </button>
        </div>

        {activeTab === 'guardian' && (<>
        {/* Score + Quick Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Health Score Card */}
          {scanResult && (
            <div className={`col-span-1 bg-gradient-to-br ${gradeColors[scanResult.grade] || gradeColors.C} rounded-2xl p-6 text-white relative overflow-hidden`}>
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-sm font-medium opacity-90">Skor Kesehatan</span>
                </div>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-bold">{scanResult.score}</span>
                  <span className="text-3xl font-bold opacity-80 mb-1">{scanResult.grade}</span>
                </div>
                <p className="text-xs mt-2 opacity-80">
                  {scanResult.summary.total} temuan | Scan {new Date(scanResult.scannedAt).toLocaleTimeString('id-ID')}
                </p>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          {quickStats && (
            <>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>Pendapatan Bulan Ini</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(quickStats.monthlyRevenue)}</p>
                <p className={`text-xs mt-1 ${quickStats.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Net: {quickStats.netIncome >= 0 ? '+' : '-'}{formatCurrency(quickStats.netIncome)}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                  <Receipt className="w-4 h-4 text-red-500" />
                  <span>Invoice Jatuh Tempo</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{quickStats.overdueInvoices} invoice</p>
                <p className="text-xs mt-1 text-red-600">{formatCurrency(quickStats.overdueAmount)} belum dibayar</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Transaksi Pending</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{quickStats.pendingTransactions} draft</p>
                <p className="text-xs mt-1 text-gray-500">Menunggu approval</p>
              </div>
            </>
          )}
        </div>

        {/* Severity Summary Pills */}
        {scanResult && scanResult.summary.total > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-600">Ringkasan:</span>
            {scanResult.summary.critical > 0 && (
              <button onClick={() => setFilterSeverity(filterSeverity === 'critical' ? 'all' : 'critical')} className={`px-3 py-1 rounded-full text-xs font-medium ${filterSeverity === 'critical' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}>
                {scanResult.summary.critical} Kritis
              </button>
            )}
            {scanResult.summary.high > 0 && (
              <button onClick={() => setFilterSeverity(filterSeverity === 'high' ? 'all' : 'high')} className={`px-3 py-1 rounded-full text-xs font-medium ${filterSeverity === 'high' ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-700'}`}>
                {scanResult.summary.high} Tinggi
              </button>
            )}
            {scanResult.summary.medium > 0 && (
              <button onClick={() => setFilterSeverity(filterSeverity === 'medium' ? 'all' : 'medium')} className={`px-3 py-1 rounded-full text-xs font-medium ${filterSeverity === 'medium' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
                {scanResult.summary.medium} Sedang
              </button>
            )}
            {(scanResult.summary.low + scanResult.summary.info) > 0 && (
              <button onClick={() => setFilterSeverity(filterSeverity === 'low' ? 'all' : 'low')} className={`px-3 py-1 rounded-full text-xs font-medium ${filterSeverity === 'low' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                {scanResult.summary.low + scanResult.summary.info} Info
              </button>
            )}
            {filterSeverity !== 'all' && (
              <button onClick={() => setFilterSeverity('all')} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                Reset Filter
              </button>
            )}
          </div>
        )}

        {/* Category Tabs */}
        {scanResult && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button onClick={() => setFilterCategory('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${filterCategory === 'all' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Semua ({scanResult.summary.total})
            </button>
            {Object.entries(categoryConfig).map(([key, cfg]) => {
              const count = scanResult.alerts.filter(a => a.category === key).length;
              if (count === 0) return null;
              const Icon = cfg.icon;
              return (
                <button key={key} onClick={() => setFilterCategory(filterCategory === key ? 'all' : key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${filterCategory === key ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  <Icon className="w-3.5 h-3.5" /> {cfg.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Alerts List */}
        <div className="space-y-3">
          {filteredAlerts.length === 0 && scanResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-green-800">Tidak Ada Masalah Ditemukan</h3>
              <p className="text-sm text-green-600 mt-1">Sistem keuangan Anda dalam kondisi baik!</p>
            </div>
          )}

          {filteredAlerts.map((alert) => {
            const sev = severityConfig[alert.severity] || severityConfig.info;
            const cat = categoryConfig[alert.category] || categoryConfig.reminder;
            const SevIcon = sev.icon;
            const CatIcon = cat.icon;
            const isExpanded = expandedAlerts.has(alert.id);
            const suggestion = aiSuggestions[alert.id];

            return (
              <div key={alert.id} className={`${sev.bg} border ${sev.border} rounded-xl overflow-hidden`}>
                <button onClick={() => toggleAlert(alert.id)} className="w-full px-4 py-3 flex items-start gap-3 text-left">
                  <SevIcon className={`w-5 h-5 mt-0.5 ${sev.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-medium ${sev.color} bg-white/60 px-2 py-0.5 rounded`}>{sev.label}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1"><CatIcon className="w-3 h-3" />{cat.label}</span>
                    </div>
                    <h4 className={`font-semibold text-sm ${sev.color}`}>{alert.title}</h4>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{alert.message}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 mt-1" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/50">
                    <div className="mt-3 space-y-3">
                      {/* Full message */}
                      <p className="text-sm text-gray-700">{alert.message}</p>

                      {/* Suggested action */}
                      {alert.suggestedAction && (
                        <div className="flex items-start gap-2 bg-white/60 rounded-lg p-3">
                          <Sparkles className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-violet-700">Saran Perbaikan</p>
                            <p className="text-xs text-gray-600 mt-0.5">{alert.suggestedAction}</p>
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                        <div className="bg-white/40 rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">Detail Teknis</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {Object.entries(alert.metadata).filter(([k]) => !['transactionIds'].includes(k)).map(([key, val]) => (
                              <div key={key} className="text-xs">
                                <span className="text-gray-500">{key}: </span>
                                <span className="font-medium text-gray-700">
                                  {typeof val === 'number' ? (val > 10000 ? formatCurrency(val) : val.toLocaleString('id-ID')) : String(val)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI Suggestion */}
                      {suggestion && (
                        <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg p-3 border border-violet-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="w-4 h-4 text-purple-600" />
                            <span className="text-xs font-semibold text-purple-700">Saran AI</span>
                          </div>
                          {typeof suggestion === 'string' ? (
                            <p className="text-xs text-gray-700">{suggestion}</p>
                          ) : (
                            <div className="space-y-2">
                              {suggestion.solution && <p className="text-xs text-gray-700">{suggestion.solution}</p>}
                              {suggestion.steps && (
                                <ol className="list-decimal list-inside text-xs text-gray-600 space-y-0.5">
                                  {suggestion.steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                </ol>
                              )}
                              {suggestion.preventionTips && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-500">Pencegahan:</p>
                                  <ul className="list-disc list-inside text-xs text-gray-600">
                                    {suggestion.preventionTips.map((t: string, i: number) => <li key={i}>{t}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!suggestion && (
                          <button
                            onClick={() => getAiSuggestion(alert)}
                            disabled={aiSuggesting === alert.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-50"
                          >
                            {aiSuggesting === alert.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                            Minta Saran AI
                          </button>
                        )}
                        {alert.entityType && alert.entityId && (
                          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50">
                            <Eye className="w-3.5 h-3.5" /> Lihat Detail
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* AI Deep Review Results */}
        {activeTab === 'guardian' && aiReview && (
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">AI Deep Review</h3>
                <p className="text-xs text-gray-500">
                  {aiReview.aiAvailable ? `${aiReview.provider}/${aiReview.model} • ${aiReview.durationMs}ms` : 'Fallback mode'}
                </p>
              </div>
            </div>

            {aiReview.aiAvailable && aiReview.review ? (
              <div className="space-y-4">
                {aiReview.review.healthAssessment && (
                  <div className="bg-white/70 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-1">Penilaian Umum</h4>
                    <p className="text-sm text-gray-700">{aiReview.review.healthAssessment}</p>
                  </div>
                )}

                {aiReview.review.risks?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Risiko Teridentifikasi</h4>
                    <div className="space-y-2">
                      {aiReview.review.risks.map((r: any, i: number) => (
                        <div key={i} className={`bg-white/70 rounded-lg p-3 border-l-4 ${r.level === 'high' ? 'border-red-500' : r.level === 'medium' ? 'border-amber-500' : 'border-blue-500'}`}>
                          <p className="text-sm font-medium text-gray-800">{r.title}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{r.description}</p>
                          <p className="text-xs text-violet-600 mt-1 font-medium">→ {r.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiReview.review.actionItems?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Action Items</h4>
                    <div className="bg-white/70 rounded-lg divide-y divide-gray-100">
                      {aiReview.review.actionItems.sort((a: any, b: any) => a.priority - b.priority).map((item: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3">
                          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${item.priority <= 2 ? 'bg-red-500' : item.priority <= 3 ? 'bg-amber-500' : 'bg-blue-500'}`}>
                            {item.priority}
                          </span>
                          <div>
                            <p className="text-sm text-gray-800">{item.action}</p>
                            {item.deadline && <p className="text-xs text-gray-500 mt-0.5">Deadline: {item.deadline}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">{aiReview.fallbackMessage || aiReview.error || 'AI review tidak tersedia'}</p>
            )}
          </div>
        )}
        </>)}

        {/* ═══ TAB 2: AKUNTAN OTONOM ═══ */}
        {activeTab === 'autonomous' && (
          <div className="space-y-6">
            {/* Run All Button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Bot className="w-5 h-5 text-violet-600" /> Akuntan AI Otonom</h2>
                <p className="text-sm text-gray-500">AI yang bekerja otomatis mengerjakan tugas-tugas akuntansi rutin</p>
              </div>
              <button onClick={() => runAutoTask('run-all')} disabled={autoRunning !== null} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 text-sm font-semibold shadow-lg shadow-violet-200">
                {autoRunning === 'run-all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                {autoRunning === 'run-all' ? 'Menjalankan Semua...' : 'Jalankan Semua Tugas'}
              </button>
            </div>

            {/* Task Capability Cards */}
            {autoStatus?.taskCapabilities && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {autoStatus.taskCapabilities.map((cap: any) => {
                  const Icon = taskIcons[cap.type] || Cog;
                  const isRunning = autoRunning === cap.type.replace('auto_', '');
                  const result = autoResults.find(r => r.type === cap.type);
                  const actionName = cap.type.replace('auto_', '');

                  return (
                    <div key={cap.type} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-violet-50 rounded-lg">
                            <Icon className="w-5 h-5 text-violet-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm text-gray-900">{cap.title}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{cap.description}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          {cap.pendingCount > 0 ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">
                              {cap.pendingCount} pending
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium">✓ Bersih</span>
                          )}
                          {cap.autoApprove && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">Auto</span>}
                        </div>
                        <button
                          onClick={() => runAutoTask(actionName)}
                          disabled={autoRunning !== null || cap.pendingCount === 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          {isRunning ? 'Berjalan...' : 'Jalankan'}
                        </button>
                      </div>

                      {/* Result inline */}
                      {result && (
                        <div className={`mt-3 p-2.5 rounded-lg text-xs ${result.status === 'completed' ? 'bg-green-50 text-green-800' : result.status === 'needs_approval' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{taskStatusLabels[result.status] || result.status}</span>
                            <span>{result.affectedRecords} record</span>
                          </div>
                          <p className="mt-1 opacity-80 line-clamp-2">{result.description}</p>
                          {result.status === 'needs_approval' && (
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => approveTask(result.id, true)} className="flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700">
                                <ThumbsUp className="w-3 h-3" /> Setujui
                              </button>
                              <button onClick={() => approveTask(result.id, false)} className="flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200">
                                <ThumbsDown className="w-3 h-3" /> Tolak
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Execution Results */}
            {autoResults.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-violet-600" />
                  <h3 className="font-semibold text-sm text-gray-900">Hasil Eksekusi Terakhir</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {autoResults.map((result: any, idx: number) => {
                    const Icon = taskIcons[result.type] || Cog;
                    const isExpanded = expandedTasks.has(result.id);

                    return (
                      <div key={result.id || idx}>
                        <button onClick={() => {
                          setExpandedTasks(prev => {
                            const next = new Set(prev);
                            if (next.has(result.id)) next.delete(result.id); else next.add(result.id);
                            return next;
                          });
                        }} className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-gray-50">
                          <Icon className="w-4 h-4 text-violet-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                            <p className="text-xs text-gray-500 truncate">{result.description}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${taskStatusColors[result.status] || 'bg-gray-100 text-gray-600'}`}>
                            {taskStatusLabels[result.status] || result.status}
                          </span>
                          <span className="text-xs text-gray-400">{result.affectedRecords} rec</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>

                        {isExpanded && result.changes && (
                          <div className="px-5 pb-4 bg-gray-50">
                            <div className="space-y-1.5 max-h-60 overflow-y-auto">
                              {result.changes.slice(0, 20).map((c: any, ci: number) => (
                                <div key={ci} className="flex items-start gap-2 text-xs">
                                  <span className={`px-1.5 py-0.5 rounded font-medium ${c.action === 'create' ? 'bg-green-100 text-green-700' : c.action === 'update' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                    {c.action === 'create' ? 'BUAT' : c.action === 'update' ? 'UBAH' : 'HAPUS'}
                                  </span>
                                  <span className="text-gray-600 flex-1">{c.description}</span>
                                </div>
                              ))}
                              {result.changes.length > 20 && (
                                <p className="text-xs text-gray-400 italic">...dan {result.changes.length - 20} perubahan lainnya</p>
                              )}
                            </div>

                            {result.status === 'needs_approval' && (
                              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                                <button onClick={() => approveTask(result.id, true)} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
                                  <ThumbsUp className="w-3.5 h-3.5" /> Setujui & Eksekusi
                                </button>
                                <button onClick={() => approveTask(result.id, false)} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg text-xs font-medium hover:bg-red-50">
                                  <ThumbsDown className="w-3.5 h-3.5" /> Tolak
                                </button>
                              </div>
                            )}

                            {/* Tax summary or closing summary */}
                            {(result as any).taxSummary && (
                              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                <h4 className="text-xs font-semibold text-gray-700 mb-2">Ringkasan Pajak</h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div><span className="text-gray-500">PPN Keluaran:</span> <span className="font-medium">{formatCurrency((result as any).taxSummary.ppn?.keluaran || 0)}</span></div>
                                  <div><span className="text-gray-500">PPN Masukan:</span> <span className="font-medium">{formatCurrency((result as any).taxSummary.ppn?.masukan || 0)}</span></div>
                                  <div><span className="text-gray-500">PPh 21:</span> <span className="font-medium">{formatCurrency((result as any).taxSummary.pph21?.estimated || 0)}</span></div>
                                  <div><span className="text-gray-500">PPh 23:</span> <span className="font-medium">{formatCurrency((result as any).taxSummary.pph23?.amount || 0)}</span></div>
                                  <div className="col-span-2 pt-1 border-t"><span className="text-gray-700 font-semibold">Total Kewajiban:</span> <span className="font-bold text-violet-700">{formatCurrency((result as any).taxSummary.totalTaxObligation || 0)}</span></div>
                                </div>
                              </div>
                            )}

                            {(result as any).followUpActions && (result as any).followUpActions.length > 0 && (
                              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                <h4 className="text-xs font-semibold text-gray-700 mb-2">Tindakan Follow-up</h4>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                  {(result as any).followUpActions.slice(0, 10).map((a: any, ai: number) => (
                                    <div key={ai} className={`text-xs p-2 rounded ${a.priority === 'critical' ? 'bg-red-50 text-red-800' : a.priority === 'high' ? 'bg-orange-50 text-orange-800' : 'bg-gray-50 text-gray-700'}`}>
                                      <span className="font-medium">{a.invoiceNumber}</span> — {a.message}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Execution History */}
            {autoHistory.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-gray-500" />
                  <h3 className="font-semibold text-sm text-gray-900">Riwayat Eksekusi</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500">
                        <th className="text-left px-4 py-2 font-medium">Waktu</th>
                        <th className="text-left px-4 py-2 font-medium">Tugas</th>
                        <th className="text-left px-4 py-2 font-medium">Status</th>
                        <th className="text-right px-4 py-2 font-medium">Record</th>
                        <th className="text-left px-4 py-2 font-medium">Oleh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {autoHistory.map((h: any, i: number) => (
                        <tr key={h.id || i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{new Date(h.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-4 py-2 font-medium text-gray-800">{h.title}</td>
                          <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded ${taskStatusColors[h.status] || 'bg-gray-100 text-gray-600'}`}>{taskStatusLabels[h.status] || h.status}</span></td>
                          <td className="px-4 py-2 text-right text-gray-600">{h.affected_records}</td>
                          <td className="px-4 py-2 text-gray-500">{h.executed_by === 'ai' ? '🤖 AI' : h.approved_by || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!autoStatus && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-8 text-center">
                <Bot className="w-12 h-12 text-violet-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-violet-800">Memuat Akuntan AI...</h3>
                <p className="text-sm text-violet-600 mt-1">Sedang menganalisis tugas-tugas yang tersedia</p>
              </div>
            )}
          </div>
        )}
      </div>
    </HQLayout>
  );
}
