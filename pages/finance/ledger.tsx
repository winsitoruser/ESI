import { NextPage } from "next";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import FinanceLayout from "@/components/layouts/finance-layout";
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  FaFileInvoiceDollar,
  FaSearch,
  FaPlus,
  FaDownload,
  FaFilter,
  FaCalendarAlt,
  FaBuilding,
  FaExclamationTriangle,
  FaInfoCircle,
  FaClipboardList,
  FaTrash,
  FaEdit,
  FaTimes,
  FaChevronLeft,
  FaBalanceScale,
  FaCheck,
  FaChevronRight,
  FaFilePdf,
  FaFileExcel,
  FaFileCsv,
  FaSortAmountUp,
  FaSortAmountDown,
  FaCreditCard
} from "react-icons/fa";

// Define types for the general ledger functionality
interface LedgerEntry {
  id: string;
  date: string;
  referenceNumber: string;
  description: string;
  account: string;
  debit: number;
  credit: number;
  invoiceId?: string;
  transactionType?: string;
  documentNumber?: string;
  accountCode?: string;
  branchId?: string;
  status?: 'verified' | 'pending' | 'rejected';
}

// Type for journal entry form
interface JournalEntryLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
}

// Account structure to match SAK standards
interface Account {
  code: string;
  name: string;
  category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subCategory?: string;
  normalBalance: 'debit' | 'credit';
}

// Mock accounts based on SAK (Indonesian Accounting Standards)
const mockAccounts: Account[] = [
  // Asset (Aktiva) accounts - 1-XXXX series
  { code: "1-1100", name: "Kas", category: "asset", normalBalance: "debit" },
  { code: "1-1200", name: "Kas Bank", category: "asset", normalBalance: "debit" },
  { code: "1-1300", name: "Piutang Dagang", category: "asset", normalBalance: "debit" },
  { code: "1-1400", name: "Persediaan Barang Dagang", category: "asset", normalBalance: "debit" },
  { code: "1-2100", name: "Perlengkapan Kantor", category: "asset", normalBalance: "debit" },
  { code: "1-2200", name: "Peralatan", category: "asset", normalBalance: "debit" },
  { code: "1-2300", name: "Akumulasi Penyusutan Peralatan", category: "asset", normalBalance: "credit" },
  
  // Liability (Kewajiban) accounts - 2-XXXX series
  { code: "2-1100", name: "Hutang Dagang", category: "liability", normalBalance: "credit" },
  { code: "2-1200", name: "Hutang Gaji", category: "liability", normalBalance: "credit" },
  { code: "2-1300", name: "Hutang Pajak", category: "liability", normalBalance: "credit" },
  { code: "2-2100", name: "Hutang Bank", category: "liability", normalBalance: "credit" },
  
  // Equity (Ekuitas) accounts - 3-XXXX series
  { code: "3-1000", name: "Modal Pemilik", category: "equity", normalBalance: "credit" },
  { code: "3-2000", name: "Prive", category: "equity", normalBalance: "debit" },
  { code: "3-3000", name: "Laba Ditahan", category: "equity", normalBalance: "credit" },
  
  // Revenue (Pendapatan) accounts - 4-XXXX series
  { code: "4-1000", name: "Pendapatan Penjualan", category: "revenue", normalBalance: "credit" },
  { code: "4-2000", name: "Pendapatan Jasa", category: "revenue", normalBalance: "credit" },
  { code: "4-3000", name: "Pendapatan Lain-lain", category: "revenue", normalBalance: "credit" },
  
  // Expense (Beban) accounts - 5-XXXX series
  { code: "5-1000", name: "Beban Gaji", category: "expense", normalBalance: "debit" },
  { code: "5-2000", name: "Beban Sewa", category: "expense", normalBalance: "debit" },
  { code: "5-3000", name: "Beban Listrik & Air", category: "expense", normalBalance: "debit" },
  { code: "5-4000", name: "Beban Iklan", category: "expense", normalBalance: "debit" },
  { code: "5-5000", name: "Beban Penyusutan", category: "expense", normalBalance: "debit" },
  { code: "5-6000", name: "Harga Pokok Penjualan", category: "expense", normalBalance: "debit" },
  { code: "5-7000", name: "Beban Lain-lain", category: "expense", normalBalance: "debit" },
];

