/**
 * Kepatuhan tenaga kerja — SSU (Permenaker 1/2017), TKA, Outsourcing
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  AlertTriangle, Building2, CheckCircle2, FileText, Globe2, Layers,
  Plus, RefreshCw, Save, Trash2, Users,
} from 'lucide-react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import { OpsKpiShell, OpsToolbar } from '@/components/humanify/OpsPageChrome';
import {
  SSU_COMPLIANCE_CHECKLIST,
  SSU_COMPOSITION_FACTORS,
  SSU_METHODS,
  SSU_REGULATION,
  SSU_STRUCTURE_TYPES,
} from '@/lib/hris/ssu-standards';
import { OUTSOURCE_VENDOR_TYPES, TKA_PERMIT_TYPES } from '@/lib/hris/workforce-categories';

type TabId = 'overview' | 'ssu' | 'tka' | 'outsourcing';

const API = '/api/humanify/workforce-compliance';
const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function WorkforceCompliancePage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [dataSource, setDataSource] = useState<'live' | 'empty' | 'demo'>('empty');
  const [ssu, setSsu] = useState<any>(null);
  const [tkaRows, setTkaRows] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [placements, setPlacements] = useState<any[]>([]);
  const [tkaForm, setTkaForm] = useState<any>({ permit_type: 'kitas', status: 'active' });
  const [vendorForm, setVendorForm] = useState<any>({ vendor_type: 'pkwt_provider' });
  const [placeForm, setPlaceForm] = useState<any>({ status: 'active' });
  const [showTka, setShowTka] = useState(false);
  const [showVendor, setShowVendor] = useState(false);
  const [showPlace, setShowPlace] = useState(false);

  const flash = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadOverview = useCallback(async () => {
    const res = await fetch(`${API}?action=overview`);
    const j = await res.json();
    if (j.success) {
      setOverview(j.data);
      setDataSource(j.dataSource || 'live');
    }
  }, []);

  const loadSsu = useCallback(async () => {
    const res = await fetch(`${API}?action=ssu-policy`);
    const j = await res.json();
    if (j.success) setSsu(j.data);
  }, []);

  const loadTka = useCallback(async () => {
    const res = await fetch(`${API}?action=tka-permits`);
    const j = await res.json();
    if (j.success) setTkaRows(j.data || []);
  }, []);

  const loadOutsource = useCallback(async () => {
    const [v, p] = await Promise.all([
      fetch(`${API}?action=outsourcing-vendors`).then((r) => r.json()),
      fetch(`${API}?action=outsourcing-placements`).then((r) => r.json()),
    ]);
    if (v.success) setVendors(v.data || []);
    if (p.success) setPlacements(p.data || []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadOverview();
      if (tab === 'ssu') await loadSsu();
      if (tab === 'tka') await loadTka();
      if (tab === 'outsourcing') await loadOutsource();
      if (tab === 'overview') {
        await Promise.all([loadSsu(), loadTka(), loadOutsource()]);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, loadOverview, loadSsu, loadTka, loadOutsource]);

  useEffect(() => {
    if (!router.isReady) return;
    const q = String(router.query.tab || '');
    if (q === 'ssu' || q === 'tka' || q === 'outsourcing' || q === 'overview') setTab(q);
  }, [router.isReady, router.query.tab]);

  useEffect(() => { refresh(); }, [refresh]);

  async function saveSsu() {
    setActing(true);
    try {
      const res = await fetch(`${API}?action=ssu-policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ssu),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      setSsu(j.data);
      flash('ok', 'Kebijakan SSU disimpan');
      loadOverview();
    } catch (e: any) {
      flash('err', e.message || 'Gagal simpan');
    } finally {
      setActing(false);
    }
  }

  async function seedGrades(replace = false) {
    if (!confirm(replace
      ? 'Nonaktifkan golongan lama dan isi template SSU G1–G8?'
      : 'Isi template golongan SSU (Permenaker 1/2017)?')) return;
    setActing(true);
    try {
      const res = await fetch(`${API}?action=seed-ssu-grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replace,
          umpReference: ssu?.umpReference || undefined,
        }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      flash('ok', j.message || 'Template golongan ditambahkan');
      loadOverview();
    } catch (e: any) {
      flash('err', e.message || 'Gagal seed');
    } finally {
      setActing(false);
    }
  }

  async function saveTka() {
    setActing(true);
    try {
      const res = await fetch(`${API}?action=tka-permit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tkaForm),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      flash('ok', j.message || 'Tersimpan');
      setShowTka(false);
      setTkaForm({ permit_type: 'kitas', status: 'active' });
      loadTka();
      loadOverview();
    } catch (e: any) {
      flash('err', e.message || 'Gagal');
    } finally {
      setActing(false);
    }
  }

  async function deleteTka(id: string) {
    if (!confirm('Hapus izin TKA ini?')) return;
    await fetch(`${API}?action=tka-permit`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadTka();
    loadOverview();
  }

  async function saveVendor() {
    setActing(true);
    try {
      const res = await fetch(`${API}?action=outsourcing-vendor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorForm),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      flash('ok', j.message || 'Vendor disimpan');
      setShowVendor(false);
      setVendorForm({ vendor_type: 'pkwt_provider' });
      loadOutsource();
      loadOverview();
    } catch (e: any) {
      flash('err', e.message || 'Gagal');
    } finally {
      setActing(false);
    }
  }

  async function savePlacement() {
    setActing(true);
    try {
      const res = await fetch(`${API}?action=outsourcing-placement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(placeForm),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      flash('ok', j.message || 'Penempatan disimpan');
      setShowPlace(false);
      setPlaceForm({ status: 'active' });
      loadOutsource();
      loadOverview();
    } catch (e: any) {
      flash('err', e.message || 'Gagal');
    } finally {
      setActing(false);
    }
  }

  const patchSsu = (p: Record<string, unknown>) => setSsu((s: any) => ({ ...s, ...p }));
  const toggleCheck = (id: string) => {
    setSsu((s: any) => ({
      ...s,
      checklist: { ...(s?.checklist || {}), [id]: !s?.checklist?.[id] },
    }));
  };

  return (
    <HQLayout title="Kepatuhan Tenaga Kerja">
      <div className="space-y-4 p-4 sm:p-6">
        <OpsToolbar>
          <div>
            <h1 className="text-lg font-semibold text-[color:var(--hf-ink)]">Struktur Upah · TKA · Outsourcing</h1>
            <p className="text-xs text-[color:var(--hf-ink-muted)]">
              Standar dasar Permenaker 1/2017 + pengelolaan tenaga asing & non-organik
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DataSourceBadge source={dataSource} />
            <button type="button" onClick={refresh} className="hf-btn-secondary text-xs">
              <RefreshCw className="mr-1 inline h-3.5 w-3.5" /> Muat ulang
            </button>
          </div>
        </OpsToolbar>

        {toast && (
          <div className={`rounded-lg px-3 py-2 text-sm ${toast.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
            {toast.msg}
          </div>
        )}

        <div className="hf-card overflow-hidden">
          <div className="flex overflow-x-auto border-b border-[var(--hf-border)]">
            {([
              { id: 'overview' as const, label: 'Ringkasan', icon: Layers },
              { id: 'ssu' as const, label: 'Struktur & Skala Upah', icon: FileText },
              { id: 'tka' as const, label: 'Tenaga Kerja Asing', icon: Globe2 },
              { id: 'outsourcing' as const, label: 'Outsourcing', icon: Building2 },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 ${
                  tab === id
                    ? 'border-[var(--hf-brand-600)] text-[color:var(--hf-brand-600)]'
                    : 'border-transparent text-[color:var(--hf-ink-muted)]'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5">
            {loading && !overview ? (
              <p className="py-10 text-center text-sm text-[color:var(--hf-ink-muted)]">Memuat…</p>
            ) : null}

            {tab === 'overview' && overview && (
              <div className="space-y-4">
                <OpsKpiShell>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                      { label: 'Kepatuhan SSU', value: `${overview.ssu?.compliancePct ?? 0}%`, hint: `${overview.ssu?.complianceDone}/${overview.ssu?.complianceTotal} checklist` },
                      { label: 'Golongan jabatan', value: overview.ssu?.gradeCount ?? 0, hint: overview.ssu?.status || 'draft' },
                      { label: 'Izin TKA aktif', value: overview.tka?.permitsActive ?? 0, hint: `${overview.tka?.permitsExpiring ?? 0} segera habis` },
                      { label: 'Penempatan outsource', value: overview.outsourcing?.activePlacements ?? 0, hint: `${overview.outsourcing?.vendors ?? 0} vendor` },
                    ].map((c) => (
                      <div key={c.label} className="rounded-xl border border-[var(--hf-border)] bg-white p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--hf-ink-muted)]">{c.label}</p>
                        <p className="mt-1 text-2xl font-bold text-[color:var(--hf-ink)]">{c.value}</p>
                        <p className="text-[11px] text-[color:var(--hf-ink-muted)]">{c.hint}</p>
                      </div>
                    ))}
                  </div>
                </OpsKpiShell>

                <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-surface-muted)] p-4 text-sm">
                  <p className="font-medium text-[color:var(--hf-ink)]">{SSU_REGULATION.title}</p>
                  <p className="mt-1 text-xs text-[color:var(--hf-ink-muted)]">
                    Acuan: {SSU_REGULATION.related.join(' · ')}. Upah di SSU = <strong>upah pokok</strong> (Pasal 3).
                    Lihat juga panduan praktik penyusunan di{' '}
                    <a className="text-[color:var(--hf-brand-600)] underline" href="https://www.talenta.co/blog/mengetahui-struktur-dan-skala-upah-bagi-perusahaan/" target="_blank" rel="noreferrer">
                      artikel struktur & skala upah
                    </a>.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setTab('ssu')} className="hf-btn-primary text-xs">Kelola SSU</button>
                    <Link href="/humanify/organization?tab=job-grades" className="hf-btn-secondary text-xs inline-flex items-center">
                      Golongan jabatan
                    </Link>
                    <Link href="/humanify/casual-workforce" className="hf-btn-secondary text-xs inline-flex items-center">
                      Tenaga harian / piecework
                    </Link>
                  </div>
                </div>

                {(overview.tka?.permitsExpiring > 0) && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {overview.tka.permitsExpiring} izin TKA berakhir dalam 60 hari — perpanjang sebelum expired.
                  </div>
                )}
              </div>
            )}

            {tab === 'ssu' && ssu && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[color:var(--hf-ink)]">Kebijakan Struktur & Skala Upah</h3>
                    <p className="text-xs text-[color:var(--hf-ink-muted)]">
                      Wajib disusun & diberitahukan (Pasal 2 & 8). Kepatuhan: {ssu.compliance?.pct ?? 0}%
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={acting} onClick={() => seedGrades(false)} className="hf-btn-secondary text-xs">
                      Seed template G1–G8
                    </button>
                    <button type="button" disabled={acting} onClick={() => seedGrades(true)} className="hf-btn-secondary text-xs">
                      Replace + seed
                    </button>
                    <button type="button" disabled={acting} onClick={saveSsu} className="hf-btn-primary text-xs">
                      <Save className="mr-1 inline h-3.5 w-3.5" />{acting ? 'Menyimpan…' : 'Simpan kebijakan'}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="block text-sm">
                    <span className="text-xs text-[color:var(--hf-ink-muted)]">Status</span>
                    <select className="hf-input mt-0.5 w-full" value={ssu.status || 'draft'} onChange={(e) => patchSsu({ status: e.target.value })}>
                      <option value="draft">Draft</option>
                      <option value="established">Ditetapkan (SK)</option>
                      <option value="under_review">Sedang ditinjau</option>
                      <option value="archived">Arsip</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs text-[color:var(--hf-ink-muted)]">Metode penyusunan</span>
                    <select className="hf-input mt-0.5 w-full" value={ssu.method || 'ranking_sederhana'} onChange={(e) => patchSsu({ method: e.target.value })}>
                      {SSU_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs text-[color:var(--hf-ink-muted)]">Jenis struktur</span>
                    <select className="hf-input mt-0.5 w-full" value={ssu.structureType || 'traditional'} onChange={(e) => patchSsu({ structureType: e.target.value })}>
                      {SSU_STRUCTURE_TYPES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs text-[color:var(--hf-ink-muted)]">No. SK / keputusan</span>
                    <input className="hf-input mt-0.5 w-full" value={ssu.decisionNumber || ''} onChange={(e) => patchSsu({ decisionNumber: e.target.value })} placeholder="SK/HR/2026/001" />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs text-[color:var(--hf-ink-muted)]">Tanggal SK</span>
                    <input type="date" className="hf-input mt-0.5 w-full" value={(ssu.decisionDate || '').slice(0, 10)} onChange={(e) => patchSsu({ decisionDate: e.target.value })} />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs text-[color:var(--hf-ink-muted)]">Ditetapkan oleh</span>
                    <input className="hf-input mt-0.5 w-full" value={ssu.decidedBy || ''} onChange={(e) => patchSsu({ decidedBy: e.target.value })} placeholder="Direktur Utama" />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs text-[color:var(--hf-ink-muted)]">Berlaku sejak</span>
                    <input type="date" className="hf-input mt-0.5 w-full" value={(ssu.effectiveFrom || '').slice(0, 10)} onChange={(e) => patchSsu({ effectiveFrom: e.target.value })} />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs text-[color:var(--hf-ink-muted)]">Tinjauan berikutnya</span>
                    <input type="date" className="hf-input mt-0.5 w-full" value={(ssu.nextReviewDate || '').slice(0, 10)} onChange={(e) => patchSsu({ nextReviewDate: e.target.value })} />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs text-[color:var(--hf-ink-muted)]">Referensi UMP/UMK (Rp)</span>
                    <input type="number" className="hf-input mt-0.5 w-full" value={ssu.umpReference || ''} onChange={(e) => patchSsu({ umpReference: e.target.value ? Number(e.target.value) : null })} />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="text-xs text-[color:var(--hf-ink-muted)]">Wilayah UMK</span>
                    <input className="hf-input mt-0.5 w-full" value={ssu.umkRegion || ''} onChange={(e) => patchSsu({ umkRegion: e.target.value })} placeholder="Kab/Kota" />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs text-[color:var(--hf-ink-muted)]">Metode pemberitahuan (Pasal 8)</span>
                    <select className="hf-input mt-0.5 w-full" value={ssu.notifiedMethod || ''} onChange={(e) => patchSsu({ notifiedMethod: e.target.value || null })}>
                      <option value="">Belum</option>
                      <option value="individual">Perorangan</option>
                      <option value="portal">Portal ESS</option>
                      <option value="letter">Surat</option>
                      <option value="mixed">Campuran</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm mt-6">
                    <input type="checkbox" checked={Boolean(ssu.attachedToPpPkb)} onChange={(e) => patchSsu({ attachedToPpPkb: e.target.checked })} />
                    Dilampirkan saat PP / PKB (Pasal 9)
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="text-xs text-[color:var(--hf-ink-muted)]">Catatan kebijakan</span>
                  <textarea className="hf-input mt-0.5 w-full" rows={3} value={ssu.notes || ''} onChange={(e) => patchSsu({ notes: e.target.value })} />
                </label>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--hf-ink-muted)]">Faktor Pasal 2</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {SSU_COMPOSITION_FACTORS.map((f) => (
                      <div key={f.id} className="rounded-lg border border-[var(--hf-border)] p-2.5">
                        <p className="text-xs font-medium text-[color:var(--hf-ink)]">{f.label}</p>
                        <p className="mt-0.5 text-[10px] text-[color:var(--hf-ink-muted)]">{f.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--hf-ink-muted)]">Checklist kepatuhan</p>
                  <ul className="mt-2 space-y-2">
                    {SSU_COMPLIANCE_CHECKLIST.map((c) => (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--hf-border)] px-3 py-2 text-sm hover:bg-[var(--hf-surface-muted)]">
                          <input type="checkbox" className="mt-1" checked={Boolean(ssu.checklist?.[c.id])} onChange={() => toggleCheck(c.id)} />
                          <span>
                            <span className="font-medium text-[color:var(--hf-ink)]">{c.label}</span>
                            <span className="ml-2 text-[10px] text-[color:var(--hf-ink-muted)]">{c.pasal}</span>
                          </span>
                          {ssu.checklist?.[c.id] ? <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-600" /> : null}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {tab === 'tka' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">Izin & dokumen TKA</h3>
                    <p className="text-xs text-[color:var(--hf-ink-muted)]">RPTKA, IMTA/notifikasi, VITAS, KITAS/KITAP, paspor, perjanjian kerja</p>
                  </div>
                  <button type="button" onClick={() => { setTkaForm({ permit_type: 'kitas', status: 'active' }); setShowTka(true); }} className="hf-btn-primary text-xs">
                    <Plus className="mr-1 inline h-3.5 w-3.5" /> Tambah izin
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[var(--hf-border)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--hf-surface-muted)] text-left text-xs text-[color:var(--hf-ink-muted)]">
                      <tr>
                        <th className="px-3 py-2">TKA</th>
                        <th className="px-3 py-2">Jenis</th>
                        <th className="px-3 py-2">Nomor</th>
                        <th className="px-3 py-2">Berlaku s/d</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {tkaRows.length === 0 ? (
                        <tr><td colSpan={6} className="px-3 py-8 text-center text-[color:var(--hf-ink-muted)]">Belum ada data izin TKA</td></tr>
                      ) : tkaRows.map((r) => (
                        <tr key={r.id} className="border-t border-[var(--hf-border)]">
                          <td className="px-3 py-2">
                            <p className="font-medium">{r.employee_name || '—'}</p>
                            <p className="text-[10px] text-[color:var(--hf-ink-muted)]">{r.nationality} · {r.position}</p>
                          </td>
                          <td className="px-3 py-2 text-xs">{TKA_PERMIT_TYPES.find((t) => t.id === r.permit_type)?.label || r.permit_type}</td>
                          <td className="px-3 py-2 font-mono text-xs">{r.permit_number || '—'}</td>
                          <td className="px-3 py-2 text-xs">{fmtDate(r.expiry_date)}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              (r.derived_status || r.status) === 'expired' ? 'bg-rose-100 text-rose-700'
                              : (r.derived_status || r.status) === 'expiring' ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {r.derived_status || r.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button type="button" className="p-1 text-[color:var(--hf-ink-muted)] hover:text-rose-600" onClick={() => deleteTka(r.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'outsourcing' && (
              <div className="space-y-6">
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">Vendor alih daya / pemborongan</h3>
                      <p className="text-xs text-[color:var(--hf-ink-muted)]">Tenaga non-organik dikelola melalui vendor — terpisah dari payroll organik</p>
                    </div>
                    <button type="button" onClick={() => { setVendorForm({ vendor_type: 'pkwt_provider' }); setShowVendor(true); }} className="hf-btn-primary text-xs">
                      <Plus className="mr-1 inline h-3.5 w-3.5" /> Vendor
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {vendors.length === 0 ? (
                      <p className="col-span-2 py-6 text-center text-sm text-[color:var(--hf-ink-muted)]">Belum ada vendor</p>
                    ) : vendors.map((v) => (
                      <div key={v.id} className="rounded-xl border border-[var(--hf-border)] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{v.name}</p>
                            <p className="text-[11px] text-[color:var(--hf-ink-muted)]">
                              {OUTSOURCE_VENDOR_TYPES.find((t) => t.id === v.vendor_type)?.label || v.vendor_type}
                              {v.license_number ? ` · Izin ${v.license_number}` : ''}
                            </p>
                          </div>
                          <span className="rounded-full bg-[var(--hf-brand-50)] px-2 py-0.5 text-[10px] text-[color:var(--hf-brand-600)]">
                            <Users className="mr-0.5 inline h-3 w-3" />{v.active_placements || 0}
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] text-[color:var(--hf-ink-muted)]">
                          Kontrak {v.contract_number || '—'} · {fmtDate(v.contract_start)} – {fmtDate(v.contract_end)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">Penempatan pekerja non-organik</h3>
                    <button type="button" onClick={() => { setPlaceForm({ status: 'active', vendor_id: vendors[0]?.id }); setShowPlace(true); }} className="hf-btn-primary text-xs" disabled={!vendors.length}>
                      <Plus className="mr-1 inline h-3.5 w-3.5" /> Penempatan
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-[var(--hf-border)]">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--hf-surface-muted)] text-left text-xs text-[color:var(--hf-ink-muted)]">
                        <tr>
                          <th className="px-3 py-2">Pekerja</th>
                          <th className="px-3 py-2">Vendor</th>
                          <th className="px-3 py-2">Posisi / Lokasi</th>
                          <th className="px-3 py-2">Periode</th>
                          <th className="px-3 py-2">Bill rate</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {placements.length === 0 ? (
                          <tr><td colSpan={6} className="px-3 py-8 text-center text-[color:var(--hf-ink-muted)]">Belum ada penempatan</td></tr>
                        ) : placements.map((p) => (
                          <tr key={p.id} className="border-t border-[var(--hf-border)]">
                            <td className="px-3 py-2 font-medium">{p.worker_name}</td>
                            <td className="px-3 py-2 text-xs">{p.vendor_name || '—'}</td>
                            <td className="px-3 py-2 text-xs">{p.position} · {p.site_location || p.department || '—'}</td>
                            <td className="px-3 py-2 text-xs">{fmtDate(p.start_date)} – {fmtDate(p.end_date)}</td>
                            <td className="px-3 py-2 text-xs tabular-nums">{p.bill_rate != null ? fmtRp(Number(p.bill_rate)) : '—'}</td>
                            <td className="px-3 py-2 text-xs">{p.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showTka && (
        <Modal title="Izin / dokumen TKA" onClose={() => setShowTka(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama TKA"><input className="hf-input w-full" value={tkaForm.employee_name || ''} onChange={(e) => setTkaForm({ ...tkaForm, employee_name: e.target.value })} /></Field>
            <Field label="Kewarganegaraan"><input className="hf-input w-full" value={tkaForm.nationality || ''} onChange={(e) => setTkaForm({ ...tkaForm, nationality: e.target.value })} /></Field>
            <Field label="Jabatan"><input className="hf-input w-full" value={tkaForm.position || ''} onChange={(e) => setTkaForm({ ...tkaForm, position: e.target.value })} /></Field>
            <Field label="No. paspor"><input className="hf-input w-full" value={tkaForm.passport_number || ''} onChange={(e) => setTkaForm({ ...tkaForm, passport_number: e.target.value })} /></Field>
            <Field label="Jenis izin">
              <select className="hf-input w-full" value={tkaForm.permit_type} onChange={(e) => setTkaForm({ ...tkaForm, permit_type: e.target.value })}>
                {TKA_PERMIT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Nomor izin"><input className="hf-input w-full" value={tkaForm.permit_number || ''} onChange={(e) => setTkaForm({ ...tkaForm, permit_number: e.target.value })} /></Field>
            <Field label="Diterbitkan"><input type="date" className="hf-input w-full" value={(tkaForm.issued_date || '').slice(0, 10)} onChange={(e) => setTkaForm({ ...tkaForm, issued_date: e.target.value })} /></Field>
            <Field label="Berlaku s/d"><input type="date" className="hf-input w-full" value={(tkaForm.expiry_date || '').slice(0, 10)} onChange={(e) => setTkaForm({ ...tkaForm, expiry_date: e.target.value })} /></Field>
            <Field label="Catatan" className="sm:col-span-2"><textarea className="hf-input w-full" rows={2} value={tkaForm.notes || ''} onChange={(e) => setTkaForm({ ...tkaForm, notes: e.target.value })} /></Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="hf-btn-secondary text-sm" onClick={() => setShowTka(false)}>Batal</button>
            <button type="button" disabled={acting} className="hf-btn-primary text-sm" onClick={saveTka}>Simpan</button>
          </div>
        </Modal>
      )}

      {showVendor && (
        <Modal title="Vendor outsourcing" onClose={() => setShowVendor(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama vendor"><input className="hf-input w-full" value={vendorForm.name || ''} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} /></Field>
            <Field label="Kode"><input className="hf-input w-full" value={vendorForm.code || ''} onChange={(e) => setVendorForm({ ...vendorForm, code: e.target.value })} /></Field>
            <Field label="Tipe">
              <select className="hf-input w-full" value={vendorForm.vendor_type} onChange={(e) => setVendorForm({ ...vendorForm, vendor_type: e.target.value })}>
                {OUTSOURCE_VENDOR_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="NPWP"><input className="hf-input w-full" value={vendorForm.npwp || ''} onChange={(e) => setVendorForm({ ...vendorForm, npwp: e.target.value })} /></Field>
            <Field label="No. izin usaha"><input className="hf-input w-full" value={vendorForm.license_number || ''} onChange={(e) => setVendorForm({ ...vendorForm, license_number: e.target.value })} /></Field>
            <Field label="Izin s/d"><input type="date" className="hf-input w-full" value={(vendorForm.license_expiry || '').slice(0, 10)} onChange={(e) => setVendorForm({ ...vendorForm, license_expiry: e.target.value })} /></Field>
            <Field label="No. kontrak"><input className="hf-input w-full" value={vendorForm.contract_number || ''} onChange={(e) => setVendorForm({ ...vendorForm, contract_number: e.target.value })} /></Field>
            <Field label="Kontak"><input className="hf-input w-full" value={vendorForm.contact_name || ''} onChange={(e) => setVendorForm({ ...vendorForm, contact_name: e.target.value })} /></Field>
            <Field label="Mulai kontrak"><input type="date" className="hf-input w-full" value={(vendorForm.contract_start || '').slice(0, 10)} onChange={(e) => setVendorForm({ ...vendorForm, contract_start: e.target.value })} /></Field>
            <Field label="Akhir kontrak"><input type="date" className="hf-input w-full" value={(vendorForm.contract_end || '').slice(0, 10)} onChange={(e) => setVendorForm({ ...vendorForm, contract_end: e.target.value })} /></Field>
            <Field label="Lingkup layanan" className="sm:col-span-2"><textarea className="hf-input w-full" rows={2} value={vendorForm.service_scope || ''} onChange={(e) => setVendorForm({ ...vendorForm, service_scope: e.target.value })} /></Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="hf-btn-secondary text-sm" onClick={() => setShowVendor(false)}>Batal</button>
            <button type="button" disabled={acting} className="hf-btn-primary text-sm" onClick={saveVendor}>Simpan</button>
          </div>
        </Modal>
      )}

      {showPlace && (
        <Modal title="Penempatan pekerja non-organik" onClose={() => setShowPlace(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Vendor">
              <select className="hf-input w-full" value={placeForm.vendor_id || ''} onChange={(e) => setPlaceForm({ ...placeForm, vendor_id: e.target.value })}>
                <option value="">Pilih vendor</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
            <Field label="Nama pekerja"><input className="hf-input w-full" value={placeForm.worker_name || ''} onChange={(e) => setPlaceForm({ ...placeForm, worker_name: e.target.value })} /></Field>
            <Field label="NIK"><input className="hf-input w-full" value={placeForm.worker_nik || ''} onChange={(e) => setPlaceForm({ ...placeForm, worker_nik: e.target.value })} /></Field>
            <Field label="Posisi"><input className="hf-input w-full" value={placeForm.position || ''} onChange={(e) => setPlaceForm({ ...placeForm, position: e.target.value })} /></Field>
            <Field label="Departemen"><input className="hf-input w-full" value={placeForm.department || ''} onChange={(e) => setPlaceForm({ ...placeForm, department: e.target.value })} /></Field>
            <Field label="Lokasi site"><input className="hf-input w-full" value={placeForm.site_location || ''} onChange={(e) => setPlaceForm({ ...placeForm, site_location: e.target.value })} /></Field>
            <Field label="Mulai"><input type="date" className="hf-input w-full" value={(placeForm.start_date || '').slice(0, 10)} onChange={(e) => setPlaceForm({ ...placeForm, start_date: e.target.value })} /></Field>
            <Field label="Selesai"><input type="date" className="hf-input w-full" value={(placeForm.end_date || '').slice(0, 10)} onChange={(e) => setPlaceForm({ ...placeForm, end_date: e.target.value })} /></Field>
            <Field label="Bill rate (ke user)"><input type="number" className="hf-input w-full" value={placeForm.bill_rate || ''} onChange={(e) => setPlaceForm({ ...placeForm, bill_rate: e.target.value })} /></Field>
            <Field label="Pay rate (ke pekerja)"><input type="number" className="hf-input w-full" value={placeForm.pay_rate || ''} onChange={(e) => setPlaceForm({ ...placeForm, pay_rate: e.target.value })} /></Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="hf-btn-secondary text-sm" onClick={() => setShowPlace(false)}>Batal</button>
            <button type="button" disabled={acting} className="hf-btn-primary text-sm" onClick={savePlacement}>Simpan</button>
          </div>
        </Modal>
      )}
    </HQLayout>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="text-xs text-[color:var(--hf-ink-muted)]">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-[color:var(--hf-ink)]">{title}</h3>
          <button type="button" onClick={onClose} className="text-sm text-[color:var(--hf-ink-muted)]">Tutup</button>
        </div>
        {children}
      </div>
    </div>
  );
}
