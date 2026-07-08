import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import {
  DEFAULT_LETTERHEAD,
  DEFAULT_LETTER_STYLE,
  LETTER_STYLE_PRESETS,
  type DraftContent,
  type LetterFontFamily,
  type LetterLayoutDensity,
  type LetterStyleConfig,
  type LetterheadConfig,
} from '@/lib/hris/disciplinary-workflow';

interface Props {
  draft: DraftContent;
  onChange: (draft: DraftContent) => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 border rounded-lg text-sm';
const selectCls = 'w-full px-3 py-2 border rounded-lg text-sm bg-white';

export function LetterheadPanel({ draft, onChange }: Props) {
  const lh = draft.letterhead || DEFAULT_LETTERHEAD;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const setLh = (patch: Partial<LetterheadConfig>) =>
    onChange({ ...draft, letterhead: { ...lh, ...patch } });

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await fetch('/api/humanify/upload-letter-logo', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Upload gagal');
      setLh({ logoUrl: json.data.url });
    } catch (e: any) {
      setUploadError(e.message || 'Gagal upload logo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Konfigurasi Kop Surat</p>

      <Field label="Logo Perusahaan">
        <div className="flex items-start gap-3">
          {lh.logoUrl ? (
            <div className="relative">
              <img src={lh.logoUrl} alt="Logo" className="w-16 h-16 object-contain border rounded-lg bg-gray-50 p-1" />
              <button type="button" onClick={() => setLh({ logoUrl: undefined })}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400">
              <ImagePlus className="w-6 h-6" />
            </div>
          )}
          <div className="flex-1 space-y-1">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }} />
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 rounded-lg text-xs border bg-white hover:bg-gray-50 disabled:opacity-50">
              {uploading ? <><Loader2 className="w-3.5 h-3.5 inline animate-spin mr-1" />Mengunggah...</> : 'Upload Logo'}
            </button>
            <p className="text-[10px] text-gray-400">PNG, JPG, WebP, SVG · maks. 2MB</p>
            {uploadError && <p className="text-[10px] text-red-500">{uploadError}</p>}
          </div>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Layout Kop">
          <select value={lh.layout} onChange={(e) => setLh({ layout: e.target.value as LetterheadConfig['layout'] })} className={selectCls}>
            <option value="centered">Tengah (Formal)</option>
            <option value="left">Kiri</option>
            <option value="split">Split (Logo + Info)</option>
          </select>
        </Field>
        <Field label="Inisial (fallback tanpa logo)">
          <input value={lh.logoText || ''} onChange={(e) => setLh({ logoText: e.target.value })} className={inputCls} placeholder="NI" />
        </Field>
      </div>

      <Field label="Nama Perusahaan">
        <input value={lh.companyName} onChange={(e) => setLh({ companyName: e.target.value })} className={`${inputCls} font-semibold`} />
      </Field>
      <Field label="Tagline / Slogan">
        <input value={lh.tagline || ''} onChange={(e) => setLh({ tagline: e.target.value })} className={inputCls} placeholder="People & Workforce Platform" />
      </Field>
      <Field label="Alamat">
        <textarea value={lh.address} onChange={(e) => setLh({ address: e.target.value })} rows={2} className={inputCls} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Telepon">
          <input value={lh.phone || ''} onChange={(e) => setLh({ phone: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Email">
          <input value={lh.email || ''} onChange={(e) => setLh({ email: e.target.value })} className={inputCls} type="email" />
        </Field>
        <Field label="Website">
          <input value={lh.website || ''} onChange={(e) => setLh({ website: e.target.value })} className={inputCls} />
        </Field>
        <Field label="NPWP">
          <input value={lh.npwp || ''} onChange={(e) => setLh({ npwp: e.target.value })} className={inputCls} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={lh.showBorder} onChange={(e) => setLh({ showBorder: e.target.checked })} className="rounded" />
          Garis bawah kop
        </label>
        {lh.showBorder && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Warna garis</span>
            <input type="color" value={lh.borderColor || '#1e293b'} onChange={(e) => setLh({ borderColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
          </div>
        )}
      </div>

      <button type="button" onClick={() => onChange({ ...draft, letterhead: { ...DEFAULT_LETTERHEAD } })}
        className="text-xs text-indigo-600 hover:text-indigo-800">
        Reset ke default perusahaan
      </button>
    </div>
  );
}

export function LetterStylePanel({ draft, onChange }: Props) {
  const st = draft.style || DEFAULT_LETTER_STYLE;

  const setSt = (patch: Partial<LetterStyleConfig>) =>
    onChange({ ...draft, style: { ...st, ...patch } });

  const applyPreset = (id: string) => {
    const preset = LETTER_STYLE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    onChange({
      ...draft,
      style: { ...st, ...preset.style },
      letterhead: preset.letterhead ? { ...(draft.letterhead || DEFAULT_LETTERHEAD), ...preset.letterhead } : draft.letterhead,
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Style & Tampilan Surat</p>

      <Field label="Preset Style">
        <div className="flex flex-wrap gap-2">
          {LETTER_STYLE_PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => applyPreset(p.id)}
              className="px-3 py-1.5 rounded-lg text-xs border bg-white hover:bg-indigo-50 hover:border-indigo-300 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Font">
          <select value={st.fontFamily} onChange={(e) => setSt({ fontFamily: e.target.value as LetterFontFamily })} className={selectCls}>
            <option value="serif">Serif (Georgia)</option>
            <option value="sans">Sans (Modern)</option>
            <option value="times">Times New Roman</option>
          </select>
        </Field>
        <Field label="Ukuran Font">
          <select value={st.fontSize} onChange={(e) => setSt({ fontSize: e.target.value as LetterStyleConfig['fontSize'] })} className={selectCls}>
            <option value="10pt">10pt — Compact</option>
            <option value="11pt">11pt — Standar</option>
            <option value="12pt">12pt — Besar</option>
          </select>
        </Field>
        <Field label="Spasi Baris">
          <select value={String(st.lineHeight)} onChange={(e) => setSt({ lineHeight: parseFloat(e.target.value) })} className={selectCls}>
            <option value="1.4">Rapat (1.4)</option>
            <option value="1.65">Normal (1.65)</option>
            <option value="1.85">Longgar (1.85)</option>
          </select>
        </Field>
        <Field label="Margin Halaman">
          <select value={st.density} onChange={(e) => setSt({ density: e.target.value as LetterLayoutDensity })} className={selectCls}>
            <option value="compact">Compact</option>
            <option value="normal">Normal</option>
            <option value="relaxed">Relaxed</option>
          </select>
        </Field>
        <Field label="Align Body">
          <select value={st.bodyAlign} onChange={(e) => setSt({ bodyAlign: e.target.value as 'justify' | 'left' })} className={selectCls}>
            <option value="justify">Rata kiri-kanan</option>
            <option value="left">Rata kiri</option>
          </select>
        </Field>
        <Field label="Layout Tanda Tangan">
          <select value={st.signatureLayout} onChange={(e) => setSt({ signatureLayout: e.target.value as 'dual' | 'single-right' })} className={selectCls}>
            <option value="dual">Dual (HRD + Karyawan)</option>
            <option value="single-right">Single kanan</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Warna Aksen">
          <div className="flex gap-2">
            <input type="color" value={st.accentColor} onChange={(e) => setSt({ accentColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
            <input value={st.accentColor} onChange={(e) => setSt({ accentColor: e.target.value })} className={`${inputCls} flex-1 font-mono text-xs`} />
          </div>
        </Field>
        <Field label="Warna Teks Kop">
          <div className="flex gap-2">
            <input type="color" value={st.headerTextColor} onChange={(e) => setSt({ headerTextColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
            <input value={st.headerTextColor} onChange={(e) => setSt({ headerTextColor: e.target.value })} className={`${inputCls} flex-1 font-mono text-xs`} />
          </div>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={st.showViolationBox} onChange={(e) => setSt({ showViolationBox: e.target.checked })} className="rounded" />
        Tampilkan kotak rincian pelanggaran
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Label TTD Kiri">
          <textarea value={st.signerLeftLabel} onChange={(e) => setSt({ signerLeftLabel: e.target.value })} rows={2} className={inputCls} />
        </Field>
        <Field label="Label TTD Kanan">
          <textarea value={st.signerRightLabel} onChange={(e) => setSt({ signerRightLabel: e.target.value })} rows={2} className={inputCls} />
        </Field>
      </div>

      <button type="button" onClick={() => onChange({ ...draft, style: { ...DEFAULT_LETTER_STYLE } })}
        className="text-xs text-indigo-600 hover:text-indigo-800">
        Reset style default
      </button>
    </div>
  );
}
