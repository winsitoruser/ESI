import { useCallback, useEffect, useState, type FormEvent } from 'react';
import OpsLayout from '@/components/humanify/OpsLayout';
import {
  OpsBadge, OpsConfirm, OpsPageIntro, OpsPageSkeleton, OpsPanel, OpsStat, OpsToast,
} from '@/components/humanify/ops-ui';
import OpsDataTable from '@/components/humanify/OpsDataTable';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import { Image as ImageIcon, RefreshCw, Plus } from 'lucide-react';

type BannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  cta_label: string | null;
  cta_href: string | null;
  placement: 'landing' | 'dashboard' | 'both';
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  imageUrl: '',
  ctaLabel: '',
  ctaHref: '',
  placement: 'both' as BannerRow['placement'],
  sortOrder: '0',
  isActive: true,
  startsAt: '',
  endsAt: '',
};

function placementLabel(p: string) {
  if (p === 'landing') return 'Landing';
  if (p === 'dashboard') return 'Dashboard';
  return 'Keduanya';
}

function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Admin Total — CMS banner landing + dashboard carousel.
 */
export default function PlatformBannersPage() {
  const { gating } = usePlatformOperator('/platform/banners');
  const [rows, setRows] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; title: string } | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform?action=banners').then((r) => r.json());
      if (res.success) setRows(res.data?.banners || []);
      else setToast(res.error || 'Gagal memuat banner');
    } catch {
      setToast('Gagal memuat banner');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!gating) load();
  }, [gating, load]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const editRow = (row: BannerRow) => {
    setEditingId(row.id);
    setForm({
      title: row.title || '',
      subtitle: row.subtitle || '',
      imageUrl: row.image_url || '',
      ctaLabel: row.cta_label || '',
      ctaHref: row.cta_href || '',
      placement: row.placement || 'both',
      sortOrder: String(row.sort_order ?? 0),
      isActive: row.is_active !== false,
      startsAt: toLocalInput(row.starts_at),
      endsAt: toLocalInput(row.ends_at),
    });
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/platform/banner-upload', { method: 'POST', body }).then((r) => r.json());
      if (!res.success) {
        setToast(res.error || 'Upload gagal');
        return;
      }
      setForm((f) => ({ ...f, imageUrl: res.data.url }));
      setToast('Gambar diunggah');
    } catch {
      setToast('Upload gagal');
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        id: editingId || undefined,
        title: form.title,
        subtitle: form.subtitle,
        imageUrl: form.imageUrl,
        ctaLabel: form.ctaLabel,
        ctaHref: form.ctaHref,
        placement: form.placement,
        sortOrder: Number(form.sortOrder || 0),
        isActive: form.isActive,
        startsAt: form.startsAt && !Number.isNaN(new Date(form.startsAt).getTime())
          ? new Date(form.startsAt).toISOString()
          : null,
        endsAt: form.endsAt && !Number.isNaN(new Date(form.endsAt).getTime())
          ? new Date(form.endsAt).toISOString()
          : null,
      };
      const res = await fetch('/api/platform?action=banner', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json());
      if (!res.success) {
        setToast(res.error || 'Gagal menyimpan');
        return;
      }
      setToast(res.message || 'Tersimpan');
      resetForm();
      await load();
    } catch {
      setToast('Gagal menyimpan banner');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setActing(true);
    try {
      const res = await fetch(`/api/platform?action=banner&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }).then((r) => r.json());
      if (!res.success) {
        setToast(res.error || 'Gagal menghapus');
        return;
      }
      setToast('Banner dihapus');
      if (editingId === id) resetForm();
      await load();
    } catch {
      setToast('Gagal menghapus banner');
    } finally {
      setActing(false);
    }
  };

  const liveCount = rows.filter((r) => r.is_active).length;

  return (
    <OpsLayout title="Banner" subtitle="Carousel landing page & dashboard HR">
      <OpsToast message={toast} onDismiss={() => setToast('')} />
      <OpsConfirm
        open={!!confirm}
        title="Hapus banner?"
        message={confirm ? `"${confirm.title}" akan hilang dari landing dan dashboard.` : ''}
        confirmLabel="Hapus"
        danger
        busy={acting}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const id = confirm?.id;
          setConfirm(null);
          if (id) await remove(id);
        }}
      />
      {gating || (loading && rows.length === 0 && !editingId) ? (
        <OpsPageSkeleton variant="table" />
      ) : (
        <div className="space-y-5">
          <OpsPageIntro
            eyebrow="Marketing"
            title="Manajemen banner"
            description="Gambar tampil sebagai carousel di landing humanify.id dan beranda dashboard HR. Maksimal 7 banner aktif per permukaan. Rekomendasi rasio 16:7, JPG/PNG/WebP sampai 2 MB."
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

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <OpsStat label="Total" value={rows.length} icon={ImageIcon} />
            <OpsStat label="Aktif" value={liveCount} tone="success" />
            <OpsStat label="Landing" value={rows.filter((r) => r.placement === 'landing' || r.placement === 'both').length} />
            <OpsStat label="Dashboard" value={rows.filter((r) => r.placement === 'dashboard' || r.placement === 'both').length} />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <OpsDataTable
              rows={rows}
              loading={loading}
              rowKey={(r) => r.id}
              searchPlaceholder="Cari judul atau CTA…"
              emptyTitle="Belum ada banner"
              emptyHint="Buat banner pertama di formulir kanan. Landing tetap memakai hero bawaan sampai ada yang aktif."
              hideExport
              columns={[
                {
                  id: 'preview',
                  header: '',
                  exportOmit: true,
                  cell: (r) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image_url} alt="" className="h-12 w-20 rounded-lg object-cover ring-1 ring-slate-200" />
                  ),
                },
                {
                  id: 'title',
                  header: 'Banner',
                  exportValue: (r) => r.title,
                  cell: (r) => (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{r.title}</p>
                      <p className="truncate text-[11px] text-slate-400">{r.subtitle || r.cta_label || '—'}</p>
                    </div>
                  ),
                },
                {
                  id: 'placement',
                  header: 'Tayang',
                  exportValue: (r) => placementLabel(r.placement),
                  cell: (r) => <OpsBadge tone="brand">{placementLabel(r.placement)}</OpsBadge>,
                },
                {
                  id: 'is_active',
                  header: 'Status',
                  cell: (r) => (
                    <OpsBadge tone={r.is_active ? 'success' : 'neutral'}>
                      {r.is_active ? 'aktif' : 'draft'}
                    </OpsBadge>
                  ),
                },
                {
                  id: 'sort_order',
                  header: 'Urutan',
                  cell: (r) => <span className="text-xs tabular-nums text-slate-500">{r.sort_order}</span>,
                },
                {
                  id: 'actions',
                  header: '',
                  exportOmit: true,
                  cell: (r) => (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => editRow(r)} className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm({ id: r.id, title: r.title })}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  ),
                },
              ]}
            />

            <OpsPanel
              title={editingId ? 'Edit banner' : 'Banner baru'}
              description="Unggah gambar lalu atur judul, CTA, dan lokasi tayang."
              action={
                editingId ? (
                  <button type="button" onClick={resetForm} className="text-xs font-medium text-slate-500 hover:underline">
                    Batal
                  </button>
                ) : (
                  <Plus className="h-4 w-4 text-slate-400" />
                )
              }
            >
              <form onSubmit={save} className="space-y-3">
                <label className="block text-xs font-medium text-slate-600">
                  Judul
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Payroll otomatis untuk tim Indonesia"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Subjudul
                  <textarea
                    value={form.subtitle}
                    onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Absensi, cuti, dan PPh 21 dalam satu alur."
                  />
                </label>
                <div>
                  <p className="text-xs font-medium text-slate-600">Gambar</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="mt-1 block w-full text-xs text-slate-500"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void upload(file);
                    }}
                  />
                  {uploading && <p className="mt-1 text-[11px] text-slate-400">Mengunggah…</p>}
                  {form.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.imageUrl} alt="" className="mt-2 h-24 w-full rounded-xl object-cover ring-1 ring-slate-200" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs font-medium text-slate-600">
                    Label CTA
                    <input
                      value={form.ctaLabel}
                      onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Mulai trial"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-600">
                    Tautan CTA
                    <input
                      value={form.ctaHref}
                      onChange={(e) => setForm((f) => ({ ...f, ctaHref: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      placeholder="/humanify/signup"
                    />
                  </label>
                </div>
                <label className="block text-xs font-medium text-slate-600">
                  Lokasi
                  <select
                    value={form.placement}
                    onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value as BannerRow['placement'] }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="both">Landing + dashboard</option>
                    <option value="landing">Landing saja</option>
                    <option value="dashboard">Dashboard HR saja</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs font-medium text-slate-600">
                    Urutan
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={form.sortOrder}
                      onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="flex items-end gap-2 pb-2 text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    />
                    Tayangkan
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs font-medium text-slate-600">
                    Mulai
                    <input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-600">
                    Selesai
                    <input
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={saving || !form.imageUrl || !form.title}
                  className="hf-btn-primary w-full text-sm disabled:opacity-50"
                >
                  {saving ? 'Menyimpan…' : editingId ? 'Simpan perubahan' : 'Terbitkan banner'}
                </button>
              </form>
            </OpsPanel>
          </div>
        </div>
      )}
    </OpsLayout>
  );
}
