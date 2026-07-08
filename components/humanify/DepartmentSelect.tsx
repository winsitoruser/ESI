import { HRIS_DEPARTMENTS } from '@/lib/hris/master-data';
import { useHrisMasterData } from '@/hooks/useHrisMasterData';

type DepartmentSelectProps = {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  includeAll?: boolean;
  allLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

/** Dropdown departemen — sumber: /api/humanify/master-data (org_structures) */
export default function DepartmentSelect({
  value,
  onChange,
  className = 'w-full px-3 py-2 border rounded-lg text-sm',
  includeAll = false,
  allLabel = 'Semua Departemen',
  placeholder = 'Pilih departemen',
  disabled = false,
  required = false,
}: DepartmentSelectProps) {
  const { departments, loading } = useHrisMasterData();
  const options = departments.length ? departments : HRIS_DEPARTMENTS;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      disabled={disabled || loading}
      required={required}
    >
      {includeAll && <option value="">{allLabel}</option>}
      {!includeAll && !value && <option value="">{placeholder}</option>}
      {options.map((d) => (
        <option key={d.code} value={d.code}>{d.label}</option>
      ))}
    </select>
  );
}
