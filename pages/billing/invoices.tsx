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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Download, 
  Eye, 
  Search,
  Filter,
  Calendar,
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  paymentProvider?: string;
  paymentMethod?: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    type: string;
  }>;
}

const InvoicesPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const MOCK_BILL_INVOICES: Invoice[] = [
    { id: 'inv1', invoiceNumber: 'INV-2026-0315', status: 'paid', issuedDate: '2026-03-01', dueDate: '2026-03-15', paidDate: '2026-03-03', subtotal: 2500000, taxAmount: 275000, discountAmount: 0, totalAmount: 2775000, currency: 'IDR', paymentProvider: 'midtrans', paymentMethod: 'bank_transfer', customerName: 'PT Bedagang Indonesia', customerEmail: 'finance@bedagang.co.id', items: [{ description: 'Enterprise Plan - Maret 2026', quantity: 1, unitPrice: 2500000, amount: 2500000, type: 'subscription' }] },
    { id: 'inv2', invoiceNumber: 'INV-2026-0215', status: 'paid', issuedDate: '2026-02-01', dueDate: '2026-02-15', paidDate: '2026-02-05', subtotal: 2500000, taxAmount: 275000, discountAmount: 0, totalAmount: 2775000, currency: 'IDR', paymentProvider: 'midtrans', paymentMethod: 'bank_transfer', customerName: 'PT Bedagang Indonesia', customerEmail: 'finance@bedagang.co.id', items: [{ description: 'Enterprise Plan - Februari 2026', quantity: 1, unitPrice: 2500000, amount: 2500000, type: 'subscription' }] },
  ];
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_BILL_INVOICES);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    if (session) {
      fetchInvoices();
    }
  }, [session]);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm, statusFilter, dateFilter]);

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/billing/invoices');
      const result = await res.json();
      
      if (result.success) {
        setInvoices(result.data);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices(MOCK_BILL_INVOICES);
    } finally {
      setLoading(false);
    }
  };

  const filterInvoices = () => {
    let filtered = [...invoices];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const startDate = new Date();

      switch (dateFilter) {
        case 'this_month':
          startDate.setDate(1);
          break;
        case 'last_month':
          startDate.setMonth(now.getMonth() - 1);
          startDate.setDate(1);
          break;
        case 'this_year':
          startDate.setMonth(0);
          startDate.setDate(1);
          break;
        default:
          break;
      }

      filtered = filtered.filter(invoice => 
        new Date(invoice.issuedDate) >= startDate
      );
    }

    setFilteredInvoices(filtered);
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/billing/invoices/${invoiceId}/download`);
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast.error('Gagal mengunduh invoice');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  const payInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/billing/invoices/${invoiceId}/pay`, {
        method: 'POST'
      });
      
      const result = await res.json();

      if (result.success) {
        // Redirect to payment provider
        if (result.paymentUrl) {
          window.location.href = result.paymentUrl;
        }
      } else {
        toast.error(result.error || 'Gagal memproses pembayaran');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
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
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'sent':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      case 'cancelled':
        return 'outline';
      case 'refunded':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'sent':
        return <Clock className="w-4 h-4" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Receipt className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Draft',
      sent: 'Terkirim',
      paid: 'Dibayar',
      overdue: 'Terlambat',
      cancelled: 'Dibatalkan',
      refunded: 'Dikembalikan'
    };
    return labels[status] || status;
  };

  const getPaymentMethodLabel = (method?: string) => {
    if (!method) return '-';
    const labels: Record<string, string> = {
      credit_card: 'Kartu Kredit',
      bank_transfer: 'Transfer Bank',
      ewallet: 'E-Wallet',
      virtual_account: 'Virtual Account',
      manual: 'Manual'
    };
    return labels[method] || method;
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
            <h1 className="text-2xl font-bold">Riwayat Tagihan</h1>
            <p className="text-gray-500">Lihat dan kelola semua tagihan Anda</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/billing">
                Kembali ke Dashboard
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cari invoice..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div>
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Terkirim</SelectItem>
                    <SelectItem value="paid">Dibayar</SelectItem>
                    <SelectItem value="overdue">Terlambat</SelectItem>
                    <SelectItem value="cancelled">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Periode</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Periode</SelectItem>
                    <SelectItem value="this_month">Bulan Ini</SelectItem>
                    <SelectItem value="last_month">Bulan Lalu</SelectItem>
                    <SelectItem value="this_year">Tahun Ini</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setDateFilter('all');
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Tagihan</CardTitle>
            <CardDescription>
              Menampilkan {filteredInvoices.length} dari {invoices.length} tagihan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredInvoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-gray-500">{invoice.customerName}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(invoice.issuedDate)}</TableCell>
                      <TableCell>
                        <div>
                          <p>{formatDate(invoice.dueDate)}</p>
                          {invoice.status === 'overdue' && (
                            <p className="text-xs text-red-500">Terlambat</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(invoice.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(invoice.status)} className="flex gap-1 w-fit">
                          {getStatusIcon(invoice.status)}
                          {getStatusLabel(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invoice.paidDate ? (
                          <span className="text-sm">{getPaymentMethodLabel(invoice.paymentMethod)}</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedInvoice(invoice)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Detail Invoice</DialogTitle>
                                <DialogDescription>
                                  Invoice {selectedInvoice?.invoiceNumber}
                                </DialogDescription>
                              </DialogHeader>
                              {selectedInvoice && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Tanggal Terbit</Label>
                                      <p>{formatDate(selectedInvoice.issuedDate)}</p>
                                    </div>
                                    <div>
                                      <Label>Jatuh Tempo</Label>
                                      <p>{formatDate(selectedInvoice.dueDate)}</p>
                                    </div>
                                    <div>
                                      <Label>Status</Label>
                                      <div className="mt-1">
                                        <Badge variant={getStatusVariant(selectedInvoice.status)}>
                                          {getStatusLabel(selectedInvoice.status)}
                                        </Badge>
                                      </div>
                                    </div>
                                    {selectedInvoice.paidDate && (
                                      <div>
                                        <Label>Tanggal Bayar</Label>
                                        <p>{formatDate(selectedInvoice.paidDate)}</p>
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <Label>Item Tagihan</Label>
                                    <div className="mt-2 space-y-2">
                                      {selectedInvoice.items.map((item, index) => (
                                        <div key={index} className="flex justify-between text-sm">
                                          <span>{item.description}</span>
                                          <span>{formatCurrency(item.amount)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="border-t pt-4">
                                    <div className="space-y-1">
                                      <div className="flex justify-between">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                                      </div>
                                      {selectedInvoice.discountAmount > 0 && (
                                        <div className="flex justify-between text-green-600">
                                          <span>Diskon</span>
                                          <span>-{formatCurrency(selectedInvoice.discountAmount)}</span>
                                        </div>
                                      )}
                                      {selectedInvoice.taxAmount > 0 && (
                                        <div className="flex justify-between">
                                          <span>Pajak</span>
                                          <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadInvoice(invoice.id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>

                          {invoice.status === 'sent' && (
                            <Button 
                              size="sm"
                              onClick={() => payInvoice(invoice.id)}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Bayar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Tidak Ada Tagihan</h3>
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                    ? 'Tidak ada tagihan yang sesuai dengan filter'
                    : 'Anda belum memiliki tagihan'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default InvoicesPage;
