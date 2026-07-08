import { useState } from 'react';
import {
  Eye, FileText, LayoutTemplate, Palette, PenLine, Printer, RefreshCw, Save, SplitSquareHorizontal,
} from 'lucide-react';
import {
  LETTER_TYPE_LABELS,
  VIOLATION_TYPE_LABELS,
  getLetterFontCss,
  getLetterPadding,
  parseDraftContent,
  type DisciplinaryLetterType,
  type DraftContent,
  type LetterheadConfig,
} from '@/lib/hris/disciplinary-workflow';
import { LetterheadPanel, LetterStylePanel } from './LetterheadStylePanel';

type EditorMode = 'split' | 'edit' | 'preview';
type EditorTab = 'content' | 'letterhead' | 'style';

interface LetterDraftEditorProps {
  letter: {
    letter_type: DisciplinaryLetterType;
    reference_number?: string;
    letter_number?: string;
    employee_name?: string;
    employee_code?: string;
    position?: string;
    department?: string;
    violation_type?: string;
    incident_date?: string;
    effective_date?: string;
  };
  draft: DraftContent;
  onChange: (draft: DraftContent) => void;
  onSave: () => void;
  onRegenerate?: () => void;
  saving?: boolean;
  readOnly?: boolean;
}

function fmtLong(d?: string) {
  if (!d) return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function LogoBadge({ lh }: { lh: LetterheadConfig }) {
  if (lh.logoUrl) {
    return <img src={lh.logoUrl} alt="Logo" className="flex-shrink-0 w-14 h-14 object-contain rounded-lg" />;
  }
  if (!lh.logoText) return null;
  return (
    <div
      className="flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-lg"
      style={{ backgroundColor: lh.borderColor || '#1e293b' }}
    >
      {lh.logoText.slice(0, 3)}
    </div>
  );
}

function LetterheadBlock({ lh, headerColor }: { lh: LetterheadConfig; headerColor: string }) {
  const contact = [lh.phone && `Telp: ${lh.phone}`, lh.email, lh.website].filter(Boolean).join(' · ');
  const borderStyle = lh.showBorder
    ? { borderBottom: `2px solid ${lh.borderColor || '#1e293b'}`, paddingBottom: '1rem', marginBottom: '1.5rem' }
    : { marginBottom: '1.5rem' };

  if (lh.layout === 'split') {
    return (
      <div style={borderStyle}>
        <div className="flex items-start gap-4">
          <LogoBadge lh={lh} />
          <div className="flex-1" style={{ color: headerColor }}>
            <p className="text-lg font-bold tracking-wide uppercase">{lh.companyName}</p>
            {lh.tagline && <p className="text-[9pt] opacity-70 mt-0.5">{lh.tagline}</p>}
            <p className="text-[9pt] opacity-80 mt-1">{lh.address}</p>
            {contact && <p className="text-[8.5pt] opacity-70 mt-0.5">{contact}</p>}
            {lh.npwp && <p className="text-[8pt] opacity-60 mt-0.5">NPWP: {lh.npwp}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (lh.layout === 'left') {
    return (
      <div style={{ ...borderStyle, textAlign: 'left', color: headerColor }}>
        {lh.logoUrl ? (
          <img src={lh.logoUrl} alt="Logo" className="h-8 object-contain inline-block mr-2 mb-1 align-middle" />
        ) : lh.logoText ? (
          <span className="inline-block px-2 py-0.5 rounded text-white text-xs font-bold mr-2 mb-1"
            style={{ backgroundColor: lh.borderColor || '#1e293b' }}>{lh.logoText}</span>
        ) : null}
        <p className="text-lg font-bold tracking-wide uppercase">{lh.companyName}</p>
        {lh.tagline && <p className="text-[9pt] opacity-70 mt-0.5">{lh.tagline}</p>}
        <p className="text-[9pt] opacity-80 mt-1">{lh.address}</p>
        {contact && <p className="text-[8.5pt] opacity-70 mt-0.5">{contact}</p>}
        {lh.npwp && <p className="text-[8pt] opacity-60 mt-0.5">NPWP: {lh.npwp}</p>}
      </div>
    );
  }

  return (
    <div style={{ ...borderStyle, textAlign: 'center', color: headerColor }}>
      {lh.logoUrl ? (
        <img src={lh.logoUrl} alt="Logo" className="w-10 h-10 object-contain mx-auto mb-2" />
      ) : lh.logoText ? (
        <div className="inline-flex w-10 h-10 rounded-full items-center justify-center text-white text-sm font-bold mb-2"
          style={{ backgroundColor: lh.borderColor || '#1e293b' }}>{lh.logoText.slice(0, 2)}</div>
      ) : null}
      <p className="text-lg font-bold tracking-wide uppercase">{lh.companyName}</p>
      {lh.tagline && <p className="text-[9pt] opacity-70 mt-0.5">{lh.tagline}</p>}
      <p className="text-[9pt] opacity-80 mt-1">{lh.address}</p>
      {contact && <p className="text-[8.5pt] opacity-70 mt-0.5">{contact}</p>}
      {lh.npwp && <p className="text-[8pt] opacity-60 mt-0.5">NPWP: {lh.npwp}</p>}
    </div>
  );
}

export function LetterPreviewPaper({
  letter,
  draft,
}: {
  letter: LetterDraftEditorProps['letter'];
  draft: DraftContent;
}) {
  const dc = parseDraftContent(draft);
  const lh = dc.letterhead!;
  const st = dc.style!;
  const docNo = letter.letter_number || letter.reference_number || 'DRAFT';
  const docDate = fmtLong(letter.effective_date || letter.incident_date);
  const fontFamily = getLetterFontCss(st.fontFamily);
  const padding = getLetterPadding(st.density);

  const paperStyle: React.CSSProperties = {
    fontFamily,
    fontSize: st.fontSize,
    lineHeight: st.lineHeight,
    color: '#111827',
    padding,
  };

  return (
    <div
      className="bg-white shadow-lg border border-gray-200 rounded-sm mx-auto max-w-[210mm] min-h-[297mm] print:shadow-none print:border-0 print:rounded-none print:max-w-none"
      style={paperStyle}
    >
      <LetterheadBlock lh={lh} headerColor={st.headerTextColor} />

      <div className="flex justify-between text-[10pt] mb-6" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div>
          <p>Nomor&nbsp;&nbsp;: <span style={{ color: st.accentColor, fontWeight: 600 }}>{docNo}</span></p>
          <p>Lampiran: —</p>
          <p>Perihal&nbsp;: {dc.subject || LETTER_TYPE_LABELS[letter.letter_type]}</p>
        </div>
        <p>{dc.place || 'Jakarta'}, {docDate}</p>
      </div>

      <div className="whitespace-pre-line mb-6 text-[10.5pt]">{dc.salutation || `Kepada Yth.\n${letter.employee_name}`}</div>

      <p className="mb-4">Dengan hormat,</p>

      <div className="mb-4" style={{ textAlign: st.bodyAlign }}>
        {dc.body.split(/\n\n+/).map((block, bi) => {
          const lines = block.trim().split('\n');
          const isKv = lines.filter((l) => l.trim()).length >= 2
            && lines.filter((l) => l.trim()).every((l) => /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s/]{0,24}?\s*:\s*.+/.test(l.replace(/\t+/g, ' ').trim()));
          if (isKv) {
            return (
              <div key={bi} className="my-3 ml-4 space-y-1" style={{ fontFamily: 'inherit' }}>
                {lines.filter((l) => l.trim()).map((line, li) => {
                  const m = line.replace(/\t+/g, ' ').trim().match(/^(.+?)\s*:\s*(.+)$/);
                  if (!m) return <p key={li}>{line}</p>;
                  return (
                    <div key={li} className="grid gap-x-2" style={{ gridTemplateColumns: '7.5em 0.75em 1fr' }}>
                      <span>{m[1].trim()}</span>
                      <span>:</span>
                      <span>{m[2].trim()}</span>
                    </div>
                  );
                })}
              </div>
            );
          }
          return (
            <p key={bi} className="mb-3 whitespace-pre-line indent-8" style={{ textAlign: st.bodyAlign }}>
              {block.trim()}
            </p>
          );
        })}
      </div>

      {st.showViolationBox && letter.violation_type && (
        <div className="my-4 p-3 rounded text-[10pt]" style={{
          backgroundColor: `${st.accentColor}08`,
          border: `1px solid ${st.accentColor}33`,
          fontFamily: 'system-ui, sans-serif',
        }}>
          <p className="font-semibold" style={{ color: st.accentColor }}>Rincian Pelanggaran</p>
          <p className="mt-1">Jenis: {VIOLATION_TYPE_LABELS[letter.violation_type as keyof typeof VIOLATION_TYPE_LABELS] || letter.violation_type}</p>
          {letter.incident_date && <p>Tanggal kejadian: {fmtLong(letter.incident_date)}</p>}
        </div>
      )}

      <div className="whitespace-pre-line mb-8" style={{ textAlign: st.bodyAlign }}>{dc.closing}</div>

      <p className="mb-16">Demikian surat ini disampaikan untuk dapat diperhatikan dan dijadikan pedoman.</p>

      {st.signatureLayout === 'dual' ? (
        <div className="grid grid-cols-2 gap-8 mt-8 text-[10pt]" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <div>
            <p className="mb-16 whitespace-pre-line">{st.signerLeftLabel}</p>
            <p className="border-t border-gray-400 pt-1 inline-block min-w-[160px]">&nbsp;</p>
          </div>
          <div>
            <p className="mb-16 whitespace-pre-line">{st.signerRightLabel}</p>
            <p className="border-t border-gray-400 pt-1">{letter.employee_name}</p>
            <p className="text-gray-500 text-[9pt]">{letter.employee_code}</p>
          </div>
        </div>
      ) : (
        <div className="flex justify-end mt-8 text-[10pt]" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <div className="text-right">
            <p className="mb-16 whitespace-pre-line">{st.signerRightLabel}</p>
            <p className="border-t border-gray-400 pt-1 inline-block min-w-[180px]">{letter.employee_name}</p>
            <p className="text-gray-500 text-[9pt]">{letter.employee_code}</p>
          </div>
        </div>
      )}

      <p className="text-[8pt] text-gray-400 text-center mt-8 italic print:block" style={{ fontFamily: 'system-ui, sans-serif' }}>
        — Pratinjau draft · belum diterbitkan resmi —
      </p>
    </div>
  );
}

const TAB_CONFIG: { id: EditorTab; label: string; icon: typeof PenLine }[] = [
  { id: 'content', label: 'Isi Surat', icon: FileText },
  { id: 'letterhead', label: 'Kop Surat', icon: LayoutTemplate },
  { id: 'style', label: 'Style', icon: Palette },
];

export default function LetterDraftEditor({
  letter, draft, onChange, onSave, onRegenerate, saving, readOnly,
}: LetterDraftEditorProps) {
  const [mode, setMode] = useState<EditorMode>('split');
  const [tab, setTab] = useState<EditorTab>('content');
  const dc = parseDraftContent(draft);

  const set = (patch: Partial<DraftContent>) => onChange({ ...dc, ...patch });

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const el = document.getElementById('letter-preview-print');
    if (!el) return;
    const st = dc.style!;
    const fontFamily = getLetterFontCss(st.fontFamily);
    w.document.write(`<!DOCTYPE html><html><head><title>Preview Surat</title>
      <style>
        body{margin:0;padding:20px;font-family:${fontFamily};font-size:${st.fontSize};line-height:${st.lineHeight}}
        @page{size:A4;margin:15mm}
      </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
        <div className="flex items-center gap-1">
          <PenLine className="w-4 h-4 text-indigo-500 mr-1" />
          <span className="text-sm font-semibold text-gray-800">Editor & Pratinjau Surat</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['split', 'edit', 'preview'] as EditorMode[]).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === m ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}>
              {m === 'split' ? <><SplitSquareHorizontal className="w-3.5 h-3.5 inline mr-1" />Split</> :
               m === 'edit' ? <><PenLine className="w-3.5 h-3.5 inline mr-1" />Edit</> :
               <><Eye className="w-3.5 h-3.5 inline mr-1" />Preview</>}
            </button>
          ))}
          {onRegenerate && !readOnly && (
            <button type="button" onClick={onRegenerate} className="px-3 py-1.5 rounded-lg text-xs border bg-white hover:bg-gray-50 text-gray-600">
              <RefreshCw className="w-3.5 h-3.5 inline mr-1" />Reset Template
            </button>
          )}
          <button type="button" onClick={handlePrint} className="px-3 py-1.5 rounded-lg text-xs border bg-white hover:bg-gray-50 text-gray-600">
            <Printer className="w-3.5 h-3.5 inline mr-1" />Print
          </button>
          {!readOnly && (
            <button type="button" onClick={onSave} disabled={saving}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
              <Save className="w-3.5 h-3.5 inline mr-1" />{saving ? 'Menyimpan...' : 'Simpan Draft'}
            </button>
          )}
        </div>
      </div>

      <div className={`grid gap-4 ${mode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {(mode === 'split' || mode === 'edit') && !readOnly && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100 bg-gray-50/80">
              {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                    tab === id ? 'bg-white text-indigo-700 border-b-2 border-indigo-600 -mb-px' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
            <div className="p-4">
              {tab === 'content' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Tempat</label>
                    <input value={dc.place || ''} onChange={(e) => set({ place: e.target.value })}
                      className="w-full mt-0.5 px-3 py-2 border rounded-lg text-sm" placeholder="Jakarta" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Perihal / Subjek</label>
                    <input value={dc.subject || ''} onChange={(e) => set({ subject: e.target.value })}
                      className="w-full mt-0.5 px-3 py-2 border rounded-lg text-sm font-medium" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Alamat / Salutation</label>
                    <textarea value={dc.salutation || ''} onChange={(e) => set({ salutation: e.target.value })}
                      rows={3} className="w-full mt-0.5 px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Isi Surat (body)</label>
                    <textarea value={dc.body} onChange={(e) => set({ body: e.target.value })}
                      rows={8} className="w-full mt-0.5 px-3 py-2 border rounded-lg text-sm leading-relaxed" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Penutup</label>
                    <textarea value={dc.closing} onChange={(e) => set({ closing: e.target.value })}
                      rows={3} className="w-full mt-0.5 px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
              )}
              {tab === 'letterhead' && <LetterheadPanel draft={dc} onChange={onChange} />}
              {tab === 'style' && <LetterStylePanel draft={dc} onChange={onChange} />}
            </div>
          </div>
        )}

        {(mode === 'split' || mode === 'preview') && (
          <div className="bg-gray-100 rounded-2xl p-4 overflow-auto max-h-[800px]">
            <div id="letter-preview-print">
              <LetterPreviewPaper letter={letter} draft={dc} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
