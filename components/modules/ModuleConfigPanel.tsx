import { useState } from 'react';
import { Settings, Save, X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ModuleConfig {
  [key: string]: any;
}

interface ModuleConfigPanelProps {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  currentConfig: ModuleConfig;
  configSchema?: any;
  onClose: () => void;
  onSave: (config: ModuleConfig) => Promise<void>;
}

export default function ModuleConfigPanel({
  moduleId,
  moduleCode,
  moduleName,
  currentConfig,
  configSchema,
  onClose,
  onSave
}: ModuleConfigPanelProps) {
  const [config, setConfig] = useState<ModuleConfig>(currentConfig || {});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    
    try {
      // Validate config
      const validationErrors: Record<string, string> = {};
      
      if (configSchema) {
        Object.keys(configSchema).forEach(key => {
          const schema = configSchema[key];
          const value = config[key];
          
          if (schema.required && !value) {
            validationErrors[key] = `${schema.label} wajib diisi`;
          }
          
          if (schema.type === 'number' && value && isNaN(Number(value))) {
            validationErrors[key] = `${schema.label} harus berupa angka`;
          }
          
          if (schema.min !== undefined && Number(value) < schema.min) {
            validationErrors[key] = `${schema.label} minimal ${schema.min}`;
          }
          
          if (schema.max !== undefined && Number(value) > schema.max) {
            validationErrors[key] = `${schema.label} maksimal ${schema.max}`;
          }
        });
      }
      
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        toast.error('Terdapat kesalahan pada konfigurasi');
        return;
      }
      
      await onSave(config);
      toast.success('Konfigurasi berhasil disimpan');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan konfigurasi');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(currentConfig || {});
    setErrors({});
    toast.success('Konfigurasi direset');
  };

  const renderField = (key: string, schema: any) => {
    const value = config[key];
    const error = errors[key];
    
    switch (schema.type) {
      case 'boolean':
        return (
          <div key={key} className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">{schema.label}</span>
            </label>
            {schema.description && (
              <p className="text-xs text-gray-500 ml-6">{schema.description}</p>
            )}
            {error && (
              <p className="text-xs text-red-600 ml-6 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );
      
      case 'select':
        return (
          <div key={key} className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {schema.label}
              {schema.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={value || ''}
              onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${
                error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              } focus:ring-2`}
            >
              <option value="">Pilih {schema.label}</option>
              {schema.options?.map((opt: any) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {schema.description && (
              <p className="text-xs text-gray-500">{schema.description}</p>
            )}
            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );
      
      case 'number':
        return (
          <div key={key} className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {schema.label}
              {schema.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="number"
              value={value || ''}
              onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
              min={schema.min}
              max={schema.max}
              step={schema.step || 1}
              className={`w-full px-3 py-2 rounded-lg border ${
                error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              } focus:ring-2`}
              placeholder={schema.placeholder}
            />
            {schema.description && (
              <p className="text-xs text-gray-500">{schema.description}</p>
            )}
            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );
      
      default: // text
        return (
          <div key={key} className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {schema.label}
              {schema.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${
                error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              } focus:ring-2`}
              placeholder={schema.placeholder}
            />
            {schema.description && (
              <p className="text-xs text-gray-500">{schema.description}</p>
            )}
            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Konfigurasi Modul</h3>
                <p className="text-sm text-gray-600">{moduleName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {configSchema ? (
            <div className="space-y-4">
              {Object.keys(configSchema).map(key => renderField(key, configSchema[key]))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Settings className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Modul ini belum memiliki konfigurasi</p>
              <p className="text-sm text-gray-400 mt-1">Konfigurasi akan tersedia setelah modul diaktifkan</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {configSchema && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={handleReset}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Simpan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
