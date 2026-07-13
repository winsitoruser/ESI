import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import HRStatCard from '@/components/humanify/HRStatCard';
import PerformanceModuleChrome, { EnterpriseTabBar } from '@/components/humanify/PerformanceModuleChrome';
import { useTranslation } from '@/lib/i18n';
import { 
  Star, TrendingUp, TrendingDown, Award, Users, 
  Calendar, Download, Search, Target, Plus, Save,
  Loader2, X, Edit, Trash2, CheckCircle, Send, Eye,
  ChevronRight, FileText, Clock, Grid3X3
} from 'lucide-react';
import NineBoxMatrix from '@/components/humanify/NineBoxMatrix';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { HRIS_DEPARTMENTS, getDepartmentLabel } from '@/lib/hris/master-data';

const USE_MOCK_UI = process.env.NODE_ENV !== 'production';

interface ReviewCategory {
  name: string;
  rating: number;
  weight: number;
  comments: string;
}

interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  branchName: string;
  department: string;
  reviewPeriod: string;
  reviewDate: string;
  reviewer: string;
  overallRating: number;
  categories: ReviewCategory[];
  strengths: string[];
  areasForImprovement: string[];
  goals: string[];
  status: 'draft' | 'submitted' | 'reviewed' | 'acknowledged';
  employeeComments?: string;
  managerComments?: string;
  hrComments?: string;
}

interface PerformanceTemplate {
  id: string;
  name: string;
  categories: { name: string; weight: number }[];
}

const DEFAULT_CATEGORIES: ReviewCategory[] = [
  { name: 'Kualitas Kerja', rating: 0, weight: 25, comments: '' },
  { name: 'Produktivitas', rating: 0, weight: 25, comments: '' },
  { name: 'Inisiatif & Kreativitas', rating: 0, weight: 20, comments: '' },
  { name: 'Kerjasama Tim', rating: 0, weight: 15, comments: '' },
  { name: 'Kedisiplinan', rating: 0, weight: 15, comments: '' },
];

