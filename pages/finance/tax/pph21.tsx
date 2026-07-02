import { NextPage } from "next";
import { useState, useEffect } from "react";
import Link from "next/link";
import FinanceLayout from "@/components/layouts/finance-layout";
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FaIdCard, FaUser, FaUsers, FaBuilding, FaCalculator,
  FaFileInvoiceDollar, FaCalendarAlt, FaEdit, FaTrash, FaPlus,
  FaCheck, FaExclamationTriangle, FaSearch, FaFilter
} from "react-icons/fa";

const PPh21Page: NextPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [pph21Data, setPph21Data] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    name: "",
    position: "",
    department: "",
    grossSalary: "",
    allowances: "0",
    deductions: "0",
    maritalStatus: "Belum Menikah",
    dependents: "0"
  });

  const [paymentFormData, setPaymentFormData] = useState({
    period: new Date().toISOString().slice(0, 7),
    amount: "",
    paymentMethod: "Transfer Bank",
    paymentDate: new Date().toISOString().slice(0, 10),
    referenceNumber: "",
    bank: "",
    accountNumber: "",
    notes: ""
  });

  // Fetch PPh21 data
  useEffect(() => {
    fetchPPh21Data();
    if (activeTab === 'overview' || activeTab === 'payments') {
      fetchPayments();
    }
  }, [activeTab, searchTerm, filterDepartment, currentPage]);

  const fetchPPh21Data = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        search: searchTerm,
        department: filterDepartment
      });
      
      const response = await fetch(`/api/finance/tax/pph21?${params}`);
      
      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setPph21Data(result.data);
      }
    } catch (error) {
      console.error('Error fetching PPh21 data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/finance/tax/pph21/payment?limit=10');
      
      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setPayments(result.data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/finance/tax/pph21', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        alert('Gagal membuat karyawan: Error ' + response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setIsCreateModalOpen(false);
        setFormData({
          employeeId: "",
          name: "",
          position: "",
          department: "",
          grossSalary: "",
          allowances: "0",
          deductions: "0",
          maritalStatus: "Belum Menikah",
          dependents: "0"
        });
        fetchPPh21Data();
      }
    } catch (error) {
      console.error('Error creating employee:', error);
    }
  };

  const handleProcessPayroll = async () => {
    try {
      const response = await fetch('/api/finance/tax/pph21/payroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ period: new Date().toISOString().slice(0, 7) })
      });
      
      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        alert('Gagal memproses payroll: Error ' + response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setIsPayrollModalOpen(false);
        alert('Payroll berhasil diproses!');
        fetchPPh21Data();
      } else {
        alert('Gagal memproses payroll: ' + result.error);
      }
    } catch (error) {
      console.error('Error processing payroll:', error);
      alert('Terjadi kesalahan saat memproses payroll');
    }
  };

  const handleEditEmployee = (employee: any) => {
    setFormData({
      employeeId: employee.employeeId || employee.id,
      name: employee.name,
      position: employee.position,
      department: employee.department || '',
      grossSalary: employee.grossSalary.toString(),
      allowances: employee.allowances?.toString() || '0',
      deductions: employee.deductions?.toString() || '0',
      maritalStatus: employee.maritalStatus || 'Belum Menikah',
      dependents: employee.dependents?.toString() || '0'
    });
    setIsCreateModalOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus karyawan ini?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/finance/tax/pph21?id=${employeeId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Karyawan berhasil dihapus');
        fetchPPh21Data();
      } else {
        alert('Gagal menghapus karyawan: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Terjadi kesalahan saat menghapus karyawan');
    }
  };

  const handleCalculateTax = async () => {
    try {
      const response = await fetch('/api/finance/tax/pph21/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ period: new Date().toISOString().slice(0, 7) })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Perhitungan pajak berhasil!');
        fetchPPh21Data();
      } else {
        alert('Gagal menghitung pajak: ' + result.error);
      }
    } catch (error) {
      console.error('Error calculating tax:', error);
      alert('Terjadi kesalahan saat menghitung pajak');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/finance/tax/pph21/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentFormData)
      });
      
      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        alert('Gagal mencatat pembayaran: Error ' + response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setIsPaymentModalOpen(false);
        setPaymentFormData({
          period: new Date().toISOString().slice(0, 7),
          amount: "",
          paymentMethod: "Transfer Bank",
          paymentDate: new Date().toISOString().slice(0, 10),
          referenceNumber: "",
          bank: "",
          accountNumber: "",
          notes: ""
        });
        alert('Pembayaran PPh21 berhasil dicatat!');
        fetchPayments();
        fetchPPh21Data();
      } else {
        alert('Gagal mencatat pembayaran: ' + result.error);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Terjadi kesalahan saat mencatat pembayaran');
    }
  };

  const handleGenerateReport = async () => {
    try {
      const period = new Date().toISOString().slice(0, 7);
      const response = await fetch(`/api/finance/tax/pph21/report?period=${period}&type=summary`);
      
      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        alert('Gagal generate laporan: Error ' + response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Download as JSON for now
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `pph21-report-${period}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        alert('Laporan berhasil diunduh!');
      } else {
        alert('Gagal generate laporan: ' + result.error);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Terjadi kesalahan saat generate laporan');
    }
  };

  const handlePayTax = async (paymentId: string) => {
    try {
      const response = await fetch('/api/finance/tax/pph21/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentId, status: 'Dibayar' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Pembayaran berhasil dicatat!');
        fetchPPh21Data();
      } else {
        alert('Gagal mencatat pembayaran: ' + result.error);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Terjadi kesalahan saat mencatat pembayaran');
    }
  };

  const handleViewReceipt = (paymentId: string) => {
    alert(`Bukti pembayaran untuk ID: ${paymentId}`);
    // TODO: Implement receipt viewing functionality
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR',
      minimumFractionDigits: 0 
    }).format(amount);
  };

  if (loading && !pph21Data) {
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
      <div className="flex flex-col space-y-8 p-8 relative">
        {/* Decorative background element */}
        <div className="absolute top-24 right-12 w-72 h-72 bg-gradient-to-br from-orange-200/30 to-amber-100/20 rounded-full blur-3xl -z-10" />
        
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">PPh 21 (Pajak Penghasilan)</h2>
            <p className="text-muted-foreground">Kelola pajak penghasilan karyawan & non-karyawan</p>
          </div>
          <div className="flex space-x-2">
            <Dialog open={isPayrollModalOpen} onOpenChange={setIsPayrollModalOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                >
                  <FaFileInvoiceDollar className="mr-2 h-4 w-4" /> Payroll Bulanan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Proses Payroll Bulanan</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p>Apakah Anda yakin ingin memproses payroll untuk bulan ini?</p>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsPayrollModalOpen(false)}>
                      Batal
                    </Button>
                    <Button onClick={handleProcessPayroll} className="bg-orange-500 hover:bg-orange-600">
                      Proses Payroll
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Modal Pencatatan Pembayaran */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Catat Pembayaran PPh 21</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRecordPayment} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="period">Masa Pajak</Label>
                      <Input
                        id="period"
                        type="month"
                        value={paymentFormData.period}
                        onChange={(e) => setPaymentFormData({...paymentFormData, period: e.target.value})}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Format: YYYY-MM</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="amount">Jumlah Pembayaran</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={paymentFormData.amount}
                        onChange={(e) => setPaymentFormData({...paymentFormData, amount: e.target.value})}
                        placeholder="0"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="paymentDate">Tanggal Pembayaran</Label>
                      <Input
                        id="paymentDate"
                        type="date"
                        value={paymentFormData.paymentDate}
                        onChange={(e) => setPaymentFormData({...paymentFormData, paymentDate: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="paymentMethod">Metode Pembayaran</Label>
                      <select
                        id="paymentMethod"
                        value={paymentFormData.paymentMethod}
                        onChange={(e) => setPaymentFormData({...paymentFormData, paymentMethod: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="Transfer Bank">Transfer Bank</option>
                        <option value="Virtual Account">Virtual Account</option>
                        <option value="e-Billing DJP">e-Billing DJP</option>
                        <option value="Tunai">Tunai</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="bank">Bank</Label>
                      <Input
                        id="bank"
                        value={paymentFormData.bank}
                        onChange={(e) => setPaymentFormData({...paymentFormData, bank: e.target.value})}
                        placeholder="Nama Bank"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="accountNumber">Nomor Rekening/Virtual Account</Label>
                      <Input
                        id="accountNumber"
                        value={paymentFormData.accountNumber}
                        onChange={(e) => setPaymentFormData({...paymentFormData, accountNumber: e.target.value})}
                        placeholder="1234567890"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="referenceNumber">Nomor Referensi</Label>
                      <Input
                        id="referenceNumber"
                        value={paymentFormData.referenceNumber}
                        onChange={(e) => setPaymentFormData({...paymentFormData, referenceNumber: e.target.value})}
                        placeholder="NTPN/BPN"
                      />
                      <p className="text-xs text-gray-500 mt-1">Nomor Transaksi Penerimaan Negara (NTPN)</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="notes">Catatan</Label>
                      <Input
                        id="notes"
                        value={paymentFormData.notes}
                        onChange={(e) => setPaymentFormData({...paymentFormData, notes: e.target.value})}
                        placeholder="Catatan tambahan (opsional)"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit" className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                      <FaCheck className="mr-2 h-4 w-4" /> Simpan Pembayaran
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md">
                  <FaPlus className="mr-2 h-4 w-4" /> Tambah Karyawan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Tambah Karyawan Baru</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateEmployee} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="employeeId">ID Karyawan</Label>
                      <Input
                        id="employeeId"
                        value={formData.employeeId}
                        onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Nama Lengkap</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">Posisi</Label>
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) => setFormData({...formData, position: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="department">Departemen</Label>
                      <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Departemen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Farmasi">Farmasi</SelectItem>
                          <SelectItem value="Administrasi">Administrasi</SelectItem>
                          <SelectItem value="Keuangan">Keuangan</SelectItem>
                          <SelectItem value="Operasional">Operasional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="grossSalary">Gaji Pokok</Label>
                      <Input
                        id="grossSalary"
                        type="number"
                        value={formData.grossSalary}
                        onChange={(e) => setFormData({...formData, grossSalary: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="allowances">Tunjangan</Label>
                      <Input
                        id="allowances"
                        type="number"
                        value={formData.allowances}
                        onChange={(e) => setFormData({...formData, allowances: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maritalStatus">Status Pernikahan</Label>
                      <Select value={formData.maritalStatus} onValueChange={(value) => setFormData({...formData, maritalStatus: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Belum Menikah">Belum Menikah</SelectItem>
                          <SelectItem value="Menikah">Menikah</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="dependents">Jumlah Tanggungan</Label>
                      <Input
                        id="dependents"
                        type="number"
                        min="0"
                        max="5"
                        value={formData.dependents}
                        onChange={(e) => setFormData({...formData, dependents: e.target.value})}
                      />
                    </div>
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
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-orange-50 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">Overview</TabsTrigger>
            <TabsTrigger value="employees" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">Data Karyawan</TabsTrigger>
            <TabsTrigger value="calculations" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">Perhitungan Pajak</TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">Pembayaran Pajak</TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">Laporan</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg">
                    <FaUsers className="mr-2 h-5 w-5 text-orange-500" />
                    Total Karyawan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{pph21Data?.employees?.length || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Terdaftar dalam sistem penggajian</p>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg">
                    <FaCalculator className="mr-2 h-5 w-5 text-orange-500" />
                    PPh 21 Bulanan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(pph21Data?.summary?.monthlyTax || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1" suppressHydrationWarning>Bulan {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg">
                    <FaCalendarAlt className="mr-2 h-5 w-5 text-orange-500" />
                    Jatuh Tempo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold flex items-center">
                    <span>15 April 2025</span>
                    <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-700 bg-yellow-50">
                      <FaExclamationTriangle className="h-3 w-3 mr-1" /> 18 hari lagi
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Pelaporan & Pembayaran PPh 21</p>
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
              <CardHeader>
                <CardTitle>Pembayaran PPh 21 Terbaru</CardTitle>
                <CardDescription>Rekam jejak pembayaran pajak penghasilan</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periode</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tanggal Bayar/Jatuh Tempo</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length > 0 ? payments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.period}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>
                          {payment.status === "Dibayar" ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <FaCheck className="h-3 w-3 mr-1" /> {payment.status}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
                              <FaExclamationTriangle className="h-3 w-3 mr-1" /> {payment.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{payment.paymentDate || payment.dueDate}</TableCell>
                        <TableCell className="text-right">
                          {payment.status !== "Dibayar" ? (
                            <Button 
                              size="sm" 
                              onClick={() => handlePayTax(payment.id)}
                              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                            >
                              Bayar
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewReceipt(payment.id)}
                              className="border-orange-200 text-orange-700"
                            >
                              Lihat Bukti
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Belum ada data pembayaran
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-4">
            <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Daftar Karyawan</CardTitle>
                  <CardDescription>Kelola data karyawan untuk perhitungan PPh 21</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Cari karyawan..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                    <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter Departemen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Departemen</SelectItem>
                        <SelectItem value="Farmasi">Farmasi</SelectItem>
                        <SelectItem value="Administrasi">Administrasi</SelectItem>
                        <SelectItem value="Keuangan">Keuangan</SelectItem>
                        <SelectItem value="Operasional">Operasional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md"
                  >
                    <FaPlus className="mr-2 h-4 w-4" /> Tambah
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Jabatan</TableHead>
                      <TableHead>Status PTKP</TableHead>
                      <TableHead>Gaji Bruto</TableHead>
                      <TableHead>PPh 21 Tahunan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(pph21Data?.employees || []).map((employee: any) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>{employee.maritalStatus === 'Menikah' ? `K/${employee.dependents}` : 'TK/0'}</TableCell>
                        <TableCell>{formatCurrency(employee.grossSalary)}</TableCell>
                        <TableCell>{formatCurrency(employee.annualTax || 0)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            onClick={() => handleEditEmployee(employee)}
                          >
                            <FaEdit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteEmployee(employee.id)}
                          >
                            <FaTrash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs would display placeholder content for now */}
          <TabsContent value="calculations" className="text-center py-12">
            <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
              <CardContent className="p-12">
                <FaCalculator className="h-16 w-16 mx-auto text-orange-200" />
                <h3 className="mt-4 text-xl font-medium">Belum Ada Perhitungan Pajak</h3>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                  Silakan pilih periode untuk memulai perhitungan PPh 21 karyawan.
                </p>
                <Button 
                  onClick={handleCalculateTax}
                  className="mt-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md"
                >
                  <FaCalculator className="mr-2 h-4 w-4" /> Hitung Pajak
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="text-center py-12">
            <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
              <CardContent className="p-12">
                <FaFileInvoiceDollar className="h-16 w-16 mx-auto text-orange-200" />
                <h3 className="mt-4 text-xl font-medium">Pembayaran PPh 21</h3>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                  Lakukan dan lacak pembayaran PPh 21 bulanan Anda di sini.
                </p>
                <Button 
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="mt-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md"
                >
                  <FaPlus className="mr-2 h-4 w-4" /> Catat Pembayaran
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="text-center py-12">
            <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
              <CardContent className="p-12">
                <FaFileInvoiceDollar className="h-16 w-16 mx-auto text-orange-200" />
                <h3 className="mt-4 text-xl font-medium">Laporan PPh 21</h3>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                  Buat dan unduh laporan PPh 21 bulanan atau tahunan Anda.
                </p>
                <Button 
                  onClick={handleGenerateReport}
                  className="mt-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md"
                >
                  <FaFileInvoiceDollar className="mr-2 h-4 w-4" /> Generate Laporan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FinanceLayout>
  );
};

export default PPh21Page;
