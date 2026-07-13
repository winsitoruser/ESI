import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import Link from 'next/link';
import {
  PenTool, FileText, Shield, Clock, ArrowLeft, Plus, CheckCircle2, Send, X,
} from 'lucide-react';

const DOC_TYPES = [
  { value: 'pkwt', label: 'PKWT' },
  { value: 'pkwtt', label: 'PKWTT' },
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'nda', label: 'NDA' },
  { value: 'mutation', label: 'Surat Mutasi' },
  { value: 'paklaring', label: 'Paklaring' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-700',
  partially_signed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
};

export default function ESignPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [integration, setIntegration] = useState<{ mode: string; configured: boolean } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ docType: 'pkwt', title: '', employeeName: '', signers: [{ name: '', email: '', role: 'Karyawan' }, { name: '', email: '', role: 'HR' }] });

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/humanify/esign');
      const j = await r.json();
      setDocs(j.data || []);
      if (j.integration) setIntegration(j.integration);
    } catch { setDocs([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.title) return;
    await fetch('/api/humanify/esign?action=create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowCreate(false);
    load();
  };

  const handleSign = async (docId: string, email: string) => {
    await fetch(`/api/humanify/esign?action=sign&id=${docId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signerEmail: email }),
    });
    load();
  };

  return (
    <PageGuard anyPermission={['employees.view', 'employees.*']} title="E-Sign" description="Tanda tangan elektronik HR">
      <HQLayout title="E-Sign HR (Privy ID)" subtitle="Tanda tangan elektronik berstandar PSrE — sequential & parallel signing">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/humanify/contracts" className="p-2 border rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></Link>
            <div className="flex-1">
              <h2 className="text-xl font-bold flex items-center gap-2"><PenTool className="w-5 h-5 text-violet-600" /> E-Sign with Privy</h2>
              <p className="text-sm text-gray-500">
                Kontrak kerja, offer letter, mutasi — audit trail PSrE
                {integration && (
                  <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    integration.configured
                      ? integration.mode === 'live' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {integration.configured ? `Privy ${integration.mode}` : 'Simulasi lokal'}
                  </span>
                )}
              </p>
            </div>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700">
              <Plus className="w-4 h-4" /> Buat Dokumen
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Dokumen', value: docs.length },
              { label: 'Pending', value: docs.filter(d => d.status === 'pending').length },
              { label: 'Partially Signed', value: docs.filter(d => d.status === 'partially_signed').length },
              { label: 'Completed', value: docs.filter(d => d.status === 'completed').length },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-4 border shadow-sm">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {docs.map(doc => (
              <div key={doc.id} className="bg-white rounded-xl border shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-violet-600" />
                      <h3 className="font-semibold">{doc.title}</h3>
                      <span className={`px-2 py-0.5 text-[10px] rounded font-medium ${STATUS_COLORS[doc.status] || 'bg-gray-100'}`}>{doc.status}</span>
                    </div>
                    <p className="text-xs text-gray-500">{doc.docType?.toUpperCase()} · Token: {doc.privyDocToken}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {doc.signers?.map((s: any, i: number) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${s.signed ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                      {s.signed ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Clock className="w-3 h-3 text-gray-400" />}
                      <span>{s.name} ({s.role})</span>
                      {!s.signed && (
                        <button onClick={() => handleSign(doc.id, s.email)} className="text-violet-600 hover:underline flex items-center gap-0.5">
                          <Send className="w-3 h-3" /> Sign
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {showCreate && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Buat Dokumen E-Sign</h3>
                  <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="space-y-3">
                  <select value={form.docType} onChange={e => setForm(f => ({ ...f, docType: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input placeholder="Judul dokumen" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  <input placeholder="Nama karyawan" value={form.employeeName} onChange={e => setForm(f => ({ ...f, employeeName: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  {form.signers.map((s, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <input placeholder="Nama penandatangan" value={s.name} onChange={e => {
                        const signers = [...form.signers]; signers[i] = { ...signers[i], name: e.target.value };
                        setForm(f => ({ ...f, signers }));
                      }} className="border rounded-lg px-3 py-2 text-sm" />
                      <input placeholder="Email" value={s.email} onChange={e => {
                        const signers = [...form.signers]; signers[i] = { ...signers[i], email: e.target.value };
                        setForm(f => ({ ...f, signers }));
                      }} className="border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                  <button onClick={handleCreate} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm">Kirim ke Privy</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </HQLayout>
    </PageGuard>
  );
}
