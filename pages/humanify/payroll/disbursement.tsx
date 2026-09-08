import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { PageGuard } from '@/components/permissions';
import Link from 'next/link';
import HRStatCard from '@/components/humanify/HRStatCard';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import { OpsKpiShell, OpsPanel } from '@/components/humanify/OpsPageChrome';
import { PayrollShell } from '@/components/humanify/PayrollModuleChrome';
import { Banknote, Download, Building2, RefreshCw, Users } from 'lucide-react';

const BANKS = [
  { id: 'bca', label: 'BCA Auto Credit', hint: 'Format KLIRING BCA' },
  { id: 'mandiri', label: 'Mandiri MCM', hint: 'Multi Cash Management' },
  { id: 'generic', label: 'CSV generik', hint: 'Nama, rekening, nominal' },
];

export default function DisbursementPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [loading, setLoading] = useState(true);
  const fmt = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/humanify/disbursement?action=preview');
      const j = await r.json();
      setRows(j.data?.rows || []);
      setTotal(j.data?.total || 0);
      setDataSource(j.dataSource || (j.data?.rows?.length ? 'live' : 'empty'));
    } catch { setRows([]); setDataSource('empty'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const download = (format: string) => {
    window.open(`/api/humanify/disbursement?action=download&format=${format}`, '_blank');
  };

  const missingBank = rows.filter((r) => !r.accountNumber).length;

  return (
    <PageGuard anyPermission={['payroll.view', 'payroll.*']} title="Disbursement" description="Transfer gaji ke bank">
      <HQLayout title="Transfer Bank" subtitle="Generate file transfer BCA, Mandiri, atau CSV">
        <PayrollShell
          current="transfer"
          title="Transfer bank"
          subtitle="Unduh file disbursement setelah run gaji disetujui. Lengkapi rekening di database karyawan jika kosong."
          icon={Banknote}
          chips={[
            { icon: Users, label: `${rows.length} karyawan` },
            { icon: Building2, label: missingBank ? `${missingBank} tanpa rekening` : 'Rekening lengkap', tone: missingBank ? 'text-amber-700' : 'text-emerald-700' },
          ]}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <DataSourceBadge source={dataSource} />
              <button type="button" onClick={load} className="hf-btn-secondary inline-flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Segarkan
              </button>
            </div>
          )}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <OpsKpiShell>
              <HRStatCard icon={Banknote} label="Total transfer" value={fmt(total)} sub={`${rows.length} baris`} accent="emerald" />
            </OpsKpiShell>
            {BANKS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => download(b.id)}
                disabled={!rows.length}
                className="hf-card flex flex-col items-start gap-2 p-4 text-left transition hover:border-[var(--hf-brand-100)] hover:shadow-[var(--hf-shadow-md)] disabled:opacity-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[var(--hf-radius)] bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]">
                  <Download className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-[color:var(--hf-ink)]">{b.label}</span>
                <span className="text-xs text-[color:var(--hf-ink-muted)]">{b.hint}</span>
              </button>
            ))}
          </div>

          <OpsPanel
            title="Pratinjau transfer"
            subtitle="Data dari run gaji terakhir yang disetujui."
            action={<Link href="/humanify/employees" className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">Lengkapi rekening</Link>}
          >
            {loading ? (
              <div className="h-32 animate-pulse rounded-[var(--hf-radius)] bg-[var(--hf-surface-muted)]" />
            ) : rows.length === 0 ? (
              <HrisEmptyState
                source={dataSource}
                title="Belum ada data transfer"
                description="Setujui run penggajian terlebih dahulu, lalu kembali ke halaman ini untuk mengunduh file bank."
                action={<Link href="/humanify/payroll/main" className="hf-btn-primary">Buka proses gaji</Link>}
              />
            ) : (
              <div className="hf-table-wrap overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Karyawan</th>
                      <th>Bank</th>
                      <th>No. rekening</th>
                      <th className="text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any) => (
                      <tr key={r.employeeId}>
                        <td className="font-medium text-[color:var(--hf-ink)]">{r.employeeName}</td>
                        <td>{r.bankName || '—'}</td>
                        <td className="font-mono text-xs">{r.accountNumber || <span className="text-[color:var(--hf-danger)]">Kosong</span>}</td>
                        <td className="text-right tabular-nums font-medium">{fmt(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </OpsPanel>
        </PayrollShell>
      </HQLayout>
    </PageGuard>
  );
}
