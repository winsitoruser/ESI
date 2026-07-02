import React from 'react';
import { FaStore, FaChevronDown } from 'react-icons/fa';

interface BranchSelectorProps {
  branches: any[];
  selectedBranch: any;
  onSelect: (branch: any) => void;
  className?: string;
}

const BranchSelector: React.FC<BranchSelectorProps> = ({
  branches,
  selectedBranch,
  onSelect,
  className = ''
}) => {
  const activeBranches = branches.filter(b => b.isActive);

  if (activeBranches.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <FaStore className="inline mr-1" />
        Pilih Cabang
      </label>
      <div className="relative">
        <select
          value={selectedBranch?.id || ''}
          onChange={(e) => {
            if (e.target.value === '') {
              onSelect(null);
            } else {
              const branch = activeBranches.find(b => b.id === e.target.value);
              if (branch) onSelect(branch);
            }
          }}
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
        >
          <option value="">Semua Cabang</option>
          {activeBranches.map(branch => (
            <option key={branch.id} value={branch.id}>
              {branch.name} ({branch.code})
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <FaChevronDown className="text-gray-400" />
        </div>
      </div>
    </div>
  );
};

export default BranchSelector;
