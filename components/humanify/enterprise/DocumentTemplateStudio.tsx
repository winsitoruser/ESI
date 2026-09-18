import { useMemo, useState } from 'react';
import {
  Eye, FileText, LayoutTemplate, Palette, PenLine, RefreshCw, Save, SplitSquareHorizontal,
} from 'lucide-react';
import { LetterheadPanel, LetterStylePanel } from '@/components/humanify/disciplinary/LetterheadStylePanel';
import { LetterPreviewPaper } from '@/components/humanify/disciplinary/LetterDraftEditor';
import {
  PayslipLayoutPicker,
  PayslipPaperPreview,
} from '@/components/humanify/enterprise/PayslipTemplatePreview';
import { parseDraftContent, type DraftContent } from '@/lib/hris/disciplinary-workflow';
import type { LetterMergeContext } from '@/lib/hris/letter-merge-fields';
import type { PayslipLayoutId } from '@/lib/hris/payslip-templates';
import { getPayslipLayout } from '@/lib/hris/payslip-templates';

type EditorTab = 'content' | 'letterhead' | 'style' | 'layout';
type EditorMode = 'split' | 'edit' | 'preview';

export type CatalogItem = {
  type: string;
  name: string;
  description: string;
  kind: string;
  category: string;
};

export type HrTemplate = {
  type: string;
  name: string;
  subject: string;
  salutation: string;
  body: string;
  closing: string;
  place: string;
  useGlobalLetterhead: boolean;
  letterhead?: DraftContent['letterhead'];
  style?: DraftContent['style'];
  layoutVariant?: PayslipLayoutId | string;
  updatedAt?: string;
};

interface Props {
  catalog: CatalogItem[];
  templates: HrTemplate[];
  mergeFields: { key: string; label: string }[];
  sampleContext: LetterMergeContext;
  brandingLogo?: string;
  acting: boolean;
  onSave: (tpl: HrTemplate) => Promise<void>;
  onReset: (type: string) => Promise<void>;
}

const CATEGORY_LABEL: Record<string, string> = {
  kontrak: 'Kontrak',
  surat: 'Surat & paklaring',
  disiplin: 'Disiplin',
  laporan: 'Laporan',
  payroll: 'Payroll',
};

