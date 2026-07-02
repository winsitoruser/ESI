import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  FaStar, FaGift, FaTrophy, FaUsers, FaChartLine,
  FaPlus, FaEdit, FaTrash, FaSearch, FaDownload,
  FaMedal, FaCrown, FaAward, FaCoins, FaSpinner
} from 'react-icons/fa';

interface Tier {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  benefits: string[];
  members: number;
  color: string;
  pointMultiplier?: number;
  discountPercentage?: number;
}

interface Member {
  id: string;
  name: string;
  email: string;
  tier: string;
  points: number;
  totalSpent: number;
  transactions: number;
}

interface Reward {
  id: string;
  name: string;
  points: number;
  stock: number;
  claimed: number;
  type: string;
  value?: number;
  description?: string;
}

interface Stats {
  totalMembers: number;
  pointsRedeemedThisMonth: number;
  rewardsClaimed: number;
  engagementRate: number;
}

const LoyaltyProgramPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // State for data from API
  const MOCK_LOYALTY_TIERS: Tier[] = [
    { id: 't1', name: 'Bronze', minPoints: 0, maxPoints: 999, benefits: ['Diskon 5%', 'Poin 1x'], members: 320, color: 'bg-orange-500', pointMultiplier: 1, discountPercentage: 5 },
    { id: 't2', name: 'Silver', minPoints: 1000, maxPoints: 4999, benefits: ['Diskon 10%', 'Poin 1.5x', 'Free delivery'], members: 145, color: 'bg-gray-400', pointMultiplier: 1.5, discountPercentage: 10 },
    { id: 't3', name: 'Gold', minPoints: 5000, maxPoints: null, benefits: ['Diskon 15%', 'Poin 2x', 'Free delivery', 'Priority service'], members: 42, color: 'bg-yellow-500', pointMultiplier: 2, discountPercentage: 15 },
  ];
  const MOCK_LOYALTY_MEMBERS: Member[] = [
    { id: 'm1', name: 'Budi Santoso', email: 'budi@email.com', tier: 'Gold', points: 8500, totalSpent: 25000000, transactions: 85 },
    { id: 'm2', name: 'Siti Rahayu', email: 'siti@email.com', tier: 'Silver', points: 3200, totalSpent: 12000000, transactions: 52 },
    { id: 'm3', name: 'Ahmad Wijaya', email: 'ahmad@email.com', tier: 'Silver', points: 2800, totalSpent: 9500000, transactions: 38 },
  ];
  const MOCK_LOYALTY_REWARDS: Reward[] = [
    { id: 'rw1', name: 'Voucher Rp 50.000', points: 500, stock: 100, claimed: 45, type: 'voucher', value: 50000, description: 'Voucher belanja' },
    { id: 'rw2', name: 'Free Delivery', points: 200, stock: 200, claimed: 120, type: 'benefit', description: 'Gratis ongkir' },
  ];
  const MOCK_LOYALTY_STATS: Stats = { totalMembers: 507, pointsRedeemedThisMonth: 45000, rewardsClaimed: 165, engagementRate: 72 };
  const [tiers, setTiers] = useState<Tier[]>(MOCK_LOYALTY_TIERS);
  const [topMembers, setTopMembers] = useState<Member[]>(MOCK_LOYALTY_MEMBERS);
  const [rewards, setRewards] = useState<Reward[]>(MOCK_LOYALTY_REWARDS);
  const [stats, setStats] = useState<Stats>(MOCK_LOYALTY_STATS);

  // Modal states
  const [showTierModal, setShowTierModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  
  // Form states
  const [tierFormData, setTierFormData] = useState({
    tierName: '',
    tierLevel: 1,
    minSpending: 0,
    pointMultiplier: 1.0,
    discountPercentage: 0,
    benefits: [''],
    color: 'bg-gray-500'
  });
  
  const [rewardFormData, setRewardFormData] = useState({
    name: '',
    description: '',
    points: 0,
    stock: 0,
    type: 'voucher',
    value: 0
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetchDashboardData();
    }
  }, [session]);

  useEffect(() => {
    if (session && activeTab === 'rewards') {
      fetchRewards();
    }
  }, [session, activeTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/loyalty/dashboard');
      const data = await response.json();

      if (data.success) {
        setStats(data.data.stats);
        setTiers(data.data.tiers);
        setTopMembers(data.data.topMembers);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setStats(MOCK_LOYALTY_STATS);
      setTiers(MOCK_LOYALTY_TIERS);
      setTopMembers(MOCK_LOYALTY_MEMBERS);
    } finally {
      setLoading(false);
    }
  };

  const fetchRewards = async () => {
    try {
      const response = await fetch('/api/loyalty/rewards/crud');
      const data = await response.json();

      if (data.success) {
        setRewards(data.data);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
      setRewards(MOCK_LOYALTY_REWARDS);
    }
  };

  const handleAddTier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/loyalty/tiers/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tierFormData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Tier berhasil ditambahkan!');
        setShowTierModal(false);
        resetTierForm();
        fetchDashboardData();
      } else {
        alert(data.error || 'Gagal menambah tier');
      }
    } catch (error) {
      console.error('Error adding tier:', error);
      alert('Terjadi kesalahan saat menambah tier');
    }
  };

  const handleEditTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier) return;

    try {
      const response = await fetch(`/api/loyalty/tiers/crud?id=${selectedTier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tierFormData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Tier berhasil diupdate!');
        setShowTierModal(false);
        setSelectedTier(null);
        resetTierForm();
        fetchDashboardData();
      } else {
        alert(data.error || 'Gagal mengupdate tier');
      }
    } catch (error) {
      console.error('Error updating tier:', error);
      alert('Terjadi kesalahan saat mengupdate tier');
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tier ini?')) return;

    try {
      const response = await fetch(`/api/loyalty/tiers/crud?id=${tierId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('Tier berhasil dihapus!');
        fetchDashboardData();
      } else {
        alert(data.error || 'Gagal menghapus tier');
      }
    } catch (error) {
      console.error('Error deleting tier:', error);
      alert('Terjadi kesalahan saat menghapus tier');
    }
  };

  const openAddTierModal = () => {
    resetTierForm();
    setSelectedTier(null);
    setShowTierModal(true);
  };

  const openEditTierModal = (tier: Tier) => {
    setSelectedTier(tier);
    setTierFormData({
      tierName: tier.name,
      tierLevel: tiers.findIndex(t => t.id === tier.id) + 1,
      minSpending: tier.minPoints,
      pointMultiplier: tier.pointMultiplier || 1.0,
      discountPercentage: tier.discountPercentage || 0,
      benefits: tier.benefits,
      color: tier.color
    });
    setShowTierModal(true);
  };

  const resetTierForm = () => {
    setTierFormData({
      tierName: '',
      tierLevel: tiers.length + 1,
      minSpending: 0,
      pointMultiplier: 1.0,
      discountPercentage: 0,
      benefits: [''],
      color: 'bg-gray-500'
    });
  };

  const addBenefit = () => {
    setTierFormData({
      ...tierFormData,
      benefits: [...tierFormData.benefits, '']
    });
  };

  const updateBenefit = (index: number, value: string) => {
    const newBenefits = [...tierFormData.benefits];
    newBenefits[index] = value;
    setTierFormData({
      ...tierFormData,
      benefits: newBenefits
    });
  };

  const removeBenefit = (index: number) => {
    const newBenefits = tierFormData.benefits.filter((_, i) => i !== index);
    setTierFormData({
      ...tierFormData,
      benefits: newBenefits
    });
  };

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/loyalty/rewards/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rewardFormData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Reward berhasil ditambahkan!');
        setShowRewardModal(false);
        resetRewardForm();
        fetchRewards();
      } else {
        alert(data.error || 'Gagal menambah reward');
      }
    } catch (error) {
      console.error('Error adding reward:', error);
      alert('Terjadi kesalahan saat menambah reward');
    }
  };

  const handleEditReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReward) return;

    try {
      const response = await fetch(`/api/loyalty/rewards/crud?id=${selectedReward.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rewardFormData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Reward berhasil diupdate!');
        setShowRewardModal(false);
        setSelectedReward(null);
        resetRewardForm();
        fetchRewards();
      } else {
        alert(data.error || 'Gagal mengupdate reward');
      }
    } catch (error) {
      console.error('Error updating reward:', error);
      alert('Terjadi kesalahan saat mengupdate reward');
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus reward ini?')) return;

    try {
      const response = await fetch(`/api/loyalty/rewards/crud?id=${rewardId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('Reward berhasil dihapus!');
        fetchRewards();
      } else {
        alert(data.error || 'Gagal menghapus reward');
      }
    } catch (error) {
      console.error('Error deleting reward:', error);
      alert('Terjadi kesalahan saat menghapus reward');
    }
  };

  const openAddRewardModal = () => {
    resetRewardForm();
    setSelectedReward(null);
    setShowRewardModal(true);
  };

  const openEditRewardModal = (reward: Reward) => {
    setSelectedReward(reward);
    setRewardFormData({
      name: reward.name,
      description: reward.description || '',
      points: reward.points,
      stock: reward.stock,
      type: reward.type,
      value: reward.value || 0
    });
    setShowRewardModal(true);
  };

  const resetRewardForm = () => {
    setRewardFormData({
      name: '',
      description: '',
      points: 0,
      stock: 0,
      type: 'voucher',
      value: 0
    });
  };

  const statsDisplay = [
    { label: 'Total Anggota', value: stats.totalMembers.toLocaleString(), icon: FaUsers, color: 'bg-blue-500', change: '+12%' },
    { label: 'Poin Ditukar Bulan Ini', value: stats.pointsRedeemedThisMonth.toLocaleString(), icon: FaCoins, color: 'bg-green-500', change: '+8%' },
    { label: 'Hadiah Diklaim', value: stats.rewardsClaimed.toLocaleString(), icon: FaGift, color: 'bg-purple-500', change: '+15%' },
    { label: 'Tingkat Keterlibatan', value: `${stats.engagementRate}%`, icon: FaChartLine, color: 'bg-orange-500', change: '+5%' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTierIcon = (tier: string) => {
    switch(tier) {
      case 'Bronze': return FaMedal;
      case 'Silver': return FaAward;
      case 'Gold': return FaTrophy;
      case 'Platinum': return FaCrown;
      default: return FaStar;
    }
  };

  const getTierColor = (tier: string) => {
    switch(tier) {
      case 'Bronze': return 'text-orange-600';
      case 'Silver': return 'text-gray-500';
      case 'Gold': return 'text-yellow-500';
      case 'Platinum': return 'text-purple-600';
      default: return 'text-gray-400';
    }
  };

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-orange-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Loyalty Program | BEDAGANG</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center">
                <FaStar className="mr-3 h-6 w-6" />
                Loyalty Program
              </h1>
              <p className="text-orange-50 mt-1 text-sm">
                Kelola program loyalitas dan reward pelanggan
              </p>
            </div>
            <Button className="bg-white text-orange-600 hover:bg-orange-50">
              <FaPlus className="mr-2 h-4 w-4" />
              Tambah Reward
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-4 flex justify-center py-8">
              <FaSpinner className="animate-spin text-orange-600 text-3xl" />
            </div>
          ) : (
            statsDisplay.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-medium text-green-600">{stat.change}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
            <TabsTrigger 
              value="overview"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white"
            >
              <FaChartLine className="mr-2 h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger 
              value="tiers"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white"
            >
              <FaTrophy className="mr-2 h-4 w-4" /> Tier
            </TabsTrigger>
            <TabsTrigger 
              value="rewards"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white"
            >
              <FaGift className="mr-2 h-4 w-4" /> Rewards
            </TabsTrigger>
            <TabsTrigger 
              value="members"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white"
            >
              <FaUsers className="mr-2 h-4 w-4" /> Members
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tier Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribusi Member per Tier</CardTitle>
                  <CardDescription>Jumlah member di setiap tier</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tiers.map((tier) => {
                      const Icon = getTierIcon(tier.name);
                      const totalMembers = tiers.reduce((sum, t) => sum + t.members, 0);
                      const percentage = (tier.members / totalMembers) * 100;
                      
                      return (
                        <div key={tier.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Icon className={`h-5 w-5 ${getTierColor(tier.name)}`} />
                              <span className="font-medium">{tier.name}</span>
                            </div>
                            <span className="text-sm text-gray-600">{tier.members} member</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Top Members */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Member</CardTitle>
                  <CardDescription>Member dengan poin tertinggi</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topMembers.map((member, index) => {
                      const Icon = getTierIcon(member.tier);
                      return (
                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full text-orange-600 font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-1">
                              <Icon className={`h-4 w-4 ${getTierColor(member.tier)}`} />
                              <span className="text-sm font-medium">{member.points.toLocaleString()} pts</span>
                            </div>
                            <p className="text-xs text-gray-500">{member.transactions} transaksi</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tiers Tab */}
          <TabsContent value="tiers" className="mt-0">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tier Membership</CardTitle>
                    <CardDescription>Kelola tier dan benefit program loyalitas</CardDescription>
                  </div>
                  <Button onClick={openAddTierModal}>
                    <FaPlus className="mr-2 h-4 w-4" />
                    Tambah Tier
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tiers.map((tier) => {
                    const Icon = getTierIcon(tier.name);
                    return (
                      <Card key={tier.id} className="border-2">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`${tier.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold">{tier.name}</h3>
                                <p className="text-sm text-gray-600">
                                  {tier.minPoints.toLocaleString()} - {tier.maxPoints ? tier.maxPoints.toLocaleString() : '∞'} poin
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditTierModal(tier)}>
                                <FaEdit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteTier(tier.id)}>
                                <FaTrash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <p className="text-sm font-medium text-gray-700">Benefit:</p>
                            <ul className="space-y-1">
                              {tier.benefits.map((benefit, idx) => (
                                <li key={idx} className="text-sm text-gray-600 flex items-center">
                                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></span>
                                  {benefit}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="pt-4 border-t">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Total Member</span>
                              <span className="font-bold text-gray-900">{tier.members.toLocaleString()}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="mt-0">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Katalog Reward</CardTitle>
                    <CardDescription>Kelola reward yang dapat ditukar dengan poin</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <FaDownload className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                    <Button onClick={openAddRewardModal}>
                      <FaPlus className="mr-2 h-4 w-4" />
                      Tambah Reward
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Reward</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Poin Dibutuhkan</TableHead>
                        <TableHead>Stok</TableHead>
                        <TableHead>Diklaim</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rewards.map((reward) => (
                        <TableRow key={reward.id}>
                          <TableCell className="font-medium">{reward.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {reward.type === 'voucher' ? 'Voucher' : 
                               reward.type === 'product' ? 'Produk' : 'Merchandise'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <FaCoins className="h-4 w-4 text-orange-500" />
                              <span className="font-medium">{reward.points.toLocaleString()}</span>
                            </div>
                          </TableCell>
                          <TableCell>{reward.stock}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">{reward.claimed} / {reward.stock}</div>
                              <Progress value={(reward.claimed / reward.stock) * 100} className="h-1.5" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={reward.stock > reward.claimed ? 'default' : 'secondary'}>
                              {reward.stock > reward.claimed ? 'Tersedia' : 'Habis'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => openEditRewardModal(reward)}>
                                <FaEdit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteReward(reward.id)}>
                                <FaTrash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-0">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Daftar Member</CardTitle>
                    <CardDescription>Kelola member program loyalitas</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <FaDownload className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
                <div className="mt-4">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Cari member..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Poin</TableHead>
                        <TableHead>Total Belanja</TableHead>
                        <TableHead>Transaksi</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topMembers.map((member) => {
                        const Icon = getTierIcon(member.tier);
                        return (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="text-sm text-gray-500">{member.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Icon className={`h-5 w-5 ${getTierColor(member.tier)}`} />
                                <span className="font-medium">{member.tier}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <FaCoins className="h-4 w-4 text-orange-500" />
                                <span className="font-medium">{member.points.toLocaleString()}</span>
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(member.totalSpent)}</TableCell>
                            <TableCell>{member.transactions}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <FaEdit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Tier Modal */}
        {showTierModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">
                {selectedTier ? 'Ubah Tingkatan' : 'Tambah Tingkatan Baru'}
              </h3>
              <form onSubmit={selectedTier ? handleEditTier : handleAddTier}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Tier *</label>
                      <input
                        type="text"
                        required
                        value={tierFormData.tierName}
                        onChange={(e) => setTierFormData({...tierFormData, tierName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        placeholder="e.g., Diamond"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Level Tier *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={tierFormData.tierLevel}
                        onChange={(e) => setTierFormData({...tierFormData, tierLevel: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Spending (Rp) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={tierFormData.minSpending}
                      onChange={(e) => setTierFormData({...tierFormData, minSpending: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      placeholder="e.g., 50000000"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Point Multiplier *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.1"
                        value={tierFormData.pointMultiplier}
                        onChange={(e) => setTierFormData({...tierFormData, pointMultiplier: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        placeholder="e.g., 5.0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="100"
                        step="0.1"
                        value={tierFormData.discountPercentage}
                        onChange={(e) => setTierFormData({...tierFormData, discountPercentage: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        placeholder="e.g., 30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warna Badge</label>
                    <select
                      value={tierFormData.color}
                      onChange={(e) => setTierFormData({...tierFormData, color: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="bg-orange-600">Orange</option>
                      <option value="bg-gray-400">Silver</option>
                      <option value="bg-yellow-500">Gold</option>
                      <option value="bg-purple-600">Purple</option>
                      <option value="bg-blue-600">Blue</option>
                      <option value="bg-green-600">Green</option>
                      <option value="bg-red-600">Red</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Benefits</label>
                    <div className="space-y-2">
                      {tierFormData.benefits.map((benefit, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={benefit}
                            onChange={(e) => updateBenefit(index, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                            placeholder="e.g., Diskon 30%"
                          />
                          {tierFormData.benefits.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeBenefit(index)}
                              className="text-red-600"
                            >
                              <FaTrash />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addBenefit}
                        className="w-full"
                      >
                        <FaPlus className="mr-2 h-4 w-4" />
                        Tambah Benefit
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowTierModal(false); setSelectedTier(null); resetTierForm(); }}
                    className="flex-1"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    {selectedTier ? 'Update' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add/Edit Reward Modal */}
        {showRewardModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">
                {selectedReward ? 'Ubah Hadiah' : 'Tambah Hadiah Baru'}
              </h3>
              <form onSubmit={selectedReward ? handleEditReward : handleAddReward}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Reward *</label>
                    <input
                      type="text"
                      required
                      value={rewardFormData.name}
                      onChange={(e) => setRewardFormData({...rewardFormData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      placeholder="e.g., Voucher Rp 500.000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                    <textarea
                      value={rewardFormData.description}
                      onChange={(e) => setRewardFormData({...rewardFormData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Deskripsi reward"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Reward *</label>
                    <select
                      value={rewardFormData.type}
                      onChange={(e) => setRewardFormData({...rewardFormData, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="voucher">Voucher</option>
                      <option value="product">Produk</option>
                      <option value="discount">Diskon</option>
                      <option value="merchandise">Merchandise</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Poin Dibutuhkan *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={rewardFormData.points}
                        onChange={(e) => setRewardFormData({...rewardFormData, points: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        placeholder="e.g., 5000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stok *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={rewardFormData.stock}
                        onChange={(e) => setRewardFormData({...rewardFormData, stock: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        placeholder="e.g., 100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nilai (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={rewardFormData.value}
                      onChange={(e) => setRewardFormData({...rewardFormData, value: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      placeholder="e.g., 500000"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Nilai reward dalam rupiah (untuk voucher/diskon)
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowRewardModal(false); setSelectedReward(null); resetRewardForm(); }}
                    className="flex-1"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    {selectedReward ? 'Update' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LoyaltyProgramPage;
