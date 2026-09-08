import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import HRStatCard from '@/components/humanify/HRStatCard';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import PerformanceModuleChrome, { EnterpriseTabBar } from '@/components/humanify/PerformanceModuleChrome';
import { USE_MOCK_UI, type HrisDataSource } from '@/lib/hris/data-source';
import {
  KPI_CATEGORIES, KPI_TEMPLATES, STANDARD_SCORING_LEVELS, ROLE_KPI_PRESETS,
  analyzeWeightDistribution, getScoreLevel, calculateOverallScore,
} from '@/lib/hq/kpi-calculator';
import {
  Target, Settings, Plus, Edit2, Trash2, Save, X, Search, RefreshCw,
  CheckCircle, AlertTriangle, Users, Award, Calculator,
  Sliders, Copy, ExternalLink, Zap, Layers, Scale, Briefcase,
} from 'lucide-react';

type TabKey = 'templates' | 'scoring' | 'presets' | 'weights' | 'calculator';

interface KPITemplate {
  id?: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  dataType: string;
  formulaType: string;
  formula: string;
  defaultWeight: number;
  measurementFrequency: string;
  applicableTo: string[];
  parameters: { name: string; label: string; type: string; required?: boolean; default?: any }[];
}

interface ScoringLevel {
  id?: string;
  level: number;
  label: string;
  minPercent: number;
  maxPercent: number;
  color: string;
  multiplier: number;
}

interface ScoringScheme {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  levels: ScoringLevel[];
}

const CATEGORY_LABEL: Record<string, string> = {
  sales: 'Penjualan', marketing: 'Pemasaran', operations: 'Operasi',
  customer: 'Pelanggan', financial: 'Keuangan', hr: 'SDM', quality: 'Kualitas',
};

const FREQ_LABEL: Record<string, string> = {
  daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', quarterly: 'Kuartalan', yearly: 'Tahunan',
};

const LEVEL_LABEL: Record<string, string> = {
  Excellent: 'Unggul', Good: 'Baik', Average: 'Cukup', 'Below Average': 'Di bawah target', Poor: 'Kurang',
};

const HEALTH_CLS: Record<string, string> = {
  excellent: 'bg-emerald-50 text-emerald-800',
  good: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]',
  needs_improvement: 'bg-amber-50 text-amber-800',
  poor: 'bg-rose-50 text-rose-800',
};

const HEALTH_LABEL: Record<string, string> = {
  excellent: 'Sangat baik', good: 'Baik', needs_improvement: 'Perlu perbaikan', poor: 'Kurang',
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-[color:var(--hf-ink-muted)]">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-[color:var(--hf-ink-faint)]">{hint}</p>}
    </label>
  );
}

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className || 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'}`}>{children}</span>;
}

function mapApiTemplate(t: any): KPITemplate {
  return {
    id: t.id,
    code: t.code,
    name: t.name,
    description: t.description || '',
    category: t.category,
    unit: t.unit || '%',
    dataType: t.dataType || t.data_type || 'number',
    formulaType: t.formulaType || t.formula_type || 'simple',
    formula: t.formula || '(actual / target) * 100',
    defaultWeight: Number(t.defaultWeight ?? t.default_weight ?? 100),
    measurementFrequency: t.measurementFrequency || t.measurement_frequency || 'monthly',
    applicableTo: t.applicableTo || t.applicable_to || ['all'],
    parameters: t.parameters || [],
  };
}

function mapScheme(s: any): ScoringScheme {
  return {
    id: String(s.id),
    name: s.name,
    description: s.description || '',
    isDefault: Boolean(s.isDefault ?? s.is_default),
    levels: (s.levels || []).map((l: any) => ({
      id: l.id,
      level: Number(l.level),
      label: l.label,
      minPercent: Number(l.minPercent ?? l.min_percent ?? 0),
      maxPercent: Number(l.maxPercent ?? l.max_percent ?? 100),
      color: l.color || '#64748b',
      multiplier: Number(l.multiplier ?? 1),
    })),
  };
}

function levelTone(level: number) {
  if (level >= 5) return 'bg-emerald-50 text-emerald-800';
  if (level >= 4) return 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]';
  if (level >= 3) return 'bg-amber-50 text-amber-800';
  return 'bg-rose-50 text-rose-800';
}

function displayLevel(label: string) {
  return LEVEL_LABEL[label] || label;
}

