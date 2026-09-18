/**
 * Inline page mockups for Humanify Knowledge Center guides.
 * Mimics real ops/ESS chrome so panduan punya "screenshot" visual tanpa aset PNG.
 */
import type { ReactNode } from 'react';
import {
  Search, Plus, Users, Calendar, Wallet, Clock, CheckCircle2,
  FileText, LifeBuoy, Building2, ChevronRight, Bell, Filter,
} from 'lucide-react';

export type KbMockupId =
  | 'dashboard'
  | 'employees'
  | 'employees-form'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'payroll-hub'
  | 'payroll-run'
  | 'payroll-main'
  | 'payroll-create'
  | 'payroll-review'
  | 'payroll-slip'
  | 'payroll-disbursement'
  | 'ess-home'
  | 'ess-leave'
  | 'mss-approvals'
  | 'support'
  | 'organization'
  | 'onboarding';

type MockupMeta = {
  id: KbMockupId;
  title: string;
  path: string;
  caption: string;
};

export const KB_MOCKUP_META: Record<KbMockupId, MockupMeta> = {
  dashboard: {
    id: 'dashboard',
    title: 'Beranda HR',
    path: '/humanify',
    caption: 'Ringkasan KPI tenant: karyawan aktif, kehadiran hari ini, cuti pending, payroll status.',
  },
  employees: {
    id: 'employees',
    title: 'Database Karyawan',
    path: '/humanify/employees',
    caption: 'Daftar karyawan dengan pencarian, filter departemen/status, dan aksi Tambah / Export.',
  },
  'employees-form': {
    id: 'employees-form',
    title: 'Form Tambah Karyawan',
    path: '/humanify/employees',
    caption: 'Form master data: identitas, kontak, departemen, join date, dan komponen gaji awal.',
  },
  attendance: {
    id: 'attendance',
    title: 'Absensi & Rekap',
    path: '/humanify/attendance',
    caption: 'Rekap kehadiran harian: hadir, telat, alpha — siap dihubungkan ke payroll.',
  },
  leave: {
    id: 'leave',
    title: 'Manajemen Cuti',
    path: '/humanify/leave',
    caption: 'Jenis cuti, kuota, dan antrian approval pengajuan karyawan.',
  },
  payroll: {
    id: 'payroll',
    title: 'Dasbor Payroll',
    path: '/humanify/payroll',
    caption: 'Hub payroll: KPI, run terakhir, dan pintasan ke Proses Gaji.',
  },
  'payroll-hub': {
    id: 'payroll-hub',
    title: 'Dasbor Payroll',
    path: '/humanify/payroll',
    caption: 'Halaman Dasbor Payroll — KPI karyawan/gaji + tabel run penggajian.',
  },
  'payroll-run': {
    id: 'payroll-run',
    title: 'Proses Gaji — Tab Run',
    path: '/humanify/payroll/main',
    caption: 'Tab Run di Proses Gaji: daftar run dan aksi Hitung / Setujui / Bayar.',
  },
  'payroll-main': {
    id: 'payroll-main',
    title: 'Proses Gaji',
    path: '/humanify/payroll/main',
    caption: 'Penggajian utama: tab Overview / Gaji / Run / Komponen.',
  },
  'payroll-create': {
    id: 'payroll-create',
    title: 'Buat Run Baru',
    path: '/humanify/payroll/main',
    caption: 'Modal buat run: nama, periode, tanggal bayar, tipe bayar.',
  },
  'payroll-review': {
    id: 'payroll-review',
    title: 'Review Hasil Hitung',
    path: '/humanify/payroll/main',
    caption: 'Setelah Calculate: total gross, potongan, THP, dan daftar slip draft.',
  },
  'payroll-slip': {
    id: 'payroll-slip',
    title: 'Slip Gaji',
    path: '/humanify/payroll/slip-gaji',
    caption: 'Riwayat slip per karyawan setelah run Disetujui / Dibayar.',
  },
  'payroll-disbursement': {
    id: 'payroll-disbursement',
    title: 'Transfer Bank',
    path: '/humanify/payroll/disbursement',
    caption: 'Export file disbursement BCA / Mandiri / CSV sebelum Mark Paid.',
  },
  'ess-home': {
    id: 'ess-home',
    title: 'Portal ESS',
    path: '/employee',
    caption: 'Beranda karyawan: clock, cuti, slip, klaim, dan notifikasi.',
  },
  'ess-leave': {
    id: 'ess-leave',
    title: 'Ajukan Cuti (ESS)',
    path: '/employee',
    caption: 'Form pengajuan cuti mandiri: jenis, tanggal, alasan, lampiran.',
  },
  'mss-approvals': {
    id: 'mss-approvals',
    title: 'Approval MSS',
    path: '/humanify/mss',
    caption: 'Antrian approval manajer: cuti, klaim, dan permintaan tim.',
  },
  support: {
    id: 'support',
    title: 'Tiket Support',
    path: '/humanify/support',
    caption: 'Buat tiket ke tim Humanify: kategori, prioritas, dan thread balasan.',
  },
  organization: {
    id: 'organization',
    title: 'Struktur Organisasi',
    path: '/humanify/organization',
    caption: 'Unit organisasi, departemen, dan golongan jabatan sebagai master data.',
  },
  onboarding: {
    id: 'onboarding',
    title: 'Onboarding',
    path: '/humanify/onboarding',
    caption: 'Checklist tugas onboarding karyawan baru hingga siap absensi & payroll.',
  },
};

