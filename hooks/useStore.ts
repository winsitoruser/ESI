import { useState, useEffect, useCallback } from 'react';

interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  logoUrl: string;
  description: string;
  operatingHours: any[];
  isActive: boolean;
}

interface UseStoreReturn {
  store: Store | null;
  loading: boolean;
  error: string | null;
  fetchStore: () => Promise<void>;
  updateStore: (storeData: Partial<Store>) => Promise<any>;
  refreshStore: () => Promise<void>;
}

export const useStore = (): UseStoreReturn => {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/settings/store');
      const data = await response.json();

      if (data.success) {
        setStore(data.data.store);
      } else {
        setError(data.error || 'Failed to fetch store');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch store');
      console.error('Error fetching store:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStore = useCallback(async (storeData: Partial<Store>) => {
    try {
      const response = await fetch('/api/settings/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store: storeData })
      });

      const data = await response.json();

      if (data.success) {
        setStore(data.data.store);
      }

      return data;
    } catch (err: any) {
      console.error('Error updating store:', err);
      throw err;
    }
  }, []);

  const refreshStore = useCallback(async () => {
    await fetchStore();
  }, [fetchStore]);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  return {
    store,
    loading,
    error,
    fetchStore,
    updateStore,
    refreshStore
  };
};
