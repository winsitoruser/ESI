import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, Target, Calendar } from 'lucide-react';

export interface EVMData {
  BAC: number;
  PV: number;
  EV: number;
  AC: number;
  SV: number;
  CV: number;
  SPI: number;
  CPI: number;
  EAC: number;
  ETC: number;
  VAC: number;
  progress?: number;
}

interface Props {
  data: EVMData;
  currency?: string;
}

const fmt = (n: number, currency = 'IDR') => new Intl.NumberFormat('id-ID', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0);
const ratio = (n: number) => (isFinite(n) && !isNaN(n) ? n.toFixed(2) : '-');

export default function EVMPanel({ data, currency = 'IDR' }: Props) {
  const scheduleHealth = data.SPI >= 1 ? 'good' : data.SPI >= 0.9 ? 'warn' : 'bad';
  const costHealth = data.CPI >= 1 ? 'good' : data.CPI >= 0.9 ? 'warn' : 'bad';

  const healthColor = (h: string) => h === 'good' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : h === 'warn' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-white">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-800">Earned Value Management</h3>
          {data.progress !== undefined && <span className="ml-auto text-xs text-gray-500">Progress: <span className="font-semibold text-gray-800">{data.progress.toFixed(1)}%</span></span>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        <MetricCard icon={Target} label="BAC (Budget)" value={fmt(data.BAC, currency)} hint="Budget at Completion" color="text-slate-700" />
        <MetricCard icon={Calendar} label="PV (Planned)" value={fmt(data.PV, currency)} hint="Planned Value" color="text-blue-700" />
        <MetricCard icon={TrendingUp} label="EV (Earned)" value={fmt(data.EV, currency)} hint="Earned Value" color="text-emerald-700" />
        <MetricCard icon={DollarSign} label="AC (Actual)" value={fmt(data.AC, currency)} hint="Actual Cost" color="text-amber-700" />
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        <div className={`p-3 rounded-lg border ${healthColor(scheduleHealth)}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold">Schedule Performance (SPI)</span>
            {scheduleHealth === 'good' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{ratio(data.SPI)}</span>
            <span className="text-xs">SV: {fmt(data.SV, currency)}</span>
          </div>
          <p className="text-[10px] mt-1 opacity-75">{data.SPI >= 1 ? 'Jadwal sesuai/lebih cepat' : 'Jadwal terlambat'}</p>
        </div>

        <div className={`p-3 rounded-lg border ${healthColor(costHealth)}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold">Cost Performance (CPI)</span>
            {costHealth === 'good' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{ratio(data.CPI)}</span>
            <span className="text-xs">CV: {fmt(data.CV, currency)}</span>
          </div>
          <p className="text-[10px] mt-1 opacity-75">{data.CPI >= 1 ? 'Biaya efisien' : 'Biaya overrun'}</p>
        </div>
      </div>

      <div className="border-t bg-gray-50 px-4 py-3 grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-gray-500">EAC (Forecast Total)</p>
          <p className="font-bold text-gray-800">{fmt(data.EAC, currency)}</p>
        </div>
        <div>
          <p className="text-gray-500">ETC (To Complete)</p>
          <p className="font-bold text-gray-800">{fmt(data.ETC, currency)}</p>
        </div>
        <div>
          <p className="text-gray-500">VAC (Variance)</p>
          <p className={`font-bold ${data.VAC >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(data.VAC, currency)}</p>
        </div>
      </div>
    </div>
  );
}

const MetricCard = ({ icon: Icon, label, value, hint, color }: any) => (
  <div className="p-3 border rounded-lg bg-white">
    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className="font-semibold">{label}</span>
    </div>
    <p className={`text-sm font-bold ${color} truncate`}>{value}</p>
    <p className="text-[9px] text-gray-400">{hint}</p>
  </div>
);
