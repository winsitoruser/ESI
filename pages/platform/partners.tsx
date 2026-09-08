import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import OpsLayout from '@/components/humanify/OpsLayout';
import {
  OpsPageIntro, OpsPanel, OpsStat, OpsToast, OpsBadge, OpsPageSkeleton,
} from '@/components/humanify/ops-ui';
import OpsDataTable from '@/components/humanify/OpsDataTable';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import { RefreshCw, HelpingHand, Users, Wallet } from 'lucide-react';

/**
 * Platform ops — partner channel, leads, commission & payout
 */
export default function PlatformPartnersPage() {
  const { gating } = usePlatformOperator('/platform/partners');

  const [partners, setPartners] = useState<any[]>([]);
  const [partnerLeads, setPartnerLeads] = useState<any[]>([]);
  const [leadStatus, setLeadStatus] = useState('all');
  const [commissionMonths, setCommissionMonths] = useState<any[]>([]);
  const [commissionFrom, setCommissionFrom] = useState(() => {
    const d = new Date();
    d.setUTCDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [commissionTo, setCommissionTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [commissionPartnerCode, setCommissionPartnerCode] = useState('');
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewResult, setPreviewResult] = useState('');
  const [partnerForm, setPartnerForm] = useState({ code: '', name: '', contactEmail: '' });
  const [acting, setActing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const leadQ = new URLSearchParams({ action: 'partner-leads', limit: '100' });
      if (leadStatus && leadStatus !== 'all') leadQ.set('status', leadStatus);
      const summaryQ = new URLSearchParams({ action: 'partner-commission-summary' });
      const code = commissionPartnerCode.trim().toUpperCase();
      if (code) summaryQ.set('partnerCode', code);
      const [pn, pl, cs] = await Promise.all([
        fetch('/api/platform?action=partners').then((r) => r.json()),
        fetch(`/api/platform?${leadQ}`).then((r) => r.json()),
        fetch(`/api/platform?${summaryQ}`).then((r) => r.json()),
      ]);
      if (pn.success) setPartners(pn.data || []);
      if (pl.success) setPartnerLeads(pl.data || []);
      if (cs.success) setCommissionMonths(cs.data?.months || []);
    } catch {
      setToast('Gagal memuat data partner');
    } finally {
      setLoading(false);
    }
  }, [leadStatus, commissionPartnerCode]);

  useEffect(() => {
    if (!gating) load();
  }, [gating, load]);

  async function createPartnerCode() {
    const res = await fetch('/api/platform?action=partner-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partnerForm),
    });
    const j = await res.json();
    if (j.success) {
      setPartnerForm({ code: '', name: '', contactEmail: '' });
      setToast('Partner ditambahkan');
      load();
    } else setToast(j.error || 'Gagal');
    setTimeout(() => setToast(''), 2500);
  }

  async function previewDemoCommission() {
    setPreviewBusy(true);
    try {
      const code = (commissionPartnerCode || 'DEMO').trim().toUpperCase();
      const r = await fetch(
        `/api/platform?action=commission-preview&partnerCode=${encodeURIComponent(code)}&amountIdr=1000000`,
      );
      const j = await r.json();
      if (j.success) {
        setPreviewResult(
          `${j.data?.code || code}: Rp ${(j.data?.commissionIdr || 0).toLocaleString('id-ID')} (${j.data?.commissionPct ?? '?'}%)`,
        );
      } else setPreviewResult(j.error || 'Gagal preview');
    } finally {
      setPreviewBusy(false);
    }
  }

  if (gating || (loading && partners.length === 0)) {
    return (
      <OpsLayout title="Partner" subtitle="Referral, leads, komisi & payout">
        <OpsPageSkeleton variant="table" />
      </OpsLayout>
    );
  }

  return (
    <OpsLayout title="Partner" subtitle="Referral, leads, komisi & payout">
      <div className="space-y-5">
        <OpsToast message={toast} onDismiss={() => setToast('')} />

        <OpsPageIntro
          eyebrow="Commercial"
          title="Partner & billing"
          description="Kelola kode referral, pipeline leads, ringkasan komisi, dan ledger payout partner."
          actions={
            <button onClick={load} className="flex items-center gap-2 text-sm px-3 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <OpsStat label="Partner aktif" value={partners.length} icon={HelpingHand} hint="Kode referral terdaftar" />
          <OpsStat label="Leads (filter)" value={partnerLeads.length} icon={Users} hint={leadStatus === 'all' ? '30 terbaru' : `Status: ${leadStatus}`} />
          <OpsStat
            label="DEMO code"
            value={partners.some((p) => String(p.code || '').toUpperCase() === 'DEMO') ? 'OK' : 'Missing'}
            tone={partners.some((p) => String(p.code || '').toUpperCase() === 'DEMO') ? 'success' : 'warning'}
            icon={Wallet}
            hint="Wajib untuk sales walkthrough"
          />
        </div>

        <OpsPanel
          title="Partner / referral codes"
          description="Kode dipakai di signup ?ref=CODE. Payout ledger: draft → mark-paid + CSV."
          action={
            <OpsBadge tone={partners.some((p) => String(p.code || '').toUpperCase() === 'DEMO') ? 'success' : 'warning'}>
              DEMO {partners.some((p) => String(p.code || '').toUpperCase() === 'DEMO') ? 'present' : 'missing'}
            </OpsBadge>
          }
        >
          <div className="space-y-3 mb-4">
            <div className="flex flex-wrap gap-2">
              <input
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm uppercase"
                placeholder="CODE"
                value={partnerForm.code}
                onChange={(e) => setPartnerForm({ ...partnerForm, code: e.target.value.toUpperCase() })}
              />
              <input
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm flex-1 min-w-[140px]"
                placeholder="Nama partner"
                value={partnerForm.name}
                onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
              />
              <input
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
                placeholder="Email"
                value={partnerForm.contactEmail}
                onChange={(e) => setPartnerForm({ ...partnerForm, contactEmail: e.target.value })}
              />
              <button onClick={createPartnerCode} className="px-3 py-2 bg-slate-900 text-white rounded-xl text-sm hover:bg-slate-800">
                Tambah
              </button>
            </div>
          </div>
          <OpsDataTable
            rows={partners}
            loading={loading}
            rowKey={(p) => p.id}
            searchPlaceholder="Cari kode / nama / email…"
            exportFileName="humanify-ops-partners"
            exportSheetName="Partners"
            emptyTitle="Belum ada partner"
            emptyHint="Tambahkan kode DEMO untuk sales checklist."
            defaultPageSize={10}
            columns={[
              {
                id: 'code',
                header: 'Kode',
                exportValue: (p) => p.code,
                cell: (p) => <code className="bg-slate-100 px-1 rounded text-xs">{p.code}</code>,
              },
              {
                id: 'name',
                header: 'Nama',
                exportWidth: 22,
                exportValue: (p) => p.name || '',
                cell: (p) => <span className="font-medium text-slate-800">{p.name}</span>,
              },
              {
                id: 'commission_pct',
                header: 'Komisi %',
                exportValue: (p) => (p.commission_pct != null ? Number(p.commission_pct) : ''),
                cell: (p) => (
                  <span className="text-xs text-slate-500">
                    {p.commission_pct != null ? `${Number(p.commission_pct)}%` : '—'}
                  </span>
                ),
              },
              {
                id: 'tenant_count',
                header: 'Tenants',
                exportValue: (p) => p.tenant_count || 0,
                cell: (p) => <span className="tabular-nums text-xs">{p.tenant_count || 0}</span>,
              },
              {
                id: 'signup',
                header: 'Signup URL',
                exportValue: (p) => `?ref=${p.code}`,
                cell: (p) => <span className="text-[11px] text-slate-400">?ref={p.code}</span>,
              },
            ]}
          />
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={previewDemoCommission}
              disabled={previewBusy}
              className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {previewBusy ? 'Preview…' : 'Preview DEMO · Rp1jt'}
            </button>
            {previewResult && <span className="text-[11px] text-slate-600">{previewResult}</span>}
            <Link href="/platform/demo-checklist" className="text-xs text-[color:var(--hf-brand-600)] hover:underline">
              Sales demo checklist →
            </Link>
            <a href="/api/platform?action=partner-payout-export" className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50">
              Export payout CSV
            </a>
            <button
              type="button"
              className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50"
              onClick={async () => {
                const code = (commissionPartnerCode || 'DEMO').trim().toUpperCase();
                const amount = Number(prompt('Amount IDR untuk draft payout', '100000') || 0);
                if (!amount) return;
                const r = await fetch('/api/platform?action=partner-payout-create', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ partnerCode: code, amountIdr: amount }),
                });
                const j = await r.json();
                alert(j.success ? `Draft payout ${j.data?.id}` : (j.error || 'Gagal'));
              }}
            >
              Buat draft payout
            </button>
            <button
              type="button"
              className="text-xs px-2.5 py-1.5 border border-emerald-200 rounded-xl hover:bg-emerald-50 text-emerald-800"
              onClick={async () => {
                const id = prompt('Payout UUID to mark paid');
                if (!id) return;
                const r = await fetch('/api/platform?action=partner-payout-mark-paid', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id }),
                });
                const j = await r.json();
                alert(j.success ? 'Marked paid' : (j.error || 'Gagal'));
              }}
            >
              Mark payout paid
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 items-center border-t border-slate-100 pt-3">
            <label className="text-[11px] text-slate-500 flex items-center gap-1">
              Partner
              <input
                className="border border-slate-200 rounded-lg px-1.5 py-1 text-xs uppercase w-24"
                placeholder="ALL"
                value={commissionPartnerCode}
                onChange={(e) => setCommissionPartnerCode(e.target.value.toUpperCase())}
              />
            </label>
            <label className="text-[11px] text-slate-500 flex items-center gap-1">
              From
              <input type="date" value={commissionFrom} onChange={(e) => setCommissionFrom(e.target.value)} className="border border-slate-200 rounded-lg px-1.5 py-1 text-xs" />
            </label>
            <label className="text-[11px] text-slate-500 flex items-center gap-1">
              To
              <input type="date" value={commissionTo} onChange={(e) => setCommissionTo(e.target.value)} className="border border-slate-200 rounded-lg px-1.5 py-1 text-xs" />
            </label>
            <a
              href={`/api/platform?action=partner-commission-export&from=${encodeURIComponent(commissionFrom)}&to=${encodeURIComponent(commissionTo)}${commissionPartnerCode.trim() ? `&partnerCode=${encodeURIComponent(commissionPartnerCode.trim().toUpperCase())}` : ''}`}
              className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50"
            >
              Unduh CSV komisi (paid)
            </a>
          </div>
          {commissionMonths.length > 0 && (
            <div className="mt-3">
              <OpsDataTable
                rows={commissionMonths}
                rowKey={(row) => `${row.month}-${row.partner_code}-${row.orders}`}
                searchPlaceholder="Cari bulan / partner…"
                exportFileName="humanify-ops-partner-commission"
                exportSheetName="Komisi"
                defaultPageSize={10}
                emptyTitle="Belum ada ringkasan komisi"
                columns={[
                  { id: 'month', header: 'Bulan', exportValue: (r) => r.month, cell: (r) => r.month },
                  { id: 'partner_code', header: 'Partner', exportValue: (r) => r.partner_code, cell: (r) => <code className="bg-slate-100 px-1 rounded text-xs">{r.partner_code}</code> },
                  { id: 'orders', header: 'Orders', exportValue: (r) => r.orders, cell: (r) => <span className="tabular-nums">{r.orders}</span> },
                  { id: 'commission_idr', header: 'Komisi IDR', exportValue: (r) => Number(r.commission_idr || 0), cell: (r) => <span className="tabular-nums font-medium">Rp {Number(r.commission_idr || 0).toLocaleString('id-ID')}</span> },
                  { id: 'amount_idr', header: 'GMV IDR', exportValue: (r) => Number(r.amount_idr || 0), cell: (r) => <span className="tabular-nums text-xs text-slate-500">Rp {Number(r.amount_idr || 0).toLocaleString('id-ID')}</span> },
                ]}
              />
            </div>
          )}
        </OpsPanel>

        <OpsPanel
          title="Partner leads"
          description="Form publik di humanify.id/humanify/partners — update status pipeline di sini."
          action={
            <a href="https://humanify.id/humanify/partners" className="text-xs text-[color:var(--hf-brand-600)] hover:underline" target="_blank" rel="noreferrer">
              Form publik ↗
            </a>
          }
        >
          <OpsDataTable
            rows={partnerLeads}
            loading={loading}
            rowKey={(lead) => lead.id}
            searchPlaceholder="Cari perusahaan / kontak / email…"
            exportFileName="humanify-ops-partner-leads"
            exportSheetName="Leads"
            emptyTitle="Belum ada lead"
            emptyHint="Lead masuk dari form partner di apex."
            filters={[
              {
                id: 'status',
                label: 'Semua status',
                getValue: (l) => String(l.status || 'new'),
                options: [
                  { value: 'new', label: 'new' },
                  { value: 'contacted', label: 'contacted' },
                  { value: 'qualified', label: 'qualified' },
                  { value: 'closed', label: 'closed' },
                ],
              },
            ]}
            columns={[
              {
                id: 'company_name',
                header: 'Perusahaan',
                exportWidth: 22,
                exportValue: (l) => l.company_name || '',
                cell: (l) => <span className="font-medium text-slate-800">{l.company_name}</span>,
              },
              {
                id: 'contact',
                header: 'Kontak',
                exportWidth: 28,
                exportValue: (l) => `${l.contact_name || ''} | ${l.email || ''}`,
                cell: (l) => (
                  <span className="text-xs text-slate-600">{l.contact_name} · {l.email}</span>
                ),
              },
              {
                id: 'meta',
                header: 'Tipe / Region',
                exportValue: (l) => [l.partner_type, l.region].filter(Boolean).join(' · '),
                cell: (l) => (
                  <span className="text-xs text-slate-500">
                    {[l.partner_type, l.region].filter(Boolean).join(' · ') || '—'}
                  </span>
                ),
              },
              {
                id: 'created_at',
                header: 'Tanggal',
                exportValue: (l) => (l.created_at ? new Date(l.created_at).toLocaleDateString('id-ID') : ''),
                cell: (l) => (
                  <span className="text-xs text-slate-400">
                    {l.created_at ? new Date(l.created_at).toLocaleDateString('id-ID') : '—'}
                  </span>
                ),
              },
              {
                id: 'status',
                header: 'Status',
                exportValue: (l) => l.status || 'new',
                cell: (l) => <OpsBadge tone="neutral">{l.status || 'new'}</OpsBadge>,
              },
              {
                id: 'actions',
                header: 'Pipeline',
                align: 'right',
                exportOmit: true,
                searchable: false,
                cell: (lead) => (
                  <div className="flex flex-wrap justify-end gap-1">
                    {(['new', 'contacted', 'qualified', 'closed'] as const)
                      .filter((s) => s !== (lead.status || 'new'))
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={acting === `lead-${lead.id}`}
                          onClick={async () => {
                            setActing(`lead-${lead.id}`);
                            try {
                              const r = await fetch('/api/platform?action=partner-lead-status', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: lead.id, status: s }),
                              });
                              const j = await r.json();
                              if (j.success) {
                                setPartnerLeads((prev) =>
                                  prev.map((x) => (x.id === lead.id ? { ...x, status: s } : x)),
                                );
                              } else setToast(j.error || 'Gagal update lead');
                            } finally {
                              setActing(null);
                            }
                          }}
                          className="px-1.5 py-0.5 rounded border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          → {s}
                        </button>
                      ))}
                  </div>
                ),
              },
            ]}
          />
        </OpsPanel>
      </div>
    </OpsLayout>
  );
}
