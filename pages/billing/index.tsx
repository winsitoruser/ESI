import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Users,
  Package,
  Store,
  Receipt,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  Download
} from 'lucide-react';
import Link from 'next/link';

interface SubscriptionData {
  subscription: {
    id: string;
    status: string;
    plan: {
      id: string;
      name: string;
      description: string;
      price: number;
      billingInterval: string;
      currency: string;
      features: Record<string, boolean>;
    };
    currentPeriod: {
      start: string;
      end: string;
    };
    trial: {
      isActive: boolean;
      endsAt: string;
      daysLeft: number;
    };
    renewal: {
      daysLeft: number;
      cancelAtPeriodEnd: boolean;
    };
    isOverdue: boolean;
  };
  usage: Array<{
    metric: string;
    current: number;
    limit: number | null;
    percentage: number;
  }>;
  billing: {
    lastBillingCycle: any;
    nextBillingDate: string;
  };
}

const BillingPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const MOCK_SUB: SubscriptionData = { subscription: { id: 'sub-1', status: 'active', plan: { id: 'plan-enterprise', name: 'Enterprise', description: 'Paket bisnis lengkap', price: 2500000, billingInterval: 'monthly', currency: 'IDR', features: { pos: true, inventory: true, finance: true, hris: true } }, currentPeriod: { start: '2026-03-01', end: '2026-03-31' }, trial: { isActive: false, endsAt: '', daysLeft: 0 }, renewal: { daysLeft: 16, cancelAtPeriodEnd: false }, isOverdue: false }, usage: [{ metric: 'users', current: 45, limit: 200, percentage: 22.5 }, { metric: 'branches', current: 6, limit: 50, percentage: 12 }, { metric: 'products', current: 2450, limit: 10000, percentage: 24.5 }, { metric: 'transactions', current: 18420, limit: 100000, percentage: 18.4 }], billing: { lastBillingCycle: { amount: 2500000, date: '2026-03-01' }, nextBillingDate: '2026-04-01' } };
  const MOCK_INVOICES = [{ id: 'inv1', number: 'INV-2026-03', amount: 2500000, status: 'paid', date: '2026-03-01', paidAt: '2026-03-03' }, { id: 'inv2', number: 'INV-2026-02', amount: 2500000, status: 'paid', date: '2026-02-01', paidAt: '2026-02-05' }];
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SubscriptionData | null>(MOCK_SUB);
  const [invoices, setInvoices] = useState<any[]>(MOCK_INVOICES);

  useEffect(() => {
    if (session) {
      fetchSubscriptionData();
      fetchInvoices();
    }
  }, [session]);

  const fetchSubscriptionData = async () => {
    try {
      const res = await fetch('/api/billing/subscription');
      const result = await res.json();
      
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setData(MOCK_SUB);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/billing/invoices');
      const result = await res.json();
      
      if (result.success) {
        setInvoices(result.data);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices(MOCK_INVOICES);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'trial':
        return 'secondary';
      case 'past_due':
        return 'destructive';
      case 'cancelled':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getUsageIcon = (metric: string) => {
    switch (metric) {
      case 'users':
        return <Users className="w-4 h-4" />;
      case 'branches':
        return <Store className="w-4 h-4" />;
      case 'products':
        return <Package className="w-4 h-4" />;
      case 'transactions':
        return <Receipt className="w-4 h-4" />;
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getUsageLabel = (metric: string) => {
    switch (metric) {
      case 'users':
        return 'Pengguna';
      case 'branches':
        return 'Cabang';
      case 'products':
        return 'Produk';
      case 'transactions':
        return 'Transaksi';
      default:
        return metric;
    }
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

  if (!data) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tidak Ada Subscription</h3>
          <p className="text-gray-500 mb-4">Anda belum memiliki paket berlangganan</p>
          <Link href="/billing/plans">
            <Button>Pilih Paket</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Billing & Subscription</h1>
            <p className="text-gray-500">Kelola paket dan pembayaran Anda</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/billing/payment-methods">
                <CreditCard className="w-4 h-4 mr-2" />
                Metode Pembayaran
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/billing/invoices">
                <Receipt className="w-4 h-4 mr-2" />
                Riwayat Tagihan
              </Link>
            </Button>
          </div>
        </div>

        {/* Current Plan Card */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-xl">{data.subscription.plan.name}</CardTitle>
                  <Badge variant={getStatusVariant(data.subscription.status)}>
                    {data.subscription.status}
                  </Badge>
                  {data.subscription.trial.isActive && (
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      {data.subscription.trial.daysLeft} hari tersisa
                    </Badge>
                  )}
                </div>
                <CardDescription>{data.subscription.plan.description}</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {formatCurrency(data.subscription.plan.price)}
                </p>
                <p className="text-sm text-gray-500">
                  /{data.subscription.plan.billingInterval === 'monthly' ? 'bulan' : 'tahun'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Periode Berikutnya</p>
                <p className="font-semibold">{formatDate(data.billing.nextBillingDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Perpanjangan Otomatis</p>
                <p className="font-semibold">
                  {data.subscription.renewal.cancelAtPeriodEnd ? 'Dibatalkan' : 'Aktif'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/billing/plans">
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Upgrade Paket
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/billing/subscription/cancel">
                  <ArrowDownRight className="w-4 h-4 mr-2" />
                  Batalkan
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Penggunaan Bulan Ini</CardTitle>
            <CardDescription>
              Pantau penggunaan fitur dan batas kuota Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {data.usage.map((item) => (
                <div key={item.metric} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {getUsageIcon(item.metric)}
                      <span className="text-sm font-medium">{getUsageLabel(item.metric)}</span>
                    </div>
                    <span className="text-sm">
                      {item.limit === -1 ? '∞' : `${item.current} / ${item.limit}`}
                    </span>
                  </div>
                  {item.limit !== -1 && (
                    <Progress 
                      value={Math.min(item.percentage, 100)} 
                      className="h-2"
                    />
                  )}
                  {item.limit !== -1 && item.percentage > 80 && (
                    <p className="text-xs text-orange-500">
                      {item.percentage >= 100 ? 'Kuota terlampaui' : 'Mendekati batas kuota'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Tagihan Terbaru</CardTitle>
                <CardDescription>Riwayat pembayaran Anda</CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/billing/invoices">
                  Lihat Semua
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices.slice(0, 3).map((invoice) => (
                <div key={invoice.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(invoice.issuedDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(invoice.totalAmount)}</p>
                    <Badge variant={getStatusVariant(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  Belum ada tagihan
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Fitur Paket Anda</CardTitle>
            <CardDescription>
              Fitur yang tersedia di paket {data.subscription.plan.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(data.subscription.plan.features).map(([key, enabled]) => (
                <div key={key} className="flex items-center gap-2">
                  {enabled ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-300" />
                  )}
                  <span className={`text-sm ${enabled ? '' : 'text-gray-400'}`}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BillingPage;
