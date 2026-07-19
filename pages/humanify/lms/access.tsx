import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav } from '@/components/humanify/lms/shared';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import { Users, Shield, ExternalLink } from 'lucide-react';

export default function LmsAccessPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);

  const load = useCallback(async () => {
    const d = await fetch('/api/humanify/lms?action=lms-users').then((r) => r.json());
    setUsers(d.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <PageGuard anyPermission={['lms.*', 'roles.*', 'training.*']}>
      <HumanifyLayout title={t('hris.lmsAccess')} subtitle="Manajemen pengguna LMS dan hak akses role">
        <LmsPageNav active="access" />

        <div className="bg-[var(--hf-brand-50)] border border-[var(--hf-brand-100)] rounded-xl p-4 mb-6 text-sm">
          <p className="flex items-center gap-2"><Shield className="w-4 h-4 text-[color:var(--hf-brand-600)]" /> Permission LMS dikelola melalui <strong>Role & Akses</strong>. Gunakan modul <code>lms.*</code> untuk mengatur hak admin, penilai, dan instruktur.</p>
          <Link href="/humanify/users/roles" className="inline-flex items-center gap-1 mt-2 text-[color:var(--hf-brand)] hover:underline">
            Buka Manajemen Role <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <h3 className="font-semibold mb-3 flex items-center gap-2"><Users className="w-5 h-5" /> Pengguna & Aktivitas LMS</h3>
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="p-3 text-left">Nama</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Ujian</th><th className="p-3">Kompetensi</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">{u.employee_name || u.name}</td>
                  <td className="p-3 text-gray-500">{u.email}</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{u.role}</span></td>
                  <td className="p-3">{u.exam_attempts || 0}</td>
                  <td className="p-3">{u.competencies || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && <p className="p-8 text-center text-gray-400">Tidak ada data pengguna</p>}
        </div>
      </HumanifyLayout>
    </PageGuard>
  );
}
