import { NextPage } from "next";
import { useState, useEffect, useRef } from "react";
import FinanceLayout from "@/components/layouts/finance-layout";
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
// import ExportDataDropdown from "@/components/shared/export-data-dropdown";
// import ImportDataDialog from "@/components/shared/import-data-dialog";
import { 
  FaMoneyBillWave, FaCalendarAlt, FaSearch, FaFilter, 
  FaDownload, FaPlus, FaSortUp, FaSortDown, FaEye, 
  FaEdit, FaTrash, FaTimes, FaArrowUp, FaArrowDown,
  FaReceipt, FaCheck, FaInfoCircle, FaFileInvoiceDollar,
  FaArrowLeft, FaArrowRight, FaWallet, FaShoppingCart,
  FaUserFriends, FaStore, FaHandshake, FaMedkit, FaGift,
  FaFileUpload, FaStickyNote, FaFileAlt
} from "react-icons/fa";
import { 
  Chart as ChartJS, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  BarElement,
} from 'chart.js';
import { Line, Doughnut } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  BarElement
);

// Mock data removed - using real backend API

// Income categories with icons
const incomeCategories = [
  { id: 1, name: "Penjualan", icon: <FaShoppingCart className="text-orange-500" /> },
  { id: 2, name: "Layanan", icon: <FaMedkit className="text-blue-500" /> },
  { id: 3, name: "Kemitraan", icon: <FaHandshake className="text-green-500" /> },
  { id: 4, name: "Investasi", icon: <FaGift className="text-purple-500" /> },
  { id: 5, name: "Lainnya", icon: <FaMoneyBillWave className="text-gray-500" /> },
];

// Payment methods
const paymentMethods = [
  { id: 1, name: "Cash" },
  { id: 2, name: "Transfer" },
  { id: 3, name: "Card" },
  { id: 4, name: "QRIS" },
];

// Chart data for income trends
const incomeChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
  datasets: [
    {
      label: 'Penjualan',
      data: [28500000, 31700000, 33200000, 30500000, 34100000, 36600000],
      borderColor: '#f97316',
      backgroundColor: 'rgba(249, 115, 22, 0.1)',
      tension: 0.3,
      fill: true,
    },
    {
      label: 'Layanan',
      data: [4000000, 5000000, 7000000, 8000000, 8000000, 9000000],
      borderColor: '#fb923c',
      backgroundColor: 'rgba(251, 146, 60, 0.05)',
      tension: 0.3,
      fill: true,
    },
  ],
};

// Chart data for income by category
const incomeCategoryData = {
  labels: ['Penjualan', 'Layanan', 'Kemitraan', 'Investasi', 'Lainnya'],
  datasets: [
    {
      data: [15680000, 2700000, 5000000, 800000, 300000],
      backgroundColor: [
        'rgba(249, 115, 22, 0.8)',    // Orange
        'rgba(59, 130, 246, 0.8)',    // Blue
        'rgba(16, 185, 129, 0.8)',    // Green
        'rgba(168, 85, 247, 0.8)',    // Purple
        'rgba(107, 114, 128, 0.8)',   // Gray
      ],
      borderColor: [
        '#f97316',
        '#3b82f6',
        '#10b981',
        '#a855f7',
        '#6b7280',
      ],
      borderWidth: 1,
    },
  ],
};

// Get category icon
const getCategoryIcon = (categoryName: string) => {
  const category = incomeCategories.find(c => c.name === categoryName);
  return category ? category.icon : <FaMoneyBillWave className="text-gray-500" />;
};

// Chart configurations
const lineChartOptions = {
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(249, 115, 22, 0.1)',
      },
      ticks: {
        callback: function(value: any) {
          return 'Rp' + (value / 1000000).toFixed(1) + 'jt';
        }
      }
    },
    x: {
      grid: {
        display: false
      }
    }
  },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        boxWidth: 10,
        usePointStyle: true,
      },
    },
  },
  maintainAspectRatio: false,
  responsive: true,
};

const pieChartOptions = {
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        boxWidth: 10,
        usePointStyle: true,
        padding: 20,
      },
    },
  },
  maintainAspectRatio: false,
  cutout: '65%',
};

