import { useState, useEffect, useCallback } from 'react';

interface StoreSettings {
  [category: string]: {
    [key: string]: any;
  };
}

interface UseStoreSettingsReturn {
  settings: StoreSettings;
  loading: boolean;
  error: string | null;
  fetchSettings: (category?: string, branchId?: string) => Promise<void>;
  updateSettings: (settings: StoreSettings, branchId?: string, storeId?: string) => Promise<any>;
  getSetting: (category: string, key: string) => any;
  setSetting: (category: string, key: string, value: any, dataType?: string) => Promise<any>;
  refreshSettings: () => Promise<void>;
}

export const useStoreSettings = (
  initialCategory?: string,
  initialBranchId?: string
): UseStoreSettingsReturn => {
  const [settings, setSettings] = useState<StoreSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState(initialCategory);
  const [branchId, setBranchId] = useState(initialBranchId);

  const fetchSettings = useCallback(async (
    filterCategory?: string,
    filterBranchId?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterCategory || category) {
        params.append('category', filterCategory || category || '');
      }
      if (filterBranchId || branchId) {
        params.append('branchId', filterBranchId || branchId || '');
      }

      const response = await fetch(`/api/settings/store/settings?${params}`);
      const data = await response.json();

      if (data.success) {
        setSettings(data.data.settings);
      } else {
        setError(data.error || 'Failed to fetch settings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch settings');
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }, [category, branchId]);

  const updateSettings = useCallback(async (
    settingsData: StoreSettings,
    filterBranchId?: string,
    filterStoreId?: string
  ) => {
    try {
      const response = await fetch('/api/settings/store/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: settingsData,
          branchId: filterBranchId || branchId,
          storeId: filterStoreId
        })
      });

      const data = await response.json();

      if (data.success) {
        // Refresh settings after update
        await fetchSettings();
      }

      return data;
    } catch (err: any) {
      console.error('Error updating settings:', err);
      throw err;
    }
  }, [branchId, fetchSettings]);

  const getSetting = useCallback((category: string, key: string): any => {
    return settings[category]?.[key];
  }, [settings]);

  const setSetting = useCallback(async (
    category: string,
    key: string,
    value: any,
    dataType: string = 'string'
  ) => {
    try {
      const response = await fetch('/api/settings/store/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          key,
          value,
          dataType,
          branchId
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setSettings(prev => ({
          ...prev,
          [category]: {
            ...prev[category],
            [key]: value
          }
        }));
      }

      return data;
    } catch (err: any) {
      console.error('Error setting value:', err);
      throw err;
    }
  }, [branchId]);

  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
    getSetting,
    setSetting,
    refreshSettings
  };
};
