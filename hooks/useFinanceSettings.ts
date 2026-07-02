import useSWR from 'swr';
import { toast } from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useFinanceSettingsSummary() {
  const { data, error, mutate } = useSWR('/api/finance/settings/summary', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true
  });

  return {
    summary: data?.data,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
}

export function usePaymentMethods(isActive?: boolean) {
  const url = isActive !== undefined 
    ? `/api/finance/settings/payment-methods?is_active=${isActive}`
    : '/api/finance/settings/payment-methods';

  const { data, error, mutate } = useSWR(url, fetcher);

  return {
    paymentMethods: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
}

export function useBankAccounts() {
  const { data, error, mutate } = useSWR('/api/finance/settings/bank-accounts', fetcher);

  return {
    bankAccounts: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
}

export function useFinanceCategories(type?: 'income' | 'expense') {
  const url = type 
    ? `/api/finance/settings/categories?type=${type}`
    : '/api/finance/settings/categories';

  const { data, error, mutate } = useSWR(url, fetcher);

  return {
    categories: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
}

export function useChartOfAccounts(category?: string) {
  const url = category 
    ? `/api/finance/settings/chart-of-accounts?category=${category}`
    : '/api/finance/settings/chart-of-accounts';

  const { data, error, mutate } = useSWR(url, fetcher);

  return {
    accounts: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
}

export function useCompanyAssets(category?: string) {
  const url = category 
    ? `/api/finance/settings/assets?category=${category}`
    : '/api/finance/settings/assets';

  const { data, error, mutate } = useSWR(url, fetcher);

  return {
    assets: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
}

export function useFinanceSettingsCRUD(endpoint: string) {
  const { mutate } = useSWR(`/api/finance/settings/${endpoint}`, fetcher);

  const create = async (data: any) => {
    try {
      const response = await fetch(`/api/finance/settings/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Data berhasil ditambahkan');
        mutate();
        return { success: true, data: result.data };
      } else {
        toast.error(result.error || 'Gagal menambahkan data');
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      toast.error('Terjadi kesalahan saat menambahkan data');
      return { success: false, error: error.message };
    }
  };

  const update = async (data: any) => {
    try {
      const response = await fetch(`/api/finance/settings/${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Data berhasil diperbarui');
        mutate();
        return { success: true, data: result.data };
      } else {
        toast.error(result.error || 'Gagal memperbarui data');
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      toast.error('Terjadi kesalahan saat memperbarui data');
      return { success: false, error: error.message };
    }
  };

  const remove = async (id: number) => {
    try {
      const response = await fetch(`/api/finance/settings/${endpoint}?id=${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Data berhasil dihapus');
        mutate();
        return { success: true };
      } else {
        toast.error(result.error || 'Gagal menghapus data');
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      toast.error('Terjadi kesalahan saat menghapus data');
      return { success: false, error: error.message };
    }
  };

  return { create, update, remove };
}
