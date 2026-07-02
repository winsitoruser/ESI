import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Save, Building2, Dog, Syringe, Hotel, Truck,
  Mail, Phone, MapPin, Globe, User, Calendar, DollarSign,
  Tag, FileText, AlertCircle, CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

type PartnerType = 'vet' | 'petshop' | 'petclinic' | 'pethotel' | 'pettransport';
type PartnerStatus = 'active' | 'inactive' | 'pending' | 'suspended';

interface PartnerForm {
  name: string;
  type: PartnerType;
  picName: string;
  picPhone: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  commissionRate: number;
  status: PartnerStatus;
  notes: string;
}

const PARTNER_TYPES: { value: PartnerType; label: string; icon: any }[] = [
  { value: 'vet', label: 'Veterinarian', icon: Syringe },
  { value: 'petshop', label: 'Pet Shop', icon: Building2 },
  { value: 'petclinic', label: 'Pet Clinic', icon: Dog },
  { value: 'pethotel', label: 'Pet Hotel', icon: Hotel },
  { value: 'pettransport', label: 'Pet Transport', icon: Truck },
];

const INITIAL_FORM: PartnerForm = {
  name: '',
  type: 'petshop',
  picName: '',
  picPhone: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  province: '',
  commissionRate: 0,
  status: 'active',
  notes: '',
};

export default function PartnerDetailPage() {
  const router = useRouter();
  const { id, edit } = router.query;
  const isNew = id === 'new';
  const isEdit = isNew || edit === 'true';

  const [form, setForm] = useState<PartnerForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [partner, setPartner] = useState<any>(null);

  useEffect(() => {
    if (!isNew && id && typeof id === 'string') {
      fetchPartner(id);
    }
  }, [id, isNew]);

  const fetchPartner = async (partnerId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hq/partners/${partnerId}`);
      const json = await res.json();
      if (json.success) {
        setPartner(json.data);
        if (isEdit) {
          setForm({
            name: json.data.name || '',
            type: json.data.type || 'petshop',
            picName: json.data.picName || '',
            picPhone: json.data.picPhone || '',
            phone: json.data.phone || '',
            email: json.data.email || '',
            address: json.data.address || '',
            city: json.data.city || '',
            province: json.data.province || '',
            commissionRate: json.data.commissionRate || 0,
            status: json.data.status || 'active',
            notes: json.data.notes || '',
          });
        }
      } else {
        toast.error(json.error || 'Partner not found');
      }
    } catch {
      toast.error('Failed to load partner');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = isNew ? '/api/hq/partners' : `/api/hq/partners/${id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(isNew ? 'Partner created successfully' : 'Partner updated successfully');
        router.push(isNew ? `/hq/partners/${json.data.id}` : `/hq/partners/${id}`);
      } else {
        toast.error(json.error || 'Failed to save partner');
      }
    } catch {
      toast.error('Failed to save partner');
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof PartnerForm>(field: K, value: PartnerForm[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <HQLayout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            Loading partner...
          </div>
        </div>
      </HQLayout>
    );
  }

  // View mode
  if (!isEdit && partner) {
    return (
      <HQLayout>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          {/* Back & Actions */}
          <div className="flex items-center justify-between">
            <Link href="/hq/partners" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" />
              Back to Partners
            </Link>
            <Link
              href={`/hq/partners/${partner.id}?edit=true`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Edit Partner
            </Link>
          </div>

          {/* Partner Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${
                partner.type === 'vet' ? 'bg-emerald-50 text-emerald-600' :
                partner.type === 'petshop' ? 'bg-blue-50 text-blue-600' :
                partner.type === 'petclinic' ? 'bg-purple-50 text-purple-600' :
                partner.type === 'pethotel' ? 'bg-amber-50 text-amber-600' :
                'bg-rose-50 text-rose-600'
              }`}>
                {React.createElement(
                  PARTNER_TYPES.find(t => t.value === partner.type)?.icon || Building2,
                  { className: 'w-8 h-8' }
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{partner.name}</h1>
                <p className="text-sm text-gray-500">{partner.code} · {
                  PARTNER_TYPES.find(t => t.value === partner.type)?.label || partner.type
                }</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                partner.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                partner.status === 'inactive' ? 'bg-gray-100 text-gray-600' :
                partner.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {partner.status.charAt(0).toUpperCase() + partner.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Detail Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Contact Information</h3>
              {partner.picName && (
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <div><span className="text-gray-500">PIC:</span> {partner.picName}</div>
                </div>
              )}
              {partner.picPhone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div><span className="text-gray-500">PIC Phone:</span> {partner.picPhone}</div>
                </div>
              )}
              {partner.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>{partner.email}</div>
                </div>
              )}
              {partner.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>{partner.phone}</div>
                </div>
              )}
            </div>

            {/* Location */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Location</h3>
              {partner.address && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>{partner.address}</div>
                </div>
              )}
              {partner.city && (
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <div>{[partner.city, partner.province].filter(Boolean).join(', ')}</div>
                </div>
              )}
            </div>

            {/* Business Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Business Information</h3>
              <div className="flex items-center gap-3 text-sm">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <div><span className="text-gray-500">Commission Rate:</span> {partner.commissionRate}%</div>
              </div>
              {partner.joinDate && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div><span className="text-gray-500">Join Date:</span> {new Date(partner.joinDate).toLocaleDateString()}</div>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Tag className="w-4 h-4 text-gray-400" />
                <div><span className="text-gray-500">Partner Code:</span> {partner.code}</div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Notes</h3>
              {partner.notes ? (
                <p className="text-sm text-gray-600">{partner.notes}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No notes</p>
              )}
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
          href={isNew ? '/hq/partners' : `/hq/partners/${id}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          {isNew ? 'Back to Partners' : 'Back to details'}
        </Link>

        {/* Form Card */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">
              {isNew ? 'Add New Partner' : 'Edit Partner'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isNew ? 'Register a new VET, Pet Shop, Clinic, Hotel or Transport partner' : 'Update partner information'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Partner Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Partner Type *</label>
              <div className="grid grid-cols-5 gap-3">
                {PARTNER_TYPES.map(t => {
                  const Icon = t.icon;
                  const selected = form.type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => updateField('type', t.value)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        selected
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-xs font-medium">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Partner Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIC Phone</label>
                <input
                  type="text"
                  value={form.picPhone}
                  onChange={e => updateField('picPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Contact person phone"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => updateField('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="partner@example.com"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Address</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={form.address}
                  onChange={e => updateField('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                  <input
                    type="text"
                    value={form.province}
                    onChange={e => updateField('province', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Province"
                  />
                </div>
              </div>
            </div>

            {/* Business Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  value={form.commissionRate}
                  onChange={e => updateField('commissionRate', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min={0}
                  max={100}
                  step={0.5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => updateField('status', e.target.value as PartnerStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => updateField('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Additional notes about this partner..."
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Link
                href={isNew ? '/hq/partners' : `/hq/partners/${id}`}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving || !form.name}
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
                    {isNew ? 'Create Partner' : 'Save Changes'}
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
