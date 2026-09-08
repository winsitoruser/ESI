import { useCallback, useEffect, useState, type FormEvent } from 'react';
import OpsLayout from '@/components/humanify/OpsLayout';
import {
  OpsBadge, OpsPageIntro, OpsPageSkeleton, OpsStat, OpsToast,
} from '@/components/humanify/ops-ui';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import { LEAD_SOURCES, SALES_STAGE_LABEL, SALES_STAGES } from '@/lib/saas/sales-leads';
import { RefreshCw } from 'lucide-react';

type Lead = {
  id: string;
  company: string;
  pic: string;
  email: string | null;
  estimatedDealIdr: number;
  ownerEmail: string | null;
  nextFollowUp: string | null;
  status: string;
};

function idr(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

export default function PlatformCrmPage() {
  const { gating } = usePlatformOperator('/platform/crm');
  const [byStage, setByStage] = useState<Record<string, Lead[]>>({});
  const [totals, setTotals] = useState({
    totalPipelineIdr: 0, qualifiedPipelineIdr: 0, proposalIdr: 0, expectedClosingIdr: 0, openCount: 0, wonCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    company: '', pic: '', email: '', estimatedDealIdr: '', source: 'web', interest: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform?action=crm-leads').then((r) => r.json());
      if (res.success) {
        setByStage(res.data?.byStage || {});
        setTotals(res.data?.totals || totals);
      } else setToast(res.error || 'Gagal memuat pipeline');
    } catch {
      setToast('Gagal memuat CRM');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!gating) load(); }, [gating, load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/platform?action=crm-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          estimatedDealIdr: Number(form.estimatedDealIdr || 0),
        }),
      }).then((r) => r.json());
      setToast(res.success ? 'Lead ditambahkan' : (res.error || 'Gagal simpan'));
      if (res.success) {
        setForm({ company: '', pic: '', email: '', estimatedDealIdr: '', source: 'web', interest: '' });
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const move = async (id: string, status: string) => {
    const res = await fetch('/api/platform?action=crm-lead', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }).then((r) => r.json());
    if (!res.success) setToast(res.error || 'Gagal pindah stage');
    else await load();
  };

  return (
    <OpsLayout title="CRM" subtitle="Pipeline penjualan B2B">
      <OpsToast message={toast} onDismiss={() => setToast('')} />
      {gating || (loading && !Object.keys(byStage).length) ? (
        <OpsPageSkeleton variant="detail" />
      ) : (
        <div className="space-y-5">
          <OpsPageIntro
            eyebrow="Sales"
            title="Pipeline CRM"
            description="New lead → demo → proposal → won/lost. Nilai deal dipakai untuk perkiraan closing."
            actions={
              <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
              </button>
            }
          />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <OpsStat label="Pipeline" value={idr(totals.totalPipelineIdr)} hint={`${totals.openCount} open`} />
            <OpsStat label="Qualified" value={idr(totals.qualifiedPipelineIdr)} tone="brand" />
            <OpsStat label="Proposal" value={idr(totals.proposalIdr)} tone="warning" />
            <OpsStat label="Expected closing" value={idr(totals.expectedClosingIdr)} hint={`${totals.wonCount} won`} tone="success" />
          </div>

          <form onSubmit={create} className="hf-card grid gap-3 p-4 md:grid-cols-6">
            <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Perusahaan" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
            <input required value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} placeholder="PIC" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" type="email" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input value={form.estimatedDealIdr} onChange={(e) => setForm({ ...form, estimatedDealIdr: e.target.value })} placeholder="Nilai deal (Rp)" inputMode="numeric" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="flex-1 rounded-xl border border-slate-200 px-2 py-2 text-xs">
                {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="submit" disabled={saving} className="hf-btn-primary text-xs whitespace-nowrap">Tambah lead</button>
            </div>
          </form>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {SALES_STAGES.map((stage) => {
              const items = byStage[stage] || [];
              return (
                <section key={stage} className="w-[220px] shrink-0 rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
                  <header className="mb-2 flex items-center justify-between px-1">
                    <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">{SALES_STAGE_LABEL[stage]}</h2>
                    <OpsBadge tone={stage === 'won' ? 'success' : stage === 'lost' ? 'danger' : 'neutral'}>{items.length}</OpsBadge>
                  </header>
                  <div className="space-y-2">
                    {items.map((lead) => (
                      <article key={lead.id} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                        <p className="truncate text-sm font-medium text-slate-900">{lead.company}</p>
                        <p className="truncate text-[11px] text-slate-500">{lead.pic}</p>
                        <p className="mt-1 text-xs tabular-nums text-slate-700">{idr(lead.estimatedDealIdr)}</p>
                        <label className="mt-2 block">
                          <span className="sr-only">Pindah stage</span>
                          <select
                            value={lead.status}
                            onChange={(e) => move(lead.id, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px]"
                          >
                            {SALES_STAGES.map((s) => (
                              <option key={s} value={s}>{SALES_STAGE_LABEL[s]}</option>
                            ))}
                          </select>
                        </label>
                      </article>
                    ))}
                    {items.length === 0 && (
                      <p className="px-1 py-6 text-center text-[11px] text-slate-400">Kosong</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </OpsLayout>
  );
}
