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
  FaBuilding, FaCalculator, FaFileInvoiceDollar, FaCalendarAlt,
  FaPlus, FaEdit, FaTrash, FaCheck, FaExclamationTriangle,
  FaChartLine, FaMoneyBillWave, FaFileAlt, FaDownload
} from "react-icons/fa";

const PPHBadanPage: NextPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [taxData, setTaxData] = useState<any>(null);
  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCalculateModalOpen, setIsCalculateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  const [calculationForm, setCalculationForm] = useState({
    year: new Date().getFullYear().toString(),
    revenue: "",
    cogs: "",
    operatingExpenses: "",
    otherIncome: "",
    otherExpenses: "",
    companyType: "umum" // umum or umkm
  });

  const [paymentForm, setPaymentForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: "",
    paymentMethod: "Transfer Bank",
    referenceNumber: "",
    notes: ""
  });

  useEffect(() => {
    fetchTaxData();
    fetchInstallments();
  }, [activeTab]);

  const fetchTaxData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/finance/tax/pphbadan');
      
      if (!response.ok) {
        console.error('API Error:', response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setTaxData(result.data);
      }
    } catch (error) {
      console.error('Error fetching PPh Badan data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallments = async () => {
    try {
      const response = await fetch('/api/finance/tax/pphbadan/installments');
      
      if (!response.ok) {
        console.error('API Error:', response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setInstallments(result.data.installments || []);
      }
    } catch (error) {
      console.error('Error fetching installments:', error);
    }
  };

  const handleCalculateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/finance/tax/pphbadan/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(calculationForm)
      });
      
      if (!response.ok) {
        alert('Gagal menghitung pajak: Error ' + response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setIsCalculateModalOpen(false);
        alert('Perhitungan PPh Badan berhasil!\nPajak Terutang: ' + formatCurrency(result.data.annualTax));
        fetchTaxData();
      }
    } catch (error) {
      console.error('Error calculating tax:', error);
      alert('Terjadi kesalahan saat menghitung pajak');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/finance/tax/pphbadan/installments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentForm)
      });
      
      if (!response.ok) {
        alert('Gagal mencatat pembayaran: Error ' + response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setIsPaymentModalOpen(false);
        alert('Pembayaran PPh 25 berhasil dicatat!');
        fetchInstallments();
        fetchTaxData();
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Terjadi kesalahan saat mencatat pembayaran');
    }
  };

  const handleGenerateSPT = async () => {
    try {
      const year = new Date().getFullYear();
      const response = await fetch(`/api/finance/tax/pphbadan/spt?year=${year}`);
      
      if (!response.ok) {
        alert('Gagal generate SPT: Error ' + response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `spt-pph-badan-${year}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        alert('SPT PPh Badan berhasil diunduh!');
      }
    } catch (error) {
      console.error('Error generating SPT:', error);
      alert('Terjadi kesalahan saat generate SPT');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR',
      minimumFractionDigits: 0 
    }).format(amount);
  };

  if (loading && !taxData) {
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
        {/* Decorative background */}
        <div className="absolute top-24 right-12 w-72 h-72 bg-gradient-to-br from-orange-200/30 to-amber-100/20 rounded-full blur-3xl -z-10" />
        
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">PPh Badan</h2>
            <p className="text-muted-foreground">Pajak Penghasilan Badan & PPh Pasal 25</p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleGenerateSPT}
              variant="outline"
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <FaDownload className="mr-2 h-4 w-4" /> Download SPT Tahunan
            </Button>
            
            <Dialog open={isCalculateModalOpen} onOpenChange={setIsCalculateModalOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <FaCalculator className="mr-2 h-4 w-4" /> Hitung Pajak Tahunan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Hitung PPh Badan Tahunan</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCalculateTax} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="year">Tahun Pajak</Label>
                      <Input
                        id="year"
                        type="number"
                        value={calculationForm.year}
                        onChange={(e) => setCalculationForm({...calculationForm, year: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="companyType">Jenis Perusahaan</Label>
                      <Select value={calculationForm.companyType} onValueChange={(value) => setCalculationForm({...calculationForm, companyType: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="umum">Badan Umum (Tarif 22%)</SelectItem>
                          <SelectItem value="umkm">UMKM (Tarif 11% untuk omzet s.d 4.8M)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="revenue">Pendapatan Bruto</Label>
                      <Input
                        id="revenue"
                        type="number"
                        value={calculationForm.revenue}
                        onChange={(e) => setCalculationForm({...calculationForm, revenue: e.target.value})}
                        placeholder="0"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="cogs">Harga Pokok Penjualan (HPP)</Label>
                      <Input
                        id="cogs"
                        type="number"
                        value={calculationForm.cogs}
                        onChange={(e) => setCalculationForm({...calculationForm, cogs: e.target.value})}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="operatingExpenses">Biaya Operasional</Label>
                      <Input
                        id="operatingExpenses"
                        type="number"
                        value={calculationForm.operatingExpenses}
                        onChange={(e) => setCalculationForm({...calculationForm, operatingExpenses: e.target.value})}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="otherIncome">Pendapatan Lain-lain</Label>
                      <Input
                        id="otherIncome"
                        type="number"
                        value={calculationForm.otherIncome}
                        onChange={(e) => setCalculationForm({...calculationForm, otherIncome: e.target.value})}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="otherExpenses">Biaya Lain-lain</Label>
                      <Input
                        id="otherExpenses"
                        type="number"
                        value={calculationForm.otherExpenses}
                        onChange={(e) => setCalculationForm({...calculationForm, otherExpenses: e.target.value})}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCalculateModalOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                      <FaCalculator className="mr-2 h-4 w-4" /> Hitung
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md">
                  <FaPlus className="mr-2 h-4 w-4" /> Catat Pembayaran PPh 25
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Catat Pembayaran PPh Pasal 25</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRecordPayment} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="month">Masa Pajak</Label>
                      <Select value={paymentForm.month.toString()} onValueChange={(value) => setPaymentForm({...paymentForm, month: parseInt(value)})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 12}, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {new Date(2025, i).toLocaleDateString('id-ID', { month: 'long' })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="paymentYear">Tahun</Label>
                      <Input
                        id="paymentYear"
                        type="number"
                        value={paymentForm.year}
                        onChange={(e) => setPaymentForm({...paymentForm, year: parseInt(e.target.value)})}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="amount">Jumlah Pembayaran</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                        placeholder="0"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="paymentMethod">Metode Pembayaran</Label>
                      <Select value={paymentForm.paymentMethod} onValueChange={(value) => setPaymentForm({...paymentForm, paymentMethod: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Transfer Bank">Transfer Bank</SelectItem>
                          <SelectItem value="Virtual Account">Virtual Account</SelectItem>
                          <SelectItem value="e-Billing">e-Billing DJP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="referenceNumber">Nomor Referensi</Label>
                      <Input
                        id="referenceNumber"
                        value={paymentForm.referenceNumber}
                        onChange={(e) => setPaymentForm({...paymentForm, referenceNumber: e.target.value})}
                        placeholder="NTPN/BPN"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="notes">Catatan</Label>
                      <Input
                        id="notes"
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
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
            <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">
              Overview
            </TabsTrigger>
            <TabsTrigger value="installments" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">
              PPh Pasal 25
            </TabsTrigger>
            <TabsTrigger value="annual" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">
              Pajak Tahunan
            </TabsTrigger>
            <TabsTrigger value="spt" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">
              SPT Tahunan
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg">
                    <FaMoneyBillWave className="mr-2 h-5 w-5 text-orange-500" />
                    PPh 25 Bulanan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(taxData?.monthlyInstallment || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Angsuran per bulan</p>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg">
                    <FaCalculator className="mr-2 h-5 w-5 text-orange-500" />
                    PPh Badan Tahunan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(taxData?.annualTax || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Tahun {new Date().getFullYear()}</p>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg">
                    <FaChartLine className="mr-2 h-5 w-5 text-orange-500" />
                    Total Dibayar YTD
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(taxData?.totalPaidYTD || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Januari - {new Date().toLocaleDateString('id-ID', { month: 'long' })}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden shadow-md">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
              <CardHeader>
                <CardTitle>Informasi Pajak Badan</CardTitle>
                <CardDescription>Detail perhitungan dan kewajiban pajak</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-600">Penghasilan Kena Pajak</p>
                    <p className="text-2xl font-bold">{formatCurrency(taxData?.taxableIncome || 0)}</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-600">Tarif Pajak</p>
                    <p className="text-2xl font-bold">{taxData?.taxRate || 22}%</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Jatuh Tempo Pembayaran</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div>
                        <p className="font-medium text-yellow-800">PPh Pasal 25</p>
                        <p className="text-sm text-yellow-700">Bulan {new Date().toLocaleDateString('id-ID', { month: 'long' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-yellow-800">Tanggal 15</p>
                        <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                          <FaExclamationTriangle className="h-3 w-3 mr-1" /> Segera
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Installments Tab */}
          <TabsContent value="installments" className="space-y-4">
            <Card className="overflow-hidden shadow-md">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
              <CardHeader>
                <CardTitle>Pembayaran PPh Pasal 25 (Angsuran Bulanan)</CardTitle>
                <CardDescription>Riwayat pembayaran angsuran pajak bulanan</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Masa Pajak</TableHead>
                      <TableHead>Jumlah Angsuran</TableHead>
                      <TableHead>Tanggal Bayar</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>NTPN</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installments.length > 0 ? installments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.period}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{payment.paymentDate || '-'}</TableCell>
                        <TableCell>
                          {payment.status === 'Dibayar' ? (
                            <Badge className="bg-green-100 text-green-800">
                              <FaCheck className="h-3 w-3 mr-1" /> {payment.status}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                              <FaExclamationTriangle className="h-3 w-3 mr-1" /> {payment.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{payment.ntpn || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-orange-600">
                            <FaFileAlt className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Belum ada pembayaran tercatat
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Annual Tax Tab */}
          <TabsContent value="annual" className="text-center py-12">
            <Card className="overflow-hidden shadow-md">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
              <CardContent className="p-12">
                <FaCalculator className="h-16 w-16 mx-auto text-orange-200" />
                <h3 className="mt-4 text-xl font-medium">Perhitungan PPh Badan Tahunan</h3>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                  Hitung pajak penghasilan badan berdasarkan laporan keuangan tahunan
                </p>
                <Button 
                  onClick={() => setIsCalculateModalOpen(true)}
                  className="mt-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md"
                >
                  <FaCalculator className="mr-2 h-4 w-4" /> Hitung Pajak Tahunan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SPT Tab */}
          <TabsContent value="spt" className="text-center py-12">
            <Card className="overflow-hidden shadow-md">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
              <CardContent className="p-12">
                <FaFileAlt className="h-16 w-16 mx-auto text-orange-200" />
                <h3 className="mt-4 text-xl font-medium">SPT Tahunan PPh Badan</h3>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                  Download dan submit SPT Tahunan PPh Badan ke DJP Online
                </p>
                <Button 
                  onClick={handleGenerateSPT}
                  className="mt-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md"
                >
                  <FaDownload className="mr-2 h-4 w-4" /> Download SPT Tahunan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FinanceLayout>
  );
};

export default PPHBadanPage;
