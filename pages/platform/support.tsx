import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import OpsLayout from '@/components/humanify/OpsLayout';
import { OpsBadge, OpsPageIntro, OpsPageSkeleton, OpsStat, OpsToast } from '@/components/humanify/ops-ui';
import OpsDataTable from '@/components/humanify/OpsDataTable';
import OpsSupportTickets from '@/components/humanify/OpsSupportTickets';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import { Inbox, RefreshCw, AlertTriangle, Clock, CreditCard, Mail, Ticket } from 'lucide-react';

type SupportItem = {
  id: string;
  kind: 'trial' | 'unpaid' | 'at_risk' | 'unverified';
  severity: 'danger' | 'warning' | 'info';
  title: string;
  detail: string;
  tenantId: string | null;
  tenantName: string;
  tenantSlug: string;
  href: string;
};

function kindTone(kind: string): 'danger' | 'warning' | 'brand' | 'neutral' {
  if (kind === 'at_risk') return 'danger';
  if (kind === 'unpaid' || kind === 'trial') return 'warning';
  if (kind === 'unverified') return 'brand';
  return 'neutral';
}

/**
 * Admin Total — unified support queue across trials, billing, health, and email verify.
 */
export default function PlatformSupportPage() {
  const { gating } = usePlatformOperator('/platform/support');
  const router = useRouter();
  const tab = String(router.query.tab || 'queue') === 'tickets' ? 'tickets' : 'queue';
  const [items, setItems] = useState<SupportItem[]>([]);
  const [counts, setCounts] = useState({ trial: 0, unpaid: 0, at_risk: 0, unverified: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform?action=support-queue').then((r) => r.json());
      if (res.success) {
        setItems(res.data?.items || []);
        setCounts(res.data?.counts || { trial: 0, unpaid: 0, at_risk: 0, unverified: 0, total: 0 });
      } else setToast(res.error || 'Gagal memuat antrean');
    } catch {
      setToast('Gagal memuat antrean support');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!gating) load();
  }, [gating, load]);

  return (
    <OpsLayout title="Support" subtitle="Antrean perhatian lintas tenant">
      <OpsToast message={toast} onDismiss={() => setToast('')} />
      {gating || (tab === 'queue' && loading && items.length === 0) ? (
        <OpsPageSkeleton variant="table" />
      ) : (
        <div className="space-y-5">
          <OpsPageIntro
            eyebrow="Care"
            title="Antrean support"
            description="Trial, tagihan, risiko, email — plus tiket CS dengan SLA status."
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

          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
            <button
              type="button"
              onClick={() => router.replace('/platform/support', undefined, { shallow: true })}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tab === 'queue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
            >
              <Inbox className="mr-1 inline h-3 w-3" /> Antrean
            </button>
            <button
              type="button"
              onClick={() => router.replace('/platform/support?tab=tickets', undefined, { shallow: true })}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tab === 'tickets' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
            >
              <Ticket className="mr-1 inline h-3 w-3" /> Tiket CS
            </button>
          </div>

          {tab === 'tickets' ? (
            <OpsSupportTickets onToast={setToast} />
          ) : (
            <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <OpsStat label="Total" value={counts.total} icon={Inbox} />
            <OpsStat label="Trial" value={counts.trial} tone="warning" icon={Clock} />
            <OpsStat label="Unpaid" value={counts.unpaid} tone="warning" icon={CreditCard} />
            <OpsStat label="Berisiko" value={counts.at_risk} tone="danger" icon={AlertTriangle} />
          </div>

          <OpsDataTable
            rows={items}
            loading={loading}
            rowKey={(r) => r.id}
            searchPlaceholder="Cari klien, jenis, atau detail…"
            exportFileName="humanify-admin-support"
            exportSheetName="Support"
            emptyTitle="Antrean kosong"
            emptyHint="Tidak ada trial, unpaid, risiko, atau email yang perlu tindak lanjut."
            defaultPageSize={25}
            filters={[
              {
                id: 'kind',
                label: 'Jenis',
                options: [
                  { value: 'trial', label: 'Trial' },
                  { value: 'unpaid', label: 'Unpaid' },
                  { value: 'at_risk', label: 'Berisiko' },
                  { value: 'unverified', label: 'Email' },
                ],
                getValue: (r) => r.kind,
              },
              {
                id: 'severity',
                label: 'Prioritas',
                options: [
                  { value: 'danger', label: 'Tinggi' },
                  { value: 'warning', label: 'Sedang' },
                  { value: 'info', label: 'Info' },
                ],
                getValue: (r) => r.severity,
              },
            ]}
            columns={[
              {
                id: 'kind',
                header: 'Jenis',
                exportValue: (r) => r.title,
                cell: (r) => <OpsBadge tone={kindTone(r.kind)}>{r.title}</OpsBadge>,
              },
              {
                id: 'tenant',
                header: 'Klien',
                exportValue: (r) => r.tenantSlug || r.tenantName,
                cell: (r) => r.tenantId ? (
                  <div className="min-w-0">
                    <Link
                      href={r.href}
                      className="truncate text-sm font-medium text-slate-900 hover:underline"
                    >
                      {r.tenantName}
                    </Link>
                    <p className="truncate text-[11px] text-slate-400">/{r.tenantSlug}</p>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                ),
              },
              {
                id: 'detail',
                header: 'Detail',
                exportValue: (r) => r.detail,
                cell: (r) => <span className="text-xs text-slate-600">{r.detail}</span>,
              },
              {
                id: 'open',
                header: '',
                exportOmit: true,
                cell: (r) => r.href ? (
                  <Link
                    href={r.href}
                    className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline"
                  >
                    Buka
                  </Link>
                ) : null,
              },
            ]}
          />

          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Mail className="h-3 w-3" />
            Tandai verifikasi atau impersonate dari halaman klien.
          </p>
            </>
          )}
        </div>
      )}
    </OpsLayout>
  );
}