export default function KPISettings() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabKey>('templates');
  const [templates, setTemplates] = useState<KPITemplate[]>(USE_MOCK_UI ? KPI_TEMPLATES as KPITemplate[] : []);
  const [scoringSchemes, setScoringSchemes] = useState<ScoringScheme[]>(USE_MOCK_UI ? [{ id: 'ss1', name: 'Standar 5 level', isDefault: true, description: 'Skala penilaian standar', levels: STANDARD_SCORING_LEVELS }] : []);
  const [dataSource, setDataSource] = useState<HrisDataSource>(USE_MOCK_UI ? 'demo' : 'empty');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<KPITemplate | null>(null);
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [editingScheme, setEditingScheme] = useState<ScoringScheme | null>(null);
  const [selectedRole, setSelectedRole] = useState('sales_staff');
  const [weightMetrics, setWeightMetrics] = useState<any[]>([]);
  const [weightAnalysis, setWeightAnalysis] = useState<any>(null);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const [calcMetrics, setCalcMetrics] = useState([
    { name: 'Target Penjualan', actual: 0, target: 0, weight: 25, category: 'sales', code: 'KPI-SALES-001' },
    { name: 'Target per Produk', actual: 0, target: 0, weight: 20, category: 'sales', code: 'KPI-SALES-005' },
    { name: 'Target Kunjungan', actual: 0, target: 0, weight: 15, category: 'sales', code: 'KPI-SALES-007' },
    { name: 'Akuisisi Pelanggan', actual: 0, target: 0, weight: 10, category: 'sales', code: 'KPI-SALES-008' },
    { name: 'Kepuasan Pelanggan', actual: 0, target: 0, weight: 15, category: 'customer', code: 'KPI-CUST-001' },
    { name: 'Kehadiran', actual: 0, target: 0, weight: 15, category: 'operations', code: 'KPI-OPS-002' },
  ]);
  const [calcResult, setCalcResult] = useState<any>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/humanify/kpi-settings');
      if (response.ok) {
        const json = await response.json();
        const payload = json.data || json;
        const apiTemplates = payload.templates;
        if (apiTemplates?.length > 0) {
          setTemplates(apiTemplates.map(mapApiTemplate));
          setDataSource('live');
        } else if (!USE_MOCK_UI) {
          setTemplates(KPI_TEMPLATES as KPITemplate[]);
          setDataSource('empty');
        }
        if (payload.scoringSchemes?.length > 0) setScoringSchemes(payload.scoringSchemes.map(mapScheme));
      } else if (!USE_MOCK_UI) {
        setDataSource('empty');
      }
    } catch {
      showToast('error', 'Gagal memuat pengaturan KPI');
      if (!USE_MOCK_UI) setDataSource('empty');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setMounted(true); fetchData(); }, [fetchData]);

  useEffect(() => {
    const preset = ROLE_KPI_PRESETS[selectedRole];
    if (!preset) return;
    const metrics = preset.kpis.map((k) => {
      const tmpl = (templates.length ? templates : KPI_TEMPLATES as KPITemplate[]).find((tp) => tp.code === k.code);
      return { code: k.code, name: tmpl?.name || k.code, weight: k.weight, category: tmpl?.category || 'sales' };
    });
    setWeightMetrics(metrics);
    setWeightAnalysis(analyzeWeightDistribution(metrics));
  }, [selectedRole, templates]);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((tp) => {
      const catOk = selectedCategory === 'all' || tp.category === selectedCategory;
      const qOk = !q || tp.name.toLowerCase().includes(q) || tp.code.toLowerCase().includes(q) || (tp.description || '').toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [selectedCategory, templates, search]);

  const weightTotal = calcMetrics.reduce((sum, m) => sum + (Number(m.weight) || 0), 0);
  const categoryCount = Object.keys(KPI_CATEGORIES).length;
  const defaultScheme = scoringSchemes.find((s) => s.isDefault) || scoringSchemes[0];

  if (!mounted) {
    return (
      <HQLayout>
        <PerformanceModuleChrome active="kpi-settings" title="Pengaturan KPI" subtitle="Memuat…" icon={Settings} />
      </HQLayout>
    );
  }

  const seedDefaults = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/humanify/kpi-settings?type=seed-defaults', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        showToast('error', json.error?.message || json.error || 'Gagal memasang template');
      } else {
        const d = json.data || {};
        showToast('success', json.message || `Template: ${d.created || 0} baru`);
        await fetchData();
      }
    } catch {
      showToast('error', 'Gagal memasang template bawaan');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (template: KPITemplate) => {
    const isEdit = Boolean(editingTemplate?.id);
    const res = await fetch('/api/humanify/kpi-templates', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...template, id: editingTemplate?.id }),
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      showToast('error', data.message || data.error || 'Gagal menyimpan template');
      return;
    }
    showToast('success', isEdit ? 'Template diperbarui' : 'Template dibuat');
    setShowTemplateModal(false);
    setEditingTemplate(null);
    await fetchData();
  };

  const duplicateTemplate = async (template: KPITemplate) => {
    const suffix = `-COPY`;
    const code = `${template.code}${suffix}`.slice(0, 40);
    const res = await fetch('/api/humanify/kpi-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...template, id: undefined, code, name: `${template.name} (salinan)` }),
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      showToast('error', data.message || data.error || 'Gagal menyalin template');
      return;
    }
    showToast('success', 'Salinan template dibuat');
    await fetchData();
  };

  const deleteTemplate = async (template: KPITemplate) => {
    if (!template.id) {
      showToast('error', 'Template pratinjau belum tersimpan. Pasang template bawaan dulu.');
      return;
    }
    if (!window.confirm(`Hapus template “${template.name}”?`)) return;
    const res = await fetch(`/api/humanify/kpi-templates?id=${encodeURIComponent(template.id)}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      showToast('error', data.message || 'Gagal menghapus template');
      return;
    }
    showToast('success', 'Template dihapus');
    await fetchData();
  };

  const saveScheme = async (payload: { name: string; description: string; isDefault: boolean }) => {
    const isEdit = Boolean(editingScheme?.id && editingScheme.id !== 'ss1');
    if (isEdit) {
      const res = await fetch('/api/humanify/kpi-settings?type=scheme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingScheme!.id,
          name: payload.name,
          description: payload.description,
          is_default: payload.isDefault,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        showToast('error', json.error?.message || json.error || 'Gagal menyimpan skema');
        return;
      }
    } else {
      const res = await fetch('/api/humanify/kpi-settings?type=scheme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          description: payload.description,
          is_default: payload.isDefault,
          levels: STANDARD_SCORING_LEVELS,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        showToast('error', json.error?.message || json.error || 'Gagal membuat skema');
        return;
      }
    }
    showToast('success', isEdit ? 'Skema diperbarui' : 'Skema dibuat');
    setShowScoringModal(false);
    setEditingScheme(null);
    await fetchData();
  };

  const setDefaultScheme = async (scheme: ScoringScheme) => {
    if (!scheme.id || scheme.id === 'ss1') {
      showToast('error', 'Pasang template bawaan agar skema tersimpan ke tenant.');
      return;
    }
    const res = await fetch('/api/humanify/kpi-settings?type=scheme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: scheme.id, is_default: true }),
    });
    if (!res.ok) { showToast('error', 'Gagal menjadikan default'); return; }
    showToast('success', `“${scheme.name}” jadi skema default`);
    await fetchData();
  };

  const deleteScheme = async (scheme: ScoringScheme) => {
    if (!scheme.id || scheme.id === 'ss1') return;
    if (!window.confirm(`Hapus skema “${scheme.name}”?`)) return;
    const res = await fetch(`/api/humanify/kpi-settings?type=scheme&id=${encodeURIComponent(scheme.id)}`, { method: 'DELETE' });
    if (!res.ok) { showToast('error', 'Gagal menghapus skema'); return; }
    showToast('success', 'Skema dihapus');
    await fetchData();
  };

  const applyPresetToCalculator = (roleKey: string) => {
    const preset = ROLE_KPI_PRESETS[roleKey];
    if (!preset) return;
    const catalog = templates.length ? templates : KPI_TEMPLATES as KPITemplate[];
    setCalcMetrics(preset.kpis.map((k) => {
      const tmpl = catalog.find((tp) => tp.code === k.code);
      return {
        name: tmpl?.name || k.code,
        actual: 0,
        target: 0,
        weight: k.weight,
        category: tmpl?.category || 'sales',
        code: k.code,
      };
    }));
    setCalcResult(null);
    setSelectedRole(roleKey);
    setTab('calculator');
  };

  const calculateScore = async () => {
    setCalcLoading(true);
    try {
      const response = await fetch('/api/humanify/kpi-scoring', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: calcMetrics, scoringLevels: defaultScheme?.levels || STANDARD_SCORING_LEVELS }),
      });
      if (response.ok) { setCalcResult(await response.json()); setCalcLoading(false); return; }
    } catch { /* client fallback */ }
    const results = calcMetrics.map((m) => {
      const ach = m.target > 0 ? Math.round((m.actual / m.target) * 100) : 0;
      const lv = getScoreLevel(ach, defaultScheme?.levels || STANDARD_SCORING_LEVELS);
      return { ...m, achievement: ach, level: lv.level, levelLabel: lv.label, levelColor: lv.color };
    });
    const overall = calculateOverallScore(calcMetrics, defaultScheme?.levels || STANDARD_SCORING_LEVELS);
    const weightedAchievement = results.reduce((s, r) => s + r.achievement * r.weight, 0) / Math.max(1, results.reduce((s, r) => s + r.weight, 0));
    setCalcResult({
      summary: { overallScore: overall.level.level, overallScoreLabel: overall.level.label, overallScoreColor: overall.level.color, weightedAchievement: Math.round(weightedAchievement) },
      metrics: results,
      recommendations: results.filter((r) => r.achievement < 80).map((r) => `Tingkatkan “${r.name}”: pencapaian ${r.achievement}% di bawah target`),
    });
    setCalcLoading(false);
  };

  const updWeight = (i: number, v: number) => {
    const next = [...weightMetrics];
    next[i] = { ...next[i], weight: v };
    setWeightMetrics(next);
    setWeightAnalysis(analyzeWeightDistribution(next));
  };

  return (
    <HQLayout>
      <div className="space-y-5">
        <PerformanceModuleChrome
          active="kpi-settings"
          title="Pengaturan KPI"
          subtitle="Katalog metrik, skala penilaian, paket jabatan, dan simulasi bobot — dipakai modul KPI karyawan."
          icon={Settings}
          actions={
            <>
              <DataSourceBadge source={dataSource} />
              <button type="button" onClick={fetchData} className="hf-btn-secondary inline-flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Segarkan
              </button>
              <Link href="/humanify/kpi" className="hf-btn-primary inline-flex items-center gap-2">
                <ExternalLink className="h-4 w-4" /> KPI karyawan
              </Link>
            </>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {loading && templates.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[108px] animate-pulse hf-card" />
            ))
          ) : (
            <>
              <HRStatCard label="Template" value={templates.length} sub={dataSource === 'empty' ? 'Pratinjau katalog' : 'Tersimpan di tenant'} icon={Target} accent="violet" />
              <HRStatCard label="Skema penilaian" value={scoringSchemes.length} sub={defaultScheme ? defaultScheme.name : 'Belum ada default'} icon={Scale} accent="emerald" />
              <HRStatCard label="Kategori" value={categoryCount} icon={Layers} accent="cyan" />
              <HRStatCard label="Paket jabatan" value={Object.keys(ROLE_KPI_PRESETS).length} icon={Briefcase} accent="amber" />
            </>
          )}
        </div>

        <EnterpriseTabBar
          tabs={[
            { key: 'templates', label: 'Katalog', icon: Target, count: templates.length },
            { key: 'scoring', label: 'Skala penilaian', icon: Award, count: scoringSchemes.length },
            { key: 'presets', label: 'Paket jabatan', icon: Users, count: Object.keys(ROLE_KPI_PRESETS).length },
            { key: 'weights', label: 'Analisis bobot', icon: Sliders },
            { key: 'calculator', label: 'Simulasi skor', icon: Calculator },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'templates' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setSelectedCategory('all')} className={`rounded-[var(--hf-radius)] px-3 py-1.5 text-sm ${selectedCategory === 'all' ? 'bg-[var(--hf-brand-600)] text-white' : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-secondary)]'}`}>
                  Semua <span className="tabular-nums opacity-80">{templates.length}</span>
                </button>
                {Object.keys(KPI_CATEGORIES).map((key) => {
                  const count = templates.filter((tp) => tp.category === key).length;
                  return (
                    <button key={key} type="button" onClick={() => setSelectedCategory(key)} className={`rounded-[var(--hf-radius)] px-3 py-1.5 text-sm ${selectedCategory === key ? 'bg-[var(--hf-brand-600)] text-white' : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-secondary)]'}`}>
                      {CATEGORY_LABEL[key] || key} <span className="tabular-nums opacity-80">{count}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[color:var(--hf-ink-faint)]" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau kode…" className="hf-input w-full pl-9" aria-label="Cari template" />
                </div>
                <button type="button" onClick={seedDefaults} className="hf-btn-secondary inline-flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Pasang bawaan
                </button>
                <button type="button" onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }} className="hf-btn-primary inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Tambah template
                </button>
              </div>
            </div>

            {dataSource === 'empty' && (
              <div className="rounded-[var(--hf-radius-lg)] border border-dashed border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)] px-4 py-3 text-sm text-[color:var(--hf-ink-secondary)]">
                Katalog di bawah masih pratinjau. Pasang template bawaan agar tersimpan ke tenant dan dipakai di KPI karyawan.
              </div>
            )}

            {loading && templates.length === 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-44 animate-pulse hf-card" />)}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <HrisEmptyState
                source={dataSource}
                title={templates.length === 0 ? 'Belum ada template KPI' : 'Tidak ada yang cocok'}
                description="Pasang katalog bawaan atau buat metrik sendiri. Template menjadi acuan saat menugaskan KPI ke karyawan."
                action={
                  <button type="button" onClick={seedDefaults} className="hf-btn-primary inline-flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Pasang template bawaan
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredTemplates.map((template) => (
                  <article key={`${template.id || template.code}`} className="hf-card flex flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-[11px] text-[color:var(--hf-ink-faint)]">{template.code}</p>
                        <h3 className="mt-0.5 text-sm font-semibold text-[color:var(--hf-ink)]">{template.name}</h3>
                      </div>
                      <Pill className="bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]">{CATEGORY_LABEL[template.category] || template.category}</Pill>
                    </div>
                    <p className="mt-2 line-clamp-2 flex-1 text-xs text-[color:var(--hf-ink-muted)]">{template.description || 'Tidak ada deskripsi.'}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div className="flex justify-between gap-2"><dt className="text-[color:var(--hf-ink-faint)]">Unit</dt><dd className="font-medium">{template.unit}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-[color:var(--hf-ink-faint)]">Bobot</dt><dd className="font-medium">{template.defaultWeight}%</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-[color:var(--hf-ink-faint)]">Frekuensi</dt><dd className="font-medium">{FREQ_LABEL[template.measurementFrequency] || template.measurementFrequency}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-[color:var(--hf-ink-faint)]">Formula</dt><dd className="font-medium capitalize">{template.formulaType}</dd></div>
                    </dl>
                    <div className="mt-3 flex items-center justify-between border-t border-[var(--hf-border)] pt-3">
                      <div className="flex flex-wrap gap-1">
                        {(template.applicableTo || []).slice(0, 2).map((role) => (
                          <Pill key={role}>{role.replace(/_/g, ' ')}</Pill>
                        ))}
                        {(template.applicableTo?.length || 0) > 2 && <Pill>+{template.applicableTo.length - 2}</Pill>}
                      </div>
                      <div className="flex gap-1">
                        <button type="button" title="Edit" onClick={() => { setEditingTemplate(template); setShowTemplateModal(true); }} className="rounded-[var(--hf-radius)] p-1.5 text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-brand-50)] hover:text-[color:var(--hf-brand-600)]"><Edit2 className="h-4 w-4" /></button>
                        <button type="button" title="Salin" onClick={() => duplicateTemplate(template)} className="rounded-[var(--hf-radius)] p-1.5 text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]"><Copy className="h-4 w-4" /></button>
                        <button type="button" title="Hapus" onClick={() => deleteTemplate(template)} className="rounded-[var(--hf-radius)] p-1.5 text-[color:var(--hf-ink-muted)] hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'scoring' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[color:var(--hf-ink-muted)]">Skala 5 level menentukan status pencapaian. Satu skema default dipakai simulasi dan penilaian karyawan.</p>
              <button type="button" onClick={() => { setEditingScheme(null); setShowScoringModal(true); }} className="hf-btn-primary inline-flex items-center gap-2">
                <Plus className="h-4 w-4" /> Buat skema
              </button>
            </div>
            {scoringSchemes.length === 0 ? (
              <HrisEmptyState
                source={dataSource}
                title="Belum ada skema penilaian"
                description="Pasang template bawaan untuk membuat skala 5 level, atau buat skema sendiri."
                action={<button type="button" onClick={seedDefaults} className="hf-btn-primary inline-flex items-center gap-2"><Zap className="h-4 w-4" /> Pasang bawaan</button>}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {scoringSchemes.map((scheme) => (
                  <article key={scheme.id} className={`hf-card p-5 ${scheme.isDefault ? 'ring-1 ring-[var(--hf-brand-600)]' : ''}`}>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-[color:var(--hf-ink)]">{scheme.name}</h3>
                          {scheme.isDefault && <Pill className="bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]">Default</Pill>}
                        </div>
                        <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">{scheme.description || 'Tanpa deskripsi'}</p>
                      </div>
                      <div className="flex gap-1">
                        {!scheme.isDefault && (
                          <button type="button" onClick={() => setDefaultScheme(scheme)} className="hf-btn-secondary !px-2 !py-1 text-xs">Jadikan default</button>
                        )}
                        <button type="button" onClick={() => { setEditingScheme(scheme); setShowScoringModal(true); }} className="rounded-[var(--hf-radius)] p-1.5 text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-brand-50)]"><Edit2 className="h-4 w-4" /></button>
                        <button type="button" onClick={() => deleteScheme(scheme)} className="rounded-[var(--hf-radius)] p-1.5 text-[color:var(--hf-ink-muted)] hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(scheme.levels || []).map((level) => (
                        <div key={`${scheme.id}-${level.level}`} className="flex items-center gap-3">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${levelTone(level.level)}`}>{level.level}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-[color:var(--hf-ink)]">{displayLevel(level.label)}</span>
                              <span className="tabular-nums text-[color:var(--hf-ink-muted)]">{level.minPercent}% – {level.maxPercent === 999 ? '∞' : `${level.maxPercent}%`}</span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--hf-surface-muted)]">
                              <div className="h-full rounded-full bg-[var(--hf-brand-600)]" style={{ width: `${Math.min(100, Math.max(8, (Math.min(level.maxPercent, 120) - level.minPercent)))}%` }} />
                            </div>
                          </div>
                          <span className="w-10 text-right text-xs text-[color:var(--hf-ink-faint)]">×{level.multiplier}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="hf-card p-5">
                <h3 className="text-sm font-semibold text-[color:var(--hf-ink)]">Acuan bonus</h3>
                <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">Dipakai simulasi skor bila gaji pokok diisi di API penilaian.</p>
                <ul className="mt-3 space-y-2">
                  {[
                    { min: 4.5, pct: 15, label: 'Kinerja terbaik' },
                    { min: 4.0, pct: 10, label: 'Kinerja tinggi' },
                    { min: 3.5, pct: 5, label: 'Kinerja baik' },
                  ].map((tier) => (
                    <li key={tier.min} className="flex items-center justify-between rounded-[var(--hf-radius)] bg-emerald-50 px-3 py-2 text-sm">
                      <span className="text-emerald-800">{tier.label} <span className="text-xs text-emerald-700">· skor ≥ {tier.min}</span></span>
                      <span className="font-semibold text-emerald-800">+{tier.pct}%</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hf-card p-5">
                <h3 className="text-sm font-semibold text-[color:var(--hf-ink)]">Acuan penalti</h3>
                <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">Opsional; default kalkulator tidak memotong gaji otomatis.</p>
                <ul className="mt-3 space-y-2">
                  {[
                    { max: 2.0, pct: 10, label: 'Peringatan kinerja' },
                    { max: 1.5, pct: 15, label: 'Rencana perbaikan' },
                  ].map((tier) => (
                    <li key={tier.max} className="flex items-center justify-between rounded-[var(--hf-radius)] bg-rose-50 px-3 py-2 text-sm">
                      <span className="text-rose-800">{tier.label} <span className="text-xs text-rose-700">· skor ≤ {tier.max}</span></span>
                      <span className="font-semibold text-rose-800">−{tier.pct}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {tab === 'presets' && (
          <div className="space-y-4">
            <p className="text-sm text-[color:var(--hf-ink-muted)]">Paket jabatan adalah titik awal. Sesuaikan bobot di Analisis, lalu pakai di simulasi atau tugaskan metrik di KPI karyawan.</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(ROLE_KPI_PRESETS).map(([key, preset]) => {
                const catalog = templates.length ? templates : KPI_TEMPLATES as KPITemplate[];
                const total = preset.kpis.reduce((s, k) => s + k.weight, 0);
                return (
                  <article key={key} className="hf-card flex flex-col p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-[color:var(--hf-ink)]">{preset.label}</h3>
                        <p className="text-xs text-[color:var(--hf-ink-muted)]">{preset.kpis.length} metrik · total {total}%</p>
                      </div>
                      {total === 100 ? <CheckCircle className="h-4 w-4 text-[color:var(--hf-success)]" /> : <AlertTriangle className="h-4 w-4 text-[color:var(--hf-warning)]" />}
                    </div>
                    <ul className="space-y-1.5">
                      {preset.kpis.map((kpi) => {
                        const tmpl = catalog.find((t) => t.code === kpi.code);
                        return (
                          <li key={kpi.code} className="flex items-center justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate text-[color:var(--hf-ink-secondary)]">{tmpl?.name || kpi.code}</span>
                            <span className="tabular-nums text-xs font-medium text-[color:var(--hf-ink)]">{kpi.weight}%</span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-4 flex gap-2 border-t border-[var(--hf-border)] pt-3">
                      <button type="button" onClick={() => { setSelectedRole(key); setTab('weights'); }} className="hf-btn-secondary flex-1 !py-1.5 text-xs">Analisis bobot</button>
                      <button type="button" onClick={() => applyPresetToCalculator(key)} className="hf-btn-primary flex-1 !py-1.5 text-xs">Pakai di simulasi</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'weights' && weightAnalysis && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-3">
              <Field label="Paket jabatan">
                <select className="hf-input w-full" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                  {Object.entries(ROLE_KPI_PRESETS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
                </select>
              </Field>
              <div className={`rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] p-4 ${HEALTH_CLS[weightAnalysis.overallHealth] || ''}`}>
                <p className="text-xs font-medium opacity-80">Kesehatan distribusi</p>
                <p className="mt-1 text-lg font-semibold">{HEALTH_LABEL[weightAnalysis.overallHealth] || '—'}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm">
                  {weightAnalysis.isBalanced ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  Total bobot {weightAnalysis.totalWeight}%
                </p>
              </div>
              <div className="hf-card p-4">
                <h3 className="mb-3 text-sm font-semibold">Per kategori</h3>
                <div className="space-y-2">
                  {Object.entries(weightAnalysis.categoryBreakdown || {}).map(([c, d]: [string, any]) => (
                    <div key={c}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>{CATEGORY_LABEL[c] || c}</span>
                        <span className="tabular-nums">{d.weight}% · {d.count} metrik</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--hf-surface-muted)]">
                        <div className="h-full rounded-full bg-[var(--hf-brand-600)]" style={{ width: `${Math.min(100, d.weight)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="hf-card p-4 lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold">Sesuaikan bobot</h3>
              <div className="space-y-3">
                {weightMetrics.map((m: any, i: number) => (
                  <div key={m.code || i}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate font-medium text-[color:var(--hf-ink)]">{m.name}</span>
                      <span className="tabular-nums text-xs text-[color:var(--hf-ink-muted)]">{m.weight}%</span>
                    </div>
                    <input type="range" min={0} max={50} value={m.weight} onChange={(e) => updWeight(i, Number(e.target.value))} className="w-full accent-[var(--hf-brand-600)]" aria-label={`Bobot ${m.name}`} />
                  </div>
                ))}
              </div>
              {(weightAnalysis.recommendations?.length > 0 || weightAnalysis.insights?.length > 0) && (
                <ul className="mt-4 space-y-2 border-t border-[var(--hf-border)] pt-3 text-sm text-[color:var(--hf-ink-secondary)]">
                  {(weightAnalysis.recommendations || []).map((r: any, i: number) => (
                    <li key={`r-${i}`}>Sesuaikan {r.name}: {r.currentWeight}% → {r.recommendedWeight}% — {r.reason}</li>
                  ))}
                  {(weightAnalysis.insights || []).map((s: string, i: number) => (
                    <li key={`i-${i}`}>{s}</li>
                  ))}
                </ul>
              )}
              <button type="button" onClick={() => applyPresetToCalculator(selectedRole)} className="hf-btn-primary mt-4 inline-flex items-center gap-2">
                Pakai di simulasi skor
              </button>
            </div>
          </div>
        )}

        {tab === 'calculator' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Input metrik</h3>
                <p className={`text-xs ${weightTotal === 100 ? 'text-[color:var(--hf-success)]' : 'text-[color:var(--hf-warning)]'}`}>Total bobot {weightTotal}%{weightTotal !== 100 ? ' — harus 100%' : ''}</p>
              </div>
              {calcMetrics.map((metric, index) => (
                <div key={index} className="hf-card p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <input className="hf-input flex-1" value={metric.name} onChange={(e) => { const u = [...calcMetrics]; u[index].name = e.target.value; setCalcMetrics(u); }} aria-label="Nama metrik" />
                    <div className="flex items-center gap-1">
                      <input type="number" min={0} max={100} className="hf-input w-16 text-center" value={metric.weight} onChange={(e) => { const u = [...calcMetrics]; u[index].weight = parseInt(e.target.value, 10) || 0; setCalcMetrics(u); }} aria-label="Bobot" />
                      <span className="text-xs text-[color:var(--hf-ink-faint)]">%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Target"><input type="number" className="hf-input w-full" value={metric.target} onChange={(e) => { const u = [...calcMetrics]; u[index].target = parseFloat(e.target.value) || 0; setCalcMetrics(u); }} /></Field>
                    <Field label="Aktual"><input type="number" className="hf-input w-full" value={metric.actual} onChange={(e) => { const u = [...calcMetrics]; u[index].actual = parseFloat(e.target.value) || 0; setCalcMetrics(u); }} /></Field>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <button type="button" onClick={() => setCalcMetrics([...calcMetrics, { name: `Metrik ${calcMetrics.length + 1}`, actual: 0, target: 0, weight: 0, category: 'sales', code: '' }])} className="hf-btn-secondary inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Tambah metrik
                </button>
                <button type="button" onClick={calculateScore} disabled={calcLoading} className="hf-btn-primary flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50">
                  <Calculator className="h-4 w-4" /> {calcLoading ? 'Menghitung…' : 'Hitung skor'}
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Hasil</h3>
              {calcResult ? (
                <>
                  <div className="hf-card p-5 text-center">
                    <p className="hf-section-label">Skor tertimbang</p>
                    <p className="mt-1 text-3xl font-semibold tabular-nums text-[color:var(--hf-ink)]">{calcResult.summary.weightedAchievement}%</p>
                    <p className="mt-1 text-sm text-[color:var(--hf-ink-muted)]">
                      Level {calcResult.summary.overallScore}/5 · {displayLevel(calcResult.summary.overallScoreLabel)}
                    </p>
                  </div>
                  <div className="hf-card p-4">
                    <h4 className="mb-3 text-sm font-medium">Per metrik</h4>
                    <div className="space-y-3">
                      {calcResult.metrics.map((m: any, i: number) => (
                        <div key={i}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="font-medium">{m.name}</span>
                            <span className="tabular-nums">{m.achievement}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--hf-surface-muted)]">
                            <div className={`h-full rounded-full ${m.achievement >= 100 ? 'bg-[var(--hf-success)]' : m.achievement >= 80 ? 'bg-[var(--hf-warning)]' : 'bg-[var(--hf-danger)]'}`} style={{ width: `${Math.min(m.achievement, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {calcResult.recommendations?.length > 0 && (
                    <div className="hf-card p-4">
                      <h4 className="mb-2 text-sm font-medium">Rekomendasi</h4>
                      <ul className="space-y-1.5 text-sm text-[color:var(--hf-ink-secondary)]">
                        {calcResult.recommendations.map((rec: string, i: number) => <li key={i}>{rec}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <HrisEmptyState
                  source="empty"
                  title="Belum dihitung"
                  description="Isi target dan aktual, pastikan bobot 100%, lalu hitung skor. Paket jabatan bisa diimpor dari tab sebelumnya."
                />
              )}
            </div>
          </div>
        )}

        {showTemplateModal && (
          <TemplateModal
            template={editingTemplate}
            onClose={() => { setShowTemplateModal(false); setEditingTemplate(null); }}
            onSave={saveTemplate}
          />
        )}
        {showScoringModal && (
          <SchemeModal
            scheme={editingScheme}
            onClose={() => { setShowScoringModal(false); setEditingScheme(null); }}
            onSave={saveScheme}
          />
        )}

        {toast && (
          <div role="status" className={`fixed bottom-6 right-6 z-50 rounded-[var(--hf-radius)] px-4 py-3 text-sm text-white shadow-[var(--hf-shadow-md)] ${toast.type === 'success' ? 'bg-[var(--hf-success)]' : 'bg-[var(--hf-danger)]'}`}>
            {toast.message}
          </div>
        )}
      </div>
    </HQLayout>
  );
}

function TemplateModal({
  template, onClose, onSave,
}: { template: KPITemplate | null; onClose: () => void; onSave: (t: KPITemplate) => void }) {
  const [formData, setFormData] = useState<Partial<KPITemplate>>(template || {
    code: '', name: '', description: '', category: 'sales', unit: '%', dataType: 'percentage',
    formulaType: 'simple', formula: '(actual / target) * 100', defaultWeight: 10,
    measurementFrequency: 'monthly', applicableTo: ['all'], parameters: [],
  });
  const [newParam, setNewParam] = useState({ name: '', label: '', type: 'number', required: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!formData.code || !formData.name || !formData.category) return;
    setSaving(true);
    try { await onSave(formData as KPITemplate); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="kpi-tmpl-title">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto hf-card">
        <div className="flex items-center justify-between border-b border-[var(--hf-border)] px-5 py-4">
          <h3 id="kpi-tmpl-title" className="text-lg font-semibold">{template?.id ? 'Edit template KPI' : 'Tambah template KPI'}</h3>
          <button type="button" onClick={onClose} className="rounded-[var(--hf-radius)] p-1 text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]" aria-label="Tutup"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kode *"><input className="hf-input w-full" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="KPI-SALES-001" /></Field>
            <Field label="Nama *"><input className="hf-input w-full" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Target penjualan" /></Field>
          </div>
          <Field label="Deskripsi"><textarea className="hf-input w-full" rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Kategori *">
              <select className="hf-input w-full" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                {Object.keys(KPI_CATEGORIES).map((key) => <option key={key} value={key}>{CATEGORY_LABEL[key] || key}</option>)}
              </select>
            </Field>
            <Field label="Unit">
              <select className="hf-input w-full" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
                <option value="%">Persentase (%)</option>
                <option value="Rp">Rupiah (Rp)</option>
                <option value="unit">Unit</option>
                <option value="transaksi">Transaksi</option>
                <option value="kunjungan">Kunjungan</option>
                <option value="leads">Leads</option>
                <option value="pelanggan">Pelanggan</option>
                <option value="hari">Hari</option>
              </select>
            </Field>
            <Field label="Bobot default %"><input type="number" min={0} max={100} className="hf-input w-full" value={formData.defaultWeight} onChange={(e) => setFormData({ ...formData, defaultWeight: parseInt(e.target.value, 10) || 0 })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipe formula">
              <select className="hf-input w-full" value={formData.formulaType} onChange={(e) => setFormData({ ...formData, formulaType: e.target.value })}>
                <option value="simple">Sederhana (aktual/target)</option>
                <option value="weighted">Rata-rata tertimbang</option>
                <option value="cumulative">Kumulatif</option>
                <option value="average">Rata-rata</option>
                <option value="ratio">Rasio</option>
                <option value="product_target">Target produk</option>
                <option value="growth">Pertumbuhan</option>
                <option value="custom">Kustom</option>
              </select>
            </Field>
            <Field label="Frekuensi">
              <select className="hf-input w-full" value={formData.measurementFrequency} onChange={(e) => setFormData({ ...formData, measurementFrequency: e.target.value })}>
                {Object.entries(FREQ_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          {['custom', 'product_target', 'group_target', 'growth'].includes(formData.formulaType || '') && (
            <Field label="Formula kustom" hint="Variabel: actual, target, atau parameter.">
              <input className="hf-input w-full font-mono text-sm" value={formData.formula} onChange={(e) => setFormData({ ...formData, formula: e.target.value })} />
            </Field>
          )}
          <div className="rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] p-4">
            <p className="mb-2 text-sm font-medium">Parameter</p>
            <div className="mb-3 space-y-1">
              {formData.parameters?.map((param, index) => (
                <div key={index} className="flex items-center gap-2 rounded-[var(--hf-radius)] bg-[var(--hf-surface-muted)] px-2 py-1.5 text-sm">
                  <span className="flex-1">{param.label} ({param.name})</span>
                  <span className="text-xs text-[color:var(--hf-ink-faint)]">{param.type}</span>
                  <button type="button" onClick={() => setFormData({ ...formData, parameters: formData.parameters?.filter((_, i) => i !== index) })} className="text-rose-600" aria-label="Hapus parameter"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <input className="hf-input flex-1" placeholder="name" value={newParam.name} onChange={(e) => setNewParam({ ...newParam, name: e.target.value })} />
              <input className="hf-input flex-1" placeholder="Label" value={newParam.label} onChange={(e) => setNewParam({ ...newParam, label: e.target.value })} />
              <select className="hf-input" value={newParam.type} onChange={(e) => setNewParam({ ...newParam, type: e.target.value })}>
                <option value="number">Angka</option>
                <option value="percentage">Persen</option>
                <option value="currency">Mata uang</option>
              </select>
              <button type="button" onClick={() => {
                if (!newParam.name || !newParam.label) return;
                setFormData({ ...formData, parameters: [...(formData.parameters || []), { ...newParam }] });
                setNewParam({ name: '', label: '', type: 'number', required: false });
              }} className="hf-btn-primary !px-3"><Plus className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--hf-border)] px-5 py-4">
          <button type="button" onClick={onClose} className="hf-btn-secondary">Batal</button>
          <button type="button" onClick={handleSubmit} disabled={saving || !formData.code || !formData.name} className="hf-btn-primary inline-flex items-center gap-2 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? 'Menyimpan…' : 'Simpan template'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SchemeModal({
  scheme, onClose, onSave,
}: { scheme: ScoringScheme | null; onClose: () => void; onSave: (p: { name: string; description: string; isDefault: boolean }) => void }) {
  const [name, setName] = useState(scheme?.name || '');
  const [description, setDescription] = useState(scheme?.description || '');
  const [isDefault, setIsDefault] = useState(scheme?.isDefault ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="kpi-scheme-title">
      <div className="w-full max-w-md hf-card">
        <div className="flex items-center justify-between border-b border-[var(--hf-border)] px-5 py-4">
          <h3 id="kpi-scheme-title" className="text-lg font-semibold">{scheme?.id ? 'Edit skema penilaian' : 'Buat skema penilaian'}</h3>
          <button type="button" onClick={onClose} className="rounded-[var(--hf-radius)] p-1 text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]" aria-label="Tutup"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 p-5">
          <Field label="Nama *"><input className="hf-input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Standar 5 level" /></Field>
          <Field label="Deskripsi"><textarea className="hf-input w-full" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          {!scheme?.id && <p className="text-xs text-[color:var(--hf-ink-muted)]">Skema baru memakai tingkat standar: Unggul → Kurang (5–1).</p>}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            Jadikan skema default tenant
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--hf-border)] px-5 py-4">
          <button type="button" onClick={onClose} className="hf-btn-secondary">Batal</button>
          <button
            type="button"
            disabled={!name.trim() || saving}
            onClick={async () => { setSaving(true); try { await onSave({ name: name.trim(), description, isDefault }); } finally { setSaving(false); } }}
            className="hf-btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? 'Menyimpan…' : 'Simpan skema'}
          </button>
        </div>
      </div>
    </div>
  );
}

export { getServerSideProps } from '@/lib/humanify/require-session';
