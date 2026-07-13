import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Award, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';

export default function VerifyCertPage() {
  const router = useRouter();
  const { token } = router.query;
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/verify/certificate?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCert(d.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <Head><title>Verifikasi Sertifikat — Humanify</title></Head>
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <HumanifyLogo className="h-10 mx-auto mb-6" />
          <h1 className="text-lg font-bold text-gray-900">Verifikasi Sertifikat</h1>

          {loading && <Loader2 className="w-8 h-8 animate-spin mx-auto mt-8 text-indigo-600" />}

          {!loading && error && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mt-6" />
              <p className="text-gray-600 mt-4">Sertifikat tidak ditemukan atau token tidak valid.</p>
            </>
          )}

          {!loading && cert && (
            <>
              {cert.valid ? (
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mt-6" />
              ) : (
                <XCircle className="w-16 h-16 text-amber-500 mx-auto mt-6" />
              )}
              <p className={`mt-4 font-semibold ${cert.valid ? 'text-green-700' : 'text-amber-700'}`}>
                {cert.valid ? 'Sertifikat Valid' : `Status: ${cert.status}`}
              </p>
              <div className="mt-6 text-left space-y-2 text-sm bg-gray-50 rounded-xl p-4">
                <p><span className="text-gray-500">Nama:</span> <strong>{cert.employeeName}</strong></p>
                <p><span className="text-gray-500">Sertifikat:</span> {cert.title}</p>
                <p><span className="text-gray-500">Penerbit:</span> {cert.issuer}</p>
                <p><span className="text-gray-500">No. Sertifikat:</span> <span className="font-mono text-xs">{cert.certificateNumber}</span></p>
                <p><span className="text-gray-500">Diterbitkan:</span> {cert.issuedDate || '-'}</p>
                {cert.expiryDate && <p><span className="text-gray-500">Berlaku hingga:</span> {cert.expiryDate}</p>}
              </div>
              <Award className="w-8 h-8 text-amber-500 mx-auto mt-4" />
            </>
          )}
        </div>
      </div>
    </>
  );
}
