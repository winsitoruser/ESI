import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Layers, Plus, Edit2, Trash2, Copy, CheckCircle2, X,
  RefreshCw, Package, Building2, Globe, Save
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  moduleIds: string[];
  moduleNames: string[];
  targetType: string;
  branchCount: number;
  createdAt: string;
  createdBy: string;
}

interface ModuleTemplateManagerProps {
  onApplyTemplate?: (template: Template) => void;
}

export default function ModuleTemplateManager({ onApplyTemplate }: ModuleTemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/modules/templates');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTemplates(json.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Gagal memuat templates');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = (template: Template) => {
    if (onApplyTemplate) {
      onApplyTemplate(template);
      toast.success(`Template "${template.name}" diterapkan`);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Hapus template ini?')) return;

    try {
      const res = await fetch(`/api/hq/modules/templates?id=${templateId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Template berhasil dihapus');
        fetchTemplates();
      }
    } catch (error) {
      toast.error('Gagal menghapus template');
    }
  };

  const getTargetTypeLabel = (type: string) => {
    switch (type) {
      case 'hq': return 'HQ Only';
      case 'all_branches': return 'All Branches';
      case 'selected_branches': return 'Selected Branches';
      default: return type;
    }
  };

  const getTargetTypeIcon = (type: string) => {
    switch (type) {
      case 'hq': return Globe;
      case 'all_branches': return Building2;
      case 'selected_branches': return Package;
      default: return Package;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Layers className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Deployment Templates</h3>
            <p className="text-sm text-gray-500">Quick apply pre-configured module sets</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
          <p className="text-sm text-gray-500">Loading templates...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(template => {
            const TargetIcon = getTargetTypeIcon(template.targetType);
            return (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
                    <p className="text-xs text-gray-500 mb-2">{template.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <TargetIcon className="w-3 h-3" />
                      <span>{getTargetTypeLabel(template.targetType)}</span>
                      {template.branchCount > 0 && (
                        <span className="text-gray-400">• {template.branchCount} branches</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">Modules ({template.moduleIds.length}):</p>
                  <div className="flex flex-wrap gap-1">
                    {template.moduleNames.map((name, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApplyTemplate(template)}
                    className="flex-1 px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Apply
                  </button>
                  <button
                    onClick={() => setEditingTemplate(template)}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs hover:bg-gray-50"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="px-3 py-1.5 border border-red-300 text-red-600 rounded text-xs hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
                  Created by {template.createdBy} • {new Date(template.createdAt).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && templates.length === 0 && (
        <div className="text-center py-8">
          <Layers className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No templates yet</p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
          >
            Create First Template
          </button>
        </div>
      )}
    </div>
  );
}
