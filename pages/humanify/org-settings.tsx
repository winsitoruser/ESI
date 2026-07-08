import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import Link from 'next/link';
import {
  Settings, Building2, Network, Shield, Workflow, ChevronRight,
  FileText, Calendar, Clock, Wallet, ArrowLeft,
} from 'lucide-react';

export default function OrgSettingsPage() {
  const [data, setData] = useState<any>({ policies: [], structure: [] });

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/humanify/integrations?action=org-settings');
      const j = await r.json();
      setData(j.data || { policies: [], structure: [] });
    } catch { /* keep empty */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <PageGuard anyPermission={['employees.view', 'employees.*']} title="Pengaturan Organisasi" description="HR policy & org config">
      <HQLayout title="Pengaturan Organisasi" subtitle="Multi-layer structure, access management, multi-approval workflow">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/humanify/organization" className="p-2 border rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></Link>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-gray-700" /> Organization & Management</h2>
              <p className="text-sm text-gray-500">Company → Job Architecture → Database, Org Structure, Workflow</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-semibold flex items-center gap-2 mb-4"><Network className="w-4 h-4 text-blue-600" /> Struktur & Job Architecture</h3>
              <div className="space-y-2">
                {data.structure.map((s: any) => (
                  <Link key={s.id} href={s.href} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border group">
                    <div>
                      <p className="font-medium text-sm group-hover:text-blue-600">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.count}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-semibold flex items-center gap-2 mb-4"><Shield className="w-4 h-4 text-purple-600" /> Access & Workflow</h3>
              <div className="space-y-2">
                <Link href="/humanify/users/roles" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border group">
                  <div><p className="font-medium text-sm">Role-Based Access Control</p><p className="text-xs text-gray-400">Permission matrix & audit</p></div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </Link>
                <Link href="/humanify/mutations" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border group">
                  <div><p className="font-medium text-sm">Multi-approval Workflow</p><p className="text-xs text-gray-400">Mutasi, klaim, cuti, lembur</p></div>
                  <Workflow className="w-4 h-4 text-gray-400" />
                </Link>
                <Link href="/humanify/ess" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border group">
                  <div><p className="font-medium text-sm">Employee Self-Service</p><p className="text-xs text-gray-400">Portal karyawan & manajer</p></div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4"><FileText className="w-4 h-4 text-green-600" /> Kebijakan HR (Policy Engine)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.policies.map((p: any) => (
                <Link key={p.id} href={p.href} className="flex items-center gap-3 p-3 rounded-lg border hover:border-green-200 hover:bg-green-50/50 group">
                  {p.id === 'leave' && <Calendar className="w-4 h-4 text-green-600" />}
                  {p.id === 'attendance' && <Clock className="w-4 h-4 text-green-600" />}
                  {p.id === 'reimbursement' && <Wallet className="w-4 h-4 text-green-600" />}
                  {!['leave', 'attendance', 'reimbursement'].includes(p.id) && <FileText className="w-4 h-4 text-green-600" />}
                  <div>
                    <p className="font-medium text-sm group-hover:text-green-700">{p.name}</p>
                    <span className="text-[10px] text-green-600 font-medium uppercase">{p.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
            <strong>Database HR:</strong> Custom data/doc, sertifikat, dan contract expiry terkelola di{' '}
            <Link href="/humanify/employees" className="text-blue-600 underline">Database Karyawan</Link>,{' '}
            <Link href="/humanify/certificates" className="text-blue-600 underline">Certificate Registry</Link>, dan{' '}
            <Link href="/humanify/contracts" className="text-blue-600 underline">Kontrak & Reminder</Link>.
          </div>
        </div>
      </HQLayout>
    </PageGuard>
  );
}
