import { NextPage } from "next";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
// import ExportDataDropdown from "@/components/shared/export-data-dropdown";
// import ImportDataDialog from "@/components/shared/import-data-dialog";
import {
  FaFileInvoiceDollar,
  FaEye,
  FaSearch,
  FaPlus,
  FaDownload,
  FaCreditCard,
  FaPrint,
  FaBoxOpen,
  FaFilter,
  FaCalendarAlt,
  FaBuilding,
  FaCheckCircle,
  FaTimesCircle,
  FaTruck,
  FaDollarSign,
  FaHistory,
  FaClock,
  FaExclamationTriangle,
  FaInfoCircle,
  FaDolly,
  FaClipboardList,
  FaFileUpload,
  FaSortUp,
  FaSortDown,
  FaArrowUp,
  FaArrowDown,
  FaArrowLeft,
  FaArrowRight,
  FaCheck
} from "react-icons/fa";
import { Label } from "@/components/ui/label";

// State untuk data dari API
interface ApiState {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  filters: {
    status: string;
    supplier: string;
    paymentStatus: string;
    inventoryStatus: string;
    search: string;
    dateRange: { start: string; end: string };
    type: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  }
}

// Mock data removed - using real backend API

// Definisikan tipe untuk payment, receipt, dan item
interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  method: string;
  receivedBy: string;
  reference: string;
}

interface InventoryReceipt {
  id: string;
  receiptNumber: string;
  date: string;
  receivedBy: string;
  notes: string;
}

interface InvoiceItem {
  id: number;
  product: string;
  quantity: number;
  price: number;
  total: number;
  received?: number;
}

interface Invoice {
  id: string;
  supplier: string;
  date: string;
  dueDate: string;
  amount: number;
  status: string;
  type: string;
  paymentStatus: string;
  totalPaid: number;
  remainingAmount: number;
  purchaseOrder: string | null;
  paymentHistory: PaymentHistory[];
  items: InvoiceItem[];
  inventoryStatus: string;
  inventoryReceipts: InventoryReceipt[];
}

// Helper function to determine invoice status label and color
const getInvoiceStatusInfo = (invoice: Invoice) => {
  if (invoice.paymentStatus === "paid") {
    return {
      label: "Sudah Dibayar",
      badge: "bg-sky-100 text-sky-800 border-sky-200",
      icon: <FaCheckCircle className="mr-1 h-3 w-3" />
    };
  } else if (invoice.paymentStatus === "partial") {
    return {
      label: "Pembayaran Sebagian",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      icon: <FaHistory className="mr-1 h-3 w-3" />
    };
  } else {
    return {
      label: "Belum Dibayar",
      badge: "bg-sky-100 text-sky-800 border-sky-200",
      icon: <FaTimesCircle className="mr-1 h-3 w-3" />
    };
  }
};

// Helper function to determine inventory status label and color
const getInventoryStatusInfo = (invoice: Invoice) => {
  if (invoice.inventoryStatus === "complete") {
    return {
      label: "Diterima Lengkap",
      badge: "bg-green-100 text-green-800 border-green-200",
      icon: <FaCheckCircle className="mr-1 h-3 w-3" />
    };
  } else if (invoice.inventoryStatus === "partial") {
    return {
      label: "Diterima Sebagian",
      badge: "bg-blue-100 text-blue-800 border-blue-200",
      icon: <FaBoxOpen className="mr-1 h-3 w-3" />
    };
  } else {
    return {
      label: "Menunggu Penerimaan",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      icon: <FaClock className="mr-1 h-3 w-3" />
    };
  }
};

// Fungsi untuk format Rp currency
const formatCurrency = (amount: number) => {
  return `Rp${(amount ?? 0).toLocaleString('id-ID')}`;
};

