import { useState, useEffect } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import { PageGuard } from '@/components/permissions';
import {
  DollarSign, Users, FileText, Clock, Calculator, Layers, CreditCard,
  Gift, Shield, BarChart3, TrendingUp, ChevronRight, ArrowLeft,
  Banknote, Percent, Building2, CheckCircle, Wallet, Calendar, RefreshCw,
} from 'lucide-react';

const fmtCurrency = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

const PAYROLL_INPUT_MODULES = [
  { key: 'attendance', label: 'Shift / Absensi', href: '/humanify/attendance', icon: Clock, color: 'text-green-600' },
  { key: 'leave', label: 'Cuti', href: '/humanify/leave', icon: Calendar, color: 'text-blue-600' },
  { key: 'overtime', label: 'Lembur', href: '/humanify/payroll/lembur', icon: Clock, color: 'text-orange-600' },
  { key: 'reimbursement', label: 'Reimbursement', href: '/humanify/reimbursement', icon: Wallet, color: 'text-emerald-600' },
  { key: 'bonus', label: 'Bonus', href: '/humanify/payroll/bonus', icon: Gift, color: 'text-pink-600' },
  { key: 'cash-advance', label: 'Kasbon', href: '/humanify/payroll/cash-advance', icon: Wallet, color: 'text-amber-600' },
  { key: 'loan', label: 'Pinjaman', href: '/humanify/payroll/loan', icon: CreditCard, color: 'text-red-600' },
  { key: 'thr', label: 'THR', href: '/humanify/payroll/thr', icon: Gift, color: 'text-purple-600' },
];

const PAYROLL_MODULES = [
  { key: 'main', label: 'Penggajian Utama', desc: 'Proses penggajian, konfigurasi gaji, komponen gaji, dan impor data', href: '/humanify/payroll/main', icon: Calculator, color: 'bg-blue-500', badge: 'Core' },
  { key: 'slip-gaji', label: 'Slip Gaji', desc: 'Riwayat slip gaji karyawan, detail pendapatan dan potongan', href: '/humanify/payroll/slip-gaji', icon: FileText, color: 'bg-green-500', badge: '' },
  { key: 'thr', label: 'THR (Tunjangan Hari Raya)', desc: 'Perhitungan dan manajemen THR sesuai PP No. 36/2021', href: '/humanify/payroll/thr', icon: Gift, color: 'bg-amber-500', badge: '' },
  { key: 'bonus', label: 'Bonus & Insentif', desc: 'Bonus kinerja, proyek, dan insentif karyawan', href: '/humanify/payroll/bonus', icon: Gift, color: 'bg-pink-500', badge: 'New' },
  { key: 'cash-advance', label: 'Kasbon / Cash Advance', desc: 'Uang muka karyawan dengan potong gaji otomatis', href: '/humanify/payroll/cash-advance', icon: Wallet, color: 'bg-yellow-500', badge: 'New' },
  { key: 'loan', label: 'Pinjaman Karyawan', desc: 'Pinjaman dengan cicilan otomatis potong gaji', href: '/humanify/payroll/loan', icon: CreditCard, color: 'bg-red-500', badge: 'New' },
  { key: 'pph21', label: 'PPh 21 - Pajak Penghasilan', desc: 'Perhitungan pajak, PTKP, tarif progresif, simulator pajak', href: '/humanify/payroll/pph21', icon: Percent, color: 'bg-red-500', badge: '' },
  { key: 'bpjs', label: 'BPJS Kesehatan & Ketenagakerjaan', desc: 'Pengelolaan iuran BPJS Kesehatan, JHT, JP, JKK, JKM', href: '/humanify/payroll/bpjs', icon: Shield, color: 'bg-purple-500', badge: '' },
  { key: 'lembur', label: 'Manajemen Lembur', desc: 'Pengajuan, persetujuan, dan perhitungan lembur (PP 35/2021)', href: '/humanify/payroll/lembur', icon: Clock, color: 'bg-orange-500', badge: '' },
  { key: 'laporan', label: 'Laporan Penggajian', desc: 'Tren bulanan, per departemen, distribusi gaji, Year-to-Date', href: '/humanify/payroll/laporan', icon: BarChart3, color: 'bg-indigo-500', badge: '' },
  { key: 'disbursement', label: 'Transfer Bank', desc: 'Generate file disbursement BCA, Mandiri, CSV', href: '/humanify/payroll/disbursement', icon: Banknote, color: 'bg-teal-500', badge: 'New' },
];

const EMPTY_STATS = {
  totalEmployees: 0, configuredSalaries: 0, monthlyPayroll: 0,
  pendingOT: 0, nextPayDate: '-', lastRunCode: '-',
};

const MOCK_STATS = {
  totalEmployees: 148, configuredSalaries: 142, monthlyPayroll: 1860000000,
  pendingOT: 3, nextPayDate: '2026-03-31', lastRunCode: 'PAY-2026-03',
};

const USE_MOCK_UI = process.env.NODE_ENV !== 'production';

