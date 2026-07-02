import React, { useEffect, useState } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { Percent, Save, RefreshCw, Info, AlertTriangle, CheckCircle } from 'lucide-react';

interface TaxSettings {
  ppn: { enabled: boolean; rate: number; includeInPrice: boolean; applyToAllBranches: boolean };
  serviceCharge: { enabled: boolean; rate: number; applyToAllBranches: boolean; excludedBranchTypes: string[] };
  pb1: { enabled: boolean; rate: number; applyToAllBranches: boolean };
  rounding: { enabled: boolean; method: 'nearest' | 'up' | 'down'; precision: number };
}

const defaultTaxes: TaxSettings = {
  ppn: { enabled: true, rate: 12, includeInPrice: false, applyToAllBranches: true },
  serviceCharge: { enabled: true, rate: 10, applyToAllBranches: true, excludedBranchTypes: ['kiosk'] },
  pb1: { enabled: false, rate: 10, applyToAllBranches: true },
  rounding: { enabled: true, method: 'nearest', precision: 100 }
};

const SAMPLE_PRICE = 100000;

function calcPreview(s: TaxSettings) {
  const base = SAMPLE_PRICE;
  const sc = s.serviceCharge.enabled ? Math.round((base * s.serviceCharge.rate) / 100) : 0;
  const afterSc = base + sc;
  const ppn = s.ppn.enabled ? Math.round((afterSc * s.ppn.rate) / 100) : 0;
  const pb1 = s.pb1.enabled ? Math.round((afterSc * s.pb1.rate) / 100) : 0;
  let total = afterSc + ppn + pb1;
  if (s.rounding.enabled) {
    const p = Math.max(1, s.rounding.precision);
    if (s.rounding.method === 'up') total = Math.ceil(total / p) * p;
    else if (s.rounding.method === 'down') total = Math.floor(total / p) * p;
    else total = Math.round(total / p) * p;
  }
  return { base, sc, ppn, pb1, total };
}

const formatIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

export default function TaxesSettingsPage() {
  const [taxes, setTaxes] = useState<TaxSettings>(defaultTaxes);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/hq/settings/taxes')
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data) setTaxes({ ...defaultTaxes, ...j.data });
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/hq/settings/taxes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taxes)
      });
      const j = await res.json();
      if (j.success) setMsg({ type: 'ok', text: 'Pengaturan pajak berhasil disimpan' });
      else setMsg({ type: 'err', text: j.error || 'Gagal menyimpan' });
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const preview = calcPreview(taxes);

  if (loading) {
    return (
      <HQLayout title="Pengaturan Pajak">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </HQLayout>
    );
  }

  return (
    <HQLayout title="Pengaturan Pajak" subtitle="Atur PPN, Service Charge, PB1, dan Pembulatan untuk seluruh tenant">
      <div className="max-w-6xl space-y-6">
        {msg && (
          <div className={`rounded-xl border px-4 py-3 flex items-center gap-2 ${msg.type === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {msg.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span className="text-sm">{msg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                <Percent className="w-5 h-5 text-blue-600" /> PPN (Pajak Pertambahan Nilai)
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={taxes.ppn.enabled} onChange={(e) => setTaxes({ ...taxes, ppn: { ...taxes.ppn, enabled: e.target.checked } })} className="w-4 h-4" />
                  <span className="text-sm font-medium">Aktifkan PPN</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Tarif (%)</label>
                    <input type="number" value={taxes.ppn.rate} onChange={(e) => setTaxes({ ...taxes, ppn: { ...taxes.ppn, rate: parseFloat(e.target.value) || 0 } })} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={taxes.ppn.includeInPrice} onChange={(e) => setTaxes({ ...taxes, ppn: { ...taxes.ppn, includeInPrice: e.target.checked } })} />
                      Harga sudah termasuk PPN
                    </label>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={taxes.ppn.applyToAllBranches} onChange={(e) => setTaxes({ ...taxes, ppn: { ...taxes.ppn, applyToAllBranches: e.target.checked } })} />
                  Terapkan ke semua cabang (kunci konfigurasi)
                </label>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                <Percent className="w-5 h-5 text-blue-600" /> Service Charge
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={taxes.serviceCharge.enabled} onChange={(e) => setTaxes({ ...taxes, serviceCharge: { ...taxes.serviceCharge, enabled: e.target.checked } })} />
                  <span className="text-sm font-medium">Aktifkan Service Charge</span>
                </label>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Tarif (%)</label>
                  <input type="number" value={taxes.serviceCharge.rate} onChange={(e) => setTaxes({ ...taxes, serviceCharge: { ...taxes.serviceCharge, rate: parseFloat(e.target.value) || 0 } })} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={taxes.serviceCharge.applyToAllBranches} onChange={(e) => setTaxes({ ...taxes, serviceCharge: { ...taxes.serviceCharge, applyToAllBranches: e.target.checked } })} />
                  Terapkan ke semua cabang
                </label>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                <Percent className="w-5 h-5 text-blue-600" /> PB1 (Pajak Restoran)
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={taxes.pb1.enabled} onChange={(e) => setTaxes({ ...taxes, pb1: { ...taxes.pb1, enabled: e.target.checked } })} />
                  <span className="text-sm font-medium">Aktifkan PB1 (F&B)</span>
                </label>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Tarif (%)</label>
                  <input type="number" value={taxes.pb1.rate} onChange={(e) => setTaxes({ ...taxes, pb1: { ...taxes.pb1, rate: parseFloat(e.target.value) || 0 } })} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                <Percent className="w-5 h-5 text-blue-600" /> Pembulatan
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={taxes.rounding.enabled} onChange={(e) => setTaxes({ ...taxes, rounding: { ...taxes.rounding, enabled: e.target.checked } })} />
                  <span className="text-sm font-medium">Aktifkan Pembulatan</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Metode</label>
                    <select value={taxes.rounding.method} onChange={(e) => setTaxes({ ...taxes, rounding: { ...taxes.rounding, method: e.target.value as any } })} className="w-full border rounded-lg px-3 py-2">
                      <option value="nearest">Terdekat</option>
                      <option value="up">Keatas</option>
                      <option value="down">Kebawah</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Presisi (Rp)</label>
                    <input type="number" value={taxes.rounding.precision} onChange={(e) => setTaxes({ ...taxes, rounding: { ...taxes.rounding, precision: parseInt(e.target.value) || 1 } })} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <p className="text-xs text-blue-700">Pengaturan pajak berlaku untuk semua cabang secara default. Nonaktifkan "Terapkan ke semua cabang" jika ingin pajak diatur per outlet.</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Preview Transaksi {formatIDR(SAMPLE_PRICE)}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatIDR(preview.base)}</span></div>
                {preview.sc > 0 && <div className="flex justify-between"><span className="text-gray-500">Service Charge ({taxes.serviceCharge.rate}%)</span><span>{formatIDR(preview.sc)}</span></div>}
                {preview.ppn > 0 && <div className="flex justify-between"><span className="text-gray-500">PPN ({taxes.ppn.rate}%)</span><span>{formatIDR(preview.ppn)}</span></div>}
                {preview.pb1 > 0 && <div className="flex justify-between"><span className="text-gray-500">PB1 ({taxes.pb1.rate}%)</span><span>{formatIDR(preview.pb1)}</span></div>}
                <div className="pt-2 border-t border-gray-200 flex justify-between font-semibold">
                  <span>Total</span><span className="text-blue-700">{formatIDR(preview.total)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="sticky bottom-4 flex justify-end">
          <button onClick={save} disabled={saving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-semibold flex items-center gap-2 shadow-md">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </HQLayout>
  );
}
