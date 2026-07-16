import React from 'react';
import { Briefcase, Users, DollarSign, BarChart3 } from 'lucide-react';
import { fmtCur } from './utils';

interface Props {
  overview: { totalProjects?: number; activeProjects?: number; activeWorkers?: number; totalBudget?: number; totalActual?: number };
}

export default function OverviewCards({ overview }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white border rounded-xl p-4">
        <Briefcase className="w-5 h-5 text-indigo-600 mb-1" />
        <p className="text-2xl font-bold">{overview.totalProjects || 0}</p>
        <p className="text-xs text-gray-500">Total Proyek ({overview.activeProjects || 0} aktif)</p>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <Users className="w-5 h-5 text-green-600 mb-1" />
        <p className="text-2xl font-bold">{overview.activeWorkers || 0}</p>
        <p className="text-xs text-gray-500">Pekerja Aktif</p>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <DollarSign className="w-5 h-5 text-violet-600 mb-1" />
        <p className="text-2xl font-bold">{fmtCur(overview.totalBudget || 0)}</p>
        <p className="text-xs text-gray-500">Total Anggaran</p>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <BarChart3 className="w-5 h-5 text-orange-600 mb-1" />
        <p className="text-2xl font-bold">{fmtCur(overview.totalActual || 0)}</p>
        <p className="text-xs text-gray-500">Biaya Aktual</p>
      </div>
    </div>
  );
}
