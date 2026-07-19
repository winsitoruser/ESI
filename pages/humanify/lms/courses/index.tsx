import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav, Modal, LmsStatusBadge } from '@/components/humanify/lms/shared';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import { Plus, BookOpen, ChevronRight, Users } from 'lucide-react';

const API = '/api/humanify/lms/courses';

export default function LmsCoursesPage() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ category: 'onboarding', certificate_enabled: true, certificate_validity_months: 12 });

  const load = useCallback(async () => {
    const d = await fetch(`${API}?action=list`).then((r) => r.json());
    setCourses(d.data || []);
    setDataSource(d.data?.length ? 'live' : 'empty');
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    await fetch(`${API}?action=create-course`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setModal(false);
    load();
  };

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.*']}>
      <HumanifyLayout title={t('hris.lmsCourses')} subtitle="Kurikulum, modul pembelajaran, dan learning path terpadu">
        <LmsPageNav active="courses" />
        <div className="flex justify-between mb-4">
          <DataSourceBadge source={dataSource} />
          <button type="button" onClick={() => setModal(true)} className="flex items-center gap-1 px-4 py-2 bg-[var(--hf-brand-600)] text-white rounded-lg text-sm">
            <Plus className="w-4 h-4" /> Buat Kursus
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {courses.map((c) => (
            <Link key={c.id} href={`/humanify/lms/courses/${c.id}`} className="bg-white border rounded-xl p-5 hover:shadow-md group">
              <div className="flex justify-between items-start">
                <BookOpen className="w-8 h-8 text-[color:var(--hf-brand-600)]" />
                <LmsStatusBadge status={c.status} />
              </div>
              <h3 className="font-semibold mt-3 group-hover:text-[color:var(--hf-brand-600)]">{c.title}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.description || c.category}</p>
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span>{c.module_count || 0} modul</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.enrollment_count || 0} peserta</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 mt-2 group-hover:text-[color:var(--hf-brand-500)]" />
            </Link>
          ))}
        </div>
        {!courses.length && (
          <p className="text-center text-gray-400 py-16">Belum ada kursus — buat kursus pertama untuk memulai learning path</p>
        )}

        <Modal open={modal} onClose={() => setModal(false)} title="Buat Kursus Baru">
          <div className="space-y-3">
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Judul kursus" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Deskripsi" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="onboarding">Onboarding</option>
              <option value="compliance">Compliance</option>
              <option value="technical">Technical</option>
              <option value="soft_skill">Soft Skill</option>
              <option value="general">General</option>
            </select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.certificate_enabled} onChange={(e) => setForm({ ...form, certificate_enabled: e.target.checked })} /> Terbitkan sertifikat otomatis</label>
            <button type="button" onClick={create} className="w-full py-2 bg-[var(--hf-brand-600)] text-white rounded-lg">Buat Kursus</button>
          </div>
        </Modal>
      </HumanifyLayout>
    </PageGuard>
  );
}