function Chrome({
  title,
  path,
  accent = 'ops',
  children,
}: {
  title: string;
  path: string;
  accent?: 'ops' | 'ess';
  children: ReactNode;
}) {
  const bar = accent === 'ess' ? 'bg-teal-700' : 'bg-[var(--hf-brand-600,#6d28d9)]';
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100/80 overflow-hidden shadow-sm">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-200/80 border-b border-slate-300/60">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 flex-1 truncate rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-mono text-slate-500">
          humanify.id{path}
        </span>
      </div>
      <div className="flex min-h-[200px]">
        <aside className={`hidden sm:flex w-[72px] shrink-0 flex-col gap-2 p-2 ${bar} text-white/90`}>
          <div className="mb-2 truncate px-1 text-[9px] font-bold tracking-wide opacity-90">
            {accent === 'ess' ? 'ESS' : 'HF'}
          </div>
          {[Users, Clock, Calendar, Wallet, FileText].map((Icon, i) => (
            <div
              key={i}
              className={`flex h-8 items-center justify-center rounded-md ${i === 0 ? 'bg-white/20' : 'opacity-60'}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
          ))}
        </aside>
        <div className="flex-1 bg-[var(--hf-surface,#f8fafc)] p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Humanify</p>
              <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
            </div>
            <Bell className="h-3.5 w-3.5 text-slate-400" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function Pill({ children, tone = 'muted' }: { children: ReactNode; tone?: 'brand' | 'ok' | 'warn' | 'muted' }) {
  const cls =
    tone === 'brand'
      ? 'bg-[var(--hf-brand-50,#f5f3ff)] text-[color:var(--hf-brand-600,#6d28d9)]'
      : tone === 'ok'
        ? 'bg-emerald-50 text-emerald-700'
        : tone === 'warn'
          ? 'bg-amber-50 text-amber-700'
          : 'bg-slate-100 text-slate-600';
  return <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${cls}`}>{children}</span>;
}

function MockBody({ id }: { id: KbMockupId }) {
  switch (id) {
    case 'dashboard':
      return (
        <Chrome title="Beranda" path="/humanify">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['128', 'Karyawan aktif'],
              ['94%', 'Kehadiran'],
              ['7', 'Cuti pending'],
              ['Draft', 'Payroll Mar'],
            ].map(([v, l]) => (
              <div key={l} className="rounded-lg border border-slate-200 bg-white p-2">
                <p className="text-sm font-bold text-slate-900">{v}</p>
                <p className="text-[9px] text-slate-500">{l}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
            <p className="mb-1 text-[10px] font-medium text-slate-700">Aktivitas hari ini</p>
            <div className="space-y-1">
              {['Clock-in 08:02 — Andi', 'Cuti disetujui — Sari', 'Run draft dibuat'].map((t) => (
                <div key={t} className="flex items-center gap-1.5 text-[9px] text-slate-600">
                  <ChevronRight className="h-3 w-3 text-[color:var(--hf-brand-600,#6d28d9)]" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </Chrome>
      );

    case 'employees':
      return (
        <Chrome title="Database Karyawan" path="/humanify/employees">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <div className="relative min-w-[120px] flex-1">
              <Search className="absolute left-2 top-1.5 h-3 w-3 text-slate-400" />
              <div className="h-6 rounded-md border border-slate-200 bg-white pl-6 text-[9px] leading-6 text-slate-400">
                Cari nama / NIK…
              </div>
            </div>
            <div className="flex h-6 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[9px] text-slate-500">
              <Filter className="h-3 w-3" /> Semua dept
            </div>
            <div className="flex h-6 items-center gap-1 rounded-md bg-[var(--hf-brand-600,#6d28d9)] px-2 text-[9px] font-medium text-white">
              <Plus className="h-3 w-3" /> Tambah
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="grid grid-cols-4 gap-1 border-b border-slate-100 bg-slate-50 px-2 py-1 text-[8px] font-semibold uppercase text-slate-500">
              <span>Nama</span>
              <span>Dept</span>
              <span>Status</span>
              <span>Join</span>
            </div>
            {[
              ['Budi Santoso', 'Ops', 'Aktif', '12 Jan 24'],
              ['Sari Wijaya', 'HR', 'Aktif', '03 Mar 24'],
              ['Andi Pratama', 'Sales', 'Cuti', '18 Jun 23'],
            ].map((row) => (
              <div key={row[0]} className="grid grid-cols-4 gap-1 border-b border-slate-50 px-2 py-1.5 text-[9px] text-slate-700 last:border-0">
                <span className="font-medium truncate">{row[0]}</span>
                <span>{row[1]}</span>
                <span><Pill tone={row[2] === 'Cuti' ? 'warn' : 'ok'}>{row[2]}</Pill></span>
                <span className="text-slate-500">{row[3]}</span>
              </div>
            ))}
          </div>
        </Chrome>
      );

    case 'employees-form':
      return (
        <Chrome title="Tambah Karyawan" path="/humanify/employees">
          <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Nama lengkap *', 'Budi Santoso'],
                ['Email kerja *', 'budi@demo.co'],
                ['Departemen *', 'Operations'],
                ['Tanggal bergabung *', '18 Sep 2026'],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="mb-0.5 text-[8px] font-medium text-slate-500">{l}</p>
                  <div className="h-6 rounded-md border border-slate-200 bg-slate-50 px-2 text-[9px] leading-6 text-slate-800">
                    {v}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-1.5 pt-1">
              <div className="h-6 rounded-md border border-slate-200 px-2 text-[9px] leading-6 text-slate-600">Batal</div>
              <div className="h-6 rounded-md bg-[var(--hf-brand-600,#6d28d9)] px-2 text-[9px] font-medium leading-6 text-white">
                Simpan karyawan
              </div>
            </div>
          </div>
        </Chrome>
      );

    case 'attendance':
      return (
        <Chrome title="Absensi" path="/humanify/attendance">
          <div className="mb-2 flex gap-2">
            {['Hadir 112', 'Telat 8', 'Alpha 3'].map((t, i) => (
              <div key={t} className="flex-1 rounded-lg border border-slate-200 bg-white p-2 text-center">
                <p className={`text-sm font-bold ${i === 2 ? 'text-red-600' : i === 1 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {t.split(' ')[1]}
                </p>
                <p className="text-[8px] text-slate-500">{t.split(' ')[0]}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            {[
              ['08:01', 'Budi', 'On time'],
              ['08:17', 'Rina', 'Telat'],
              ['—', 'Dedi', 'Alpha'],
            ].map(([t, n, s]) => (
              <div key={n} className="flex items-center justify-between border-b border-slate-50 px-2 py-1.5 text-[9px] last:border-0">
                <span className="font-mono text-slate-500 w-10">{t}</span>
                <span className="flex-1 font-medium text-slate-800">{n}</span>
                <Pill tone={s === 'On time' ? 'ok' : s === 'Telat' ? 'warn' : 'muted'}>{s}</Pill>
              </div>
            ))}
          </div>
        </Chrome>
      );

    case 'leave':
      return (
        <Chrome title="Manajemen Cuti" path="/humanify/leave">
          <div className="mb-2 flex flex-wrap gap-1">
            <Pill tone="brand">Annual</Pill>
            <Pill>Sick</Pill>
            <Pill>Unpaid</Pill>
            <div className="ml-auto flex h-5 items-center gap-1 rounded-md bg-[var(--hf-brand-600,#6d28d9)] px-1.5 text-[8px] text-white">
              <Plus className="h-2.5 w-2.5" /> Jenis cuti
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            {[
              ['Sari Wijaya', 'Annual', '20–22 Sep', 'Pending'],
              ['Andi Pratama', 'Sick', '18 Sep', 'Approved'],
            ].map(([n, t, d, s]) => (
              <div key={n + d} className="flex items-center gap-2 border-b border-slate-50 px-2 py-1.5 text-[9px] last:border-0">
                <span className="flex-1 font-medium truncate">{n}</span>
                <span className="text-slate-500">{t}</span>
                <span className="text-slate-500">{d}</span>
                <Pill tone={s === 'Pending' ? 'warn' : 'ok'}>{s}</Pill>
              </div>
            ))}
          </div>
        </Chrome>
      );

    case 'payroll':
    case 'payroll-hub':
      return (
        <Chrome title="Dasbor Payroll" path="/humanify/payroll">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 mb-2">
            {[
              ['128', 'Karyawan aktif'],
              ['96%', 'Cakupan gaji'],
              ['Rp 1,1 M', 'Gaji pokok / bln'],
              ['PR-2603', 'Run terakhir'],
            ].map(([v, l]) => (
              <div key={l} className="rounded-lg border border-slate-200 bg-white p-2">
                <p className="text-[11px] font-bold text-slate-900 truncate">{v}</p>
                <p className="text-[8px] text-slate-500">{l}</p>
              </div>
            ))}
          </div>
          <div className="mb-2 rounded-lg border border-slate-200 bg-white p-2">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[9px] font-semibold text-slate-800">Run penggajian</p>
              <span className="text-[8px] font-medium text-[color:var(--hf-brand-600,#6d28d9)]">Buka proses gaji →</span>
            </div>
            <div className="overflow-hidden rounded border border-slate-100">
              <div className="grid grid-cols-5 gap-1 bg-slate-50 px-1.5 py-1 text-[7px] font-semibold uppercase text-slate-500">
                <span>Kode</span><span>Periode</span><span className="text-right">THP</span><span>Status</span><span />
              </div>
              {[
                ['PR-2603', '1–31 Mar', 'Rp 1,24 M', 'Draf'],
                ['PR-2602', '1–28 Feb', 'Rp 1,18 M', 'Dibayar'],
              ].map((r) => (
                <div key={r[0]} className="grid grid-cols-5 gap-1 border-t border-slate-50 px-1.5 py-1 text-[8px] text-slate-700">
                  <span className="font-medium">{r[0]}</span>
                  <span className="text-slate-500">{r[1]}</span>
                  <span className="text-right tabular-nums">{r[2]}</span>
                  <span><Pill tone={r[3] === 'Draf' ? 'warn' : 'ok'}>{r[3]}</Pill></span>
                  <span className="text-right text-[color:var(--hf-brand-600,#6d28d9)]">Detail</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {['Penggajian utama', 'Slip gaji', 'Transfer bank', 'PPh 21', 'BPJS'].map((m) => (
              <span key={m} className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[8px] text-slate-600">{m}</span>
            ))}
          </div>
        </Chrome>
      );

    case 'payroll-main':
    case 'payroll-run':
      return (
        <Chrome title="Proses Gaji" path="/humanify/payroll/main">
          <div className="mb-2 flex gap-1 overflow-x-auto border-b border-slate-200 pb-1">
            {['Overview', 'Gaji karyawan', 'Run', 'Komponen'].map((t, i) => (
              <span
                key={t}
                className={`shrink-0 rounded-md px-2 py-1 text-[8px] font-medium ${
                  i === 2
                    ? 'bg-[var(--hf-brand-600,#6d28d9)] text-white'
                    : 'text-slate-500'
                }`}
              >
                {t}
              </span>
            ))}
          </div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[9px] font-semibold text-slate-800">Daftar run penggajian</p>
            <div className="flex h-5 items-center gap-1 rounded-md bg-[var(--hf-brand-600,#6d28d9)] px-2 text-[8px] font-medium text-white">
              <Plus className="h-2.5 w-2.5" /> Buat run
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="grid grid-cols-6 gap-1 border-b border-slate-100 bg-slate-50 px-2 py-1 text-[7px] font-semibold uppercase text-slate-500">
              <span>Kode</span><span>Nama</span><span>Periode</span><span className="text-right">Karyawan</span><span className="text-right">Net</span><span>Status</span>
            </div>
            {[
              ['PR-2603', 'Gaji Mar 2026', '01–31 Mar', '128', 'Rp 1,24 M', 'Draf'],
              ['PR-2602', 'Gaji Feb 2026', '01–28 Feb', '126', 'Rp 1,18 M', 'Dibayar'],
            ].map((r) => (
              <div key={r[0]} className="grid grid-cols-6 gap-1 border-b border-slate-50 px-2 py-1.5 text-[8px] last:border-0">
                <span className="font-medium text-slate-800">{r[0]}</span>
                <span className="truncate text-slate-600">{r[1]}</span>
                <span className="text-slate-500">{r[2]}</span>
                <span className="text-right">{r[3]}</span>
                <span className="text-right tabular-nums">{r[4]}</span>
                <span><Pill tone={r[5] === 'Draf' ? 'warn' : 'ok'}>{r[5]}</Pill></span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {['Hitung', 'Setujui', 'Tandai dibayar'].map((a, i) => (
              <span
                key={a}
                className={`rounded-md px-2 py-0.5 text-[8px] font-medium ${
                  i === 0
                    ? 'bg-[var(--hf-brand-600,#6d28d9)] text-white'
                    : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                {a}
              </span>
            ))}
          </div>
        </Chrome>
      );

    case 'payroll-create':
      return (
        <Chrome title="Proses Gaji" path="/humanify/payroll/main">
          <div className="rounded-lg border border-slate-300 bg-white p-3 shadow-md space-y-2 relative">
            <div className="absolute -top-2 left-3 rounded bg-[var(--hf-brand-600,#6d28d9)] px-1.5 py-0.5 text-[7px] font-semibold uppercase text-white">
              Modal · Buat run baru
            </div>
            <p className="text-[10px] font-semibold text-slate-900 pt-1">Buat run penggajian</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Nama run *', 'Gaji Maret 2026'],
                ['Tipe bayar', 'Bulanan'],
                ['Periode mulai *', '2026-03-01'],
                ['Periode akhir *', '2026-03-31'],
                ['Tanggal bayar *', '2026-03-28'],
                ['Catatan', 'Closing Maret'],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="mb-0.5 text-[7px] font-medium text-slate-500">{l}</p>
                  <div className="h-5 rounded border border-slate-200 bg-slate-50 px-1.5 text-[8px] leading-5 text-slate-800">{v}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-1.5 pt-1">
              <div className="h-5 rounded border border-slate-200 px-2 text-[8px] leading-5 text-slate-600">Batal</div>
              <div className="h-5 rounded bg-[var(--hf-brand-600,#6d28d9)] px-2 text-[8px] font-medium leading-5 text-white">Buat run</div>
            </div>
          </div>
        </Chrome>
      );

    case 'payroll-review':
      return (
        <Chrome title="Detail Run PR-2603" path="/humanify/payroll/main">
          <div className="mb-2 flex flex-wrap items-center gap-1">
            {['Draf', 'Dihitung', 'Disetujui', 'Dibayar'].map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[7px] font-medium ${i <= 1 ? 'bg-[var(--hf-brand-600,#6d28d9)] text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {i <= 1 && '✓ '}{s}
                </span>
                {i < 3 && <ChevronRight className="h-3 w-3 text-slate-300" />}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {[
              ['Gross', 'Rp 1,52 M'],
              ['Potongan', 'Rp 280 jt'],
              ['THP (net)', 'Rp 1,24 M'],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-slate-200 bg-white p-2 text-center">
                <p className="text-[8px] text-slate-500">{l}</p>
                <p className="text-[10px] font-bold text-slate-900">{v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-2 py-1 text-[8px] font-semibold text-slate-600">
              Preview slip (draft) — cek outlier sebelum Setujui
            </div>
            {[
              ['Budi Santoso', 'Rp 9.850.000', 'OK'],
              ['Sari Wijaya', 'Rp 8.120.000', 'OK'],
              ['Rina Kartika', 'Rp 0', '⚠ Cek gaji'],
            ].map(([n, thp, st]) => (
              <div key={n} className="flex items-center justify-between border-b border-slate-50 px-2 py-1.5 text-[8px] last:border-0">
                <span className="font-medium text-slate-800">{n}</span>
                <span className="tabular-nums text-slate-600">{thp}</span>
                <Pill tone={st.includes('Cek') ? 'warn' : 'ok'}>{st}</Pill>
              </div>
            ))}
          </div>
        </Chrome>
      );

    case 'payroll-slip':
      return (
        <Chrome title="Slip Gaji" path="/humanify/payroll/slip-gaji">
          <div className="mb-2 flex gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1.5 h-3 w-3 text-slate-400" />
              <div className="h-6 rounded-md border border-slate-200 bg-white pl-6 text-[8px] leading-6 text-slate-400">Cari karyawan…</div>
            </div>
            <div className="h-6 rounded-md border border-slate-200 bg-white px-2 text-[8px] leading-6 text-slate-600">Mar 2026</div>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {[
              ['Budi Santoso', 'PR-2603', 'Rp 9.850.000'],
              ['Sari Wijaya', 'PR-2603', 'Rp 8.120.000'],
            ].map(([n, run, thp]) => (
              <div key={n} className="flex items-center gap-2 border-b border-slate-50 px-2 py-1.5 text-[8px] last:border-0">
                <FileText className="h-3 w-3 text-[color:var(--hf-brand-600,#6d28d9)]" />
                <span className="flex-1 font-medium">{n}</span>
                <span className="text-slate-400">{run}</span>
                <span className="tabular-nums font-medium">{thp}</span>
                <span className="text-[color:var(--hf-brand-600,#6d28d9)]">Unduh</span>
              </div>
            ))}
          </div>
        </Chrome>
      );

    case 'payroll-disbursement':
      return (
        <Chrome title="Transfer Bank" path="/humanify/payroll/disbursement">
          <div className="mb-2 rounded-lg border border-slate-200 bg-white p-2">
            <p className="text-[9px] font-semibold text-slate-800 mb-1">Export disbursement — PR-2603</p>
            <div className="flex flex-wrap gap-1.5">
              {['BCA Labas', 'Mandiri CSV', 'Generic CSV'].map((b) => (
                <span key={b} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[8px] text-slate-700">{b}</span>
              ))}
            </div>
          </div>
          <div className="flex h-6 items-center justify-center rounded-md bg-[var(--hf-brand-600,#6d28d9)] text-[9px] font-medium text-white">
            Unduh file transfer
          </div>
          <p className="mt-1.5 text-[8px] text-slate-500 text-center">Setelah transfer sukses → kembali ke Proses Gaji → Tandai dibayar</p>
        </Chrome>
      );

    case 'ess-home':
      return (
        <Chrome title="Beranda Karyawan" path="/employee" accent="ess">
          <div className="mb-2 rounded-lg bg-teal-700 p-3 text-white">
            <p className="text-[10px] opacity-80">Selamat pagi</p>
            <p className="text-sm font-semibold">Budi Santoso</p>
            <div className="mt-2 flex gap-1.5">
              <div className="flex-1 rounded-md bg-white/15 py-1.5 text-center text-[9px] font-medium">Clock-in</div>
              <div className="flex-1 rounded-md bg-white/15 py-1.5 text-center text-[9px] font-medium">Ajukan cuti</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {['Slip gaji', 'Klaim', 'Dokumen'].map((t) => (
              <div key={t} className="rounded-lg border border-slate-200 bg-white py-2 text-center text-[9px] text-slate-700">
                {t}
              </div>
            ))}
          </div>
        </Chrome>
      );

    case 'ess-leave':
      return (
        <Chrome title="Ajukan Cuti" path="/employee" accent="ess">
          <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
            {[
              ['Jenis cuti', 'Cuti tahunan (sisa 8 hari)'],
              ['Tanggal', '20 Sep – 22 Sep 2026'],
              ['Alasan', 'Liburan keluarga'],
            ].map(([l, v]) => (
              <div key={l}>
                <p className="mb-0.5 text-[8px] font-medium text-slate-500">{l}</p>
                <div className="h-6 rounded-md border border-slate-200 bg-slate-50 px-2 text-[9px] leading-6 text-slate-800">
                  {v}
                </div>
              </div>
            ))}
            <div className="flex h-6 items-center justify-center rounded-md bg-teal-700 text-[9px] font-medium text-white">
              Kirim pengajuan
            </div>
          </div>
        </Chrome>
      );

    case 'mss-approvals':
      return (
        <Chrome title="Approval Tim" path="/humanify/mss">
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[9px] text-amber-800">
            <LifeBuoy className="h-3 w-3" /> 3 permintaan menunggu keputusan Anda
          </div>
          <div className="space-y-1.5">
            {[
              ['Cuti — Sari', '20–22 Sep'],
              ['Klaim — Rina', 'Rp 250.000'],
            ].map(([t, d]) => (
              <div key={t} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                <div className="flex-1">
                  <p className="text-[9px] font-semibold text-slate-800">{t}</p>
                  <p className="text-[8px] text-slate-500">{d}</p>
                </div>
                <div className="rounded border border-slate-200 px-1.5 py-0.5 text-[8px] text-slate-600">Tolak</div>
                <div className="rounded bg-emerald-600 px-1.5 py-0.5 text-[8px] text-white">Setujui</div>
              </div>
            ))}
          </div>
        </Chrome>
      );

    case 'support':
      return (
        <Chrome title="Tiket Support" path="/humanify/support">
          <div className="mb-2 flex gap-2">
            {[['4', 'Open'], ['2', 'Progress'], ['11', 'Resolved']].map(([n, l]) => (
              <div key={l} className="flex-1 rounded-lg border border-slate-200 bg-white p-2 text-center">
                <p className="text-sm font-bold text-slate-900">{n}</p>
                <p className="text-[8px] text-slate-500">{l}</p>
              </div>
            ))}
          </div>
          <div className="flex h-6 items-center justify-center rounded-md bg-[var(--hf-brand-600,#6d28d9)] text-[9px] font-medium text-white">
            <Plus className="mr-1 h-3 w-3" /> Buat tiket baru
          </div>
        </Chrome>
      );

    case 'organization':
      return (
        <Chrome title="Struktur Organisasi" path="/humanify/organization">
          <div className="grid grid-cols-2 gap-2 mb-2">
            {[
              ['12', 'Unit'],
              ['8', 'Golongan'],
              ['128', 'Karyawan'],
              ['6', 'Departemen'],
            ].map(([n, l]) => (
              <div key={l} className="rounded-lg border border-slate-200 bg-white p-2 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-[color:var(--hf-brand-600,#6d28d9)]" />
                <div>
                  <p className="text-sm font-bold text-slate-900">{n}</p>
                  <p className="text-[8px] text-slate-500">{l}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-center text-[9px] text-slate-500">
            HQ → Ops → Cabang Jakarta → Tim Field
          </div>
        </Chrome>
      );

    case 'onboarding':
      return (
        <Chrome title="Onboarding" path="/humanify/onboarding">
          <div className="rounded-lg border border-slate-200 bg-white p-2 mb-2">
            <p className="text-[9px] font-semibold text-slate-800">Budi Santoso — Progress 60%</p>
            <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full w-3/5 rounded-full bg-[var(--hf-brand-600,#6d28d9)]" />
            </div>
          </div>
          <div className="space-y-1">
            {[
              ['Upload KTP/NPWP', true],
              ['Kontrak ditandatangani', true],
              ['Assign shift & device', false],
              ['Undang akun ESS', false],
            ].map(([t, done]) => (
              <div key={String(t)} className="flex items-center gap-2 rounded-md border border-slate-100 bg-white px-2 py-1 text-[9px]">
                <CheckCircle2 className={`h-3 w-3 ${done ? 'text-emerald-500' : 'text-slate-300'}`} />
                <span className={done ? 'text-slate-500 line-through' : 'text-slate-800'}>{t as string}</span>
              </div>
            ))}
          </div>
        </Chrome>
      );

    default:
      return null;
  }
}

export function resolveMockupId(raw: string): KbMockupId | null {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  if (key in KB_MOCKUP_META) return key as KbMockupId;
  const aliases: Record<string, KbMockupId> = {
    karyawan: 'employees',
    employee: 'employees',
    'tambah-karyawan': 'employees-form',
    form: 'employees-form',
    absensi: 'attendance',
    kehadiran: 'attendance',
    cuti: 'leave',
    gaji: 'payroll',
    dasbor: 'payroll-hub',
    hub: 'payroll-hub',
    'proses-gaji': 'payroll-main',
    main: 'payroll-main',
    'buat-run': 'payroll-create',
    create: 'payroll-create',
    review: 'payroll-review',
    hitung: 'payroll-review',
    slip: 'payroll-slip',
    'slip-gaji': 'payroll-slip',
    disbursement: 'payroll-disbursement',
    transfer: 'payroll-disbursement',
    bank: 'payroll-disbursement',
    'proses-gaji-run': 'payroll-run',
    run: 'payroll-run',
    ess: 'ess-home',
    portal: 'ess-home',
    'ajukan-cuti': 'ess-leave',
    mss: 'mss-approvals',
    approval: 'mss-approvals',
    tiket: 'support',
    org: 'organization',
    struktur: 'organization',
    beranda: 'dashboard',
    home: 'dashboard',
  };
  return aliases[key] || null;
}

export default function KbPageMockup({
  id,
  caption,
  className = '',
}: {
  id: string;
  caption?: string;
  className?: string;
}) {
  const resolved = resolveMockupId(id);
  if (!resolved) {
    return (
      <div className="mb-4 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Mockup tidak dikenali: <code className="font-mono">{id}</code>
      </div>
    );
  }
  const meta = KB_MOCKUP_META[resolved];
  const note = (caption || '').trim() || meta.caption;

  return (
    <figure className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className || 'mb-5'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[var(--hf-brand-50,#f5f3ff)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--hf-brand-600,#6d28d9)]">
            Screenshot halaman
          </span>
          <span className="text-xs font-medium text-slate-800">{meta.title}</span>
        </div>
        <code className="text-[10px] font-mono text-slate-500">{meta.path}</code>
      </div>
      <div className="p-3 sm:p-4">
        <MockBody id={resolved} />
      </div>
      <figcaption className="border-t border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
        {note}
      </figcaption>
    </figure>
  );
}
