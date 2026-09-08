/**
 * Lightweight NPS/CSAT pulse card for ESS / post-payroll (Wave-83).
 */
import { useState } from 'react';
import { HeartHandshake } from 'lucide-react';

type Props = {
  context?: string;
  channel?: string;
  className?: string;
};

export default function SatisfactionPulse({ context = 'ess', channel = 'ess', className = '' }: Props) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (score == null || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/humanify/satisfaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, comment: comment.trim() || null, context, channel }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal menyimpan');
      setSent(true);
    } catch (e: any) {
      setError(e?.message || 'Gagal menyimpan');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className={`rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ${className}`}>
        Terima kasih — masukan Anda membantu kami meningkatkan Humanify.
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-slate-200 bg-white px-4 py-3 ${className}`}>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <HeartHandshake className="h-4 w-4 text-[color:var(--hf-brand-600)]" />
        Seberapa mungkin Anda merekomendasikan Humanify? (0–10)
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setScore(i)}
            className={`h-8 w-8 rounded-lg text-xs font-semibold ${
              score === i
                ? 'bg-[var(--hf-brand-600)] text-white'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {i}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Opsional: apa yang bisa kami perbaiki?"
        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        rows={2}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <button
        type="button"
        disabled={score == null || busy}
        onClick={submit}
        className="mt-2 rounded-lg bg-[var(--hf-brand-600)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      >
        {busy ? 'Mengirim…' : 'Kirim'}
      </button>
    </div>
  );
}
