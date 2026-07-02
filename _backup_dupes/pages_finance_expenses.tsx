import { NextPage } from "next";
import { useState, useEffect, useRef } from "react";
import FinanceLayout from "@/components/layouts/finance-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ExportDataDropdown from "@/components/shared/export-data-dropdown";
import ImportDataDialog from "@/components/shared/import-data-dialog";
import { 
  FaMoneyBillWave, FaCalendarAlt, FaSearch, FaFilter, 
  FaDownload, FaPlus, FaSortUp, FaSortDown, FaEye, 
  FaEdit, FaTrash, FaTimes, FaArrowUp, FaArrowDown,
  FaReceipt, FaCheck, FaInfoCircle, FaFileInvoiceDollar,
  FaArrowLeft, FaArrowRight, FaWallet, FaShoppingCart,
  FaUserFriends, FaStore, FaLightbulb, FaAd, FaFileUpload,
  FaTools
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

// Chart data for expense trends
const expenseChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
  datasets: [
    {
      label: 'Pengeluaran',
      data: [22300000, 25100000, 24500000, 27800000, 26200000, 28300000],
      borderColor: '#f97316',
      backgroundColor: 'rgba(249, 115, 22, 0.1)',
      tension: 0.3,
      fill: true,
    }
  ],
};

// Chart data for expense by category
const expenseCategoryData = {
  labels: ['Pembelian Produk', 'Gaji Karyawan', 'Operasional', 'Marketing', 'Maintenance'],
  datasets: [
    {
      label: 'Pengeluaran per Kategori',
      data: [16500000, 7200000, 2800000, 1200000, 600000],
      backgroundColor: [
        'rgba(249, 115, 22, 0.7)',   // orange-500
        'rgba(251, 146, 60, 0.7)',   // orange-400
        'rgba(245, 158, 11, 0.7)',   // amber-500
        'rgba(252, 211, 77, 0.7)',   // amber-300
        'rgba(254, 240, 138, 0.7)',  // yellow-200
      ],
      borderColor: [
        'rgba(249, 115, 22, 1)',   // orange-500
        'rgba(251, 146, 60, 1)',   // orange-400
        'rgba(245, 158, 11, 1)',   // amber-500
        'rgba(252, 211, 77, 1)',   // amber-300
        'rgba(254, 240, 138, 1)',  // yellow-200
      ],
      borderWidth: 1,
    },
  ],
};

// Mock data for expense categories
const expenseCategories = [
  { id: 1, name: "Pembelian Produk", icon: <FaShoppingCart className="h-4 w-4" /> },
  { id: 2, name: "Gaji", icon: <FaUserFriends className="h-4 w-4" /> },
  { id: 3, name: "Operasional", icon: <FaLightbulb className="h-4 w-4" /> },
  { id: 4, name: "Marketing", icon: <FaAd className="h-4 w-4" /> },
  { id: 5, name: "Maintenance", icon: <FaTools className="h-4 w-4" /> },
  { id: 6, name: "Pembelian Aset", icon: <FaWallet className="h-4 w-4" /> },
  { id: 7, name: "Pajak", icon: <FaMoneyBillWave className="h-4 w-4" /> },
];

// Mock data for payment methods
const paymentMethods = [
  { id: 1, name: "Cash" },
  { id: 2, name: "Transfer" },
  { id: 3, name: "Card" },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Pembelian Produk': return <FaShoppingCart className="h-4 w-4" />;
    case 'Gaji': return <FaUserFriends className="h-4 w-4" />;
    case 'Operasional': return <FaLightbulb className="h-4 w-4" />;
    case 'Marketing': return <FaAd className="h-4 w-4" />;
    case 'Maintenance': return <FaTools className="h-4 w-4" />;
    case 'Pembelian Aset': return <FaWallet className="h-4 w-4" />;
    case 'Pajak': return <FaMoneyBillWave className="h-4 w-4" />;
    default: return <FaWallet className="h-4 w-4" />;
  }
};

