import { useState, useEffect, useCallback } from 'react';

interface Branch {
  id: string;
  storeId: string;
  code: string;
  name: string;
  type: 'main' | 'branch' | 'warehouse' | 'kiosk';
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  managerId: number;
  operatingHours: any[];
  isActive: boolean;
  settings: any;
  store?: any;
  manager?: any;
}

interface UseBranchesReturn {
  branches: Branch[];
  selectedBranch: Branch | null;
  loading: boolean;
  error: string | null;
  fetchBranches: (storeId?: string) => Promise<void>;
  createBranch: (branchData: Partial<Branch>) => Promise<any>;
  updateBranch: (id: string, branchData: Partial<Branch>) => Promise<any>;
  deleteBranch: (id: string) => Promise<any>;
  setSelectedBranch: (branch: Branch | null) => void;
  refreshBranches: () => Promise<void>;
}

export const useBranches = (storeId?: string): UseBranchesReturn => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBranches = useCallback(async (filterStoreId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStoreId || storeId) {
        params.append('storeId', filterStoreId || storeId || '');
      }

      const response = await fetch(`/api/settings/store/branches?${params}`);
      const data = await response.json();

      if (data.success) {
        setBranches(data.data);
        
        // Auto-select first active branch if none selected
        if (!selectedBranch && data.data.length > 0) {
          const activeBranch = data.data.find((b: Branch) => b.isActive);
          if (activeBranch) {
            setSelectedBranch(activeBranch);
          }
        }
      } else {
        setError(data.error || 'Failed to fetch branches');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch branches');
      console.error('Error fetching branches:', err);
    } finally {
      setLoading(false);
    }
  }, [storeId, selectedBranch]);

  const createBranch = useCallback(async (branchData: Partial<Branch>) => {
    try {
      const response = await fetch('/api/settings/store/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branchData)
      });

      const data = await response.json();

      if (data.success) {
        setBranches(prev => [...prev, data.data]);
      }

      return data;
    } catch (err: any) {
      console.error('Error creating branch:', err);
      throw err;
    }
  }, []);

  const updateBranch = useCallback(async (id: string, branchData: Partial<Branch>) => {
    try {
      const response = await fetch(`/api/settings/store/branches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branchData)
      });

      const data = await response.json();

      if (data.success) {
        setBranches(prev => 
          prev.map(b => b.id === id ? data.data : b)
        );
        
        // Update selected branch if it's the one being updated
        if (selectedBranch?.id === id) {
          setSelectedBranch(data.data);
        }
      }

      return data;
    } catch (err: any) {
      console.error('Error updating branch:', err);
      throw err;
    }
  }, [selectedBranch]);

  const deleteBranch = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/settings/store/branches/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setBranches(prev => prev.filter(b => b.id !== id));
        
        // Clear selected branch if it's the one being deleted
        if (selectedBranch?.id === id) {
          setSelectedBranch(null);
        }
      }

      return data;
    } catch (err: any) {
      console.error('Error deleting branch:', err);
      throw err;
    }
  }, [selectedBranch]);

  const refreshBranches = useCallback(async () => {
    await fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  return {
    branches,
    selectedBranch,
    loading,
    error,
    fetchBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    setSelectedBranch,
    refreshBranches
  };
};