// Mock data for the ledger
const mockLedgerEntries: LedgerEntry[] = [
  {
    id: "JRN-2025-001",
    date: "15 Mar 2025",
    referenceNumber: "TRX-001",
    description: "Pembayaran faktur pembelian",
    account: "Hutang Dagang",
    accountCode: "2-1100",
    debit: 2000000,
    credit: 0,
    status: "verified"
  },
  {
    id: "JRN-2025-001",
    date: "15 Mar 2025",
    referenceNumber: "TRX-001",
    description: "Pembayaran faktur pembelian",
    account: "Kas",
    accountCode: "1-1100",
    debit: 0,
    credit: 2000000,
    status: "verified"
  },
  {
    id: "JRN-2025-002",
    date: "16 Mar 2025",
    referenceNumber: "TRX-002",
    description: "Penjualan tunai",
    account: "Kas",
    accountCode: "1-1100",
    debit: 1500000,
    credit: 0,
    status: "verified"
  },
  {
    id: "JRN-2025-002",
    date: "16 Mar 2025",
    referenceNumber: "TRX-002",
    description: "Penjualan tunai",
    account: "Pendapatan Penjualan",
    accountCode: "4-1000",
    debit: 0,
    credit: 1500000,
    status: "verified"
  },
  {
    id: "JRN-2025-003",
    date: "17 Mar 2025",
    referenceNumber: "TRX-003",
    description: "Pembayaran gaji karyawan",
    account: "Beban Gaji",
    accountCode: "5-1000",
    debit: 3000000,
    credit: 0,
    status: "pending"
  },
  {
    id: "JRN-2025-003",
    date: "17 Mar 2025",
    referenceNumber: "TRX-003",
    description: "Pembayaran gaji karyawan",
    account: "Kas",
    accountCode: "1-1100",
    debit: 0,
    credit: 3000000,
    status: "pending"
  },
  {
    id: "JRN-2025-004",
    date: "20 Mar 2025",
    referenceNumber: "TRX-004",
    description: "Pembelian perlengkapan kantor",
    account: "Perlengkapan Kantor",
    accountCode: "1-2100",
    debit: 500000,
    credit: 0,
    status: "verified"
  },
  {
    id: "JRN-2025-004",
    date: "20 Mar 2025",
    referenceNumber: "TRX-004",
    description: "Pembelian perlengkapan kantor",
    account: "Kas",
    accountCode: "1-1100",
    debit: 0,
    credit: 500000,
    status: "verified"
  },
];

