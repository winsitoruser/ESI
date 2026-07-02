import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  Headphones, Plus, RefreshCw, Loader2, Trash2, Filter, BarChart3, Inbox,
  Clock, Link2, Heart, MessageCircle, ShoppingCart, Package, ExternalLink,
  CheckCircle, AlertTriangle, X, User, ChevronRight, MapPin, Navigation, Briefcase,
} from 'lucide-react';
import { useTranslation, formatDateValue, Language } from '@/lib/i18n';
import { rowsOr, MOCK_SFA_CRM_TICKETS } from '@/lib/hq/mock-data';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts';

const apiHd = async (action: string, method = 'GET', body?: any) => {
  const o: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) o.body = JSON.stringify(body);
  return (await fetch(`/api/hq/helpdesk?action=${action}`, o)).json();
};

type HdTab = 'overview' | 'queue' | 'sla' | 'satisfaction' | 'integrasi';

const TICKET_STATUSES = ['open', 'in_progress', 'waiting', 'resolved', 'closed', 'reopened'] as const;
const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
const SEVERITIES = ['critical', 'major', 'minor'] as const;
const CRM_TASK_STATUSES = ['open', 'in_progress', 'completed', 'cancelled', 'deferred'] as const;

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 border border-gray-200 shadow-lg px-3 py-2 rounded-lg text-xs">
      {label && <p className="text-gray-500 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between gap-4"><span>{p.name}</span><span className="font-semibold">{p.value}</span></div>
      ))}
    </div>
  );
};

function userLabel(users: { id: number; name?: string; email?: string }[], uid: number | null | undefined) {
  if (uid == null) return '';
  const u = users.find(x => x.id === uid);
  return u ? (u.name || u.email || `#${uid}`) : `#${uid}`;
}

