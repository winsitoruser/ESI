import { useState, useEffect } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useBusinessType } from '@/contexts/BusinessTypeContext';
import { toast } from 'react-hot-toast';
import { Package, RefreshCw } from 'lucide-react';

export default function ModuleManagementDebug() {
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Fetching modules from /api/hq/modules...');
      const res = await fetch('/api/hq/modules');
      console.log('📡 Response status:', res.status, res.statusText);
      
      const text = await res.text();
      console.log('📄 Raw response:', text.substring(0, 500));
      
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error(`Failed to parse JSON: ${text.substring(0, 200)}`);
      }
      
      console.log('✅ Parsed JSON:', json);
      console.log('📊 Success:', json.success);
      console.log('📦 Modules count:', json.data?.modules?.length);
      console.log('🏷️  Categories:', Object.keys(json.data?.categories || {}));
      console.log('📋 Category labels:', Object.keys(json.data?.categoryLabels || {}));
      
      if (json.data?.modules) {
        const fnbModules = json.data.modules.filter((m: any) => m.category === 'fnb');
        console.log('🍽️  F&B modules found:', fnbModules.length);
        fnbModules.forEach((m: any) => console.log('  -', m.code, ':', m.name));
      }
      
      setRawData(json);
      
      if (!json.success) {
        setError(json.error || 'API returned success: false');
      }
    } catch (error: any) {
      console.error('❌ Error fetching modules:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <HQLayout title="Module Debug" subtitle="Debug modul F&B">
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Debug Information</h2>
            <button
              onClick={fetchModules}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
              <p className="text-gray-600">Memuat...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-red-900 mb-2">Error:</h3>
              <p className="text-red-700 text-sm font-mono">{error}</p>
            </div>
          )}

          {!loading && rawData && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">✅ API Response Received</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Success:</strong> {rawData.success ? 'Yes' : 'No'}</p>
                  <p><strong>Total Modules:</strong> {rawData.data?.modules?.length || 0}</p>
                  <p><strong>Categories:</strong> {Object.keys(rawData.data?.categories || {}).join(', ')}</p>
                </div>
              </div>

              {rawData.data?.categoryLabels && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">🏷️ Category Labels</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(rawData.data.categoryLabels).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <code className="bg-white px-2 py-1 rounded text-xs">{key}</code>
                        <span>→ {value as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rawData.data?.modules && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">📦 Modules by Category</h3>
                  {Object.entries(rawData.data.categories || {}).map(([category, modules]: [string, any]) => (
                    <div key={category} className="mb-3">
                      <h4 className="font-medium text-purple-800 mb-1">
                        {category} ({modules.length} modules)
                      </h4>
                      <div className="ml-4 space-y-1">
                        {modules.slice(0, 10).map((m: any) => (
                          <div key={m.id} className="text-sm text-gray-700">
                            • {m.code}: {m.name}
                          </div>
                        ))}
                        {modules.length > 10 && (
                          <div className="text-sm text-gray-500 italic">
                            ... and {modules.length - 10} more
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">📄 Raw JSON Response</h3>
                <pre className="text-xs overflow-auto max-h-96 bg-white p-3 rounded border">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </HQLayout>
  );
}
