import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Save, Calendar, Clock, DollarSign,
  User, Phone, Mail, Dog, Syringe, Heart,
  AlertCircle, CheckCircle, XCircle, Video,
  Weight, Tag, FileText, Star,
} from 'lucide-react';
import Link from 'next/link';

type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

interface TeleconsultForm {
  partnerId: string;
  petOwnerName: string;
  petOwnerPhone: string;
  petOwnerEmail: string;
  petName: string;
  petType: string;
  petBreed: string;
  petAge: string;
  petWeight: number;
  symptoms: string;
  scheduledAt: string;
  fee: number;
  status: SessionStatus;
  diagnosis: string;
  prescription: string;
  notes: string;
  rating: number;
  duration: number;
}

const STATUS_OPTIONS: { value: SessionStatus; label: string; color: string }[] = [
  { value: 'scheduled', label: 'Scheduled', color: 'text-blue-600' },
  { value: 'in_progress', label: 'In Progress', color: 'text-amber-600' },
  { value: 'completed', label: 'Completed', color: 'text-emerald-600' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-red-600' },
  { value: 'no_show', label: 'No Show', color: 'text-gray-600' },
];

const PET_TYPE_OPTIONS = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'bird', label: 'Bird' },
  { value: 'fish', label: 'Fish' },
  { value: 'reptile', label: 'Reptile' },
  { value: 'small_mammal', label: 'Small Mammal' },
  { value: 'other', label: 'Other' },
];