const FinanceExpensesPage: NextPage = () => {
  // State variables
  const [expenseTransactions, setExpenseTransactions] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({
    key: 'date',
    direction: 'descending'
  });
  const [viewExpenseDialog, setViewExpenseDialog] = useState<boolean>(false);
  const [editExpenseDialog, setEditExpenseDialog] = useState<boolean>(false);
  const [addExpenseDialog, setAddExpenseDialog] = useState<boolean>(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Definisikan chart data state berdasarkan data mock
  const [expenseTimeChartData, setExpenseTimeChartData] = useState(expenseChartData);
  const [expenseCategoryChartData, setExpenseCategoryChartData] = useState(expenseCategoryData);
  
  // Form state for expense
  const [formData, setFormData] = useState<{
    id?: string;
    description: string;
    amount: string;
    category: string;
    paymentMethod: string;
    date: string;
    notes: string;
    reference: string;
    receipt: File | null;
  }>({
    description: '',
    amount: '',
    category: '',
    paymentMethod: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    reference: '',
    receipt: null
  });

  // State untuk total pengeluaran
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [summaryData, setSummaryData] = useState({
    totalExpenses: 0,
    previousPeriodExpenses: 0,
    percentageChange: 0,
    isIncrease: true,
    largestCategory: '-',
    largestExpense: '-'
  });

  // References for charts
  const lineChartRef = useRef<any>(null);
  const doughnutChartRef = useRef<any>(null);

  // Fetch expenses data from API
  useEffect(() => {
    const fetchExpenseData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch from API
        const response = await fetch('/api/finance/expenses');
        
        if (response.ok) {
          const apiResponse = await response.json();
          
          // Check if we have the expected data structure
          if (apiResponse.success && apiResponse.data) {
            const { transactions, summary, chartData } = apiResponse.data;
            
            // Update expense transactions
            if (transactions && Array.isArray(transactions) && transactions.length > 0) {
              setExpenseTransactions(transactions);
              console.log('Fetched expense transactions:', transactions.length);
            }
            
            // Update summary data
            if (summary) {
              setSummaryData({
                totalExpenses: summary.totalExpenses || 0,
                previousPeriodExpenses: summary.previousPeriodExpenses || 0,
                percentageChange: summary.percentageChange || 0,
                isIncrease: summary.isIncrease,
                largestCategory: summary.largestCategory || '-',
                largestExpense: summary.largestExpense || '-'
              });
              
              setTotalExpense(summary.totalExpenses);
            }
            
            // Update chart data
            if (chartData) {
              // Update time chart data
              if (chartData.monthlyExpenses) {
                setExpenseTimeChartData(prev => ({
                  ...prev,
                  datasets: [{
                    ...prev.datasets[0],
                    data: chartData.monthlyExpenses
                  }]
                }));
              }
              
              // Update category chart data
              if (chartData.categoryDistribution) {
                setExpenseCategoryChartData(prev => ({
                  ...prev,
                  datasets: [{
                    ...prev.datasets[0],
                    data: chartData.categoryDistribution
                  }]
                }));
              }
            }
            
            // Log if using mock data
            if (apiResponse.isMock) {
              console.log('Using mock data for expenses');
            }
          }
        } else {
          // Handle API error but keep using fallback data
          console.error('Failed to fetch expense data:', response.statusText);
          setError('Gagal memuat data pengeluaran dari server. Menggunakan data lokal.');
        }
      } catch (err) {
        console.error('Error fetching expense data:', err);
        setError('Terjadi kesalahan saat memuat data. Menggunakan data lokal.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchExpenseData();
  }, []);
  
  // Cleanup charts on unmount
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
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
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

  // Get current expenses for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  // Apply sorting and filtering
  const filteredExpenses = expenseTransactions.filter(expense => {
    const searchLower = searchTerm.toLowerCase();
    return (
      expense.id.toLowerCase().includes(searchLower) ||
      expense.description.toLowerCase().includes(searchLower) ||
      expense.category.toLowerCase().includes(searchLower) ||
      expense.paymentMethod.toLowerCase().includes(searchLower)
    );
  });
  
  const sortedExpenses = getSortedItems(filteredExpenses);
  const currentExpenses = sortedExpenses.slice(indexOfFirstItem, indexOfLastItem);

  // Function to handle page change
  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Function to handle view expense
  const handleViewExpense = (expense: any) => {
    setSelectedExpense(expense);
    setViewExpenseDialog(true);
  };

  // Function to handle edit expense
  const handleEditExpense = (expense: any) => {
    setSelectedExpense(expense);
    setFormData({
      id: expense.id,
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      paymentMethod: expense.paymentMethod,
      date: formatDateToISO(expense.date),
      notes: expense.notes || '',
      reference: expense.reference || '',
      receipt: null
    });
    setEditExpenseDialog(true);
  };

  // Function to format date to ISO for form
  const formatDateToISO = (dateString: string) => {
    // Handle different date formats
    try {
      const parts = dateString.split(' ');
      const day = parseInt(parts[0]);
      const monthMap: {[key: string]: string} = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'Mei': '05', 'Jun': '06',
        'Jul': '07', 'Agu': '08', 'Sep': '09', 'Okt': '10', 'Nov': '11', 'Des': '12'
      };
      const month = monthMap[parts[1]];
      const year = parts[2];
      
      if (day && month && year) {
        return `${year}-${month}-${day.toString().padStart(2, '0')}`;
      }
    } catch {
      return dateString; // Return as is if parsing fails
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Prepare expense data
      const expenseData = {
        id: formData.id, // Will be undefined for new expenses
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        date: formData.date,
        notes: formData.notes
      };
      
      // Determine if this is an update or new expense
      const isUpdate = !!formData.id;
      
      // First update UI for immediate feedback
      if (isUpdate) {
        setExpenseTransactions(prev => 
          prev.map(item => item.id === expenseData.id ? {
            ...expenseData,
            date: formatDate(new Date(expenseData.date))
          } : item)
        );
      } else {
        // Create a temporary ID for new expense
        const newId = `EXP-${Date.now()}`;
        setExpenseTransactions(prev => [
          {
            ...expenseData,
            id: newId,
            date: formatDate(new Date(expenseData.date))
          },
          ...prev
        ]);
      }
      
      // Then send to API
      const response = await fetch('/api/finance/expenses', {
        method: isUpdate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(expenseData)
      });
      
      if (!response.ok) {
        console.error('API error:', response.statusText);
        // Already updated UI, so just show a toast/alert
      } else {
        console.log(`Expense ${isUpdate ? 'updated' : 'created'} successfully`);
      }
      
      // Close dialog and reset form
      setAddExpenseDialog(false);
      setEditExpenseDialog(false);
      setFormData({
        description: '',
        amount: '',
        category: '',
        paymentMethod: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        reference: '',
        receipt: null
      });
      
    } catch (err) {
      console.error('Error submitting expense:', err);
      // Show error message
    }
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString; // Return as is if parsing fails
    }
  };

  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, receipt: e.target.files[0] });
    }
  };

  return (
    <FinanceLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <div className="h-8 w-1.5 bg-gradient-to-b from-orange-400 to-amber-500 rounded-full mr-3"></div>
          <h2 className="text-xl font-bold text-gray-800">Pengeluaran</h2>
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
                <p className="text-sm font-medium text-gray-600 mb-1">Total Pengeluaran Bulan Ini</p>
                <h3 className="text-3xl font-bold text-gray-800" suppressHydrationWarning>Rp{totalExpense.toLocaleString('id-ID')}</h3>
                <p className="text-xs text-amber-600 mt-2 flex items-center">
                  <FaSortUp className="h-3 w-3 mr-1" />
                  +5.2% dibanding bulan lalu
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                <FaWallet className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Expense Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense Trend Chart */}
          <Card className="border-orange-100 overflow-hidden neo-shadow relative">
            {/* Top decorative bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>
            
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full opacity-20 transform translate-x-16 -translate-y-16"></div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-amber-100 rounded-full opacity-30"></div>
            
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 pb-2">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 mr-3 shadow-sm">
                  <FaWallet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-orange-800">Tren Pengeluaran</CardTitle>
                  <CardDescription className="text-orange-600/70">6 bulan terakhir</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="h-[250px]">
                <Line 
                  data={expenseTimeChartData} 
                  options={{
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(249, 115, 22, 0.1)',
                        },
                        ticks: {
                          callback: function(value: any) {
                            return 'Rp' + Number(value).toLocaleString('id-ID');
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
                  }}
                  ref={lineChartRef}
                />
              </div>
            </CardContent>
          </Card>

          {/* Expense Category Chart */}
          <Card className="border-orange-100 overflow-hidden neo-shadow relative">
            {/* Top decorative bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>
            
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full opacity-20 transform translate-x-16 -translate-y-16"></div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-amber-100 rounded-full opacity-30"></div>
            
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 pb-2">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 mr-3 shadow-sm">
                  <FaWallet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-orange-800">Pengeluaran per Kategori</CardTitle>
                  <CardDescription className="text-orange-600/70">Bulan Maret 2025</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="h-[250px] relative">
                <Doughnut 
                  data={expenseCategoryChartData} 
                  options={{
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
                  }}
                  ref={doughnutChartRef} 
                />
                
                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-lg font-bold text-gray-800">Rp28,3jt</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Expense Transactions Table */}
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
                  <FaWallet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-orange-800">Transaksi Pengeluaran</CardTitle>
                  <CardDescription className="text-orange-600">
                    Daftar transaksi pengeluaran bulan ini
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Cari transaksi..."
                    className="pl-10 text-sm border-orange-100 focus-visible:ring-orange-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => setAddExpenseDialog(true)}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                >
                  <FaPlus className="mr-2 h-4 w-4" /> Tambah Pengeluaran
                </Button>
                <ExportDataDropdown 
                  data={expenseTransactions.map(expense => ({
                    ID: expense.id,
                    Tanggal: formatDate(expense.date),
                    Deskripsi: expense.description,
                    Kategori: expense.category,
                    'Metode Pembayaran': expense.paymentMethod,
                    Jumlah: expense.amount,
                    Catatan: expense.notes || '',
                    Referensi: expense.reference || ''
                  }))}
                  filename="Laporan_Pengeluaran"
                  pdfTitle="Laporan Pengeluaran"
                  pdfHeaders={[
                    'ID', 'Tanggal', 'Deskripsi', 'Kategori', 'Metode Pembayaran', 'Jumlah', 'Catatan', 'Referensi'
                  ]}
                  pdfMapping={(item: any) => [
                    item.ID,
                    item.Tanggal,
                    item.Deskripsi,
                    item.Kategori,
                    item['Metode Pembayaran'],
                    formatCurrency(item.Jumlah),
                    item.Catatan,
                    item.Referensi
                  ]}
                  buttonVariant="gradient"
                  buttonSize="default"
                  buttonClassName="bg-gradient-to-r from-orange-500 to-amber-500"
                  align="end"
                />
                <ImportDataDialog 
                  onImport={(importedData: any[]) => {
                    console.log("Data yang diimpor:", importedData);
                    alert(`${importedData.length} data pengeluaran berhasil diimpor!`);
                  }}
                  generateTemplate={() => [
                    {
                      id: "EXP-TEMPLATE-001",
                      date: "2025-03-27", // Format YYYY-MM-DD
                      description: "Contoh Deskripsi Pengeluaran",
                      amount: 1000000,
                      category: "Pembelian Produk", // Harus sesuai dengan kategori yang tersedia
                      paymentMethod: "Cash", // Cash, Transfer, atau Card
                      notes: "Catatan tambahan jika ada",
                      reference: "Nomor referensi jika ada"
                    },
                    {
                      id: "EXP-TEMPLATE-002",
                      date: "2025-03-26",
                      description: "Contoh Deskripsi Pengeluaran Lain",
                      amount: 500000,
                      category: "Operasional",
                      paymentMethod: "Transfer",
                      notes: "",
                      reference: ""
                    }
                  ]}
                  templateFilename="Template_Import_Pengeluaran"
                  templateHeaders={[
                    "ID", "Tanggal", "Deskripsi", "Jumlah", "Kategori", "Metode Pembayaran", "Catatan", "Referensi"
                  ]}
                  title="Import Data Pengeluaran"
                  description="Upload file data pengeluaran sesuai format template"
                  trigger={
                    <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
                      <FaFileUpload className="mr-2 h-4 w-4" />
                      Import
                    </Button>
                  }
                />
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
                  {currentExpenses.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-orange-50 border-b border-orange-100">
                      <TableCell className="font-medium py-3">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{transaction.description}</span>
                          <span className="text-xs text-gray-500">ID: {transaction.id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 font-semibold text-orange-600">
                        {formatCurrency(transaction.amount)}
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
                            onClick={() => handleViewExpense(transaction)}
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                          >
                            <FaEye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditExpense(transaction)}
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
                Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredExpenses.length)} dari {filteredExpenses.length} transaksi
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
                  {Array.from({ length: Math.min(5, Math.ceil(filteredExpenses.length / itemsPerPage)) }, (_, i) => {
                    const pageToShow = currentPage <= 3
                      ? i + 1
                      : currentPage >= Math.ceil(filteredExpenses.length / itemsPerPage) - 2
                        ? Math.ceil(filteredExpenses.length / itemsPerPage) - 4 + i
                        : currentPage - 2 + i;
                    
                    if (pageToShow <= Math.ceil(filteredExpenses.length / itemsPerPage) && pageToShow > 0) {
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
                    onClick={() => paginate(Math.min(Math.ceil(filteredExpenses.length / itemsPerPage), currentPage + 1))}
                    disabled={currentPage === Math.ceil(filteredExpenses.length / itemsPerPage)}
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

      {/* Dialog untuk melihat detail pengeluaran */}
      <Dialog open={viewExpenseDialog} onOpenChange={setViewExpenseDialog}>
        <DialogContent className="p-0 border-orange-200 max-w-3xl">
          {/* Top decorative gradient */}
          <div className="h-2 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-500"></div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-56 h-56 bg-orange-200 rounded-full opacity-20 transform translate-x-16 -translate-y-16 z-0"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-200 rounded-full opacity-30"></div>
          
          {selectedExpense && (
            <div className="p-6 relative z-10">
              <DialogHeader className="flex flex-row items-center mb-6">
                <div className="h-12 w-1.5 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full mr-4"></div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-orange-800">Detail Pengeluaran</DialogTitle>
                  <DialogDescription className="text-orange-600">
                    Informasi lengkap transaksi pengeluaran
                  </DialogDescription>
                </div>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-5 rounded-lg border border-orange-100">
                    <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 mr-3 shadow-sm">
                        <FaReceipt className="h-4 w-4 text-white" />
                      </div>
                      Informasi Transaksi
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">Deskripsi</div>
                        <div className="text-base font-semibold text-gray-800">{selectedExpense.description}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">Tanggal</div>
                        <div className="text-base font-semibold text-gray-800">{formatDate(selectedExpense.date)}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">ID Transaksi</div>
                        <div className="text-base font-medium text-gray-700">{selectedExpense.id}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">Referensi</div>
                        <div className="text-base font-medium text-gray-700">
                          {selectedExpense.reference || "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {selectedExpense.notes && (
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-5 rounded-lg border border-orange-100">
                      <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 mr-3 shadow-sm">
                          <FaEdit className="h-4 w-4 text-white" />
                        </div>
                        Catatan
                      </h3>
                      
                      <div className="text-gray-700 italic bg-white p-3 rounded-md border border-orange-100">
                        &quot;{selectedExpense.notes}&quot;
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-5 rounded-lg border border-orange-100">
                    <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 mr-3 shadow-sm">
                        <FaMoneyBillWave className="h-4 w-4 text-white" />
                      </div>
                      Detail Pembayaran
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">Jumlah</div>
                        <div className="text-xl font-bold text-orange-600">
                          {formatCurrency(selectedExpense.amount)}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">Kategori</div>
                        <div className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                          {getCategoryIcon(selectedExpense.category)}
                          <span className="ml-1.5">{selectedExpense.category}</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">Metode Pembayaran</div>
                        <div className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {selectedExpense.paymentMethod}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {selectedExpense.receipt && (
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-5 rounded-lg border border-orange-100">
                      <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 mr-3 shadow-sm">
                          <FaFileInvoiceDollar className="h-4 w-4 text-white" />
                        </div>
                        Bukti Pembayaran
                      </h3>
                      
                      <div className="bg-white p-2 rounded-md border border-orange-100">
                        <div className="text-center py-6">
                          <FaFileInvoiceDollar className="h-10 w-10 mx-auto mb-3 text-orange-300" />
                          <div className="text-sm font-medium">{selectedExpense.receipt.name || "receipt.jpg"}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setViewExpenseDialog(false)} 
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <FaTimes className="h-4 w-4 mr-2" />
                  Tutup
                </Button>
                <Button 
                  onClick={() => {
                    setViewExpenseDialog(false);
                    handleEditExpense(selectedExpense);
                  }} 
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                >
                  <FaEdit className="h-4 w-4 mr-2" />
                  Edit Pengeluaran
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog untuk edit pengeluaran */}
      <Dialog open={editExpenseDialog} onOpenChange={setEditExpenseDialog}>
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
                <DialogTitle className="text-2xl font-bold text-orange-800">Edit Pengeluaran</DialogTitle>
                <DialogDescription className="text-orange-600">
                  Ubah informasi detail untuk pengeluaran ini
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
                          placeholder="Masukkan deskripsi pengeluaran" 
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
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-600 font-semibold">
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
                            <SelectValue placeholder="Pilih kategori pengeluaran" />
                          </SelectTrigger>
                          <SelectContent>
                            {expenseCategories.map((category) => (
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
                      Bukti Pembayaran
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Unggah Bukti Pembayaran (Opsional)</Label>
                        <div className="border-2 border-dashed border-orange-200 rounded-lg p-6 text-center hover:bg-orange-50 transition-colors">
                          <input
                            type="file"
                            id="receiptEdit"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                          <label
                            htmlFor="receiptEdit"
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
                    Perubahan ini akan dicatat dalam buku kas dan laporan keuangan
                  </span>
                </div>
                <div className="flex gap-3">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setEditExpenseDialog(false)} 
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
                    Simpan Perubahan
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog untuk form tambah pengeluaran */}
      <Dialog open={addExpenseDialog} onOpenChange={setAddExpenseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <FaPlus className="text-xl" />
              Tambah Pengeluaran
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center mb-4">
              <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaMoneyBillWave className="text-2xl text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Tambah Pengeluaran Baru
              </h3>
              <p className="text-gray-600 text-sm">
                Masukkan informasi detail untuk pengeluaran baru
              </p>
            </div>

            
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Deskripsi</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Masukkan deskripsi pengeluaran"
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="amount">Jumlah (Rp)</Label>
                <Input
                  id="amount"
                  type="number"
                  name="amount"
                  placeholder="0"
                  value={formData.amount}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="category">Kategori</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => handleSelectChange('category', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category) => (
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
              
              <div>
                <Label htmlFor="paymentMethod">Metode Pembayaran</Label>
                <Select 
                  value={formData.paymentMethod} 
                  onValueChange={(value) => handleSelectChange('paymentMethod', value)}
                >
                  <SelectTrigger className="mt-1">
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
              
              <div>
                <Label htmlFor="date">Tanggal</Label>
                <Input
                  id="date"
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Catatan (Opsional)</Label>
                <Input
                  id="notes"
                  name="notes"
                  placeholder="Catatan tambahan..."
                  value={formData.notes}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddExpenseDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700">
              <FaPlus className="mr-2" />
              Tambah Pengeluaran
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog untuk edit pengeluaran */}
      <Dialog open={editExpenseDialog} onOpenChange={setEditExpenseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <FaEdit className="text-xl" />
              Edit Pengeluaran
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center mb-4">
              <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaEdit className="text-2xl text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Edit Pengeluaran
              </h3>
              <p className="text-gray-600 text-sm">
                Ubah informasi detail untuk pengeluaran ini
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-description">Deskripsi</Label>
                <Input
                  id="edit-description"
                  name="description"
                  placeholder="Masukkan deskripsi pengeluaran"
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-amount">Jumlah (Rp)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  name="amount"
                  placeholder="0"
                  value={formData.amount}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-category">Kategori</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => handleSelectChange('category', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category) => (
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
              
              <div>
                <Label htmlFor="edit-paymentMethod">Metode Pembayaran</Label>
                <Select 
                  value={formData.paymentMethod} 
                  onValueChange={(value) => handleSelectChange('paymentMethod', value)}
                >
                  <SelectTrigger className="mt-1">
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
              
              <div>
                <Label htmlFor="edit-date">Tanggal</Label>
                <Input
                  id="edit-date"
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-notes">Catatan (Opsional)</Label>
                <Input
                  id="edit-notes"
                  name="notes"
                  placeholder="Catatan tambahan..."
                  value={formData.notes}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditExpenseDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700">
              <FaEdit className="mr-2" />
              Update Pengeluaran
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog untuk hapus pengeluaran */}
      <Dialog open={!!selectedExpense && viewExpenseDialog === false && editExpenseDialog === false} onOpenChange={() => setSelectedExpense(null)}>
        <DialogContent className="p-0 max-w-3xl">
          {/* Top decorative gradient */}
          <div className="h-2 w-full bg-gradient-to-r from-red-400 via-red-500 to-red-400"></div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-red-200 rounded-full opacity-20 transform translate-x-16 -translate-y-16 z-0"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-100 rounded-full opacity-30"></div>
          
          <div className="p-6 relative z-10">
            <DialogHeader className="flex flex-row items-center mb-6">
              <div className="h-12 w-1.5 bg-gradient-to-b from-red-500 to-red-400 rounded-full mr-4"></div>
              <div>
                <DialogTitle className="text-2xl font-bold text-red-800">Hapus Pengeluaran</DialogTitle>
                <DialogDescription className="text-red-600">
                  Apakah Anda yakin ingin menghapus pengeluaran ini?
                </DialogDescription>
              </div>
            </DialogHeader>

            {selectedExpense && (
              <div className="my-4 p-4 bg-red-50 border border-red-100 rounded-md">
                <p className="font-semibold">{selectedExpense.description}</p>
                <p className="text-sm text-gray-600">{selectedExpense.date}</p>
                <p className="text-orange-600 font-medium mt-2">
                  {formatCurrency(selectedExpense.amount)}
                </p>
              </div>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setSelectedExpense(null)}
                className="border-gray-200"
              >
                Batal
              </Button>
              <Button 
                onClick={async () => {
                  if (selectedExpense) {
                    try {
                      // First update UI for immediate feedback
                      setExpenseTransactions(prev => 
                        prev.filter(item => item.id !== selectedExpense.id)
                      );
                      
                      // Then send to API
                      const response = await fetch(`/api/finance/expenses?id=${selectedExpense.id}`, {
                        method: 'DELETE',
                      });
                      
                      if (!response.ok) {
                        console.error('API error:', response.statusText);
                        // Show error message, but UI already updated
                      } else {
                        console.log('Expense deleted successfully');
                      }
                    } catch (err) {
                      console.error('Error deleting expense:', err);
                    } finally {
                      setSelectedExpense(null);
                    }
                  }
                }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                <FaTrash className="mr-2 h-4 w-4" /> Hapus
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FinanceLayout>
  );
};

export default FinanceExpensesPage;
