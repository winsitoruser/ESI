import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import PlatformOpsNav from '@/components/humanify/PlatformOpsNav';
import { Loader2, RefreshCw } from 'lucide-react';

/**
 * Platform ops — partner channel, leads, commission & payout
 */
export default function PlatformPartnersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = ((session?.user as any)?.role || '').toLowerCase();
  const allowed = role === 'super_admin' || role === 'superadmin' || role === 'platform_admin';

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
      const leadQ = new URLSearchParams({ action: 'partner-leads', limit: '30' });
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
    if (status === 'unauthenticated') {
      router.replace('/humanify/login?callbackUrl=/platform/partners');
      return;
    }
    if (status === 'authenticated' && !allowed) {
      router.replace('/humanify');
      return;
    }
    if (status === 'authenticated' && allowed) load();
  }, [status, allowed, load, router]);

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

  if (status === 'loading' || (status === 'authenticated' && !allowed)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat...
      </div>
    );
  }

  return (
    <HumanifyLayout title="Partner & Billing" subtitle="Referral, leads, komisi & payout">
      <div className="space-y-6">
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow">{toast}</div>
        )}

        <PlatformOpsNav />

        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Channel partner</h2>
          <button onClick={load} className="flex items-center gap-2 text-sm px-3 py-2 border rounded-lg hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <div className="bg-white border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900">Partner / referral codes</p>
            <p className={`text-[11px] px-2 py-0.5 rounded-full border ${
              partners.some((p) => String(p.code || '').toUpperCase() === 'DEMO')
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              DEMO walkthrough:{' '}
              {partners.some((p) => String(p.code || '').toUpperCase() === 'DEMO') ? 'present' : 'missing'}
              {' · '}{partners.length} partner{partners.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="border rounded-lg px-3 py-2 text-sm uppercase"
              placeholder="CODE"
              value={partnerForm.code}
              onChange={(e) => setPartnerForm({ ...partnerForm, code: e.target.value.toUpperCase() })}
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[140px]"
              placeholder="Nama partner"
              value={partnerForm.name}
              onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Email"
              value={partnerForm.contactEmail}
              onChange={(e) => setPartnerForm({ ...partnerForm, contactEmail: e.target.value })}
            />
            <button onClick={createPartnerCode} className="px-3 py-2 bg-[var(--hf-brand-600)] text-white rounded-lg text-sm">
              Tambah
            </button>
          </div>
          <ul className="text-xs text-slate-600 divide-y max-h-28 overflow-y-auto">
            {partners.map((p) => (
              <li key={p.id} className="py-1.5 flex justify-between gap-2">
                <span>
                  <code className="bg-slate-100 px-1 rounded">{p.code}</code> · {p.name}
                  {p.commission_pct != null && (
                    <span className="text-slate-400"> · {Number(p.commission_pct)}%</span>
                  )}
                </span>
                <span className="text-slate-400">{p.tenant_count || 0} tenants · signup ?ref={p.code}</span>
              </li>
            ))}
            {!partners.length && <li className="py-1 text-slate-400">Belum ada partner.</li>}
          </ul>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={previewDemoCommission}
              disabled={previewBusy}
              className="text-xs px-2 py-1 border rounded-lg text-[color:var(--hf-brand)] hover:bg-[var(--hf-brand-50)] disabled:opacity-50"
            >
              {previewBusy ? 'Preview…' : 'Preview DEMO · Rp1jt'}
            </button>
            {previewResult && <span className="text-[11px] text-slate-600">{previewResult}</span>}
          </div>
          <p className="text-[11px] text-slate-400">
            Payout ledger ops: mark-paid + CSV (bukan Midtrans auto).
          </p>
          <div className="flex flex-wrap gap-2 items-center pt-2 border-t">
            <Link href="/platform/demo-checklist" className="text-xs text-[color:var(--hf-brand-600)] hover:underline">
              Sales demo checklist →
            </Link>
            <a href="/api/platform?action=partner-payout-export" className="text-xs px-2 py-1 border rounded-lg hover:bg-slate-50">
              Export payout CSV
            </a>
            <button
              type="button"
              className="text-xs px-2 py-1 border rounded-lg hover:bg-slate-50"
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
              className="text-xs px-2 py-1 border rounded-lg hover:bg-emerald-50 text-emerald-800"
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
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-[11px] text-slate-500 flex items-center gap-1">
              Partner
              <input
                className="border rounded px-1.5 py-1 text-xs uppercase w-24"
                placeholder="ALL"
                value={commissionPartnerCode}
                onChange={(e) => setCommissionPartnerCode(e.target.value.toUpperCase())}
              />
            </label>
            <label className="text-[11px] text-slate-500 flex items-center gap-1">
              From
              <input type="date" value={commissionFrom} onChange={(e) => setCommissionFrom(e.target.value)} className="border rounded px-1.5 py-1 text-xs" />
            </label>
            <label className="text-[11px] text-slate-500 flex items-center gap-1">
              To
              <input type="date" value={commissionTo} onChange={(e) => setCommissionTo(e.target.value)} className="border rounded px-1.5 py-1 text-xs" />
            </label>
            <a
              href={`/api/platform?action=partner-commission-export&from=${encodeURIComponent(commissionFrom)}&to=${encodeURIComponent(commissionTo)}${commissionPartnerCode.trim() ? `&partnerCode=${encodeURIComponent(commissionPartnerCode.trim().toUpperCase())}` : ''}`}
              className="text-xs px-2 py-1 border rounded-lg text-slate-700 hover:bg-slate-50"
            >
              Unduh CSV komisi (paid)
            </a>
            <a
              href={`/api/platform?action=billing-orders&status=paid&limit=50${commissionPartnerCode.trim() ? `&partnerCode=${encodeURIComponent(commissionPartnerCode.trim().toUpperCase())}` : ''}`}
              className="text-xs px-2 py-1 border rounded-lg text-slate-700 hover:bg-slate-50"
            >
              Order paid (JSON)
            </a>
          </div>
          {commissionMonths.length > 0 && (
            <div className="border-t pt-2 mt-1">
              <p className="text-xs font-semibold text-slate-700 mb-1">
                Komisi paid (6 bulan, est.)
                {commissionPartnerCode.trim() ? ` · ${commissionPartnerCode.trim().toUpperCase()}` : ''}
              </p>
              <ul className="text-[11px] text-slate-600 divide-y max-h-28 overflow-y-auto">
                {commissionMonths.slice(0, 12).map((row, i) => (
                  <li key={`${row.month}-${row.partner_code}-${i}`} className="py-1 flex justify-between gap-2">
                    <span>
                      {row.month} · <code className="bg-slate-100 px-1 rounded">{row.partner_code}</code>
                      {' '}· {row.orders} order
                    </span>
                    <span className="font-medium text-slate-800">
                      Rp {Number(row.commission_idr || 0).toLocaleString('id-ID')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900">Partner leads (form publik)</p>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={leadStatus}
                onChange={(e) => setLeadStatus(e.target.value)}
                className="text-xs border rounded-lg px-2 py-1 text-slate-700"
              >
                <option value="all">Semua status</option>
                <option value="new">new</option>
                <option value="contacted">contacted</option>
                <option value="qualified">qualified</option>
                <option value="closed">closed</option>
              </select>
              <a
                href={`/api/platform?action=partner-leads-export${leadStatus !== 'all' ? `&status=${encodeURIComponent(leadStatus)}` : ''}`}
                className="text-xs px-2 py-1 border rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Export CSV
              </a>
              <a href="/humanify/partners" className="text-xs text-[color:var(--hf-brand-600)] hover:underline" target="_blank" rel="noreferrer">
                /humanify/partners
              </a>
            </div>
          </div>
          <ul className="text-xs text-slate-600 divide-y max-h-48 overflow-y-auto">
            {partnerLeads.map((lead) => (
              <li key={lead.id} className="py-1.5 space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-slate-800">{lead.company_name}</span>
                  <span className="text-slate-400 shrink-0">
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString('id-ID') : '—'}
                  </span>
                </div>
                <p className="text-slate-500">
                  {lead.contact_name} · {lead.email}
                  {lead.partner_type ? ` · ${lead.partner_type}` : ''}
                  {lead.region ? ` · ${lead.region}` : ''}
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{lead.status || 'new'}</span>
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
                        className="px-1.5 py-0.5 rounded border text-[10px] text-[color:var(--hf-brand)] hover:bg-[var(--hf-brand-50)] disabled:opacity-50"
                      >
                        → {s}
                      </button>
                    ))}
                </div>
              </li>
            ))}
            {!partnerLeads.length && <li className="py-1 text-slate-400">Belum ada lead dari form partner.</li>}
          </ul>
        </div>
      </div>
    </HumanifyLayout>
  );
}
