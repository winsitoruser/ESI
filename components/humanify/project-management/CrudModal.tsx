import React from 'react';
import { X } from 'lucide-react';
import { ProjectItem, ProjectForm, WorkerForm, TimesheetForm, PayrollCalcForm } from './types';

interface Props {
  showModal: boolean;
  setShowModal: (v: boolean) => void;
  modalType: string;
  editingItem: any;
  projForm: ProjectForm;
  setProjForm: React.Dispatch<React.SetStateAction<ProjectForm>>;
  workerForm: WorkerForm;
  setWorkerForm: React.Dispatch<React.SetStateAction<WorkerForm>>;
  tsForm: TimesheetForm;
  setTsForm: React.Dispatch<React.SetStateAction<TimesheetForm>>;
  payrollCalcForm: PayrollCalcForm;
  setPayrollCalcForm: React.Dispatch<React.SetStateAction<PayrollCalcForm>>;
  handleSave: () => Promise<void>;
  projects: ProjectItem[];
}

export default function CrudModal({
  showModal, setShowModal, modalType, editingItem,
  projForm, setProjForm, workerForm, setWorkerForm,
  tsForm, setTsForm, payrollCalcForm, setPayrollCalcForm,
  handleSave, projects,
}: Props) {
  if (!showModal) return null;

  const modalTitle = () => {
    if (modalType === 'project') return editingItem ? 'Edit Proyek' : 'Buat Proyek';
    if (modalType === 'worker') return 'Tambah Pekerja';
    if (modalType === 'timesheet') return 'Input Timesheet';
    if (modalType === 'calc-payroll') return 'Hitung Payroll';
    return '';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b">
          <h3 className="text-lg font-semibold">{modalTitle()}</h3>
          <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {modalType === 'project' && (
            <>
              <div><label className="text-sm font-medium text-gray-700">Nama Proyek</label><input value={projForm.name} onChange={e => setProjForm({ ...projForm, name: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-sm font-medium text-gray-700">Deskripsi</label><textarea value={projForm.description} onChange={e => setProjForm({ ...projForm, description: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Client</label><input value={projForm.clientName} onChange={e => setProjForm({ ...projForm, clientName: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Lokasi</label><input value={projForm.location} onChange={e => setProjForm({ ...projForm, location: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Mulai</label><input type="date" value={projForm.startDate} onChange={e => setProjForm({ ...projForm, startDate: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Selesai</label><input type="date" value={projForm.endDate} onChange={e => setProjForm({ ...projForm, endDate: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Budget (Rp)</label><input type="number" value={projForm.budgetAmount} onChange={e => setProjForm({ ...projForm, budgetAmount: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Prioritas</label>
                  <select value={projForm.priority} onChange={e => setProjForm({ ...projForm, priority: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Departemen</label><input value={projForm.department} onChange={e => setProjForm({ ...projForm, department: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Industri</label>
                  <select value={projForm.industry} onChange={e => setProjForm({ ...projForm, industry: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="">Pilih</option><option value="construction">Konstruksi</option><option value="mining">Tambang</option><option value="manufacturing">Manufaktur</option><option value="it">IT</option><option value="consulting">Konsulting</option><option value="outsourcing">Outsourcing</option><option value="other">Lainnya</option>
                  </select>
                </div>
              </div>
            </>
          )}
          {modalType === 'worker' && (
            <>
              <div><label className="text-sm font-medium text-gray-700">Proyek</label>
                <select value={workerForm.projectId} onChange={e => setWorkerForm({ ...workerForm, projectId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                  <option value="">Pilih Proyek</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium text-gray-700">ID Karyawan</label><input type="number" value={workerForm.employeeId} onChange={e => setWorkerForm({ ...workerForm, employeeId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-sm font-medium text-gray-700">Role</label><input value={workerForm.role} onChange={e => setWorkerForm({ ...workerForm, role: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="e.g. Site Engineer, Foreman" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Rate Harian (Rp)</label><input type="number" value={workerForm.dailyRate} onChange={e => setWorkerForm({ ...workerForm, dailyRate: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Alokasi %</label><input type="number" value={workerForm.allocationPercent} onChange={e => setWorkerForm({ ...workerForm, allocationPercent: parseInt(e.target.value) || 100 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div><label className="text-sm font-medium text-gray-700">Tipe Pekerja</label>
                <select value={workerForm.workerType} onChange={e => setWorkerForm({ ...workerForm, workerType: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                  <option value="permanent">Permanent</option><option value="contract">Kontrak</option><option value="freelance">Freelance</option><option value="outsource">Outsource</option>
                </select>
              </div>
            </>
          )}
          {modalType === 'timesheet' && (
            <>
              <div><label className="text-sm font-medium text-gray-700">Proyek</label>
                <select value={tsForm.projectId} onChange={e => setTsForm({ ...tsForm, projectId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                  <option value="">Pilih Proyek</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium text-gray-700">ID Karyawan</label><input type="number" value={tsForm.employeeId} onChange={e => setTsForm({ ...tsForm, employeeId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-sm font-medium text-gray-700">Tanggal</label><input type="date" value={tsForm.timesheetDate} onChange={e => setTsForm({ ...tsForm, timesheetDate: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Jam Kerja</label><input type="number" value={tsForm.hoursWorked} onChange={e => setTsForm({ ...tsForm, hoursWorked: parseFloat(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Jam Lembur</label><input type="number" value={tsForm.overtimeHours} onChange={e => setTsForm({ ...tsForm, overtimeHours: parseFloat(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div><label className="text-sm font-medium text-gray-700">Deskripsi Aktivitas</label><textarea value={tsForm.activityDescription} onChange={e => setTsForm({ ...tsForm, activityDescription: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
            </>
          )}
          {modalType === 'calc-payroll' && (
            <>
              <div><label className="text-sm font-medium text-gray-700">Proyek</label>
                <select value={payrollCalcForm.projectId} onChange={e => setPayrollCalcForm({ ...payrollCalcForm, projectId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                  <option value="">Pilih Proyek</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium text-gray-700">ID Karyawan</label><input type="number" value={payrollCalcForm.employeeId} onChange={e => setPayrollCalcForm({ ...payrollCalcForm, employeeId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Periode Mulai</label><input type="date" value={payrollCalcForm.periodStart} onChange={e => setPayrollCalcForm({ ...payrollCalcForm, periodStart: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Periode Akhir</label><input type="date" value={payrollCalcForm.periodEnd} onChange={e => setPayrollCalcForm({ ...payrollCalcForm, periodEnd: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">Payroll akan dihitung otomatis dari timesheet yang sudah disetujui dalam periode ini, dikali rate harian pekerja.</p>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t">
          <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">Batal</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{modalType === 'calc-payroll' ? 'Hitung' : 'Simpan'}</button>
        </div>
      </div>
    </div>
  );
}
