import { useCallback, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Upload, FileText, Loader2, CheckCircle2, AlertTriangle, Download, Eye,
  Users, ArrowRight, X, FileSpreadsheet, ListChecks, ShieldAlert, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import HRStatCard from '@/components/humanify/HRStatCard';
import { OpsKpiShell, OpsPageHero, OpsPanel, OpsStage } from '@/components/humanify/OpsPageChrome';
import { EnterpriseTabBar } from '@/components/humanify/PerformanceModuleChrome';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;

const TEMPLATE = `name,email,phone,position,department,workLocation,employmentCategory,joinDate,baseSalary
Budi Santoso,budi@contoh.com,08123456789,Staff Operasional,OPERATIONS,HQ,permanent,2026-01-15,6500000
Siti Aminah,siti@contoh.com,08129876543,HR Officer,HR,HQ,contract,2026-02-01,7500000`;

const COLUMNS: Array<{ key: string; label: string; required?: boolean; hint: string }> = [
  { key: 'name', label: 'Nama', required: true, hint: 'name, nama' },
  { key: 'email', label: 'Email', required: true, hint: 'email, surel' },
  { key: 'position', label: 'Jabatan', required: true, hint: 'position, jabatan' },
  { key: 'phone', label: 'Telepon', hint: 'phone, hp, telp' },
  { key: 'department', label: 'Departemen', hint: 'department, divisi' },
  { key: 'workLocation', label: 'Lokasi kerja', hint: 'workLocation, lokasi' },
  { key: 'employmentCategory', label: 'Status', hint: 'permanent, contract, intern, …' },
  { key: 'joinDate', label: 'Tanggal masuk', hint: 'YYYY-MM-DD' },
  { key: 'baseSalary', label: 'Gaji pokok', hint: 'angka, tanpa Rp' },
];

const REQUIRED_ALIASES: Record<string, string[]> = {
  name: ['name', 'nama', 'full name', 'nama lengkap'],
  email: ['email', 'e-mail', 'surel'],
  position: ['position', 'jabatan', 'posisi', 'title'],
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  ok: { label: 'Siap / berhasil', className: 'bg-emerald-50 text-[color:var(--hf-success)]' },
  invalid: { label: 'Tidak valid', className: 'bg-rose-50 text-[color:var(--hf-danger)]' },
  duplicate_file: { label: 'Duplikat di file', className: 'bg-amber-50 text-[color:var(--hf-warning)]' },
  exists: { label: 'Sudah terdaftar', className: 'bg-amber-50 text-[color:var(--hf-warning)]' },
  seat_limit: { label: 'Melebihi kuota', className: 'bg-rose-50 text-[color:var(--hf-danger)]' },
};

type RowResult = { line: number; email?: string; name?: string; status: string; reason?: string };
type ImportSummary = {
  total: number;
  imported: number;
  skipped: number;
  invalid: number;
  dryRun: boolean;
  seat?: { employees: number; maxEmployees: number; remaining: number; planId: string };
  results: RowResult[];
};
type ResultFilter = 'all' | 'ok' | 'issues';

function countDataRows(text: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  return Math.max(0, lines.length - 1);
}

function inspectCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [] as string[], missing: ['name', 'email', 'position'] as string[], rows: 0 };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const missing = (Object.keys(REQUIRED_ALIASES) as Array<keyof typeof REQUIRED_ALIASES>).filter(
    (key) => !REQUIRED_ALIASES[key].some((alias) => headers.includes(alias)),
  );
  return { headers, missing, rows: Math.max(0, lines.length - 1) };
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EmployeesImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState('');
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  const [busy, setBusy] = useState<'preview' | 'import' | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [wasDryRun, setWasDryRun] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');

  const inspection = useMemo(() => inspectCsv(csv), [csv]);
  const rowsCount = inspection.rows;
  const readyCount = summary?.results.filter((r) => r.status === 'ok').length || 0;
  const issueCount = summary ? summary.results.filter((r) => r.status !== 'ok').length : 0;
  const importedOk = Boolean(summary && !wasDryRun);
  const currentStep = !csv.trim() ? 1 : importedOk ? 3 : summary ? 2 : 1;

  const resetResults = () => {
    setSummary(null);
    setWasDryRun(true);
    setConfirming(false);
    setResultFilter('all');
  };

  const applyCsv = (text: string, meta?: { name: string; size: number } | null) => {
    setCsv(text);
    setFileMeta(meta ?? null);
    resetResults();
  };

  const loadFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['xlsx', 'xls'].includes(ext)) {
      toast.error('Simpan file Excel sebagai CSV (File → Save As → CSV) lalu unggah ulang.');
      return;
    }
    if (!['csv', 'txt'].includes(ext) && !/text\/(csv|plain)/i.test(file.type)) {
      toast.error('Gunakan file CSV (.csv).');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`Ukuran file maksimal ${formatBytes(MAX_BYTES)}.`);
      return;
    }
    const text = await file.text();
    if (!text.trim()) {
      toast.error('File kosong.');
      return;
    }
    if (countDataRows(text) > MAX_ROWS) {
      toast.error(`Maksimal ${MAX_ROWS.toLocaleString('id-ID')} baris per impor.`);
      return;
    }
    applyCsv(text, { name: file.name, size: file.size });
    toast.success(`${file.name} siap divalidasi`);
  };

  const onFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await loadFile(file);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await loadFile(file);
  };

  const run = useCallback(async (dryRun: boolean) => {
    if (!csv.trim()) {
      toast.error('Unggah atau tempel CSV dulu');
      return;
    }
    if (inspection.missing.length) {
      toast.error(`Kolom wajib belum ada: ${inspection.missing.join(', ')}`);
      return;
    }
    setBusy(dryRun ? 'preview' : 'import');
    setConfirming(false);
    try {
      const res = await fetch('/api/humanify/employees-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, dryRun }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Gagal');
      setSummary(j.data);
      setWasDryRun(dryRun);
      setResultFilter(dryRun && (j.data.invalid || j.data.skipped) ? 'issues' : 'all');
      if (dryRun) toast.success('Pratinjau selesai');
      else toast.success(`${j.data.imported} karyawan diimpor`);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memproses');
    } finally {
      setBusy(null);
    }
  }, [csv, inspection.missing]);

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-import-karyawan.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredResults = useMemo(() => {
    if (!summary) return [];
    if (resultFilter === 'ok') return summary.results.filter((r) => r.status === 'ok');
    if (resultFilter === 'issues') return summary.results.filter((r) => r.status !== 'ok');
    return summary.results;
  }, [summary, resultFilter]);

  return (
    <PageGuard
      anyPermission={['employees.view', 'employees.create', 'employees.*', 'hris.*']}
      title="Impor Karyawan"
      description="Impor massal data karyawan dari CSV."
    >
      <Head>
        <title>Impor Karyawan — {HUMANIFY_BRAND.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <HumanifyLayout title="Impor Karyawan" subtitle="Unggah CSV untuk menambahkan banyak karyawan sekaligus">
        <OpsStage>
          <OpsPageHero
            title="Impor Karyawan"
            subtitle="Tambah banyak karyawan sekaligus dari CSV. Validasi dulu, lalu impor baris yang lolos."
            badge="Master Data"
            liveLabel="People ops"
            icon={Upload}
            chips={[
              { icon: FileSpreadsheet, label: 'CSV · maks. 5 MB / 5.000 baris' },
              { icon: Users, label: 'Nama, email, jabatan wajib' },
            ]}
            actions={(
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={downloadTemplate} className="hf-btn-secondary inline-flex items-center gap-2">
                  <Download className="h-4 w-4" /> Unduh template
                </button>
                <Link href="/humanify/employees" className="hf-btn-primary inline-flex items-center gap-2">
                  <Users className="h-4 w-4" /> Database karyawan
                </Link>
              </div>
            )}
          />

          <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Langkah impor">
            {[
              { n: 1, label: 'Unggah CSV', hint: 'Drop file atau tempel' },
              { n: 2, label: 'Validasi', hint: 'Pratinjau tanpa menyimpan' },
              { n: 3, label: 'Impor', hint: 'Simpan baris yang lolos' },
            ].map((s) => {
              const done = currentStep > s.n || (s.n === 3 && importedOk);
              const active = currentStep === s.n && !importedOk;
              return (
                <li
                  key={s.n}
                  className={`flex items-center gap-3 rounded-[var(--hf-radius-xl)] border px-4 py-3 ${
                    done
                      ? 'border-emerald-200 bg-emerald-50/60'
                      : active
                        ? 'border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)]'
                        : 'border-[var(--hf-border)] bg-white'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      done
                        ? 'bg-[var(--hf-success)] text-white'
                        : active
                          ? 'bg-[var(--hf-brand-600)] text-white'
                          : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--hf-ink)]">{s.label}</p>
                    <p className="text-xs text-[color:var(--hf-ink-muted)]">{s.hint}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
            <OpsPanel
              title="Berkas CSV"
              subtitle="Pisahkan kolom dengan koma. Header boleh bahasa Indonesia atau Inggris."
              action={csv.trim() ? (
                <button
                  type="button"
                  onClick={() => { applyCsv(''); if (fileRef.current) fileRef.current.value = ''; }}
                  className="text-xs font-medium text-[color:var(--hf-ink-muted)] hover:text-[color:var(--hf-danger)]"
                >
                  Reset
                </button>
              ) : null}
            >
              <div
                onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                onDrop={onDrop}
                className={`rounded-[var(--hf-radius-lg)] border-2 border-dashed px-4 py-8 text-center transition-colors ${
                  dragOver
                    ? 'border-[var(--hf-brand-600)] bg-[var(--hf-brand-50)]'
                    : 'border-[var(--hf-border)] bg-[var(--hf-surface-muted)]/40'
                }`}
              >
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--hf-border)] bg-white shadow-[var(--hf-shadow)]">
                  <Upload className="h-5 w-5 text-[color:var(--hf-brand-600)]" />
                </div>
                <p className="text-sm font-semibold text-[color:var(--hf-ink)]">Tarik file ke sini, atau pilih dari perangkat</p>
                <p className="mt-1 text-xs text-[color:var(--hf-ink-muted)]">.csv · UTF-8 · maksimal {formatBytes(MAX_BYTES)}</p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <label className="hf-btn-primary inline-flex cursor-pointer items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" /> Pilih file CSV
                    <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" onChange={onFileInput} className="hidden" />
                  </label>
                  <button type="button" onClick={() => applyCsv(TEMPLATE, { name: 'contoh-import.csv', size: TEMPLATE.length })} className="hf-btn-secondary inline-flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Isi contoh
                  </button>
                </div>
              </div>

              {fileMeta && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-white px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-[color:var(--hf-brand-600)]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[color:var(--hf-ink)]">{fileMeta.name}</p>
                      <p className="text-xs text-[color:var(--hf-ink-muted)]">{formatBytes(fileMeta.size)} · {rowsCount} baris data</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => applyCsv('')} className="rounded-[var(--hf-radius)] p-1 text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]" aria-label="Hapus file">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {csv.trim() && inspection.missing.length > 0 && (
                <p className="mt-3 flex items-start gap-2 text-xs text-[color:var(--hf-danger)]">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Header wajib belum lengkap: {inspection.missing.join(', ')}. Unduh template atau sesuaikan baris pertama.
                </p>
              )}

              {csv.trim() && !inspection.missing.length && (
                <p className="mt-3 text-xs text-[color:var(--hf-ink-muted)]">
                  {rowsCount} baris terdeteksi. Excel: simpan sebagai CSV (koma), bukan .xlsx.
                </p>
              )}

              <button
                type="button"
                onClick={() => setShowPaste((v) => !v)}
                className="mt-4 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline"
              >
                {showPaste ? 'Sembunyikan editor CSV' : 'Tempel atau sunting CSV'}
              </button>
              {showPaste && (
                <textarea
                  value={csv}
                  onChange={(e) => applyCsv(e.target.value, fileMeta)}
                  rows={10}
                  spellCheck={false}
                  placeholder={'name,email,position\nBudi Santoso,budi@perusahaan.com,Staff'}
                  className="hf-input mt-2 w-full font-mono text-xs"
                />
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy !== null || !csv.trim()}
                  onClick={() => run(true)}
                  className="hf-btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {busy === 'preview' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Pratinjau (validasi)
                </button>
                {!confirming ? (
                  <button
                    type="button"
                    disabled={busy !== null || !summary || importedOk || readyCount === 0}
                    onClick={() => setConfirming(true)}
                    className="hf-btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" /> Impor sekarang
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 rounded-[var(--hf-radius)] border border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)] px-3 py-1.5">
                    <span className="text-sm text-[color:var(--hf-brand-600)]">Impor {readyCount} karyawan?</span>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => run(false)}
                      className="hf-btn-primary inline-flex items-center gap-1.5 text-xs"
                    >
                      {busy === 'import' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Ya, impor
                    </button>
                    <button type="button" onClick={() => setConfirming(false)} className="hf-btn-secondary text-xs">Batal</button>
                  </div>
                )}
                {!summary && csv.trim() && (
                  <p className="text-xs text-[color:var(--hf-ink-faint)]">Validasi dulu sebelum menyimpan.</p>
                )}
              </div>
            </OpsPanel>

            <OpsPanel title="Kolom yang didukung" subtitle="Tiga kolom pertama wajib. Sisanya opsional.">
              <ul className="space-y-2">
                {COLUMNS.map((col) => (
                  <li key={col.key} className="flex items-start justify-between gap-3 rounded-[var(--hf-radius)] border border-[var(--hf-border-subtle)] px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-[color:var(--hf-ink)]">
                        {col.label}
                        {col.required && <span className="ml-1 text-[color:var(--hf-danger)]">*</span>}
                      </p>
                      <p className="text-[11px] text-[color:var(--hf-ink-faint)]">{col.hint}</p>
                    </div>
                    <code className="shrink-0 rounded-md bg-[var(--hf-surface-muted)] px-1.5 py-0.5 text-[10px] text-[color:var(--hf-ink-muted)]">{col.key}</code>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[color:var(--hf-ink-muted)]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Status kepegawaian: permanent, contract, daily_casual, labor, outsource, intern. Email yang sudah ada dilewati, bukan ditimpa.
              </p>
            </OpsPanel>
          </div>

          {summary && (
            <OpsPanel
              title={importedOk ? 'Hasil impor' : 'Hasil pratinjau'}
              subtitle={importedOk ? 'Baris yang lolos sudah masuk database karyawan.' : 'Belum ada data yang disimpan. Perbaiki baris bermasalah, lalu impor.'}
              action={importedOk ? (
                <Link href="/humanify/employees" className="hf-btn-primary inline-flex items-center gap-2 text-sm">
                  Lihat karyawan <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <OpsKpiShell>
                  <HRStatCard icon={ListChecks} label="Total baris" value={summary.total} accent="violet" />
                </OpsKpiShell>
                <OpsKpiShell>
                  <HRStatCard
                    icon={CheckCircle2}
                    label={importedOk ? 'Diimpor' : 'Siap impor'}
                    value={importedOk ? summary.imported : readyCount}
                    accent="emerald"
                    onClick={() => setResultFilter('ok')}
                  />
                </OpsKpiShell>
                <OpsKpiShell>
                  <HRStatCard icon={AlertTriangle} label="Dilewati" value={summary.skipped} accent="amber" onClick={() => setResultFilter('issues')} />
                </OpsKpiShell>
                <OpsKpiShell>
                  <HRStatCard icon={ShieldAlert} label="Tidak valid" value={summary.invalid} accent="rose" onClick={() => setResultFilter('issues')} />
                </OpsKpiShell>
              </div>

              {summary.seat && (
                <p className="mt-3 text-xs text-[color:var(--hf-ink-muted)]">
                  Kuota seat paket {summary.seat.planId}: {summary.seat.employees}/{summary.seat.maxEmployees} terpakai
                  {' '}(sisa {summary.seat.remaining}).
                </p>
              )}

              {importedOk && summary.imported > 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-[var(--hf-radius)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{summary.imported} karyawan berhasil ditambahkan.{summary.skipped ? ` ${summary.skipped} baris dilewati.` : ''} Portal ESS dapat diaktifkan dari database karyawan.</span>
                </div>
              )}

              {!importedOk && readyCount > 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-[var(--hf-radius)] border border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)] px-4 py-3 text-sm text-[color:var(--hf-brand-600)]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Pratinjau OK. Klik <strong>Impor sekarang</strong> untuk menyimpan {readyCount} karyawan. Baris bermasalah tidak ikut masuk.</span>
                </div>
              )}

              {summary.results.length > 0 && (
                <div className="mt-4 space-y-3">
                  <EnterpriseTabBar
                    tabs={[
                      { key: 'all', label: 'Semua', count: summary.results.length },
                      { key: 'ok', label: importedOk ? 'Berhasil' : 'Siap', icon: CheckCircle2, count: readyCount || undefined },
                      { key: 'issues', label: 'Masalah', icon: AlertTriangle, count: issueCount || undefined },
                    ]}
                    active={resultFilter}
                    onChange={setResultFilter}
                  />
                  <div className="hf-table-wrap overflow-x-auto">
                    <table>
                      <thead>
                        <tr>
                          <th>Baris</th>
                          <th>Nama</th>
                          <th>Email</th>
                          <th>Status</th>
                          <th>Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResults.slice(0, 100).map((r, i) => (
                          <tr key={`${r.line}-${i}`}>
                            <td className="tabular-nums text-[color:var(--hf-ink-muted)]">{r.line}</td>
                            <td>{r.name || '—'}</td>
                            <td>{r.email || '—'}</td>
                            <td>
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABEL[r.status]?.className || 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'}`}>
                                {STATUS_LABEL[r.status]?.label || r.status}
                              </span>
                            </td>
                            <td className="text-[color:var(--hf-ink-muted)]">{r.reason || (r.status === 'ok' ? (importedOk ? 'Tersimpan' : 'Akan diimpor') : '—')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredResults.length > 100 && (
                    <p className="text-xs text-[color:var(--hf-ink-faint)]">Menampilkan 100 dari {filteredResults.length} baris.</p>
                  )}
                </div>
              )}
            </OpsPanel>
          )}
        </OpsStage>
      </HumanifyLayout>
    </PageGuard>
  );
}
