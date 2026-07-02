import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Check, 
  X, 
  Star, 
  Zap, 
  Crown,
  ArrowRight,
  Info,
  CreditCard,
  Users,
  Package,
  Store,
  Receipt,
  ChefHat,
  Calendar,
  TrendingUp,
  Shield,
  Headphones
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingInterval: string;
  currency: string;
  trialDays: number;
  features: Record<string, boolean>;
  limits: Array<{
    metric: string;
    max: number;
    unit: string;
  }>;
  metadata: {
    badge?: string;
    isPopular?: boolean;
    targetAudience?: string;
    savings?: number;
  };
  formattedPrice: string;
  intervalDisplay: string;
}

const PlansPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const MOCK_PLANS: Plan[] = [
    { id: 'starter', name: 'Starter', description: 'Untuk bisnis kecil', price: 500000, billingInterval: 'monthly', currency: 'IDR', trialDays: 14, features: { pos: true, inventory: true, finance: false, hris: false }, limits: [{ metric: 'users', max: 5, unit: 'users' }, { metric: 'branches', max: 1, unit: 'branches' }], metadata: { targetAudience: 'UMKM' }, formattedPrice: 'Rp 500.000', intervalDisplay: '/bulan' },
    { id: 'business', name: 'Business', description: 'Untuk bisnis berkembang', price: 1500000, billingInterval: 'monthly', currency: 'IDR', trialDays: 14, features: { pos: true, inventory: true, finance: true, hris: false }, limits: [{ metric: 'users', max: 25, unit: 'users' }, { metric: 'branches', max: 10, unit: 'branches' }], metadata: { isPopular: true, badge: 'Popular', targetAudience: 'SME' }, formattedPrice: 'Rp 1.500.000', intervalDisplay: '/bulan' },
    { id: 'enterprise', name: 'Enterprise', description: 'Solusi lengkap enterprise', price: 2500000, billingInterval: 'monthly', currency: 'IDR', trialDays: 30, features: { pos: true, inventory: true, finance: true, hris: true }, limits: [{ metric: 'users', max: 200, unit: 'users' }, { metric: 'branches', max: 50, unit: 'branches' }], metadata: { badge: 'Best Value', targetAudience: 'Enterprise' }, formattedPrice: 'Rp 2.500.000', intervalDisplay: '/bulan' },
  ];
  const MOCK_CUR_SUB = { id: 'sub-1', status: 'active', plan: { id: 'enterprise', name: 'Enterprise' } };
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>(MOCK_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(MOCK_CUR_SUB);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/billing/plans');
      const result = await res.json();
      
      if (result.success) {
        setPlans(result.data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      setPlans(MOCK_PLANS);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const res = await fetch('/api/billing/subscription');
      const result = await res.json();
      
      if (result.success) {
        setCurrentSubscription(result.data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setCurrentSubscription(MOCK_CUR_SUB);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!session) {
      router.push('/auth/login');
      return;
    }

    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });

      const result = await res.json();

      if (result.success) {
        toast.success('Berhasil berlangganan!');
        router.push('/billing');
      } else {
        toast.error(result.error || 'Gagal berlangganan');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleUpgrade = async (planId: string, immediate: boolean = false) => {
    setUpgrading(true);
    
    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, immediate })
      });

      const result = await res.json();

      if (result.success) {
        toast.success(
          immediate 
            ? 'Upgrade akan diproses setelah pembayaran' 
            : 'Upgrade akan berlaku di periode berikutnya'
        );
        router.push('/billing');
      } else {
        toast.error(result.error || 'Gagal upgrade');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    } finally {
      setUpgrading(false);
    }
  };

  const getFeatureIcon = (feature: string) => {
    const iconMap: Record<string, any> = {
      pos: <Receipt className="w-4 h-4" />,
      inventory: <Package className="w-4 h-4" />,
      kitchen: <ChefHat className="w-4 h-4" />,
      tables: <Calendar className="w-4 h-4" />,
      reservations: <Calendar className="w-4 h-4" />,
      finance: <TrendingUp className="w-4 h-4" />,
      reports: <TrendingUp className="w-4 h-4" />,
      admin: <Shield className="w-4 h-4" />,
      support: <Headphones className="w-4 h-4" />
    };
    return iconMap[feature] || <Check className="w-4 h-4" />;
  };

  const getFeatureLabel = (feature: string) => {
    const labelMap: Record<string, string> = {
      pos: 'Point of Sale',
      inventory: 'Manajemen Inventori',
      kitchen: 'Kitchen Display System',
      tables: 'Manajemen Meja',
      reservations: 'Sistem Reservasi',
      finance: 'Keuangan',
      reports: 'Laporan & Analitik',
      admin: 'Panel Admin',
      support: 'Dukungan Pelanggan',
      api: 'API Access',
      custom_branding: 'Custom Branding'
    };
    return labelMap[feature] || feature;
  };

  const getLimitIcon = (metric: string) => {
    const iconMap: Record<string, any> = {
      users: <Users className="w-4 h-4" />,
      branches: <Store className="w-4 h-4" />,
      products: <Package className="w-4 h-4" />,
      transactions: <Receipt className="w-4 h-4" />
    };
    return iconMap[metric] || <Info className="w-4 h-4" />;
  };

  const getLimitLabel = (metric: string) => {
    const labelMap: Record<string, string> = {
      users: 'Pengguna',
      branches: 'Cabang',
      products: 'Produk',
      transactions: 'Transaksi/bulan'
    };
    return labelMap[metric] || metric;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Group plans by interval
  const monthlyPlans = plans.filter(p => p.billingInterval === 'monthly');
  const yearlyPlans = plans.filter(p => p.billingInterval === 'yearly');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Pilih Paket Anda</h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Pilih paket yang sesuai dengan kebutuhan bisnis Anda. Upgrade atau downgrade kapan saja.
          </p>
        </div>

        {/* Current Subscription Alert */}
        {currentSubscription && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-blue-600">
                    Paket saat ini: <span className="font-semibold">{currentSubscription.plan.name}</span>
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    Berlaku hingga {new Date(currentSubscription.currentPeriod.end).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/billing">
                    Kelola Subscription
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Tabs */}
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="monthly">Bulanan</TabsTrigger>
            <TabsTrigger value="yearly">
              Tahunan 
              <Badge variant="secondary" className="ml-2">Hemat 20%</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {monthlyPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  currentPlanId={currentSubscription?.plan.id}
                  onSubscribe={handleSubscribe}
                  onUpgrade={handleUpgrade}
                  upgrading={upgrading}
                  getFeatureIcon={getFeatureIcon}
                  getFeatureLabel={getFeatureLabel}
                  getLimitIcon={getLimitIcon}
                  getLimitLabel={getLimitLabel}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="yearly" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {yearlyPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  currentPlanId={currentSubscription?.plan.id}
                  onSubscribe={handleSubscribe}
                  onUpgrade={handleUpgrade}
                  upgrading={upgrading}
                  getFeatureIcon={getFeatureIcon}
                  getFeatureLabel={getFeatureLabel}
                  getLimitIcon={getLimitIcon}
                  getLimitLabel={getLimitLabel}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Feature Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Perbandingan Fitur</CardTitle>
            <CardDescription>
              Lihat perbandingan lengkap semua fitur yang tersedia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Fitur</th>
                    {monthlyPlans.map((plan) => (
                      <th key={plan.id} className="text-center py-3 px-4">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Features */}
                  {['pos', 'inventory', 'kitchen', 'tables', 'reservations', 'finance', 'reports', 'admin'].map((feature) => (
                    <tr key={feature} className="border-b">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getFeatureIcon(feature)}
                          <span>{getFeatureLabel(feature)}</span>
                        </div>
                      </td>
                      {monthlyPlans.map((plan) => (
                        <td key={plan.id} className="text-center py-3 px-4">
                          {plan.features[feature] ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Limits */}
                  <tr className="border-b">
                    <td colSpan={monthlyPlans.length + 1} className="py-3 px-4 font-semibold">
                      Batas Kuota
                    </td>
                  </tr>
                  {['users', 'branches', 'products', 'transactions'].map((metric) => (
                    <tr key={metric} className="border-b">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getLimitIcon(metric)}
                          <span>{getLimitLabel(metric)}</span>
                        </div>
                      </td>
                      {monthlyPlans.map((plan) => {
                        const limit = plan.limits.find(l => l.metric === metric);
                        return (
                          <td key={plan.id} className="text-center py-3 px-4">
                            {limit?.max === -1 ? (
                              <span className="text-green-600 font-semibold">∞</span>
                            ) : (
                              <span>{limit?.max || 0}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

// Plan Card Component
interface PlanCardProps {
  plan: Plan;
  currentPlanId?: string;
  onSubscribe: (planId: string) => void;
  onUpgrade: (planId: string, immediate?: boolean) => void;
  upgrading: boolean;
  getFeatureIcon: (feature: string) => any;
  getFeatureLabel: (feature: string) => string;
  getLimitIcon: (metric: string) => any;
  getLimitLabel: (metric: string) => string;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  currentPlanId,
  onSubscribe,
  onUpgrade,
  upgrading,
  getFeatureIcon,
  getFeatureLabel,
  getLimitIcon,
  getLimitLabel
}) => {
  const isCurrentPlan = currentPlanId === plan.id;
  const isUpgrade = currentPlanId && plan.price > (currentPlanId ? 0 : 0);

  return (
    <Card className={`relative ${plan.metadata?.isPopular ? 'border-primary shadow-lg' : ''}`}>
      {plan.metadata?.badge && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge variant="secondary" className="px-3 py-1">
            {plan.metadata.badge}
          </Badge>
        </div>
      )}
      
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-2">
          {plan.name.includes('Enterprise') ? (
            <Crown className="w-8 h-8 text-yellow-500" />
          ) : plan.name.includes('Professional') ? (
            <Zap className="w-8 h-8 text-blue-500" />
          ) : (
            <Star className="w-8 h-8 text-gray-400" />
          )}
        </div>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
        <div className="mt-4">
          <span className="text-3xl font-bold">{plan.formattedPrice}</span>
          <span className="text-gray-500">/{plan.intervalDisplay}</span>
        </div>
        {plan.metadata?.savings && (
          <p className="text-sm text-green-600 mt-1">
            Hemat {plan.metadata.savings}% dibanding bulanan
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Limits */}
        <div className="space-y-2">
          {plan.limits.slice(0, 3).map((limit) => (
            <div key={limit.metric} className="flex justify-between text-sm">
              <span className="flex items-center gap-1">
                {getLimitIcon(limit.metric)}
                {getLimitLabel(limit.metric)}
              </span>
              <span className="font-semibold">
                {limit.max === -1 ? '∞' : limit.max}
              </span>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="space-y-2">
          {Object.entries(plan.features)
            .filter(([_, enabled]) => enabled)
            .slice(0, 5)
            .map(([feature]) => (
              <div key={feature} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>{getFeatureLabel(feature)}</span>
              </div>
            ))}
        </div>

        {/* CTA Button */}
        <div className="pt-4">
          {isCurrentPlan ? (
            <Button variant="outline" className="w-full" disabled>
              Paket Saat Ini
            </Button>
          ) : currentPlanId ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full">
                  {isUpgrade ? 'Upgrade' : 'Downgrade'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {isUpgrade ? 'Upgrade' : 'Downgrade'} ke {plan.name}
                  </DialogTitle>
                  <DialogDescription>
                    {isUpgrade 
                      ? 'Upgrade akan memberikan Anda akses ke lebih banyak fitur dan batas yang lebih tinggi.'
                      : 'Downgrade akan membatasi beberapa fitur dan mengurangi batas kuota.'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-semibold mb-2">Detail Perubahan:</p>
                    <p className="text-sm">
                      Harga baru: {plan.formattedPrice}/{plan.intervalDisplay}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {isUpgrade 
                        ? 'Biaya akan diproses secara prorata untuk sisa periode ini'
                        : 'Perubahan akan berlaku di periode penagihan berikutnya'
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => onUpgrade(plan.id, false)}
                      disabled={upgrading}
                    >
                      Berlaku Periode Depan
                    </Button>
                    {isUpgrade && (
                      <Button 
                        className="flex-1"
                        onClick={() => onUpgrade(plan.id, true)}
                        disabled={upgrading}
                      >
                        Upgrade Sekarang
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button 
              className="w-full" 
              onClick={() => onSubscribe(plan.id)}
            >
              Mulai Berlangganan
            </Button>
          )}
        </div>

        {/* Trial Info */}
        {plan.trialDays > 0 && !currentPlanId && (
          <p className="text-xs text-center text-gray-500">
            Coba gratis {plan.trialDays} hari
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PlansPage;
