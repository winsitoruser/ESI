import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import OpsLayout from '@/components/humanify/OpsLayout';
import { OpsBadge, OpsPageIntro, OpsPageSkeleton, OpsToast } from '@/components/humanify/ops-ui';
import OpsDataTable from '@/components/humanify/OpsDataTable';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import { RefreshCw, FileText } from 'lucide-react';

function actionTone(action?: string): 'success' | 'warning' | 'danger' | 'neutral' | 'brand' {
  const a = String(action || '').toLowerCase();
  if (a.includes('delete') || a.includes('offboard') || a.includes('revoke') || a.includes('suspend')) return 'danger';
  if (a.includes('export') || a.includes('impersonate')) return 'warning';
  if (a.includes('create') || a.includes('verify') || a.includes('paid')) return 'success';
  if (a.includes('plan') || a.includes('billing')) return 'brand';
  return 'neutral';
}

/**
 * Admin Total — cross-tenant operator audit trail.
 */
export default function PlatformAuditPage() {
  const { gating } = usePlatformOperator('/platform/audit');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform?action=audit-log&limit=150').then((r) => r.json());
      if (res.success) setEvents(res.data?.events || []);
      else setToast(res.error || 'Gagal memuat audit');
    } catch {
      setToast('Gagal memuat jejak audit');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!gating) load();
  }, [gating, load]);

  return (
    <OpsLayout title="Audit" subtitle="Jejak aksi operator lintas tenant">
      <OpsToast message={toast} onDismiss={() => setToast('')} />
      {gating || (loading && events.length === 0) ? (
        <OpsPageSkeleton variant="table" />
      ) : (
        <div className="space-y-5">
          <OpsPageIntro
            eyebrow="Governance"
            title="Jejak audit"
            description="Aksi sensitif di control plane dan tenant (plan, impersonate, export, role). Filter di tabel, buka klien dari baris."
            actions={
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Segarkan
              </button>
            }
          />
          <OpsDataTable
            rows={events}
            loading={loading}
            rowKey={(r) => r.id}
            searchPlaceholder="Cari aksi, actor, tenant, resource…"
            exportFileName="humanify-admin-audit"
            exportSheetName="Audit"
            emptyTitle="Belum ada jejak"
            emptyHint="Aksi operator (ubah plan, impersonate, export) akan muncul di sini."
            defaultPageSize={25}
            columns={[
              {
                id: 'createdAt',
                header: 'Waktu',
                exportWidth: 20,
                exportValue: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString('id-ID') : ''),
                cell: (r) => (
                  <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString('id-ID') : '—'}
                  </span>
                ),
              },
              {
                id: 'action',
                header: 'Aksi',
                exportValue: (r) => r.action || '',
                cell: (r) => <OpsBadge tone={actionTone(r.action)}>{r.action || '—'}</OpsBadge>,
              },
              {
                id: 'tenantName',
                header: 'Tenant',
                exportValue: (r) => r.tenantSlug || r.tenantName || '',
                cell: (r) => r.tenantId ? (
                  <div className="min-w-0">
                    <Link
                      href={`/platform/tenants/${r.tenantId}`}
                      className="truncate text-sm font-medium text-slate-900 hover:underline"
                    >
                      {r.tenantName || 'Tenant'}
                    </Link>
                    <p className="truncate text-[11px] text-slate-400">/{r.tenantSlug || '—'}</p>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">platform</span>
                ),
              },
              {
                id: 'actorEmail',
                header: 'Actor',
                exportValue: (r) => r.actorEmail || '',
                cell: (r) => <span className="text-xs text-slate-700">{r.actorEmail || '—'}</span>,
              },
              {
                id: 'resourceType',
                header: 'Resource',
                exportValue: (r) => [r.resourceType, r.resourceId].filter(Boolean).join(':'),
                cell: (r) => (
                  <span className="text-xs text-slate-500">
                    {r.resourceType || '—'}
                    {r.resourceId ? <span className="ml-1 font-mono text-[10px] text-slate-400">{String(r.resourceId).slice(0, 12)}</span> : null}
                  </span>
                ),
              },
              {
                id: 'ip',
                header: 'IP',
                exportValue: (r) => r.ip || '',
                cell: (r) => <span className="font-mono text-[11px] text-slate-400">{r.ip || '—'}</span>,
              },
            ]}
          />
          {events.length === 0 && !loading && (
            <p className="flex items-center gap-2 text-xs text-slate-400">
              <FileText className="h-3.5 w-3.5" />
              Tabel `saas_admin_audit` diisi saat operator menjalankan aksi sensitif.
            </p>
          )}
        </div>
      )}
    </OpsLayout>
  );
}
