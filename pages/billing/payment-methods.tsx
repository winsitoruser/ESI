import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  AlertTriangle,
  Banknote,
  Smartphone,
  Building,
  Shield,
  Star,
  MoreVertical
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'bank_transfer' | 'ewallet' | 'virtual_account';
  provider: 'midtrans' | 'stripe' | 'manual';
  name: string;
  description: string;
  details: {
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    walletType?: string;
    walletNumber?: string;
    vaNumber?: string;
  };
  isDefault: boolean;
  isActive: boolean;
  metadata: {
    fees?: {
      percentage?: number;
      fixed?: number;
    };
    limits?: {
      min?: number;
      max?: number;
    };
    processingTime?: string;
  };
  createdAt: string;
}

const PaymentMethodsPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const MOCK_PAY_METHODS: PaymentMethod[] = [
    { id: 'pm1', type: 'bank_transfer', provider: 'manual', name: 'BCA Transfer', description: 'Transfer via BCA', details: { bankName: 'BCA', accountNumber: '***4567', accountName: 'PT Bedagang' }, isDefault: true, isActive: true, metadata: { fees: { percentage: 0, fixed: 0 }, limits: { min: 10000, max: 500000000 }, processingTime: '1-2 jam' }, createdAt: '2025-01-01' },
    { id: 'pm2', type: 'ewallet', provider: 'midtrans', name: 'GoPay', description: 'Pembayaran via GoPay', details: { walletType: 'gopay', walletNumber: '***8901' }, isDefault: false, isActive: true, metadata: { fees: { percentage: 2, fixed: 0 }, limits: { min: 10000, max: 10000000 }, processingTime: 'Instan' }, createdAt: '2025-06-15' },
  ];
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(MOCK_PAY_METHODS);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [newMethod, setNewMethod] = useState({
    type: 'credit_card' as const,
    provider: 'midtrans' as const,
    name: '',
    description: '',
    isDefault: false
  });

  useEffect(() => {
    if (session) {
      fetchPaymentMethods();
    }
  }, [session]);

  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch('/api/billing/payment-methods');
      const result = await res.json();
      
      if (result.success) {
        setPaymentMethods(result.data);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      setPaymentMethods(MOCK_PAY_METHODS);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    try {
      const res = await fetch('/api/billing/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMethod)
      });
      
      const result = await res.json();

      if (result.success) {
        toast.success('Metode pembayaran berhasil ditambahkan');
        setShowAddDialog(false);
        setNewMethod({
          type: 'credit_card',
          provider: 'midtrans',
          name: '',
          description: '',
          isDefault: false
        });
        fetchPaymentMethods();
      } else {
        toast.error(result.error || 'Gagal menambah metode pembayaran');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleUpdatePaymentMethod = async (id: string, updates: Partial<PaymentMethod>) => {
    try {
      const res = await fetch(`/api/billing/payment-methods/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      const result = await res.json();

      if (result.success) {
        toast.success('Metode pembayaran berhasil diperbarui');
        fetchPaymentMethods();
      } else {
        toast.error(result.error || 'Gagal memperbarui metode pembayaran');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus metode pembayaran ini?')) {
      return;
    }

    try {
      const res = await fetch(`/api/billing/payment-methods/${id}`, {
        method: 'DELETE'
      });
      
      const result = await res.json();

      if (result.success) {
        toast.success('Metode pembayaran berhasil dihapus');
        fetchPaymentMethods();
      } else {
        toast.error(result.error || 'Gagal menghapus metode pembayaran');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleSetDefault = async (id: string) => {
    await handleUpdatePaymentMethod(id, { isDefault: true });
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'credit_card':
        return <CreditCard className="w-5 h-5" />;
      case 'bank_transfer':
        return <Building className="w-5 h-5" />;
      case 'ewallet':
        return <Smartphone className="w-5 h-5" />;
      case 'virtual_account':
        return <Banknote className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'midtrans':
        return <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center text-white text-xs font-bold">M</div>;
      case 'stripe':
        return <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">S</div>;
      case 'manual':
        return <div className="w-6 h-6 bg-gray-500 rounded flex items-center justify-center text-white text-xs font-bold">M</div>;
      default:
        return null;
    }
  };

  const getMethodLabel = (type: string) => {
    const labels: Record<string, string> = {
      credit_card: 'Kartu Kredit/Debit',
      bank_transfer: 'Transfer Bank',
      ewallet: 'E-Wallet',
      virtual_account: 'Virtual Account'
    };
    return labels[type] || type;
  };

  const formatMethodDetails = (method: PaymentMethod) => {
    switch (method.type) {
      case 'credit_card':
        return `•••• ${method.details.last4} (${method.details.brand})`;
      case 'bank_transfer':
        return `${method.details.bankName} - ${method.details.accountNumber}`;
      case 'ewallet':
        return `${method.details.walletType} - ${method.details.walletNumber}`;
      case 'virtual_account':
        return `VA ${method.details.vaNumber}`;
      default:
        return '';
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Metode Pembayaran</h1>
            <p className="text-gray-500">Kelola metode pembayaran untuk tagihan Anda</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Metode
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Metode Pembayaran</DialogTitle>
                  <DialogDescription>
                    Tambah metode pembayaran baru untuk digunakan pada tagihan
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Tipe Metode</Label>
                    <Select 
                      value={newMethod.type} 
                      onValueChange={(value: any) => setNewMethod({...newMethod, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit_card">Kartu Kredit/Debit</SelectItem>
                        <SelectItem value="bank_transfer">Transfer Bank</SelectItem>
                        <SelectItem value="ewallet">E-Wallet</SelectItem>
                        <SelectItem value="virtual_account">Virtual Account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Provider</Label>
                    <Select 
                      value={newMethod.provider} 
                      onValueChange={(value: any) => setNewMethod({...newMethod, provider: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="midtrans">Midtrans</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Nama Metode</Label>
                    <Input
                      value={newMethod.name}
                      onChange={(e) => setNewMethod({...newMethod, name: e.target.value})}
                      placeholder="contoh: Kartu Kredit BCA"
                    />
                  </div>

                  <div>
                    <Label>Deskripsi</Label>
                    <Input
                      value={newMethod.description}
                      onChange={(e) => setNewMethod({...newMethod, description: e.target.value})}
                      placeholder="Opsional"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Jadikan default</Label>
                    <Switch
                      checked={newMethod.isDefault}
                      onCheckedChange={(checked) => setNewMethod({...newMethod, isDefault: checked})}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                      Batal
                    </Button>
                    <Button onClick={handleAddPaymentMethod} className="flex-1">
                      Tambah
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Payment Methods List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paymentMethods.map((method) => (
            <Card key={method.id} className={method.isDefault ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {getMethodIcon(method.type)}
                    <div>
                      <CardTitle className="text-lg">{method.name}</CardTitle>
                      <CardDescription>{method.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {method.isDefault && (
                      <Badge variant="default" className="flex gap-1">
                        <Star className="w-3 h-3" />
                        Default
                      </Badge>
                    )}
                    {getProviderIcon(method.provider)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Method Details */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{getMethodLabel(method.type)}</span>
                  <span className="text-sm font-mono">{formatMethodDetails(method)}</span>
                </div>

                {/* Fees */}
                {method.metadata.fees && (
                  <div className="text-sm">
                    <p className="text-gray-500 mb-1">Biaya:</p>
                    <div className="space-y-1">
                      {method.metadata.fees.percentage && (
                        <p>{method.metadata.fees.percentage}% per transaksi</p>
                      )}
                      {method.metadata.fees.fixed && (
                        <p>+ {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(method.metadata.fees.fixed)}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Processing Time */}
                {method.metadata.processingTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">{method.metadata.processingTime}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  {!method.isDefault && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSetDefault(method.id)}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      Jadikan Default
                    </Button>
                  )}
                  
                  <div className="flex gap-1 ml-auto">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingMethod(method)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    {!method.isDefault && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeletePaymentMethod(method.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {paymentMethods.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Belum Ada Metode Pembayaran</h3>
                <p className="text-gray-500 mb-4">
                  Tambahkan metode pembayaran untuk memudahkan proses pembayaran tagihan
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Metode Pembayaran
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">Keamanan Pembayaran</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Semua metode pembayaran dienkripsi dan disimpan secara aman sesuai standar PCI DSS. 
                  Kami tidak menyimpan informasi kartu kredit lengkap di sistem kami.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PaymentMethodsPage;
