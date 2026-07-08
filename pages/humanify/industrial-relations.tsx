import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '@/components/humanify/HumanifyLayout';
import { useTranslation } from '@/lib/i18n';
import EmployeePicker, { type PickedEmployee } from '@/components/humanify/EmployeePicker';
import {
  Shield, FileText, CheckSquare, Plus, Edit, Trash2, Search, X,
  Scale, AlertCircle, ClipboardCheck, ArrowRight, ExternalLink, Ban,
  TrendingUp, Activity, MapPin, Users,
} from 'lucide-react';

interface Regulation {
  id: string; title: string; regulation_number: string; category: string;
  description: string; content: string; effective_date: string; expiry_date: string;
  status: string; version: number; tags: string[];
}
interface IrIncident {
  id: string; case_number: string; title: string; category: string;
  priority: string; status: string; reported_date: string; description: string;
  involved_employees: any[]; mitigation_plan: string; handling_notes: string;
  incident_location: string; resolution: string;
}
interface Checklist {
  id: string; name: string; category: string; description: string; items: any[];
  status: string; completion_percent: number; due_date: string; period: string;
}

type TabKey = 'governance' | 'compliance' | 'incidents';

const MOCK_OVERVIEW = {
  activeRegulations: 3, openIncidents: 2, investigatingIncidents: 1,
  pendingChecklists: 2, complianceScore: 58,
};

const CATEGORY_LABELS: Record<string, string> = {
  company_rule: 'Peraturan Perusahaan', ethics: 'Kode Etik', safety: 'K3 & Keselamatan',
  compliance: 'Kepatuhan Hukum', labor_law: 'UU Ketenagakerjaan',
};
const INCIDENT_CATEGORY_LABELS: Record<string, string> = {
  workplace_safety: 'K3 / Keselamatan Kerja', labor_dispute: 'Perselisihan Industrial',
  grievance: 'Pengaduan Karyawan', operational: 'Insiden Operasional',
  environmental: 'Lingkungan Kerja', policy_breach: 'Pelanggaran Kebijakan',
  external: 'Insiden Eksternal',
};
const INCIDENT_STATUS_LABELS: Record<string, string> = {
  reported: 'Dilaporkan', triage: 'Triase', open: 'Terbuka',
  investigating: 'Investigasi', mitigating: 'Mitigasi', resolved: 'Selesai', closed: 'Ditutup',
};

