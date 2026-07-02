import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Save, Building2, Dog, Syringe, Hotel, Truck,
  Mail, Phone, MapPin, User, Calendar, DollarSign,
  Tag, FileText, AlertCircle, CheckCircle, Target,
  TrendingUp, XCircle, Phone as PhoneIcon, MessageSquare,
  Video, Users, Plus, Clock, Star,
} from 'lucide-react';
import Link from 'next/link';

type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
type PartnerType = 'vet' | 'petshop' | 'petclinic' | 'pethotel' | 'pettransport';

interface LeadForm {
  companyName: string;
  partnerType: PartnerType;
  picName: string;
  picPhone: string;
  email: string;
  phone: string;
  city: string;
  source: string;
  stage: LeadStage;
  expectedValue: number;
  probability: number;
  notes: string;
  lostReason: string;
}

interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string;
  relatedTo: string;
  relatedId: string;
  scheduledAt: string;
  completedAt: string | null;
  isCompleted: boolean;
  outcome: string;
  createdAt: string;
}

const PIPELINE_STAGES: { value: LeadStage; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'text-blue-600' },
  { value: 'contacted', label: 'Contacted', color: 'text-sky-600' },
  { value: 'qualified', label: 'Qualified', color: 'text-cyan-600' },
  { value: 'proposal', label: 'Proposal', color: 'text-indigo-600' },
  { value: 'negotiation', label: 'Negotiation', color: 'text-amber-600' },
  { value: 'won', label: 'Won', color: 'text-emerald-600' },
  { value: 'lost', label: 'Lost', color: 'text-red-600' },
];

const PARTNER_TYPES: { value: PartnerType; label: string; icon: any }[] = [
  { value: 'vet', label: 'Veterinarian', icon: Syringe },
  { value: 'petshop', label: 'Pet Shop', icon: Building2 },
  { value: 'petclinic', label: 'Pet Clinic', icon: Dog },
  { value: 'pethotel', label: 'Pet Hotel', icon: Hotel },
  { value: 'pettransport', label: 'Pet Transport', icon: Truck },
];

const SOURCE_OPTIONS = [
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'direct', label: 'Direct' },
  { value: 'event', label: 'Event' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'other', label: 'Other' },
];

const ACTIVITY_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  call: { label: 'Call', icon: PhoneIcon, color: 'bg-green-50 text-green-600' },
  email: { label: 'Email', icon: Mail, color: 'bg-blue-50 text-blue-600' },
  meeting: { label: 'Meeting', icon: Video, color: 'bg-purple-50 text-purple-600' },
  follow_up: { label: 'Follow Up', icon: Clock, color: 'bg-amber-50 text-amber-600' },
  note: { label: 'Note', icon: FileText, color: 'bg-gray-50 text-gray-600' },
  demo: { label: 'Demo', icon: Target, color: 'bg-indigo-50 text-indigo-600' },
  site_visit: { label: 'Site Visit', icon: MapPin, color: 'bg-cyan-50 text-cyan-600' },
};

const INITIAL_FORM: LeadForm = {
  companyName: '',
  partnerType: 'petshop',
  picName: '',
  picPhone: '',
  email: '',
  phone: '',
  city: '',
  source: 'direct',
  stage: 'new',
  expectedValue: 0,
  probability: 10,
  notes: '',
  lostReason: '',
};