export default function PerformancePage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [templates, setTemplates] = useState<PerformanceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);

  // Create/Edit modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pageTab, setPageTab] = useState<'reviews' | '360' | 'ninebox'>('reviews');
  const [feedback360, setFeedback360] = useState<any[]>([]);
  const [feedbackSummary, setFeedbackSummary] = useState<any>(null);
  const [nineBoxData, setNineBoxData] = useState<any>(null);
  const [nineBoxDataSource, setNineBoxDataSource] = useState<HrisDataSource>(USE_MOCK_UI ? 'demo' : 'empty');
  const [selectedNineBox, setSelectedNineBox] = useState<any>(null);
  const [show360Modal, setShow360Modal] = useState(false);
  const [saving360, setSaving360] = useState(false);
  const [form360, setForm360] = useState({
    reviewId: '', employeeId: '', feedbackType: 'peer',
    competency: 'Komunikasi', rating: 4, comments: '', isAnonymous: false,
  });
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  const [form, setForm] = useState({
    employeeId: '', employeeName: '', position: '', department: '',
    branchName: '', reviewPeriod: 'Q1 2026', reviewType: 'quarterly',
    reviewerName: '',
    categories: [...DEFAULT_CATEGORIES] as ReviewCategory[],
    strengths: [''] as string[],
    areasForImprovement: [''] as string[],
    goals: [''] as string[],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (periodFilter !== 'all') params.set('period', periodFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const response = await fetch(`/api/humanify/performance?${params}`);
      if (response.ok) {
        const json = await response.json();
        const payload = json.data || json;
        const apiReviews = payload.reviews || [];
        setReviews(apiReviews.length > 0 ? apiReviews : []);
        if (payload.templates?.length) setTemplates(payload.templates);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error('Failed to fetch performance reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [periodFilter, statusFilter]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/humanify/employees?action=list&limit=500');
      const json = await res.json();
      const data = json.data || json;
      setEmployees(data.employees || data || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetch360 = useCallback(async () => {
    try {
      const res = await fetch('/api/humanify/performance-360');
      const json = await res.json();
      if (json.success) {
        setFeedback360(json.data || []);
        setFeedbackSummary(json.summary);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => { setMounted(true); fetchData(); fetchEmployees(); }, [fetchData, fetchEmployees]);
  useEffect(() => { if (pageTab === '360') fetch360(); }, [pageTab, fetch360]);

  const fetchNineBox = useCallback(async () => {
    try {
      const res = await fetch('/api/humanify/nine-box');
      const json = await res.json();
      setNineBoxData(json.data || null);
      setNineBoxDataSource(json.dataSource || (json.data?.employees?.length ? 'live' : 'empty'));
    } catch {
      setNineBoxData(null);
      setNineBoxDataSource(USE_MOCK_UI ? 'demo' : 'empty');
    }
  }, []);

  useEffect(() => { if (pageTab === 'ninebox') fetchNineBox(); }, [pageTab, fetchNineBox]);

  if (!mounted) {
    return (
      <HQLayout title={t('hris.performanceTitle')} subtitle={t('hris.performanceSubtitle')}>
        <PerformanceModuleChrome active="performance" title={t('hris.performanceTitle')} subtitle="Memuat..." icon={Award} />
      </HQLayout>
    );
  }

  const handleCreate = async () => {
    if (!form.employeeId) {
      alert('Pilih karyawan terlebih dahulu');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: form.employeeId,
          employeeName: form.employeeName,
          position: form.position,
          department: form.department,
          branchName: form.branchName,
          reviewPeriod: form.reviewPeriod,
          reviewType: form.reviewType,
          reviewerName: form.reviewerName,
          categories: form.categories.filter(c => c.name),
          strengths: form.strengths.filter(s => s.trim()),
          areasForImprovement: form.areasForImprovement.filter(s => s.trim()),
          goals: form.goals.filter(g => g.trim()),
        })
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowCreateModal(false);
        fetchData();
      } else {
        alert(json?.error?.message || json?.message || 'Gagal membuat review');
      }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleUpdate = async (updates: any) => {
    if (!selectedReview) return;
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/performance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedReview.id, ...updates })
      });
      if (res.ok) {
        setShowEditModal(false);
        setSelectedReview(null);
        fetchData();
      }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleStatusChange = async (review: PerformanceReview, newStatus: string) => {
    try {
      await fetch('/api/humanify/performance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: review.id, status: newStatus })
      });
      fetchData();
      if (selectedReview?.id === review.id) {
        setSelectedReview({ ...review, status: newStatus as any });
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus review ini?')) return;
    try {
      await fetch(`/api/humanify/performance?id=${id}`, { method: 'DELETE' });
      setSelectedReview(null);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleSubmit360 = async () => {
    if (!form360.reviewId || !form360.employeeId) return;
    setSaving360(true);
    try {
      const res = await fetch('/api/humanify/performance-360', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form360),
      });
      if (res.ok) {
        setShow360Modal(false);
        fetch360();
      }
    } finally { setSaving360(false); }
  };

  const openCreate = () => {
    setForm({
      employeeId: '', employeeName: '', position: '', department: '',
      branchName: '', reviewPeriod: 'Q1 2026', reviewType: 'quarterly',
      reviewerName: '',
      categories: [...DEFAULT_CATEGORIES.map(c => ({ ...c }))],
      strengths: [''], areasForImprovement: [''], goals: [''],
    });
    setShowCreateModal(true);
  };

  const openEdit = (review: PerformanceReview) => {
    setSelectedReview(review);
    setForm({
      employeeId: review.employeeId, employeeName: review.employeeName,
      position: review.position, department: review.department,
      branchName: review.branchName, reviewPeriod: review.reviewPeriod,
      reviewType: 'quarterly', reviewerName: review.reviewer,
      categories: review.categories.length > 0 ? review.categories.map(c => ({ ...c })) : [...DEFAULT_CATEGORIES.map(c => ({ ...c }))],
      strengths: review.strengths.length > 0 ? [...review.strengths, ''] : [''],
      areasForImprovement: review.areasForImprovement.length > 0 ? [...review.areasForImprovement, ''] : [''],
      goals: review.goals.length > 0 ? [...review.goals, ''] : [''],
    });
    setShowEditModal(true);
  };

  const handleEmployeeSelect = (empId: string) => {
    const emp = employees.find((e: any) => String(e.id) === empId);
    if (emp) {
      setForm(f => ({
        ...f, employeeId: String(emp.id), employeeName: emp.full_name || emp.name || '',
        position: emp.position || '', department: emp.department || '',
        branchName: emp.branch_name || emp.branchName || ''
      }));
    }
  };

  // Filters
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length : 0;
  const excellentPerformers = reviews.filter(r => r.overallRating >= 4.5).length;
  const needsImprovement = reviews.filter(r => r.overallRating < 3.5).length;

  const filteredReviews = reviews.filter(r => {
    const matchSearch = !searchQuery ||
      (r.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.position || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600 bg-green-100';
    if (rating >= 3.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
      acknowledged: { label: 'Dikonfirmasi', cls: 'bg-green-100 text-green-700', Icon: CheckCircle },
      reviewed: { label: 'Direview', cls: 'bg-blue-100 text-blue-700', Icon: Eye },
      submitted: { label: 'Diajukan', cls: 'bg-yellow-100 text-yellow-700', Icon: Send },
      draft: { label: 'Draf', cls: 'bg-gray-100 text-gray-700', Icon: FileText },
    };
    const c = cfg[status] || cfg.draft;
    return <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${c.cls}`}><c.Icon className="w-3 h-3" />{c.label}</span>;
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
      ))}
      <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
    </div>
  );

  // Editable star rating component
  const EditableStars = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)}
          className={`w-6 h-6 ${star <= value ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-500`}>
          <Star className={`w-full h-full ${star <= value ? 'fill-yellow-400' : ''}`} />
        </button>
      ))}
      <span className="ml-2 text-sm font-medium">{value}/5</span>
    </div>
  );

  // Form modal content (shared between create/edit)
  const renderFormModal = (isEdit: boolean) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">{isEdit ? 'Edit Evaluasi Kinerja' : 'Buat Evaluasi Baru'}</h2>
          <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
            className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-5">
          {/* Employee */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Karyawan *</label>
              {employees.length > 0 ? (
                <select value={form.employeeId}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" disabled={isEdit}>
                  <option value="">Pilih Karyawan</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {(emp.employee_id || emp.employeeId || emp.id)} — {emp.full_name || emp.name} — {emp.position || 'N/A'} — {getDepartmentLabel(emp.department)}
                    </option>
                  ))}
                </select>
              ) : (
                <input type="text" value={form.employeeName}
                  onChange={(e) => setForm(f => ({ ...f, employeeName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Nama karyawan" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Periode Evaluasi</label>
              <select value={form.reviewPeriod}
                onChange={(e) => setForm(f => ({ ...f, reviewPeriod: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="Q1 2026">Q1 2026</option>
                <option value="Q2 2026">Q2 2026</option>
                <option value="Q3 2026">Q3 2026</option>
                <option value="Q4 2025">Q4 2025</option>
                <option value="Annual 2025">Annual 2025</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Posisi</label>
              <input type="text" value={form.position}
                onChange={(e) => setForm(f => ({ ...f, position: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departemen</label>
              <select value={form.department}
                onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Pilih departemen</option>
                {HRIS_DEPARTMENTS.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cabang / Lokasi</label>
              <input type="text" value={form.branchName}
                onChange={(e) => setForm(f => ({ ...f, branchName: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Penilai</label>
              <input type="text" value={form.reviewerName}
                onChange={(e) => setForm(f => ({ ...f, reviewerName: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Nama penilai" />
            </div>
          </div>

          {/* Categories */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Kategori Penilaian</label>
              <button type="button" onClick={() => setForm(f => ({
                ...f, categories: [...f.categories, { name: '', rating: 0, weight: 10, comments: '' }]
              }))} className="text-xs text-blue-600 hover:text-blue-700">+ Tambah</button>
            </div>
            <div className="space-y-3">
              {form.categories.map((cat, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <input type="text" value={cat.name} placeholder="Nama kategori"
                      onChange={(e) => { const c = [...form.categories]; c[idx].name = e.target.value; setForm(f => ({ ...f, categories: c })); }}
                      className="flex-1 px-2 py-1.5 border rounded text-sm" />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Bobot:</span>
                      <input type="number" value={cat.weight} min={0} max={100}
                        onChange={(e) => { const c = [...form.categories]; c[idx].weight = parseInt(e.target.value) || 0; setForm(f => ({ ...f, categories: c })); }}
                        className="w-14 px-2 py-1.5 border rounded text-sm text-center" />
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                    {form.categories.length > 1 && (
                      <button onClick={() => setForm(f => ({ ...f, categories: f.categories.filter((_, i) => i !== idx) }))}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <EditableStars value={cat.rating} onChange={(v) => {
                      const c = [...form.categories]; c[idx].rating = v; setForm(f => ({ ...f, categories: c }));
                    }} />
                  </div>
                  <input type="text" value={cat.comments} placeholder="Komentar..."
                    onChange={(e) => { const c = [...form.categories]; c[idx].comments = e.target.value; setForm(f => ({ ...f, categories: c })); }}
                    className="w-full px-2 py-1.5 border rounded text-sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kekuatan</label>
            {form.strengths.map((s, idx) => (
              <div key={idx} className="flex gap-2 mb-1">
                <input type="text" value={s} placeholder="Kekuatan..."
                  onChange={(e) => { const arr = [...form.strengths]; arr[idx] = e.target.value; setForm(f => ({ ...f, strengths: arr })); }}
                  className="flex-1 px-2 py-1.5 border rounded text-sm" />
                {idx === form.strengths.length - 1 && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, strengths: [...f.strengths, ''] }))}
                    className="text-xs text-blue-600">+</button>
                )}
              </div>
            ))}
          </div>

          {/* Areas for improvement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Area Perbaikan</label>
            {form.areasForImprovement.map((s, idx) => (
              <div key={idx} className="flex gap-2 mb-1">
                <input type="text" value={s} placeholder="Area perbaikan..."
                  onChange={(e) => { const arr = [...form.areasForImprovement]; arr[idx] = e.target.value; setForm(f => ({ ...f, areasForImprovement: arr })); }}
                  className="flex-1 px-2 py-1.5 border rounded text-sm" />
                {idx === form.areasForImprovement.length - 1 && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, areasForImprovement: [...f.areasForImprovement, ''] }))}
                    className="text-xs text-blue-600">+</button>
                )}
              </div>
            ))}
          </div>

          {/* Goals */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tujuan & Sasaran</label>
            {form.goals.map((g, idx) => (
              <div key={idx} className="flex gap-2 mb-1">
                <input type="text" value={g} placeholder="Tujuan..."
                  onChange={(e) => { const arr = [...form.goals]; arr[idx] = e.target.value; setForm(f => ({ ...f, goals: arr })); }}
                  className="flex-1 px-2 py-1.5 border rounded text-sm" />
                {idx === form.goals.length - 1 && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, goals: [...f.goals, ''] }))}
                    className="text-xs text-blue-600">+</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">Batal</button>
          <button onClick={isEdit ? () => handleUpdate({
            categories: form.categories.filter(c => c.name),
            strengths: form.strengths.filter(s => s.trim()),
            areasForImprovement: form.areasForImprovement.filter(s => s.trim()),
            goals: form.goals.filter(g => g.trim()),
          }) : handleCreate}
            disabled={saving || !form.employeeName}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <HQLayout title={t('hris.performanceTitle')} subtitle={t('hris.performanceSubtitle')}>
      <div className="space-y-6">
        <PerformanceModuleChrome
          active="performance"
          title={t('hris.performanceTitle')}
          subtitle="Evaluasi kinerja, feedback 360°, dan nine-box matrix untuk keputusan talent management"
          icon={Award}
          gradient="indigo"
          actions={
            <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
              <Plus className="h-4 w-4" /> Buat Evaluasi
            </button>
          }
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <HRStatCard label="Total Evaluasi" value={reviews.length} icon={Users} gradient="from-blue-500 to-indigo-600" />
          <HRStatCard label="Rata-rata Rating" value={avgRating.toFixed(1)} sub="skala 1–5" icon={Star} gradient="from-amber-500 to-orange-600" />
          <HRStatCard label="Kinerja Sangat Baik" value={excellentPerformers} sub="rating ≥ 4.5" icon={Award} gradient="from-emerald-500 to-teal-600" />
          <HRStatCard label="Perlu Peningkatan" value={needsImprovement} sub="rating < 3.5" icon={TrendingDown} gradient="from-rose-500 to-red-600" />
        </div>

        {/* Toolbar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <EnterpriseTabBar
            tabs={[
              { key: 'reviews' as const, label: 'Evaluasi Kinerja', icon: FileText, count: reviews.length },
              { key: '360' as const, label: '360° Feedback', icon: Star, count: feedback360.length },
              { key: 'ninebox' as const, label: '9-Box Matrix', icon: Grid3X3 },
            ]}
            active={pageTab}
            onChange={setPageTab}
          />
          {pageTab === 'reviews' && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button onClick={openCreate}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                <Plus className="w-4 h-4" /> Buat Evaluasi Baru
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Cari karyawan..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border rounded-lg text-sm w-48" />
              </div>
              <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm">
                <option value="all">Semua Periode</option>
                <option value="Q1 2026">Q1 2026</option>
                <option value="Q4 2025">Q4 2025</option>
                <option value="Q3 2025">Q3 2025</option>
                <option value="Annual 2025">Tahunan 2025</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm">
                <option value="all">Semua Status</option>
                <option value="draft">Draf</option>
                <option value="submitted">Diajukan</option>
                <option value="reviewed">Direview</option>
                <option value="acknowledged">Dikonfirmasi</option>
              </select>
              <button onClick={fetchData} disabled={loading}
                className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : 'hidden'}`} />
                {!loading && <Download className="w-4 h-4" />}
                {loading ? '' : 'Segarkan'}
              </button>
            </div>
          </div>
          )}
          {pageTab === '360' && (
            <div className="flex flex-wrap gap-3 justify-between items-center">
              <p className="text-sm text-gray-600">
                Skor 360° rata-rata: <strong className="text-purple-700">{feedbackSummary?.overall360 || '-'}</strong>
                {' '}· {feedbackSummary?.total || 0} feedback
              </p>
              <button onClick={() => {
                const first = reviews[0];
                setForm360(f => ({
                  ...f,
                  reviewId: first?.id || '',
                  employeeId: first?.employeeId || '',
                }));
                setShow360Modal(true);
              }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                <Plus className="w-4 h-4" /> Tambah Feedback 360°
              </button>
            </div>
          )}
        </div>

        {/* 360° Feedback Tab */}
        {pageTab === '360' && (
          <div className="space-y-4">
            {feedbackSummary?.byType?.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {feedbackSummary.byType.map((b: any) => (
                  <div key={b.type} className="bg-white border rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 uppercase">{b.type}</p>
                    <p className="text-2xl font-bold text-purple-700">{b.avgRating}</p>
                    <p className="text-xs text-gray-400">{b.count} responden</p>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-white border rounded-xl divide-y">
              {feedback360.length === 0 ? (
                <div className="p-12 text-center text-gray-400">Belum ada feedback 360°</div>
              ) : feedback360.map((fb: any) => (
                <div key={fb.id} className="p-4 flex items-start gap-4">
                  <div className="p-2 bg-purple-100 rounded-full"><Star className="w-4 h-4 text-purple-600" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{fb.review_subject || fb.employee_name}</span>
                      <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">{fb.feedback_type}</span>
                      <span className="text-xs text-gray-400">{fb.competency}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{fb.comments}</p>
                    <p className="text-xs text-gray-400 mt-1">Oleh: {fb.reviewer_name} · Rating: {fb.rating}/5</p>
                  </div>
                  {renderStars(parseFloat(fb.rating))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 9-Box Matrix Tab */}
        {pageTab === 'ninebox' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <DataSourceBadge source={nineBoxDataSource} />
            </div>
            {nineBoxData ? (
            <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Talent', value: nineBoxData.summary?.total || 0 },
                { label: 'Stars & High Performers', value: nineBoxData.summary?.highPerformers || 0, color: 'text-green-600' },
                { label: 'Develop Pool', value: nineBoxData.summary?.develop || 0, color: 'text-blue-600' },
                { label: 'At Risk', value: nineBoxData.summary?.risk || 0, color: 'text-red-600' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-4 border shadow-sm">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color || ''}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <NineBoxMatrix
                employees={nineBoxData.employees || []}
                onSelect={setSelectedNineBox}
              />
            </div>
            {selectedNineBox && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm">
                <strong>{selectedNineBox.employeeName}</strong> — {selectedNineBox.quadrantLabel}
                <span className="text-gray-500 ml-2">| Kinerja: {selectedNineBox.performanceScore} | Potensial: {selectedNineBox.potentialScore}</span>
              </div>
            )}
            </>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
                <Grid3X3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Belum ada data nine-box. Lengkapi evaluasi kinerja terlebih dahulu.</p>
              </div>
            )}
          </div>
        )}

        {/* Review Cards */}
        {pageTab === 'reviews' && (loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Belum ada evaluasi kinerja</p>
            <button onClick={openCreate} className="mt-3 text-blue-600 hover:text-blue-700 text-sm">+ Buat Evaluasi Baru</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReviews.map((review) => (
              <div key={review.id}
                className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedReview(review)}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{review.employeeName}</h3>
                    <p className="text-sm text-gray-500">{review.position}</p>
                    <p className="text-xs text-gray-400">{review.branchName || review.department}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-lg font-bold ${getRatingColor(review.overallRating)}`}>
                    {review.overallRating.toFixed(1)}
                  </div>
                </div>
                <div className="mb-3">{renderStars(review.overallRating)}</div>
                <div className="space-y-2 mb-4">
                  {review.categories.slice(0, 3).map((cat, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-600">{cat.name}</span>
                      <span className="font-medium">{cat.rating}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />{review.reviewPeriod}
                  </div>
                  {getStatusBadge(review.status)}
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Detail Modal */}
        {selectedReview && !showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-lg font-bold">{selectedReview.employeeName}</h3>
                  <p className="text-sm text-gray-500">{selectedReview.position} - {selectedReview.branchName || selectedReview.department}</p>
                  <p className="text-xs text-gray-400">Evaluasi: {selectedReview.reviewPeriod}</p>
                </div>
                <button onClick={() => setSelectedReview(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-5">
                {/* Rating */}
                <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`text-4xl font-bold ${getRatingColor(selectedReview.overallRating).split(' ')[0]}`}>
                    {selectedReview.overallRating.toFixed(1)}
                  </div>
                  <div>
                    {renderStars(selectedReview.overallRating)}
                    <p className="text-sm text-gray-500 mt-1">Rating Keseluruhan</p>
                  </div>
                  <div className="ml-auto">{getStatusBadge(selectedReview.status)}</div>
                </div>

                {/* Categories */}
                {selectedReview.categories.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Kategori Penilaian</h4>
                    <div className="space-y-3">
                      {selectedReview.categories.map((cat, i) => (
                        <div key={i} className="border rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-sm">{cat.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Bobot: {cat.weight}%</span>
                              <span className={`px-2 py-1 rounded text-sm font-medium ${getRatingColor(cat.rating)}`}>{cat.rating}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${cat.rating >= 4 ? 'bg-green-500' : cat.rating >= 3 ? 'bg-yellow-500' : 'bg-red-500'} rounded-full`}
                              style={{ width: `${(cat.rating / 5) * 100}%` }} />
                          </div>
                          {cat.comments && <p className="text-sm text-gray-500 mt-2">{cat.comments}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths & Improvement */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedReview.strengths.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-semibold text-green-700 mb-2">Kekuatan</h4>
                      <ul className="text-sm space-y-1">
                        {selectedReview.strengths.map((s, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedReview.areasForImprovement.length > 0 && (
                    <div className="bg-orange-50 rounded-lg p-4">
                      <h4 className="font-semibold text-orange-700 mb-2">Area Perbaikan</h4>
                      <ul className="text-sm space-y-1">
                        {selectedReview.areasForImprovement.map((s, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Goals */}
                {selectedReview.goals.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-700 mb-2">Tujuan & Sasaran</h4>
                    <ul className="text-sm space-y-1">
                      {selectedReview.goals.map((g, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-500 flex-shrink-0" />{g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-5 border-t flex justify-between items-center sticky bottom-0 bg-white">
                <div className="flex gap-2">
                  {selectedReview.status === 'draft' && (
                    <button onClick={() => handleStatusChange(selectedReview, 'submitted')}
                      className="flex items-center gap-1 px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600">
                      <Send className="w-4 h-4" /> Ajukan
                    </button>
                  )}
                  {selectedReview.status === 'submitted' && (
                    <button onClick={() => handleStatusChange(selectedReview, 'reviewed')}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                      <Eye className="w-4 h-4" /> Tandai Direview
                    </button>
                  )}
                  {selectedReview.status === 'reviewed' && (
                    <button onClick={() => handleStatusChange(selectedReview, 'acknowledged')}
                      className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
                      <CheckCircle className="w-4 h-4" /> Konfirmasi
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(selectedReview.id)}
                    className="flex items-center gap-1 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50">
                    <Trash2 className="w-4 h-4" /> Hapus
                  </button>
                  <button onClick={() => openEdit(selectedReview)}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    <Edit className="w-4 h-4" /> Edit Evaluasi
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && renderFormModal(false)}

        {/* Edit Modal */}
        {showEditModal && renderFormModal(true)}

        {/* 360° Feedback Modal */}
        {show360Modal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="flex justify-between items-center p-5 border-b">
                <h2 className="text-lg font-semibold">Tambah Feedback 360°</h2>
                <button onClick={() => setShow360Modal(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Evaluasi</label>
                  <select value={form360.reviewId} onChange={e => {
                    const r = reviews.find(rv => rv.id === e.target.value);
                    setForm360(f => ({ ...f, reviewId: e.target.value, employeeId: r?.employeeId || '' }));
                  }} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                    <option value="">Pilih evaluasi...</option>
                    {reviews.map(r => <option key={r.id} value={r.id}>{r.employeeName} — {r.reviewPeriod}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-600">Tipe Feedback</label>
                    <select value={form360.feedbackType} onChange={e => setForm360(f => ({ ...f, feedbackType: e.target.value }))}
                      className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                      <option value="self">Self</option>
                      <option value="manager">Manager</option>
                      <option value="peer">Peer</option>
                      <option value="subordinate">Subordinate</option>
                      <option value="customer">Customer</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Kompetensi</label>
                    <select value={form360.competency} onChange={e => setForm360(f => ({ ...f, competency: e.target.value }))}
                      className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                      <option>Komunikasi</option>
                      <option>Kepemimpinan</option>
                      <option>Kerjasama Tim</option>
                      <option>Problem Solving</option>
                      <option>Integritas</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Rating (1-5)</label>
                  <input type="number" min={1} max={5} value={form360.rating}
                    onChange={e => setForm360(f => ({ ...f, rating: parseInt(e.target.value) || 1 }))}
                    className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Komentar</label>
                  <textarea value={form360.comments} onChange={e => setForm360(f => ({ ...f, comments: e.target.value }))}
                    rows={3} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" placeholder="Masukkan feedback..." />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={form360.isAnonymous}
                    onChange={e => setForm360(f => ({ ...f, isAnonymous: e.target.checked }))} />
                  Anonim
                </label>
              </div>
              <div className="flex justify-end gap-2 p-5 border-t">
                <button onClick={() => setShow360Modal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                <button onClick={handleSubmit360} disabled={saving360 || !form360.reviewId}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
                  {saving360 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Feedback
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}

export { getServerSideProps } from '@/lib/humanify/require-session';