export default function IndustrialRelationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('governance');
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [incidents, setIncidents] = useState<IrIncident[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [overview, setOverview] = useState(MOCK_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'regulation' | 'incident'>('regulation');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [search, setSearch] = useState('');
  const [incidentFilter, setIncidentFilter] = useState<'all' | 'active' | 'mitigating'>('all');

  const [regForm, setRegForm] = useState({
    title: '', regulationNumber: '', category: 'company_rule',
    description: '', content: '', effectiveDate: '', status: 'draft',
  });
  const [incidentForm, setIncidentForm] = useState({
    title: '', category: 'operational', priority: 'medium', status: 'reported',
    reportedDate: new Date().toISOString().split('T')[0], description: '',
    incidentLocation: '', mitigationPlan: '', handlingNotes: '',
  });
  const [involvedEmployee, setInvolvedEmployee] = useState<PickedEmployee | null>(null);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const api = useCallback(async (action: string, method = 'GET', body?: any, extra = '') => {
    const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`/api/humanify/industrial-relations?action=${action}${extra}`, opts);
    return r.json();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, regs, cs, cls] = await Promise.all([
        api('overview'), api('regulations'), api('cases'), api('checklists'),
      ]);
      setOverview(ov.data || MOCK_OVERVIEW);
      setRegulations(regs.data || []);
      setIncidents(cs.data || []);
      setChecklists(cls.data || []);
    } catch {
      setOverview(MOCK_OVERVIEW);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = (type: 'regulation' | 'incident') => {
    setEditingItem(null);
    setModalType(type);
    if (type === 'regulation') {
      setRegForm({ title: '', regulationNumber: '', category: 'company_rule', description: '', content: '', effectiveDate: '', status: 'draft' });
    } else {
      setIncidentForm({
        title: '', category: 'operational', priority: 'medium', status: 'reported',
        reportedDate: new Date().toISOString().split('T')[0], description: '',
        incidentLocation: '', mitigationPlan: '', handlingNotes: '',
      });
      setInvolvedEmployee(null);
    }
    setShowModal(true);
  };

  const openEditIncident = (inc: IrIncident) => {
    setEditingItem(inc);
    setModalType('incident');
    setIncidentForm({
      title: inc.title, category: inc.category, priority: inc.priority, status: inc.status,
      reportedDate: inc.reported_date?.split('T')[0] || '', description: inc.description || '',
      incidentLocation: inc.incident_location || '', mitigationPlan: inc.mitigation_plan || '',
      handlingNotes: inc.handling_notes || '',
    });
    setInvolvedEmployee(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (modalType === 'regulation') {
        if (editingItem) await api('regulation', 'PUT', regForm, `&id=${editingItem.id}`);
        else await api('regulation', 'POST', regForm);
      } else {
        const payload = {
          ...incidentForm,
          involvedEmployees: involvedEmployee
            ? [{ id: involvedEmployee.id, name: involvedEmployee.name, employee_id: involvedEmployee.employee_id }]
            : editingItem?.involved_employees || [],
          primaryEmployeeId: involvedEmployee?.id || undefined,
        };
        if (editingItem) await api('case', 'PUT', payload, `&id=${editingItem.id}`);
        else await api('case', 'POST', payload);
      }
      showToast(editingItem ? 'Berhasil diperbarui' : 'Berhasil dibuat');
      setShowModal(false);
      loadData();
    } catch {
      showToast('Gagal menyimpan', 'error');
    }
  };

  const handleDelete = async (action: string, id: string) => {
    if (!confirm('Hapus data ini?')) return;
    await api(action, 'DELETE', null, `&id=${id}`);
    showToast('Dihapus');
    loadData();
  };

  const handleChecklistItem = async (checklistId: string, itemIndex: number, status: string) => {
    await api('update-checklist-item', 'POST', { id: checklistId, itemIndex, status });
    showToast('Item checklist diperbarui');
    loadData();
  };

  const statusColor = (s: string) => {
    const m: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-800', draft: 'bg-slate-100 text-slate-700',
      expired: 'bg-red-100 text-red-800', reported: 'bg-blue-100 text-blue-800',
      triage: 'bg-violet-100 text-violet-800', open: 'bg-sky-100 text-sky-800',
      investigating: 'bg-amber-100 text-amber-800', mitigating: 'bg-orange-100 text-orange-800',
      resolved: 'bg-emerald-100 text-emerald-800', closed: 'bg-slate-100 text-slate-600',
      pending: 'bg-amber-100 text-amber-800', in_progress: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-emerald-100 text-emerald-800', overdue: 'bg-red-100 text-red-800',
    };
    return m[s] || 'bg-slate-100 text-slate-700';
  };

  const priorityColor = (p: string) => {
    const m: Record<string, string> = {
      low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700',
    };
    return m[p] || 'bg-slate-100 text-slate-600';
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (incidentFilter === 'active' && ['resolved', 'closed'].includes(inc.status)) return false;
    if (incidentFilter === 'mitigating' && !['mitigating', 'investigating'].includes(inc.status)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [inc.title, inc.case_number, inc.description, inc.incident_location]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  });

  const tabs: { key: TabKey; label: string; icon: typeof Shield; desc: string }[] = [
    { key: 'governance', label: 'Tata Kelola', icon: Scale, desc: 'Peraturan & kebijakan' },
    { key: 'compliance', label: 'Kepatuhan & Audit', icon: ClipboardCheck, desc: 'Checklist & pemantauan' },
    { key: 'incidents', label: 'Insiden & Penanganan', icon: Activity, desc: 'Event, investigasi, mitigasi' },
  ];

  const kpiCards = [
    { label: 'Peraturan Aktif', value: overview.activeRegulations, icon: FileText, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Skor Kepatuhan', value: `${overview.complianceScore || 0}%`, icon: TrendingUp, color: 'from-emerald-500 to-teal-600' },
    { label: 'Insiden Terbuka', value: overview.openIncidents, icon: AlertCircle, color: 'from-amber-500 to-orange-600' },
    { label: 'Dalam Investigasi', value: overview.investigatingIncidents, icon: Shield, color: 'from-violet-500 to-purple-600' },
  ];

  return (
    <HQLayout title={t('hris.industrialRelationsTitle')}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {toast && (
            <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'}`}>
              {toast.msg}
            </div>
          )}

          {/* Hero */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6TTI0IDQyYzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-40" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-indigo-200 mb-3">
                  <Scale className="w-3.5 h-3.5" /> Tata Kelola · Kepatuhan · Hubungan Industrial
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Hubungan Industrial & Kepatuhan</h1>
                <p className="text-slate-300 mt-2 text-sm md:text-base leading-relaxed">
                  Pusat manajemen kebijakan perusahaan, pemantauan kepatuhan hukum, penanganan insiden operasional,
                  investigasi event, dan rencana mitigasi risiko ketenagakerjaan.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => router.push('/humanify/disciplinary-letters')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:bg-indigo-50 transition-colors shadow-lg"
                >
                  <Ban className="w-4 h-4 text-orange-600" />
                  Surat Disiplin (SP & PHK)
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <p className="text-[11px] text-slate-400 text-center sm:text-right">
                  SP, teguran, kasus disiplin karyawan & PHK dikelola di modul terpisah
                </p>
              </div>
            </div>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((k) => (
              <div key={k.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${k.color} text-white mb-3`}>
                  <k.icon className="w-4 h-4" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{k.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100 overflow-x-auto">
              {tabs.map((tb) => (
                <button
                  key={tb.key}
                  type="button"
                  onClick={() => setTab(tb.key)}
                  className={`flex-1 min-w-[140px] px-4 py-4 text-left transition-colors border-b-2 ${
                    tab === tb.key ? 'border-indigo-600 bg-indigo-50/50' : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <tb.icon className={`w-4 h-4 ${tab === tb.key ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className={`text-sm font-semibold ${tab === tb.key ? 'text-indigo-900' : 'text-slate-700'}`}>{tb.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">{tb.desc}</p>
                </button>
              ))}
            </div>

            <div className="p-5 md:p-6">
              {loading && <div className="text-center py-16 text-slate-400">Memuat data...</div>}

              {/* GOVERNANCE */}
              {!loading && tab === 'governance' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari peraturan..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100" />
                    </div>
                    <button type="button" onClick={() => openAdd('regulation')} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
                      <Plus className="w-4 h-4" /> Tambah Peraturan
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {regulations.filter((r) => !search || r.title.toLowerCase().includes(search.toLowerCase())).map((reg) => (
                      <div key={reg.id} className="group rounded-xl border border-slate-100 p-4 hover:border-indigo-200 hover:shadow-sm transition-all bg-gradient-to-r from-white to-slate-50/50">
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">{reg.regulation_number || '—'}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(reg.status)}`}>{reg.status}</span>
                              <span className="text-xs text-slate-500">{CATEGORY_LABELS[reg.category] || reg.category}</span>
                            </div>
                            <h3 className="font-semibold text-slate-900">{reg.title}</h3>
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{reg.description}</p>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                              {reg.effective_date && <span>Berlaku: {new Date(reg.effective_date).toLocaleDateString('id-ID')}</span>}
                              <span>Versi {reg.version || 1}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-80 group-hover:opacity-100">
                            <button type="button" onClick={() => { setEditingItem(reg); setRegForm({ title: reg.title, regulationNumber: reg.regulation_number, category: reg.category, description: reg.description || '', content: reg.content || '', effectiveDate: reg.effective_date || '', status: reg.status }); setModalType('regulation'); setShowModal(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                            <button type="button" onClick={() => handleDelete('regulation', reg.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {regulations.length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>Belum ada peraturan perusahaan</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COMPLIANCE */}
              {!loading && tab === 'compliance' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">Pemantauan kepatuhan regulasi, audit internal, dan checklist berkala.</p>
                  {checklists.map((cl) => (
                    <div key={cl.id} className="rounded-xl border border-slate-100 p-5 bg-white">
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(cl.status)}`}>{cl.status}</span>
                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{cl.category}</span>
                            <span className="text-xs text-slate-400">{cl.period}</span>
                          </div>
                          <h3 className="font-semibold text-slate-900">{cl.name}</h3>
                          <p className="text-sm text-slate-500">{cl.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-3xl font-bold text-indigo-600">{Number(cl.completion_percent || 0).toFixed(0)}%</p>
                          {cl.due_date && <p className="text-xs text-slate-400 mt-1">Deadline: {new Date(cl.due_date).toLocaleDateString('id-ID')}</p>}
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                        <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all" style={{ width: `${cl.completion_percent || 0}%` }} />
                      </div>
                      <div className="space-y-2">
                        {(cl.items || []).map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 text-sm">
                            <button type="button" onClick={() => handleChecklistItem(cl.id, idx, item.status === 'completed' ? 'pending' : 'completed')} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${item.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-400'}`}>
                              {item.status === 'completed' && '✓'}
                            </button>
                            <span className={item.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}>{item.item || item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {checklists.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>Belum ada checklist kepatuhan</p>
                    </div>
                  )}
                </div>
              )}

              {/* INCIDENTS */}
              {!loading && tab === 'incidents' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
                    <strong>Catatan:</strong> Insiden di sini mencakup event operasional, K3, pengaduan, dan mitigasi risiko IR.
                    Untuk <strong>surat peringatan, kasus disiplin karyawan, dan PHK</strong> gunakan modul{' '}
                    <button type="button" onClick={() => router.push('/humanify/disciplinary-letters')} className="font-semibold text-indigo-700 hover:underline">
                      Surat Disiplin & SOP →
                    </button>
                  </div>
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs">
                      {([['all', 'Semua'], ['active', 'Aktif'], ['mitigating', 'Investigasi / Mitigasi']] as const).map(([key, label]) => (
                        <button key={key} type="button" onClick={() => setIncidentFilter(key)} className={`px-3 py-2 font-medium ${incidentFilter === key ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{label}</button>
                      ))}
                    </div>
                    <button type="button" onClick={() => openAdd('incident')} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900">
                      <Plus className="w-4 h-4" /> Laporkan Insiden
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {filteredIncidents.map((inc) => (
                      <div key={inc.id} className="rounded-xl border border-slate-100 p-5 hover:shadow-md transition-shadow bg-white">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <span className="text-[11px] font-mono text-slate-400">{inc.case_number}</span>
                            <h3 className="font-semibold text-slate-900 mt-0.5">{inc.title}</h3>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor(inc.priority)}`}>{inc.priority}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(inc.status)}`}>{INCIDENT_STATUS_LABELS[inc.status] || inc.status}</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2">{inc.description}</p>
                        <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1"><Activity className="w-3 h-3" />{INCIDENT_CATEGORY_LABELS[inc.category] || inc.category}</span>
                          {inc.incident_location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{inc.incident_location}</span>}
                          {inc.reported_date && <span>{new Date(inc.reported_date).toLocaleDateString('id-ID')}</span>}
                        </div>
                        {inc.mitigation_plan && (
                          <div className="mt-3 p-3 rounded-lg bg-orange-50 border border-orange-100 text-xs text-orange-900">
                            <strong>Mitigasi:</strong> {inc.mitigation_plan}
                          </div>
                        )}
                        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                          <button type="button" onClick={() => openEditIncident(inc)} className="text-xs px-3 py-1.5 text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 font-medium">Kelola & Update</button>
                          <button type="button" onClick={() => handleDelete('case', inc.id)} className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg">Hapus</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredIncidents.length === 0 && (
                    <div className="text-center py-12 text-slate-400 col-span-2">
                      <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>Tidak ada insiden{incidentFilter !== 'all' ? ` (filter: ${incidentFilter})` : ''}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="grid sm:grid-cols-2 gap-4">
            <button type="button" onClick={() => router.push('/humanify/disciplinary-letters?view=create&type=SP1')} className="text-left p-4 rounded-xl border border-orange-100 bg-orange-50/50 hover:bg-orange-50 transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-orange-900">Buat Surat Peringatan (SP)</p>
                  <p className="text-xs text-orange-700/70 mt-0.5">Workflow disiplin karyawan dengan SOP & approval</p>
                </div>
                <ArrowRight className="w-4 h-4 text-orange-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
            <button type="button" onClick={() => router.push('/humanify/disciplinary-letters?view=create&type=TERMINATION')} className="text-left p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Ajukan PHK</p>
                  <p className="text-xs text-slate-500 mt-0.5">Pemutusan hubungan kerja & surat resmi</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingItem ? 'Edit' : 'Tambah'} {modalType === 'regulation' ? 'Peraturan' : 'Laporan Insiden'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {modalType === 'regulation' && (
                <>
                  <div><label className="text-sm font-medium text-slate-700">Judul</label><input value={regForm.title} onChange={(e) => setRegForm({ ...regForm, title: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
                  <div><label className="text-sm font-medium text-slate-700">Nomor Peraturan</label><input value={regForm.regulationNumber} onChange={(e) => setRegForm({ ...regForm, regulationNumber: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
                  <div><label className="text-sm font-medium text-slate-700">Kategori</label>
                    <select value={regForm.category} onChange={(e) => setRegForm({ ...regForm, category: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm">
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div><label className="text-sm font-medium text-slate-700">Deskripsi</label><textarea value={regForm.description} onChange={(e) => setRegForm({ ...regForm, description: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" rows={3} /></div>
                  <div><label className="text-sm font-medium text-slate-700">Tanggal Berlaku</label><input type="date" value={regForm.effectiveDate} onChange={(e) => setRegForm({ ...regForm, effectiveDate: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
                  <div><label className="text-sm font-medium text-slate-700">Status</label>
                    <select value={regForm.status} onChange={(e) => setRegForm({ ...regForm, status: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm">
                      <option value="draft">Draf</option><option value="active">Aktif</option><option value="expired">Kedaluwarsa</option>
                    </select>
                  </div>
                </>
              )}
              {modalType === 'incident' && (
                <>
                  <div><label className="text-sm font-medium text-slate-700">Judul Insiden *</label><input value={incidentForm.title} onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" placeholder="Contoh: Insiden K3 di area gudang" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium text-slate-700">Kategori</label>
                      <select value={incidentForm.category} onChange={(e) => setIncidentForm({ ...incidentForm, category: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm">
                        {Object.entries(INCIDENT_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div><label className="text-sm font-medium text-slate-700">Prioritas</label>
                      <select value={incidentForm.priority} onChange={(e) => setIncidentForm({ ...incidentForm, priority: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm">
                        <option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option><option value="critical">Kritis</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium text-slate-700">Status</label>
                      <select value={incidentForm.status} onChange={(e) => setIncidentForm({ ...incidentForm, status: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm">
                        {Object.entries(INCIDENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div><label className="text-sm font-medium text-slate-700">Tanggal Kejadian</label><input type="date" value={incidentForm.reportedDate} onChange={(e) => setIncidentForm({ ...incidentForm, reportedDate: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
                  </div>
                  <div><label className="text-sm font-medium text-slate-700">Lokasi Kejadian</label>
                    <input value={incidentForm.incidentLocation} onChange={(e) => setIncidentForm({ ...incidentForm, incidentLocation: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" placeholder="Gudang A, Lantai 2, dll." />
                  </div>
                  <EmployeePicker
                    value={involvedEmployee?.id}
                    onChange={setInvolvedEmployee}
                    label="Pihak Terkait / Pelapor (opsional)"
                    placeholder="Cari karyawan dari master data..."
                  />
                  <div><label className="text-sm font-medium text-slate-700">Deskripsi Kejadian *</label><textarea value={incidentForm.description} onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" rows={3} placeholder="Uraikan kronologi, dampak, dan pihak yang terlibat..." /></div>
                  <div><label className="text-sm font-medium text-slate-700">Rencana Mitigasi</label><textarea value={incidentForm.mitigationPlan} onChange={(e) => setIncidentForm({ ...incidentForm, mitigationPlan: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" rows={2} placeholder="Langkah pencegahan dan penanganan risiko..." /></div>
                  <div><label className="text-sm font-medium text-slate-700">Catatan Penanganan</label><textarea value={incidentForm.handlingNotes} onChange={(e) => setIncidentForm({ ...incidentForm, handlingNotes: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" rows={2} placeholder="Tindakan yang sudah dilakukan..." /></div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-700 border rounded-xl hover:bg-slate-50">Batal</button>
              <button type="button" onClick={handleSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </HQLayout>
  );
}
