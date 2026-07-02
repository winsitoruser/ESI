import React, { useState, useEffect, useCallback } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  Users, Search, Plus, Filter, ChevronDown,
  Edit, Trash2, Eye, RefreshCw, Phone, Mail,
  MapPin, Target, DollarSign, Building2, Dog, Syringe, Hotel, Truck,
  TrendingUp, UserCheck, XCircle, AlertCircle, CheckCircle,
  ChevronLeft, ChevronRight, Calendar, User, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
type PartnerType = 'vet' | 'petshop' | 'petclinic' | 'pethotel' | 'pettransport';

interface Lead {
  id: string;
  code: string;
  companyName: string;
  partnerType: PartnerType;
  picName: string;
  picPhone: string;
  email: string;
  phone: string;
  city: string;
  source: string;
  stage: LeadStage;
  status: string;
  expectedValue: number;
  probability: number;
  assignedTo: string;
  notes: string;
  lostReason: string;
  convertedToPartner: boolean;
  partnerId: string;
  activityCount: number;
  createdAt: string;
  updatedAt: string;
}

const PIPELINE_STAGES: { value: LeadStage; label: string; color: string; progress: number }[] = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700 border-blue-200', progress: 10 },
  { value: 'contacted', label: 'Contacted', color: 'bg-sky-100 text-sky-700 border-sky-200', progress: 25 },
  { value: 'qualified', label: 'Qualified', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', progress: 40 },
  { value: 'proposal', label: 'Proposal', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', progress: 55 },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-amber-100 text-amber-700 border-amber-200', progress: 75 },
  { value: 'won', label: 'Won', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', progress: 100 },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700 border-red-200', progress: 0 },
];

const PARTNER_TYPES: { value: PartnerType; label: string }[] = [
  { value: 'vet', label: 'Veterinarian' },
  { value: 'petshop', label: 'Pet Shop' },
  { value: 'petclinic', label: 'Pet Clinic' },
  { value: 'pethotel', label: 'Pet Hotel' },
  { value: 'pettransport', label: 'Pet Transport' },
];

const SOURCE_LABELS: Record<string, string> = {
  referral: 'Referral', website: 'Website', direct: 'Direct',
  event: 'Event', cold_call: 'Cold Call', social_media: 'Social Media', other: 'Other',
};