export default function DocumentTemplateStudio({
  catalog, templates, mergeFields, sampleContext, brandingLogo, acting, onSave, onReset,
}: Props) {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(catalog[0]?.type || 'employment-contract');
  const [mode, setMode] = useState<EditorMode>('split');
  const [tab, setTab] = useState<EditorTab>('content');

  const map = useMemo(() => {
    const m: Record<string, HrTemplate> = {};
    for (const t of templates) m[t.type] = t;
    return m;
  }, [templates]);

  const tpl = map[selected];
  const cat = catalog.find((c) => c.type === selected);
  const isPayslip = cat?.kind === 'payslip' || selected === 'payslip';
  const [draftTpl, setDraftTpl] = useState<HrTemplate | null>(null);
  const current = draftTpl && draftTpl.type === selected ? draftTpl : tpl;

  function select(type: string) {
    setSelected(type);
    setDraftTpl(null);
    const next = catalog.find((c) => c.type === type);
    setTab(next?.kind === 'payslip' || type === 'payslip' ? 'layout' : 'content');
  }

  function patch(p: Partial<HrTemplate>) {
    if (!current) return;
    setDraftTpl({ ...current, ...p });
  }

  const dc: DraftContent = parseDraftContent({
    subject: current?.subject,
    salutation: current?.salutation,
    body: current?.body || '',
    closing: current?.closing || '',
    place: current?.place,
    letterhead: current?.useGlobalLetterhead
      ? { ...(current.letterhead || {}), logoUrl: current.letterhead?.logoUrl || brandingLogo }
      : current?.letterhead,
    style: current?.style,
  });

  function insertField(key: string) {
    if (!current) return;
    patch({ body: `${current.body || ''}{{${key}}}` });
  }

  const visible = catalog.filter((c) => filter === 'all' || c.category === filter);

  const editorTabs = isPayslip
    ? ([
        { id: 'layout' as const, label: 'Desain slip', icon: LayoutTemplate },
        { id: 'content' as const, label: 'Catatan', icon: FileText },
        { id: 'letterhead' as const, label: 'Kop / logo', icon: Palette },
      ])
    : ([
        { id: 'content' as const, label: 'Isi dokumen', icon: FileText },
        { id: 'letterhead' as const, label: 'Kop surat', icon: LayoutTemplate },
        { id: 'style' as const, label: 'Style', icon: Palette },
      ]);

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <aside className="hf-card p-3">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--hf-ink-muted)]">Dokumen HR</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <button type="button" onClick={() => setFilter('all')}
            className={`rounded-full px-2.5 py-1 text-[11px] ${filter === 'all' ? 'bg-[var(--hf-brand-600)] text-white' : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'}`}>
            Semua
          </button>
          {Object.entries(CATEGORY_LABEL).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilter(id)}
              className={`rounded-full px-2.5 py-1 text-[11px] ${filter === id ? 'bg-[var(--hf-brand-600)] text-white' : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'}`}>
              {label}
            </button>
          ))}
        </div>
        <ul className="mt-3 max-h-[560px] space-y-0.5 overflow-auto">
          {visible.map((c) => {
            const saved = map[c.type];
            const active = selected === c.type;
            return (
              <li key={c.type}>
                <button
                  type="button"
                  onClick={() => select(c.type)}
                  className={`w-full rounded-[var(--hf-radius)] px-2.5 py-2 text-left ${
                    active ? 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]' : 'hover:bg-[var(--hf-surface-muted)]'
                  }`}
                >
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-[11px] text-[color:var(--hf-ink-muted)]">
                    {c.kind === 'payslip'
                      ? `Desain · ${getPayslipLayout(saved?.layoutVariant).name}`
                      : saved?.updatedAt
                        ? 'Disesuaikan'
                        : 'Default sistem'}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="space-y-3">
        {!current ? (
          <div className="hf-card p-8 text-center text-sm text-[color:var(--hf-ink-muted)]">Pilih jenis dokumen di kiri.</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 hf-card p-3">
              <div>
                <p className="text-sm font-semibold text-[color:var(--hf-ink)]">{cat?.name || current.name}</p>
                <p className="text-xs text-[color:var(--hf-ink-muted)]">{cat?.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(['split', 'edit', 'preview'] as EditorMode[]).map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                      mode === m ? 'bg-[var(--hf-brand-600)] text-white' : 'hf-btn-secondary'
                    }`}>
                    {m === 'split' ? <><SplitSquareHorizontal className="mr-1 inline h-3.5 w-3.5" />Split</> :
                     m === 'edit' ? <><PenLine className="mr-1 inline h-3.5 w-3.5" />Edit</> :
                     <><Eye className="mr-1 inline h-3.5 w-3.5" />Pratinjau</>}
                  </button>
                ))}
                <button type="button" disabled={acting} onClick={() => onReset(current.type).then(() => setDraftTpl(null))} className="hf-btn-secondary text-xs">
                  <RefreshCw className="mr-1 inline h-3.5 w-3.5" />Reset default
                </button>
                <button type="button" disabled={acting} onClick={() => onSave(current).then(() => setDraftTpl(null))} className="hf-btn-primary text-xs disabled:opacity-50">
                  <Save className="mr-1 inline h-3.5 w-3.5" />{acting ? 'Menyimpan…' : 'Simpan template'}
                </button>
              </div>
            </div>

            <div className={`grid gap-4 ${mode === 'split' ? 'xl:grid-cols-2' : 'grid-cols-1'}`}>
              {(mode === 'split' || mode === 'edit') && (
                <div className="hf-card overflow-hidden">
                  <div className="flex border-b border-[var(--hf-border)] bg-[var(--hf-surface-muted)]">
                    {editorTabs.map(({ id, label, icon: Icon }) => (
                      <button key={id} type="button" onClick={() => setTab(id)}
                        className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium ${
                          tab === id ? 'border-b-2 border-[var(--hf-brand-600)] bg-white text-[color:var(--hf-brand-600)]' : 'text-[color:var(--hf-ink-muted)]'
                        }`}>
                        <Icon className="h-3.5 w-3.5" />{label}
                      </button>
                    ))}
                  </div>
                  <div className="p-4">
                    {tab === 'layout' && isPayslip && (
                      <PayslipLayoutPicker
                        value={current.layoutVariant}
                        onChange={(id) => patch({ layoutVariant: id })}
                      />
                    )}
                    {tab === 'content' && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-[color:var(--hf-ink-muted)]">Sisipkan data otomatis</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {mergeFields.map((f) => (
                              <button
                                key={f.key}
                                type="button"
                                onClick={() => insertField(f.key)}
                                className="rounded-full border border-[var(--hf-border)] bg-white px-2 py-0.5 font-mono text-[10px] text-[color:var(--hf-ink-secondary)] hover:border-[var(--hf-brand-500)]"
                                title={f.label}
                              >
                                {`{{${f.key}}}`}
                              </button>
                            ))}
                          </div>
                        </div>
                        <label className="block text-sm">
                          <span className="text-xs text-[color:var(--hf-ink-muted)]">Nama template</span>
                          <input className="hf-input mt-0.5 w-full" value={current.name} onChange={(e) => patch({ name: e.target.value })} />
                        </label>
                        {!isPayslip && (
                          <>
                            <label className="block text-sm">
                              <span className="text-xs text-[color:var(--hf-ink-muted)]">Tempat</span>
                              <input className="hf-input mt-0.5 w-full" value={current.place} onChange={(e) => patch({ place: e.target.value })} />
                            </label>
                            <label className="block text-sm">
                              <span className="text-xs text-[color:var(--hf-ink-muted)]">Perihal / judul</span>
                              <input className="hf-input mt-0.5 w-full font-medium" value={current.subject} onChange={(e) => patch({ subject: e.target.value })} />
                            </label>
                            <label className="block text-sm">
                              <span className="text-xs text-[color:var(--hf-ink-muted)]">Sapaan</span>
                              <textarea className="hf-input mt-0.5 w-full" rows={2} value={current.salutation} onChange={(e) => patch({ salutation: e.target.value })} />
                            </label>
                          </>
                        )}
                        {isPayslip && (
                          <label className="block text-sm">
                            <span className="text-xs text-[color:var(--hf-ink-muted)]">Judul slip</span>
                            <input className="hf-input mt-0.5 w-full font-medium" value={current.subject} onChange={(e) => patch({ subject: e.target.value })} />
                          </label>
                        )}
                        <label className="block text-sm">
                          <span className="text-xs text-[color:var(--hf-ink-muted)]">
                            {isPayslip ? 'Pengantar / catatan atas' : 'Isi (editor)'}
                          </span>
                          <textarea
                            className="hf-input mt-0.5 w-full font-[Georgia,serif] leading-relaxed"
                            rows={isPayslip ? 4 : 12}
                            value={current.body}
                            onChange={(e) => patch({ body: e.target.value })}
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="text-xs text-[color:var(--hf-ink-muted)]">
                            {isPayslip ? 'Catatan kaki' : 'Penutup'}
                          </span>
                          <textarea className="hf-input mt-0.5 w-full" rows={3} value={current.closing} onChange={(e) => patch({ closing: e.target.value })} />
                        </label>
                      </div>
                    )}
                    {tab === 'letterhead' && (
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={current.useGlobalLetterhead}
                            onChange={(e) => patch({ useGlobalLetterhead: e.target.checked })}
                          />
                          Ikuti kop & logo perusahaan (pengaturan Branding)
                        </label>
                        {!current.useGlobalLetterhead && (
                          <LetterheadPanel
                            draft={dc}
                            onChange={(next) => patch({ letterhead: next.letterhead, style: next.style })}
                          />
                        )}
                        {current.useGlobalLetterhead && (
                          <p className="text-xs text-[color:var(--hf-ink-muted)]">
                            Logo, nama perusahaan, dan alamat mengikuti tab Branding. Matikan opsi di atas untuk kop khusus template ini.
                          </p>
                        )}
                      </div>
                    )}
                    {tab === 'style' && !isPayslip && (
                      <LetterStylePanel
                        draft={dc}
                        onChange={(next) => patch({ style: next.style, letterhead: next.letterhead })}
                      />
                    )}
                  </div>
                </div>
              )}

              {(mode === 'split' || mode === 'preview') && (
                <div className="max-h-[900px] overflow-auto rounded-[var(--hf-radius-xl)] bg-slate-100 p-4">
                  {isPayslip ? (
                    <PayslipPaperPreview
                      layoutId={current.layoutVariant}
                      intro={fill(current.body, sampleContext)}
                      closing={fill(current.closing, sampleContext)}
                      brandingLogo={
                        current.useGlobalLetterhead
                          ? brandingLogo
                          : current.letterhead?.logoUrl || brandingLogo
                      }
                      companyName={String(sampleContext.company_name || '')}
                      companyAddress={String(sampleContext.company_address || '')}
                    />
                  ) : (
                    <LetterPreviewPaper
                      letter={{
                        letter_type: selected.includes('termination') ? 'TERMINATION' : selected.includes('reprehend') ? 'TEGURAN' : 'SP1',
                        letter_number: String(sampleContext.letter_number || 'DRAFT'),
                        employee_name: String(sampleContext.employee_name || ''),
                        employee_code: String(sampleContext.employee_code || ''),
                        position: String(sampleContext.position || ''),
                        department: String(sampleContext.department || ''),
                        violation_type: cat?.category === 'disiplin' ? String(sampleContext.violation_type || '') : '',
                        incident_date: String(sampleContext.incident_date || ''),
                        effective_date: String(sampleContext.effective_date || ''),
                      }}
                      draft={{
                        ...dc,
                        subject: fill(dc.subject, sampleContext),
                        salutation: fill(dc.salutation, sampleContext),
                        body: fill(dc.body, sampleContext),
                        closing: fill(dc.closing, sampleContext),
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function fill(text: string | undefined, ctx: LetterMergeContext): string {
  if (!text) return '';
  return text.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) => {
    const v = ctx[key];
    return v == null ? `{{${key}}}` : String(v);
  });
}
