import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  Target, Settings, Plus, Edit2, Trash2, Save, X,
  ChevronDown, ChevronRight, AlertCircle, CheckCircle,
  TrendingUp, DollarSign, Users, Package, Award, Percent,
  Calculator, Sliders, Info, Copy, Eye, Brain, Zap, BarChart3,
  MapPin, UserCheck, ShoppingCart, Megaphone, Star,
  Lightbulb, Loader2
} from 'lucide-react';
import dynamic from 'next/dynamic';
import {
  KPI_CATEGORIES, KPI_TEMPLATES, STANDARD_SCORING_LEVELS, ROLE_KPI_PRESETS,
  analyzeWeightDistribution, calculateAchievementPercentage, getScoreLevel,
  calculateOverallScore
} from '@/lib/hq/kpi-calculator';

import AIAnalysisPanel from '@/components/hq/kpi/AIAnalysisPanel';
import PresetsPanel from '@/components/hq/kpi/PresetsPanel';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface KPITemplate {
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
  isCustom?: boolean;
}

interface ScoringLevel {
  level: number;
  label: string;
  minPercent: number;
  maxPercent: number;
  color: string;
  multiplier: number;
}

const categoryIcons: Record<string, any> = {
  sales: TrendingUp,
  marketing: Megaphone,
  operations: Settings,
  customer: Users,
  financial: DollarSign,
  hr: UserCheck,
  quality: Award
};

const categoryColors: Record<string, string> = {
  sales: 'bg-blue-100 text-blue-700',
  marketing: 'bg-rose-100 text-rose-700',
  operations: 'bg-green-100 text-green-700',
  customer: 'bg-yellow-100 text-yellow-700',
  financial: 'bg-purple-100 text-purple-700',
  hr: 'bg-pink-100 text-pink-700',
  quality: 'bg-cyan-100 text-cyan-700'
};

type TabKey = 'templates' | 'scoring' | 'ai-analysis' | 'calculator' | 'presets';