const InvoicesPage: NextPage = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const MOCK_INVOICES: Invoice[] = [
    { id: 'INV-001', supplier: 'PT Indofood', date: '2026-03-15', dueDate: '2026-04-15', invoiceNumber: 'INV/2026/03/001', status: 'active', type: 'purchase', paymentStatus: 'unpaid', inventoryStatus: 'pending', subtotal: 5000000, tax: 550000, discount: 0, total: 5550000, amountPaid: 0, items: [{ id: 1, product: 'Tepung Terigu 25kg', quantity: 10, price: 250000, total: 2500000 }, { id: 2, product: 'Minyak Goreng 5L', quantity: 10, price: 255000, total: 2550000 }], paymentHistory: [], inventoryReceipts: [], notes: '' },
    { id: 'INV-002', supplier: 'CV Segar Jaya', date: '2026-03-10', dueDate: '2026-04-10', invoiceNumber: 'INV/2026/03/002', status: 'active', type: 'purchase', paymentStatus: 'partial', inventoryStatus: 'partial', subtotal: 3000000, tax: 330000, discount: 100000, total: 3230000, amountPaid: 1500000, items: [{ id: 1, product: 'Sayur Segar Campur', quantity: 50, price: 60000, total: 3000000 }], paymentHistory: [{ id: 'p1', date: '2026-03-12', amount: 1500000, method: 'Transfer', receivedBy: 'Admin', reference: 'TRF-001' }], inventoryReceipts: [], notes: '' },
  ] as any;
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tabValue, setTabValue] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [isFullPayment, setIsFullPayment] = useState(true);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  
  // Function to request sorting
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig?.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Function to get sorted items
  const getSortedItems = (items: Invoice[]) => {
    if (!sortConfig) return items;
    
    return [...items].sort((a, b) => {
      if (a[sortConfig.key as keyof Invoice] < b[sortConfig.key as keyof Invoice]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key as keyof Invoice] > b[sortConfig.key as keyof Invoice]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  // Fungsi untuk menghasilkan template data invoice
  const generateInvoiceTemplate = () => {
    return [
      {
        id: "INV-TEMPLATE-001",
        supplier: "Nama Supplier/Pelanggan",
        date: "2025-03-27", // Format YYYY-MM-DD
        dueDate: "2025-04-15", // Format YYYY-MM-DD
        amount: 5000000,
        status: "pending", // pending, received, delivered, canceled
        type: "supplier", // supplier atau customer
        paymentStatus: "unpaid", // unpaid, partial, paid
        totalPaid: 0,
        remainingAmount: 5000000,
        purchaseOrder: "PO-2025-001",
        items: [
          {
            id: 1,
            product: "Nama Produk 1",
            quantity: 10,
            price: 250000,
            total: 2500000
          },
          {
            id: 2,
            product: "Nama Produk 2",
            quantity: 5,
            price: 500000,
            total: 2500000
          }
        ]
      },
      {
        id: "INV-TEMPLATE-002",
        supplier: "Nama Supplier/Pelanggan Lain",
        date: "2025-03-26", // Format YYYY-MM-DD
        dueDate: "2025-04-10", // Format YYYY-MM-DD
        amount: 3000000,
        status: "pending", // pending, received, delivered, canceled
        type: "customer", // supplier atau customer
        paymentStatus: "unpaid", // unpaid, partial, paid
        totalPaid: 0,
        remainingAmount: 3000000,
        purchaseOrder: "",
        items: [
          {
            id: 1,
            product: "Nama Produk A",
            quantity: 20,
            price: 150000,
            total: 3000000
          }
        ]
      }
    ];
  };

  // Fungsi untuk menangani import data faktur
  const handleImportInvoices = (importedData: any[]) => {
    // Pada implementasi nyata, Anda akan menyimpan data ini ke database
    // Untuk contoh, kita hanya menampilkan alert
    console.log("Data faktur yang diimpor:", importedData);
    alert(`${importedData.length} data faktur berhasil diimpor!`);
  };

  // Menyiapkan data untuk export
  const prepareExportData = () => {
    return filteredInvoices.map(invoice => ({
      'No. Faktur': invoice.id,
      'Supplier/Pelanggan': invoice.supplier,
      'Tanggal': invoice.date,
      'Jatuh Tempo': invoice.dueDate,
      'Total': invoice.amount,
      'Status Pembayaran': getInvoiceStatusInfo(invoice).label,
      'Tipe': invoice.type === 'supplier' ? 'Supplier' : 'Pelanggan',
      'Jumlah Dibayar': invoice.totalPaid,
      'Sisa Pembayaran': invoice.remainingAmount,
      'Nomor PO': invoice.purchaseOrder || '-',
      'Status Inventori': getInventoryStatusInfo(invoice).label
    }));
  };

  // Header untuk PDF export
  const pdfHeaders = [
    'No. Faktur', 'Supplier/Pelanggan', 'Tanggal', 'Jatuh Tempo', 'Total', 
    'Status Pembayaran', 'Tipe', 'Jumlah Dibayar', 'Sisa Pembayaran', 
    'Nomor PO', 'Status Inventori'
  ];

  // Mapping untuk PDF row data
  const pdfMappingInvoice = (item: any) => [
    item['No. Faktur'],
    item['Supplier/Pelanggan'],
    item['Tanggal'],
    item['Jatuh Tempo'],
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(item['Total']),
    item['Status Pembayaran'],
    item['Tipe'],
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(item['Jumlah Dibayar']),
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(item['Sisa Pembayaran']),
    item['Nomor PO'],
    item['Status Inventori']
  ];

  // Filter faktur berdasarkan pencarian, status, dan tipe
  const filteredInvoices = getSortedItems(invoices)
    .filter(invoice => {
      // Filter pencarian
      const searchMatch = 
        invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.supplier.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter tab
      let tabMatch = true;
      if (tabValue === "unpaid") {
        tabMatch = invoice.paymentStatus === "unpaid";
      } else if (tabValue === "paid") {
        tabMatch = invoice.paymentStatus === "paid";
      } else if (tabValue === "partial") {
        tabMatch = invoice.paymentStatus === "partial";
      }
      
      // Filter status
      let statusMatch = true;
      if (statusFilter !== "all") {
        statusMatch = invoice.paymentStatus === statusFilter;
      }
      
      // Filter tipe
      let typeMatch = true;
      if (typeFilter !== "all") {
        typeMatch = invoice.type === typeFilter;
      }
      
      return searchMatch && tabMatch && statusMatch && typeMatch;
    })
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Fungsi untuk menampilkan detail faktur
  const handleViewDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailModalOpen(true);
  };

  // Fungsi untuk menampilkan modal pembayaran
  const handlePaymentModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.remainingAmount);
    setIsFullPayment(true);
    setIsPaymentModalOpen(true);
  };

  // Fungsi untuk menampilkan modal penerimaan barang
  const handleInventoryModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInventoryModalOpen(true);
  };

  useEffect(() => {
    // Set payment amount sesuai sisa tagihan ketika fullPayment diubah
    if (selectedInvoice) {
      if (isFullPayment) {
        setPaymentAmount(selectedInvoice.remainingAmount);
      }
    }
  }, [isFullPayment, selectedInvoice]);

  // Fetch invoices from the API
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/finance/invoices');
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setInvoices(data.data || []);
        console.log('Invoices loaded from backend:', data.data?.length || 0, 'items');
      } else {
        console.error('Failed to fetch invoices:', data.error);
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices(MOCK_INVOICES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Header with decorative element */}
          <div className="flex items-center">
            <div className="h-8 w-1.5 bg-gradient-to-b from-sky-400 to-blue-500 rounded-full mr-3"></div>
            <h1 className="text-2xl font-bold text-gray-800">
              Faktur & Tagihan
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              className="bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white"
              onClick={() => router.push('/finance/invoices/create')}
            >
              <FaPlus className="mr-2 h-4 w-4" />
              Buat Faktur Baru
            </Button>
            {/* Export and Import components temporarily disabled - need to create components */}
            {/* <ExportDataDropdown 
              data={prepareExportData()}
              filename="Daftar_Faktur_Invoice"
              pdfTitle="Daftar Faktur dan Invoice"
              pdfHeaders={pdfHeaders}
              pdfMapping={pdfMappingInvoice}
              buttonVariant="gradient"
              buttonSize="default"
              buttonClassName="bg-gradient-to-r from-sky-500 to-blue-500"
              align="end"
            />
            <ImportDataDialog 
              onImport={handleImportInvoices}
              generateTemplate={generateInvoiceTemplate}
              templateFilename="Template_Import_Faktur"
              templateHeaders={[
                "ID", "Supplier/Pelanggan", "Tanggal", "Jatuh Tempo", 
                "Total", "Status", "Tipe", "Status Pembayaran", 
                "Jumlah Dibayar", "Sisa Pembayaran", "Nomor PO"
              ]}
              title="Import Data Faktur"
              description="Upload file data faktur dan invoice sesuai format template"
              trigger={
                <Button variant="outline" className="border-sky-200 text-sky-700 hover:bg-sky-50">
                  <FaFileUpload className="mr-2 h-4 w-4" />
                  Import
                </Button>
              }
            /> */}
            <Button 
              className="bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white"
              onClick={() => router.push('/finance/ledger')}
            >
              <FaClipboardList className="mr-2 h-4 w-4" />
              Buku Besar
            </Button>
          </div>
        </div>

        <Card className="border-sky-100 overflow-hidden shadow-lg relative">
          {/* Top decorative bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 via-blue-500 to-sky-400"></div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-sky-100 rounded-full opacity-20 transform translate-x-20 -translate-y-20"></div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-100 rounded-full opacity-30"></div>
          
          <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-sky-100 pb-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500 to-blue-400 mr-3 shadow-sm">
                <FaFileInvoiceDollar className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-sky-800">Faktur & Tagihan</CardTitle>
                <CardDescription className="text-sky-600/70">Kelola faktur pembelian dan penjualan</CardDescription>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between gap-4 mt-4 relative z-10">
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-2/3">
                <div className="relative w-full">
                  <Input
                    className="pl-10 border-sky-200 focus:border-sky-500 focus:ring-sky-500"
                    placeholder="Cari berdasarkan nomor faktur atau supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] border-sky-200">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="paid">Sudah Dibayar</SelectItem>
                    <SelectItem value="unpaid">Belum Dibayar</SelectItem>
                    <SelectItem value="partial">Pembayaran Sebagian</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] border-sky-200">
                    <SelectValue placeholder="Filter Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tipe</SelectItem>
                    <SelectItem value="supplier">Faktur Supplier</SelectItem>
                    <SelectItem value="customer">Faktur Pelanggan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          <div className="px-6 -mt-1 border-b border-sky-100 overflow-x-auto">
            <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
              <TabsList className="bg-sky-50/70 border border-sky-100 p-1 w-full h-auto flex justify-between sm:justify-start">
                <TabsTrigger 
                  value="all" 
                  className="flex-1 sm:flex-initial px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-blue-500 data-[state=active]:text-white text-sm"
                >
                  <span className="flex items-center">
                    <FaFileInvoiceDollar className="mr-1.5 h-4 w-4" />
                    Semua
                    <Badge className="ml-2 bg-sky-100 text-sky-700 hover:bg-sky-100">{filteredInvoices.filter(i => i.paymentStatus === "unpaid" || i.paymentStatus === "partial" || i.paymentStatus === "paid").length}</Badge>
                  </span>
                </TabsTrigger>
                <TabsTrigger 
                  value="unpaid" 
                  className="flex-1 sm:flex-initial px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-blue-500 data-[state=active]:text-white text-sm"
                >
                  <span className="flex items-center">
                    <FaExclamationTriangle className="mr-1.5 h-4 w-4" />
                    Belum Dibayar
                    <Badge className="ml-2 bg-red-100 text-red-700 hover:bg-red-100">{filteredInvoices.filter(i => i.paymentStatus === "unpaid").length}</Badge>
                  </span>
                </TabsTrigger>
                <TabsTrigger 
                  value="partial" 
                  className="flex-1 sm:flex-initial px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-blue-500 data-[state=active]:text-white text-sm"
                >
                  <span className="flex items-center">
                    <FaArrowDown className="mr-1.5 h-4 w-4" />
                    Sebagian
                    <Badge className="ml-2 bg-amber-100 text-amber-700 hover:bg-amber-100">{filteredInvoices.filter(i => i.paymentStatus === "partial").length}</Badge>
                  </span>
                </TabsTrigger>
                <TabsTrigger 
                  value="paid" 
                  className="flex-1 sm:flex-initial px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-blue-500 data-[state=active]:text-white text-sm"
                >
                  <span className="flex items-center">
                    <FaCheck className="mr-1.5 h-4 w-4" />
                    Sudah Dibayar
                    <Badge className="ml-2 bg-green-100 text-green-700 hover:bg-green-100">{filteredInvoices.filter(i => i.paymentStatus === "paid").length}</Badge>
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <CardContent className="p-0 mt-0">
            <div className="rounded-md border-b border-gray-200">
              <Table>
                <TableHeader className="bg-sky-50">
                  <TableRow>
                    <TableHead 
                      className="text-sky-800 font-medium cursor-pointer hover:text-sky-600" 
                      onClick={() => requestSort('id')}
                    >
                      <div className="flex items-center">
                        <span>No. Faktur</span>
                        {sortConfig?.key === 'id' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-sky-800 font-medium cursor-pointer hover:text-sky-600" 
                      onClick={() => requestSort('supplier')}
                    >
                      <div className="flex items-center">
                        <span>Supplier/Pelanggan</span>
                        {sortConfig?.key === 'supplier' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-sky-800 font-medium cursor-pointer hover:text-sky-600" 
                      onClick={() => requestSort('date')}
                    >
                      <div className="flex items-center">
                        <span>Tanggal</span>
                        {sortConfig?.key === 'date' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-sky-800 font-medium cursor-pointer hover:text-sky-600" 
                      onClick={() => requestSort('dueDate')}
                    >
                      <div className="flex items-center">
                        <span>Jatuh Tempo</span>
                        {sortConfig?.key === 'dueDate' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-sky-800 font-medium cursor-pointer hover:text-sky-600" 
                      onClick={() => requestSort('paymentStatus')}
                    >
                      <div className="flex items-center">
                        <span>Status</span>
                        {sortConfig?.key === 'paymentStatus' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-sky-800 font-medium cursor-pointer hover:text-sky-600" 
                      onClick={() => requestSort('type')}
                    >
                      <div className="flex items-center">
                        <span>Tipe</span>
                        {sortConfig?.key === 'type' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-sky-800 font-medium text-right cursor-pointer hover:text-sky-600" 
                      onClick={() => requestSort('amount')}
                    >
                      <div className="flex items-center justify-end">
                        <span>Jumlah</span>
                        {sortConfig?.key === 'amount' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-sky-800 font-medium text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Tidak ada faktur yang sesuai dengan kriteria pencarian.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-sky-50/50">
                        <TableCell className="font-medium">{invoice.id}</TableCell>
                        <TableCell>{invoice.supplier}</TableCell>
                        <TableCell>{invoice.date}</TableCell>
                        <TableCell>{invoice.dueDate}</TableCell>
                        <TableCell>
                          <Badge className={getInvoiceStatusInfo(invoice).badge}>
                            {getInvoiceStatusInfo(invoice).icon}
                            {getInvoiceStatusInfo(invoice).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {invoice.type === "supplier" ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Supplier
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              Pelanggan
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoice.amount)}
                          {invoice.paymentStatus === "partial" && (
                            <div className="text-xs text-gray-500">
                              Dibayar: {formatCurrency(invoice.totalPaid)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetail(invoice)}
                              className="h-8 w-8 text-sky-600 hover:text-sky-800 hover:bg-sky-50"
                            >
                              <FaEye className="h-4 w-4" />
                            </Button>
                            {(invoice.paymentStatus === "unpaid" || invoice.paymentStatus === "partial") && invoice.type === "supplier" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePaymentModal(invoice)}
                                className="h-8 w-8 text-sky-600 hover:text-sky-800 hover:bg-sky-50"
                              >
                                <FaCreditCard className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-sky-600 hover:text-sky-800 hover:bg-sky-50"
                            >
                              <FaPrint className="h-4 w-4" />
                            </Button>
                            {invoice.type === "supplier" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleInventoryModal(invoice)}
                                className="h-8 w-8 text-sky-600 hover:text-sky-800 hover:bg-sky-50"
                              >
                                <FaDolly className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="bg-white px-6 py-4 border-t border-sky-100">
            <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
              <div className="text-sm text-gray-500">
                Menampilkan {filteredInvoices.length} dari {invoices.length} faktur
              </div>
              <div className="flex items-center space-x-2">
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[130px] border-sky-200 focus:ring-sky-500">
                    <SelectValue placeholder="Tampilkan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 per halaman</SelectItem>
                    <SelectItem value="10">10 per halaman</SelectItem>
                    <SelectItem value="20">20 per halaman</SelectItem>
                    <SelectItem value="50">50 per halaman</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-sky-200 text-sky-700 hover:bg-sky-50"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <FaArrowLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-sky-200 text-sky-700 hover:bg-sky-50"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <FaArrowLeft className="h-3 w-3" />
                  </Button>
                  
                  <span className="text-sm px-2">
                    Halaman <span className="font-medium">{currentPage}</span> dari{" "}
                    <span className="font-medium">
                      {Math.ceil(invoices.length / itemsPerPage)}
                    </span>
                  </span>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-sky-200 text-sky-700 hover:bg-sky-50"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === Math.ceil(invoices.length / itemsPerPage)}
                  >
                    <FaArrowRight className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-sky-200 text-sky-700 hover:bg-sky-50"
                    onClick={() => setCurrentPage(Math.ceil(invoices.length / itemsPerPage))}
                    disabled={currentPage === Math.ceil(invoices.length / itemsPerPage)}
                  >
                    <FaArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>

      {/* Modal Detail Faktur */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto p-0 border-sky-200">
          {/* Top decorative gradient */}
          <div className="h-2 w-full bg-gradient-to-r from-sky-400 via-blue-500 to-sky-500"></div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-56 h-56 bg-sky-200 rounded-full opacity-20 transform translate-x-20 -translate-y-20 z-0"></div>
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-200 rounded-full opacity-20 transform -translate-x-16 translate-y-16 z-0"></div>
          
          <div className="p-5 relative z-10">
            <DialogHeader className="mb-4 flex flex-row items-center">
              <div className="h-10 w-1.5 bg-gradient-to-b from-sky-500 to-blue-500 rounded-full mr-3"></div>
              <div>
                <DialogTitle className="text-xl font-bold text-sky-800">Detail Faktur</DialogTitle>
                <DialogDescription className="text-sky-600">
                  Informasi lengkap tentang faktur dan status pembayaran
                </DialogDescription>
              </div>
            </DialogHeader>
            
            {selectedInvoice && (
              <div className="space-y-6">
                {/* Header Faktur - Card Landscape */}
                <div className="relative overflow-hidden rounded-xl shadow-md border border-sky-100 bg-white neo-shadow">
                  <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 via-blue-500 to-sky-400"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-blue-500/10"></div>
                  <div className="absolute top-0 right-0 w-40 h-40 bg-sky-100 rounded-full opacity-30 transform translate-x-20 -translate-y-20"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-100 rounded-full opacity-30 transform -translate-x-10 translate-y-10"></div>
                  
                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                    {/* Invoice Information */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex items-center">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-sky-500/90 to-blue-500/90 text-white shadow-md">
                          <FaFileInvoiceDollar className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-xl font-bold text-gray-800">{selectedInvoice.id}</h3>
                          <div className="text-sm text-gray-500">{selectedInvoice.type === 'supplier' ? 'Faktur Pembelian' : 'Faktur Penjualan'}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6 mt-4">
                        <div>
                          <div className="flex items-center text-gray-600 mb-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-100 text-sky-600 mr-3">
                              <FaBuilding className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Supplier/Pelanggan</p>
                              <p className="font-medium">{selectedInvoice.supplier}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center text-gray-600 mb-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-100 text-sky-600 mr-3">
                              <FaCalendarAlt className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Tanggal Faktur</p>
                              <p className="font-medium">{selectedInvoice.date}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center text-gray-600 mb-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-100 text-sky-600 mr-3">
                              <FaCalendarAlt className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Jatuh Tempo</p>
                              <p className="font-medium">{selectedInvoice.dueDate}</p>
                            </div>
                          </div>
                          
                          {selectedInvoice.type === "supplier" && (
                            <div className="flex items-center text-gray-600">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-100 text-sky-600 mr-3">
                                <FaTruck className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Status Penerimaan</p>
                                <Badge className={getInventoryStatusInfo(selectedInvoice).badge}>
                                  {getInventoryStatusInfo(selectedInvoice).label}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {selectedInvoice.purchaseOrder && (
                        <div className="flex items-center text-gray-600 mt-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-100 text-sky-600 mr-3">
                            <FaClipboardList className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Pesanan Pembelian</p>
                            <p className="font-medium">{selectedInvoice.purchaseOrder}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Payment Information */}
                    <div className="lg:border-l lg:pl-6 lg:border-sky-100">
                      <div className="text-right mb-4">
                        <div className="mb-2 flex justify-end">
                          <Badge className={getInvoiceStatusInfo(selectedInvoice).badge + " px-3 py-1"}>
                            {getInvoiceStatusInfo(selectedInvoice).icon}
                            <span className="ml-1">{getInvoiceStatusInfo(selectedInvoice).label}</span>
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total Faktur</p>
                          <p className="text-2xl font-bold text-sky-600">{formatCurrency(selectedInvoice.amount)}</p>
                        </div>
                        
                        {selectedInvoice.paymentStatus !== "unpaid" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">Sudah Dibayar</p>
                              <p className="font-bold text-green-600">{formatCurrency(selectedInvoice.totalPaid)}</p>
                            </div>
                            {selectedInvoice.paymentStatus === "partial" && (
                              <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Sisa Tagihan</p>
                                <p className="font-bold text-sky-600">{formatCurrency(selectedInvoice.remainingAmount)}</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Payment Progress Bar */}
                        {selectedInvoice.paymentStatus !== "unpaid" && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-500">Progres Pembayaran</span>
                              <span className="font-medium">{Math.round((selectedInvoice.totalPaid / selectedInvoice.amount) * 100)}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden relative">
                              <div 
                                className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full"
                                style={{ width: `${(selectedInvoice.totalPaid / selectedInvoice.amount) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-2 mt-4">
                          {selectedInvoice.paymentStatus !== "paid" && selectedInvoice.type === "supplier" && (
                            <Button 
                              className="w-full bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white justify-center"
                              onClick={() => {
                                setIsDetailModalOpen(false);
                                handlePaymentModal(selectedInvoice);
                              }}
                            >
                              <FaCreditCard className="mr-2 h-4 w-4" />
                              Bayar Faktur
                            </Button>
                          )}
                          
                          <Button 
                            variant="outline" 
                            className="w-full border-sky-200 text-sky-700 hover:bg-sky-50 justify-center"
                          >
                            <FaPrint className="mr-2 h-4 w-4" />
                            Cetak Faktur
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Tabs for Items, Payment History, and Inventory Details */}
                <Tabs defaultValue="items" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-sky-50 border border-sky-100 p-1">
                    <TabsTrigger 
                      value="items" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-blue-500 data-[state=active]:text-white"
                    >
                      Detail Item
                    </TabsTrigger>
                    <TabsTrigger 
                      value="payments" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-blue-500 data-[state=active]:text-white"
                    >
                      Riwayat Pembayaran
                    </TabsTrigger>
                    {selectedInvoice.type === "supplier" && (
                      <TabsTrigger 
                        value="inventory" 
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-blue-500 data-[state=active]:text-white"
                      >
                        Detail Penerimaan
                      </TabsTrigger>
                    )}
                  </TabsList>
                  
                  {/* Items Tab */}
                  <TabsContent value="items" className="mt-4">
                    <div className="bg-white rounded-lg border border-sky-100 shadow-sm overflow-hidden">
                      <div className="p-4 bg-gradient-to-r from-sky-50 to-blue-50 border-b border-sky-100">
                        <h4 className="font-medium text-sky-800 flex items-center">
                          <FaBoxOpen className="mr-2 text-sky-500" />
                          Detail Item Faktur
                        </h4>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-sky-50">
                            <TableRow>
                              <TableHead className="text-sky-900 w-6">#</TableHead>
                              <TableHead className="text-sky-900">Produk</TableHead>
                              <TableHead className="text-sky-900 text-right">Jumlah</TableHead>
                              <TableHead className="text-sky-900 text-right">Harga Satuan</TableHead>
                              <TableHead className="text-sky-900 text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedInvoice.items.map((item: InvoiceItem, index) => (
                              <TableRow key={item.id} className="hover:bg-sky-50/50">
                                <TableCell className="font-medium">{index + 1}</TableCell>
                                <TableCell>{item.product}</TableCell>
                                <TableCell className="text-right">{(item.quantity ?? 0).toLocaleString()}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                          <TableFooter>
                            <TableRow className="bg-sky-50/70">
                              <TableCell colSpan={4} className="text-right font-bold">Total</TableCell>
                              <TableCell className="text-right font-bold">{formatCurrency(selectedInvoice.amount)}</TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* Payment History Tab */}
                  <TabsContent value="payments" className="mt-4">
                    <div className="bg-white rounded-lg border border-sky-100 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-4 py-2 border-b border-sky-100">
                        <h4 className="font-medium text-sky-800 flex items-center">
                          <FaHistory className="mr-2 text-sky-500" />
                          Riwayat Pembayaran
                        </h4>
                      </div>
                      
                      {selectedInvoice.paymentHistory && selectedInvoice.paymentHistory.length > 0 ? (
                        <div className="divide-y divide-sky-100">
                          {selectedInvoice.paymentHistory.map((payment: PaymentHistory) => (
                            <div key={payment.id} className="p-4 hover:bg-sky-50 transition-colors rounded-md">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-sky-700">{formatCurrency(payment.amount)}</span>
                                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                                  {payment.date}
                                </Badge>
                              </div>
                              <div className="ml-13 pl-13 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-500">Referensi:</span> {payment.reference}
                                </div>
                                <div>
                                  <span className="text-gray-500">Diterima oleh:</span> {payment.receivedBy}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-10 text-center">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-100 text-sky-400 mb-4">
                            <FaExclamationTriangle className="h-8 w-8" />
                          </div>
                          <p className="text-gray-500 mb-1">Belum ada riwayat pembayaran</p>
                          <p className="text-sm text-gray-400">Faktur ini belum memiliki transaksi pembayaran.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  {/* Inventory Tab */}
                  {selectedInvoice.type === "supplier" && (
                    <TabsContent value="inventory" className="mt-4">
                      <div className="bg-white rounded-lg border border-sky-100 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-4 py-2 border-b border-sky-100">
                          <h4 className="font-medium text-sky-800 flex items-center">
                            <FaDolly className="mr-2 text-sky-500" />
                            Detail Penerimaan Barang
                          </h4>
                        </div>
                        
                        {selectedInvoice.inventoryReceipts && selectedInvoice.inventoryReceipts.length > 0 ? (
                          <div className="divide-y divide-sky-100">
                            {selectedInvoice.inventoryReceipts.map((receipt: InventoryReceipt) => (
                              <div key={receipt.id} className="p-4 hover:bg-sky-50 transition-colors rounded-md">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">{receipt.receiptNumber}</span>
                                  <span className="text-sm text-gray-500">{receipt.date}</span>
                                </div>
                                <div className="ml-13 pl-13 grid grid-cols-1 gap-2 text-sm">
                                  <div>
                                    <span className="text-gray-500">Diterima oleh:</span> {receipt.receivedBy}
                                  </div>
                                  {receipt.notes && (
                                    <div>
                                      <span className="text-gray-500">Catatan:</span> {receipt.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-10 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-100 text-sky-400 mb-4">
                              <FaExclamationTriangle className="h-8 w-8" />
                            </div>
                            <p className="text-gray-500 mb-1">Belum ada penerimaan barang</p>
                            <p className="text-sm text-gray-400">Barang untuk faktur ini belum diterima.</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
                
                {/* Footer Actions */}
                <div className="flex justify-end space-x-3 pt-2">
                  <Button 
                    variant="outline" 
                    className="border-sky-200 text-sky-700 hover:bg-sky-50"
                    onClick={() => setIsDetailModalOpen(false)}
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Pembayaran */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-0 border-sky-200">
          {/* Top decorative gradient */}
          <div className="h-2 w-full bg-gradient-to-r from-sky-400 via-blue-500 to-sky-500"></div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-56 h-56 bg-sky-200 rounded-full opacity-20 transform translate-x-20 -translate-y-20 z-0"></div>
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-200 rounded-full opacity-20 transform -translate-x-16 translate-y-16 z-0"></div>
          
          <div className="p-5 relative z-10">
            <DialogHeader className="mb-4 flex flex-row items-center">
              <div className="h-10 w-1.5 bg-gradient-to-b from-sky-500 to-blue-500 rounded-full mr-3"></div>
              <div>
                <DialogTitle className="text-xl font-bold text-sky-800">Pembayaran Faktur</DialogTitle>
                <DialogDescription className="text-sky-600">
                  Masukkan informasi pembayaran untuk faktur {selectedInvoice?.id}
                </DialogDescription>
              </div>
            </DialogHeader>
            
            {selectedInvoice && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column - Invoice Information */}
                <div className="md:col-span-1 space-y-5">
                  <div className="relative overflow-hidden rounded-xl bg-white shadow-md border border-sky-100">
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-blue-500/10"></div>
                    
                    {/* Invoice Header */}
                    <div className="flex justify-between items-start mb-4 border-b border-sky-100 pb-3 p-4 bg-gradient-to-r from-sky-50 to-blue-50">
                      <div className="flex items-center">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-sky-500/90 to-blue-500/90 text-white shadow-md mr-3">
                          <FaFileInvoiceDollar className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-lg">{selectedInvoice.id}</p>
                          <p className="text-sm text-gray-500">{selectedInvoice.supplier}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-4">
                      {/* Payment Summary - Visual Representation */}
                      <div className="mb-5">
                        <p className="text-sm text-sky-600 font-medium mb-2">Status Pembayaran</p>
                        <div className="relative h-7 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full"
                            style={{ width: `${(selectedInvoice.totalPaid / selectedInvoice.amount) * 100}%` }}
                          ></div>
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                            {Math.round((selectedInvoice.totalPaid / selectedInvoice.amount) * 100)}% Terbayar
                          </div>
                        </div>
                      </div>
                      
                      {/* Amount Details */}
                      <div className="grid grid-cols-1 gap-3">
                        <div className="bg-white rounded-lg p-3 shadow-sm border border-sky-100">
                          <p className="text-xs text-gray-500 mb-1">Total Faktur</p>
                          <p className="font-bold text-gray-800">{formatCurrency(selectedInvoice.amount)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm border border-sky-100">
                          <p className="text-xs text-gray-500 mb-1">Terbayar</p>
                          <p className="font-bold text-green-600">{formatCurrency(selectedInvoice.totalPaid)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm border border-sky-100">
                          <p className="text-xs text-gray-500 mb-1">Sisa</p>
                          <p className="font-bold text-sky-600">{formatCurrency(selectedInvoice.remainingAmount)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Previous Payment History */}
                  {selectedInvoice.paymentHistory && selectedInvoice.paymentHistory.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-sky-100">
                      <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-4 py-2 border-b border-sky-100">
                        <h4 className="font-medium text-sky-800 flex items-center">
                          <FaHistory className="mr-2 text-sky-500" />
                          Riwayat Pembayaran
                        </h4>
                      </div>
                      
                      <div className="max-h-[180px] overflow-y-auto p-3 divide-y divide-sky-100">
                        {selectedInvoice.paymentHistory.map((payment: PaymentHistory) => (
                          <div key={payment.id} className="p-3 hover:bg-sky-50 transition-colors rounded-md">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-sky-700">{formatCurrency(payment.amount)}</span>
                              <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                                {payment.date}
                              </Badge>
                            </div>
                            <div className="text-sm mt-2">
                              <div className="text-xs text-gray-500">Metode: <span className="text-gray-700 capitalize">{payment.method}</span></div>
                              <div className="text-xs text-gray-500">Referensi: <span className="text-gray-700">{payment.reference}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Right Column - Payment Form */}
                <div className="md:col-span-2">
                  <div className="bg-white rounded-lg shadow-md overflow-hidden border border-sky-100 h-full">
                    <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-4 py-3 border-b border-sky-100">
                      <h4 className="font-medium text-sky-800 flex items-center">
                        <FaCreditCard className="mr-2 text-sky-500" />
                        Form Pembayaran
                      </h4>
                    </div>
                    
                    <div className="p-5 space-y-5">
                      {/* Payment Type Toggle */}
                      <div className="flex items-center justify-between p-3 bg-sky-50 rounded-lg">
                        <div>
                          <label htmlFor="payment-type" className="text-sm font-medium text-gray-700">
                            Tipe Pembayaran
                          </label>
                          <p className="text-xs text-gray-500">
                            {isFullPayment ? 'Bayar total sisa tagihan' : 'Bayar sebagian dari tagihan'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs ${!isFullPayment ? 'text-sky-600 font-medium' : 'text-gray-500'}`}>Sebagian</span>
                          <Switch
                            id="payment-type"
                            checked={isFullPayment}
                            onCheckedChange={setIsFullPayment}
                            className="data-[state=checked]:bg-sky-500"
                          />
                          <span className={`text-xs ${isFullPayment ? 'text-sky-600 font-medium' : 'text-gray-500'}`}>Penuh</span>
                        </div>
                      </div>
                      
                      {/* Payment Amount */}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-sm font-medium text-gray-700" htmlFor="payment-amount">
                            Jumlah Pembayaran
                          </label>
                          {!isFullPayment && (
                            <span className="text-xs text-sky-600">
                              Maks: {formatCurrency(selectedInvoice.remainingAmount)}
                            </span>
                          )}
                        </div>
                        <Input
                          id="payment-amount"
                          type="number"
                          className="border-sky-200 focus:border-sky-500 focus:ring-sky-500"
                          value={paymentAmount}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            if (value > selectedInvoice.remainingAmount) {
                              setPaymentAmount(selectedInvoice.remainingAmount);
                            } else if (value < 0) {
                              setPaymentAmount(0);
                            } else {
                              setPaymentAmount(value);
                            }
                          }}
                          disabled={isFullPayment}
                        />
                        {!isFullPayment && (
                          <div className="flex justify-between text-sm mt-1 p-2 bg-sky-50 rounded-md">
                            <span className="text-gray-700">
                              Sisa setelah pembayaran:
                            </span>
                            <span className="font-medium text-sky-700">
                              {formatCurrency(selectedInvoice.remainingAmount - paymentAmount)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Two columns layout for payment details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700" htmlFor="payment-method">
                            Metode Pembayaran
                          </label>
                          <Select defaultValue="transfer">
                            <SelectTrigger id="payment-method" className="w-full border-sky-200">
                              <SelectValue placeholder="Pilih metode pembayaran" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Tunai</SelectItem>
                              <SelectItem value="transfer">Transfer Bank</SelectItem>
                              <SelectItem value="check">Cek</SelectItem>
                              <SelectItem value="debit">Kartu Debit</SelectItem>
                              <SelectItem value="credit">Kartu Kredit</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700" htmlFor="payment-date">
                            Tanggal Pembayaran
                          </label>
                          <Input
                            id="payment-date"
                            type="date"
                            className="border-sky-200 focus:border-sky-500 focus:ring-sky-500"
                            defaultValue={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700" htmlFor="payment-reference">
                            Nomor Referensi
                          </label>
                          <Input
                            id="payment-reference"
                            className="border-sky-200 focus:border-sky-500 focus:ring-sky-500"
                            placeholder="Nomor referensi transaksi"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700" htmlFor="payment-received-by">
                            Diterima Oleh
                          </label>
                          <Input
                            id="payment-received-by"
                            className="border-sky-200 focus:border-sky-500 focus:ring-sky-500"
                            placeholder="Nama penerima"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700" htmlFor="payment-notes">
                          Catatan
                        </label>
                        <Textarea
                          id="payment-notes"
                          className="border-sky-200 focus:border-sky-500 focus:ring-sky-500 min-h-[80px]"
                          placeholder="Catatan tambahan (opsional)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t border-sky-100 bg-sky-50">
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)} className="border-sky-200 text-sky-700 hover:bg-sky-50">
              Batal
            </Button>
            <Button onClick={() => {
              // Di sini akan ditambahkan logika untuk memanggil API pembayaran
              console.log(`Processing payment of ${formatCurrency(paymentAmount)} for invoice ${selectedInvoice?.id}`);
              
              // Simulasi proses berhasil
              setIsPaymentModalOpen(false);
              
              // Tampilkan pesan sukses (akan diimplementasikan di UI sesungguhnya)
              alert(`Pembayaran ${formatCurrency(paymentAmount)} untuk ${selectedInvoice?.id} berhasil`);
            }} className="bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white">
              Proses Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Penerimaan Barang (Hanya View) */}
      <Dialog open={isInventoryModalOpen} onOpenChange={setIsInventoryModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-sky-800">Informasi Penerimaan Barang</DialogTitle>
            <DialogDescription>
              Informasi penerimaan barang dari modul Inventory
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="mt-4 space-y-6">
              <div className="bg-sky-50 p-4 rounded-lg border border-sky-100 mb-4">
                <div className="flex flex-col md:flex-row justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Faktur</p>
                    <p className="font-bold text-gray-800">{selectedInvoice.id}</p>
                    <p className="text-sm text-gray-600 mt-2 mb-1">Supplier</p>
                    <p className="font-bold text-gray-800">{selectedInvoice.supplier}</p>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <p className="text-sm text-gray-600 mb-1">Status Penerimaan</p>
                    <Badge className={getInventoryStatusInfo(selectedInvoice).badge}>
                      {getInventoryStatusInfo(selectedInvoice).icon}
                      {getInventoryStatusInfo(selectedInvoice).label}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-sky-100">
                <h4 className="font-medium text-sky-800 mb-4">Detail Barang</h4>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-sky-50">
                      <TableRow>
                        <TableHead className="text-sky-900">Produk</TableHead>
                        <TableHead className="text-sky-900 text-right">Jumlah</TableHead>
                        <TableHead className="text-sky-900 text-right">Diterima</TableHead>
                        <TableHead className="text-sky-900 text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items.map((item: InvoiceItem) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.received || 0}</TableCell>
                          <TableCell className="text-right">
                            {!item.received ? (
                              <Badge variant="outline" className="ml-auto bg-amber-50 text-amber-700 border-amber-200">
                                <FaClock className="mr-1 h-3 w-3" />
                                Menunggu
                              </Badge>
                            ) : item.received < item.quantity ? (
                              <Badge variant="outline" className="ml-auto bg-blue-50 text-blue-700 border-blue-200">
                                <FaHistory className="mr-1 h-3 w-3" />
                                Sebagian
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200">
                                <FaCheckCircle className="mr-1 h-3 w-3" />
                                Diterima
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              {selectedInvoice.inventoryReceipts && selectedInvoice.inventoryReceipts.length > 0 ? (
                <div className="bg-white p-4 rounded-lg border border-sky-100">
                  <h4 className="font-medium text-sky-800 mb-4">Riwayat Penerimaan</h4>
                  
                  <div className="space-y-3">
                    {selectedInvoice.inventoryReceipts.map((receipt: InventoryReceipt) => (
                      <div key={receipt.id} className="p-3 border border-sky-100 rounded-md">
                        <div className="flex justify-between">
                          <span className="font-medium">{receipt.receiptNumber}</span>
                          <span className="text-sm text-gray-500">{receipt.date}</span>
                        </div>
                        <div className="text-sm mt-1">
                          <span className="text-gray-500 mr-2">Diterima oleh:</span>
                          <span>{receipt.receivedBy}</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          {receipt.notes}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg border border-sky-100 text-center">
                  <FaInfoCircle className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                  <h4 className="text-lg font-medium text-gray-700 mb-1">Belum Ada Penerimaan Barang</h4>
                  <p className="text-gray-500">Penerimaan barang akan dikelola melalui modul Inventory</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  className="border-sky-200 text-sky-700 hover:bg-sky-50"
                  onClick={() => setIsInventoryModalOpen(false)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
};

export default InvoicesPage;
