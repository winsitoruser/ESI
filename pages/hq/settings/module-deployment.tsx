import { useState, useEffect } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  Package, Building2, Check, X, AlertTriangle, ChevronDown,
  Settings, RefreshCw, Zap, Target, Users, ArrowRight,
  CheckCircle2, XCircle, MinusCircle, BarChart3, Download,
  Upload, Filter, Search, Grid3X3, List, Layers, Globe
} from 'lucide-react';

interface DeploymentModule {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  moduleIcon: string;
  category: string;
  pricingTier: string;
  isCore: boolean;
  hqEnabled: boolean;
  branches: {
    total: number;
    enabled: number;
    disabled: number;
    list: Array<{
      branchId: string;
      branchName: string;
      isEnabled: boolean;
      enabledAt: string | null;
    }>;
  };
  deploymentStatus: 'full' | 'partial' | 'none';
  coverage: number;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  status: string;
}

export default function ModuleDeployment() {
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<DeploymentModule[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Deployment dialog state
  const [deployDialog, setDeployDialog] = useState<{
    open: boolean;
    moduleIds: string[];
    moduleNames: string[];
    action: 'enable' | 'disable';
  } | null>(null);
  
  const [deployScope, setDeployScope] = useState<'hq' | 'all_branches' | 'selected_branches'>('all_branches');
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  const [deployOptions, setDeployOptions] = useState({
    cascadeToExisting: true,
    applyToFuture: true,
    overrideExisting: false
  });
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    fetchDeploymentStatus();
  }, []);

  const fetchDeploymentStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/modules/deployment');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setModules(json.data.modules || []);
          setBranches(json.data.branches || []);
          setSummary(json.data.summary);
        }
      }
    } catch (error) {
      console.error('Failed to fetch deployment status:', error);
      toast.error('Gagal memuat status deployment');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectModule = (moduleId: string) => {
    const newSelected = new Set(selectedModules);
    if (newSelected.has(moduleId)) {
      newSelected.delete(moduleId);
    } else {
      newSelected.add(moduleId);
    }
    setSelectedModules(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedModules.size === filteredModules.length) {
      setSelectedModules(new Set());
    } else {
      setSelectedModules(new Set(filteredModules.map(m => m.moduleId)));
    }
  };

  const openDeployDialog = (moduleIds: string[], action: 'enable' | 'disable') => {
    const moduleNames = modules
      .filter(m => moduleIds.includes(m.moduleId))
      .map(m => m.moduleName);
    
    setDeployDialog({
      open: true,
      moduleIds,
      moduleNames,
      action
    });
    setDeployScope('all_branches');
    setSelectedBranches(new Set());
  };

  const handleDeploy = async () => {
    if (!deployDialog) return;

    setDeploying(true);
    try {
      const payload = {
        moduleIds: deployDialog.moduleIds,
        action: deployDialog.action,
        scope: {
          type: deployScope,
          branchIds: deployScope === 'selected_branches' ? Array.from(selectedBranches) : undefined
        },
        options: deployOptions
      };

      const res = await fetch('/api/hq/modules/deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      
      if (json.success) {
        toast.success(json.message);
        setDeployDialog(null);
        setSelectedModules(new Set());
        await fetchDeploymentStatus();
      } else {
        toast.error(json.error || 'Deployment gagal');
      }
    } catch (error) {
      console.error('Deployment error:', error);
      toast.error('Error saat deployment');
    } finally {
      setDeploying(false);
    }
  };

  const handleSelectBranch = (branchId: string) => {
    const newSelected = new Set(selectedBranches);
    if (newSelected.has(branchId)) {
      newSelected.delete(branchId);
    } else {
      newSelected.add(branchId);
    }
    setSelectedBranches(newSelected);
  };

  const filteredModules = modules.filter(mod => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!mod.moduleName.toLowerCase().includes(q) && 
          !mod.moduleCode.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'full' && mod.deploymentStatus !== 'full') return false;
      if (statusFilter === 'partial' && mod.deploymentStatus !== 'partial') return false;
      if (statusFilter === 'none' && mod.deploymentStatus !== 'none') return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'full':
        return { icon: CheckCircle2, label: 'Full Deployment', color: 'text-green-600', bg: 'bg-green-100' };
      case 'partial':
        return { icon: MinusCircle, label: 'Partial Deployment', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'none':
        return { icon: XCircle, label: 'Not Deployed', color: 'text-gray-400', bg: 'bg-gray-100' };
      default:
        return { icon: MinusCircle, label: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-100' };
    }
  };

  return (
    <HQLayout 
      title="Module Deployment" 
      subtitle="Kelola deployment modul ke HQ dan Branch secara terpusat"
    >
      <div className="space-y-6">
        
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalModules}</p>
                  <p className="text-xs text-gray-500">Total Modul</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalBranches}</p>
                  <p className="text-xs text-gray-500">Total Branch</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{summary.fullyDeployed}</p>
                  <p className="text-xs text-gray-500">Full Deploy</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <MinusCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{summary.partiallyDeployed}</p>
                  <p className="text-xs text-gray-500">Partial</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-400">{summary.notDeployed}</p>
                  <p className="text-xs text-gray-500">Not Deploy</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari modul..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Filters */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="full">Full Deployment</option>
              <option value="partial">Partial Deployment</option>
              <option value="none">Not Deployed</option>
            </select>

            {/* View Mode */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={fetchDeploymentStatus}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedModules.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {selectedModules.size} modul dipilih
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openDeployDialog(Array.from(selectedModules), 'enable')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Deploy Selected
                </button>
                <button
                  onClick={() => openDeployDialog(Array.from(selectedModules), 'disable')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Undeploy Selected
                </button>
                <button
                  onClick={() => setSelectedModules(new Set())}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Select All */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedModules.size === filteredModules.length && filteredModules.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label className="text-sm text-gray-600">
            Pilih Semua ({filteredModules.length} modul)
          </label>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
            <p className="text-gray-500">Memuat data deployment...</p>
          </div>
        )}

        {/* Module List/Grid */}
        {!loading && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModules.map(mod => (
              <ModuleDeploymentCard
                key={mod.moduleId}
                module={mod}
                isSelected={selectedModules.has(mod.moduleId)}
                onSelect={() => handleSelectModule(mod.moduleId)}
                onDeploy={(action) => openDeployDialog([mod.moduleId], action)}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        )}

        {!loading && viewMode === 'list' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <input
                      type="checkbox"
                      checked={selectedModules.size === filteredModules.length && filteredModules.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modul</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HQ Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch Coverage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredModules.map(mod => (
                  <ModuleDeploymentRow
                    key={mod.moduleId}
                    module={mod}
                    isSelected={selectedModules.has(mod.moduleId)}
                    onSelect={() => handleSelectModule(mod.moduleId)}
                    onDeploy={(action) => openDeployDialog([mod.moduleId], action)}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredModules.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Tidak ada modul yang cocok dengan filter</p>
          </div>
        )}

        {/* Deployment Dialog */}
        {deployDialog && (
          <DeploymentDialog
            dialog={deployDialog}
            scope={deployScope}
            setScope={setDeployScope}
            branches={branches}
            selectedBranches={selectedBranches}
            onSelectBranch={handleSelectBranch}
            options={deployOptions}
            setOptions={setDeployOptions}
            deploying={deploying}
            onDeploy={handleDeploy}
            onCancel={() => setDeployDialog(null)}
          />
        )}
      </div>
    </HQLayout>
  );
}

// Module Card Component (Grid View)
function ModuleDeploymentCard({ module, isSelected, onSelect, onDeploy, getStatusBadge }: any) {
  const status = getStatusBadge(module.deploymentStatus);
  const StatusIcon = status.icon;

  return (
    <div className={`bg-white rounded-xl border-2 p-4 transition-all ${
      isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <div>
            <h3 className="font-semibold text-gray-900">{module.moduleName}</h3>
            <p className="text-xs text-gray-500">{module.moduleCode}</p>
          </div>
        </div>
        {module.isCore && (
          <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
            CORE
          </span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">HQ Status:</span>
          <span className={`font-medium ${module.hqEnabled ? 'text-green-600' : 'text-gray-400'}`}>
            {module.hqEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Branch Coverage:</span>
          <span className="font-medium text-gray-900">
            {module.branches.enabled}/{module.branches.total} ({module.coverage}%)
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              module.coverage === 100 ? 'bg-green-500' :
              module.coverage > 0 ? 'bg-yellow-500' :
              'bg-gray-300'
            }`}
            style={{ width: `${module.coverage}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className={`flex items-center gap-1 px-2 py-1 rounded ${status.bg}`}>
          <StatusIcon className={`w-3 h-3 ${status.color}`} />
          <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onDeploy('enable')}
          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
        >
          Deploy
        </button>
        <button
          onClick={() => onDeploy('disable')}
          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          Undeploy
        </button>
      </div>
    </div>
  );
}

// Module Row Component (List View)
function ModuleDeploymentRow({ module, isSelected, onSelect, onDeploy, getStatusBadge }: any) {
  const status = getStatusBadge(module.deploymentStatus);
  const StatusIcon = status.icon;

  return (
    <tr className={isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 text-blue-600 rounded"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div>
            <p className="font-medium text-gray-900">{module.moduleName}</p>
            <p className="text-xs text-gray-500">{module.moduleCode}</p>
          </div>
          {module.isCore && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
              CORE
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-sm font-medium ${module.hqEnabled ? 'text-green-600' : 'text-gray-400'}`}>
          {module.hqEnabled ? 'Enabled' : 'Disabled'}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                module.coverage === 100 ? 'bg-green-500' :
                module.coverage > 0 ? 'bg-yellow-500' :
                'bg-gray-300'
              }`}
              style={{ width: `${module.coverage}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-900 min-w-[60px]">
            {module.branches.enabled}/{module.branches.total}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${status.bg}`}>
          <StatusIcon className={`w-3 h-3 ${status.color}`} />
          <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={() => onDeploy('enable')}
            className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
          >
            Deploy
          </button>
          <button
            onClick={() => onDeploy('disable')}
            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
          >
            Undeploy
          </button>
        </div>
      </td>
    </tr>
  );
}

// Deployment Dialog Component
function DeploymentDialog({
  dialog, scope, setScope, branches, selectedBranches, onSelectBranch,
  options, setOptions, deploying, onDeploy, onCancel
}: any) {
  const affectedBranches = scope === 'all_branches' ? branches.length :
                          scope === 'selected_branches' ? selectedBranches.size :
                          0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              dialog.action === 'enable' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {dialog.action === 'enable' ? (
                <Zap className="w-5 h-5 text-green-600" />
              ) : (
                <X className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {dialog.action === 'enable' ? 'Deploy Module' : 'Undeploy Module'}
              </h3>
              <p className="text-sm text-gray-500">
                {dialog.moduleNames.join(', ')}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Deployment Target */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Deployment Target:
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  checked={scope === 'hq'}
                  onChange={() => setScope('hq')}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">HQ Only</p>
                  <p className="text-xs text-gray-500">Deploy hanya di tingkat HQ/Parent</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  checked={scope === 'all_branches'}
                  onChange={() => setScope('all_branches')}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">All Branches ({branches.length})</p>
                  <p className="text-xs text-gray-500">Deploy ke semua branch yang aktif</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  checked={scope === 'selected_branches'}
                  onChange={() => setScope('selected_branches')}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Selected Branches</p>
                  <p className="text-xs text-gray-500">Pilih branch tertentu untuk deployment</p>
                </div>
              </label>
            </div>
          </div>

          {/* Branch Selection */}
          {scope === 'selected_branches' && (
            <div className="border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Pilih Branch ({selectedBranches.size} dipilih):
              </p>
              <div className="space-y-2">
                {branches.map((branch: Branch) => (
                  <label key={branch.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBranches.has(branch.id)}
                      onChange={() => onSelectBranch(branch.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-900">{branch.name}</span>
                    <span className="text-xs text-gray-500">({branch.code})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Deployment Options:
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.cascadeToExisting}
                  onChange={e => setOptions({...options, cascadeToExisting: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Apply to existing branches</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.applyToFuture}
                  onChange={e => setOptions({...options, applyToFuture: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Apply to future branches automatically</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.overrideExisting}
                  onChange={e => setOptions({...options, overrideExisting: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Override existing settings</span>
              </label>
            </div>
          </div>

          {/* Impact Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">Impact Preview:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• {dialog.moduleNames.length} modul akan di-{dialog.action === 'enable' ? 'deploy' : 'undeploy'}</li>
              {scope !== 'hq' && (
                <li>• {affectedBranches} branch akan terpengaruh</li>
              )}
              {scope === 'hq' && (
                <li>• Deployment hanya di tingkat HQ</li>
              )}
            </ul>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={deploying}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onDeploy}
            disabled={deploying || (scope === 'selected_branches' && selectedBranches.size === 0)}
            className={`px-6 py-2 rounded-lg text-white font-medium disabled:opacity-50 flex items-center gap-2 ${
              dialog.action === 'enable' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {deploying && <RefreshCw className="w-4 h-4 animate-spin" />}
            {dialog.action === 'enable' ? 'Deploy Module' : 'Undeploy Module'}
          </button>
        </div>
      </div>
    </div>
  );
}
