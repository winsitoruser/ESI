import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav, Modal } from '@/components/humanify/lms/shared';
import { useTranslation } from '@/lib/i18n';
import { GraduationCap, Users, Palette } from 'lucide-react';

const API = '/api/humanify/lms/academy';

export default function LmsAcademyPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<any>({});
  const [learners, setLearners] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [invite, setInvite] = useState<any>({});

  const load = useCallback(async () => {
    const [s, l, c] = await Promise.all([
      fetch(`${API}?action=settings`).then((r) => r.json()),
      fetch(`${API}?action=external-learners`).then((r) => r.json()),
      fetch('/api/humanify/lms/courses?action=list').then((r) => r.json()),
    ]);
    setSettings(s.data || {});
    setLearners(l.data || []);
    setCourses(c.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async () => {
    await fetch(`${API}?action=save-settings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    load();
  };

  const sendInvite = async () => {
    const res = await fetch(`${API}?action=invite`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invite),
    });
    const data = await res.json();
    if (data.data?.invite_url) {
      alert(`Undangan dibuat: ${window.location.origin}${data.data.invite_url}`);
    }
    setModal(false);
    load();
  };

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*']}>
      <HumanifyLayout title={t('hris.lmsAcademy')} subtitle="Academy branding & peserta eksternal (kandidat, mitra, franchisee)">
        <LmsPageNav active="academy" />

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-5 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Palette className="w-5 h-5" /> Branding Academy</h3>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nama academy" value={settings.academy_name || ''} onChange={(e) => setSettings({ ...settings, academy_name: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Slug (academy.client)" value={settings.slug || ''} onChange={(e) => setSettings({ ...settings, slug: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Logo URL" value={settings.logo_url || ''} onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Warna utama (#4f46e5)" value={settings.primary_color || '#4f46e5'} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} />
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Pesan selamat datang" value={settings.welcome_message || ''} onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })} />
            <button type="button" onClick={saveSettings} className="w-full py-2 bg-[var(--hf-brand-600)] text-white rounded-lg text-sm">Simpan Branding</button>
          </div>

          <div className="bg-white border rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Users className="w-5 h-5" /> Peserta Eksternal</h3>
              <button type="button" onClick={() => setModal(true)} className="px-3 py-1.5 bg-[var(--hf-brand-600)] text-white rounded-lg text-sm">Undang</button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {learners.map((l) => (
                <div key={l.id} className="border rounded-lg p-3 text-sm">
                  <p className="font-medium">{l.full_name} — {l.email}</p>
                  <p className="text-gray-500 capitalize">{l.learner_type} · {l.status}</p>
                  <p className="text-xs text-[color:var(--hf-brand-600)] truncate">/learn/{l.access_token?.slice(0, 12)}...</p>
                </div>
              ))}
              {!learners.length && <p className="text-gray-400 text-sm">Belum ada peserta eksternal</p>}
            </div>
          </div>
        </div>

        <Modal open={modal} onClose={() => setModal(false)} title="Undang Peserta Eksternal">
          <div className="space-y-3">
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nama lengkap" value={invite.full_name || ''} onChange={(e) => setInvite({ ...invite, full_name: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Email" value={invite.email || ''} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={invite.learner_type || 'external'} onChange={(e) => setInvite({ ...invite, learner_type: e.target.value })}>
              <option value="external">Eksternal</option>
              <option value="candidate">Kandidat</option>
              <option value="partner">Mitra</option>
              <option value="franchisee">Franchisee</option>
            </select>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={invite.curriculum_id || ''} onChange={(e) => setInvite({ ...invite, curriculum_id: e.target.value })}>
              <option value="">Pilih kursus (opsional)</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <button type="button" onClick={sendInvite} className="w-full py-2 bg-[var(--hf-brand-600)] text-white rounded-lg">Kirim Undangan</button>
          </div>
        </Modal>
      </HumanifyLayout>
    </PageGuard>
  );
}
