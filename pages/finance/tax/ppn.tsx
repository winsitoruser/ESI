import { NextPage } from "next";
import { useState, useEffect } from "react";
import FinanceLayout from "@/components/layouts/finance-layout";
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  FaCalculator, FaFileAlt, FaPlus, FaFileExport, 
  FaSearch, FaFilter, FaCalendarAlt, FaChartBar,
  FaEdit, FaTrash, FaEye, FaCheckCircle, FaExclamationTriangle
} from "react-icons/fa";

const PPNPage: NextPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [ppnData, setPpnData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isOutputModalOpen, setIsOutputModalOpen] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [reportPeriod, setReportPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [paymentFormData, setPaymentFormData] = useState({
    period: new Date().toISOString().slice(0, 7),
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "e-Billing DJP",
    ntpn: "",
    bank: "",
    accountNumber: "",
    notes: ""
  });
  const [formData, setFormData] = useState({
    type: "Output",
    description: "",
    baseAmount: "",
    vatRate: "11",
    invoiceNumber: "",
    customerSupplier: "",
    date: new Date().toISOString().split('T')[0]
  });

  // Fetch PPN data
  useEffect(() => {
    fetchPPNData();
  }, [activeTab, searchTerm, filterType, currentPage]);

  const fetchPPNData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        search: searchTerm,
        type: filterType
      });
      
      const response = await fetch(`/api/finance/tax/ppn?${params}`);
      
      if (!response.ok) {
        console.error('API Error:', response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setPpnData(result.data);
        setTransactions(result.data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching PPN data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/finance/tax/ppn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        alert('Gagal menambahkan transaksi: Error ' + response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setIsCreateModalOpen(false);
        setIsOutputModalOpen(false);
        setIsInputModalOpen(false);
        setFormData({
          type: "Output",
          description: "",
          baseAmount: "",
          vatRate: "11",
          invoiceNumber: "",
          customerSupplier: "",
          date: new Date().toISOString().split('T')[0]
        });
        alert('Transaksi PPN berhasil ditambahkan!');
        fetchPPNData();
      } else {
        alert('Gagal menambahkan transaksi: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating PPN transaction:', error);
      alert('Terjadi kesalahan saat menambahkan transaksi');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR',
      minimumFractionDigits: 0 
    }).format(amount);
  };

  const handleGenerateReport = async () => {
    try {
      const response = await fetch(`/api/finance/tax/ppn/report?period=${reportPeriod}`);
      
      if (!response.ok) {
        alert('Gagal generate laporan: Error ' + response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `spt-ppn-${reportPeriod}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        alert('Laporan SPT Masa PPN berhasil diunduh!');
        setIsReportModalOpen(false);
      } else {
        alert('Gagal generate laporan: ' + result.error);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Terjadi kesalahan saat generate laporan');
    }
  };

  const handleGeneratePaymentProof = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/finance/tax/ppn/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentFormData)
      });
      
      if (!response.ok) {
        alert('Gagal generate bukti bayar: Error ' + response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `bukti-bayar-ppn-${paymentFormData.period}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        alert('Bukti bayar PPN berhasil diunduh!');
        setIsPaymentModalOpen(false);
        setPaymentFormData({
          period: new Date().toISOString().slice(0, 7),
          amount: "",
          paymentDate: new Date().toISOString().slice(0, 10),
          paymentMethod: "e-Billing DJP",
          ntpn: "",
          bank: "",
          accountNumber: "",
          notes: ""
        });
      } else {
        alert('Gagal generate bukti bayar: ' + result.error);
      }
    } catch (error) {
      console.error('Error generating payment proof:', error);
      alert('Terjadi kesalahan saat generate bukti bayar');
    }
  };

  if (loading && !ppnData) {
    return (
      <FinanceLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </FinanceLayout>
    );
  }
  
  return (
    <FinanceLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PPN (Pajak Pertambahan Nilai)</h1>
            <p className="text-gray-600">Pengelolaan Pajak Pertambahan Nilai</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center space-x-2">
            <Button 
              variant="outline"
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <FaFileExport className="mr-2 h-4 w-4" />
              Export SPT
            </Button>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white">
                  <FaPlus className="mr-2 h-4 w-4" />
                  Transaksi Baru
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Tambah Transaksi PPN</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTransaction} className="space-y-4">
                  <div>
                    <Label htmlFor="type">Jenis PPN</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Output">PPN Keluaran</SelectItem>
                        <SelectItem value="Input">PPN Masukan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">Deskripsi</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="baseAmount">Jumlah Dasar</Label>
                    <Input
                      id="baseAmount"
                      type="number"
                      value={formData.baseAmount}
                      onChange={(e) => setFormData({...formData, baseAmount: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoiceNumber">No. Faktur</Label>
                    <Input
                      id="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerSupplier">Customer/Supplier</Label>
                    <Input
                      id="customerSupplier"
                      value={formData.customerSupplier}
                      onChange={(e) => setFormData({...formData, customerSupplier: e.target.value})}
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                      Simpan
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Modal Faktur Keluaran */}
            <Dialog open={isOutputModalOpen} onOpenChange={setIsOutputModalOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Tambah Faktur Keluaran (PPN Output)</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTransaction} className="space-y-4">
                  <input type="hidden" value="Output" />
                  <div>
                    <Label htmlFor="output-date">Tanggal</Label>
                    <Input
                      id="output-date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="output-invoiceNumber">No. Faktur Pajak</Label>
                    <Input
                      id="output-invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                      placeholder="010.000-00.00000000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="output-customer">Nama Customer</Label>
                    <Input
                      id="output-customer"
                      value={formData.customerSupplier}
                      onChange={(e) => setFormData({...formData, customerSupplier: e.target.value})}
                      placeholder="PT ABC / Nama Customer"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="output-description">Deskripsi/Barang/Jasa</Label>
                    <Textarea
                      id="output-description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Penjualan obat-obatan"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="output-baseAmount">DPP (Dasar Pengenaan Pajak)</Label>
                    <Input
                      id="output-baseAmount"
                      type="number"
                      value={formData.baseAmount}
                      onChange={(e) => setFormData({...formData, baseAmount: e.target.value})}
                      placeholder="10000000"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">PPN akan dihitung otomatis (11%)</p>
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsOutputModalOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit" className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                      <FaPlus className="mr-2 h-4 w-4" /> Simpan Faktur
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Modal Faktur Masukan */}
            <Dialog open={isInputModalOpen} onOpenChange={setIsInputModalOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Tambah Faktur Masukan (PPN Input)</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTransaction} className="space-y-4">
                  <input type="hidden" value="Input" />
                  <div>
                    <Label htmlFor="input-date">Tanggal</Label>
                    <Input
                      id="input-date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="input-invoiceNumber">No. Faktur Pajak</Label>
                    <Input
                      id="input-invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                      placeholder="010.000-00.00000000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="input-supplier">Nama Supplier</Label>
                    <Input
                      id="input-supplier"
                      value={formData.customerSupplier}
                      onChange={(e) => setFormData({...formData, customerSupplier: e.target.value})}
                      placeholder="PT Distributor / Nama Supplier"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="input-description">Deskripsi/Barang/Jasa</Label>
                    <Textarea
                      id="input-description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Pembelian stok obat-obatan"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="input-baseAmount">DPP (Dasar Pengenaan Pajak)</Label>
                    <Input
                      id="input-baseAmount"
                      type="number"
                      value={formData.baseAmount}
                      onChange={(e) => setFormData({...formData, baseAmount: e.target.value})}
                      placeholder="5000000"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">PPN akan dihitung otomatis (11%)</p>
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsInputModalOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit" className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                      <FaPlus className="mr-2 h-4 w-4" /> Simpan Faktur
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Modal Bukti Bayar PPN */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Generate Bukti Bayar PPN</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleGeneratePaymentProof} className="space-y-4">
                  <div>
                    <Label htmlFor="payment-period">Masa Pajak</Label>
                    <Input
                      id="payment-period"
                      type="month"
                      value={paymentFormData.period}
                      onChange={(e) => setPaymentFormData({...paymentFormData, period: e.target.value})}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Format: YYYY-MM</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="payment-amount">Jumlah Pembayaran</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      value={paymentFormData.amount}
                      onChange={(e) => setPaymentFormData({...paymentFormData, amount: e.target.value})}
                      placeholder="13500000"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Jumlah PPN Kurang Bayar</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="payment-date">Tanggal Pembayaran</Label>
                    <Input
                      id="payment-date"
                      type="date"
                      value={paymentFormData.paymentDate}
                      onChange={(e) => setPaymentFormData({...paymentFormData, paymentDate: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="payment-method">Metode Pembayaran</Label>
                    <select
                      id="payment-method"
                      value={paymentFormData.paymentMethod}
                      onChange={(e) => setPaymentFormData({...paymentFormData, paymentMethod: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    >
                      <option value="e-Billing DJP">e-Billing DJP</option>
                      <option value="Transfer Bank">Transfer Bank</option>
                      <option value="Virtual Account">Virtual Account</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="payment-ntpn">NTPN (Nomor Transaksi Penerimaan Negara)</Label>
                    <Input
                      id="payment-ntpn"
                      value={paymentFormData.ntpn}
                      onChange={(e) => setPaymentFormData({...paymentFormData, ntpn: e.target.value})}
                      placeholder="1234567890ABCDEF1234"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">20 digit alfanumerik dari BPN/e-Billing</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="payment-bank">Bank</Label>
                    <Input
                      id="payment-bank"
                      value={paymentFormData.bank}
                      onChange={(e) => setPaymentFormData({...paymentFormData, bank: e.target.value})}
                      placeholder="Bank BRI / BCA / Mandiri"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="payment-account">Nomor Rekening/VA</Label>
                    <Input
                      id="payment-account"
                      value={paymentFormData.accountNumber}
                      onChange={(e) => setPaymentFormData({...paymentFormData, accountNumber: e.target.value})}
                      placeholder="1234567890"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="payment-notes">Catatan</Label>
                    <Textarea
                      id="payment-notes"
                      value={paymentFormData.notes}
                      onChange={(e) => setPaymentFormData({...paymentFormData, notes: e.target.value})}
                      placeholder="Pembayaran PPN Masa Maret 2025"
                      rows={2}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit" className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                      <FaFileExport className="mr-2 h-4 w-4" /> Generate & Download
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* PPN Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-orange-50 p-1 border border-orange-100">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white font-medium"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="input" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white font-medium"
            >
              PPN Masukan
            </TabsTrigger>
            <TabsTrigger 
              value="output" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white font-medium"
            >
              PPN Keluaran
            </TabsTrigger>
            <TabsTrigger 
              value="report" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white font-medium"
            >
              Laporan
            </TabsTrigger>
          </TabsList>
          
          {/* Overview Tab Content */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-orange-100 overflow-hidden neo-shadow relative">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100 rounded-full opacity-20 transform translate-x-12 -translate-y-12 blur-md"></div>
                <div className="absolute bottom-0 left-0 w-28 h-28 bg-amber-100 rounded-full opacity-30 transform -translate-x-14 translate-y-14 blur-md"></div>
                
                {/* Top decorative bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>
                
                <CardHeader className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                  <CardTitle className="text-base font-bold text-orange-800">PPN Keluaran (Output VAT)</CardTitle>
                </CardHeader>
                
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-orange-800">
                    {ppnData?.summary ? formatCurrency(ppnData.summary.outputVAT) : 'Rp 28.750.000'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {ppnData?.summary ? `${ppnData.summary.transactionCount} Transaksi` : '87 Transaksi Penjualan'}
                  </div>
                  
                  <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700">
                      Periode Pajak: {ppnData?.summary?.period || 'Maret 2025'}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-orange-100 overflow-hidden neo-shadow relative">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100 rounded-full opacity-20 transform translate-x-12 -translate-y-12 blur-md"></div>
                <div className="absolute bottom-0 left-0 w-28 h-28 bg-amber-100 rounded-full opacity-30 transform -translate-x-14 translate-y-14 blur-md"></div>
                
                {/* Top decorative bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>
                
                <CardHeader className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                  <CardTitle className="text-base font-bold text-orange-800">PPN Masukan (Input VAT)</CardTitle>
                </CardHeader>
                
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-orange-800">Rp 15.250.000</div>
                  <div className="text-sm text-gray-600 mt-1">53 Transaksi Pembelian</div>
                  
                  <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700">Periode Pajak: Maret 2025</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-orange-100 overflow-hidden neo-shadow relative">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100 rounded-full opacity-20 transform translate-x-12 -translate-y-12 blur-md"></div>
                <div className="absolute bottom-0 left-0 w-28 h-28 bg-amber-100 rounded-full opacity-30 transform -translate-x-14 translate-y-14 blur-md"></div>
                
                {/* Top decorative bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>
                
                <CardHeader className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                  <CardTitle className="text-base font-bold text-orange-800">Kurang Bayar</CardTitle>
                </CardHeader>
                
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-red-600">Rp 13.500.000</div>
                  <div className="text-sm text-gray-600 mt-1">Jatuh Tempo: 15 April 2025</div>
                  
                  <div className="mt-4">
                    <Button 
                      onClick={() => {
                        setPaymentFormData({...paymentFormData, amount: (ppnData?.summary?.netVAT || 13500000).toString()});
                        setIsPaymentModalOpen(true);
                      }}
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                    >
                      Generate Bukti Bayar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="border-orange-100 overflow-hidden neo-shadow relative">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full opacity-20 transform translate-x-16 -translate-y-16 blur-md"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-100 rounded-full opacity-30 transform -translate-x-16 translate-y-16 blur-md"></div>
              
              {/* Top decorative bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>
              
              <CardHeader className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-bold text-orange-800">Transaksi Terbaru</CardTitle>
                  <Button variant="outline" size="sm" className="border-orange-200 text-orange-700 hover:bg-orange-50">
                    <FaSearch className="mr-2 h-3 w-3" />
                    Filter
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-orange-50">
                    <TableRow>
                      <TableHead className="text-orange-800">Tanggal</TableHead>
                      <TableHead className="text-orange-800">No. Faktur</TableHead>
                      <TableHead className="text-orange-800">Deskripsi</TableHead>
                      <TableHead className="text-orange-800">Tipe</TableHead>
                      <TableHead className="text-orange-800 text-right">DPP</TableHead>
                      <TableHead className="text-orange-800 text-right">PPN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-orange-50">
                      <TableCell>28/03/2025</TableCell>
                      <TableCell>FP-010001</TableCell>
                      <TableCell>Penjualan Obat</TableCell>
                      <TableCell>Keluaran</TableCell>
                      <TableCell className="text-right">Rp 10.000.000</TableCell>
                      <TableCell className="text-right font-medium">Rp 1.100.000</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-orange-50">
                      <TableCell>27/03/2025</TableCell>
                      <TableCell>FP-010002</TableCell>
                      <TableCell>Pembelian Stok Vitamin</TableCell>
                      <TableCell>Masukan</TableCell>
                      <TableCell className="text-right">Rp 5.000.000</TableCell>
                      <TableCell className="text-right font-medium">Rp 550.000</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-orange-50">
                      <TableCell>26/03/2025</TableCell>
                      <TableCell>FP-010003</TableCell>
                      <TableCell>Penjualan Peralatan Kesehatan</TableCell>
                      <TableCell>Keluaran</TableCell>
                      <TableCell className="text-right">Rp 8.500.000</TableCell>
                      <TableCell className="text-right font-medium">Rp 935.000</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-orange-50">
                      <TableCell>25/03/2025</TableCell>
                      <TableCell>FP-010004</TableCell>
                      <TableCell>Pembelian Alat Kesehatan</TableCell>
                      <TableCell>Masukan</TableCell>
                      <TableCell className="text-right">Rp 7.200.000</TableCell>
                      <TableCell className="text-right font-medium">Rp 792.000</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-orange-50">
                      <TableCell>24/03/2025</TableCell>
                      <TableCell>FP-010005</TableCell>
                      <TableCell>Penjualan Obat Resep</TableCell>
                      <TableCell>Keluaran</TableCell>
                      <TableCell className="text-right">Rp 12.300.000</TableCell>
                      <TableCell className="text-right font-medium">Rp 1.353.000</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Input VAT Tab */}
          <TabsContent value="input" className="space-y-4">
            <Card className="border-orange-100 overflow-hidden neo-shadow">
              <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-orange-800">PPN Masukan (Input VAT)</CardTitle>
                    <CardDescription>Faktur pajak dari pembelian dan pengeluaran</CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setFormData({...formData, type: "Input"});
                      setIsInputModalOpen(true);
                    }}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  >
                    <FaPlus className="mr-2 h-4 w-4" />
                    Tambah Faktur Masukan
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-orange-50">
                    <TableRow>
                      <TableHead className="text-orange-800">Tanggal</TableHead>
                      <TableHead className="text-orange-800">No. Faktur</TableHead>
                      <TableHead className="text-orange-800">Supplier</TableHead>
                      <TableHead className="text-orange-800">Deskripsi</TableHead>
                      <TableHead className="text-orange-800 text-right">DPP</TableHead>
                      <TableHead className="text-orange-800 text-right">PPN</TableHead>
                      <TableHead className="text-orange-800 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.filter(t => t.type === 'Input').length > 0 ? (
                      transactions.filter(t => t.type === 'Input').map((transaction) => (
                        <TableRow key={transaction.id} className="hover:bg-orange-50">
                          <TableCell>{transaction.date}</TableCell>
                          <TableCell className="font-medium">{transaction.invoiceNumber}</TableCell>
                          <TableCell>{transaction.customerSupplier}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell className="text-right">{formatCurrency(transaction.baseAmount)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(transaction.vatAmount)}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(transaction.totalAmount)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Belum ada faktur masukan
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Output VAT Tab */}
          <TabsContent value="output" className="space-y-4">
            <Card className="border-orange-100 overflow-hidden neo-shadow">
              <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-orange-800">PPN Keluaran (Output VAT)</CardTitle>
                    <CardDescription>Faktur pajak dari penjualan dan pendapatan</CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setFormData({...formData, type: "Output"});
                      setIsOutputModalOpen(true);
                    }}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  >
                    <FaPlus className="mr-2 h-4 w-4" />
                    Tambah Faktur Keluaran
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-orange-50">
                    <TableRow>
                      <TableHead className="text-orange-800">Tanggal</TableHead>
                      <TableHead className="text-orange-800">No. Faktur</TableHead>
                      <TableHead className="text-orange-800">Customer</TableHead>
                      <TableHead className="text-orange-800">Deskripsi</TableHead>
                      <TableHead className="text-orange-800 text-right">DPP</TableHead>
                      <TableHead className="text-orange-800 text-right">PPN</TableHead>
                      <TableHead className="text-orange-800 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.filter(t => t.type === 'Output').length > 0 ? (
                      transactions.filter(t => t.type === 'Output').map((transaction) => (
                        <TableRow key={transaction.id} className="hover:bg-orange-50">
                          <TableCell>{transaction.date}</TableCell>
                          <TableCell className="font-medium">{transaction.invoiceNumber}</TableCell>
                          <TableCell>{transaction.customerSupplier}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell className="text-right">{formatCurrency(transaction.baseAmount)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(transaction.vatAmount)}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(transaction.totalAmount)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Belum ada faktur keluaran
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="report" className="space-y-4">
            <Card className="border-orange-100 overflow-hidden neo-shadow">
              <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                <CardTitle className="text-orange-800">Laporan SPT Masa PPN</CardTitle>
                <CardDescription>Generate dan export laporan SPT Masa PPN untuk pelaporan pajak</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-gray-600 mb-1">Total PPN Masukan</div>
                    <div className="text-2xl font-bold text-orange-800">{formatCurrency(ppnData?.summary?.inputVAT || 24750000)}</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-gray-600 mb-1">Total PPN Keluaran</div>
                    <div className="text-2xl font-bold text-orange-800">{formatCurrency(ppnData?.summary?.outputVAT || 45250000)}</div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg border border-orange-300">
                    <div className="text-sm text-gray-700 mb-1 font-medium">Kurang/(Lebih) Bayar</div>
                    <div className="text-2xl font-bold text-orange-900">{formatCurrency(ppnData?.summary?.netVAT || 20500000)}</div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-semibold text-gray-800 mb-4">Format Laporan</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-start space-x-3 p-3 bg-white border border-orange-200 rounded-lg">
                      <FaFileExport className="h-5 w-5 text-orange-600 mt-1" />
                      <div>
                        <div className="font-medium text-gray-800">SPT Masa PPN 1111</div>
                        <div className="text-sm text-gray-600">Format JSON untuk DJP Online</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 bg-white border border-orange-200 rounded-lg">
                      <FaChartBar className="h-5 w-5 text-orange-600 mt-1" />
                      <div>
                        <div className="font-medium text-gray-800">Lampiran 1111 A & B</div>
                        <div className="text-sm text-gray-600">Rekapitulasi Penyerahan & Perolehan</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <div className="flex items-center space-x-3">
                      <FaCalendarAlt className="h-5 w-5 text-yellow-600" />
                      <div>
                        <div className="font-medium text-gray-800">Periode Pajak</div>
                        <div className="text-sm text-gray-600">Pilih masa pajak yang akan dilaporkan</div>
                      </div>
                    </div>
                    <Input
                      type="month"
                      value={reportPeriod}
                      onChange={(e) => setReportPeriod(e.target.value)}
                      className="w-48"
                    />
                  </div>

                  <div className="flex justify-center">
                    <Button 
                      onClick={() => setIsReportModalOpen(true)}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg"
                      size="lg"
                    >
                      <FaFileExport className="mr-2 h-5 w-5" />
                      Generate Laporan SPT Masa PPN
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Report Confirmation Modal */}
            <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Konfirmasi Generate Laporan</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">Periode Pajak</div>
                    <div className="text-xl font-bold text-orange-800">
                      {new Date(reportPeriod + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Laporan akan berisi:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>SPT Masa PPN 1111</li>
                      <li>Lampiran 1111 A (Penyerahan)</li>
                      <li>Lampiran 1111 B (Perolehan)</li>
                      <li>Rekapitulasi transaksi PPN</li>
                    </ul>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setIsReportModalOpen(false)}>
                      Batal
                    </Button>
                    <Button 
                      onClick={handleGenerateReport}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    >
                      <FaFileExport className="mr-2 h-4 w-4" />
                      Generate & Download
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </FinanceLayout>
  );
};

export default PPNPage;
