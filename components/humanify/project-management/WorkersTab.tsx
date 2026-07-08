import React from 'react';
import { Plus, Upload, Trash2 } from 'lucide-react';
import { Worker, ProjectItem } from './types';
import { fmtCur, statusColor } from './utils';

interface Props {
  workers: Worker[];
  projects: ProjectItem[];
  selectedProject: string;
  openAdd: (type: string) => void;
  openBulk: (type: 'workers' | 'timesheets' | 'payroll') => void;
  handleDelete: (action: string, id: string) => void;
}

export default function WorkersTab({ workers, projects, selectedProject, openAdd, openBulk, handleDelete }: Props) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Tenaga Kerja Proyek</h2>
        <div className="flex gap-2">
          <button onClick={() => openBulk('workers')} className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-700 rounded-lg text-sm hover:bg-green-50">
            <Upload className="w-4 h-4" /> Bulk Import CSV
          </button>
          <button onClick={() => openAdd('worker')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
            <Plus className="w-4 h-4" /> Tambah Pekerja
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Proyek</th>
              <th className="px-4 py-3 text-left">Karyawan</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Tipe</th>
              <th className="px-4 py-3 text-right">Rate/Hari</th>
              <th className="px-4 py-3 text-right">Alokasi</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {workers.filter(w => !selectedProject || w.project_id === selectedProject).map(w => {
              const proj = projects.find(p => p.id === w.project_id);
              return (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{proj?.project_code || w.project_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">#{w.employee_id}</td>
                  <td className="px-4 py-3">{w.role || '-'}</td>
                  <td className="px-4 py-3 capitalize">{w.worker_type}</td>
                  <td className="px-4 py-3 text-right">{fmtCur(w.daily_rate)}</td>
                  <td className="px-4 py-3 text-right">{w.allocation_percent}%</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(w.status)}`}>{w.status}</span></td>
                  <td className="px-4 py-3"><button onClick={() => handleDelete('worker', w.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {workers.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada pekerja proyek</p>}
      </div>
    </div>
  );
}
