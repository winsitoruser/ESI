import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import { PlatformAccessShell } from '@/components/humanify/PlatformAccessNav';
import { OpsPanel } from '@/components/humanify/OpsPageChrome';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { PageGuard } from '@/components/permissions';
import Link from 'next/link';
import {
  Settings, Workflow, ChevronRight,
  FileText, Calendar, Clock, Wallet, ArrowLeft,
} from 'lucide-react';

export default function OrgSettingsPage() {
  const [data, setData] = useState<any>({ policies: [], structure: [] });
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/humanify/integrations?action=org-settings');
      const j = await r.json();
      setData(j.data || { policies: [], structure: [] });
      setDataSource(j.dataSource || (j.data?.summary?.totalEmployees ? 'live' : 'empty'));
    } catch { /* keep empty */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <PageGuard anyPermission={['employees.view', 'employees.*']} title="Pengaturan Organisasi" description="HR policy & org config">
      <HQLayout title="Pengaturan Organisasi" subtitle="Multi-layer structure, access management, multi-approval workflow">
        <PlatformAccessShell
            current="org"
            title="Pengaturan Organisasi"
            subtitle="Pintu masuk struktur, kebijakan HR, dan akses. Ubah detail di masing-masing modul."
            icon={Settings}
            actions={
              <>
                <DataSourceBadge source={dataSource} />
                <Link href="/humanify/organization" className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm">
                  <ArrowLeft className="h-4 w-4" /> Struktur organisasi
                </Link>
              </>
            }
          >

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <OpsPanel title="Struktur & job architecture" subtitle="Unit, jabatan, dan jenjang.">
              <div className="space-y-2">
                {data.structure.map((s: any) => (
                  <Link key={s.id} href={s.href} className="hf-tile-nested group flex items-center justify-between px-3 py-3 hover:bg-[var(--hf-surface-muted)]">
                    <div>
                      <p className="text-sm font-medium text-[color:var(--hf-ink)] group-hover:text-[color:var(--hf-brand-600)]">{s.name}</p>
                      <p className="text-xs text-[color:var(--hf-ink-muted)]">{s.count}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[color:var(--hf-ink-faint)] group-hover:text-[color:var(--hf-brand-500)]" />
                  </Link>
                ))}
              </div>
            </OpsPanel>

            <OpsPanel title="Akses & workflow" subtitle="Role, persetujuan, dan portal karyawan.">
              <div className="space-y-2">
                <Link href="/humanify/users/roles" className="hf-tile-nested group flex items-center justify-between px-3 py-3 hover:bg-[var(--hf-surface-muted)]">
                  <div><p className="text-sm font-medium text-[color:var(--hf-ink)]">Role-Based Access Control</p><p className="text-xs text-[color:var(--hf-ink-muted)]">Permission matrix & audit</p></div>
                  <ChevronRight className="h-4 w-4 text-[color:var(--hf-ink-faint)]" />
                </Link>
                <Link href="/humanify/mutations" className="hf-tile-nested group flex items-center justify-between px-3 py-3 hover:bg-[var(--hf-surface-muted)]">
                  <div><p className="text-sm font-medium text-[color:var(--hf-ink)]">Multi-approval workflow</p><p className="text-xs text-[color:var(--hf-ink-muted)]">Mutasi, klaim, cuti, lembur</p></div>
                  <Workflow className="h-4 w-4 text-[color:var(--hf-ink-faint)]" />
                </Link>
                <Link href="/humanify/ess" className="hf-tile-nested group flex items-center justify-between px-3 py-3 hover:bg-[var(--hf-surface-muted)]">
                  <div><p className="text-sm font-medium text-[color:var(--hf-ink)]">Employee Self-Service</p><p className="text-xs text-[color:var(--hf-ink-muted)]">Portal karyawan & manajer</p></div>
                  <ChevronRight className="h-4 w-4 text-[color:var(--hf-ink-faint)]" />
                </Link>
              </div>
            </OpsPanel>
          </div>

          <OpsPanel title="Kebijakan HR" subtitle="Mesin kebijakan cuti, absensi, dan reimbursement.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {data.policies.map((p: any) => (
                <Link key={p.id} href={p.href} className="hf-tile-nested group flex items-center gap-3 p-3">
                  {p.id === 'leave' && <Calendar className="h-4 w-4 text-[color:var(--hf-brand-600)]" />}
                  {p.id === 'attendance' && <Clock className="h-4 w-4 text-[color:var(--hf-brand-600)]" />}
                  {p.id === 'reimbursement' && <Wallet className="h-4 w-4 text-[color:var(--hf-brand-600)]" />}
                  {!['leave', 'attendance', 'reimbursement'].includes(p.id) && <FileText className="h-4 w-4 text-[color:var(--hf-brand-600)]" />}
                  <div>
                    <p className="text-sm font-medium text-[color:var(--hf-ink)] group-hover:text-[color:var(--hf-brand-600)]">{p.name}</p>
                    <span className={`text-[10px] font-medium uppercase ${
                      p.status === 'active' ? 'text-[color:var(--hf-success)]' : p.status === 'not_configured' ? 'text-[color:var(--hf-warning)]' : 'text-[color:var(--hf-ink-muted)]'
                    }`}>{p.status === 'not_configured' ? 'belum dikonfigurasi' : p.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </OpsPanel>

          <div className="hf-card p-4 text-sm text-[color:var(--hf-ink)]">
            <strong>Database HR:</strong> Custom data/doc, sertifikat, dan contract expiry terkelola di{' '}
            <Link href="/humanify/employees" className="font-medium text-[color:var(--hf-brand-600)] hover:underline">Database Karyawan</Link>,{' '}
            <Link href="/humanify/certificates" className="font-medium text-[color:var(--hf-brand-600)] hover:underline">Certificate Registry</Link>, dan{' '}
            <Link href="/humanify/contracts" className="font-medium text-[color:var(--hf-brand-600)] hover:underline">Kontrak & Reminder</Link>.
          </div>
        </PlatformAccessShell>
      </HQLayout>
    </PageGuard>
  );
}