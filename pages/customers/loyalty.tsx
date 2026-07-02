import React, { useState } from 'react';
import { useRouter } from 'next/router';
import CustomersLayout from '@/components/customers/CustomersLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { 
  FaPlus, FaCrown, FaCoins, FaExchangeAlt, FaCog, FaGift, 
  FaStar, FaChartLine, FaUsers, FaEdit, FaTrash, FaSave,
  FaPercentage, FaTrophy, FaMedal, FaAward, FaCheckCircle
} from 'react-icons/fa';

const CustomerLoyaltyPage: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Program Settings State
  const [programSettings, setProgramSettings] = useState({
    programName: 'FARMANESIA Loyalty Program',
    isActive: true,
    pointsPerRupiah: 1,
    minimumPurchase: 10000,
    pointsExpiry: 365,
    autoEnroll: true
  });

  // Tier Settings State
  const [tiers, setTiers] = useState([
    {
      id: '1',
      name: 'Bronze',
      minSpending: 0,
      pointMultiplier: 1.0,
      discount: 0,
      color: 'from-amber-700 to-amber-500',
      benefits: ['Poin untuk setiap pembelian', 'Penukaran hadiah dasar']
    },
    {
      id: '2',
      name: 'Silver',
      minSpending: 2000000,
      pointMultiplier: 1.2,
      discount: 5,
      color: 'from-gray-400 to-gray-300',
      benefits: ['Poin 1.2x untuk setiap pembelian', 'Diskon 5% untuk produk tertentu']
    },
    {
      id: '3',
      name: 'Gold',
      minSpending: 4000000,
      pointMultiplier: 1.5,
      discount: 10,
      color: 'from-yellow-600 to-yellow-400',
      benefits: ['Poin 1.5x untuk setiap pembelian', 'Diskon 10% untuk produk tertentu', 'Konsultasi farmasi gratis']
    },
    {
      id: '4',
      name: 'Platinum',
      minSpending: 8000000,
      pointMultiplier: 2.0,
      discount: 15,
      color: 'from-gray-600 to-gray-400',
      benefits: ['Poin 2x untuk setiap pembelian', 'Diskon 15% untuk produk tertentu', 'Pengiriman gratis & Layanan VIP']
    }
  ]);

  // Rewards State
  const [rewards, setRewards] = useState([
    { id: '1', name: 'Diskon Rp 50.000', pointsRequired: 500, type: 'discount', value: 50000, isActive: true },
    { id: '2', name: 'Diskon Rp 100.000', pointsRequired: 1000, type: 'discount', value: 100000, isActive: true },
    { id: '3', name: 'Gratis Ongkir', pointsRequired: 300, type: 'shipping', value: 0, isActive: true },
    { id: '4', name: 'Produk Gratis', pointsRequired: 2000, type: 'product', value: 0, isActive: true }
  ]);

  // Statistics State
  const [statistics, setStatistics] = useState({
    totalMembers: 1250,
    activeMembers: 980,
    totalPointsIssued: 125000,
    totalPointsRedeemed: 45000,
    averagePointsPerMember: 100,
    topTier: 'Gold'
  });

  const handleSaveSettings = () => {
    toast({
      title: 'Pengaturan Disimpan',
      description: 'Pengaturan program loyalitas berhasil diperbarui'
    });
  };

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <CustomersLayout title="Program Loyalitas | FARMANESIA-EVO">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Program Loyalitas</h1>
            <p className="text-gray-500">Kelola program loyalitas dan reward pelanggan</p>
          </div>
          <Badge className={`px-3 py-1 ${programSettings.isActive ? 'bg-green-600' : 'bg-gray-400'}`}>
            {programSettings.isActive ? 'Aktif' : 'Nonaktif'}
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <FaChartLine className="mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="settings">
              <FaCog className="mr-2" />
              Pengaturan
            </TabsTrigger>
            <TabsTrigger value="tiers">
              <FaTrophy className="mr-2" />
              Tier Member
            </TabsTrigger>
            <TabsTrigger value="rewards">
              <FaGift className="mr-2" />
              Rewards
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Member</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{statistics.totalMembers.toLocaleString()}</p>
                      <p className="text-xs text-green-600 mt-1">
                        <FaUsers className="inline mr-1" />
                        {statistics.activeMembers} aktif
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <FaUsers className="text-blue-600 text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Poin Diterbitkan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{statistics.totalPointsIssued.toLocaleString()}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {statistics.totalPointsRedeemed.toLocaleString()} ditukar
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <FaCoins className="text-green-600 text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Rata-rata Poin/Member</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{statistics.averagePointsPerMember}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Tier terbanyak: {statistics.topTier}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <FaStar className="text-orange-600 text-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tier Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribusi Tier Member</CardTitle>
                <CardDescription>Jumlah member di setiap tier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {tiers.map((tier) => (
                    <div key={tier.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className={`w-full h-2 bg-gradient-to-r ${tier.color} rounded-full mb-3`}></div>
                      <h3 className="font-semibold text-gray-900">{tier.name}</h3>
                      <p className="text-2xl font-bold text-gray-800 mt-2">
                        {Math.floor(statistics.totalMembers / tiers.length)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">member</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pengaturan Program</CardTitle>
                <CardDescription>Konfigurasi dasar program loyalitas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="programName">Nama Program</Label>
                    <Input
                      id="programName"
                      value={programSettings.programName}
                      onChange={(e) => setProgramSettings({...programSettings, programName: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pointsPerRupiah">Poin per Rupiah</Label>
                    <Input
                      id="pointsPerRupiah"
                      type="number"
                      value={programSettings.pointsPerRupiah}
                      onChange={(e) => setProgramSettings({...programSettings, pointsPerRupiah: parseInt(e.target.value)})}
                    />
                    <p className="text-xs text-gray-500">Setiap Rp 1 = {programSettings.pointsPerRupiah} poin</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minimumPurchase">Minimum Pembelian</Label>
                    <Input
                      id="minimumPurchase"
                      type="number"
                      value={programSettings.minimumPurchase}
                      onChange={(e) => setProgramSettings({...programSettings, minimumPurchase: parseInt(e.target.value)})}
                    />
                    <p className="text-xs text-gray-500">{formatIDR(programSettings.minimumPurchase)}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pointsExpiry">Masa Berlaku Poin (hari)</Label>
                    <Input
                      id="pointsExpiry"
                      type="number"
                      value={programSettings.pointsExpiry}
                      onChange={(e) => setProgramSettings({...programSettings, pointsExpiry: parseInt(e.target.value)})}
                    />
                    <p className="text-xs text-gray-500">{programSettings.pointsExpiry} hari ({Math.floor(programSettings.pointsExpiry / 30)} bulan)</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="isActive" className="text-base">Status Program</Label>
                    <p className="text-sm text-gray-500">Aktifkan atau nonaktifkan program loyalitas</p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={programSettings.isActive}
                    onCheckedChange={(checked) => setProgramSettings({...programSettings, isActive: checked})}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="autoEnroll" className="text-base">Auto Enroll</Label>
                    <p className="text-sm text-gray-500">Otomatis daftarkan pelanggan baru ke program</p>
                  </div>
                  <Switch
                    id="autoEnroll"
                    checked={programSettings.autoEnroll}
                    onCheckedChange={(checked) => setProgramSettings({...programSettings, autoEnroll: checked})}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} className="bg-gradient-to-r from-red-600 to-orange-500">
                    <FaSave className="mr-2" />
                    Simpan Pengaturan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tiers Tab */}
          <TabsContent value="tiers" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tiers.map((tier) => (
                <Card key={tier.id}>
                  <CardHeader className={`bg-gradient-to-r ${tier.color} text-white`}>
                    <CardTitle className="flex items-center justify-between">
                      <span>{tier.name}</span>
                      <FaCrown />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-500">Min. Belanja</Label>
                        <p className="font-semibold">{formatIDR(tier.minSpending)}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Multiplier Poin</Label>
                        <p className="font-semibold">{tier.pointMultiplier}x</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Diskon</Label>
                        <p className="font-semibold">{tier.discount}%</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Total Member</Label>
                        <p className="font-semibold">{Math.floor(statistics.totalMembers / tiers.length)}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-2 block">Benefit</Label>
                      <ul className="space-y-1">
                        {tier.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-start text-sm">
                            <FaCheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <FaEdit className="mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Daftar Reward</h3>
                <p className="text-sm text-gray-500">Kelola reward yang dapat ditukar dengan poin</p>
              </div>
              <Button className="bg-gradient-to-r from-red-600 to-orange-500">
                <FaPlus className="mr-2" />
                Tambah Reward
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((reward) => (
                <Card key={reward.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{reward.name}</CardTitle>
                        <CardDescription className="mt-1">
                          <FaCoins className="inline mr-1" />
                          {reward.pointsRequired} poin
                        </CardDescription>
                      </div>
                      <Badge variant={reward.isActive ? "default" : "secondary"}>
                        {reward.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-500">Tipe Reward</Label>
                        <p className="font-medium capitalize">{reward.type}</p>
                      </div>
                      {reward.value > 0 && (
                        <div>
                          <Label className="text-xs text-gray-500">Nilai</Label>
                          <p className="font-medium">{formatIDR(reward.value)}</p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <FaEdit className="mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <FaTrash />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </CustomersLayout>
  );
};

export default CustomerLoyaltyPage;
