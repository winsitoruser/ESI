import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface LoyaltyProgram {
  id: string;
  programName: string;
  description?: string;
  isActive: boolean;
  pointsPerRupiah: number;
  minimumPurchase: number;
  pointsExpiry: number;
  autoEnroll: boolean;
  startDate?: string;
  endDate?: string;
  tiers?: LoyaltyTier[];
  rewards?: LoyaltyReward[];
}

export interface LoyaltyTier {
  id: string;
  programId: string;
  tierName: string;
  tierLevel: number;
  minSpending: number;
  pointMultiplier: number;
  discountPercentage: number;
  benefits: string[];
  color?: string;
  isActive: boolean;
  memberCount?: number;
}

export interface LoyaltyReward {
  id: string;
  programId: string;
  rewardName: string;
  description?: string;
  pointsRequired: number;
  rewardType: 'discount' | 'product' | 'shipping' | 'voucher' | 'service';
  rewardValue?: number;
  productId?: string;
  quantity?: number;
  validityDays?: number;
  maxRedemptions?: number;
  currentRedemptions: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export interface CustomerLoyalty {
  id: string;
  customerId: string;
  programId: string;
  currentTierId?: string;
  totalPoints: number;
  availablePoints: number;
  lifetimePoints: number;
  totalSpending: number;
  enrollmentDate: string;
  lastActivityDate?: string;
  isActive: boolean;
  currentTier?: LoyaltyTier;
  program?: LoyaltyProgram;
}

export interface LoyaltyStatistics {
  totalMembers: number;
  activeMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  averagePointsPerMember: number;
}

export const useLoyalty = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Get loyalty programs with statistics
  const fetchPrograms = async (includeStats: boolean = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (includeStats) params.append('includeStats', 'true');

      const response = await fetch(`/api/loyalty/programs?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        return data;
      } else {
        throw new Error(data.error || 'Failed to fetch programs');
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

  // Update program settings
  const updateProgram = async (programData: Partial<LoyaltyProgram> & { id: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/loyalty/programs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(programData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Pengaturan program berhasil diperbarui'
        });
        return data.program;
      } else {
        throw new Error(data.error || 'Failed to update program');
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

  // Get tiers with member count
  const fetchTiers = async (programId: string, includeCount: boolean = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ programId });
      if (includeCount) params.append('includeCount', 'true');

      const response = await fetch(`/api/loyalty/tiers?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        return data.tiers;
      } else {
        throw new Error(data.error || 'Failed to fetch tiers');
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

  // Update tier
  const updateTier = async (tierData: Partial<LoyaltyTier> & { id: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/loyalty/tiers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tierData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Tier berhasil diperbarui'
        });
        return data.tier;
      } else {
        throw new Error(data.error || 'Failed to update tier');
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

  // Get rewards
  const fetchRewards = async (programId: string, isActive?: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ programId });
      if (isActive !== undefined) params.append('isActive', isActive.toString());

      const response = await fetch(`/api/loyalty/rewards?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        return data.rewards;
      } else {
        throw new Error(data.error || 'Failed to fetch rewards');
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

  // Create reward
  const createReward = async (rewardData: Partial<LoyaltyReward>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/loyalty/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rewardData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Reward berhasil dibuat'
        });
        return data.reward;
      } else {
        throw new Error(data.error || 'Failed to create reward');
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

  // Update reward
  const updateReward = async (rewardData: Partial<LoyaltyReward> & { id: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/loyalty/rewards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rewardData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Reward berhasil diperbarui'
        });
        return data.reward;
      } else {
        throw new Error(data.error || 'Failed to update reward');
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

  // Get customer loyalty info
  const fetchCustomerLoyalty = async (customerId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/loyalty/customers/${customerId}`);
      const data = await response.json();

      if (response.ok) {
        return data;
      } else {
        throw new Error(data.error || 'Failed to fetch customer loyalty');
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

  // Enroll customer in loyalty program
  const enrollCustomer = async (customerId: string, programId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/loyalty/customers/${customerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Pelanggan berhasil didaftarkan ke program loyalitas'
        });
        return data.customerLoyalty;
      } else {
        throw new Error(data.error || 'Failed to enroll customer');
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

  // Redeem reward
  const redeemReward = async (customerId: string, rewardId: string, processedBy?: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/loyalty/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, rewardId, processedBy })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `Reward berhasil ditukar. Kode: ${data.redemption.redemptionCode}`
        });
        return data;
      } else {
        throw new Error(data.error || 'Failed to redeem reward');
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

  // Earn points from POS transaction
  const earnPointsFromPOS = async (customerId: string, posTransactionId: string, totalAmount: number) => {
    setLoading(true);
    try {
      const response = await fetch('/api/loyalty/pos/earn-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, posTransactionId, totalAmount })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.tierUpgrade?.upgraded) {
          toast({
            title: '🎉 Selamat! Tier Naik!',
            description: `Anda naik ke tier ${data.tierUpgrade.newTier}! Poin yang didapat: ${data.pointsEarned}`
          });
        } else {
          toast({
            title: 'Poin Berhasil Didapat',
            description: `+${data.pointsEarned} poin. Saldo: ${data.newBalance} poin`
          });
        }
        return data;
      } else {
        throw new Error(data.error || 'Failed to earn points');
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
    loading,
    fetchPrograms,
    updateProgram,
    fetchTiers,
    updateTier,
    fetchRewards,
    createReward,
    updateReward,
    fetchCustomerLoyalty,
    enrollCustomer,
    redeemReward,
    earnPointsFromPOS
  };
};
