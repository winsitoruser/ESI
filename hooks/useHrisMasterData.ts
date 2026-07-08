import { useEffect, useState, useCallback } from 'react';
import { HRIS_DEPARTMENTS, type HrisOption } from '@/lib/hris/master-data';

export interface HrisMasterData {
  departments: HrisOption[];
  workLocations: HrisOption[];
  branches: { id: string; name: string; code?: string; city?: string }[];
  jobGrades: { id: string; code: string; name: string; level?: number }[];
  orgUnits: { id: string; code: string; name: string; departmentCode?: string | null }[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const EMPTY: Omit<HrisMasterData, 'loading' | 'error' | 'refresh'> = {
  departments: HRIS_DEPARTMENTS,
  workLocations: [],
  branches: [],
  jobGrades: [],
  orgUnits: [],
};

export function useHrisMasterData(): HrisMasterData {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/humanify/master-data');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const d = json.data || {};
      setData({
        departments: d.departments?.length ? d.departments : HRIS_DEPARTMENTS,
        workLocations: d.workLocations || [],
        branches: d.branches || [],
        jobGrades: d.jobGrades || [],
        orgUnits: d.orgUnits || [],
      });
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat master data');
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...data, loading, error, refresh };
}
