import React from 'react';
import { Plus, Upload, Check, Trash2 } from 'lucide-react';
import { Timesheet, ProjectItem } from './types';
import { statusColor } from './utils';

interface Props {
  timesheets: Timesheet[];
  projects: ProjectItem[];
  selectedProject: string;
  openAdd: (type: string) => void;
  openBulk: (type: 'workers' | 'timesheets' | 'payroll') => void;
  api: (action: string, method?: string, body?: any, extra?: string) => Promise<any>;
  handleDelete: (action: string, id: string) => void;
  loadData: () => void;
  showToast: (msg: string, type?: string) => void;
}

export default function TimesheetsTab({ timesheets, projects, selectedProject, openAdd, openBulk, api, handleDelete, loadData, showToast }: Props) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Timesheet Proyek</h2>
        <div className="flex gap-2">
          <button onClick={() => openBulk('timesheets')} className="flex items-center gap-2 px-4 py-2 border border-violet-600 text-violet-700 rounded-lg text-sm hover:bg-violet-50">
            <Upload className="w-4 h-4" /> Bulk Import CSV
          </button>
          <button onClick={() => openAdd('timesheet')} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700">
            <Plus className="w-4 h-4" /> Input Timesheet
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Tanggal</th>
              <th className="px-4 py-3 text-left">Proyek</th>
              <th className="px-4 py-3 text-left">Karyawan</th>
              <th className="px-4 py-3 text-right">Jam Kerja</th>
              <th className="px-4 py-3 text-right">Lembur</th>
              <th className="px-4 py-3 text-left">Aktivitas</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {timesheets.filter(t => !selectedProject || t.project_id === selectedProject).map(t => {
              const proj = projects.find(p => p.id === t.project_id);
              return (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{t.timesheet_date && new Date(t.timesheet_date).toLocaleDateString('id-ID')}</td>
                  <td className="px-4 py-3 font-medium">{proj?.project_code || '-'}</td>
                  <td className="px-4 py-3">#{t.employee_id}</td>
                  <td className="px-4 py-3 text-right">{t.hours_worked}h</td>
                  <td className="px-4 py-3 text-right">{Number(t.overtime_hours) > 0 ? `${t.overtime_hours}h` : '-'}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{t.activity_description}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {t.status === 'submitted' && (
                        <button onClick={async () => { await api('approve-timesheet', 'POST', { id: t.id }); showToast('Disetujui'); loadData(); }} className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={() => handleDelete('timesheet', t.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {timesheets.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada data timesheet</p>}
      </div>
    </div>
  );
}
