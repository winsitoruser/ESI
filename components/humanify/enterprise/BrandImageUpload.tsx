import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  label: string;
  hint?: string;
  value: string;
  kind?: 'logo' | 'stamp';
  onChange: (url: string) => void;
}

export default function BrandImageUpload({ label, hint, value, kind = 'logo', onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Pilih berkas gambar (PNG, JPG, WebP, SVG)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran maksimal 2 MB');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append(kind === 'stamp' ? 'stamp' : 'logo', file);
      const res = await fetch(`/api/humanify/upload-letter-logo?kind=${kind}`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Upload gagal');
      onChange(json.data.url);
      toast.success(kind === 'stamp' ? 'Stempel diunggah' : 'Logo diunggah');
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengunggah');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="text-sm text-[color:var(--hf-ink-secondary)]">{label}</span>
      <div
        className={`mt-1 flex items-start gap-3 rounded-[var(--hf-radius-lg)] border border-dashed p-3 transition-colors ${
          dragOver ? 'border-[var(--hf-brand-500)] bg-[var(--hf-brand-50)]' : 'border-[var(--hf-border)] bg-[var(--hf-surface-muted)]'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
      >
        {value ? (
          <div className="relative">
            <img src={value} alt={label} className="h-16 w-16 rounded-lg border border-[var(--hf-border)] bg-white object-contain p-1" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--hf-danger)] text-white"
              aria-label="Hapus gambar"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-[var(--hf-border)] bg-white text-[color:var(--hf-ink-faint)]">
            <ImagePlus className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="hf-btn-secondary text-xs disabled:opacity-50"
          >
            {uploading ? (
              <><Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />Mengunggah…</>
            ) : 'Unggah gambar'}
          </button>
          <p className="mt-1 text-[11px] text-[color:var(--hf-ink-muted)]">
            {hint || 'PNG, JPG, WebP, SVG · maks. 2 MB. Logo ini dipakai di kop surat, slip gaji, dan laporan.'}
          </p>
        </div>
      </div>
    </div>
  );
}
