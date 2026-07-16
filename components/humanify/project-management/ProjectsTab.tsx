import React from 'react';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { ProjectItem } from './types';
import { fmtCur, statusColor, priorityColor } from './utils';

interface Props {
  projects: ProjectItem[];
  projectDetail: any;
  setProjectDetail: (d: any) => void;
  api: (action: string, method?: string, body?: any, extra?: string) => Promise<any>;
  openAdd: (type: string) => void;
  handleDelete: (action: string, id: string) => void;
}

export default function ProjectsTab({ projects, projectDetail, setProjectDetail, api, openAdd, handleDelete }: Props) {
  if (projectDetail) {
    return (
      <div>
        <button onClick={() => setProjectDetail(null)} className="text-sm text-indigo-600 mb-4 hover:underline">← Kembali</button>
        <div className="bg-white border rounded-xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-indigo-600">{projectDetail.project?.project_code}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(projectDetail.project?.status)}`}>{projectDetail.project?.status}</span>
          </div>
          <h2 className="text-xl font-bold">{projectDetail.project?.name}</h2>
          <p className="text-gray-500">{projectDetail.project?.description}</p>
          <div className="grid md:grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Anggaran</p><p className="font-bold">{fmtCur(projectDetail.project?.budget_amount)}</p></div>
            <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Aktual</p><p className="font-bold">{fmtCur(projectDetail.project?.actual_cost)}</p></div>
            <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Pekerja</p><p className="font-bold">{(projectDetail.workers || []).length}</p></div>
            <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Total Jam</p><p className="font-bold">{projectDetail.totalHours || 0}</p></div>
          </div>
        </div>
        <div className="bg-white border rounded-xl p-5 mb-4">
          <h3 className="font-semibold mb-3">Tim Proyek ({(projectDetail.workers || []).length})</h3>
          <div className="space-y-2">
            {(projectDetail.workers || []).map((w: any) => (
              <div key={w.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                <div><span className="font-medium">#{w.employee_id}</span> - <span>{w.role || 'Anggota'}</span></div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="capitalize">{w.worker_type}</span>
                  <span>{w.allocation_percent}%</span>
                  <span>{fmtCur(w.daily_rate)}/hari</span>
                </div>
              </div>
            ))}
            {(projectDetail.workers || []).length === 0 && <p className="text-sm text-gray-400">Belum ada pekerja</p>}
          </div>
        </div>
        {(projectDetail.payrollItems || []).length > 0 && (
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-3">Data Penggajian</h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Karyawan</th><th className="px-3 py-2 text-left">Periode</th><th className="px-3 py-2 text-right">Hari</th><th className="px-3 py-2 text-right">Gross</th><th className="px-3 py-2 text-right">Net</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
              <tbody className="divide-y">
                {(projectDetail.payrollItems || []).map((pi: any) => (
                  <tr key={pi.id}><td className="px-3 py-2">#{pi.employee_id}</td><td className="px-3 py-2 text-xs">{pi.period_start && new Date(pi.period_start).toLocaleDateString('id-ID')} - {pi.period_end && new Date(pi.period_end).toLocaleDateString('id-ID')}</td><td className="px-3 py-2 text-right">{pi.days_worked}</td><td className="px-3 py-2 text-right">{fmtCur(pi.gross_amount)}</td><td className="px-3 py-2 text-right font-medium">{fmtCur(pi.net_amount)}</td><td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(pi.status)}`}>{pi.status}</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Daftar Proyek</h2>
        <button onClick={() => openAdd('project')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Buat Proyek
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {projects.map(p => (
          <div key={p.id} className={`bg-white border-l-4 ${priorityColor(p.priority)} border rounded-xl p-4 hover:shadow-md transition-shadow`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{p.project_code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
                </div>
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                {p.client_name && <p className="text-sm text-gray-500">Klien: {p.client_name}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={async () => { const res = await api('project-detail', 'GET', null, `&id=${p.id}`); setProjectDetail(res.data); }} className="p-1.5 text-gray-400 hover:text-indigo-600"><Eye className="w-4 h-4" /></button>
                <button onClick={() => openAdd('project')} className="p-1.5 text-gray-400 hover:text-violet-600"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete('project', p.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            {p.description && <p className="text-sm text-gray-500 line-clamp-2 mb-2">{p.description}</p>}
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1"><span>Progres</span><span>{Number(p.completion_percent || 0).toFixed(0)}%</span></div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${p.completion_percent || 0}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t text-xs">
              <div><span className="text-gray-400">Anggaran</span><p className="font-medium">{fmtCur(p.budget_amount)}</p></div>
              <div><span className="text-gray-400">Aktual</span><p className="font-medium">{fmtCur(p.actual_cost)}</p></div>
              <div><span className="text-gray-400">Periode</span><p className="font-medium">{p.start_date ? new Date(p.start_date).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }) : '-'}</p></div>
            </div>
          </div>
        ))}
        {projects.length === 0 && <p className="text-center text-gray-400 py-8 col-span-2">Belum ada proyek</p>}
      </div>
    </div>
  );
}
