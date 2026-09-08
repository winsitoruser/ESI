import { useState } from 'react';
import { ScanFace, Shield } from 'lucide-react';
import FaceLivenessCapture, { type FaceLivenessResult } from './FaceLivenessCapture';
import toast from 'react-hot-toast';

type Props = {
  onEnrolled: () => void;
};

export default function FaceEnrollmentGate({ onEnrolled }: Props) {
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (result: FaceLivenessResult) => {
    setBusy(true);
    try {
      const res = await fetch('/api/employee/face?action=enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          still: result.still,
          motion: result.motion,
          motionScore: result.motionScore,
          challenges: {
            nod: result.challenges.nod,
            left: result.challenges.left,
            right: result.challenges.right,
            front: result.challenges.front,
            scores: result.scores,
          },
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Pendaftaran gagal');
      toast.success('Wajah terdaftar. Absensi memakai kamera.');
      onEnrolled();
    } catch (e: any) {
      toast.error(e.message || 'Gagal daftar wajah');
    } finally {
      setBusy(false);
    }
  };

  if (started) {
    return (
      <FaceLivenessCapture
        title="Daftar wajah"
        subtitle="Wajib sekali saat pertama masuk portal"
        confirmLabel="Simpan foto wajah"
        allowCancel
        onCancel={() => setStarted(false)}
        busy={busy}
        onComplete={submit}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[65] bg-[#f8fafc] flex flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4 ring-1 ring-teal-100">
          <ScanFace className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Setup foto wajah</h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Daftar wajah sekali saja. Setelah tersimpan, clock in/out cukup ambil foto — sistem mencocokkan dengan wajah terdaftar.
        </p>
        <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
          <li className="flex gap-2"><Shield className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" /> Pakai kamera depan, cahaya cukup.</li>
          <li className="flex gap-2"><Shield className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" /> Angguk, geser kiri, geser kanan, lalu tatap kamera.</li>
          <li className="flex gap-2"><Shield className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" /> Ikuti cincin di sekeliling oval — pelan saja.</li>
        </ul>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="mt-8 min-h-11 w-full rounded-xl bg-teal-600 text-white font-semibold text-sm"
        >
          Mulai daftar wajah
        </button>
      </div>
    </div>
  );
}
