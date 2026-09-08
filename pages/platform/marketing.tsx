import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import OpsLayout from '@/components/humanify/OpsLayout';
import {
  OpsBadge, OpsPageIntro, OpsPageSkeleton, OpsPanel, OpsStat, OpsToast,
} from '@/components/humanify/ops-ui';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import { CAMPAIGN_CHANNELS, CAMPAIGN_STATUSES } from '@/lib/saas/marketing-campaigns';
import { RefreshCw } from 'lucide-react';

type Campaign = {
  id: string;
  name: string;
  channel: string;
  status: string;
  impressions: number;
  visitors: number;
  budgetIdr: number;
  startsAt: string | null;
  endsAt: string | null;
};

function idr(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

export default function PlatformMarketingPage() {
  const { gating } = usePlatformOperator('/platform/marketing');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [funnel, setFunnel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', channel: 'google', status: 'draft', visitors: '', impressions: '', budgetIdr: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, f] = await Promise.all([
        fetch('/api/platform?action=campaigns').then((r) => r.json()),
        fetch('/api/platform?action=marketing-funnel&period=30d').then((r) => r.json()),
      ]);
      if (c.success) setCampaigns(c.data?.campaigns || []);
      if (f.success) setFunnel(f.data);
      if (!c.success) setToast(c.error || 'Gagal memuat campaign');
    } catch {
      setToast('Gagal memuat marketing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!gating) load(); }, [gating, load]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/platform?action=campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          visitors: Number(form.visitors || 0),
          impressions: Number(form.impressions || 0),
          budgetIdr: Number(form.budgetIdr || 0),
        }),
      }).then((r) => r.json());
      setToast(res.success ? 'Campaign disimpan' : (res.error || 'Gagal simpan'));
      if (res.success) {
        setForm({ name: '', channel: 'google', status: 'draft', visitors: '', impressions: '', budgetIdr: '' });
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    const row = campaigns.find((c) => c.id === id);
    if (!row) return;
    const res = await fetch('/api/platform?action=campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...row, status }),
    }).then((r) => r.json());
    if (!res.success) setToast(res.error || 'Gagal update');
    else await load();
  };

  return (
    <OpsLayout title="Marketing" subtitle="Campaign, funnel, dan promo">
      <OpsToast message={toast} onDismiss={() => setToast('')} />
      {gating || (loading && campaigns.length === 0 && !funnel) ? (
        <OpsPageSkeleton variant="detail" />
      ) : (
        <div className="space-y-5">
          <OpsPageIntro
            eyebrow="Growth"
            title="Campaign & funnel"
            description="Catat channel, visitor, dan budget. Registrasi/trial/paid dihitung dari tenant nyata. Promo code tetap di Billing."
            actions={
              <>
                <Link href="/platform/billing?tab=vouchers" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Kelola voucher
                </Link>
                <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
                </button>
              </>
            }
          />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <OpsStat label="Visitor (campaign)" value={funnel?.visitors || 0} />
            <OpsStat label="Registrasi" value={funnel?.registrations || 0} tone="brand" />
            <OpsStat label="Trial aktif" value={funnel?.trials || 0} tone="warning" />
            <OpsStat label="Paid" value={funnel?.paid || 0} hint={`${funnel?.conversionPaidPct || 0}% dari registrasi`} tone="success" />
          </div>

          <OpsPanel title="Funnel" description={funnel?.periodLabel || '30 hari'}>
            <ol className="grid gap-2 sm:grid-cols-4">
              {[
                { label: 'Visitor', n: funnel?.visitors || 0 },
                { label: 'Register', n: funnel?.registrations || 0 },
                { label: 'Trial', n: funnel?.trials || 0 },
                { label: 'Paid', n: funnel?.paid || 0 },
              ].map((step, i) => (
                <li key={step.label} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{i + 1}. {step.label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{step.n.toLocaleString('id-ID')}</p>
                </li>
              ))}
            </ol>
          </OpsPanel>

          <form onSubmit={save} className="hf-card grid gap-3 p-4 md:grid-cols-6">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama campaign" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
            <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="rounded-xl border border-slate-200 px-2 py-2 text-sm">
              {CAMPAIGN_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={form.visitors} onChange={(e) => setForm({ ...form, visitors: e.target.value })} placeholder="Visitor" inputMode="numeric" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input value={form.impressions} onChange={(e) => setForm({ ...form, impressions: e.target.value })} placeholder="Impression" inputMode="numeric" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <input value={form.budgetIdr} onChange={(e) => setForm({ ...form, budgetIdr: e.target.value })} placeholder="Budget Rp" inputMode="numeric" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <button type="submit" disabled={saving} className="hf-btn-primary text-xs whitespace-nowrap">Simpan</button>
            </div>
          </form>

          <div className="space-y-2">
            {campaigns.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{c.name}</p>
                  <p className="text-[11px] text-slate-500">{c.channel} · {c.visitors.toLocaleString('id-ID')} visitor · {idr(c.budgetIdr)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <OpsBadge tone={c.status === 'live' ? 'success' : c.status === 'ended' ? 'neutral' : 'warning'}>{c.status}</OpsBadge>
                  <select value={c.status} onChange={(e) => setStatus(c.id, e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs">
                    {CAMPAIGN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
            {campaigns.length === 0 && <p className="text-sm text-slate-500">Belum ada campaign.</p>}
          </div>
        </div>
      )}
    </OpsLayout>
  );
}
