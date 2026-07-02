import { useState, useEffect } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import { PageGuard } from '@/components/permissions';
import {
  DollarSign, Users, FileText, Clock, Calculator, Layers, CreditCard,
  Gift, Shield, BarChart3, TrendingUp, ChevronRight, ArrowLeft,
  Banknote, Percent, Building2, CheckCircle
} from 'lucide-react';

const fmtCurrency = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

const PAYROLL_MODULES = [
  { key: 'main', label: 'Penggajian Utama', desc: 'Proses penggajian, konfigurasi gaji, komponen gaji, dan impor data', href: '/hq/hris/payroll/main', icon: Calculator, color: 'bg-blue-500', badge: 'Core' },
  { key: 'slip-gaji', label: 'Slip Gaji', desc: 'Riwayat slip gaji karyawan, detail pendapatan dan potongan', href: '/hq/hris/payroll/slip-gaji', icon: FileText, color: 'bg-green-500', badge: '' },
  { key: 'thr', label: 'THR (Tunjangan Hari Raya)', desc: 'Perhitungan dan manajemen THR sesuai PP No. 36/2021', href: '/hq/hris/payroll/thr', icon: Gift, color: 'bg-amber-500', badge: '' },
  { key: 'pph21', label: 'PPh 21 - Pajak Penghasilan', desc: 'Perhitungan pajak, PTKP, tarif progresif, simulator pajak', href: '/hq/hris/payroll/pph21', icon: Percent, color: 'bg-red-500', badge: '' },
  { key: 'bpjs', label: 'BPJS Kesehatan & Ketenagakerjaan', desc: 'Pengelolaan iuran BPJS Kesehatan, JHT, JP, JKK, JKM', href: '/hq/hris/payroll/bpjs', icon: Shield, color: 'bg-purple-500', badge: '' },
  { key: 'lembur', label: 'Manajemen Lembur', desc: 'Pengajuan, persetujuan, dan perhitungan lembur (PP 35/2021)', href: '/hq/hris/payroll/lembur', icon: Clock, color: 'bg-orange-500', badge: '' },
  { key: 'laporan', label: 'Laporan Penggajian', desc: 'Tren bulanan, per departemen, distribusi gaji, Year-to-Date', href: '/hq/hris/payroll/laporan', icon: BarChart3, color: 'bg-indigo-500', badge: '' },
];

const MOCK_STATS = {
  totalEmployees: 148, configuredSalaries: 142, monthlyPayroll: 1860000000,
  pendingOT: 3, nextPayDate: '2026-03-31', lastRunCode: 'PAY-2026-03',
};

export default function PayrollIndexPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState(MOCK_STATS);

  useEffect(() => {
    setMounted(true);
    fetch('/api/hq/hris/payroll').then(r => r.json()).then(json => {
      if (json.success && json.stats) setStats({ ...MOCK_STATS, ...json.stats });
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
          <Link href="/hq/hris" className="p-2 border rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></Link>
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
