import { useState, useEffect, useCallback } from 'react';
import { FileWarning, AlertTriangle, CheckCircle, Loader2, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, SectionHeader, StatusBadge } from '@/components/employee/portal-ui';

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

const SP_LABEL: Record<string, string> = {
  TEGURAN: 'Teguran', SP1: 'Surat Peringatan 1', SP2: 'Surat Peringatan 2',
  SP3: 'Surat Peringatan 3', TERMINATION: 'Pemutusan Hubungan Kerja',
};

const STATUS_MAP: Record<string, { status: string; label: string }> = {
  issued: { status: 'pending', label: 'Perlu Diakui' },
  acknowledged: { status: 'approved', label: 'Diakui' },
  pending_approval: { status: 'pending', label: 'Proses' },
};

function LetterCard({ letter, onAcknowledge, acknowledging }: {
  letter: any;
  onAcknowledge: (id: string) => void;
  acknowledging: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsAck = letter.status === 'issued';
  const st = STATUS_MAP[letter.status] || { status: letter.status, label: letter.status };

  return (
    <Card
      variant="elevated"
      className={`${needsAck ? 'ring-2 ring-red-200/80 border-red-100' : ''}`}
    >
      <div className="p-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-start justify-between gap-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-slate-900 truncate">
              {SP_LABEL[letter.letter_type] || letter.letter_type}
            </p>
            {letter.letter_number && (
              <p className="text-[11px] text-slate-500 font-mono truncate">{letter.letter_number}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={st.status === 'pending' && needsAck ? 'pending' : st.status === 'approved' ? 'approved' : 'pending'} />
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {(expanded || needsAck) && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
              {letter.incident_date && (
                <p><span className="font-medium text-slate-700">Kejadian:</span> {fmtDate(letter.incident_date)}</p>
              )}
              {letter.effective_date && (
                <p><span className="font-medium text-slate-700">Terbit:</span> {fmtDate(letter.effective_date)}</p>
              )}
              {letter.expiry_date && (
                <p className="sm:col-span-2"><span className="font-medium text-slate-700">Berlaku hingga:</span> {fmtDate(letter.expiry_date)}</p>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pelanggaran</p>
              <p className="text-xs text-slate-700 leading-relaxed">{letter.violation_description}</p>
            </div>

            {letter.acknowledged_at && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                Diakui pada {fmtDate(letter.acknowledged_at)}
              </div>
            )}

            {needsAck && (
              <button
                onClick={() => onAcknowledge(letter.id)}
                disabled={acknowledging === letter.id}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-semibold active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-red-500/15"
              >
                {acknowledging === letter.id ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Akui Penerimaan Surat</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function DisciplinaryTab() {
  const [loading, setLoading] = useState(true);
  const [letters, setLetters] = useState<any[]>([]);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const fetchLetters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employee/dashboard?action=disciplinary-letters');
      const data = await res.json();
      setLetters(Array.isArray(data.data) ? data.data : []);
    } catch { setLetters([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLetters(); }, [fetchLetters]);

  const handleAcknowledge = async (id: string) => {
    if (!confirm('Dengan ini saya mengakui telah menerima dan memahami isi surat peringatan ini.')) return;
    setAcknowledging(id);
    try {
      const res = await fetch('/api/employee/dashboard?action=acknowledge-disciplinary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Surat peringatan telah diakui');
        fetchLetters();
      } else toast.error(data.error || 'Gagal mengakui surat');
    } catch { toast.error('Gagal mengakui surat'); }
    finally { setAcknowledging(null); }
  };

  const pendingAck = letters.filter(l => l.status === 'issued').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        <p className="text-xs text-slate-400">Memuat surat peringatan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card variant="accent" className="p-4 !from-red-950 !via-rose-900 !to-red-900">
        <div className="flex items-center gap-2 mb-1">
          <FileWarning className="w-5 h-5" />
          <span className="font-bold text-sm">Surat Peringatan</span>
        </div>
        <p className="text-red-100/80 text-xs">Dokumen disiplin & tata tertib perusahaan</p>
        {pendingAck > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold bg-white/15 rounded-xl px-3 py-2.5 border border-white/10">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{pendingAck} surat perlu segera diakui</span>
          </div>
        )}
      </Card>

      {letters.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Shield className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">Tidak ada surat peringatan</p>
          <p className="text-xs mt-1">Catatan disiplin Anda bersih</p>
        </div>
      ) : (
        <div className="space-y-3">
          <SectionHeader title={`Riwayat (${letters.length})`} subtitle="Ketuk kartu untuk detail" />
          {letters.map(letter => (
            <LetterCard
              key={letter.id}
              letter={letter}
              onAcknowledge={handleAcknowledge}
              acknowledging={acknowledging}
            />
          ))}
        </div>
      )}
    </div>
  );
}
