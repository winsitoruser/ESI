import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav, LmsStatusBadge } from '@/components/humanify/lms/shared';
import { useTranslation } from '@/lib/i18n';
import { Camera, Shield } from 'lucide-react';

const API = '/api/humanify/lms/analytics';

export default function ProctoringPage() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<any[]>([]);

  const load = useCallback(async () => {
    const d = await fetch(`${API}?action=proctor-review`).then((r) => r.json());
    setSessions(d.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*']}>
      <HumanifyLayout title={t('hris.lmsProctoring')} subtitle="Review sesi ujian — anti-cheat, tab switch, snapshot kamera">
        <LmsPageNav active="proctoring" />
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className={`bg-white border rounded-xl p-4 ${s.status === 'flagged' ? 'border-orange-300' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />{s.employee_name} — {s.exam_title}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Tab: {s.tab_switch_count} · Fullscreen exit: {s.fullscreen_exit_count} · Copy: {s.copy_paste_count}
                  </p>
                  <p className="text-sm">Integrity: <strong>{s.integrity_score ?? '-'}</strong> · Snapshots: {s.snapshot_count || 0}</p>
                  {s.device_fingerprint && <p className="text-xs font-mono text-gray-400 mt-1">Device: {s.device_fingerprint.slice(0, 16)}...</p>}
                </div>
                <div className="flex items-center gap-2">
                  <LmsStatusBadge status={s.status} />
                  {(s.snapshot_count || 0) > 0 && <Camera className="w-4 h-4 text-green-600" />}
                </div>
              </div>
            </div>
          ))}
          {!sessions.length && <p className="text-gray-400 text-center py-12">Belum ada sesi ujian tercatat</p>}
        </div>
      </HumanifyLayout>
    </PageGuard>
  );
}
