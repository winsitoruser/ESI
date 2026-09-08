import { useState, useEffect, useCallback, useMemo } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import EmployeePicker from '@/components/humanify/EmployeePicker';
import { PageGuard } from '@/components/permissions';
import { Modal } from '@/components/humanify/lms/shared';
import { TalentShell } from '@/components/humanify/TalentModuleChrome';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Plus, Award, Search } from 'lucide-react';

export default function CompetencyPage() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const d = await fetch('/api/humanify/lms?action=competency-history').then((r) => r.json());
    setRecords(d.data || []);
    setDataSource(d.data?.length ? 'live' : 'empty');
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((r) =>
      [r.employee_name, r.competency_code, r.competency_name, r.source_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [records, search]);

  const save = async () => {
    if (!form.employee_id || !form.competency_code || !form.competency_name) {
      toast.error('Karyawan, kode, dan nama kompetensi wajib');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/lms?action=record-competency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source_type: form.source_type || 'manual' }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.success === false) throw new Error(j.error || 'Gagal menyimpan');
      toast.success('Kompetensi dicatat');
      setModal(false);
      setForm({});
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('id-ID') : '—';

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.*']}>
      <HumanifyLayout title={t('hris.lmsCompetency')} subtitle="Sertifikat dan riwayat kompetensi karyawan">
        <TalentShell
          current="competency"
          title="Kompetensi & Sertifikat"
          subtitle="Catat skill karyawan, tautkan ke registri sertifikat, dan pantau riwayat kelulusan LMS."
          icon={Award}
          chips={[{ label: `${records.length} rekaman` }]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <DataSourceBadge source={dataSource} />
              <Link href="/humanify/certificates" className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm">
                <Award className="h-4 w-4" /> Registri sertifikat
              </Link>
              <button
                type="button"
                onClick={() => { setForm({}); setModal(true); }}
                className="hf-btn-primary inline-flex items-center gap-1.5 text-sm"
              >
                <Plus className="h-4 w-4" /> Catat kompetensi
              </button>
            </div>
          }
        >
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--hf-ink-faint)]" />
            <input
              className="hf-input w-full pl-9"
              placeholder="Cari karyawan atau kompetensi…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {!records.length ? (
            <HrisEmptyState
              source={dataSource}
              title="Belum ada riwayat kompetensi"
              description="Catat kompetensi manual atau sinkronkan dari kelulusan tes LMS ke registri sertifikat."
              action={(
                <button type="button" onClick={() => setModal(true)} className="hf-btn-primary inline-flex items-center gap-1.5 text-sm">
                  <Plus className="h-4 w-4" /> Catat kompetensi
                </button>
              )}
            />
          ) : (
            <div className="hf-table-wrap">
              <table className="hf-table w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Karyawan</th>
                    <th className="text-left">Kompetensi</th>
                    <th>Level</th>
                    <th>Skor</th>
                    <th>Sumber</th>
                    <th>Sertifikasi</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium text-[color:var(--hf-ink)]">{r.employee_name}</td>
                      <td>
                        <span className="font-mono text-[11px] text-[color:var(--hf-ink-faint)]">{r.competency_code}</span>
                        <p>{r.competency_name}</p>
                      </td>
                      <td className="capitalize">{r.level || '—'}</td>
                      <td className="tabular-nums">{r.score ?? '—'}</td>
                      <td className="capitalize text-[color:var(--hf-ink-muted)]">{r.source_type}</td>
                      <td className="text-[color:var(--hf-ink-muted)]">
                        {fmt(r.certified_at)}{r.expires_at ? ` → ${fmt(r.expires_at)}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {records.length > 0 && visible.length === 0 && (
                <p className="p-8 text-center text-sm text-[color:var(--hf-ink-muted)]">Tidak ada hasil pencarian</p>
              )}
            </div>
          )}

          <Modal open={modal} onClose={() => setModal(false)} title="Catat kompetensi">
            <div className="space-y-3">
              <EmployeePicker
                value={form.employee_id}
                onChange={(emp) => setForm({ ...form, employee_id: emp?.id || '', employee_name: emp?.name || '' })}
                label="Karyawan"
                required
              />
              <input className="hf-input w-full" placeholder="Kode kompetensi" value={form.competency_code || ''} onChange={(e) => setForm({ ...form, competency_code: e.target.value })} />
              <input className="hf-input w-full" placeholder="Nama kompetensi" value={form.competency_name || ''} onChange={(e) => setForm({ ...form, competency_name: e.target.value })} />
              <select className="hf-input w-full" value={form.level || ''} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                <option value="">Level…</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
              <input className="hf-input w-full" type="number" placeholder="Skor (opsional)" value={form.score || ''} onChange={(e) => setForm({ ...form, score: e.target.value ? Number(e.target.value) : undefined })} />
              <button type="button" disabled={saving} onClick={save} className="hf-btn-primary w-full disabled:opacity-50">
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </Modal>
        </TalentShell>
      </HumanifyLayout>
    </PageGuard>
  );
}