function formatCurrency(val: number) {
  return `Rp ${val.toLocaleString('id-ID')}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'pipeline' | 'table'>('pipeline');
  const limit = 50;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (stageFilter) params.set('stage', stageFilter);
      if (typeFilter) params.set('type', typeFilter);

      const res = await fetch(`/api/hq/crm?${params}`);
      const json = await res.json();

      if (json.success) {
        setLeads(json.data);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages);
          setTotal(json.pagination.total);
        }
      } else {
        toast.error(json.error || 'Failed to load leads');
      }
    } catch {
      toast.error('Failed to load CRM leads');
    } finally {
      setLoading(false);
    }
  }, [page, search, stageFilter, typeFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate lead "${name}"?`)) return;
    try {
      const res = await fetch(`/api/hq/crm/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Lead deactivated');
        fetchLeads();
      } else {
        toast.error(json.error || 'Failed to deactivate');
      }
    } catch {
      toast.error('Failed to deactivate lead');
    }
  };

  const StageBadge = ({ stage }: { stage: LeadStage }) => {
    const config = PIPELINE_STAGES.find(s => s.value === stage);
    if (!config) return null;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color.split(' ').slice(0, 2).join(' ')}`}>
        {config.label}
      </span>
    );
  };

  // Pipeline view: group leads by stage
  const leadsByStage = PIPELINE_STAGES.map(stage => ({
    ...stage,
    leads: leads.filter(l => l.stage === stage.value),
  }));

  // Stats
  const totalExpectedValue = leads.reduce((sum, l) => sum + Number(l.expectedValue || 0), 0);
  const wonCount = leads.filter(l => l.stage === 'won').length;
  const wonValue = leads.filter(l => l.stage === 'won').reduce((sum, l) => sum + Number(l.expectedValue || 0), 0);

  return (
    <HQLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CRM & Sales Pipeline</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage leads, track pipeline, convert partners
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('pipeline')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === 'pipeline' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pipeline
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === 'table' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Table
              </button>
            </div>
            <button
              onClick={() => fetchLeads()}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/hq/crm/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Lead
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Leads</p>
                <p className="text-lg font-semibold text-gray-900">{total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active Pipeline</p>
                <p className="text-lg font-semibold text-gray-900">
                  {leads.filter(l => !['won', 'lost'].includes(l.stage)).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Won</p>
                <p className="text-lg font-semibold text-gray-900">{wonCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Pipeline Value</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalExpectedValue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by company, contact, code..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
                showFilters || stageFilter || typeFilter
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {(stageFilter || typeFilter) && (
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
              )}
            </button>
          </div>

          {showFilters && (
            <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Stage:</label>
                <select
                  value={stageFilter}
                  onChange={e => { setStageFilter(e.target.value); setPage(1); }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Stages</option>
                  {PIPELINE_STAGES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Type:</label>
                <select
                  value={typeFilter}
                  onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Types</option>
                  {PARTNER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              {(stageFilter || typeFilter) && (
                <button
                  onClick={() => { setStageFilter(''); setTypeFilter(''); setPage(1); }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pipeline View */}
        {viewMode === 'pipeline' ? (
          <div className="grid grid-cols-7 gap-3">
            {leadsByStage.filter(s => s.value !== 'lost').map(stage => (
              <div key={stage.value} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className={`px-3 py-2 border-b ${stage.color} bg-opacity-30`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{stage.label}</span>
                    <span className="text-xs font-medium bg-white bg-opacity-60 px-1.5 py-0.5 rounded">
                      {stage.leads.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {stage.leads.reduce((sum, l) => sum + Number(l.expectedValue || 0), 0) > 0
                      ? formatCurrency(stage.leads.reduce((sum, l) => sum + Number(l.expectedValue || 0), 0))
                      : ''}
                  </p>
                </div>
                <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                  {stage.leads.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No leads</p>
                  ) : stage.leads.map(lead => (
                    <Link
                      key={lead.id}
                      href={`/hq/crm/${lead.id}`}
                      className="block p-2 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                    >
                      <p className="text-xs font-medium text-gray-900 truncate">{lead.companyName}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-gray-500">{lead.picName || '-'}</span>
                      </div>
                      {lead.expectedValue > 0 && (
                        <p className="text-[10px] font-medium text-gray-600 mt-1">
                          {formatCurrency(lead.expectedValue)}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              stage.value === 'won' ? 'bg-emerald-500' :
                              stage.value === 'lost' ? 'bg-red-400' :
                              'bg-indigo-500'
                            }`}
                            style={{ width: `${lead.probability}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">{lead.probability}%</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            {/* Lost column */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-3 py-2 border-b bg-red-50 bg-opacity-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-red-700">Lost</span>
                  <span className="text-xs font-medium bg-white bg-opacity-60 px-1.5 py-0.5 rounded text-red-600">
                    {leadsByStage.find(s => s.value === 'lost')?.leads.length || 0}
                  </span>
                </div>
              </div>
              <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                {leadsByStage.find(s => s.value === 'lost')?.leads.map(lead => (
                  <Link
                    key={lead.id}
                    href={`/hq/crm/${lead.id}`}
                    className="block p-2 rounded-lg border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-colors"
                  >
                    <p className="text-xs font-medium text-gray-500 truncate">{lead.companyName}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{lead.lostReason || 'No reason'}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">PIC</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Prob.</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Act.</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="flex items-center justify-center gap-2 text-gray-500">
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Loading leads...
                        </div>
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <Target className="w-12 h-12" />
                          <p className="text-sm">No leads found</p>
                          <Link href="/hq/crm/new" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                            Add your first lead
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : leads.map(lead => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/hq/crm/${lead.id}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                          {lead.companyName}
                        </Link>
                        <p className="text-xs text-gray-400">{lead.code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm text-gray-700">{lead.picName || '-'}</p>
                          {lead.city && <p className="text-xs text-gray-400">{lead.city}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {PARTNER_TYPES.find(t => t.value === lead.partnerType)?.label || lead.partnerType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StageBadge stage={lead.stage} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-gray-700">
                          {formatCurrency(lead.expectedValue)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                lead.stage === 'won' ? 'bg-emerald-500' :
                                lead.stage === 'lost' ? 'bg-red-400' : 'bg-indigo-500'
                              }`}
                              style={{ width: `${lead.probability}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{lead.probability}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-gray-500">{lead.activityCount || 0}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/hq/crm/${lead.id}`}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/hq/crm/${lead.id}?edit=true`}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(lead.id, lead.companyName)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600">
                  Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} leads
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </HQLayout>
  );
}