export default function PayrollIndexPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState(USE_MOCK_UI ? MOCK_STATS : EMPTY_STATS);

  useEffect(() => {
    setMounted(true);
    fetch('/api/humanify/payroll').then(r => r.json()).then(json => {
      if (json.success && json.stats) setStats({ ...(USE_MOCK_UI ? MOCK_STATS : EMPTY_STATS), ...json.stats });
    }).catch(() => {});
  }, []);

  if (!mounted) return null;

  return (
    <PageGuard
      anyPermission={['payroll.view', 'payroll.*', 'employees.*']}
      title="Modul Penggajian (Payroll)"
      description="Modul sensitif: slip gaji, PPh 21, BPJS, dan THR karyawan."
    >
    <HQLayout title="Modul Penggajian" subtitle="Pengelolaan penggajian karyawan komprehensif">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/humanify" className="p-2 border rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Modul Penggajian (Payroll)</h2>
            <p className="text-sm text-gray-500">Kelola seluruh aspek penggajian karyawan dari satu tempat</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Karyawan', value: stats.totalEmployees, icon: Users, bg: 'bg-blue-100', color: 'text-blue-600' },
            { label: 'Gaji Terkonfigurasi', value: stats.configuredSalaries, icon: CreditCard, bg: 'bg-green-100', color: 'text-green-600' },
            { label: 'Total Gaji/Bulan', value: fmtCurrency(stats.monthlyPayroll), icon: Banknote, bg: 'bg-emerald-100', color: 'text-emerald-600' },
            { label: 'Proses Terakhir', value: stats.lastRunCode, icon: CheckCircle, bg: 'bg-purple-100', color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div className={`p-2 ${s.bg} rounded-lg`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                <div><p className="text-xs text-gray-500">{s.label}</p><p className={`text-sm font-bold ${s.color}`}>{s.value}</p></div>
              </div>
            </div>
          ))}
        </div>

        {/* HR Ops → Payroll Flow */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><RefreshCw className="w-5 h-5 text-purple-600" /> HR Ops & Payroll — Input Modules</h3>
          <p className="text-xs text-gray-500 mb-4">Semua modul HR operasional tersinkron ke engine payroll (Daily / Weekly / Monthly) → Tax Report & BPJS Report</p>
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            {PAYROLL_INPUT_MODULES.map(m => (
              <Link key={m.key} href={m.href} className="flex flex-col items-center gap-1 p-3 border rounded-xl hover:border-purple-300 hover:bg-purple-50/50 transition-all min-w-[90px]">
                <m.icon className={`w-5 h-5 ${m.color}`} />
                <span className="text-[10px] font-medium text-gray-700 text-center">{m.label}</span>
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="flex flex-wrap justify-center gap-2">
              {['Daily', 'Weekly', 'Monthly'].map(f => (
                <span key={f} className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">{f}</span>
              ))}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">Tax Report (PPh 21)</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">BPJS Report</span>
            </div>
          </div>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PAYROLL_MODULES.map(mod => (
            <Link key={mod.key} href={mod.href}
              className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all group">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${mod.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <mod.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm group-hover:text-blue-600 transition-colors">{mod.label}</h3>
                    {mod.badge && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] rounded font-bold uppercase">{mod.badge}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{mod.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Reference */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Layers className="w-5 h-5 text-blue-600" /> Referensi Cepat</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Tarif BPJS</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between"><span>BPJS Kes (Karyawan)</span><span className="font-medium">1%</span></div>
                <div className="flex justify-between"><span>BPJS Kes (Perusahaan)</span><span className="font-medium">4%</span></div>
                <div className="flex justify-between"><span>JHT (Karyawan)</span><span className="font-medium">2%</span></div>
                <div className="flex justify-between"><span>JHT (Perusahaan)</span><span className="font-medium">3.7%</span></div>
                <div className="flex justify-between"><span>JP (Karyawan)</span><span className="font-medium">1%</span></div>
                <div className="flex justify-between"><span>JP (Perusahaan)</span><span className="font-medium">2%</span></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Tarif PPh 21</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between"><span>0 - 60jt</span><span className="font-medium">5%</span></div>
                <div className="flex justify-between"><span>60jt - 250jt</span><span className="font-medium">15%</span></div>
                <div className="flex justify-between"><span>250jt - 500jt</span><span className="font-medium">25%</span></div>
                <div className="flex justify-between"><span>500jt - 5M</span><span className="font-medium">30%</span></div>
                <div className="flex justify-between"><span>&gt; 5M</span><span className="font-medium">35%</span></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Tarif Lembur</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between"><span>Hari kerja jam ke-1</span><span className="font-medium">1.5× upah/jam</span></div>
                <div className="flex justify-between"><span>Hari kerja jam ke-2+</span><span className="font-medium">2× upah/jam</span></div>
                <div className="flex justify-between"><span>Libur/weekend</span><span className="font-medium">2× upah/jam</span></div>
                <div className="flex justify-between"><span>Upah per jam</span><span className="font-medium">1/173 × gaji</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HQLayout>
    </PageGuard>
  );
}