export default function HelpdeskConsole() {
  const router = useRouter();
  const { data: session } = useSession();
  const { t, language } = useTranslation();
  const fmtDate = useMemo(() => (d: string) => (d ? formatDateValue(d, language as Language, 'short') : '—'), [language]);
  const userRole = (session?.user as { role?: string })?.role || 'staff';
  const canDelete = ['super_admin', 'owner', 'admin', 'manager', 'hq_admin'].includes(userRole);

  const tab = useMemo((): HdTab => {
    const q = router.query.tab;
    const s = typeof q === 'string' ? q : Array.isArray(q) ? q[0] : '';
    if (s === 'queue' || s === 'sla' || s === 'satisfaction' || s === 'integrasi') return s as HdTab;
    return 'overview';
  }, [router.query.tab]);

  const setTab = (next: HdTab) => {
    router.replace({ pathname: '/hq/helpdesk', query: { ...router.query, tab: next === 'overview' ? undefined : next } }, undefined, { shallow: true });
  };

  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const initialFetch = useRef(true);
  const [tickets, setTickets] = useState<any[]>(MOCK_SFA_CRM_TICKETS);
  const [serviceAnalytics, setServiceAnalytics] = useState<any>(null);
  const [satisfaction, setSatisfaction] = useState<any>(null);
  const [slaPolicies, setSlaPolicies] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({ priority: 'medium', severity: 'minor', category: 'request', source_channel: 'email', customer_id: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [qStatus, setQStatus] = useState<string>('');
  const [qSearch, setQSearch] = useState('');
  const [qPriority, setQPriority] = useState('');
  const [qCategory, setQCategory] = useState('');

  const [staffUsers, setStaffUsers] = useState<{ id: number; name?: string; email?: string }[]>([]);
  const [crmCustomers, setCrmCustomers] = useState<any[]>([]);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [detailTicket, setDetailTicket] = useState<any>(null);
  const [detailComments, setDetailComments] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [commentInternal, setCommentInternal] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);

  const [detailLinkedTasks, setDetailLinkedTasks] = useState<any[]>([]);
  const [fieldTaskTitle, setFieldTaskTitle] = useState('');
  const [fieldTaskNotes, setFieldTaskNotes] = useState('');
  const [fieldTaskAssign, setFieldTaskAssign] = useState('');
  const [fieldTaskDue, setFieldTaskDue] = useState('');
  const [fieldTaskPriority, setFieldTaskPriority] = useState('medium');
  const [creatingFieldTask, setCreatingFieldTask] = useState(false);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 3200);
  };

  const loadStaffUsers = useCallback(async () => {
    try {
      const r = await fetch('/api/hq/users/manage?action=list&limit=400').then(res => res.json());
      if (r.success && r.data?.users?.length) setStaffUsers(r.data.users);
    } catch { /* noop */ }
  }, []);

  const loadCore = useCallback(async () => {
    setLoading(true);
    if (initialFetch.current) setBooting(true);
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        apiHd('tickets'),
        apiHd('service-analytics'),
        apiHd('satisfaction'),
        apiHd('sla-policies'),
      ]);
      if (r1.success) setTickets(rowsOr(r1.data, MOCK_SFA_CRM_TICKETS));
      if (r2.success) setServiceAnalytics(r2.data);
      if (r3.success) setSatisfaction(r3.data);
      if (r4.success) setSlaPolicies(rowsOr(r4.data, []));
    } catch {
      setTickets(MOCK_SFA_CRM_TICKETS);
    } finally {
      setLoading(false);
      if (initialFetch.current) {
        setBooting(false);
        initialFetch.current = false;
      }
    }
  }, []);

  useEffect(() => { loadCore(); }, [loadCore]);
  useEffect(() => { loadStaffUsers(); }, [loadStaffUsers]);

  useEffect(() => {
    const o = router.query.open;
    if (o === 'ticket') {
      setForm({ priority: 'medium', severity: 'minor', category: 'request', source_channel: 'email', customer_id: '' });
      setModalOpen(true);
      const q = { ...router.query };
      delete q.open;
      router.replace({ pathname: '/hq/helpdesk', query: q }, undefined, { shallow: true });
    }
  }, [router.query.open, router]);

  useEffect(() => {
    if (!modalOpen) return;
    (async () => {
      const r = await apiHd('customers');
      if (r.success) setCrmCustomers(rowsOr(r.data, []));
    })();
  }, [modalOpen]);

  const loadTicketDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const r = await apiHd(`ticket-detail&id=${encodeURIComponent(id)}`);
      if (r.success && r.data?.ticket) {
        setDetailTicket(r.data.ticket);
        setDetailComments(rowsOr(r.data.comments, []));
        setDetailLinkedTasks(rowsOr(r.data.linkedTasks, []));
      } else {
        setDetailTicket(null);
        setDetailComments([]);
        setDetailLinkedTasks([]);
        showToast(r.error || t('sfa.failedLabel'));
      }
    } catch {
      setDetailTicket(null);
      setDetailComments([]);
      setDetailLinkedTasks([]);
    } finally {
      setDetailLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!selectedTicketId) {
      setDetailTicket(null);
      setDetailComments([]);
      setDetailLinkedTasks([]);
      return;
    }
    loadTicketDetail(selectedTicketId);
  }, [selectedTicketId, loadTicketDetail]);

  useEffect(() => {
    if (!detailTicket?.id) return;
    const subj = String(detailTicket.subject || detailTicket.ticket_number || 'Ticket');
    setFieldTaskTitle(`[HD] ${subj.slice(0, 280)}`);
    setFieldTaskNotes('');
    setFieldTaskAssign(detailTicket.assigned_to != null ? String(detailTicket.assigned_to) : '');
    setFieldTaskPriority(['critical', 'high'].includes(detailTicket.priority) ? detailTicket.priority : 'medium');
    setFieldTaskDue('');
  }, [detailTicket?.id]);

  const categoryOptions = useMemo(() => {
    const s = new Set<string>();
    tickets.forEach((tk: any) => { if (tk.category) s.add(tk.category); });
    return Array.from(s).sort();
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    let list = tickets;
    if (qStatus) list = list.filter((tk: any) => tk.status === qStatus);
    if (qPriority) list = list.filter((tk: any) => tk.priority === qPriority);
    if (qCategory) list = list.filter((tk: any) => (tk.category || '') === qCategory);
    if (qSearch.trim()) {
      const s = qSearch.toLowerCase();
      list = list.filter((tk: any) =>
        String(tk.subject || '').toLowerCase().includes(s) ||
        String(tk.customer_name || '').toLowerCase().includes(s) ||
        String(tk.ticket_number || '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [tickets, qStatus, qPriority, qCategory, qSearch]);

  const openCount = useMemo(() => tickets.filter((x: any) => ['open', 'in_progress', 'waiting', 'reopened'].includes(x.status)).length, [tickets]);
  const breachCount = useMemo(() => tickets.filter((x: any) => x.sla_breached).length, [tickets]);

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      customer_id: form.customer_id || null,
    };
    const r = await apiHd('create-ticket', 'POST', payload);
    setSaving(false);
    if (r.success) {
      showToast(t('sfa.ticketCreated'));
      setModalOpen(false);
      setForm({ priority: 'medium', severity: 'minor', category: 'request', source_channel: 'email', customer_id: '' });
      loadCore();
    } else showToast(r.error || t('sfa.failedLabel'));
  };

  const updateTicketStatus = async (id: string, status: string) => {
    const r = await apiHd('update-ticket', 'PUT', { id, status });
    if (r.success) {
      showToast(t('hd.updateOk'));
      loadCore();
      if (selectedTicketId === id) loadTicketDetail(id);
    } else showToast(r.error || t('sfa.failedLabel'));
  };

  const updateTicketField = async (id: string, fields: Record<string, any>) => {
    const r = await apiHd('update-ticket', 'PUT', { id, ...fields });
    if (r.success) {
      showToast(t('hd.updateOk'));
      loadCore();
      if (selectedTicketId === id) loadTicketDetail(id);
    } else showToast(r.error || t('sfa.failedLabel'));
  };

  const deleteTicket = async (id: string) => {
    if (!confirm(t('hd.confirmDeleteTicket'))) return;
    const r = await apiHd(`delete-ticket&id=${encodeURIComponent(id)}`, 'DELETE');
    if (r.success) {
      showToast(t('hd.deleted'));
      if (selectedTicketId === id) setSelectedTicketId(null);
      loadCore();
    } else showToast(r.error || t('sfa.failedLabel'));
  };

  const postComment = async () => {
    if (!selectedTicketId || !commentBody.trim()) return;
    setPostingComment(true);
    const r = await apiHd('create-ticket-comment', 'POST', {
      ticket_id: selectedTicketId,
      body: commentBody.trim(),
      is_public: !commentInternal,
      comment_type: 'reply',
    });
    setPostingComment(false);
    if (r.success) {
      showToast(t('hd.commentPosted'));
      setCommentBody('');
      setCommentInternal(false);
      loadTicketDetail(selectedTicketId);
      loadCore();
    } else showToast(r.error || t('sfa.failedLabel'));
  };

  const saveAssignee = async (userIdStr: string) => {
    if (!selectedTicketId) return;
    setAssignSaving(true);
    const assigned_to = userIdStr === '' ? null : parseInt(userIdStr, 10);
    const r = await apiHd('update-ticket', 'PUT', { id: selectedTicketId, assigned_to });
    setAssignSaving(false);
    if (r.success) {
      showToast(t('hd.assignSaved'));
      loadTicketDetail(selectedTicketId);
      loadCore();
    } else showToast(r.error || t('sfa.failedLabel'));
  };

  const createFieldVisitTask = async () => {
    if (!selectedTicketId || !detailTicket) return;
    if (!fieldTaskTitle.trim()) return;
    setCreatingFieldTask(true);
    const dueIso = fieldTaskDue
      ? new Date(`${fieldTaskDue}T12:00:00`).toISOString()
      : null;
    const r = await apiHd('create-task', 'POST', {
      title: fieldTaskTitle.trim(),
      description: fieldTaskNotes.trim() || detailTicket.description || null,
      task_type: 'field_visit',
      ticket_id: selectedTicketId,
      customer_id: detailTicket.customer_id || null,
      assigned_to: fieldTaskAssign === '' ? null : parseInt(fieldTaskAssign, 10),
      priority: fieldTaskPriority || 'medium',
      status: 'open',
      due_date: dueIso,
      purpose: fieldTaskNotes.trim() || null,
    });
    setCreatingFieldTask(false);
    if (r.success) {
      showToast(t('hd.fieldTaskCreated'));
      loadTicketDetail(selectedTicketId);
      loadCore();
    } else showToast(r.error || t('sfa.failedLabel'));
  };

  const updateLinkedTaskStatus = async (taskId: string, status: string) => {
    const r = await apiHd('update-task', 'PUT', { id: taskId, status });
    if (r.success) {
      showToast(t('hd.updateOk'));
      if (selectedTicketId) loadTicketDetail(selectedTicketId);
      loadCore();
    } else showToast(r.error || t('sfa.failedLabel'));
  };

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400';

  const tabs: { id: HdTab; label: string; icon: any }[] = [
    { id: 'overview', label: t('hd.tabOverview'), icon: BarChart3 },
    { id: 'queue', label: t('hd.tabQueue'), icon: Inbox },
    { id: 'sla', label: t('hd.tabSla'), icon: Clock },
    { id: 'satisfaction', label: t('hd.tabSatisfaction'), icon: CheckCircle },
    { id: 'integrasi', label: t('hd.tabIntegrasi'), icon: Link2 },
  ];

  const prColors: Record<string, string> = {
    critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#22c55e',
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-6 right-6 z-[60]">
          <div className="bg-gray-900 text-white pl-4 pr-5 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> {toast}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/20">
              <Headphones className="w-5 h-5 text-white" />
            </span>
            {t('hd.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">{t('hd.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={loadCore} className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-3.5 py-2 hover:bg-gray-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> {t('sfa.refresh')}
          </button>
          <button
            type="button"
            onClick={() => { setForm({ priority: 'medium', severity: 'minor', category: 'request', source_channel: 'email', customer_id: '' }); setModalOpen(true); }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" /> {t('sfa.createTicket')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm">
        {tabs.map(tb => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === tb.id ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <tb.icon className="w-4 h-4 shrink-0" />
            {tb.label}
          </button>
        ))}
      </div>

      {booting ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p className="text-sm">{t('sfa.loadingData')}</p>
        </div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: t('hd.kpiOpen'), value: openCount, icon: Inbox, tone: 'from-violet-500 to-violet-600' },
                  { label: t('hd.kpiBreached'), value: breachCount, icon: AlertTriangle, tone: 'from-rose-500 to-rose-600' },
                  { label: t('hd.kpiAvgResolve'), value: serviceAnalytics?.avgResolutionHours != null ? `${Number(serviceAnalytics.avgResolutionHours).toFixed(1)}h` : '—', icon: Clock, tone: 'from-sky-500 to-sky-600' },
                  { label: t('hd.kpiCsat'), value: satisfaction?.avgCsat != null ? `${Number(satisfaction.avgCsat).toFixed(1)}/5` : '—', icon: CheckCircle, tone: 'from-emerald-500 to-emerald-600' },
                ].map((k, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${k.tone} flex items-center justify-center mb-2`}>
                      <k.icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-xl font-bold text-gray-900">{k.value}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>

              {serviceAnalytics && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('sfa.ticketStatus')}</h3>
                      {(serviceAnalytics.byStatus || []).length > 0 ? (() => {
                        const tsColors: Record<string, string> = {
                          open: '#ef4444', in_progress: '#3b82f6', waiting: '#f59e0b', resolved: '#10b981', closed: '#6b7280', reopened: '#dc2626',
                        };
                        const data = (serviceAnalytics.byStatus || []).map((d: any) => ({
                          ...d, count: parseInt(d.count, 10), fill: tsColors[d.status] || '#94a3b8',
                        }));
                        return (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-36 h-36">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={28} outerRadius={52} paddingAngle={3} strokeWidth={0}>
                                    {data.map((d: any, i: number) => <Cell key={i} fill={d.fill} />)}
                                  </Pie>
                                  <Tooltip content={<ChartTooltip />} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        );
                      })() : <p className="text-sm text-gray-400 text-center py-6">{t('sfa.noTickets')}</p>}
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm lg:col-span-2">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('sfa.categoryLabel')}</h3>
                      {(serviceAnalytics.byCategory || []).length > 0 ? (
                        <div className="h-44">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={(serviceAnalytics.byCategory || []).map((d: any) => ({ name: d.category, count: parseInt(d.count, 10) }))} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 72 }}>
                              <XAxis type="number" tick={{ fontSize: 10 }} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={68} />
                              <Tooltip content={<ChartTooltip />} />
                              <Bar dataKey="count" name={t('sfa.tickets')} radius={[0, 6, 6, 0]} maxBarSize={18} fill="#8b5cf6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : <p className="text-sm text-gray-400 py-6">{t('sfa.noData')}</p>}
                    </div>
                  </div>

                  {(serviceAnalytics.byPriority || []).length > 0 && (() => {
                    const priorityData = (serviceAnalytics.byPriority || []).map((d: any) => ({
                      name: d.priority,
                      count: parseInt(d.count, 10),
                      fill: prColors[d.priority] || '#94a3b8',
                    }));
                    return (
                      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('hd.chartByPriority')}</h3>
                        <div className="h-44">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={priorityData} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip content={<ChartTooltip />} />
                              <Bar dataKey="count" name={t('sfa.tickets')} radius={[6, 6, 0, 0]} maxBarSize={40}>
                                {priorityData.map((d: any, i: number) => (
                                  <Cell key={i} fill={d.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {tab === 'queue' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <Filter className="w-4 h-4 shrink-0" />
                  <select className={inputCls + ' w-40'} value={qStatus} onChange={e => setQStatus(e.target.value)}>
                    <option value="">{t('hd.allStatus')}</option>
                    {TICKET_STATUSES.map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                  <select className={inputCls + ' w-40'} value={qPriority} onChange={e => setQPriority(e.target.value)}>
                    <option value="">{t('hd.allPriorities')}</option>
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <select className={inputCls + ' min-w-[10rem]'} value={qCategory} onChange={e => setQCategory(e.target.value)}>
                    <option value="">{t('hd.allCategories')}</option>
                    {categoryOptions.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <input className={inputCls + ' max-w-md'} placeholder={t('hd.searchTickets')} value={qSearch} onChange={e => setQSearch(e.target.value)} />
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('hd.colTicket')}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">{t('hd.colCustomer')}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('hd.colPriority')}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">{t('hd.colComments')}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase hidden md:table-cell" title={t('hd.fieldVisitTask')}>{t('hd.colFieldVisits')}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('hd.colStatus')}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">SLA</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">{t('hd.colDate')}</th>
                        <th className="px-2 py-3 text-right text-xs font-semibold text-gray-500 uppercase w-24">{t('hd.openTicket')}</th>
                        {canDelete && <th className="w-10" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredTickets.length === 0 ? (
                        <tr><td colSpan={canDelete ? 10 : 9} className="px-4 py-16 text-center text-gray-400">{t('sfa.noTickets')}</td></tr>
                      ) : filteredTickets.map((tk: any) => (
                        <tr key={tk.id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{tk.subject}</div>
                            <div className="text-xs text-gray-400">{tk.ticket_number} · {tk.category || '—'}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{tk.customer_name || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                              tk.priority === 'critical' || tk.priority === 'high' ? 'bg-rose-50 text-rose-700' : tk.priority === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>{tk.priority}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">{tk.comment_count ?? 0}</td>
                          <td className="px-4 py-3 text-center hidden md:table-cell">
                            {(tk.field_task_count ?? 0) > 0 ? (
                              <span className="inline-flex items-center justify-center gap-0.5 text-emerald-700 text-xs font-semibold" title={t('hd.fieldVisitTask')}>
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                {tk.field_task_count}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const next: Record<string, string> = { open: 'in_progress', in_progress: 'resolved', resolved: 'closed', closed: 'open', waiting: 'in_progress', reopened: 'in_progress' };
                                updateTicketStatus(tk.id, next[tk.status] || 'in_progress');
                              }}
                              className="text-xs font-medium text-violet-700 hover:underline"
                            >
                              {(tk.status || '').replace('_', ' ')}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center hidden md:table-cell">
                            {tk.sla_breached ? <span className="text-xs text-rose-600 font-medium">Breached</span> : <span className="text-xs text-emerald-600">OK</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">{fmtDate(tk.created_at)}</td>
                          <td className="px-2 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedTicketId(tk.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800"
                            >
                              {t('hd.openTicket')} <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          {canDelete && (
                            <td className="px-2 py-3">
                              <button type="button" onClick={() => deleteTicket(tk.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-xs text-gray-400">{t('hd.queueHint')}</p>
            </div>
          )}

          {tab === 'sla' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('hd.slaIntro')}</h3>
                <p className="text-sm text-gray-500 mb-4">{t('hd.slaIntroSub')}</p>
                {serviceAnalytics?.sla && serviceAnalytics.sla.total > 0 && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <div className="flex justify-between text-sm mb-1"><span>{t('hd.slaMetPct')}</span><span className="font-bold text-emerald-700">{Math.round((serviceAnalytics.sla.met / serviceAnalytics.sla.total) * 100)}%</span></div>
                    <div className="w-full h-2 bg-white rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(serviceAnalytics.sla.met / serviceAnalytics.sla.total) * 100}%` }} /></div>
                    <p className="text-xs text-gray-500 mt-2">Met: {serviceAnalytics.sla.met} · Breached: {serviceAnalytics.sla.breached}</p>
                  </div>
                )}
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('hd.policies')}</h4>
                {slaPolicies.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">{t('hd.noPolicies')}</p>
                ) : (
                  <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                    {slaPolicies.map((p: any) => (
                      <li key={p.id} className="px-4 py-3 flex justify-between gap-4 bg-white">
                        <div>
                          <p className="font-medium text-gray-900">{p.name || p.id}</p>
                          <p className="text-xs text-gray-500">{p.category || '—'} · {p.priority || '—'}</p>
                        </div>
                        {p.is_default && <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-md h-fit">Default</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === 'satisfaction' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-100">
                  <p className="text-xs text-amber-800 font-medium uppercase">CSAT</p>
                  <p className="text-2xl font-bold text-gray-900">{satisfaction?.avgCsat != null ? `${Number(satisfaction.avgCsat).toFixed(2)}/5` : '—'}</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-100">
                  <p className="text-xs text-blue-800 font-medium uppercase">NPS</p>
                  <p className="text-2xl font-bold text-gray-900">{satisfaction?.avgNps != null ? Number(satisfaction.avgNps).toFixed(0) : '—'}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium uppercase">{t('hd.responses')}</p>
                  <p className="text-2xl font-bold text-gray-900">{satisfaction?.totalResponses ?? 0}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">{t('hd.satHint')}</p>

              {(satisfaction?.responses || []).length > 0 && (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-4 py-2 bg-gray-50">{t('hd.recentSat')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                          <th className="px-4 py-2">{t('hd.satColCustomer')}</th>
                          <th className="px-4 py-2">{t('hd.satColType')}</th>
                          <th className="px-4 py-2">{t('hd.satColScore')}</th>
                          <th className="px-4 py-2">{t('hd.satColDate')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(satisfaction.responses || []).map((row: any) => (
                          <tr key={row.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2 text-gray-800">{row.customer_name || '—'}</td>
                            <td className="px-4 py-2 text-gray-600 uppercase text-xs">{row.survey_type || '—'}</td>
                            <td className="px-4 py-2 font-medium">{row.score ?? '—'}</td>
                            <td className="px-4 py-2 text-gray-500 text-xs">{fmtDate(row.response_date || row.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'integrasi' && (
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { href: '/hq/sfa', title: t('hd.linkCrm'), desc: t('hd.linkCrmDesc'), icon: Heart, gradient: 'from-pink-500 to-rose-600' },
                { href: '/hq/sfa', title: t('hd.linkFieldForce'), desc: t('hd.linkFieldForceDesc'), icon: Navigation, gradient: 'from-teal-500 to-cyan-600' },
                { href: '/hq/whatsapp', title: 'WhatsApp', desc: t('hd.linkWaDesc'), icon: MessageCircle, gradient: 'from-green-500 to-emerald-600' },
                { href: '/hq/project-management', title: 'Proyek Konservasi', desc: 'Program lapangan & riset satwa liar', icon: Briefcase, gradient: 'from-emerald-500 to-teal-600' },
                { href: '/hq/inventory', title: t('hd.linkInv'), desc: t('hd.linkInvDesc'), icon: Package, gradient: 'from-emerald-500 to-teal-600' },
              ].map(card => (
                <Link
                  key={`${card.href}-${card.title}`}
                  href={card.href}
                  className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-violet-200 transition-all flex gap-4"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shrink-0 shadow-md`}>
                    <card.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{card.title}</h3>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-violet-500 shrink-0" />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{t('sfa.createTicket')}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={submitTicket} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
                <input required className={inputCls} value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('hd.customerOptional')}</label>
                <select className={inputCls} value={form.customer_id || ''} onChange={e => setForm({ ...form, customer_id: e.target.value })}>
                  <option value="">—</option>
                  {crmCustomers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.display_name || c.customer_number || c.id}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('sfa.categoryLabel')}</label>
                  <select className={inputCls} value={form.category || 'request'} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {['billing', 'technical', 'product', 'complaint', 'request', 'feedback'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                  <select className={inputCls} value={form.priority || 'medium'} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    {PRIORITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('hd.severity')}</label>
                  <select className={inputCls} value={form.severity || 'minor'} onChange={e => setForm({ ...form, severity: e.target.value })}>
                    {SEVERITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Channel</label>
                  <select className={inputCls} value={form.source_channel || 'email'} onChange={e => setForm({ ...form, source_channel: e.target.value })}>
                    {['email', 'phone', 'chat', 'whatsapp', 'social'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('hd.description')}</label>
                <textarea className={inputCls + ' resize-none'} rows={4} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 disabled:opacity-50">
                {saving ? '…' : t('hd.submitTicket')}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedTicketId && (
        <>
          <button type="button" className="fixed inset-0 bg-black/40 z-[55]" aria-label="Close" onClick={() => setSelectedTicketId(null)} />
          <aside className="fixed top-0 right-0 h-full w-full max-w-lg bg-white z-[56] shadow-2xl flex flex-col border-l border-gray-100">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <div className="min-w-0">
                <p className="text-xs text-violet-600 font-semibold">{detailTicket?.ticket_number || '—'}</p>
                <h2 className="text-lg font-bold text-gray-900 leading-snug">{t('hd.detailTitle')}</h2>
              </div>
              <button type="button" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" onClick={() => setSelectedTicketId(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm">{t('sfa.loadingData')}</p>
              </div>
            ) : detailTicket ? (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                  <div>
                    <h3 className="font-semibold text-gray-900">{detailTicket.subject}</h3>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      <span className={`rounded-md px-2 py-0.5 font-medium ${
                        detailTicket.priority === 'critical' || detailTicket.priority === 'high' ? 'bg-rose-50 text-rose-700' : detailTicket.priority === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>{detailTicket.priority}</span>
                      {detailTicket.severity && (
                        <span className="rounded-md bg-gray-100 text-gray-700 px-2 py-0.5">{t('hd.severity')}: {detailTicket.severity}</span>
                      )}
                      {detailTicket.sla_breached && (
                        <span className="rounded-md bg-rose-100 text-rose-800 px-2 py-0.5">SLA</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4 shrink-0 text-gray-400" />
                    <span>{detailTicket.customer_name || '—'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t('hd.colStatus')}</label>
                      <select
                        className={inputCls}
                        value={detailTicket.status || 'open'}
                        onChange={e => updateTicketField(detailTicket.id, { status: e.target.value })}
                      >
                        {TICKET_STATUSES.map(s => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t('hd.assignTo')}</label>
                      <select
                        className={inputCls}
                        disabled={assignSaving}
                        value={detailTicket.assigned_to != null ? String(detailTicket.assigned_to) : ''}
                        onChange={e => { void saveAssignee(e.target.value); }}
                      >
                        <option value="">{t('hd.unassigned')}</option>
                        {staffUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.name || u.email || `#${u.id}`}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t('hd.slaTargets')}</p>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="flex justify-between gap-2"><span className="text-gray-500">{t('hd.firstResponseDue')}</span><span className="font-medium text-gray-800">{fmtDate(detailTicket.first_response_due)}</span></div>
                      <div className="flex justify-between gap-2"><span className="text-gray-500">{t('hd.resolutionDue')}</span><span className="font-medium text-gray-800">{fmtDate(detailTicket.resolution_due)}</span></div>
                    </div>
                  </div>

                  {detailTicket.description && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('hd.description')}</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{detailTicket.description}</p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/80 to-white p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{t('hd.fieldCoordTitle')}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t('hd.fieldCoordSub')}</p>
                      </div>
                    </div>

                    {detailLinkedTasks.length > 0 ? (
                      <ul className="space-y-2 max-h-48 overflow-y-auto">
                        {detailLinkedTasks.map((task: any) => (
                          <li key={task.id} className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm">
                            <div className="flex justify-between gap-2 items-start">
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{task.title || task.task_number}</p>
                                <p className="text-[10px] text-gray-400">{task.task_number} · {task.task_type || 'task'}</p>
                                {(task.assigned_user_name || task.assigned_to) && (
                                  <p className="text-xs text-gray-500 mt-1">{userLabel(staffUsers, task.assigned_to) || task.assigned_user_name}</p>
                                )}
                                {task.sfa_visit_id && (
                                  <p className="text-[10px] text-teal-700 mt-1">
                                    {t('hd.visitLinked')}
                                    {task.visit_status && ` · ${String(task.visit_status).replace('_', ' ')}`}
                                    {task.visit_date && ` · ${fmtDate(task.visit_date)}`}
                                  </p>
                                )}
                              </div>
                              <select
                                className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 max-w-[7rem]"
                                value={task.status || 'open'}
                                onChange={e => { void updateLinkedTaskStatus(task.id, e.target.value); }}
                              >
                                {CRM_TASK_STATUSES.map(s => (
                                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                ))}
                              </select>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-400">{t('hd.noFieldTasks')}</p>
                    )}

                    <div className="border-t border-teal-100 pt-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-600">{t('hd.createFieldTask')}</p>
                      <input className={inputCls} value={fieldTaskTitle} onChange={e => setFieldTaskTitle(e.target.value)} />
                      <textarea className={inputCls + ' resize-none'} rows={2} placeholder={t('hd.fieldTaskBriefLabel')} value={fieldTaskNotes} onChange={e => setFieldTaskNotes(e.target.value)} />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">{t('hd.fieldTaskAssignField')}</label>
                          <select className={inputCls + ' text-xs'} value={fieldTaskAssign} onChange={e => setFieldTaskAssign(e.target.value)}>
                            <option value="">{t('hd.unassigned')}</option>
                            {staffUsers.map(u => (
                              <option key={u.id} value={u.id}>{u.name || u.email || `#${u.id}`}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">{t('hd.fieldTaskDue')}</label>
                          <input type="date" className={inputCls + ' text-xs'} value={fieldTaskDue} onChange={e => setFieldTaskDue(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">{t('hd.colPriority')}</label>
                        <select className={inputCls + ' text-xs'} value={fieldTaskPriority} onChange={e => setFieldTaskPriority(e.target.value)}>
                          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <button
                        type="button"
                        disabled={creatingFieldTask || !fieldTaskTitle.trim()}
                        onClick={() => void createFieldVisitTask()}
                        className="w-full py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50"
                      >
                        {creatingFieldTask ? '…' : t('hd.submitFieldTask')}
                      </button>
                      <Link
                        href="/hq/sfa"
                        className="flex items-center justify-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-900 py-1"
                      >
                        {t('hd.openSfaTasks')} <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t('hd.comments')}</p>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {detailComments.length === 0 ? (
                        <p className="text-sm text-gray-400">{t('hd.noComments')}</p>
                      ) : detailComments.map((c: any) => (
                        <div key={c.id} className={`rounded-xl px-3 py-2 text-sm ${c.is_public === false ? 'bg-amber-50 border border-amber-100' : 'bg-violet-50/80 border border-violet-100'}`}>
                          <div className="flex justify-between gap-2 text-[11px] text-gray-500 mb-1">
                            <span>{userLabel(staffUsers, c.created_by)}</span>
                            <span>{fmtDate(c.created_at)}</span>
                          </div>
                          <p className="text-gray-800 whitespace-pre-wrap">{c.body}</p>
                          {c.is_public === false && <p className="text-[10px] text-amber-800 mt-1 font-medium">{t('hd.internalBadge')}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/80 space-y-3">
                  <label className="block text-xs font-medium text-gray-600">{t('hd.addComment')}</label>
                  <textarea
                    className={inputCls + ' resize-none'}
                    rows={3}
                    value={commentBody}
                    onChange={e => setCommentBody(e.target.value)}
                    placeholder="…"
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={commentInternal} onChange={e => setCommentInternal(e.target.checked)} className="rounded border-gray-300 text-violet-600" />
                    {t('hd.internalNote')}
                  </label>
                  <button
                    type="button"
                    disabled={postingComment || !commentBody.trim()}
                    onClick={() => void postComment()}
                    className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 disabled:opacity-50"
                  >
                    {postingComment ? '…' : t('hd.postComment')}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400 px-6">{t('sfa.noTickets')}</div>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
