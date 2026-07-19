import { useCallback, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

const TEMPLATE = `name,email,phone,position,department,workLocation,employmentCategory,joinDate,baseSalary
Budi Santoso,budi@contoh.com,08123456789,Staff Operasional,OPERATIONS,HQ,permanent,2026-01-15,6500000
Siti Aminah,siti@contoh.com,08129876543,HR Officer,HR,HQ,contract,2026-02-01,7500000`;

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  ok: { label: 'Siap / berhasil', tone: 'text-emerald-700 bg-emerald-50' },
  invalid: { label: 'Tidak valid', tone: 'text-red-700 bg-red-50' },
  duplicate_file: { label: 'Duplikat di file', tone: 'text-amber-700 bg-amber-50' },
  exists: { label: 'Sudah terdaftar', tone: 'text-amber-700 bg-amber-50' },
  seat_limit: { label: 'Melebihi kuota', tone: 'text-orange-700 bg-orange-50' },
};

export default function EmployeesImportPage() {
  const { status } = useSession();
  const router = useRouter();
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState<'preview' | 'import' | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [wasDryRun, setWasDryRun] = useState(true);

  const rowsCount = useMemo(() => csv.trim() ? csv.trim().split(/\r?\n/).length - 1 : 0, [csv]);

  const run = useCallback(async (dryRun: boolean) => {
    if (!csv.trim()) { toast.error('Tempel atau unggah CSV dulu'); return; }
    setBusy(dryRun ? 'preview' : 'import');
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
      if (dryRun) toast.success('Pratinjau selesai');
      else toast.success(`${j.data.imported} karyawan diimpor`);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memproses');
    } finally {
      setBusy(null);
    }
  }, [csv]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCsv(String(reader.result || '')); setSummary(null); };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'template-import-karyawan.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') router.replace(`${HUMANIFY_BRAND.loginPath}?callbackUrl=/humanify/employees-import`);
    return null;
  }

  return (
    <>
      <Head>
        <title>Impor Karyawan — {HUMANIFY_BRAND.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <HumanifyLayout title="Impor Karyawan Massal" subtitle="Unggah CSV untuk menambahkan banyak karyawan sekaligus">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[color:var(--hf-brand-600)]" /> Data CSV
              </h3>
              <div className="flex items-center gap-2">
                <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1.5 text-sm text-[color:var(--hf-brand-600)] hover:underline">
                  <Download className="w-4 h-4" /> Template
                </button>
                <label className="inline-flex items-center gap-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-slate-50">
                  <Upload className="w-4 h-4" /> Unggah file
                  <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
                </label>
              </div>
            </div>

            <textarea
              value={csv}
              onChange={(e) => { setCsv(e.target.value); setSummary(null); }}
              rows={10}
              placeholder={TEMPLATE}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
            />
            <p className="text-xs text-slate-400">
              Kolom didukung: name, email, phone, position, department, workLocation, employmentCategory, joinDate, baseSalary
              (header id/en fleksibel). {rowsCount > 0 ? `${rowsCount} baris terdeteksi.` : ''}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                {busy === 'preview' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Pratinjau (validasi)
              </button>
              <button
                type="button"
                disabled={busy !== null || !summary}
                onClick={() => run(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--hf-brand-600)] text-white text-sm font-semibold hover:bg-[var(--hf-brand)] disabled:opacity-50"
              >
                {busy === 'import' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Impor sekarang
              </button>
            </div>
          </div>

          {summary && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                {wasDryRun ? <Eye className="w-4 h-4 text-slate-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                <h3 className="font-semibold text-slate-900">{wasDryRun ? 'Hasil pratinjau' : 'Hasil impor'}</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Total baris" value={summary.total} />
                <Stat label={wasDryRun ? 'Siap impor' : 'Diimpor'} value={wasDryRun ? summary.results.filter((r: any) => r.status === 'ok').length : summary.imported} tone="emerald" />
                <Stat label="Dilewati" value={summary.skipped} tone="amber" />
                <Stat label="Tidak valid" value={summary.invalid} tone="red" />
              </div>

              {summary.seat && (
                <p className="text-xs text-slate-500">
                  Kuota seat paket {summary.seat.planId}: {summary.seat.employees}/{summary.seat.maxEmployees} terpakai
                  {' '}(sisa {summary.seat.remaining}).
                </p>
              )}

              {summary.results.some((r: any) => r.status !== 'ok') && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b">
                        <th className="py-2 pr-3 font-medium">Baris</th>
                        <th className="py-2 pr-3 font-medium">Email</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 font-medium">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.results.filter((r: any) => r.status !== 'ok').slice(0, 100).map((r: any, i: number) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 pr-3 text-slate-500">{r.line}</td>
                          <td className="py-2 pr-3 text-slate-700">{r.email || '—'}</td>
                          <td className="py-2 pr-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_LABEL[r.status]?.tone || 'bg-slate-100 text-slate-600'}`}>
                              {STATUS_LABEL[r.status]?.label || r.status}
                            </span>
                          </td>
                          <td className="py-2 text-slate-500">{r.reason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {wasDryRun && summary.results.some((r: any) => r.status === 'ok') && (
                <div className="flex items-start gap-2 rounded-xl border border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)] px-4 py-3 text-sm text-[color:var(--hf-brand-600)]">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Pratinjau OK. Klik <strong>Impor sekarang</strong> untuk menyimpan {summary.results.filter((r: any) => r.status === 'ok').length} karyawan.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </HumanifyLayout>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  const color = tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : tone === 'red' ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
