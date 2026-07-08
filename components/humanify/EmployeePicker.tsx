import { useEffect, useMemo, useState } from 'react';
import { getDepartmentLabel, getWorkLocationLabel } from '@/lib/hris/master-data';

export interface PickedEmployee {
  id: string;
  employee_id: string;
  name: string;
  position: string;
  department: string;
  department_label: string;
  branch_name: string;
  work_location: string;
  join_date?: string;
}

interface EmployeePickerProps {
  value?: string;
  onChange: (employee: PickedEmployee | null) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export default function EmployeePicker({
  value,
  onChange,
  label = 'Karyawan',
  required,
  disabled,
  placeholder = 'Pilih karyawan dari master data...',
  className = '',
}: EmployeePickerProps) {
  const [employees, setEmployees] = useState<PickedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/humanify/employee-profile?action=list&limit=200');
        const json = await res.json();
        if (!cancelled && json.success) {
          setEmployees((json.data || []).map((e: any) => ({
            id: String(e.id),
            employee_id: e.employee_id || e.employeeId || '',
            name: e.name || '',
            position: e.position || '',
            department: e.department || '',
            department_label: e.department_label || getDepartmentLabel(e.department),
            branch_name: e.branch_name || e.branchName || '',
            work_location: e.work_location || e.workLocation || '',
            join_date: e.join_date || e.joinDate,
          })));
        }
      } catch {
        if (!cancelled) setEmployees([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return employees;
    const q = filter.toLowerCase();
    return employees.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.employee_id.toLowerCase().includes(q) ||
      e.position.toLowerCase().includes(q) ||
      e.department_label.toLowerCase().includes(q) ||
      e.branch_name.toLowerCase().includes(q)
    );
  }, [employees, filter]);

  const selected = employees.find((e) => e.id === value);

  const handleSelect = (id: string) => {
    const emp = employees.find((e) => e.id === id) || null;
    onChange(emp);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Cari UID, nama, posisi, departemen..."
        className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
        disabled={disabled || loading}
      />
      <select
        value={value || ''}
        onChange={(e) => handleSelect(e.target.value)}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full px-3 py-2 border rounded-lg text-sm"
        required={required}
        disabled={disabled || loading}
      >
        <option value="">{loading ? 'Memuat karyawan...' : placeholder}</option>
        {filtered.map((e) => (
          <option key={e.id} value={e.id}>
            {e.employee_id} — {e.name} — {e.position} — {e.department_label} — {e.branch_name || getWorkLocationLabel(e.work_location)}
          </option>
        ))}
      </select>
      {selected && (
        <p className="text-xs text-gray-500 mt-1">
          UID: <strong>{selected.employee_id}</strong> • {selected.position} • {selected.department_label} • {selected.branch_name || getWorkLocationLabel(selected.work_location)}
        </p>
      )}
    </div>
  );
}
