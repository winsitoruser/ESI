import {
  AlertTriangle, CheckCircle, Clock, FileText, MessageSquare, Scale,
  Shield, UserX, XCircle, Ban, Gavel, type LucideIcon,
} from 'lucide-react';
import {
  LETTER_TYPE_LABELS,
  STATUS_LABELS,
  PHASE_LABELS,
  type DisciplinaryLetterType,
  type DisciplinaryStatus,
} from '@/lib/hris/disciplinary-workflow';

export const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; gradient: string; icon: LucideIcon }> = {
  TEGURAN: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', gradient: 'from-yellow-400 to-amber-500', icon: MessageSquare },
  SP1: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', gradient: 'from-amber-400 to-orange-500', icon: AlertTriangle },
  SP2: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', gradient: 'from-orange-400 to-red-400', icon: Shield },
  SP3: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', gradient: 'from-red-400 to-rose-600', icon: Ban },
  TERMINATION: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', gradient: 'from-rose-500 to-red-700', icon: Gavel },
};

export const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  submitted: 'bg-blue-50 text-blue-700 ring-blue-200',
  investigating: 'bg-violet-50 text-violet-700 ring-violet-200',
  drafting: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  review: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  pending_approval: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-teal-50 text-teal-700 ring-teal-200',
  issued: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  acknowledged: 'bg-green-50 text-green-800 ring-green-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  cancelled: 'bg-gray-100 text-gray-500 ring-gray-200',
  expired: 'bg-orange-50 text-orange-700 ring-orange-200',
};

export function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

export function EmployeeAvatar({ name, size = 'md' }: { name?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm';
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center flex-shrink-0 shadow-sm`}>
      {getInitials(name)}
    </div>
  );
}

export function TypeBadge({ type, size = 'sm' }: { type: string; size?: 'sm' | 'md' }) {
  const s = TYPE_STYLES[type] || TYPE_STYLES.TEGURAN;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 ${size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'} rounded-full font-semibold ${s.bg} ${s.text} ring-1 ${s.border}`}>
      <Icon className={size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} />
      {type}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
      {STATUS_LABELS[status as DisciplinaryStatus] || status}
    </span>
  );
}

export function ApprovalProgress({ steps }: { steps: any[] }) {
  if (!steps?.length) return null;
  const done = steps.filter((s) => s.status === 'approved').length;
  const pct = Math.round((done / steps.length) * 100);
  const rejected = steps.some((s) => s.status === 'rejected');
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-gray-500">
        <span>Progress persetujuan</span>
        <span>{done}/{steps.length} tahap</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${rejected ? 'bg-red-500' : pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ApprovalTimeline({ steps, fmtDate }: { steps: any[]; fmtDate: (d: string) => string }) {
  if (!steps?.length) return <p className="text-sm text-gray-400 italic py-4">Belum ada tahap persetujuan</p>;

  const stepIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="w-5 h-5 text-white" />;
    if (status === 'rejected') return <XCircle className="w-5 h-5 text-white" />;
    if (status === 'pending') return <Clock className="w-5 h-5 text-white" />;
    return <div className="w-2 h-2 rounded-full bg-white/60" />;
  };

  const stepBg = (status: string) => {
    if (status === 'approved') return 'bg-emerald-500 shadow-emerald-200';
    if (status === 'rejected') return 'bg-red-500 shadow-red-200';
    if (status === 'pending') return 'bg-amber-500 shadow-amber-200 animate-pulse';
    return 'bg-gray-300';
  };

  return (
    <div className="relative">
      {steps.map((step, idx) => (
        <div key={step.id || idx} className="flex gap-4 pb-6 last:pb-0">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md ${stepBg(step.status)}`}>
              {stepIcon(step.status)}
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-0.5 flex-1 mt-2 min-h-[24px] ${step.status === 'approved' ? 'bg-emerald-300' : 'bg-gray-200'}`} />
            )}
          </div>
          <div className={`flex-1 rounded-xl border p-4 transition-shadow ${
            step.status === 'pending' ? 'border-amber-200 bg-amber-50/50 shadow-sm' :
            step.status === 'approved' ? 'border-emerald-100 bg-white' :
            step.status === 'rejected' ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-gray-50/50'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Tahap {step.step_order}: {step.approver_title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {PHASE_LABELS[step.phase as keyof typeof PHASE_LABELS] || step.phase} · {step.approver_role}
                </p>
              </div>
              <StatusBadge status={step.status === 'waiting' ? 'draft' : step.status === 'approved' ? 'approved' : step.status === 'rejected' ? 'rejected' : 'pending_approval'} />
            </div>
            {step.approver_name && (
              <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                <UserX className="w-3 h-3" /> {step.approver_name}
              </p>
            )}
            {step.comments && (
              <p className="text-xs text-gray-600 mt-2 bg-white/80 rounded-lg p-2 border border-gray-100 italic">
                "{step.comments}"
              </p>
            )}
            {step.acted_at && <p className="text-[10px] text-gray-400 mt-2">{fmtDate(step.acted_at)}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LetterTypeCards({
  value,
  onChange,
}: {
  value: DisciplinaryLetterType;
  onChange: (t: DisciplinaryLetterType) => void;
}) {
  const types: DisciplinaryLetterType[] = ['TEGURAN', 'SP1', 'SP2', 'SP3', 'TERMINATION'];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {types.map((type) => {
        const s = TYPE_STYLES[type];
        const Icon = s.icon;
        const selected = value === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`relative p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] ${
              selected
                ? `${s.border} ${s.bg} ring-2 ring-offset-2 ring-indigo-400 shadow-md`
                : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-3 shadow-sm`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className={`text-xs font-bold ${selected ? s.text : 'text-gray-800'}`}>{type}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{LETTER_TYPE_LABELS[type].replace(/^Surat /, '')}</p>
            {selected && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, gradient, onClick, active }: {
  label: string; value: number; icon: LucideIcon; gradient: string; onClick?: () => void; active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left bg-white rounded-2xl border p-4 transition-all hover:shadow-md ${active ? 'border-indigo-300 ring-2 ring-indigo-100 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </button>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border rounded-2xl p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, description, actionLabel, onAction }: {
  title: string; description: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mb-4">
        <Scale className="w-8 h-8 text-orange-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="mt-5 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function WizardSteps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            i < current ? 'bg-emerald-500 text-white' :
            i === current ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
            'bg-gray-100 text-gray-400'
          }`}>
            {i < current ? <CheckCircle className="w-4 h-4" /> : i + 1}
          </div>
          <span className={`text-xs font-medium hidden sm:block ${i === current ? 'text-indigo-700' : i < current ? 'text-emerald-600' : 'text-gray-400'}`}>
            {label}
          </span>
          {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < current ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );
}
