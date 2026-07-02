import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '../../../components/hq/HQLayout';
import { CheckCircle, XCircle, Star, Zap, ArrowRight, RefreshCw, Package } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingInterval: 'monthly' | 'yearly';
  maxUsers: number;
  maxBranches: number;
  maxProducts: number;
  maxTransactions: number;
  features?: Record<string, any>;
  metadata?: Record<string, any>;
  trialDays?: number;
  sortOrder?: number;
}

interface ModulePricing {
  id: string;
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  moduleCategory: string;
  price: number;
  currency: string;
  billingInterval: 'monthly' | 'yearly' | 'one_time';
  perUser: boolean;
  perBranch: boolean;
  includedInPlans: string[];
  yearlyDiscountPercent: number;
}

const formatIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [modules, setModules] = useState<ModulePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/hq/subscription/plans')
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setPlans(j.data.plans || []);
          setModules(j.data.modulePricing || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredPlans = useMemo(() => plans.filter((p) => p.billingInterval === interval), [plans, interval]);

  const selectedPlanObj = plans.find((p) => p.id === selectedPlan);

  const addonTotal = useMemo(() => {
    return selectedAddons.reduce((sum, id) => {
      const m = modules.find((mm) => mm.moduleId === id);
      if (!m) return sum;
      const multiplier = interval === 'yearly' ? 12 * (1 - (m.yearlyDiscountPercent || 0) / 100) : 1;
      return sum + m.price * multiplier;
    }, 0);
  }, [selectedAddons, modules, interval]);

  const planTotal = selectedPlanObj ? selectedPlanObj.price : 0;
  const subtotal = planTotal + addonTotal;
  const tax = Math.round(subtotal * 0.11);
  const total = subtotal + tax;

  const toggleAddon = (moduleId: string) => {
    setSelectedAddons((prev) => prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]);
  };

  const proceedCheckout = () => {
    if (!selectedPlan) return;
    const query = new URLSearchParams({
      planId: selectedPlan,
      interval,
      ...(selectedAddons.length > 0 ? { addons: selectedAddons.join(',') } : {})
    });
    router.push(`/hq/billing-info/checkout?${query.toString()}`);
  };

  if (loading) {
    return (
      <HQLayout title="Pilih Paket">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </HQLayout>
    );
  }

  return (
    <HQLayout title="Pilih Paket Langganan" subtitle="Pilih paket yang sesuai untuk bisnis Anda + tambah modul add-on">
      <div className="max-w-7xl space-y-8">
        <div className="flex justify-center">
          <div className="inline-flex bg-gray-100 rounded-xl p-1">
            <button onClick={() => setInterval('monthly')} className={`px-6 py-2.5 rounded-lg text-sm font-semibold ${interval === 'monthly' ? 'bg-white text-blue-700 shadow' : 'text-gray-500'}`}>
              Bulanan
            </button>
            <button onClick={() => setInterval('yearly')} className={`px-6 py-2.5 rounded-lg text-sm font-semibold ${interval === 'yearly' ? 'bg-white text-blue-700 shadow' : 'text-gray-500'}`}>
              Tahunan <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Hemat 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => {
            const isSelected = plan.id === selectedPlan;
            const isPopular = plan.metadata?.isPopular;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative bg-white rounded-2xl border-2 p-6 cursor-pointer transition-all ${isSelected ? 'border-blue-500 ring-4 ring-blue-100 shadow-lg' : 'border-gray-200 hover:border-gray-300'}`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1 text-xs rounded-full flex items-center gap-1 whitespace-nowrap">
                    <Star className="w-3 h-3" /> {plan.metadata?.badge || 'Popular'}
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                {plan.description && <p className="text-sm text-gray-500 mt-1">{plan.description}</p>}
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">{formatIDR(plan.price)}</span>
                  <span className="text-gray-500 ml-1 text-sm">/{plan.billingInterval === 'yearly' ? 'tahun' : 'bulan'}</span>
                </div>
                <ul className="mt-5 space-y-2 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> {plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} User</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> {plan.maxBranches === -1 ? 'Unlimited' : plan.maxBranches} Cabang</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> {plan.maxProducts === -1 ? 'Unlimited' : plan.maxProducts.toLocaleString('id-ID')} Produk</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> {plan.maxTransactions === -1 ? 'Unlimited' : plan.maxTransactions.toLocaleString('id-ID')} Transaksi/bulan</li>
                  {plan.features && Object.entries(plan.features)
                    .filter(([, v]) => v === true)
                    .slice(0, 5)
                    .map(([k]) => (
                      <li key={k} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> <span className="capitalize">{k.replace(/_/g, ' ')}</span></li>
                    ))}
                </ul>
                <div className={`mt-5 py-2 rounded-lg text-center text-sm font-semibold ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {isSelected ? 'Dipilih' : 'Pilih Paket'}
                </div>
              </div>
            );
          })}
        </div>

        {selectedPlanObj && modules.length > 0 && (
          <section>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-purple-600" /> Modul Add-On (Opsional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {modules.filter((m) => m.price > 0).map((m) => {
                const included = (m.includedInPlans || []).includes(selectedPlanObj.name);
                const checked = included || selectedAddons.includes(m.moduleId);
                return (
                  <label key={m.id} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer ${checked ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white'} ${included ? 'opacity-75 cursor-not-allowed' : ''}`}>
                    <input type="checkbox" disabled={included} checked={checked} onChange={() => !included && toggleAddon(m.moduleId)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-gray-900 truncate">{m.moduleName}</span>
                        {included && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">Termasuk</span>}
                      </div>
                      <p className="text-xs text-gray-500 capitalize mt-0.5">{m.moduleCategory}</p>
                      <p className="text-sm font-semibold text-purple-700 mt-1">
                        {formatIDR(m.price)}/{m.billingInterval === 'yearly' ? 'tahun' : 'bulan'}
                        {m.perUser && <span className="ml-1 text-xs text-gray-500">• per user</span>}
                        {m.perBranch && <span className="ml-1 text-xs text-gray-500">• per cabang</span>}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>
        )}

        {selectedPlanObj && (
          <section className="bg-white rounded-2xl border border-gray-200 p-6 sticky bottom-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Ringkasan Pesanan</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Paket {selectedPlanObj.name}</span><span>{formatIDR(planTotal)}</span></div>
              {addonTotal > 0 && <div className="flex justify-between"><span className="text-gray-500">Modul Add-on</span><span>{formatIDR(addonTotal)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatIDR(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">PPN 11%</span><span>{formatIDR(tax)}</span></div>
              <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-lg">
                <span>Total</span><span className="text-blue-700">{formatIDR(total)}</span>
              </div>
            </div>
            <button onClick={proceedCheckout} className="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-shadow">
              Lanjut Checkout <ArrowRight className="w-4 h-4" />
            </button>
          </section>
        )}
      </div>
    </HQLayout>
  );
}