function formatCurrency(val: number) {
  return `Rp ${val.toLocaleString('id-ID')}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PROBABILITY_BY_STAGE: Record<string, number> = {
  new: 10, contacted: 20, qualified: 40, proposal: 60, negotiation: 80, won: 100, lost: 0,
};

export default function CrmDetailPage() {
  const router = useRouter();
  const { id, edit } = router.query;
  const isNew = id === 'new';
  const isEdit = isNew || edit === 'true';

  const [form, setForm] = useState<LeadForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showNewActivity, setShowNewActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({ type: 'call', subject: '', description: '', scheduledAt: '' });
  const [savingActivity, setSavingActivity] = useState(false);

  useEffect(() => {
    if (!isNew && id && typeof id === 'string') {
      fetchLead(id);
    }
  }, [id, isNew]);

  const fetchLead = async (leadId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hq/crm/${leadId}`);
      const json = await res.json();
      if (json.success) {
        setLead(json.data);
        if (json.data.activities) {
          setActivities(json.data.activities);
        }
        if (isEdit) {
          const d = json.data;
          setForm({
            companyName: d.companyName || '',
            partnerType: d.partnerType || 'petshop',
            picName: d.picName || '',
            picPhone: d.picPhone || '',
            email: d.email || '',
            phone: d.phone || '',
            city: d.city || '',
            source: d.source || 'direct',
            stage: d.stage || 'new',
            expectedValue: d.expectedValue || 0,
            probability: d.probability || PROBABILITY_BY_STAGE[d.stage] || 10,
            notes: d.notes || '',
            lostReason: d.lostReason || '',
          });
        }
      } else {
        toast.error(json.error || 'Lead not found');
      }
    } catch {
      toast.error('Failed to load lead');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = isNew ? '/api/hq/crm' : `/api/hq/crm/${id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(isNew ? 'Lead created successfully' : 'Lead updated successfully');
        router.push(isNew ? `/hq/crm/${json.data.id}` : `/hq/crm/${id}`);
      } else {
        toast.error(json.error || 'Failed to save lead');
      }
    } catch {
      toast.error('Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.subject) {
      toast.error('Subject is required');
      return;
    }
    setSavingActivity(true);
    try {
      const res = await fetch('/api/hq/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newActivity.type,
          subject: newActivity.subject,
          description: newActivity.description,
          relatedTo: 'lead',
          relatedId: id,
          scheduledAt: newActivity.scheduledAt || new Date().toISOString(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Activity added');
        setActivities(prev => [json.data, ...prev]);
        setNewActivity({ type: 'call', subject: '', description: '', scheduledAt: '' });
        setShowNewActivity(false);
      } else {
        toast.error(json.error || 'Failed to add activity');
      }
    } catch {
      toast.error('Failed to add activity');
    } finally {
      setSavingActivity(false);
    }
  };

  const handleCompleteActivity = async (activityId: string, isCompleted: boolean) => {
    try {
      const res = await fetch(`/api/hq/activities/${activityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !isCompleted }),
      });
      const json = await res.json();
      if (json.success) {
        setActivities(prev => prev.map(a => a.id === activityId ? { ...a, isCompleted: !isCompleted, completedAt: !isCompleted ? new Date().toISOString() : null } : a));
        toast.success(`Activity ${!isCompleted ? 'completed' : 'reopened'}`);
      }
    } catch {
      toast.error('Failed to update activity');
    }
  };

  const updateField = <K extends keyof LeadForm>(field: K, value: LeadForm[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Auto-update probability when stage changes
    if (field === 'stage') {
      const prob = PROBABILITY_BY_STAGE[value as string];
      if (prob !== undefined) {
        setForm(prev => ({ ...prev, [field]: value, probability: prob }));
      }
    }
  };

  if (loading) {
    return (
      <HQLayout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            Loading lead...
          </div>
        </div>
      </HQLayout>
    );
  }

  // View mode
  if (!isEdit && lead) {
    const stageConfig = PIPELINE_STAGES.find(s => s.value === lead.stage);
    const partnerTypeConfig = PARTNER_TYPES.find(t => t.value === lead.partnerType);
    const TypeIcon = partnerTypeConfig?.icon || Building2;

    return (
      <HQLayout>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          {/* Back & Actions */}
          <div className="flex items-center justify-between">
            <Link href="/hq/crm" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" />
              Back to CRM
            </Link>
            <Link
              href={`/hq/crm/${lead.id}?edit=true`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Edit Lead
            </Link>
          </div>

          {/* Lead Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${
                lead.partnerType === 'vet' ? 'bg-emerald-50 text-emerald-600' :
                lead.partnerType === 'petshop' ? 'bg-blue-50 text-blue-600' :
                lead.partnerType === 'petclinic' ? 'bg-purple-50 text-purple-600' :
                lead.partnerType === 'pethotel' ? 'bg-amber-50 text-amber-600' :
                'bg-rose-50 text-rose-600'
              }`}>
                <TypeIcon className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{lead.companyName}</h1>
                <p className="text-sm text-gray-500">
                  {lead.code} · {partnerTypeConfig?.label || lead.partnerType}
                  {lead.city ? ` · ${lead.city}` : ''}
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${stageConfig?.color.replace('text-', 'bg-').split('-').slice(0,2).join('-')} bg-opacity-10 ${stageConfig?.color}`}>
                  {stageConfig?.label || lead.stage}
                </span>
                {lead.expectedValue > 0 && (
                  <p className="text-lg font-bold text-gray-900 mt-2">{formatCurrency(lead.expectedValue)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Stage Progress Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-1">
              {PIPELINE_STAGES.filter(s => s.value !== 'won' && s.value !== 'lost').map((s, i) => {
                const stageIdx = PIPELINE_STAGES.findIndex(ps => ps.value === lead.stage);
                const currentIdx = PIPELINE_STAGES.findIndex(ps => ps.value === s.value);
                const isActive = currentIdx <= stageIdx;
                return (
                  <React.Fragment key={s.value}>
                    <div className={`flex items-center gap-2 ${isActive ? s.color : 'text-gray-300'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isActive ? 'bg-current text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {i + 1}
                      </div>
                      <span className="text-xs font-medium">{s.label}</span>
                    </div>
                    {i < 4 && (
                      <div className={`flex-1 h-0.5 ${isActive ? 'bg-indigo-300' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
              <span>Probability: {lead.probability}%</span>
              <span>Source: {SOURCE_OPTIONS.find(s => s.value === lead.source)?.label || lead.source}</span>
            </div>
          </div>

          {/* Detail Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Contact Information</h3>
              {lead.picName && (
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <div><span className="text-gray-500">PIC:</span> {lead.picName}</div>
                </div>
              )}
              {lead.picPhone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>{lead.picPhone}</div>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>{lead.email}</div>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>{lead.phone}</div>
                </div>
              )}
            </div>

            {/* Business Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Lead Details</h3>
              <div className="flex items-center gap-3 text-sm">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <div><span className="text-gray-500">Expected Value:</span> {formatCurrency(lead.expectedValue)}</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Target className="w-4 h-4 text-gray-400" />
                <div><span className="text-gray-500">Probability:</span> {lead.probability}%</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Tag className="w-4 h-4 text-gray-400" />
                <div><span className="text-gray-500">Source:</span> {SOURCE_OPTIONS.find(s => s.value === lead.source)?.label || lead.source}</div>
              </div>
              {lead.lostReason && (
                <div className="flex items-start gap-3 text-sm">
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                  <div><span className="text-red-500">Lost Reason:</span> {lead.lostReason}</div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {/* Activities Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Activities ({activities.length})</h3>
              <button
                onClick={() => setShowNewActivity(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Activity
              </button>
            </div>

            {/* New Activity Form */}
            {showNewActivity && (
              <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <h4 className="text-sm font-medium text-gray-700">New Activity</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Type</label>
                    <select
                      value={newActivity.type}
                      onChange={e => setNewActivity(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      {Object.entries(ACTIVITY_TYPE_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Schedule (optional)</label>
                    <input
                      type="datetime-local"
                      value={newActivity.scheduledAt}
                      onChange={e => setNewActivity(prev => ({ ...prev, scheduledAt: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Subject *</label>
                  <input
                    type="text"
                    value={newActivity.subject}
                    onChange={e => setNewActivity(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Initial call"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <textarea
                    value={newActivity.description}
                    onChange={e => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                    placeholder="Activity details..."
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowNewActivity(false)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddActivity}
                    disabled={savingActivity || !newActivity.subject}
                    className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {savingActivity ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
            )}

            {activities.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No activities recorded yet</p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity, idx) => {
                  const config = ACTIVITY_TYPE_CONFIG[activity.type] || ACTIVITY_TYPE_CONFIG.note;
                  const Icon = config.icon;
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`p-1.5 rounded-full ${config.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {idx < activities.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                      </div>
                      <div className={`flex-1 pb-3 ${activity.isCompleted ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{activity.subject}</p>
                            <p className="text-xs text-gray-500">{config.label}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{formatDateShort(activity.createdAt)}</span>
                            <button
                              onClick={() => handleCompleteActivity(activity.id, activity.isCompleted)}
                              className={`p-1 rounded-lg transition-colors ${
                                activity.isCompleted
                                  ? 'text-emerald-500 hover:text-emerald-600'
                                  : 'text-gray-300 hover:text-gray-500'
                              }`}
                              title={activity.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {activity.description && (
                          <p className="text-xs text-gray-600 mt-1">{activity.description}</p>
                        )}
                        {activity.outcome && (
                          <p className="text-xs text-gray-500 mt-0.5 italic">Outcome: {activity.outcome}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timeline footer */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Timeline</h3>
            <div className="space-y-2">
              {[
                { label: 'Created', time: lead.createdAt },
                { label: 'Last Updated', time: lead.updatedAt },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {item.label}: {formatDate(item.time)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </HQLayout>
    );
  }

  // Edit/Create form
  return (
    <HQLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <Link
          href={isNew ? '/hq/crm' : `/hq/crm/${id}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          {isNew ? 'Back to CRM' : 'Back to details'}
        </Link>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">
              {isNew ? 'Add New Lead' : 'Edit Lead'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isNew ? 'Create a new lead in the sales pipeline' : 'Update lead information'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Partner Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Partner Type *</label>
              <div className="grid grid-cols-5 gap-3">
                {PARTNER_TYPES.map(t => {
                  const Icon = t.icon;
                  const selected = form.partnerType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => updateField('partnerType', t.value)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        selected ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-xs font-medium">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Company Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={e => updateField('companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Happy Pet Shop Jakarta"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIC Name</label>
                <input
                  type="text"
                  value={form.picName}
                  onChange={e => updateField('picName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Contact person"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIC Phone</label>
                <input
                  type="text"
                  value={form.picPhone}
                  onChange={e => updateField('picPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => updateField('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Business phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => updateField('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={form.source}
                  onChange={e => updateField('source', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {SOURCE_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pipeline Stage */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Pipeline Stage</h3>
              <div className="grid grid-cols-7 gap-2">
                {PIPELINE_STAGES.map(s => {
                  const selected = form.stage === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => updateField('stage', s.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                        selected ? `${s.color} border-current bg-opacity-10` : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                      style={selected ? { backgroundColor: `${s.color.split(' ')[0].replace('text-', '')}` } : {}}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Value & Probability */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Value (Rp)</label>
                <input
                  type="number"
                  value={form.expectedValue || ''}
                  onChange={e => updateField('expectedValue', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min={0}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Probability (%)</label>
                <input
                  type="number"
                  value={form.probability}
                  onChange={e => updateField('probability', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min={0}
                  max={100}
                />
              </div>
            </div>

            {/* Lost Reason (shown when stage is lost) */}
            {form.stage === 'lost' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lost Reason</label>
                <textarea
                  value={form.lostReason}
                  onChange={e => updateField('lostReason', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Why was this lead lost?"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => updateField('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Additional notes..."
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Link
                href={isNew ? '/hq/crm' : `/hq/crm/${id}`}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving || !form.companyName}
                className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isNew ? 'Create Lead' : 'Save Changes'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </HQLayout>
  );
}