const FinanceIncomePage: NextPage = () => {
  const { t } = useTranslation();
  // State variables
  const [incomeTransactions, setIncomeTransactions] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [viewIncomeDialog, setViewIncomeDialog] = useState(false);
  const [editIncomeDialog, setEditIncomeDialog] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<any>(null);
  const [formData, setFormData] = useState({
    id: '',
    date: '',
    description: '',
    amount: '',
    category: '',
    paymentMethod: '',
    notes: '',
    receipt: null as File | null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize chart data for income over time
  const lineChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
    datasets: [
      {
        label: 'Pendapatan',
        data: [4000000, 5000000, 7000000, 8000000, 8000000, 9000000],
        borderColor: '#fb923c',
        backgroundColor: 'rgba(251, 146, 60, 0.05)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  // Initialize chart data states with the predefined data
  const [incomeChartData, setIncomeChartData] = useState(lineChartData);
  const [categoryChartData, setCategoryChartData] = useState(incomeCategoryData);

  // Fetch data dari API finance/income
  useEffect(() => {
    const fetchIncomeData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch from API
        const response = await fetch('/api/finance/revenue');

        if (response.ok) {
          const data = await response.json();

          if (data && data.transactions && Array.isArray(data.transactions)) {
            // Transform API data format to match UI requirements
            const formattedTransactions = data.transactions.map((item: any) => ({
              id: item.id || `INC-${Math.random().toString(36).substr(2, 9)}`,
              date: item.date || '01 Sep 2025',
              description: item.description || 'Transaksi',
              amount: item.amount || 0,
              category: item.category || 'Penjualan',
              paymentMethod: item.paymentMethod || 'Cash',
              notes: item.notes || '',
            }));

            if (formattedTransactions.length > 0) {
              setIncomeTransactions(formattedTransactions);
              console.log('Income data loaded from API');
            }
          }

          // Fetch chart data - if available
          if (data && data.chartData) {
            if (data.chartData.monthlyIncome) {
              // Update monthly income chart data
              setIncomeChartData(prev => ({
                ...prev,
                datasets: [
                  {
                    ...prev.datasets[0],
                    data: data.chartData.monthlyIncome || prev.datasets[0].data
                  }
                ]
              }));
            }

            if (data.chartData.categoryDistribution) {
              // Update category distribution chart data
              setCategoryChartData(prev => ({
                ...prev,
                datasets: [
                  {
                    ...prev.datasets[0],
                    data: data.chartData.categoryDistribution || prev.datasets[0].data
                  }
                ]
              }));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching income data:', err);
        setError('Terjadi kesalahan saat memuat data. Menggunakan data lokal.');
        // Keep using mock data as fallback
      } finally {
        setLoading(false);
      }
    };

    fetchIncomeData();
  }, []);

  // Additional state for chart data
  const lineChartRef = useRef<any>(null);
  const doughnutChartRef = useRef<any>(null);

  // Fungsi untuk menghasilkan template data pemasukan
  const generateIncomeTemplate = () => {
    return [
      {
        id: "INC-TEMPLATE-001",
        date: "2025-03-27", // Format YYYY-MM-DD
        description: "Contoh Deskripsi Pemasukan",
        amount: 1500000,
        category: "Penjualan", // Harus sesuai dengan kategori yang tersedia
        paymentMethod: "Cash", // Cash, Transfer, Card, atau QRIS
        notes: "Catatan tambahan jika ada",
        reference: "Nomor referensi jika ada"
      },
      {
        id: "INC-TEMPLATE-002",
        date: "2025-03-26",
        description: "Contoh Deskripsi Pemasukan Lain",
        amount: 750000,
        category: "Layanan",
        paymentMethod: "Transfer",
        notes: "",
        reference: ""
      }
    ];
  };

  // Fungsi untuk menangani import data pemasukan
  const handleImportIncome = (importedData: any[]) => {
    // Pada implementasi nyata, Anda akan menyimpan data ini ke database
    // Untuk contoh, kita hanya menampilkan alert
    console.log("Data yang diimpor:", importedData);
    alert(`${importedData.length} data pemasukan berhasil diimpor!`);
  };

  // Menyiapkan data untuk export
  const prepareExportData = () => {
    return incomeTransactions.map(income => ({
      ID: income.id,
      Tanggal: income.date,
      Deskripsi: income.description,
      Kategori: income.category,
      'Metode Pembayaran': income.paymentMethod,
      Jumlah: income.amount,
      Catatan: income.notes || '',
      Referensi: income.reference || ''
    }));
  };

  // Header untuk PDF export
  const pdfHeaders = [
    'ID', 'Tanggal', 'Deskripsi', 'Kategori', 'Metode Pembayaran', 'Jumlah', 'Catatan', 'Referensi'
  ];

  // Mapping untuk PDF row data
  const pdfMappingIncome = (item: any) => [
    item.ID,
    item.Tanggal,
    item.Deskripsi,
    item.Kategori,
    item['Metode Pembayaran'],
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(item.Jumlah),
    item.Catatan,
    item.Referensi
  ];

  const [totalIncome, setTotalIncome] = useState<number>(0);

  useEffect(() => {
    // Calculate total income from mock data
    const total = incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    setTotalIncome(total);
  }, [incomeTransactions]);

  // Cleanup charts on unmount to prevent duplicate chart error
  useEffect(() => {
    return () => {
      if (lineChartRef.current) {
        lineChartRef.current.destroy();
      }
      if (doughnutChartRef.current) {
        doughnutChartRef.current.destroy();
      }
    };
  }, []);

  // Function to handle sorting
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Function to get sorted items
  const getSortedItems = (items: any[]) => {
    if (!sortConfig) return items;

    return [...items].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  // Function to handle pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  // Apply sorting and filtering
  const sortedIncomes = getSortedItems(incomeTransactions);
  const filteredIncomes = sortedIncomes.filter(transaction => {
    const searchLower = searchQuery.toLowerCase();
    return (
      transaction.id.toLowerCase().includes(searchLower) ||
      transaction.description.toLowerCase().includes(searchLower) ||
      transaction.category.toLowerCase().includes(searchLower) ||
      transaction.date.toLowerCase().includes(searchLower)
    );
  });
  const currentIncomes = filteredIncomes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredIncomes.length / itemsPerPage);

  // Function to handle page change
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Function to handle view income
  const handleViewIncome = (income: any) => {
    setSelectedIncome(income);
    setViewIncomeDialog(true);
  };

  // Function to handle edit income
  const handleEditIncome = (income: any) => {
    setSelectedIncome(income);
    setFormData({
      description: income.description,
      amount: income.amount,
      category: income.category,
      paymentMethod: income.paymentMethod,
      date: income.date,
      notes: income.notes || '',
      reference: income.reference || '',
      receipt: income.receipt || null
    });
    setEditIncomeDialog(true);
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'amount' ? Number(value) : value
    });
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle file changes
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setFormData({
      ...formData,
      receipt: file
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create form data for submission
    const incomeData = {
      id: formData.id || selectedIncome?.id || `INC-${Date.now()}`,
      date: formData.date,
      description: formData.description,
      amount: parseFloat(formData.amount),
      category: formData.category,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes || '',
    };

    try {
      // First update locally for immediate UI feedback
      if (selectedIncome) {
        // Update existing income
        setIncomeTransactions(prev => 
          prev.map(item => item.id === incomeData.id ? incomeData : item)
        );
      } else {
        // Add new income
        setIncomeTransactions(prev => [incomeData, ...prev]);
      }

      // Then send to API
      const response = await fetch('/api/finance/revenue', {
        method: selectedIncome ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incomeData),
      });

      if (!response.ok) {
        // If API fails, we already updated UI so just log error
        console.error('Failed to save income to API, but UI was updated');
      } else {
        console.log('Income saved successfully to API');
      }

      // Reset form and close dialog
      setEditIncomeDialog(false);
      setSelectedIncome(null);
      setFormData({
        id: '',
        date: '',
        description: '',
        amount: '',
        category: '',
        paymentMethod: '',
        notes: '',
        receipt: null,
      });

    } catch (err) {
      console.error('Error saving income:', err);
      // We already updated UI so just show an error notification if needed
    }
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <FinanceLayout>
      <div className="space-y-8 px-4 md:px-6 mb-20">
        {/* Header */}
        <div className="flex items-center mb-6">
          <div className="h-8 w-1.5 bg-gradient-to-b from-orange-400 to-amber-500 rounded-full mr-3"></div>
          <h2 className="text-xl font-bold text-gray-800">Pemasukan</h2>
        </div>

        {/* Stats Card */}
        <Card className="overflow-hidden border-orange-100 neo-shadow relative">
          {/* Top decorative bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-orange-100 rounded-full opacity-20 transform translate-x-20 -translate-y-20"></div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-100 rounded-full opacity-30"></div>

          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Pemasukan Bulan Ini</p>
                <h3 className="text-3xl font-bold text-gray-800" suppressHydrationWarning>Rp{totalIncome.toLocaleString('id-ID')}</h3>
                <p className="text-xs text-green-600 mt-2 flex items-center">
                  <FaSortUp className="h-3 w-3 mr-1" />
                  +10.2% dibanding bulan lalu
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg">
                <FaMoneyBillWave className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Grid - Two cards side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income Chart */}
          <Card className="border-orange-100 overflow-hidden neo-shadow relative">
            {/* Top decorative bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-100 rounded-full opacity-20 transform translate-x-20 -translate-y-20"></div>
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-100 rounded-full opacity-30"></div>
            <div className="absolute top-1/2 right-1/4 w-12 h-12 bg-orange-200 rounded-full opacity-20 blur-lg"></div>

            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 pb-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 mr-3 shadow-sm">
                    <FaMoneyBillWave className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-orange-800">Tren Pemasukan</CardTitle>
                    <CardDescription className="text-orange-600/70">6 bulan terakhir</CardDescription>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                  >
                    <FaCalendarAlt className="mr-1.5 h-3.5 w-3.5" />
                    6 Bulan
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-gray-500 border-gray-200"
                  >
                    <FaFilter className="mr-1.5 h-3.5 w-3.5" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="h-[300px]">
                <Line 
                  ref={lineChartRef}
                  data={incomeChartData} 
                  options={lineChartOptions}
                />
              </div>
            </CardContent>
          </Card>

          {/* Income By Category Chart */}
          <Card className="border-orange-100 overflow-hidden neo-shadow relative">
            {/* Top decorative bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-100 rounded-full opacity-20 transform translate-x-20 -translate-y-20"></div>
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-100 rounded-full opacity-30"></div>
            <div className="absolute top-1/2 right-1/4 w-12 h-12 bg-orange-200 rounded-full opacity-20 blur-lg"></div>

            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 pb-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 mr-3 shadow-sm">
                    <FaMoneyBillWave className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-orange-800">Pemasukan Berdasarkan Kategori</CardTitle>
                    <CardDescription className="text-orange-600/70">Bulan ini</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="h-[300px]">
                <Doughnut 
                  ref={doughnutChartRef}
                  data={categoryChartData} 
                  options={pieChartOptions}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Income Transactions Table */}
        <Card className="border-orange-100 overflow-hidden neo-shadow relative">
          {/* Top decorative bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full opacity-20 transform translate-x-16 -translate-y-16"></div>
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-amber-100 rounded-full opacity-30"></div>

          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 pb-2">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 mr-3 shadow-sm">
                  <FaMoneyBillWave className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-orange-800">Transaksi Pemasukan</CardTitle>
                  <CardDescription className="text-orange-600/70">Daftar transaksi pemasukan bulan ini</CardDescription>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Input
                    placeholder="Cari transaksi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border-orange-200 focus-visible:ring-orange-500"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <FaSearch className="text-orange-400" />
                  </div>
                </div>
                <Button
                  onClick={() => setEditIncomeDialog(true)}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                >
                  <FaPlus className="mr-2 h-4 w-4" /> Tambah Pemasukan
                </Button>
                {/* Export and Import components temporarily disabled */}
                {/* <ExportDataDropdown 
                  data={prepareExportData()}
                  filename="Laporan_Pemasukan"
                  pdfTitle="Laporan Pemasukan"
                  pdfHeaders={pdfHeaders}
                  pdfMapping={pdfMappingIncome}
                  buttonVariant="gradient"
                  buttonSize="default"
                  buttonClassName="bg-gradient-to-r from-orange-500 to-amber-500"
                  align="end"
                />
                <ImportDataDialog 
                  onImport={handleImportIncome}
                  generateTemplate={generateIncomeTemplate}
                  templateFilename="Template_Import_Pemasukan"
                  templateHeaders={["ID", "Tanggal", "Deskripsi", "Jumlah", "Kategori", "Metode Pembayaran", "Catatan", "Referensi"]}
                  title="Import Data Pemasukan"
                  description="Upload file data pemasukan sesuai format template"
                  trigger={
                    <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
                      <FaFileUpload className="mr-2 h-4 w-4" />
                      Import
                    </Button>
                  }
                /> */}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-orange-50">
                  <TableRow>
                    <TableHead className="text-orange-800 font-medium" onClick={() => requestSort('date')}>
                      <div className="flex items-center cursor-pointer">
                        <span>Tanggal</span>
                        {sortConfig?.key === 'date' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-orange-800 font-medium" onClick={() => requestSort('description')}>
                      <div className="flex items-center cursor-pointer">
                        <span>Deskripsi</span>
                        {sortConfig?.key === 'description' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-orange-800 font-medium" onClick={() => requestSort('amount')}>
                      <div className="flex items-center cursor-pointer">
                        <span>Jumlah</span>
                        {sortConfig?.key === 'amount' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-orange-800 font-medium" onClick={() => requestSort('category')}>
                      <div className="flex items-center cursor-pointer">
                        <span>Kategori</span>
                        {sortConfig?.key === 'category' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-orange-800 font-medium" onClick={() => requestSort('paymentMethod')}>
                      <div className="flex items-center cursor-pointer">
                        <span>Metode</span>
                        {sortConfig?.key === 'paymentMethod' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-orange-800 font-medium text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentIncomes.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-orange-50 border-b border-orange-100">
                      <TableCell className="font-medium py-3">
                        <span suppressHydrationWarning>
                          {new Date(transaction.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{transaction.description}</span>
                          <span className="text-xs text-gray-500">ID: {transaction.id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 font-semibold text-green-600">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                        }).format(transaction.amount)}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          <div className="flex items-center">
                            {getCategoryIcon(transaction.category)}
                            <span className="ml-1">{transaction.category}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge 
                          variant="outline" 
                          className={`${
                            transaction.paymentMethod === "Cash" 
                              ? "bg-green-50 text-green-700 border-green-200" 
                              : transaction.paymentMethod === "Transfer"
                              ? "bg-blue-50 text-blue-700 border-blue-200" 
                              : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          {transaction.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewIncome(transaction)}
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                          >
                            <FaEye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditIncome(transaction)}
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                          >
                            <FaEdit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-orange-100">
              <div className="text-sm text-gray-500">
                Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredIncomes.length)} dari {filteredIncomes.length} transaksi
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[100px] border-orange-200 focus:ring-orange-500">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => paginate(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 rounded-r-none border-r-0 border-orange-200"
                  >
                    <FaArrowLeft className="h-3 w-3" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageToShow = currentPage <= 3
                      ? i + 1
                      : currentPage >= totalPages - 2
                        ? totalPages - 4 + i
                        : currentPage - 2 + i;
                    
                    if (pageToShow <= totalPages && pageToShow > 0) {
                      return (
                        <Button
                          key={pageToShow}
                          variant={currentPage === pageToShow ? "default" : "outline"}
                          onClick={() => paginate(pageToShow)}
                          className={`h-8 w-8 rounded-none border-r-0 ${
                            currentPage === pageToShow
                              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                              : "border-orange-200 hover:bg-orange-50"
                          }`}
                        >
                          {pageToShow}
                        </Button>
                      );
                    }
                    return null;
                  })}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 rounded-l-none border-orange-200"
                  >
                    <FaArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog untuk form tambah pemasukan */}
      <Dialog open={editIncomeDialog} onOpenChange={setEditIncomeDialog}>
        <DialogContent className="p-0 max-w-5xl max-h-[90vh] overflow-y-auto border-orange-200">
          {/* Top decorative gradient */}
          <div className="h-2 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-500"></div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-200 rounded-full opacity-20 transform translate-x-20 -translate-y-20 z-0"></div>
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-amber-200 rounded-full opacity-20 transform -translate-x-16 translate-y-16 z-0"></div>

          <div className="p-6 relative z-10">
            <DialogHeader className="mb-4 flex flex-row items-center">
              <div className="h-12 w-1.5 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full mr-4"></div>
              <div>
                <DialogTitle className="text-2xl font-bold text-orange-800">Tambah Pemasukan</DialogTitle>
                <DialogDescription className="text-orange-600">
                  Masukkan informasi detail untuk pemasukan baru
                </DialogDescription>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-5 rounded-lg border border-orange-100">
                    <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 mr-3 shadow-sm">
                        <FaReceipt className="h-4 w-4 text-white" />
                      </div>
                      Informasi Dasar
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Deskripsi</Label>
                        <Input 
                          type="text" 
                          name="description" 
                          placeholder="Masukkan deskripsi pemasukan" 
                          value={formData.description} 
                          onChange={handleChange} 
                          className="border-orange-200 focus-visible:ring-orange-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Tanggal</Label>
                        <div className="relative">
                          <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400 h-4 w-4" />
                          <Input 
                            type="date" 
                            name="date" 
                            value={formData.date} 
                            onChange={handleChange} 
                            className="pl-10 border-orange-200 focus-visible:ring-orange-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Jumlah</Label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 font-semibold">
                            Rp
                          </div>
                          <Input 
                            type="number" 
                            name="amount" 
                            placeholder="0" 
                            value={formData.amount} 
                            onChange={handleChange} 
                            className="pl-10 border-orange-200 focus-visible:ring-orange-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Referensi</Label>
                        <Input 
                          type="text" 
                          name="reference" 
                          placeholder="Nomor referensi/faktur (opsional)" 
                          value={formData.reference} 
                          onChange={handleChange} 
                          className="border-orange-200 focus-visible:ring-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-5 rounded-lg border border-orange-100">
                    <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 mr-3 shadow-sm">
                        <FaMoneyBillWave className="h-4 w-4 text-white" />
                      </div>
                      Catatan Tambahan
                    </h3>

                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Catatan (Opsional)</Label>
                      <Textarea 
                        name="notes" 
                        placeholder="Tambahkan catatan atau keterangan lainnya..." 
                        value={formData.notes} 
                        onChange={handleChange}
                        className="min-h-[120px] border-orange-200 focus-visible:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-5 rounded-lg border border-orange-100">
                    <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 mr-3 shadow-sm">
                        <FaWallet className="h-4 w-4 text-white" />
                      </div>
                      Kategori & Pembayaran
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Kategori</Label>
                        <Select 
                          value={formData.category} 
                          onValueChange={(value) => handleSelectChange('category', value)}
                        >
                          <SelectTrigger className="border-orange-200 focus:ring-orange-500">
                            <SelectValue placeholder="Pilih kategori pemasukan" />
                          </SelectTrigger>
                          <SelectContent>
                            {incomeCategories.map((category) => (
                              <SelectItem key={category.id} value={category.name}>
                                <div className="flex items-center">
                                  <div className="mr-2">{category.icon}</div>
                                  <span>{category.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Metode Pembayaran</Label>
                        <Select 
                          value={formData.paymentMethod} 
                          onValueChange={(value) => handleSelectChange('paymentMethod', value)}
                        >
                          <SelectTrigger className="border-orange-200 focus:ring-orange-500">
                            <SelectValue placeholder="Pilih metode pembayaran" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods.map((method) => (
                              <SelectItem key={method.id} value={method.name}>
                                {method.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-5 rounded-lg border border-orange-100">
                    <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 mr-3 shadow-sm">
                        <FaFileInvoiceDollar className="h-4 w-4 text-white" />
                      </div>
                      Bukti Pemasukan
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Unggah Bukti Pembayaran (Opsional)</Label>
                        <div className="border-2 border-dashed border-orange-200 rounded-lg p-6 text-center hover:bg-orange-50 transition-colors">
                          <input
                            type="file"
                            id="receipt"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                          <label
                            htmlFor="receipt"
                            className="cursor-pointer flex flex-col items-center justify-center h-full"
                          >
                            {formData.receipt ? (
                              <div className="flex items-center text-orange-700">
                                <FaCheck className="h-5 w-5 mr-2" />
                                <span className="font-medium">{formData.receipt.name}</span>
                              </div>
                            ) : (
                              <>
                                <FaFileInvoiceDollar className="h-12 w-12 mb-4 text-orange-300" />
                                <p className="text-sm text-gray-500 mb-1">
                                  Klik atau seret file ke area ini
                                </p>
                                <p className="text-xs text-gray-400">
                                  Mendukung format JPG, PNG, atau PDF
                                </p>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-orange-100 pt-6 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  <span className="flex items-center">
                    <FaInfoCircle className="h-4 w-4 mr-2 text-orange-400" />
                    Semua pemasukan akan dicatat dalam buku kas dan laporan keuangan
                  </span>
                </div>
                <div className="flex gap-3">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setEditIncomeDialog(false)} 
                    className="border-orange-200 text-orange-700 hover:bg-orange-50"
                  >
                    <FaTimes className="h-4 w-4 mr-2" />
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  >
                    <FaCheck className="h-4 w-4 mr-2" />
                    Simpan Pemasukan
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog untuk melihat detail pemasukan */}
      <Dialog open={viewIncomeDialog} onOpenChange={setViewIncomeDialog}>
        <DialogContent className="p-0 max-w-3xl border-orange-200">
          {/* Top decorative gradient */}
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-500"></div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-orange-200 rounded-full opacity-20 transform translate-x-10 -translate-y-10 z-0"></div>

          <div className="p-6 relative z-10">
            <DialogHeader className="mb-4 flex flex-row items-center">
              <div className="h-10 w-1.5 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full mr-4"></div>
              <div>
                <DialogTitle className="text-xl font-bold text-orange-800">
                  {selectedIncome?.description}
                </DialogTitle>
                <DialogDescription className="text-orange-600">
                  Detail transaksi pemasukan
                </DialogDescription>
              </div>
            </DialogHeader>

            {selectedIncome && (
              <div className="mt-6 space-y-6">
                {/* Card with basic info */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100 overflow-hidden">
                  <div className="p-4 flex items-center justify-between bg-gradient-to-r from-orange-100/60 to-amber-100/60">
                    <div className="flex items-center">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 mr-3 shadow-sm">
                        <FaMoneyBillWave className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium text-orange-800">Informasi Pemasukan</span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-semibold">
                      {formatCurrency(selectedIncome.amount)}
                    </Badge>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500">ID Transaksi</p>
                        <p className="font-medium text-gray-700">{selectedIncome.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Tanggal</p>
                        <p className="font-medium text-gray-700">{formatDate(selectedIncome.date)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Deskripsi</p>
                        <p className="font-medium text-gray-700">{selectedIncome.description}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500">Kategori</p>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 mt-1">
                          <div className="flex items-center">
                            {getCategoryIcon(selectedIncome.category)}
                            <span className="ml-1">{selectedIncome.category}</span>
                          </div>
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Metode Pembayaran</p>
                        <Badge 
                          variant="outline" 
                          className={`mt-1 ${
                            selectedIncome.paymentMethod === "Cash" 
                              ? "bg-green-50 text-green-700 border-green-200" 
                              : selectedIncome.paymentMethod === "Transfer"
                              ? "bg-blue-50 text-blue-700 border-blue-200" 
                              : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          {selectedIncome.paymentMethod}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Referensi</p>
                        <p className="font-medium text-gray-700">
                          {selectedIncome.reference || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                {selectedIncome.notes && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100 p-4">
                    <div className="flex items-center mb-2">
                      <FaStickyNote className="text-orange-500 mr-2" />
                      <span className="font-medium text-orange-800">Catatan</span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-line">{selectedIncome.notes}</p>
                  </div>
                )}

                {/* Receipt */}
                {selectedIncome.receipt && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100 p-4">
                    <div className="flex items-center mb-2">
                      <FaFileAlt className="text-orange-500 mr-2" />
                      <span className="font-medium text-orange-800">Bukti Pembayaran</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
                        <FaDownload className="h-4 w-4 mr-2" />
                        Unduh Bukti
                      </Button>
                      <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
                        <FaEye className="h-4 w-4 mr-2" />
                        Lihat Bukti
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 pt-4 border-t border-orange-100 flex justify-between items-center">
              <Button 
                variant="ghost" 
                onClick={() => setViewIncomeDialog(false)} 
                className="text-gray-700 hover:bg-orange-50"
              >
                Tutup
              </Button>
              <Button 
                variant="default" 
                onClick={() => {
                  setViewIncomeDialog(false);
                  handleEditIncome(selectedIncome);
                }}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
              >
                <FaEdit className="h-4 w-4 mr-2" />
                Edit Pemasukan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FinanceLayout>
  );
};

export default FinanceIncomePage;
