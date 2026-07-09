import { useState, useMemo, useEffect } from 'react';
import {
  X, ChevronLeft, ChevronRight, Search, User, FileWarning,
  Paperclip, Loader2, CheckCircle, AlertCircle, Camera,
} from 'lucide-react';

export const SP_TYPES = [
  { value: 'TEGURAN', label: 'Teguran Lisan/Tertulis', desc: 'Peringatan awal tanpa SP formal' },
  { value: 'SP1', label: 'SP 1', desc: 'Surat Peringatan tingkat pertama' },
  { value: 'SP2', label: 'SP 2', desc: 'Surat Peringatan tingkat kedua' },
  { value: 'SP3', label: 'SP 3', desc: 'Surat Peringatan tingkat ketiga' },
] as const;

export type SpFormState = {
  employee_id: string;
  letter_type: string;
  violation_type: string;
  violation_description: string;
  incident_date: string;
  request_reason: string;
  notes: string;
};

type TeamMember = { id: string; name: string; position?: string; department?: string; employee_code?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  team: TeamMember[];
  form: SpFormState;
  onChange: (patch: Partial<SpFormState>) => void;
  evidenceFiles: File[];
  evidencePreviews: { name: string; url: string; type: string }[];
  onEvidenceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveEvidence: (name: string) => void;
  onSubmit: () => void;
  submitting: boolean;
};

const STEPS = [
  { id: 1, title: 'Karyawan', short: '1' },
  { id: 2, title: 'Pelanggaran', short: '2' },
  { id: 3, title: 'Bukti & Kirim', short: '3' },
] as const;