// Fungsi untuk format Rp currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const LedgerPage: NextPage = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { invoiceId } = router.query;
  
  // State for data
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pharmacyInfo, setPharmacyInfo] = useState<any>(null);
  const [branchInfo, setBranchInfo] = useState<any>(null);
  
  // State for filters
  const [currentTab, setCurrentTab] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({
    key: 'date',
    direction: 'descending'
  });
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  // State for journal entry form
  const [journalEntryModal, setJournalEntryModal] = useState<boolean>(false);
  const [journalDate, setJournalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [journalReference, setJournalReference] = useState<string>("");
  const [journalDescription, setJournalDescription] = useState<string>("");
  const [journalLines, setJournalLines] = useState<JournalEntryLine[]>([
    {
      id: crypto.randomUUID(), // Generate unique id for each line
      accountCode: "",
      accountName: "",
      debit: 0,
      credit: 0,
      description: ""
    }
  ]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  
  // State for export modal
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<string>("pdf");
  
  // Fetch data function
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Immediately set mock data for fallback
      setEntries(mockLedgerEntries);
      
      // Build the query params
      const params = new URLSearchParams();
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);
      if (filterAccount !== 'all') params.append('account', filterAccount);
      if (filterBranch !== 'all') params.append('branchId', filterBranch);
      if (searchTerm) params.append('searchText', searchTerm);
      
      // Fetch data from API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
      
      const response = await fetch(`/api/finance/ledger?${params.toString()}`, {
        signal: controller.signal
      }).catch(err => {
        console.error('Fetch error:', err);
        throw new Error('Timeout or network error occurred');
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update state with fetched data
      if (data.entries && data.entries.length > 0) {
        setEntries(data.entries);
      }
      // Keep mock data if API returns empty entries
      
      if (data.pharmacyInfo) {
        setPharmacyInfo(data.pharmacyInfo);
      }
      
      if (data.branchInfo) {
        setBranchInfo(data.branchInfo);
      }
      
    } catch (err) {
      console.error('Error fetching ledger data:', err);
      setError('Failed to load data from database. Using local data as fallback.');
      // Mock data is already set above
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);
  
  // Refetch when filters change
  useEffect(() => {
    if (!loading) {
      fetchData();
    }
  }, [filterStartDate, filterEndDate, filterAccount, filterBranch, searchTerm]);
  
  // Function to handle sorting
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  // Get sorted and filtered items
  const getSortedItems = (items: LedgerEntry[]) => {
    if (!items || items.length === 0) return [];
    
    let filteredItems = [...items];
    
    // Filter by tab (transaction status)
    if (currentTab !== "all") {
      filteredItems = filteredItems.filter(item => item.status === currentTab);
    }
    
    // Apply sorting
    return [...filteredItems].sort((a, b) => {
      if (a[sortConfig.key as keyof LedgerEntry] < b[sortConfig.key as keyof LedgerEntry]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key as keyof LedgerEntry] > b[sortConfig.key as keyof LedgerEntry]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };
  
  // Calculate pagination
  const sortedItems = getSortedItems(entries);
  const totalItems = sortedItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedItems.slice(indexOfFirstItem, indexOfLastItem);
  
  // Calculate totals
  const totalDebit = currentItems.reduce((total, item) => total + item.debit, 0);
  const totalCredit = currentItems.reduce((total, item) => total + item.credit, 0);
  
  // Apply search filter directly before pagination
  const applySearch = () => {
    fetchData();
  };
  
  // Journal Entry Form Handlers
  const openJournalEntryModal = () => {
    // Reset form state
    setJournalDate(new Date().toISOString().split('T')[0]);
    setJournalReference(`REF-${new Date().getTime().toString().slice(-6)}`);
    setJournalDescription("");
    setJournalLines([
      {
        id: crypto.randomUUID(),
        accountCode: "",
        accountName: "",
        debit: 0,
        credit: 0,
        description: ""
      }
    ]);
    setFormErrors({});
    setJournalEntryModal(true);
  };
  
  const submitJournalEntry = async () => {
    // Validate form before submitting
    const validation = validateJournalEntry();
    if (!validation.valid) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Prepare data for submission
      const journalData = {
        journalDate,
        referenceNumber: journalReference,
        description: journalDescription,
        journalLines: journalLines.map(line => ({
          accountCode: line.accountCode,
          accountName: line.accountName,
          debit: line.debit,
          credit: line.credit,
          description: line.description
        })),
        branchId: filterBranch !== 'all' ? filterBranch : 'branch1',
        status: 'pending'
      };
      
      // Send data to API
      const response = await fetch('/api/finance/ledger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(journalData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit journal entry');
      }
      
      const result = await response.json();
      
      // Close modal and refresh data
      setJournalEntryModal(false);
      
      // Show success message
      alert("Journal entry has been created successfully");
      
      // Refresh data
      fetchData();
      
    } catch (error) {
      console.error('Error submitting journal entry:', error);
      
      // Show error message
      alert("Failed to submit journal entry");
      
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <FinanceLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Buku Besar</h1>
            <p className="text-gray-600">Mengelola transaksi akuntansi dan jurnal</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={openJournalEntryModal}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-md"
            >
              <FaPlus className="h-4 w-4 mr-2" /> Jurnal Baru
            </Button>
            
            <Button 
              variant="outline" 
              className="border-orange-300 hover:border-red-400"
              onClick={() => setExportModalOpen(true)}
            >
              <FaDownload className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </div>
        
        {/* Filter Card */}
        <Card>
          <CardHeader className="py-4 px-6 bg-gradient-to-r from-orange-50 to-red-50/30 border-b border-orange-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent font-bold">Filter & Pencarian</CardTitle>
                <CardDescription>Filter transaksi buku besar berdasarkan periode, akun, atau cabang</CardDescription>
              </div>
              
              {/* Tabs for filtering by status */}
              <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full sm:w-auto">
                <TabsList className="bg-gradient-to-r from-orange-100 to-red-100/50 p-1">
                  <TabsTrigger 
                    value="all" 
                    className="data-[state=active]:bg-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:bg-clip-text data-[state=active]:text-transparent"
                  >
                    Semua
                  </TabsTrigger>
                  <TabsTrigger 
                    value="verified" 
                    className="data-[state=active]:bg-white data-[state=active]:text-green-700"
                  >
                    <FaCheck className="h-3 w-3 mr-1" /> Terverifikasi
                  </TabsTrigger>
                  <TabsTrigger 
                    value="pending" 
                    className="data-[state=active]:bg-white data-[state=active]:text-amber-700"
                  >
                    <FaExclamationTriangle className="h-3 w-3 mr-1" /> Pending
                  </TabsTrigger>
                  <TabsTrigger 
                    value="billing" 
                    className="data-[state=active]:bg-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:bg-clip-text data-[state=active]:text-transparent"
                  >
                    <FaCreditCard className="h-3 w-3 mr-1" /> Transaksi Billing
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <div className="relative w-full sm:max-w-xs">
                <Input 
                  type="text"
                  placeholder="Cari transaksi..."
                  className="pl-10 border-orange-300 focus:border-red-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>
              
              <Button 
                onClick={applySearch}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
              >
                <FaSearch className="h-4 w-4 mr-2" /> Cari
              </Button>
              
              <div className="flex-1"></div>
              
              <div className="flex items-center space-x-2">
                <Label htmlFor="itemsPerPage" className="text-gray-700">Tampilkan:</Label>
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20 border-orange-300">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Main Ledger Table Card */}
        <Card>
          <CardHeader className="py-4 px-6 bg-gradient-to-r from-orange-50 to-red-50/30 border-b border-orange-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent font-bold">Buku Besar General</CardTitle>
                <CardDescription>
                  {loading ? (
                    <span className="flex items-center">
                      <span className="animate-pulse mr-2">Loading data...</span>
                    </span>
                  ) : error ? (
                    <span className="flex items-center text-amber-600">
                      <FaExclamationTriangle className="h-3 w-3 mr-1" /> 
                      {error}
                    </span>
                  ) : (
                    <span>Menampilkan {currentItems.length} dari {totalItems} transaksi</span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-to-r from-orange-50 to-red-50/30">
                  <TableRow>
                    <TableHead 
                      className="w-[200px] cursor-pointer hover:text-red-600 font-semibold"
                      onClick={() => requestSort('date')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Tanggal</span>
                        {sortConfig.key === 'date' && (
                          sortConfig.direction === 'ascending' ? 
                            <FaSortAmountUp className="h-3 w-3" /> : 
                            <FaSortAmountDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-red-600 font-semibold"
                      onClick={() => requestSort('referenceNumber')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>No. Referensi</span>
                        {sortConfig.key === 'referenceNumber' && (
                          sortConfig.direction === 'ascending' ? 
                            <FaSortAmountUp className="h-3 w-3" /> : 
                            <FaSortAmountDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-red-600 font-semibold"
                      onClick={() => requestSort('description')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Deskripsi</span>
                        {sortConfig.key === 'description' && (
                          sortConfig.direction === 'ascending' ? 
                            <FaSortAmountUp className="h-3 w-3" /> : 
                            <FaSortAmountDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-red-600 font-semibold"
                      onClick={() => requestSort('account')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Akun</span>
                        {sortConfig.key === 'account' && (
                          sortConfig.direction === 'ascending' ? 
                            <FaSortAmountUp className="h-3 w-3" /> : 
                            <FaSortAmountDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Kredit</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10">
                        <div className="flex flex-col items-center justify-center">
                          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500 mb-4"></div>
                          <p className="text-gray-500">Loading data...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : currentItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10">
                        <div className="flex flex-col items-center justify-center">
                          <FaClipboardList className="h-16 w-16 text-red-200 mb-4" />
                          <p className="text-gray-600 font-medium">Belum ada data jurnal</p>
                          <p className="text-sm text-gray-400 mt-1">Silakan tambahkan jurnal baru atau ubah filter pencarian</p>
                          <Button
                            onClick={openJournalEntryModal}
                            className="mt-4 bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-md"
                            size="sm"
                          >
                            <FaPlus className="h-4 w-4 mr-2" /> Tambah Jurnal Baru
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentItems.map((item, index) => (
                      <TableRow key={`${item.id}-${item.account}-${index}`} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50/20">
                        <TableCell className="font-medium">
                          {item.date}
                        </TableCell>
                        <TableCell>
                          {item.referenceNumber}
                        </TableCell>
                        <TableCell>
                          {item.description}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{item.account}</span>
                            {item.accountCode && (
                              <span className="text-xs text-gray-500">{item.accountCode}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.debit > 0 ? formatCurrency(item.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.credit > 0 ? formatCurrency(item.credit) : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.status === "verified" ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <FaCheck className="h-2.5 w-2.5 mr-1" />
                              Terverifikasi
                            </Badge>
                          ) : item.status === "pending" ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <FaExclamationTriangle className="h-2.5 w-2.5 mr-1" />
                              Pending
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <FaTimes className="h-2.5 w-2.5 mr-1" />
                              Ditolak
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                
                <TableFooter className="bg-gradient-to-r from-orange-100 to-red-100/50">
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-bold">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent">
                      {formatCurrency(totalDebit)}
                    </TableCell>
                    <TableCell className="text-right font-bold bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent">
                      {formatCurrency(totalCredit)}
                    </TableCell>
                    <TableCell className="text-center">
                      {totalDebit === totalCredit ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <FaCheck className="h-2.5 w-2.5 mr-1" />
                          Seimbang
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <FaTimes className="h-2.5 w-2.5 mr-1" />
                          Tidak Seimbang
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {/* SAK Information Section */}
        <div className="bg-gradient-to-r from-orange-50/30 to-red-50/20 rounded-lg border border-orange-200 shadow-sm p-4 text-sm">
          <h3 className="font-bold bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent mb-2 flex items-center">
            <FaInfoCircle className="mr-2 text-red-500" />
            Informasi Standar Akuntansi Keuangan (SAK)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="font-medium text-gray-700">Struktur Kode Akun:</p>
              <ul className="list-disc list-inside text-gray-600">
                <li>1-xxxx: Aset</li>
                <li>2-xxxx: Kewajiban</li>
                <li>3-xxxx: Ekuitas</li>
                <li>4-xxxx: Pendapatan</li>
                <li>5-xxxx: Beban</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-gray-700">Prinsip Dasar:</p>
              <ul className="list-disc list-inside text-gray-600">
                <li>Total Debit = Total Kredit</li>
                <li>Aset = Kewajiban + Ekuitas</li>
                <li>Pendapatan - Beban = Laba/Rugi</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-gray-700">Integrasi:</p>
              <ul className="list-disc list-inside text-gray-600">
                <li>Terintegrasi dengan modul Penjualan</li>
                <li>Terintegrasi dengan modul Pembelian</li>
                <li>Terintegrasi dengan modul Inventaris</li>
                <li>Laporan tersedia di modul Laporan Keuangan</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Journal Entry Modal */}
        {journalEntryModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-5xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col relative">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-56 h-56 bg-orange-100 rounded-full opacity-10 transform translate-x-20 -translate-y-20 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-amber-100 rounded-full opacity-10 transform -translate-x-20 translate-y-20 blur-3xl"></div>
              
              {/* Header with gradient bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>
              <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-sm mr-3">
                      <FaFileInvoiceDollar className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-orange-800">Tambah Entri Jurnal Baru</h3>
                      <p className="text-orange-600/70 text-sm">Sesuai dengan Standar Akuntansi Keuangan (SAK)</p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setJournalEntryModal(false);
                      setFormErrors({});
                    }}
                    className="h-8 w-8 p-1 rounded-full hover:bg-orange-100 text-gray-500 hover:text-gray-700"
                  >
                    <FaTimes className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Body (scrollable) */}
              <div className="flex-1 overflow-y-auto p-6">
                {formErrors.general && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                    <div className="flex items-center">
                      <FaExclamationTriangle className="h-4 w-4 mr-2 text-red-500" />
                      {formErrors.general}
                    </div>
                  </div>
                )}
                
                {/* Journal Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <Label htmlFor="journal-date" className="text-gray-700 mb-1 block">Tanggal</Label>
                    <Input
                      id="journal-date"
                      type="date"
                      value={journalDate}
                      onChange={(e) => setJournalDate(e.target.value)}
                      className="border-orange-200 focus-visible:ring-orange-500"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="journal-reference" className="text-gray-700 mb-1 block">Nomor Referensi</Label>
                    <Input
                      id="journal-reference"
                      value={journalReference}
                      onChange={(e) => setJournalReference(e.target.value)}
                      className="border-orange-200 focus-visible:ring-orange-500"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="journal-description" className="text-gray-700 mb-1 block">Deskripsi Jurnal</Label>
                    <Input
                      id="journal-description"
                      placeholder="Contoh: Pembayaran gaji karyawan untuk bulan Maret 2025"
                      value={journalDescription}
                      onChange={(e) => setJournalDescription(e.target.value)}
                      className="border-orange-200 focus-visible:ring-orange-500"
                    />
                  </div>
                </div>
                
                {/* Journal Entry Lines */}
                <div className="mb-4">
                  <h4 className="text-gray-800 font-medium mb-2 flex items-center">
                    <FaInfoCircle className="mr-2 text-orange-500 h-4 w-4" />
                    Detail Jurnal
                  </h4>
                  
                  <div className="border border-orange-100 rounded-lg overflow-hidden">
                    <div className="bg-orange-50 p-3 border-b border-orange-100">
                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-700">
                        <div className="col-span-4">Akun</div>
                        <div className="col-span-3">Deskripsi</div>
                        <div className="col-span-2 text-right">Debit</div>
                        <div className="col-span-2 text-right">Kredit</div>
                        <div className="col-span-1"></div>
                      </div>
                    </div>
                    
                    <div className="p-3 space-y-3">
                      {journalLines.map((line) => (
                        <div key={line.id} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-4">
                            <Select 
                              value={line.accountCode} 
                              onValueChange={(value) => {
                                const account = mockAccounts.find(a => a.code === value.toString());
                                setJournalLines(journalLines.map(l => l.id === line.id ? { ...l, accountCode: value.toString(), accountName: account ? account.name : '' } : l));
                              }}
                            >
                              <SelectTrigger className={`h-9 text-sm ${formErrors.lines && formErrors.lines[line.id] && formErrors.lines[line.id].accountCode ? 'border-red-500 focus-visible:ring-red-500' : 'border-orange-200 focus-visible:ring-orange-500'}`}>
                                <SelectValue placeholder="Pilih akun" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[200px] overflow-y-auto">
                                <div className="p-2 text-xs text-gray-500 bg-orange-50 border-b border-orange-100">
                                  Kode - Nama Akun
                                </div>
                                <SelectItem value="placeholder">-- Pilih Akun --</SelectItem>
                                
                                <div className="py-1 px-2 text-xs font-semibold text-gray-500 bg-orange-50/80 border-y border-orange-100">
                                  Aktiva
                                </div>
                                {mockAccounts.filter(a => a.category === 'asset').map(account => (
                                  <SelectItem key={account.code} value={account.code}>
                                    {account.code} - {account.name}
                                  </SelectItem>
                                ))}
                                
                                <div className="py-1 px-2 text-xs font-semibold text-gray-500 bg-orange-50/80 border-y border-orange-100">
                                  Kewajiban
                                </div>
                                {mockAccounts.filter(a => a.category === 'liability').map(account => (
                                  <SelectItem key={account.code} value={account.code}>
                                    {account.code} - {account.name}
                                  </SelectItem>
                                ))}
                                
                                <div className="py-1 px-2 text-xs font-semibold text-gray-500 bg-orange-50/80 border-y border-orange-100">
                                  Ekuitas
                                </div>
                                {mockAccounts.filter(a => a.category === 'equity').map(account => (
                                  <SelectItem key={account.code} value={account.code}>
                                    {account.code} - {account.name}
                                  </SelectItem>
                                ))}
                                
                                <div className="py-1 px-2 text-xs font-semibold text-gray-500 bg-orange-50/80 border-y border-orange-100">
                                  Pendapatan
                                </div>
                                {mockAccounts.filter(a => a.category === 'revenue').map(account => (
                                  <SelectItem key={account.code} value={account.code}>
                                    {account.code} - {account.name}
                                  </SelectItem>
                                ))}
                                
                                <div className="py-1 px-2 text-xs font-semibold text-gray-500 bg-orange-50/80 border-y border-orange-100">
                                  Beban
                                </div>
                                {mockAccounts.filter(a => a.category === 'expense').map(account => (
                                  <SelectItem key={account.code} value={account.code}>
                                    {account.code} - {account.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {formErrors.lines && formErrors.lines[line.id] && formErrors.lines[line.id].accountCode && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.lines[line.id].accountCode}</p>
                            )}
                          </div>
                          
                          <div className="col-span-3">
                            <Input
                              placeholder="Deskripsi"
                              value={line.description}
                              onChange={(e) => {
                                setJournalLines(journalLines.map(l => l.id === line.id ? { ...l, description: e.target.value } : l));
                              }}
                              className="h-9 text-sm border-orange-200 focus-visible:ring-orange-500"
                            />
                          </div>
                          
                          <div className="col-span-2">
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={line.debit || ''}
                              onChange={(e) => {
                                setJournalLines(journalLines.map(l => l.id === line.id ? { ...l, debit: e.target.value } : l));
                              }}
                              className={`h-9 text-sm text-right ${formErrors.lines && formErrors.lines[line.id] && formErrors.lines[line.id].debitCredit ? 'border-red-500 focus-visible:ring-red-500' : 'border-orange-200 focus-visible:ring-orange-500'}`}
                            />
                          </div>
                          
                          <div className="col-span-2">
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={line.credit || ''}
                              onChange={(e) => {
                                setJournalLines(journalLines.map(l => l.id === line.id ? { ...l, credit: e.target.value } : l));
                              }}
                              className={`h-9 text-sm text-right ${formErrors.lines && formErrors.lines[line.id] && formErrors.lines[line.id].debitCredit ? 'border-red-500 focus-visible:ring-red-500' : 'border-orange-200 focus-visible:ring-orange-500'}`}
                            />
                          </div>
                          
                          <div className="col-span-1 text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setJournalLines(journalLines.filter(l => l.id !== line.id));
                                if (formErrors.lines && formErrors.lines[line.id]) {
                                  const newErrors = { ...formErrors };
                                  delete newErrors.lines[line.id];
                                  setFormErrors(newErrors);
                                }
                              }}
                              disabled={journalLines.length <= 2}
                              className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                            >
                              <FaTrash className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setJournalLines([
                            ...journalLines,
                            {
                              id: crypto.randomUUID(),
                              accountCode: "",
                              accountName: "",
                              debit: 0,
                              credit: 0,
                              description: ""
                            }
                          ]);
                        }}
                        className="w-full mt-2 border-dashed border-orange-200 text-orange-600 hover:bg-orange-50"
                      >
                        <FaPlus className="h-3 w-3 mr-2" />
                        Tambah Baris
                      </Button>
                    </div>
                    
                    {/* Totals */}
                    <div className="bg-orange-50 p-3 border-t border-orange-100">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-7 text-right font-medium text-gray-700">Total:</div>
                        <div className="col-span-2 text-right font-medium">
                          {formatCurrency(journalLines.reduce((sum, line) => sum + line.debit, 0))}
                        </div>
                        <div className="col-span-2 text-right font-medium">
                          {formatCurrency(journalLines.reduce((sum, line) => sum + line.credit, 0))}
                        </div>
                        <div className="col-span-1"></div>
                      </div>
                      
                      {/* Balance check */}
                      <div className="mt-2 text-right">
                        {journalLines.reduce((sum, line) => sum + line.debit, 0) === journalLines.reduce((sum, line) => sum + line.credit, 0) ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <FaCheck className="h-2.5 w-2.5 mr-1" />
                            Seimbang
                          </Badge>
                        ) : (
                          journalLines.some(line => line.debit > 0 || line.credit > 0) && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <FaTimes className="h-2.5 w-2.5 mr-1" />
                              Tidak Seimbang
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* SAK Information */}
                <div className="p-3 bg-orange-50/60 rounded-lg border border-orange-100 text-sm text-gray-600">
                  <div className="flex items-start">
                    <FaInfoCircle className="h-3 w-3 text-orange-500 mt-0.5 mr-2" />
                    <div>
                      <p className="font-medium text-orange-700 mb-1">Informasi SAK (Standar Akuntansi Keuangan)</p>
                      <p>Entry jurnal harus mengikuti prinsip keseimbangan dimana total debit harus sama dengan total kredit. Lengkapi semua informasi akun, tanggal, deskripsi, dan nilai transaksi untuk memastikan pencatatan sesuai dengan standar akuntansi.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer with action buttons */}
              <div className="p-4 border-t border-orange-100 bg-gradient-to-r from-orange-50/50 to-amber-50/50 flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                  onClick={() => {
                    setJournalEntryModal(false);
                    setFormErrors({});
                  }}
                >
                  Batal
                </Button>
                <Button 
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  onClick={submitJournalEntry}
                  disabled={journalLines.length < 2}
                >
                  <FaCheck className="mr-2 h-4 w-4" />
                  Simpan Jurnal
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Export Modal */}
        {exportModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md shadow-xl overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-orange-100 rounded-full opacity-10 transform translate-x-10 -translate-y-10 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-100 rounded-full opacity-10 transform -translate-x-10 translate-y-10 blur-3xl"></div>
              
              {/* Header with gradient bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>
              <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-sm mr-3">
                      <FaDownload className="h-4 w-4" />
                    </div>
                    <h3 className="text-lg font-bold text-orange-800">Ekspor Laporan Buku Besar</h3>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setExportModalOpen(false)}
                    className="h-8 w-8 p-1 rounded-full hover:bg-orange-100 text-gray-500"
                  >
                    <FaTimes className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Body */}
              <div className="p-6">
                <div className="mb-4">
                  <Label htmlFor="export-format" className="text-gray-700 mb-2 block">Format Ekspor</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      type="button"
                      variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                      className={exportFormat === 'pdf' 
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600' 
                        : 'border-orange-200 text-orange-700 hover:bg-orange-50'
                      }
                      onClick={() => setExportFormat('pdf')}
                    >
                      <FaFilePdf className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                    
                    <Button 
                      type="button"
                      variant={exportFormat === 'excel' ? 'default' : 'outline'}
                      className={exportFormat === 'excel' 
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600' 
                        : 'border-orange-200 text-orange-700 hover:bg-orange-50'
                      }
                      onClick={() => setExportFormat('excel')}
                    >
                      <FaFileExcel className="mr-2 h-4 w-4" />
                      Excel
                    </Button>
                    
                    <Button 
                      type="button"
                      variant={exportFormat === 'csv' ? 'default' : 'outline'}
                      className={exportFormat === 'csv' 
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600' 
                        : 'border-orange-200 text-orange-700 hover:bg-orange-50'
                      }
                      onClick={() => setExportFormat('csv')}
                    >
                      <FaFileCsv className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <Label htmlFor="export-date-from" className="text-gray-700 mb-1 block">Dari Tanggal</Label>
                    <Input
                      id="export-date-from"
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="border-orange-200 focus:border-orange-300 focus-visible:ring-orange-300"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="export-date-to" className="text-gray-700 mb-1 block">Sampai Tanggal</Label>
                    <Input
                      id="export-date-to"
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="border-orange-200 focus:border-orange-300 focus-visible:ring-orange-300"
                    />
                  </div>
                </div>
                
                <div className="flex items-center p-3 bg-orange-50 rounded-lg border border-orange-100 text-sm text-orange-800 mb-6">
                  <FaInfoCircle className="h-4 w-4 mr-2 text-orange-500" />
                  <p>Ekspor akan mencakup semua entri jurnal sesuai dengan rentang tanggal yang dipilih.</p>
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t border-orange-100 bg-gradient-to-r from-orange-50/50 to-amber-50/50 flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                  onClick={() => setExportModalOpen(false)}
                >
                  Batal
                </Button>
                <Button 
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                >
                  <FaDownload className="mr-2 h-4 w-4" />
                  Ekspor
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center py-4 border-t border-orange-100 bg-orange-50/50">
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 border-orange-200"
              >
                <FaChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 border-orange-200"
              >
                <FaChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Billing Transactions Tab */}
        {currentTab === "billing" && (
          <div className="mt-6">
            <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
              <FaFileInvoiceDollar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Billing Transactions</h3>
              <p className="text-sm text-gray-400">Fitur ini akan segera tersedia</p>
            </div>
          </div>
        )}
      </div>
    </FinanceLayout>
  );
};

export default LedgerPage;