const INITIAL_FORM: TeleconsultForm = {
  partnerId: '',
  petOwnerName: '',
  petOwnerPhone: '',
  petOwnerEmail: '',
  petName: '',
  petType: 'dog',
  petBreed: '',
  petAge: '',
  petWeight: 0,
  symptoms: '',
  scheduledAt: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
  fee: 50000,
  status: 'scheduled',
  diagnosis: '',
  prescription: '',
  notes: '',
  rating: 0,
  duration: 0,
};

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TeleconsultDetailPage() {
  const router = useRouter();
  const { id, edit } = router.query;
  const isNew = id === 'new';
  const isEdit = isNew || edit === 'true';

  const [form, setForm] = useState<TeleconsultForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [partners, setPartners] = useState<any[]>([]);

  useEffect(() => {
    if (!isNew && id && typeof id === 'string') {
      fetchSession(id);
    }
    fetchPartners();
  }, [id, isNew]);

  const fetchSession = async (sessionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hq/teleconsult/${sessionId}`);
      const json = await res.json();
      if (json.success) {
        setSession(json.data);
        if (isEdit) {
          const s = json.data;
          setForm({
            partnerId: s.partnerId || '',
            petOwnerName: s.petOwnerName || '',
            petOwnerPhone: s.petOwnerPhone || '',
            petOwnerEmail: s.petOwnerEmail || '',
            petName: s.petName || '',
            petType: s.petType || 'dog',
            petBreed: s.petBreed || '',
            petAge: s.petAge || '',
            petWeight: s.petWeight || 0,
            symptoms: s.symptoms || '',
            scheduledAt: s.scheduledAt ? new Date(s.scheduledAt).toISOString().slice(0, 16) : '',
            fee: s.fee || 0,
            status: s.status || 'scheduled',
            diagnosis: s.diagnosis || '',
            prescription: s.prescription || '',
            notes: s.notes || '',
            rating: s.rating || 0,
            duration: s.duration || 0,
          });
        }
      } else {
        toast.error(json.error || 'Session not found');
      }
    } catch {
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await fetch('/api/hq/partners?type=vet&limit=200');
      const json = await res.json();
      if (json.success) {
        setPartners(json.data || []);
      }
    } catch {
      // Silently fail — partners may use mock data
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = isNew ? '/api/hq/teleconsult' : `/api/hq/teleconsult/${id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(isNew ? 'Session created successfully' : 'Session updated successfully');
        router.push(isNew ? `/hq/teleconsult/${json.data.id}` : `/hq/teleconsult/${id}`);
      } else {
        toast.error(json.error || 'Failed to save session');
      }
    } catch {
      toast.error('Failed to save session');
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof TeleconsultForm>(field: K, value: TeleconsultForm[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <HQLayout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            Loading session...
          </div>
        </div>
      </HQLayout>
    );
  }

  // View mode
  if (!isEdit && session) {
    return (
      <HQLayout>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          {/* Back & Actions */}
          <div className="flex items-center justify-between">
            <Link href="/hq/teleconsult" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" />
              Back to Teleconsult
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href={`/hq/teleconsult/${session.id}?edit=true`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Edit Session
              </Link>
            </div>
          </div>

          {/* Session Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${
                session.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                session.status === 'in_progress' ? 'bg-amber-50 text-amber-600' :
                session.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                session.status === 'no_show' ? 'bg-gray-50 text-gray-600' :
                'bg-blue-50 text-blue-600'
              }`}>
                {session.status === 'completed' ? <CheckCircle className="w-8 h-8" /> :
                 session.status === 'in_progress' ? <Video className="w-8 h-8" /> :
                 session.status === 'cancelled' ? <XCircle className="w-8 h-8" /> :
                 session.status === 'no_show' ? <AlertCircle className="w-8 h-8" /> :
                 <Calendar className="w-8 h-8" />}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{session.code}</h1>
                <p className="text-sm text-gray-500">
                  {STATUS_OPTIONS.find(s => s.value === session.status)?.label || session.status}
                  {session.vet ? ` · ${session.vet.name}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">
                  Rp {Number(session.fee).toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-gray-500">Consultation Fee</p>
              </div>
            </div>
          </div>

          {/* Detail Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pet Owner Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                Pet Owner
              </h3>
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900 font-medium">{session.petOwnerName}</span>
              </div>
              {session.petOwnerPhone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{session.petOwnerPhone}</span>
                </div>
              )}
              {session.petOwnerEmail && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{session.petOwnerEmail}</span>
                </div>
              )}
            </div>

            {/* Pet Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Dog className="w-4 h-4 text-gray-400" />
                Pet Information
              </h3>
              <div className="flex items-center gap-3 text-sm">
                <Heart className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{session.petName}</span>
                <span className="text-gray-500">· {session.petType}</span>
                {session.petBreed && <span className="text-gray-500">· {session.petBreed}</span>}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Weight className="w-4 h-4 text-gray-400" />
                <span>{session.petAge || '-'}</span>
                {session.petWeight ? <span>· {session.petWeight} kg</span> : null}
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                Schedule & Duration
              </h3>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-gray-500">Scheduled:</span>{' '}
                  <span className="font-medium">{formatDate(session.scheduledAt)}</span>
                </div>
              </div>
              {session.startedAt && (
                <div className="flex items-center gap-3 text-sm">
                  <Video className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-gray-500">Started:</span>{' '}
                    {formatDate(session.startedAt)}
                  </div>
                </div>
              )}
              {session.completedAt && (
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-gray-500">Completed:</span>{' '}
                    {formatDate(session.completedAt)}
                  </div>
                </div>
              )}
              {session.duration && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-gray-500">Duration:</span>{' '}
                    {session.duration} minutes
                  </div>
                </div>
              )}
            </div>

            {/* Consultation Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                Consultation Details
              </h3>
              {session.symptoms && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Symptoms</p>
                  <p className="text-sm text-gray-700">{session.symptoms}</p>
                </div>
              )}
              {session.diagnosis && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Diagnosis</p>
                  <p className="text-sm text-gray-700">{session.diagnosis}</p>
                </div>
              )}
              {session.prescription && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Prescription</p>
                  <p className="text-sm text-gray-700">{session.prescription}</p>
                </div>
              )}
              {session.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-medium">{session.rating}/5</span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                Notes
              </h3>
              {session.notes ? (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{session.notes}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No notes</p>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-3">
              {[
                { label: 'Created', time: session.createdAt, icon: Calendar },
                { label: 'Last Updated', time: session.updatedAt, icon: Clock },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="p-1 rounded-full bg-gray-100">
                      <Icon className="w-3 h-3 text-gray-500" />
                    </div>
                    <span className="text-gray-500">{item.label}:</span>
                    <span className="text-gray-700">{formatDate(item.time)}</span>
                  </div>
                );
              })}
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
        {/* Back */}
        <Link
          href={isNew ? '/hq/teleconsult' : `/hq/teleconsult/${id}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          {isNew ? 'Back to Teleconsult' : 'Back to details'}
        </Link>

        {/* Form Card */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">
              {isNew ? 'New Teleconsult Session' : 'Edit Session'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isNew ? 'Create a new teleconsultation session for a pet owner' : 'Update session details'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Partner / Vet Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Veterinarian *</label>
              <select
                value={form.partnerId}
                onChange={e => updateField('partnerId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select veterinarian...</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>

            {/* Pet Owner Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4" />
                Pet Owner Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    value={form.petOwnerName}
                    onChange={e => updateField('petOwnerName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Budi Santoso"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.petOwnerPhone}
                    onChange={e => updateField('petOwnerPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0812xxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.petOwnerEmail}
                    onChange={e => updateField('petOwnerEmail', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="owner@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Pet Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Dog className="w-4 h-4" />
                Pet Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pet Name *</label>
                  <input
                    type="text"
                    value={form.petName}
                    onChange={e => updateField('petName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Max"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={form.petType}
                    onChange={e => updateField('petType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {PET_TYPE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
                  <input
                    type="text"
                    value={form.petBreed}
                    onChange={e => updateField('petBreed', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Golden Retriever"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="text"
                    value={form.petAge}
                    onChange={e => updateField('petAge', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 3 years"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={form.petWeight || ''}
                    onChange={e => updateField('petWeight', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    min={0}
                    step={0.1}
                    placeholder="e.g., 12.5"
                  />
                </div>
              </div>
            </div>

            {/* Consultation */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Consultation Details
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms</label>
                <textarea
                  value={form.symptoms}
                  onChange={e => updateField('symptoms', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Describe the symptoms..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Time *</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={e => updateField('scheduledAt', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee (Rp)</label>
                <input
                  type="number"
                  value={form.fee || ''}
                  onChange={e => updateField('fee', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min={0}
                  placeholder="50000"
                />
              </div>
            </div>

            {/* For existing sessions — clinical fields */}
            {!isNew && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Syringe className="w-4 h-4" />
                  Clinical Notes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                    <textarea
                      value={form.diagnosis}
                      onChange={e => updateField('diagnosis', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows={3}
                      placeholder="Medical diagnosis..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prescription</label>
                    <textarea
                      value={form.prescription}
                      onChange={e => updateField('prescription', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows={3}
                      placeholder="Medication & dosage..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => updateField('status', e.target.value as SessionStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={form.duration || ''}
                      onChange={e => updateField('duration', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
                    <select
                      value={form.rating}
                      onChange={e => updateField('rating', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={0}>Not rated</option>
                      <option value={1}>1 — Poor</option>
                      <option value={2}>2 — Fair</option>
                      <option value={3}>3 — Good</option>
                      <option value={4}>4 — Very Good</option>
                      <option value={5}>5 — Excellent</option>
                    </select>
                  </div>
                </div>
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
                href={isNew ? '/hq/teleconsult' : `/hq/teleconsult/${id}`}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving || !form.petOwnerName || !form.petName || !form.partnerId}
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
                    {isNew ? 'Create Session' : 'Save Changes'}
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
