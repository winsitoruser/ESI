import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import HRStatCard from '@/components/humanify/HRStatCard';
import { PageGuard } from '@/components/permissions';
import { TalentShell } from '@/components/humanify/TalentModuleChrome';
import { OpsKpiShell } from '@/components/humanify/OpsPageChrome';
import TrainingLmsBridge from '@/components/humanify/TrainingLmsBridge';
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
        <TalentShell
          current="lms"
          title="Integrasi LMS"
          subtitle="Aturan otomatis antar rekrutmen, pelatihan, payroll tunjangan, KPI, dan registri sertifikat."
          icon={Link2}
        >
          <TrainingLmsBridge currentModule="lms" />

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <OpsKpiShell>
              <HRStatCard icon={Bell} label="Notifikasi terkirim" value={overview.notifications_sent || 0} accent="violet" />
            </OpsKpiShell>
            <OpsKpiShell>
              <HRStatCard icon={Wallet} label="Tunjangan training" value={overview.training_allowances?.total || 0} accent="blue" />
            </OpsKpiShell>
            <OpsKpiShell>
              <HRStatCard icon={Wallet} label="Total tunjangan" value={`Rp ${Number(overview.training_allowances?.amount || 0).toLocaleString('id')}`} accent="amber" />
            </OpsKpiShell>
            <OpsKpiShell>
              <HRStatCard icon={Target} label="Baris KPI kompetensi" value={overview.kpi_competency_rows || 0} accent="emerald" />
            </OpsKpiShell>
          </div>

          <div className="hf-card p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-[color:var(--hf-ink)]"><Link2 className="h-5 w-5 text-[color:var(--hf-brand-600)]" /> Aturan integrasi</h3>
          {rules.map((rule) => (
            <div key={rule.rule_type} className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="font-medium">{RULE_LABELS[rule.rule_type] || rule.rule_type}</p>
                <p className="text-xs text-gray-500 font-mono">{JSON.stringify(rule.config || {})}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(rule)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${rule.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'}`}
              >
                {rule.enabled ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>
          ))}
          {!rules.length && <p className="text-sm text-[color:var(--hf-ink-muted)]">Aturan akan dibuat otomatis saat halaman dimuat</p>}
          </div>

          <div className="hf-card p-5">
            <h3 className="mb-3 font-semibold text-[color:var(--hf-ink)]">Modul training terkait</h3>
            <p className="mb-3 text-sm text-[color:var(--hf-ink-muted)]">
              Program pelatihan, pengembangan, skor, dan registri sertifikat tersinkron dengan LMS.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { href: '/humanify/training', label: 'Program pelatihan' },
                { href: '/humanify/training-development', label: 'Pengembangan' },
                { href: '/humanify/training-scoring', label: 'Skor training' },
                { href: '/humanify/certificates', label: 'Registri sertifikat' },
              ].map((l) => (
                <a key={l.href} href={l.href} className="hf-btn-secondary text-sm">{l.label}</a>
              ))}
            </div>
          </div>
        </TalentShell>
      </HumanifyLayout>
    </PageGuard>
  );
}
