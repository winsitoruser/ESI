import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav } from '@/components/humanify/lms/shared';
import { useTranslation } from '@/lib/i18n';
import { Link2, Bell, Wallet, Target } from 'lucide-react';

const API = '/api/humanify/lms/integrations';

const RULE_LABELS: Record<string, string> = {
  recruitment_hire_enroll: 'Rekrutmen → Auto-enroll onboarding',
  exam_pass_allowance: 'Lulus ujian → Tunjangan pelatihan',
  competency_kpi_sync: 'Kompetensi LMS → KPI',
  cert_expiry_reminder: 'Pengingat sertifikat kedaluwarsa',
};

export default function LmsIntegrationsPage() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>({});

  const load = useCallback(async () => {
    const [r, o] = await Promise.all([
      fetch(`${API}?action=rules`).then((res) => res.json()),
      fetch(`${API}?action=overview`).then((res) => res.json()),
    ]);
    setRules(r.data || []);
    setOverview(o.data || {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (rule: any) => {
    await fetch(`${API}?action=update-rule`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule_type: rule.rule_type, enabled: !rule.enabled, config: rule.config || {} }),
    });
    load();
  };

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*']}>
      <HumanifyLayout title={t('hris.lmsIntegrations')} subtitle="Integrasi ekosistem — rekrutmen, payroll, KPI, webhook">
        <LmsPageNav active="integrations" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Notifikasi terkirim', value: overview.notifications_sent || 0, icon: Bell },
            { label: 'Tunjangan training', value: overview.training_allowances?.total || 0, icon: Wallet },
            { label: 'Total tunjangan', value: `Rp ${Number(overview.training_allowances?.amount || 0).toLocaleString('id')}`, icon: Wallet },
            { label: 'Baris KPI kompetensi', value: overview.kpi_competency_rows || 0, icon: Target },
          ].map((s) => (
            <div key={s.label} className="bg-white border rounded-xl p-4">
              <s.icon className="w-5 h-5 text-indigo-600 mb-2" />
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-lg font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Link2 className="w-5 h-5" /> Aturan Integrasi</h3>
          {rules.map((rule) => (
            <div key={rule.rule_type} className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="font-medium">{RULE_LABELS[rule.rule_type] || rule.rule_type}</p>
                <p className="text-xs text-gray-500 font-mono">{JSON.stringify(rule.config || {})}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(rule)}
                className={`px-3 py-1 rounded-full text-sm ${rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
              >
                {rule.enabled ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>
          ))}
          {!rules.length && <p className="text-gray-400 text-sm">Aturan akan dibuat otomatis saat halaman dimuat</p>}
        </div>

        <div className="bg-white border rounded-xl p-5 mt-6">
          <h3 className="font-semibold mb-3">Sinkronisasi Modul Training Legacy</h3>
          <p className="text-sm text-gray-500 mb-3">
            Menghubungkan Program Training, Pelatihan & Pengembangan, Skor Training, dan Certificate Registry dengan LMS.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { href: '/humanify/training', label: 'Program Training' },
              { href: '/humanify/training-development', label: 'Pelatihan & Pengembangan' },
              { href: '/humanify/training-scoring', label: 'Skor Training' },
              { href: '/humanify/certificates', label: 'Certificate Registry' },
            ].map((l) => (
              <a key={l.href} href={l.href} className="px-3 py-1.5 border rounded-lg text-sm hover:border-indigo-300">{l.label}</a>
            ))}
          </div>
        </div>
      </HumanifyLayout>
    </PageGuard>
  );
}