export default function SpRequestModal({
  open,
  onClose,
  team,
  form,
  onChange,
  evidenceFiles,
  evidencePreviews,
  onEvidenceChange,
  onRemoveEvidence,
  onSubmit,
  submitting,
}: Props) {
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setStep(form.employee_id ? 2 : 1);
      setSearch('');
    }
  }, [open, form.employee_id]);

  const filteredTeam = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return team;
    return team.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.position?.toLowerCase().includes(q) ||
      m.department?.toLowerCase().includes(q) ||
      m.employee_code?.toLowerCase().includes(q)
    );
  }, [team, search]);

  const selectedMember = team.find(m => String(m.id) === String(form.employee_id));

  const step1Valid = !!form.employee_id;
  const step2Valid = !!form.violation_description.trim() && !!form.request_reason.trim() && !!form.incident_date;
  const canSubmit = step1Valid && step2Valid;

  const goNext = () => {
    if (step === 1 && !step1Valid) return;
    if (step === 2 && !step2Valid) return;
    setStep(s => Math.min(3, s + 1));
  };

  const goBack = () => setStep(s => Math.max(1, s - 1));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sp-modal-title"
        className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[min(92dvh,720px)] sm:max-h-[85vh] overflow-hidden animate-slide-up"
      >
        {/* Sticky header */}
        <div className="flex-shrink-0 border-b border-slate-100 bg-white/95 backdrop-blur-sm safe-area-pt">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <button
              type="button"
              onClick={step > 1 ? goBack : onClose}
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
              aria-label={step > 1 ? 'Kembali' : 'Tutup'}
            >
              {step > 1 ? <ChevronLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
            <div className="text-center flex-1 min-w-0 px-2">
              <h3 id="sp-modal-title" className="font-bold text-slate-900 text-sm truncate">
                Permohonan Surat Peringatan
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Langkah {step} dari 3 · {STEPS[step - 1].title}</p>
            </div>
            <div className="w-9" />
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 px-4 pb-3">
            {STEPS.map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex-1 flex items-center gap-1">
                  <div
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      done || active ? 'bg-violet-600' : 'bg-slate-200'
                    }`}
                  />
                  {i < STEPS.length - 1 && <div className="w-0.5" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 min-h-0">
          {step === 1 && (
            <>
              <div className="rounded-2xl bg-violet-50 border border-violet-100 p-3.5">
                <p className="text-xs text-violet-800 leading-relaxed">
                  Pilih karyawan yang akan diajukan permohonan SP. Permohonan akan diproses oleh HR Team.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari nama, jabatan, departemen..."
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
                />
              </div>

              <div className="space-y-2 max-h-[min(40vh,320px)] overflow-y-auto -mx-1 px-1">
                {filteredTeam.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-8">Tidak ada karyawan ditemukan</p>
                ) : filteredTeam.map(member => {
                  const selected = String(member.id) === String(form.employee_id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => onChange({ employee_id: String(member.id) })}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-[0.99] ${
                        selected
                          ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200'
                          : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                        selected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {(member.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {member.position}{member.department ? ` · ${member.department}` : ''}
                        </p>
                      </div>
                      {selected && <CheckCircle className="w-5 h-5 text-violet-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {selectedMember && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <User className="w-5 h-5 text-violet-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{selectedMember.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{selectedMember.position}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-2 block">Jenis Surat</label>
                <div className="grid grid-cols-2 gap-2">
                  {SP_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => onChange({ letter_type: t.value })}
                      className={`p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${
                        form.letter_type === t.value
                          ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-200'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-900">{t.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Tanggal Kejadian *</label>
                <input
                  type="date"
                  value={form.incident_date}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => onChange({ incident_date: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Deskripsi Pelanggaran *
                  <span className="font-normal text-slate-400 ml-1">({form.violation_description.length}/500)</span>
                </label>
                <textarea
                  value={form.violation_description}
                  onChange={e => onChange({ violation_description: e.target.value.slice(0, 500) })}
                  rows={4}
                  placeholder="Jelaskan pelanggaran secara detail: apa, kapan, dampak..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Alasan Permohonan *</label>
                <textarea
                  value={form.request_reason}
                  onChange={e => onChange({ request_reason: e.target.value })}
                  rows={3}
                  placeholder="Mengapa SP perlu dikeluarkan untuk karyawan ini..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Catatan untuk HR (opsional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => onChange({ notes: e.target.value })}
                  rows={2}
                  placeholder="Catatan internal tambahan..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
                />
              </div>

              {!step2Valid && (form.violation_description || form.request_reason) && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Lengkapi tanggal kejadian, deskripsi pelanggaran, dan alasan permohonan.</span>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                <div className="p-3 bg-slate-50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Ringkasan</p>
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500 shrink-0">Karyawan</dt>
                      <dd className="font-semibold text-slate-900 text-right truncate">{selectedMember?.name || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Jenis</dt>
                      <dd className="font-semibold text-slate-900">{SP_TYPES.find(t => t.value === form.letter_type)?.label || form.letter_type}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Tanggal</dt>
                      <dd className="font-semibold text-slate-900">{form.incident_date || '—'}</dd>
                    </div>
                  </dl>
                </div>
                <div className="p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Pelanggaran</p>
                  <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">{form.violation_description}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">Bukti / Evidence</label>
                  <span className="text-[10px] text-slate-400">{evidenceFiles.length}/5 file</span>
                </div>
                <label className={`flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
                  evidenceFiles.length >= 5
                    ? 'border-slate-100 bg-slate-50 opacity-50 pointer-events-none'
                    : 'border-violet-200 bg-violet-50/50 hover:bg-violet-50 hover:border-violet-300 active:scale-[0.99]'
                }`}>
                  <Camera className="w-6 h-6 text-violet-500" />
                  <span className="text-xs font-semibold text-violet-700">Foto atau PDF</span>
                  <span className="text-[10px] text-slate-400">Maks. 5 file · otomatis dikompres</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    className="hidden"
                    onChange={onEvidenceChange}
                    disabled={evidenceFiles.length >= 5}
                  />
                </label>

                {evidencePreviews.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                    {evidencePreviews.map(p => (
                      <div key={p.name} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        {p.type.startsWith('image/') && p.url ? (
                          <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-1">
                            <Paperclip className="w-5 h-5 text-slate-400 mb-1" />
                            <span className="text-[8px] text-slate-500 text-center line-clamp-2 break-all">{p.name}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveEvidence(p.name)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm active:scale-95"
                          aria-label="Hapus"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 border-t border-slate-100 bg-white p-4 safe-area-pb space-y-2">
          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              Lanjut
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting || !canSubmit}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition-all shadow-lg shadow-violet-500/20"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Mengajukan...</>
              ) : (
                <><FileWarning className="w-4 h-4" /> Ajukan Permohonan ke HR</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
