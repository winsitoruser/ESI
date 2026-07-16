import React from 'react';
import { DollarSign, Upload, Trash2 } from 'lucide-react';
import { PayrollItem, ProjectItem } from './types';
import { fmtCur, statusColor } from './utils';

interface Props {
  payrollItems: PayrollItem[];
  projects: ProjectItem[];
  selectedProject: string;
  openAdd: (type: string) => void;
  openBulk: (type: 'workers' | 'timesheets' | 'payroll') => void;
  api: (action: string, method?: string, body?: any, extra?: string) => Promise<any>;
  handleDelete: (action: string, id: string) => void;
  loadData: () => void;
  showToast: (msg: string, type?: string) => void;
}

export default function PayrollTab({ payrollItems, projects, selectedProject, openAdd, openBulk, api, handleDelete, loadData, showToast }: Props) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Penggajian Berbasis Proyek</h2>
        <div className="flex gap-2">
          <button onClick={() => openBulk('payroll')} className="flex items-center gap-2 px-4 py-2 border border-purple-600 text-purple-700 rounded-lg text-sm hover:bg-purple-50">
            <Upload className="w-4 h-4" /> Bulk Hitung CSV
          </button>
          <button onClick={() => openAdd('calc-payroll')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
            <DollarSign className="w-4 h-4" /> Hitung Payroll
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Proyek</th>
              <th className="px-4 py-3 text-left">Karyawan</th>
              <th className="px-4 py-3 text-left">Periode</th>
              <th className="px-4 py-3 text-right">Hari</th>
              <th className="px-4 py-3 text-right">Jam Regular</th>
              <th className="px-4 py-3 text-right">Lembur</th>
              <th className="px-4 py-3 text-right">Gross</th>
              <th className="px-4 py-3 text-right">Net</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payrollItems.filter(p => !selectedProject || p.project_id === selectedProject).map(pi => {
              const proj = projects.find(p => p.id === pi.project_id);
              return (
                <tr key={pi.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{proj?.project_code || '-'}</td>
                  <td className="px-4 py-3">#{pi.employee_id}</td>
                  <td className="px-4 py-3 text-xs">{pi.period_start && new Date(pi.period_start).toLocaleDateString('id-ID')} - {pi.period_end && new Date(pi.period_end).toLocaleDateString('id-ID')}</td>
                  <td className="px-4 py-3 text-right">{pi.days_worked}</td>
                  <td className="px-4 py-3 text-right">{pi.regular_hours}h</td>
                  <td className="px-4 py-3 text-right">{Number(pi.overtime_hours) > 0 ? `${pi.overtime_hours}h` : '-'}</td>
                  <td className="px-4 py-3 text-right">{fmtCur(pi.gross_amount)}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmtCur(pi.net_amount)}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(pi.status)}`}>{pi.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {pi.status === 'calculated' && (
                        <button onClick={async () => { await api('approve-payroll', 'POST', { id: pi.id }); showToast('Disetujui'); loadData(); }} className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded">Setujui</button>
                      )}
                      {pi.status === 'approved' && (
                        <button onClick={async () => { await api('pay-payroll', 'POST', { id: pi.id, paymentRef: `PAY-${Date.now()}` }); showToast('Dibayar'); loadData(); }} className="text-xs px-2 py-1 text-violet-600 hover:bg-violet-50 rounded">Bayar</button>
                      )}
                      <button onClick={() => handleDelete('payroll', pi.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {payrollItems.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada data penggajian proyek</p>}
      </div>
    </div>
  );
}
