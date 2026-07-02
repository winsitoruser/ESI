import { useState, useEffect } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Hook for Master Summary
export const useMasterSummary = () => {
  const { data, error, mutate } = useSWR('/api/inventory/master/summary', fetcher, {
    refreshInterval: 30000,
  });

  return {
    summary: data?.data || null,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
};

// Hook for Categories
export const useCategories = (search?: string, isActive?: boolean) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (isActive !== undefined) params.append('is_active', String(isActive));
  
  const url = `/api/inventory/master/categories${params.toString() ? '?' + params.toString() : ''}`;
  const { data, error, mutate } = useSWR(url, fetcher);

  return {
    categories: data?.data || [],
    count: data?.count || 0,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
};

// Hook for Suppliers
export const useSuppliers = (search?: string, isActive?: boolean) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (isActive !== undefined) params.append('is_active', String(isActive));
  
  const url = `/api/inventory/master/suppliers${params.toString() ? '?' + params.toString() : ''}`;
  const { data, error, mutate } = useSWR(url, fetcher);

  return {
    suppliers: data?.data || [],
    count: data?.count || 0,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
};

// Hook for Units
export const useUnits = (search?: string, isActive?: boolean) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (isActive !== undefined) params.append('is_active', String(isActive));
  
  const url = `/api/inventory/master/units${params.toString() ? '?' + params.toString() : ''}`;
  const { data, error, mutate } = useSWR(url, fetcher);

  return {
    units: data?.data || [],
    count: data?.count || 0,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
};

// Hook for Brands
export const useBrands = (search?: string, isActive?: boolean) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (isActive !== undefined) params.append('is_active', String(isActive));
  
  const url = `/api/inventory/master/brands${params.toString() ? '?' + params.toString() : ''}`;
  const { data, error, mutate } = useSWR(url, fetcher);

  return {
    brands: data?.data || [],
    count: data?.count || 0,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
};

// Hook for Warehouses
export const useWarehouses = () => {
  const { data, error, mutate } = useSWR('/api/inventory/master/warehouses', fetcher);

  return {
    warehouses: data?.data || [],
    count: data?.count || 0,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
};

// Hook for Tags
export const useTags = () => {
  const { data, error, mutate } = useSWR('/api/inventory/master/tags', fetcher);

  return {
    tags: data?.data || [],
    count: data?.count || 0,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
};

// Generic CRUD operations hook
export const useMasterCRUD = (endpoint: string) => {
  const [loading, setLoading] = useState(false);

  const create = async (data: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/inventory/master/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message || 'Data berhasil ditambahkan');
        return result.data;
      } else {
        toast.error(result.error || 'Gagal menambahkan data');
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const update = async (data: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/inventory/master/${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message || 'Data berhasil diperbarui');
        return result.data;
      } else {
        toast.error(result.error || 'Gagal memperbarui data');
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number | string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/inventory/master/${endpoint}?id=${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message || 'Data berhasil dihapus');
        return true;
      } else {
        toast.error(result.error || 'Gagal menghapus data');
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    create,
    update,
    remove,
    loading
  };
};
