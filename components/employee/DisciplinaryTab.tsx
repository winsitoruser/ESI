import { useState, useEffect, useCallback } from 'react';
import { FileWarning, AlertTriangle, CheckCircle, Loader2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

const SP_LABEL: Record<string, string> = {
  TEGURAN: 'Teguran', SP1: 'Surat Peringatan 1', SP2: 'Surat Peringatan 2',
  SP3: 'Surat Peringatan 3', TERMINATION: 'Pemutusan Hubungan Kerja',
};

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  issued: { bg: 'bg-red-50 ring-red-200', text: 'text-red-700', label: 'Diterbitkan' },
  acknowledged: { bg: 'bg-emerald-50 ring-emerald-200', text: 'text-emerald-700', label: 'Diakui' },
  pending_approval: { bg: 'bg-amber-50 ring-amber-200', text: 'text-amber-700', label: 'Proses' },
};

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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 p-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <FileWarning className="w-5 h-5" />
          <span className="font-bold text-sm">Surat Peringatan</span>
        </div>
        <p className="text-red-100 text-xs">Dokumen disiplin & tata tertib perusahaan</p>
        {pendingAck > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold bg-white/20 rounded-lg px-3 py-1.5">
            <AlertTriangle className="w-4 h-4" />
            {pendingAck} surat perlu diakui
          </div>
        )}
      </div>

      {letters.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Shield className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">Tidak ada surat peringatan</p>
          <p className="text-xs mt-1">Catatan disiplin Anda bersih</p>
        </div>
      ) : letters.map(letter => {
        const st = STATUS_STYLE[letter.status] || { bg: 'bg-slate-50', text: 'text-slate-600', label: letter.status };
        const needsAck = letter.status === 'issued';

        return (
          <div key={letter.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${needsAck ? 'border-red-200 ring-2 ring-red-100' : 'border-slate-100'}`}>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-sm text-slate-900">
                    {SP_LABEL[letter.letter_type] || letter.letter_type}
                  </p>
                  {letter.letter_number && (
                    <p className="text-[11px] text-slate-500 font-mono">{letter.letter_number}</p>
                  )}
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${st.bg} ${st.text}`}>
                  {st.label}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 mb-3">
                {letter.incident_date && (
                  <p><span className="font-medium text-slate-700">Tanggal Kejadian:</span> {fmtDate(letter.incident_date)}</p>
                )}
                {letter.effective_date && (
                  <p><span className="font-medium text-slate-700">Tanggal Terbit:</span> {fmtDate(letter.effective_date)}</p>
                )}
                {letter.expiry_date && (
                  <p><span className="font-medium text-slate-700">Berlaku Hingga:</span> {fmtDate(letter.expiry_date)}</p>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-3 mb-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">Pelanggaran</p>
                <p className="text-xs text-slate-700 leading-relaxed">{letter.violation_description}</p>
              </div>

              {letter.acknowledged_at && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 mb-2">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Diakui pada {fmtDate(letter.acknowledged_at)}
                </div>
              )}

              {needsAck && (
                <button
                  onClick={() => handleAcknowledge(letter.id)}
                  disabled={acknowledging === letter.id}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold active:scale-95 disabled:opacity-50"
                >
                  {acknowledging === letter.id ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Akui Penerimaan Surat</>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
