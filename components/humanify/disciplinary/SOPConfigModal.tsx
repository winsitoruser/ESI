import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, GripVertical, AlertTriangle } from 'lucide-react';
import {
  DISCIPLINARY_LADDER,
  LETTER_TYPE_LABELS,
  DEFAULT_SOP_TEMPLATES,
  type DisciplinaryLetterType,
  type DisciplinaryPhase,
} from '@/lib/hris/disciplinary-workflow';
import { TypeBadge } from './DisciplinaryUI';

const PHASES: { value: DisciplinaryPhase; label: string }[] = [
  { value: 'request', label: 'Pengajuan' },
  { value: 'investigation', label: 'Investigasi' },
  { value: 'drafting', label: 'Draft' },
  { value: 'review', label: 'Review' },
  { value: 'approval', label: 'Persetujuan' },
  { value: 'issuance', label: 'Penerbitan' },
];

const ROLES = ['MANAGER', 'HR_STAFF', 'HR_MANAGER', 'LEGAL', 'DIRECTOR', 'GM', 'EMPLOYEE'];

interface ApprovalLevelRow {
  level: number;
  phase: DisciplinaryPhase;
  role: string;
  title: string;
  required: boolean;
}

interface SOPConfigModalProps {
  open: boolean;
  template?: any | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function SOPConfigModal({ open, template, onClose, onSave }: SOPConfigModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    letter_type: 'SP1' as DisciplinaryLetterType,
    description: '',
    validity_months: 6,
    requires_previous: '',
  });
  const [levels, setLevels] = useState<ApprovalLevelRow[]>([]);

  useEffect(() => {
    if (!open) return;
    if (template?.id) {
      setForm({
        name: template.name || '',
        letter_type: template.letter_type || template.letterType || 'SP1',
        description: template.description || '',
        validity_months: template.validity_months ?? template.validityMonths ?? 6,
        requires_previous: template.prerequisites?.requiresPreviousType || template.prerequisites?.requires_previous_type || '',
      });
      const lv = template.approval_levels || template.approvalLevels || [];
      setLevels(lv.map((l: any, i: number) => ({
        level: l.level ?? i + 1,
        phase: l.phase || 'approval',
        role: l.role || 'HR_MANAGER',
        title: l.title || '',
        required: l.required !== false,
      })));
    } else {
      const def = DEFAULT_SOP_TEMPLATES.find((t) => t.letterType === 'SP1')!;
      setForm({ name: '', letter_type: 'SP1', description: '', validity_months: 6, requires_previous: '' });
      setLevels(def.approvalLevels.map((l) => ({ ...l })));
    }
  }, [open, template]);

  const addLevel = () => {
    setLevels((prev) => [...prev, {
      level: prev.length + 1,
      phase: 'approval',
      role: 'HR_MANAGER',
      title: 'Tahap Baru',
      required: true,
    }]);
  };

  const removeLevel = (idx: number) => {
    setLevels((prev) => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, level: i + 1 })));
  };

  const updateLevel = (idx: number, patch: Partial<ApprovalLevelRow>) => {
    setLevels((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: template?.id,
        name: form.name,
        letter_type: form.letter_type,
        description: form.description,
        validity_months: form.validity_months,
        approval_levels: levels,
        prerequisites: form.requires_previous ? { requiresPreviousType: form.requires_previous } : {},
        phases: levels.map((l) => ({ phase: l.phase, label: l.title, role: l.role, required: l.required })),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex items-center justify-between bg-indigo-50">
          <div>
            <h3 className="font-bold text-gray-900">{template?.id ? 'Edit Template SOP' : 'Buat Template SOP Baru'}</h3>
            <p className="text-xs text-gray-500">Konfigurasi alur persetujuan per jenis surat</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Nama SOP *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" placeholder="SOP SP1 Custom" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Jenis Surat</label>
              <select value={form.letter_type} onChange={(e) => setForm({ ...form, letter_type: e.target.value as DisciplinaryLetterType })}
                className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" disabled={!!template?.is_default}>
                {DISCIPLINARY_LADDER.map((t) => <option key={t} value={t}>{LETTER_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Deskripsi</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Masa Berlaku (bulan)</label>
              <input type="number" min={0} value={form.validity_months} onChange={(e) => setForm({ ...form, validity_months: parseInt(e.target.value) || 0 })}
                className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Prasyarat Surat Sebelumnya</label>
              <select value={form.requires_previous} onChange={(e) => setForm({ ...form, requires_previous: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-xl text-sm">
                <option value="">— Tidak ada —</option>
                {DISCIPLINARY_LADDER.filter((t) => t !== form.letter_type).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600 uppercase">Tahap Persetujuan ({levels.length})</label>
              <button type="button" onClick={addLevel} className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-800">
                <Plus className="w-3.5 h-3.5" /> Tambah Tahap
              </button>
            </div>
            <div className="space-y-2">
              {levels.map((lv, idx) => (
                <div key={idx} className="flex gap-2 items-start p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <GripVertical className="w-4 h-4 text-gray-300 mt-2 flex-shrink-0" />
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1">{idx + 1}</span>
                  <div className="flex-1 grid sm:grid-cols-3 gap-2">
                    <input value={lv.title} onChange={(e) => updateLevel(idx, { title: e.target.value })}
                      className="px-2 py-1.5 border rounded-lg text-xs" placeholder="Judul tahap" />
                    <select value={lv.phase} onChange={(e) => updateLevel(idx, { phase: e.target.value as DisciplinaryPhase })}
                      className="px-2 py-1.5 border rounded-lg text-xs">
                      {PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <select value={lv.role} onChange={(e) => updateLevel(idx, { role: e.target.value })}
                      className="px-2 py-1.5 border rounded-lg text-xs">
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  {levels.length > 1 && (
                    <button type="button" onClick={() => removeLevel(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {template?.is_default && (
            <p className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 p-3 rounded-xl">
              <AlertTriangle className="w-3.5 h-3.5" /> Template default — perubahan hanya memperbarui konfigurasi, tidak menghapus template sistem.
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t flex gap-3 bg-gray-50">
          <button onClick={onClose} className="flex-1 py-3 border rounded-xl text-sm font-medium hover:bg-white">Batal</button>
          <button onClick={handleSubmit} disabled={saving || !form.name.trim()}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SOPConfigList({
  templates,
  onEdit,
  onCreate,
  onRefresh,
}: {
  templates: any[];
  onEdit: (t: any) => void;
  onCreate: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Konfigurasi SOP</h2>
          <p className="text-sm text-gray-500">Atur alur persetujuan, prasyarat, dan masa berlaku per jenis surat</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2.5 border rounded-xl hover:bg-gray-50 text-sm">Refresh</button>
          <button onClick={onCreate} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Template Baru
          </button>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {templates.map((sop) => (
          <div key={sop.id || sop.letter_type} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <TypeBadge type={sop.letter_type || sop.letterType} />
                  {sop.is_default && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Default</span>}
                </div>
                <h3 className="font-semibold text-gray-900">{sop.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{sop.description}</p>
                <p className="text-xs text-gray-400 mt-2">{(sop.approval_levels || sop.approvalLevels || []).length} tahap · {sop.validity_months ?? sop.validityMonths ?? 6} bln</p>
              </div>
              <button onClick={() => onEdit(sop)} className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50">
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