export default function KPISettings() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('templates');
  const [templates, setTemplates] = useState<KPITemplate[]>(KPI_TEMPLATES as KPITemplate[]);
  const [scoringSchemes, setScoringSchemes] = useState<any[]>([
    { id: 'ss1', name: 'Standard 5-Level', isDefault: true, description: 'Skala penilaian standar 5 level', levels: STANDARD_SCORING_LEVELS }
  ]);
  const [categories] = useState<any>(KPI_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<KPITemplate | null>(null);
  const [showScoringModal, setShowScoringModal] = useState(false);

  // Calculator state
  const [calcMetrics, setCalcMetrics] = useState([
    { name: 'Target Penjualan', actual: 0, target: 0, weight: 25, category: 'sales', code: 'KPI-SALES-001' },
    { name: 'Target per Produk', actual: 0, target: 0, weight: 20, category: 'sales', code: 'KPI-SALES-005' },
    { name: 'Target Kunjungan', actual: 0, target: 0, weight: 15, category: 'sales', code: 'KPI-SALES-007' },
    { name: 'Akuisisi Pelanggan', actual: 0, target: 0, weight: 10, category: 'sales', code: 'KPI-SALES-008' },
    { name: 'Kepuasan Pelanggan', actual: 0, target: 0, weight: 15, category: 'customer', code: 'KPI-CUST-001' },
    { name: 'Kehadiran', actual: 0, target: 0, weight: 15, category: 'operations', code: 'KPI-OPS-002' }
  ]);
  const [calcResult, setCalcResult] = useState<any>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // AI Analysis state
  const [selectedRole, setSelectedRole] = useState('sales_staff');
  const [aiMetrics, setAiMetrics] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hq/hris/kpi-templates');
      if (response.ok) {
        const data = await response.json();
        if (data.data?.templates?.length > 0) setTemplates(data.data.templates);
        if (data.data?.scoringSchemes?.length > 0) setScoringSchemes(data.data.scoringSchemes);
      }
    } catch (error) {
      console.error('Error fetching KPI data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setMounted(true); fetchData(); }, []);

  // Initialize AI metrics from role preset
  useEffect(() => {
    const preset = ROLE_KPI_PRESETS[selectedRole];
    if (preset) {
      const metrics = preset.kpis.map(k => {
        const tmpl = KPI_TEMPLATES.find((tp: any) => tp.code === k.code);
        return { code: k.code, name: tmpl?.name || k.code, weight: k.weight, category: tmpl?.category || 'sales', achievement: Math.floor(Math.random() * 50) + 60 };
      });
      setAiMetrics(metrics);
      setAiAnalysis(analyzeWeightDistribution(metrics));
    }
  }, [selectedRole]);

  const calculateScore = async () => {
    setCalcLoading(true);
    try {
      const response = await fetch('/api/hq/hris/kpi-scoring', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: calcMetrics })
      });
      if (response.ok) { setCalcResult(await response.json()); setCalcLoading(false); return; }
    } catch {}
    // Fallback client-side
    const results = calcMetrics.map(m => {
      const ach = m.target > 0 ? Math.round((m.actual / m.target) * 100) : 0;
      const lv = getScoreLevel(ach);
      return { ...m, achievement: ach, level: lv.level, levelLabel: lv.label, levelColor: lv.color };
    });
    const overall = calculateOverallScore(calcMetrics);
    setCalcResult({
      summary: { overallScore: overall.level.level, overallScoreLabel: overall.level.label, overallScoreColor: overall.level.color, weightedAchievement: overall.score },
      metrics: results,
      recommendations: results.filter(r => r.achievement < 80).map(r => `Tingkatkan "${r.name}": pencapaian ${r.achievement}% di bawah target`)
    });
    setCalcLoading(false);
  };

  const filteredTemplates = useMemo(() => selectedCategory === 'all' ? templates : templates.filter(tp => tp.category === selectedCategory), [selectedCategory, templates]);
  const salesMarketingTemplates = useMemo(() => templates.filter(tp => tp.category === 'sales' || tp.category === 'marketing'), [templates]);

  if (!mounted) return null;

  const tabConfig: { id: TabKey; label: string; icon: any }[] = [
    { id: 'templates', label: 'Template KPI', icon: Target },
    { id: 'scoring', label: 'Standar Penilaian', icon: Award },
    { id: 'ai-analysis', label: 'AI Analisis Bobot', icon: Brain },
    { id: 'presets', label: 'Preset Role', icon: Users },
    { id: 'calculator', label: 'Kalkulator KPI', icon: Calculator },
  ];

  return (
    <HQLayout title="Pengaturan KPI" subtitle="Konfigurasi template, bobot penilaian, dan analisis AI untuk KPI Sales & Marketing">
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="flex overflow-x-auto border-b">
            {tabConfig.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                <tab.icon className="w-4 h-4" />{tab.label}
              </button>
            ))}
          </div>

          {/* ─── Templates Tab ─── */}
          {activeTab === 'templates' && (
            <div className="p-6">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                  <option value="all">Semua Kategori ({templates.length})</option>
                  {Object.entries(categories).map(([key, val]: [string, any]) => {
                    const count = templates.filter(tp => tp.category === key).length;
                    return <option key={key} value={key}>{val.name} ({count})</option>;
                  })}
                </select>
                <button onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"><Plus className="w-4 h-4" /> Tambah Template</button>
              </div>

              {/* Category Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                {Object.entries(categories).map(([key, val]: [string, any]) => {
                  const Icon = categoryIcons[key] || Target;
                  const count = templates.filter(tp => tp.category === key).length;
                  return (
                    <button key={key} onClick={() => setSelectedCategory(key === selectedCategory ? 'all' : key)}
                      className={`p-3 rounded-xl border text-center transition-all ${selectedCategory === key ? 'ring-2 ring-blue-500 border-blue-200 bg-blue-50' : 'hover:border-gray-300'}`}>
                      <div className={`w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center ${categoryColors[key]}`}><Icon className="w-4 h-4" /></div>
                      <p className="text-xs font-medium text-gray-700">{val.name}</p>
                      <p className="text-lg font-bold" style={{ color: val.color }}>{count}</p>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => {
                  const Icon = categoryIcons[template.category] || Target;
                  return (
                    <div key={template.code} className="border rounded-xl p-4 hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <div className={`p-2 rounded-lg ${categoryColors[template.category] || 'bg-gray-100 text-gray-700'}`}><Icon className="w-5 h-5" /></div>
                        <span className="text-xs text-gray-400 font-mono">{template.code}</span>
                      </div>
                      <h3 className="font-semibold mb-1">{template.name}</h3>
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{template.description || '-'}</p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">Unit</span><span className="font-medium">{template.unit}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Bobot Default</span><span className="font-medium">{template.defaultWeight}%</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Frekuensi</span><span className="font-medium capitalize">{template.measurementFrequency}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Formula</span><span className="font-medium capitalize">{template.formulaType}</span></div>
                      </div>
                      {template.parameters?.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-500 mb-1.5">Parameter:</p>
                          <div className="flex flex-wrap gap-1">{template.parameters.map((p, i) => <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{p.label}</span>)}</div>
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t flex justify-between items-center">
                        <div className="flex flex-wrap gap-1">
                          {template.applicableTo?.slice(0, 2).map((role, i) => <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">{role.replace(/_/g, ' ')}</span>)}
                          {(template.applicableTo?.length || 0) > 2 && <span className="text-xs text-gray-400">+{template.applicableTo.length - 2}</span>}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingTemplate(template); setShowTemplateModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"><Copy className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scoring Tab */}
          {activeTab === 'scoring' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-semibold">Scoring Standards</h3>
                  <p className="text-sm text-gray-500">Konfigurasi skala penilaian KPI</p>
                </div>
                <button 
                  onClick={() => setShowScoringModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Buat Skema Baru
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {scoringSchemes.map((scheme) => (
                  <div key={scheme.id} className={`border rounded-xl p-6 ${scheme.isDefault ? 'ring-2 ring-blue-500' : ''}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{scheme.name}</h4>
                          {scheme.isDefault && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Default</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{scheme.description}</p>
                      </div>
                      <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Scoring Levels Visualization */}
                    <div className="space-y-2">
                      {scheme.levels?.map((level: ScoringLevel) => (
                        <div key={level.level} className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: level.color }}
                          >
                            {level.level}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{level.label}</span>
                              <span className="text-gray-500">{level.minPercent}% - {level.maxPercent === 999 ? '∞' : level.maxPercent + '%'}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${Math.min((level.maxPercent - level.minPercent) / 2, 100)}%`, 
                                  backgroundColor: level.color 
                                }}
                              />
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            x{level.multiplier}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Chart Preview */}
                    <div className="mt-4 pt-4 border-t">
                      {typeof window !== 'undefined' && (
                        <Chart
                          type="bar"
                          height={120}
                          options={{
                            chart: { toolbar: { show: false }, sparkline: { enabled: false } },
                            plotOptions: { bar: { horizontal: true, barHeight: '80%', borderRadius: 4, distributed: true } },
                            dataLabels: { enabled: false },
                            xaxis: { categories: scheme.levels?.map((l: ScoringLevel) => l.label) || [], labels: { show: false } },
                            yaxis: { labels: { show: false } },
                            colors: scheme.levels?.map((l: ScoringLevel) => l.color) || [],
                            legend: { show: false },
                            grid: { show: false }
                          }}
                          series={[{ data: scheme.levels?.map((l: ScoringLevel) => l.level * 20) || [] }]}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bonus & Penalty Configuration */}
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Struktur Bonus</h4>
                      <p className="text-sm text-gray-500">Bonus berdasarkan skor KPI</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { minScore: 4.5, bonus: 15, label: 'Kinerja Terbaik' },
                      { minScore: 4.0, bonus: 10, label: 'Kinerja Tinggi' },
                      { minScore: 3.5, bonus: 5, label: 'Kinerja Baik' }
                    ].map((tier, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <span className="font-medium text-green-700">{tier.label}</span>
                          <p className="text-xs text-green-600">Score ≥ {tier.minScore}</p>
                        </div>
                        <span className="text-lg font-bold text-green-600">+{tier.bonus}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Struktur Penalti</h4>
                      <p className="text-sm text-gray-500">Pengurangan berdasarkan skor KPI</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { maxScore: 2.0, penalty: 10, label: 'Peringatan Kinerja' },
                      { maxScore: 1.5, penalty: 15, label: 'Rencana Peningkatan Kinerja' }
                    ].map((tier, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <span className="font-medium text-red-700">{tier.label}</span>
                          <p className="text-xs text-red-600">Score ≤ {tier.maxScore}</p>
                        </div>
                        <span className="text-lg font-bold text-red-600">-{tier.penalty}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Analysis Tab */}
          {activeTab === 'ai-analysis' && aiAnalysis && (<AIAnalysisPanel analysis={aiAnalysis} metrics={aiMetrics} setMetrics={setAiMetrics} setAnalysis={setAiAnalysis} selectedRole={selectedRole} setSelectedRole={setSelectedRole} />)}

          {/* Presets Tab */}
          {activeTab === 'presets' && (<PresetsPanel templates={templates} salesMarketingTemplates={salesMarketingTemplates} setSelectedRole={setSelectedRole} setActiveTab={setActiveTab} />)}

          {/* Calculator Tab */}
          {activeTab === 'calculator' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold">Input KPI Metrics</h3>
                  </div>

                  <div className="space-y-4">
                    {calcMetrics.map((metric, index) => (
                      <div key={index} className="border rounded-xl p-4">
                        <div className="flex justify-between items-center mb-3">
                          <input
                            type="text"
                            value={metric.name}
                            onChange={(e) => {
                              const updated = [...calcMetrics];
                              updated[index].name = e.target.value;
                              setCalcMetrics(updated);
                            }}
                            className="font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Weight:</span>
                            <input
                              type="number"
                              value={metric.weight}
                              onChange={(e) => {
                                const updated = [...calcMetrics];
                                updated[index].weight = parseInt(e.target.value) || 0;
                                setCalcMetrics(updated);
                              }}
                              className="w-16 px-2 py-1 border rounded text-center text-sm"
                              min={0}
                              max={100}
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-gray-500">Target</label>
                            <input
                              type="number"
                              value={metric.target}
                              onChange={(e) => {
                                const updated = [...calcMetrics];
                                updated[index].target = parseFloat(e.target.value) || 0;
                                setCalcMetrics(updated);
                              }}
                              className="w-full px-3 py-2 border rounded-lg"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Actual</label>
                            <input
                              type="number"
                              value={metric.actual}
                              onChange={(e) => {
                                const updated = [...calcMetrics];
                                updated[index].actual = parseFloat(e.target.value) || 0;
                                setCalcMetrics(updated);
                              }}
                              className="w-full px-3 py-2 border rounded-lg"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setCalcMetrics([...calcMetrics, { name: `Metric ${calcMetrics.length + 1}`, actual: 0, target: 0, weight: 0, category: 'sales', code: '' }])}
                      className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Metric
                    </button>
                    <button
                      onClick={calculateScore}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Calculator className="w-4 h-4" />
                      Hitung Score
                    </button>
                  </div>

                  {/* Weight Validation */}
                  <div className={`p-3 rounded-lg ${
                    calcMetrics.reduce((sum, m) => sum + m.weight, 0) === 100 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      {calcMetrics.reduce((sum, m) => sum + m.weight, 0) === 100 
                        ? <CheckCircle className="w-4 h-4" />
                        : <AlertCircle className="w-4 h-4" />
                      }
                      <span className="text-sm">
                        Total Weight: {calcMetrics.reduce((sum, m) => sum + m.weight, 0)}%
                        {calcMetrics.reduce((sum, m) => sum + m.weight, 0) !== 100 && ' (harus 100%)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Result Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold">Hasil Perhitungan</h3>
                  </div>

                  {calcResult ? (
                    <div className="space-y-4">
                      {/* Overall Score */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 text-center">
                        {typeof window !== 'undefined' && (
                          <Chart
                            type="radialBar"
                            height={200}
                            options={{
                              chart: { sparkline: { enabled: true } },
                              plotOptions: {
                                radialBar: {
                                  startAngle: -135,
                                  endAngle: 135,
                                  hollow: { size: '60%' },
                                  track: { background: '#e0e7ff' },
                                  dataLabels: {
                                    name: { show: true, fontSize: '14px', color: '#6366f1', offsetY: 25 },
                                    value: { 
                                      show: true, 
                                      fontSize: '32px', 
                                      fontWeight: 700,
                                      color: calcResult.summary.overallScoreColor,
                                      offsetY: -10
                                    }
                                  }
                                }
                              },
                              colors: [calcResult.summary.overallScoreColor],
                              labels: [calcResult.summary.overallScoreLabel]
                            }}
                            series={[calcResult.summary.weightedAchievement]}
                          />
                        )}
                        <p className="text-sm text-gray-600 mt-2">
                          Score Level: <span className="font-bold">{calcResult.summary.overallScore}/5</span>
                        </p>
                      </div>

                      {/* Metrics Breakdown */}
                      <div className="border rounded-xl p-4">
                        <h4 className="font-medium mb-3">Detail per Metric</h4>
                        <div className="space-y-3">
                          {calcResult.metrics.map((m: any, i: number) => (
                            <div key={i} className="flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: m.levelColor }}
                              >
                                {m.level}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">{m.name}</span>
                                  <span style={{ color: m.levelColor }}>{m.achievement}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full mt-1">
                                  <div 
                                    className="h-full rounded-full"
                                    style={{ width: `${Math.min(m.achievement, 100)}%`, backgroundColor: m.levelColor }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommendations */}
                      {calcResult.recommendations && (
                        <div className="border rounded-xl p-4">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-600" />
                            Rekomendasi
                          </h4>
                          <ul className="space-y-2">
                            {calcResult.recommendations.map((rec: string, i: number) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                      <Calculator className="w-12 h-12 mb-3" />
                      <p>Masukkan data dan klik &ldquo;Hitung Score&rdquo;</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Template Modal */}
        {showTemplateModal && (
          <TemplateModal 
            template={editingTemplate}
            categories={categories}
            onClose={() => { setShowTemplateModal(false); setEditingTemplate(null); }}
            onSave={(template) => {
              if (editingTemplate) {
                setTemplates(templates.map(t => t.code === template.code ? template : t));
              } else {
                setTemplates([...templates, template]);
              }
              setShowTemplateModal(false);
              setEditingTemplate(null);
            }}
          />
        )}
      </div>
    </HQLayout>
  );
}

// Template Modal Component
function TemplateModal({ 
  template, 
  categories, 
  onClose, 
  onSave 
}: { 
  template: KPITemplate | null; 
  categories: any;
  onClose: () => void; 
  onSave: (template: KPITemplate) => void;
}) {
  const [formData, setFormData] = useState<Partial<KPITemplate>>(template || {
    code: '',
    name: '',
    description: '',
    category: 'sales',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'simple',
    formula: '(actual / target) * 100',
    defaultWeight: 10,
    measurementFrequency: 'monthly',
    applicableTo: ['all'],
    parameters: []
  });

  const [newParam, setNewParam] = useState({ name: '', label: '', type: 'number', required: false });

  const handleSubmit = () => {
    if (!formData.code || !formData.name || !formData.category) {
      alert('Code, Name, dan Category wajib diisi');
      return;
    }
    onSave(formData as KPITemplate);
  };

  const addParameter = () => {
    if (!newParam.name || !newParam.label) return;
    setFormData({
      ...formData,
      parameters: [...(formData.parameters || []), { ...newParam }]
    });
    setNewParam({ name: '', label: '', type: 'number', required: false });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">{template ? 'Edit Template KPI' : 'Tambah Template KPI'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="KPI-SALES-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nama *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Target Penjualan"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Deskripsi</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Kategori *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {Object.entries(categories).map(([key, val]: [string, any]) => (
                  <option key={key} value={key}>{val.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="%">Persentase (%)</option>
                <option value="Rp">Rupiah (Rp)</option>
                <option value="unit">Unit</option>
                <option value="transaksi">Transaksi</option>
                <option value="kunjungan">Kunjungan</option>
                <option value="leads">Leads</option>
                <option value="pelanggan">Pelanggan</option>
                <option value="menit">Menit</option>
                <option value="hari">Hari</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Default Weight</label>
              <input
                type="number"
                value={formData.defaultWeight}
                onChange={(e) => setFormData({ ...formData, defaultWeight: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
                min={0}
                max={100}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipe Formula</label>
              <select
                value={formData.formulaType}
                onChange={(e) => setFormData({ ...formData, formulaType: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="simple">Simple (actual/target)</option>
                <option value="weighted">Weighted Average</option>
                <option value="cumulative">Cumulative</option>
                <option value="average">Average</option>
                <option value="ratio">Ratio</option>
                <option value="product_target">Product Target</option>
                <option value="group_target">Group Target</option>
                <option value="growth">Growth</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Frekuensi Pengukuran</label>
              <select
                value={formData.measurementFrequency}
                onChange={(e) => setFormData({ ...formData, measurementFrequency: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="daily">Harian</option>
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
                <option value="quarterly">Kuartalan</option>
                <option value="yearly">Tahunan</option>
              </select>
            </div>
          </div>

          {(formData.formulaType === 'custom' || formData.formulaType === 'product_target' || formData.formulaType === 'group_target' || formData.formulaType === 'growth') && (
            <div>
              <label className="block text-sm font-medium mb-1">Formula Custom</label>
              <input
                type="text"
                value={formData.formula}
                onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                placeholder="(actual / target) * 100"
              />
              <p className="text-xs text-gray-500 mt-1">Gunakan variabel: actual, target, atau parameter custom</p>
            </div>
          )}

          {/* Parameters */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Parameters</h4>
            <div className="space-y-2 mb-4">
              {formData.parameters?.map((param, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                  <span className="flex-1 text-sm">{param.label} ({param.name})</span>
                  <span className="text-xs text-gray-500">{param.type}</span>
                  <button 
                    onClick={() => setFormData({
                      ...formData,
                      parameters: formData.parameters?.filter((_, i) => i !== index)
                    })}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newParam.name}
                onChange={(e) => setNewParam({ ...newParam, name: e.target.value })}
                className="flex-1 px-2 py-1 border rounded text-sm"
                placeholder="name"
              />
              <input
                type="text"
                value={newParam.label}
                onChange={(e) => setNewParam({ ...newParam, label: e.target.value })}
                className="flex-1 px-2 py-1 border rounded text-sm"
                placeholder="Label"
              />
              <select
                value={newParam.type}
                onChange={(e) => setNewParam({ ...newParam, type: e.target.value })}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="number">Number</option>
                <option value="percentage">Percentage</option>
                <option value="currency">Currency</option>
              </select>
              <button onClick={addParameter} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-6 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Batal</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Save className="w-4 h-4 inline mr-2" />
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
