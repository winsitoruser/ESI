import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface Shift {
  id: string;
  shiftName: 'Pagi' | 'Siang' | 'Malam';
  shiftDate: string;
  startTime: string;
  endTime: string;
  openedBy: string;
  openedAt: string;
  closedBy?: string;
  closedAt?: string;
  initialCashAmount: number;
  finalCashAmount?: number;
  expectedCashAmount?: number;
  cashDifference?: number;
  totalSales: number;
  totalTransactions: number;
  status: 'open' | 'closed';
  notes?: string;
  opener?: {
    id: string;
    name: string;
    position: string;
  };
  closer?: {
    id: string;
    name: string;
    position: string;
  };
  handovers?: any[];
}

export const useShift = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Get all shifts
  const fetchShifts = async (filters?: {
    status?: string;
    date?: string;
    employeeId?: string;
    limit?: number;
    offset?: number;
  }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.date) params.append('date', filters.date);
      if (filters?.employeeId) params.append('employeeId', filters.employeeId);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`/api/pos/shifts?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setShifts(data.shifts);
        return data;
      } else {
        throw new Error(data.error || 'Failed to fetch shifts');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get current active shift
  const fetchCurrentShift = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/pos/shifts?status=open&date=${today}`);
      const data = await response.json();

      if (response.ok && data.shifts.length > 0) {
        setCurrentShift(data.shifts[0]);
        return data.shifts[0];
      } else {
        setCurrentShift(null);
        return null;
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Open new shift
  const openShift = async (shiftData: {
    shiftName: string;
    startTime: string;
    endTime: string;
    initialCashAmount: number;
    notes?: string;
    employeeId: string;
  }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/pos/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Shift Dibuka',
          description: `Shift ${shiftData.shiftName} berhasil dibuka`
        });
        setCurrentShift(data.shift);
        return data.shift;
      } else {
        throw new Error(data.error || 'Failed to open shift');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Close shift
  const closeShift = async (shiftId: string, closeData: {
    finalCashAmount: number;
    closedBy: string;
    notes?: string;
  }) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pos/shifts/${shiftId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(closeData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Shift Ditutup',
          description: 'Shift berhasil ditutup'
        });
        setCurrentShift(null);
        return data.shift;
      } else {
        throw new Error(data.error || 'Failed to close shift');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Handover shift
  const handoverShift = async (shiftId: string, handoverData: {
    handoverFrom: string;
    handoverTo: string;
    finalCashAmount: number;
    notes?: string;
  }) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pos/shifts/${shiftId}/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(handoverData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '✅ Pergantian Shift Berhasil!',
          description: `Serah terima shift telah dilakukan. Data serah terima telah tercatat dalam sistem.`,
          duration: 6000
        });
        return data.handover;
      } else {
        throw new Error(data.error || 'Failed to handover shift');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    shifts,
    currentShift,
    loading,
    fetchShifts,
    fetchCurrentShift,
    openShift,
    closeShift,
    handoverShift
  };
};
