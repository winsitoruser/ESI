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
  FaFileInvoice, FaUpload, FaDownload, FaCheck, FaTimes,
  FaExclamationTriangle, FaEdit, FaTrash, FaPlus, FaEye,
  FaSync, FaFileExport, FaBarcode, FaCalendarAlt, FaSearch
} from "react-icons/fa";

const TaxInvoicesPage: NextPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("all");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    taxInvoiceNumber: "",
    type: "Keluaran", // Keluaran (Output) or Masukan (Input)
    customerName: "",
    customerNPWP: "",
    date: new Date().toISOString().slice(0, 10),
    dpp: "", // Dasar Pengenaan Pajak
    ppn: "", // PPN Amount
    total: "",
    description: ""
  });

  useEffect(() => {
    fetchInvoices();
  }, [activeTab, searchTerm, filterStatus, filterType, currentPage]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        search: searchTerm,
        status: filterStatus,
        type: filterType,
        tab: activeTab
      });
      
      const response = await fetch(`/api/finance/tax/invoices?${params}`);
      
      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setInvoices(result.data.invoices || []);
      }
    } catch (error) {
      console.error('Error fetching tax invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/finance/tax/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        alert('Gagal membuat faktur pajak: Error ' + response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setIsCreateModalOpen(false);
        setFormData({
          invoiceNumber: "",
          taxInvoiceNumber: "",
          type: "Keluaran",
          customerName: "",
          customerNPWP: "",
          date: new Date().toISOString().slice(0, 10),
          dpp: "",
          ppn: "",
          total: "",
          description: ""
        });
        fetchInvoices();
        alert('Faktur pajak berhasil dibuat!');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Terjadi kesalahan saat membuat faktur');
    }
  };

  const handleUploadEfaktur = async () => {
    alert('Fitur upload e-Faktur akan segera tersedia');
    setIsUploadModalOpen(false);
  };

  const handleApproveInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/finance/tax/invoices/${invoiceId}/approve`, {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Faktur berhasil disetujui!');
        fetchInvoices();
      }
    } catch (error) {
      console.error('Error approving invoice:', error);
    }
  };

  const handleRejectInvoice = async (invoiceId: string) => {
    if (!confirm('Apakah Anda yakin ingin menolak faktur ini?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/finance/tax/invoices/${invoiceId}/reject`, {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Faktur ditolak');
        fetchInvoices();
      }
    } catch (error) {
      console.error('Error rejecting invoice:', error);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus faktur ini?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/finance/tax/invoices?id=${invoiceId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        alert('Faktur berhasil dihapus');
        fetchInvoices();
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  const handleExportToEfaktur = async () => {
    try {
      const response = await fetch('/api/finance/tax/invoices/export?format=efaktur');
      
      if (!response.ok) {
        alert('Gagal export e-Faktur: Error ' + response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Download file
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `efaktur-export-${new Date().toISOString().slice(0, 10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        alert('Data e-Faktur berhasil diexport!');
      }
    } catch (error) {
      console.error('Error exporting to e-Faktur:', error);
      alert('Terjadi kesalahan saat export');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR',
      minimumFractionDigits: 0 
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      'Draft': { className: 'bg-gray-100 text-gray-800', icon: <FaEdit className="h-3 w-3 mr-1" /> },
      'Pending': { className: 'bg-yellow-100 text-yellow-800', icon: <FaExclamationTriangle className="h-3 w-3 mr-1" /> },
      'Approved': { className: 'bg-green-100 text-green-800', icon: <FaCheck className="h-3 w-3 mr-1" /> },
      'Rejected': { className: 'bg-red-100 text-red-800', icon: <FaTimes className="h-3 w-3 mr-1" /> },
      'Uploaded': { className: 'bg-blue-100 text-blue-800', icon: <FaUpload className="h-3 w-3 mr-1" /> }
    };
    
    const config = statusConfig[status] || statusConfig['Draft'];
    
    return (
      <Badge className={config.className}>
        {config.icon}
        {status}
      </Badge>
    );
  };

  if (loading && invoices.length === 0) {
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
            <h2 className="text-3xl font-bold tracking-tight">Faktur Pajak</h2>
            <p className="text-muted-foreground">Kelola faktur pajak PPN (e-Faktur)</p>
          </div>
          <div className="flex space-x-2">
            <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <FaUpload className="mr-2 h-4 w-4" /> Upload e-Faktur
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload File e-Faktur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-orange-200 rounded-lg p-8 text-center">
                    <FaUpload className="mx-auto h-12 w-12 text-orange-300 mb-4" />
                    <p className="text-sm text-gray-600 mb-2">Drag & drop file CSV e-Faktur atau</p>
                    <Button variant="outline" size="sm">
                      Pilih File
                    </Button>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                      Batal
                    </Button>
                    <Button onClick={handleUploadEfaktur} className="bg-orange-500 hover:bg-orange-600">
                      Upload
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              onClick={handleExportToEfaktur}
              variant="outline"
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <FaFileExport className="mr-2 h-4 w-4" /> Export e-Faktur
            </Button>
            
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md">
                  <FaPlus className="mr-2 h-4 w-4" /> Buat Faktur Pajak
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Buat Faktur Pajak Baru</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateInvoice} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Jenis Faktur</Label>
                      <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Keluaran">Faktur Pajak Keluaran</SelectItem>
                          <SelectItem value="Masukan">Faktur Pajak Masukan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="date">Tanggal</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="invoiceNumber">Nomor Invoice</Label>
                      <Input
                        id="invoiceNumber"
                        value={formData.invoiceNumber}
                        onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                        placeholder="INV-2025-001"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="taxInvoiceNumber">Nomor Faktur Pajak</Label>
                      <Input
                        id="taxInvoiceNumber"
                        value={formData.taxInvoiceNumber}
                        onChange={(e) => setFormData({...formData, taxInvoiceNumber: e.target.value})}
                        placeholder="010.000-25.00000001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerName">Nama Pelanggan/Supplier</Label>
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerNPWP">NPWP</Label>
                      <Input
                        id="customerNPWP"
                        value={formData.customerNPWP}
                        onChange={(e) => setFormData({...formData, customerNPWP: e.target.value})}
                        placeholder="00.000.000.0-000.000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dpp">DPP (Dasar Pengenaan Pajak)</Label>
                      <Input
                        id="dpp"
                        type="number"
                        value={formData.dpp}
                        onChange={(e) => {
                          const dpp = parseFloat(e.target.value) || 0;
                          const ppn = dpp * 0.12; // PPN 12%
                          const total = dpp + ppn;
                          setFormData({
                            ...formData, 
                            dpp: e.target.value,
                            ppn: ppn.toString(),
                            total: total.toString()
                          });
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="ppn">PPN (12%)</Label>
                      <Input
                        id="ppn"
                        type="number"
                        value={formData.ppn}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="total">Total</Label>
                      <Input
                        id="total"
                        type="number"
                        value={formData.total}
                        readOnly
                        className="bg-gray-50 font-bold"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="description">Keterangan</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
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
            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">
              Semua Faktur
            </TabsTrigger>
            <TabsTrigger value="keluaran" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">
              Faktur Keluaran
            </TabsTrigger>
            <TabsTrigger value="masukan" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">
              Faktur Masukan
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">
              Pending Approval
            </TabsTrigger>
          </TabsList>

          <Card className="overflow-hidden shadow-md">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Daftar Faktur Pajak</CardTitle>
                  <CardDescription>Kelola dan lacak semua faktur pajak</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Cari faktur..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Uploaded">Uploaded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Faktur Pajak</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Pelanggan/Supplier</TableHead>
                    <TableHead>DPP</TableHead>
                    <TableHead>PPN</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length > 0 ? invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <FaBarcode className="h-4 w-4 mr-2 text-orange-500" />
                          {invoice.taxInvoiceNumber || '-'}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(invoice.date).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={invoice.type === 'Keluaran' ? 'border-green-500 text-green-700' : 'border-blue-500 text-blue-700'}>
                          {invoice.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.customerName}</p>
                          <p className="text-xs text-gray-500">{invoice.customerNPWP}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.dpp)}</TableCell>
                      <TableCell>{formatCurrency(invoice.ppn)}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          {invoice.status === 'Pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleApproveInvoice(invoice.id)}
                              >
                                <FaCheck className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleRejectInvoice(invoice.id)}
                              >
                                <FaTimes className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <FaEye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-500 hover:text-gray-600 hover:bg-gray-50"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                          >
                            <FaTrash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        <FaFileInvoice className="h-12 w-12 mx-auto text-orange-200 mb-4" />
                        <p>Belum ada faktur pajak</p>
                        <p className="text-sm">Klik tombol "Buat Faktur Pajak" untuk memulai</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </FinanceLayout>
  );
};

export default TaxInvoicesPage;
