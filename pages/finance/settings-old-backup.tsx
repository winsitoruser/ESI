import { NextPage } from "next";
import { useState, useEffect } from "react";
import FinanceLayout from "@/components/layouts/finance-layout";
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FaCog,
  FaCreditCard,
  FaUniversity,
  FaTags,
  FaUsers,
  FaPlus,
  FaEdit,
  FaTrash,
  FaExclamationTriangle,
  FaAngleRight,
  FaCheck,
  FaTimes,
  FaInfoCircle,
  FaPercent,
  FaUserShield,
  FaBoxes,
  FaBuilding,
  FaCalculator,
  FaCar,
  FaChair,
  FaCoins,
  FaDesktop,
  FaDollarSign,
  FaFileInvoiceDollar,
  FaGem,
  FaHome,
  FaIndustry,
  FaLandmark,
  FaLaptop,
  FaMobile,
  FaMoneyBillWave,
  FaPiggyBank,
  FaPrint,
  FaServer,
  FaShoppingCart,
  FaStore,
  FaTractor,
  FaTruckMoving,
  FaWarehouse,
  FaBox,
  FaTools,
  FaMedkit,
  FaCapsules,
  FaStethoscope,
  FaHeartbeat,
  FaBolt
} from "react-icons/fa";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define types for the settings page
type PaymentMethod = {
  id: number;
  name: string;
  fees: number;
  processing: string;
  isActive: boolean;
  icon?: string;
};

type BankAccount = {
  id: number;
  name: string;
  accountNumber: string;
  bank: string;
  bankCode?: string;
  branch: string;
  isDefault: boolean;
  icon?: string;
};

type IndonesianBank = {
  code: string;
  name: string;
  shortName: string;
  type: string;
};

type Category = {
  id: number;
  name: string;
  type: 'income' | 'expense';
  description?: string;
  isActive: boolean;
  icon?: string;
};

type AccountJournal = {
  id: number;
  code: string;
  name: string;
  category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subCategory?: string;
  normalBalance: 'debit' | 'credit';
  isActive: boolean;
  description?: string;
};

// Mock Data
const mockPaymentMethodsData = [
  { id: 1, name: "Kartu Kredit", fees: 2.5, processing: "Instan", isActive: true, icon: "FaCreditCard" },
  { id: 2, name: "Transfer Bank", fees: 0, processing: "1-2 Hari Kerja", isActive: true, icon: "FaUniversity" },
  { id: 3, name: "QRIS", fees: 0.7, processing: "Instan", isActive: true, icon: "FaTags" },
  { id: 4, name: "Tunai", fees: 0, processing: "Instan", isActive: true, icon: "FaMoneyBillWave" }
];

const mockBankAccountsData = [
  { id: 1, name: "Bank BCA", accountNumber: "1234567890", accountName: "PT Farmax Pharmacy", branch: "Jakarta Pusat", isPrimary: true, icon: "FaBuilding" },
  { id: 2, name: "Bank Mandiri", accountNumber: "0987654321", accountName: "PT Farmax Pharmacy", branch: "Jakarta Selatan", isPrimary: false, icon: "FaBoxes" },
  { id: 3, name: "Bank BNI", accountNumber: "1122334455", accountName: "PT Farmax Pharmacy", branch: "Jakarta Barat", isPrimary: false, icon: "FaServer" }
];

const mockExpenseCategories = [
  { id: 1, name: "Operasional", description: "Biaya operasional sehari-hari", isActive: true, type: "expense", icon: "FaCog" },
  { id: 2, name: "Pembelian Obat", description: "Pembelian stok obat dan produk", isActive: true, type: "expense", icon: "FaCapsules" },
  { id: 3, name: "Gaji Karyawan", description: "Penggajian staf dan karyawan", isActive: true, type: "expense", icon: "FaUserShield" },
  { id: 4, name: "Sewa Lokasi", description: "Pembayaran sewa gedung", isActive: true, type: "expense", icon: "FaHome" },
  { id: 5, name: "Utilitas", description: "Pembayaran listrik, air, internet, dll", isActive: true, type: "expense", icon: "FaBolt" }
];

const mockIncomeCategories = [
  { id: 1, name: "Penjualan Resep", description: "Pendapatan dari penjualan resep dokter", isActive: true, type: "income", icon: "FaCapsules" },
  { id: 2, name: "Penjualan Non-Resep", description: "Pendapatan dari penjualan obat bebas", isActive: true, type: "income", icon: "FaCapsules" },
  { id: 3, name: "Layanan Konsultasi", description: "Pendapatan dari jasa konsultasi", isActive: true, type: "income", icon: "FaStethoscope" },
  { id: 4, name: "Produk Kesehatan", description: "Penjualan produk kesehatan non-obat", isActive: true, type: "income", icon: "FaMedkit" }
];

const mockUserAccess = [
  { id: 1, name: "Admin Keuangan", email: "finance@farmax.id", role: "Finance Admin", access: ["view", "create", "edit", "delete", "approve"] },
  { id: 2, name: "Pemilik Apotek", email: "owner@farmax.id", role: "Owner", access: ["view", "approve"] },
  { id: 3, name: "Manager Operasional", email: "manager@farmax.id", role: "Operational Manager", access: ["view", "create", "edit"] }
];

const mockAssets = [
  { id: 1, name: 'Komputer Kantor', value: 15000000, description: 'PC dan perangkat komputer kantor', icon: 'FaDesktop', category: 'Elektronik', isActive: true },
  { id: 2, name: 'Kendaraan Operasional', value: 180000000, description: 'Mobil untuk kebutuhan operasional', icon: 'FaCar', category: 'Kendaraan', isActive: true },
  { id: 3, name: 'Peralatan Kantor', value: 8500000, description: 'Meja, kursi, dan perlengkapan kantor', icon: 'FaChair', category: 'Furnitur', isActive: true },
  { id: 4, name: 'Server & Storage', value: 45000000, description: 'Server dan perangkat penyimpanan data', icon: 'FaServer', category: 'IT', isActive: true },
];

const mockAccountJournalsData: AccountJournal[] = [
  // Asset (Aktiva) accounts - 1-XXXX series
  { id: 1, code: "1-1100", name: "Kas", category: "asset", subCategory: "Current Assets", normalBalance: "debit", isActive: true, description: "Kas tunai perusahaan" },
  { id: 2, code: "1-1200", name: "Kas Bank", category: "asset", subCategory: "Current Assets", normalBalance: "debit", isActive: true, description: "Kas di rekening bank" },
  { id: 3, code: "1-1300", name: "Piutang Dagang", category: "asset", subCategory: "Current Assets", normalBalance: "debit", isActive: true, description: "Piutang dari penjualan" },
  { id: 4, code: "1-1400", name: "Persediaan Barang Dagang", category: "asset", subCategory: "Current Assets", normalBalance: "debit", isActive: true, description: "Persediaan untuk dijual" },
  { id: 5, code: "1-2100", name: "Perlengkapan Kantor", category: "asset", subCategory: "Fixed Assets", normalBalance: "debit", isActive: true, description: "Perlengkapan kantor" },
  { id: 6, code: "1-2200", name: "Peralatan", category: "asset", subCategory: "Fixed Assets", normalBalance: "debit", isActive: true, description: "Peralatan operasional" },
  { id: 7, code: "1-2300", name: "Akumulasi Penyusutan Peralatan", category: "asset", subCategory: "Fixed Assets", normalBalance: "credit", isActive: true, description: "Kontra akun untuk peralatan" },
  
  // Liability (Kewajiban) accounts - 2-XXXX series
  { id: 8, code: "2-1100", name: "Hutang Dagang", category: "liability", subCategory: "Current Liabilities", normalBalance: "credit", isActive: true, description: "Hutang dari pembelian" },
  { id: 9, code: "2-1200", name: "Hutang Gaji", category: "liability", subCategory: "Current Liabilities", normalBalance: "credit", isActive: true, description: "Hutang gaji karyawan" },
  { id: 10, code: "2-1300", name: "Hutang Pajak", category: "liability", subCategory: "Current Liabilities", normalBalance: "credit", isActive: true, description: "Hutang pajak perusahaan" },
  { id: 11, code: "2-2100", name: "Hutang Bank", category: "liability", subCategory: "Long-term Liabilities", normalBalance: "credit", isActive: true, description: "Pinjaman dari bank" },
  
  // Equity (Ekuitas) accounts - 3-XXXX series
  { id: 12, code: "3-1000", name: "Modal Pemilik", category: "equity", normalBalance: "credit", isActive: true, description: "Modal dari pemilik" },
  { id: 13, code: "3-2000", name: "Prive", category: "equity", normalBalance: "debit", isActive: true, description: "Pengambilan pribadi pemilik" },
  { id: 14, code: "3-3000", name: "Laba Ditahan", category: "equity", normalBalance: "credit", isActive: true, description: "Laba yang belum dibagikan" },
  
  // Revenue (Pendapatan) accounts - 4-XXXX series
  { id: 15, code: "4-1000", name: "Pendapatan Penjualan", category: "revenue", normalBalance: "credit", isActive: true, description: "Pendapatan dari penjualan" },
  { id: 16, code: "4-2000", name: "Pendapatan Jasa", category: "revenue", normalBalance: "credit", isActive: true, description: "Pendapatan dari jasa" },
  { id: 17, code: "4-3000", name: "Pendapatan Lain-lain", category: "revenue", normalBalance: "credit", isActive: true, description: "Pendapatan di luar operasi utama" },
  
  // Expense (Beban) accounts - 5-XXXX series
  { id: 18, code: "5-1000", name: "Beban Gaji", category: "expense", normalBalance: "debit", isActive: true, description: "Beban gaji karyawan" },
  { id: 19, code: "5-2000", name: "Beban Sewa", category: "expense", normalBalance: "debit", isActive: true, description: "Beban sewa tempat" },
  { id: 20, code: "5-3000", name: "Beban Listrik & Air", category: "expense", normalBalance: "debit", isActive: true, description: "Beban utilitas" },
  { id: 21, code: "5-4000", name: "Beban Iklan", category: "expense", normalBalance: "debit", isActive: true, description: "Beban pemasaran" },
  { id: 22, code: "5-5000", name: "Beban Penyusutan", category: "expense", normalBalance: "debit", isActive: true, description: "Beban penyusutan aset" },
  { id: 23, code: "5-6000", name: "Harga Pokok Penjualan", category: "expense", normalBalance: "debit", isActive: true, description: "Biaya produk yang dijual" },
  { id: 24, code: "5-7000", name: "Beban Lain-lain", category: "expense", normalBalance: "debit", isActive: true, description: "Beban di luar operasi utama" },
];

const FinanceSettingsPage: NextPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("general");
  const { toast } = useToast();
  
  // Initialize state variables for different settings types
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(mockBankAccountsData);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [accountJournals, setAccountJournals] = useState<AccountJournal[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  
  // Payment Methods State
  const [isPaymentMethodDialogOpen, setIsPaymentMethodDialogOpen] = useState(false);
  const [isDeletePaymentDialogOpen, setIsDeletePaymentDialogOpen] = useState(false);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<any>(null);
  const [selectedPaymentIcon, setSelectedPaymentIcon] = useState<string | null>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    id: 0,
    name: "",
    fees: 0,
    processing: "",
    isActive: true,
    icon: ""
  });
  
  // Bank Account States
  const [isBankAccountDialogOpen, setIsBankAccountDialogOpen] = useState(false);
  const [isDeleteBankDialogOpen, setIsDeleteBankDialogOpen] = useState(false);
  const [currentBankAccount, setCurrentBankAccount] = useState<any>(null);
  const [selectedBankIcon, setSelectedBankIcon] = useState<string | null>(null);
  const [bankFormData, setBankFormData] = useState({
    id: 0,
    name: "",
    accountNumber: "",
    accountName: "",
    bankCode: "",
    branch: "",
    isPrimary: false,
    icon: ""
  });
  
  // Indonesian Banks State
  const [indonesianBanks, setIndonesianBanks] = useState<IndonesianBank[]>([]);
  const [bankSearchTerm, setBankSearchTerm] = useState("");
  const [filteredBanks, setFilteredBanks] = useState<IndonesianBank[]>([]);
  const [selectedBankType, setSelectedBankType] = useState("all");
  const [loadingBanks, setLoadingBanks] = useState(false);
  
  // Categories State
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<any>(null);
  const [selectedCategoryIcon, setSelectedCategoryIcon] = useState<string | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    id: 0,
    name: "",
    description: "",
    type: "expense",
    isActive: true,
    icon: ""
  });
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);
  
  // User Access State
  const [userAccess, setUserAccess] = useState(mockUserAccess);
  
  // Assets State
  const [assets, setAssets] = useState([]);
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [selectedAssetIcon, setSelectedAssetIcon] = useState<string | null>(null);
  const [assetFormData, setAssetFormData] = useState({
    id: 0,
    name: "",
    value: 0,
    description: "",
    icon: "",
    category: "",
    isActive: true
  });
  const [currentAsset, setCurrentAsset] = useState<any>(null);
  const [isDeleteAssetDialogOpen, setIsDeleteAssetDialogOpen] = useState(false);

  // Fetch Indonesian Banks
  useEffect(() => {
    fetchIndonesianBanks();
  }, []);

  // Fetch Payment Methods from API
  useEffect(() => {
    async function fetchPaymentMethods() {
      try {
        const response = await fetch('/api/finance/payment-methods-simple');
        const result = await response.json();
        if (result.success && result.data) {
          setPaymentMethods(result.data.map((pm: any) => ({
            id: pm.id,
            name: pm.name,
            fees: pm.fees || 0,
            processing: pm.processingTime || '',
            isActive: pm.isActive,
            icon: pm.icon || ''
          })));
        }
      } catch (error) {
        console.error('Failed to fetch payment methods:', error);
      }
    }
    fetchPaymentMethods();
  }, []);

  // Fetch Categories from API
  useEffect(() => {
    async function fetchCategories() {
      try {
        const [expenseRes, incomeRes] = await Promise.all([
          fetch('/api/finance/categories-simple?type=expense'),
          fetch('/api/finance/categories-simple?type=income')
        ]);
        
        const expenseData = await expenseRes.json();
        const incomeData = await incomeRes.json();
        
        if (expenseData.success && expenseData.data) {
          setExpenseCategories(expenseData.data.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description || '',
            isActive: cat.isActive,
            type: 'expense' as const,
            icon: cat.icon || ''
          })));
        }
        
        if (incomeData.success && incomeData.data) {
          setIncomeCategories(incomeData.data.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description || '',
            isActive: cat.isActive,
            type: 'income' as const,
            icon: cat.icon || ''
          })));
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    }
    fetchCategories();
  }, []);

  // Fetch Chart of Accounts from API
  useEffect(() => {
    async function fetchChartOfAccounts() {
      try {
        const response = await fetch('/api/finance/chart-of-accounts-simple');
        const result = await response.json();
        if (result.success && result.data) {
          setAccountJournals(result.data.map((acc: any) => ({
            id: acc.id,
            code: acc.code,
            name: acc.name,
            category: acc.category,
            subCategory: acc.subCategory,
            normalBalance: acc.normalBalance,
            isActive: acc.isActive,
            description: acc.description || ''
          })));
        }
      } catch (error) {
        console.error('Failed to fetch chart of accounts:', error);
      } finally {
        setLoadingSettings(false);
      }
    }
    fetchChartOfAccounts();
  }, []);

  // Fetch Assets from API
  useEffect(() => {
    async function fetchAssets() {
      try {
        const response = await fetch('/api/finance/assets-simple');
        const result = await response.json();
        if (result.success && result.data) {
          setAssets(result.data.map((asset: any) => ({
            id: asset.id,
            name: asset.name,
            value: asset.value,
            description: asset.description || '',
            icon: asset.icon || '',
            category: asset.category || '',
            isActive: asset.isActive
          })));
        }
      } catch (error) {
        console.error('Failed to fetch assets:', error);
      }
    }
    fetchAssets();
  }, []);

  const fetchIndonesianBanks = async () => {
    try {
      setLoadingBanks(true);
      const response = await fetch('/api/finance/banks', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success) {
        setIndonesianBanks(result.data.banks);
        setFilteredBanks(result.data.banks);
      } else {
        // Fallback to mock data if API fails
        const mockBanks = [
          { code: '002', name: 'Bank Rakyat Indonesia (BRI)', shortName: 'BRI', type: 'BUMN' },
          { code: '008', name: 'Bank Mandiri', shortName: 'Mandiri', type: 'BUMN' },
          { code: '009', name: 'Bank Negara Indonesia (BNI)', shortName: 'BNI', type: 'BUMN' },
          { code: '014', name: 'Bank Central Asia (BCA)', shortName: 'BCA', type: 'Swasta' },
          { code: '013', name: 'Bank Permata', shortName: 'Permata', type: 'Swasta' },
          { code: '022', name: 'Bank CIMB Niaga', shortName: 'CIMB Niaga', type: 'Asing' },
          { code: '028', name: 'Bank OCBC NISP', shortName: 'OCBC NISP', type: 'Asing' },
          { code: '041', name: 'The Hongkong & Shanghai B.C.', shortName: 'HSBC', type: 'Asing' },
          { code: '050', name: 'Standard Chartered Bank', shortName: 'Standard Chartered', type: 'Asing' },
          { code: '110', name: 'Bank Jabar Banten (BJB)', shortName: 'BJB', type: 'BPD' },
          { code: '111', name: 'Bank DKI Jakarta', shortName: 'Bank DKI', type: 'BPD' },
          { code: '147', name: 'Bank Muamalat', shortName: 'Bank Muamalat', type: 'Syariah' },
          { code: '451', name: 'Bank Syariah Indonesia (BSI)', shortName: 'BSI', type: 'Syariah' },
          { code: '536', name: 'Bank BCA Syariah', shortName: 'BCA Syariah', type: 'Syariah' },
          { code: '911', name: 'Jenius (BTPN)', shortName: 'Jenius', type: 'Digital' },
          { code: '912', name: 'Bank Jago (Artos)', shortName: 'Jago', type: 'Digital' },
          { code: '914', name: 'Sea Bank (SeaBank)', shortName: 'SeaBank', type: 'Digital' },
          { code: '915', name: 'Bank Neo Commerce (BNC)', shortName: 'Neo Commerce', type: 'Digital' },
          { code: '200', name: 'Bank Tabungan Negara (BTN)', shortName: 'BTN', type: 'BUMN' },
          { code: '441', name: 'Bank Bukopin', shortName: 'Bukopin', type: 'Swasta' }
        ];
        setIndonesianBanks(mockBanks);
        setFilteredBanks(mockBanks);
        console.log('Using fallback bank data');
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
      // Use fallback data on error
      const mockBanks = [
        { code: '002', name: 'Bank Rakyat Indonesia (BRI)', shortName: 'BRI', type: 'BUMN' },
        { code: '008', name: 'Bank Mandiri', shortName: 'Mandiri', type: 'BUMN' },
        { code: '009', name: 'Bank Negara Indonesia (BNI)', shortName: 'BNI', type: 'BUMN' },
        { code: '014', name: 'Bank Central Asia (BCA)', shortName: 'BCA', type: 'Swasta' },
        { code: '013', name: 'Bank Permata', shortName: 'Permata', type: 'Swasta' },
        { code: '022', name: 'Bank CIMB Niaga', shortName: 'CIMB Niaga', type: 'Asing' },
        { code: '028', name: 'Bank OCBC NISP', shortName: 'OCBC NISP', type: 'Asing' },
        { code: '041', name: 'The Hongkong & Shanghai B.C.', shortName: 'HSBC', type: 'Asing' },
        { code: '050', name: 'Standard Chartered Bank', shortName: 'Standard Chartered', type: 'Asing' },
        { code: '110', name: 'Bank Jabar Banten (BJB)', shortName: 'BJB', type: 'BPD' },
        { code: '111', name: 'Bank DKI Jakarta', shortName: 'Bank DKI', type: 'BPD' },
        { code: '147', name: 'Bank Muamalat', shortName: 'Bank Muamalat', type: 'Syariah' },
        { code: '451', name: 'Bank Syariah Indonesia (BSI)', shortName: 'BSI', type: 'Syariah' },
        { code: '536', name: 'Bank BCA Syariah', shortName: 'BCA Syariah', type: 'Syariah' },
        { code: '911', name: 'Jenius (BTPN)', shortName: 'Jenius', type: 'Digital' },
        { code: '912', name: 'Bank Jago (Artos)', shortName: 'Jago', type: 'Digital' },
        { code: '914', name: 'Sea Bank (SeaBank)', shortName: 'SeaBank', type: 'Digital' },
        { code: '915', name: 'Bank Neo Commerce (BNC)', shortName: 'Neo Commerce', type: 'Digital' },
        { code: '200', name: 'Bank Tabungan Negara (BTN)', shortName: 'BTN', type: 'BUMN' },
        { code: '441', name: 'Bank Bukopin', shortName: 'Bukopin', type: 'Swasta' }
      ];
      setIndonesianBanks(mockBanks);
      setFilteredBanks(mockBanks);
    } finally {
      setLoadingBanks(false);
    }
  };

  // Filter banks based on search and type
  useEffect(() => {
    let filtered = indonesianBanks;
    
    if (bankSearchTerm) {
      const searchLower = bankSearchTerm.toLowerCase();
      filtered = filtered.filter(bank => 
        bank.name.toLowerCase().includes(searchLower) ||
        bank.shortName.toLowerCase().includes(searchLower) ||
        bank.code.includes(searchLower)
      );
    }
    
    if (selectedBankType !== 'all') {
      filtered = filtered.filter(bank => bank.type === selectedBankType);
    }
    
    setFilteredBanks(filtered);
  }, [bankSearchTerm, selectedBankType, indonesianBanks]);

  // Journal Account States
  const [isAccountJournalDialogOpen, setIsAccountJournalDialogOpen] = useState(false);
  const [isDeleteAccountJournalDialogOpen, setIsDeleteAccountJournalDialogOpen] = useState(false);
  const [currentAccountJournal, setCurrentAccountJournal] = useState<AccountJournal | null>(null);
  const [accountJournalFormData, setAccountJournalFormData] = useState({
    id: 0,
    code: "",
    name: "",
    category: "asset" as "asset" | "liability" | "equity" | "revenue" | "expense",
    subCategory: "",
    normalBalance: "debit" as "debit" | "credit",
    isActive: true,
    description: ""
  });

  // Asset Icons Map - for rendering the icons
  const assetIcons: Record<string, React.ReactNode> = {
    FaBoxes: <FaBoxes />,
    FaBuilding: <FaBuilding />,
    FaCalculator: <FaCalculator />,
    FaCar: <FaCar />,
    FaChair: <FaChair />,
    FaCoins: <FaCoins />,
    FaDesktop: <FaDesktop />,
    FaDollarSign: <FaDollarSign />,
    FaFileInvoiceDollar: <FaFileInvoiceDollar />,
    FaGem: <FaGem />,
    FaHome: <FaHome />,
    FaIndustry: <FaIndustry />,
    FaLandmark: <FaLandmark />,
    FaLaptop: <FaLaptop />,
    FaMobile: <FaMobile />,
    FaMoneyBillWave: <FaMoneyBillWave />,
    FaPiggyBank: <FaPiggyBank />,
    FaPrint: <FaPrint />,
    FaServer: <FaServer />,
    FaShoppingCart: <FaShoppingCart />,
    FaStore: <FaStore />,
    FaTractor: <FaTractor />,
    FaTruckMoving: <FaTruckMoving />,
    FaWarehouse: <FaWarehouse />,
    FaBox: <FaBox />,
    FaTools: <FaTools />,
    FaCog: <FaCog />,
    FaCreditCard: <FaCreditCard />,
    FaUniversity: <FaUniversity />,
    FaTags: <FaTags />,
    FaUsers: <FaUsers />,
    FaPlus: <FaPlus />,
    FaEdit: <FaEdit />,
    FaTrash: <FaTrash />,
    FaExclamationTriangle: <FaExclamationTriangle />,
    FaAngleRight: <FaAngleRight />,
    FaCheck: <FaCheck />,
    FaTimes: <FaTimes />,
    FaInfoCircle: <FaInfoCircle />,
    FaPercent: <FaPercent />,
    FaUserShield: <FaUserShield />,
    FaCapsules: <FaCapsules />,
    FaStethoscope: <FaStethoscope />,
    FaMedkit: <FaMedkit />,
    FaHeartbeat: <FaHeartbeat />,
    FaBolt: <FaBolt />,
  };

  // Function to handle account journal form changes
  const handleAccountJournalFormChange = (field: string, value: any) => {
    if (field === 'category') {
      // Set the default normal balance based on category
      let normalBalance: 'debit' | 'credit' = 'debit';
      
      if (value === 'liability' || value === 'equity' || value === 'revenue') {
        normalBalance = 'credit';
      }
      
      // Set code prefix based on category
      let codePrefix = '';
      switch (value) {
        case 'asset': codePrefix = '1-'; break;
        case 'liability': codePrefix = '2-'; break;
        case 'equity': codePrefix = '3-'; break;
        case 'revenue': codePrefix = '4-'; break;
        case 'expense': codePrefix = '5-'; break;
      }
      
      setAccountJournalFormData({
        ...accountJournalFormData,
        [field]: value,
        normalBalance,
        code: codePrefix + accountJournalFormData.code.split('-')[1] || ''
      });
    } else {
      setAccountJournalFormData({
        ...accountJournalFormData,
        [field]: value,
      });
    }
  };

  // Payment Method Handlers
  const handleAddPaymentMethod = () => {
    setPaymentFormData({
      id: 0,
      name: "",
      fees: 0,
      processing: "",
      isActive: true,
      icon: ""
    });
    setIsPaymentMethodDialogOpen(true);
  };
  
  const handleEditPaymentMethod = (method: any) => {
    setPaymentFormData({
      id: method.id,
      name: method.name,
      fees: method.fees,
      processing: method.processing,
      isActive: method.isActive,
      icon: method.icon
    });
    setIsPaymentMethodDialogOpen(true);
  };
  
  const handleDeletePaymentMethod = (method: any) => {
    setCurrentPaymentMethod(method);
    setIsDeletePaymentDialogOpen(true);
  };
  
  const handleSavePaymentMethod = () => {
    if (paymentFormData.id === 0) {
      // Add new payment method
      const newMethod = {
        ...paymentFormData,
        id: paymentMethods.length + 1
      };
      setPaymentMethods([...paymentMethods, newMethod]);
      toast({
        title: "Metode pembayaran ditambahkan",
        description: `${newMethod.name} berhasil ditambahkan sebagai metode pembayaran.`,
        variant: "default",
      });
    } else {
      // Update existing payment method
      const updatedMethods = paymentMethods.map(method => 
        method.id === paymentFormData.id ? paymentFormData : method
      );
      setPaymentMethods(updatedMethods);
      toast({
        title: "Metode pembayaran diperbarui",
        description: `${paymentFormData.name} berhasil diperbarui.`,
        variant: "default",
      });
    }
    setIsPaymentMethodDialogOpen(false);
  };
  
  const confirmDeletePaymentMethod = () => {
    if (currentPaymentMethod) {
      const updatedMethods = paymentMethods.filter(method => method.id !== currentPaymentMethod.id);
      setPaymentMethods(updatedMethods);
      toast({
        title: "Metode pembayaran dihapus",
        description: `${currentPaymentMethod.name} berhasil dihapus dari daftar.`,
        variant: "destructive",
      });
      setIsDeletePaymentDialogOpen(false);
      setCurrentPaymentMethod(null);
    }
  };
  
  const handlePaymentStatusChange = (id: number, isActive: boolean) => {
    const updatedMethods = paymentMethods.map(method => 
      method.id === id ? {...method, isActive} : method
    );
    setPaymentMethods(updatedMethods);
  };

  // Bank Account Handlers
  const handleAddBankAccount = () => {
    setBankFormData({
      id: 0,
      name: "",
      accountNumber: "",
      accountName: "",
      bankCode: "",
      branch: "",
      isPrimary: false,
      icon: ""
    });
    setBankSearchTerm("");
    setSelectedBankType("all");
    setIsBankAccountDialogOpen(true);
  };

  const handleEditBankAccount = (account: any) => {
    setBankFormData({
      id: account.id,
      name: account.name,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankCode: account.bankCode || "",
      branch: account.branch,
      isPrimary: account.isPrimary,
      icon: account.icon
    });
    setBankSearchTerm("");
    setSelectedBankType("all");
    setIsBankAccountDialogOpen(true);
  };

  const handleBankSelection = (bankCode: string) => {
    const selectedBank = indonesianBanks.find(bank => bank.code === bankCode);
    if (selectedBank) {
      setBankFormData({
        ...bankFormData,
        name: selectedBank.shortName,
        bankCode: selectedBank.code,
        icon: "FaUniversity"
      });
      
      toast({
        title: "Bank dipilih",
        description: `${selectedBank.name} (${selectedBank.code}) telah dipilih`,
        variant: "default",
      });
    }
  };

  const handleDeleteBankAccount = (account: any) => {
    setCurrentBankAccount(account);
    setIsDeleteBankDialogOpen(true);
  };

  const handleSaveBankAccount = () => {
    if (bankFormData.id === 0) {
      // Add new bank account
      const newAccount = {
        ...bankFormData,
        id: bankAccounts.length + 1
      };
      setBankAccounts([...bankAccounts, newAccount]);
      toast({
        title: "Rekening bank ditambahkan",
        description: `${newAccount.name} berhasil ditambahkan sebagai rekening bank.`,
        variant: "default",
      });
    } else {
      // Update existing bank account
      const updatedAccounts = bankAccounts.map(account => 
        account.id === bankFormData.id ? bankFormData : account
      );
      setBankAccounts(updatedAccounts);
      toast({
        title: "Rekening bank diperbarui",
        description: `${bankFormData.name} berhasil diperbarui.`,
        variant: "default",
      });
    }
    setIsBankAccountDialogOpen(false);
  };

  const confirmDeleteBankAccount = () => {
    if (currentBankAccount) {
      const updatedAccounts = bankAccounts.filter(account => account.id !== currentBankAccount.id);
      setBankAccounts(updatedAccounts);
      toast({
        title: "Rekening bank dihapus",
        description: `${currentBankAccount.name} berhasil dihapus dari daftar.`,
        variant: "destructive",
      });
      setIsDeleteBankDialogOpen(false);
      setCurrentBankAccount(null);
    }
  };

  const handleSetPrimaryAccount = (id: number) => {
    const updatedAccounts = bankAccounts.map(account => 
      account.id === id ? {...account, isPrimary: true} : {...account, isPrimary: false}
    );
    setBankAccounts(updatedAccounts);
  };

  // Category Handlers
  const handleAddExpenseCategory = () => {
    setCategoryFormData({
      id: 0,
      name: "",
      description: "",
      type: "expense",
      isActive: true,
      icon: ""
    });
    setIsCategoryDialogOpen(true);
  };

  const handleAddIncomeCategory = () => {
    setCategoryFormData({
      id: 0,
      name: "",
      description: "",
      type: "income",
      isActive: true,
      icon: ""
    });
    setIsCategoryDialogOpen(true);
  };

  const handleEditExpenseCategory = (category: any) => {
    setCategoryFormData({
      id: category.id,
      name: category.name,
      description: category.description,
      type: "expense",
      isActive: category.isActive,
      icon: category.icon
    });
    setIsCategoryDialogOpen(true);
  };

  const handleEditIncomeCategory = (category: any) => {
    setCategoryFormData({
      id: category.id,
      name: category.name,
      description: category.description,
      type: "income",
      isActive: category.isActive,
      icon: category.icon
    });
    setIsCategoryDialogOpen(true);
  };

  const handleDeleteExpenseCategory = (category: any) => {
    setCurrentCategory(category);
    setIsDeleteCategoryDialogOpen(true);
  };

  const handleDeleteIncomeCategory = (category: any) => {
    setCurrentCategory(category);
    setIsDeleteCategoryDialogOpen(true);
  };

  const handleSaveCategory = () => {
    if (categoryFormData.id === 0) {
      if (categoryFormData.type === "expense") {
        const newCategory = {
          ...categoryFormData,
          id: expenseCategories.length + 1
        };
        setExpenseCategories([...expenseCategories, newCategory]);
        toast({
          title: "Kategori pengeluaran ditambahkan",
          description: `${newCategory.name} berhasil ditambahkan sebagai kategori pengeluaran.`,
          variant: "default",
        });
      } else {
        const newCategory = {
          ...categoryFormData,
          id: incomeCategories.length + 1
        };
        setIncomeCategories([...incomeCategories, newCategory]);
        toast({
          title: "Kategori pemasukan ditambahkan",
          description: `${newCategory.name} berhasil ditambahkan sebagai kategori pemasukan.`,
          variant: "default",
        });
      }
    } else {
      if (categoryFormData.type === "expense") {
        const updatedCategories = expenseCategories.map(category => 
          category.id === categoryFormData.id ? categoryFormData : category
        );
        setExpenseCategories(updatedCategories);
        toast({
          title: "Kategori pengeluaran diperbarui",
          description: `${categoryFormData.name} berhasil diperbarui.`,
          variant: "default",
        });
      } else {
        const updatedCategories = incomeCategories.map(category => 
          category.id === categoryFormData.id ? categoryFormData : category
        );
        setIncomeCategories(updatedCategories);
        toast({
          title: "Kategori pemasukan diperbarui",
          description: `${categoryFormData.name} berhasil diperbarui.`,
          variant: "default",
        });
      }
    }
    setIsCategoryDialogOpen(false);
  };

  const confirmDeleteCategory = () => {
    if (currentCategory) {
      if (currentCategory.type === "expense") {
        const updatedCategories = expenseCategories.filter(category => category.id !== currentCategory.id);
        setExpenseCategories(updatedCategories);
        toast({
          title: "Kategori pengeluaran dihapus",
          description: `${currentCategory.name} berhasil dihapus dari daftar.`,
          variant: "destructive",
        });
      } else {
        const updatedCategories = incomeCategories.filter(category => category.id !== currentCategory.id);
        setIncomeCategories(updatedCategories);
        toast({
          title: "Kategori pemasukan dihapus",
          description: `${currentCategory.name} berhasil dihapus dari daftar.`,
          variant: "destructive",
        });
      }
      setIsDeleteCategoryDialogOpen(false);
      setCurrentCategory(null);
    }
  };

  const handleCategoryStatusChange = (id: number, type: string, isActive: boolean) => {
    if (type === "expense") {
      const updatedCategories = expenseCategories.map(category => 
        category.id === id ? {...category, isActive} : category
      );
      setExpenseCategories(updatedCategories);
    } else {
      const updatedCategories = incomeCategories.map(category => 
        category.id === id ? {...category, isActive} : category
      );
      setIncomeCategories(updatedCategories);
    }
  };

  // Asset Handlers
  const handleAddAsset = () => {
    setAssetFormData({
      id: 0,
      name: "",
      value: 0,
      description: "",
      icon: "",
      category: "",
      isActive: true
    });
    setSelectedAssetIcon(null);
    setIsAssetDialogOpen(true);
  };

  const handleEditAsset = (asset: any) => {
    setAssetFormData({
      id: asset.id,
      name: asset.name,
      value: asset.value,
      description: asset.description,
      icon: asset.icon,
      category: asset.category,
      isActive: asset.isActive
    });
    setSelectedAssetIcon(asset.icon);
    setIsAssetDialogOpen(true);
  };

  const handleDeleteAsset = (asset: any) => {
    setCurrentAsset(asset);
    setIsDeleteAssetDialogOpen(true);
  };

  const handleSaveAsset = () => {
    // Update the form data with the selected icon
    const updatedFormData = {
      ...assetFormData,
      icon: selectedAssetIcon || "",
    };

    if (updatedFormData.id === 0) {
      const newAsset = {
        ...updatedFormData,
        id: assets.length + 1
      };
      setAssets([...assets, newAsset]);
      toast({
        title: "Aset berhasil ditambahkan",
        description: `${newAsset.name} telah ditambahkan ke daftar aset.`,
        variant: "default",
      });
    } else {
      const updatedAssets = assets.map(asset => 
        asset.id === updatedFormData.id ? updatedFormData : asset
      );
      setAssets(updatedAssets);
      toast({
        title: "Aset berhasil diperbarui",
        description: `${updatedFormData.name} telah diperbarui.`,
        variant: "default",
      });
    }
    setIsAssetDialogOpen(false);
  };

  const confirmDeleteAsset = () => {
    if (currentAsset) {
      const updatedAssets = assets.filter(asset => asset.id !== currentAsset.id);
      setAssets(updatedAssets);
      toast({
        title: "Aset dihapus",
        description: `${currentAsset.name} berhasil dihapus dari daftar.`,
        variant: "destructive",
      });
      setIsDeleteAssetDialogOpen(false);
      setCurrentAsset(null);
    }
  };

  const handleAssetStatusChange = (id: number, isActive: boolean) => {
    const updatedAssets = assets.map(asset => 
      asset.id === id ? {...asset, isActive} : asset
    );
    setAssets(updatedAssets);
  };

  const handleSelectIcon = (iconName: string) => {
    setSelectedAssetIcon(iconName);
  };

  return (
    <FinanceLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <div className="h-8 w-1.5 bg-gradient-to-b from-orange-500 to-red-500 rounded-full mr-3"></div>
          <h2 className="text-xl font-bold text-gray-800">Pengaturan Keuangan</h2>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="general" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="bg-orange-50 border border-orange-100 p-1 rounded-lg mb-6">
            <TabsTrigger 
              value="general" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <FaCog className="mr-2 h-4 w-4" />
              Umum
            </TabsTrigger>
            <TabsTrigger 
              value="payment-methods" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <FaCreditCard className="mr-2 h-4 w-4" />
              Metode Pembayaran
            </TabsTrigger>
            <TabsTrigger 
              value="bank-accounts" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <FaUniversity className="mr-2 h-4 w-4" />
              Rekening Bank
            </TabsTrigger>
            <TabsTrigger 
              value="categories" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <FaTags className="mr-2 h-4 w-4" />
              Kategori
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <FaUsers className="mr-2 h-4 w-4" />
              Akses Pengguna
            </TabsTrigger>
            <TabsTrigger 
              value="assets" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <FaBoxes className="mr-2 h-4 w-4" />
              Aset
            </TabsTrigger>
            <TabsTrigger 
              value="account-journals" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <FaCalculator className="mr-2 h-4 w-4" />
              Jurnal Akun
            </TabsTrigger>
          </TabsList>
          
          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card className="border-orange-100 overflow-hidden neo-shadow relative">
              {/* Top decorative bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-red-400 to-orange-500"></div>
              
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full opacity-20 transform translate-x-16 -translate-y-16"></div>
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-red-100 rounded-full opacity-30"></div>
              
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50/30 border-b border-orange-200 pb-2">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 mr-3 shadow-sm">
                    <FaCog className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent">Pengaturan Umum</CardTitle>
                    <CardDescription className="text-orange-600/70">Konfigurasi umum untuk sistem keuangan</CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Mata Uang Default</label>
                      <select className="w-full p-2 border border-orange-100 rounded-md focus:ring-orange-500 focus:border-orange-500">
                        <option>IDR - Indonesian Rupiah</option>
                        <option>USD - US Dollar</option>
                        <option>EUR - Euro</option>
                        <option>SGD - Singapore Dollar</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Format Tanggal</label>
                      <select className="w-full p-2 border border-orange-100 rounded-md focus:ring-orange-500 focus:border-orange-500">
                        <option>DD/MM/YYYY</option>
                        <option>MM/DD/YYYY</option>
                        <option>YYYY-MM-DD</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Tahun Fiskal Dimulai</label>
                      <select className="w-full p-2 border border-orange-100 rounded-md focus:ring-orange-500 focus:border-orange-500">
                        <option>Januari</option>
                        <option>April</option>
                        <option>Juli</option>
                        <option>Oktober</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Laporan Default</label>
                      <select className="w-full p-2 border border-orange-100 rounded-md focus:ring-orange-500 focus:border-orange-500">
                        <option>Laba Rugi</option>
                        <option>Pendapatan</option>
                        <option>Pengeluaran</option>
                        <option>Arus Kas</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Informasi Pajak</label>
                    <Input placeholder="Nomor NPWP" className="border-orange-100 focus-visible:ring-orange-500" />
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <FaInfoCircle className="h-4 w-4 text-orange-500 mr-2" />
                      <span className="text-sm text-gray-700">Aktifkan notifikasi untuk transaksi baru</span>
                    </div>
                    <Switch />
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-t border-orange-100">
                    <div className="flex items-center">
                      <FaInfoCircle className="h-4 w-4 text-orange-500 mr-2" />
                      <span className="text-sm text-gray-700">Aktifkan persetujuan untuk pengeluaran besar</span>
                    </div>
                    <Switch />
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                      Simpan Pengaturan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Payment Methods Tab */}
          <TabsContent value="payment-methods" className="space-y-6">
            <Card className="border-orange-100 overflow-hidden neo-shadow relative">
              {/* Top decorative bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-red-400 to-orange-500"></div>
              
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full opacity-20 transform translate-x-16 -translate-y-16"></div>
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-red-100 rounded-full opacity-30"></div>
              
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50/30 border-b border-orange-200 pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 mr-3 shadow-sm">
                      <FaCreditCard className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-orange-800">Metode Pembayaran</CardTitle>
                      <CardDescription className="text-orange-600/70">Kelola metode pembayaran yang diterima</CardDescription>
                    </div>
                  </div>
                  
                  <Button 
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    onClick={handleAddPaymentMethod}
                  >
                    <FaPlus className="mr-2 h-4 w-4" />
                    Tambah Metode
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-orange-50">
                      <TableRow>
                        <TableHead className="text-orange-900 font-medium">Metode</TableHead>
                        <TableHead className="text-orange-900 font-medium">Biaya</TableHead>
                        <TableHead className="text-orange-900 font-medium">Waktu Pemrosesan</TableHead>
                        <TableHead className="text-orange-900 font-medium">Status</TableHead>
                        <TableHead className="text-orange-900 font-medium text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentMethods.map((method) => (
                        <TableRow key={method.id} className="hover:bg-orange-50/60">
                          <TableCell className="font-medium">{method.name}</TableCell>
                          <TableCell>
                            {method.fees > 0 ? (
                              <div className="flex items-center">
                                <FaPercent className="h-3 w-3 text-orange-500 mr-1" />
                                <span>{method.fees}%</span>
                              </div>
                            ) : (
                              <span className="text-emerald-600">Tidak ada</span>
                            )}
                          </TableCell>
                          <TableCell>{method.processing}</TableCell>
                          <TableCell>
                            <Switch 
                              checked={method.isActive} 
                              onCheckedChange={(checked) => handlePaymentStatusChange(method.id, checked)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-gray-500 hover:text-blue-600"
                                onClick={() => handleEditPaymentMethod(method)}
                              >
                                <FaEdit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-gray-500 hover:text-red-600"
                                onClick={() => handleDeletePaymentMethod(method)}
                              >
                                <FaTrash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            
            {/* Payment Method Dialog */}
            <Dialog open={isPaymentMethodDialogOpen} onOpenChange={setIsPaymentMethodDialogOpen}>
              <DialogContent className="fixed left-[50%] top-[50%] z-[100] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-orange-200 rounded-lg bg-white p-6 shadow-xl">
                <div className="absolute inset-0 z-[-1] overflow-hidden rounded-lg">
                  <div className="absolute top-0 right-0 w-56 h-56 bg-orange-200 rounded-full opacity-10 transform translate-x-20 -translate-y-20 blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-56 h-56 bg-amber-200 rounded-full opacity-10 transform -translate-x-16 translate-y-16 blur-2xl"></div>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400 -mt-6 -mx-6 mb-4"></div>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-orange-800">
                    {paymentFormData.id === 0 ? "Tambah Metode Pembayaran" : "Edit Metode Pembayaran"}
                  </DialogTitle>
                  <DialogDescription className="text-orange-600">
                    {paymentFormData.id === 0 
                      ? "Isi formulir di bawah untuk menambahkan metode pembayaran baru" 
                      : "Perbarui informasi metode pembayaran"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Nama
                    </Label>
                    <Input
                      id="name"
                      value={paymentFormData.name}
                      onChange={(e) => setPaymentFormData({...paymentFormData, name: e.target.value})}
                      className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                      placeholder="Contoh: QRIS, Transfer Bank"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fees" className="text-right">
                      Biaya (%)
                    </Label>
                    <Input
                      id="fees"
                      type="number"
                      step="0.1"
                      min="0"
                      value={paymentFormData.fees}
                      onChange={(e) => setPaymentFormData({...paymentFormData, fees: parseFloat(e.target.value)})}
                      className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="processing" className="text-right">
                      Waktu Proses
                    </Label>
                    <Input
                      id="processing"
                      value={paymentFormData.processing}
                      onChange={(e) => setPaymentFormData({...paymentFormData, processing: e.target.value})}
                      className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                      placeholder="Contoh: Instant, 1-2 hari"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="icon" className="text-right">
                      Icon
                    </Label>
                    <div className="col-span-3 flex items-center">
                      <div className="p-1 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 text-white w-8 h-8 flex items-center justify-center">
                        {assetIcons[paymentFormData.icon]}
                      </div>
                      <select
                        id="icon"
                        value={paymentFormData.icon}
                        onChange={(e) => setPaymentFormData({...paymentFormData, icon: e.target.value})}
                        className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                      >
                        <option value="">Pilih Icon</option>
                        {Object.keys(assetIcons).map(icon => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="is-active" className="text-right">
                      Status Aktif
                    </Label>
                    <div className="col-span-3 flex items-center">
                      <Switch 
                        id="is-active"
                        checked={paymentFormData.isActive}
                        onCheckedChange={(checked) => setPaymentFormData({...paymentFormData, isActive: checked})}
                      />
                      <span className="ml-2 text-sm text-gray-500">
                        {paymentFormData.isActive ? "Aktif" : "Tidak Aktif"}
                      </span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPaymentMethodDialogOpen(false)}
                    className="border-orange-200 text-orange-600 hover:bg-orange-50"
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit"
                    onClick={handleSavePaymentMethod}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  >
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Delete Confirmation */}
            <AlertDialog open={isDeletePaymentDialogOpen} onOpenChange={setIsDeletePaymentDialogOpen}>
              <AlertDialogContent className="fixed left-[50%] top-[50%] z-[100] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-orange-200 rounded-lg bg-white p-6 shadow-xl">
                <div className="absolute inset-0 z-[-1] overflow-hidden rounded-lg">
                  <div className="absolute top-0 right-0 w-56 h-56 bg-red-200 rounded-full opacity-10 transform translate-x-20 -translate-y-20 blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-56 h-56 bg-orange-200 rounded-full opacity-10 transform -translate-x-16 translate-y-16 blur-2xl"></div>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-red-400 to-orange-400 -mt-6 -mx-6 mb-4"></div>
                <AlertDialogHeader>
                  <div className="flex items-center text-red-500 mb-2">
                    <FaExclamationTriangle className="h-5 w-5 mr-2" />
                    <AlertDialogTitle>Hapus Metode Pembayaran</AlertDialogTitle>
                  </div>
                  <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus metode pembayaran <span className="font-semibold">{currentPaymentMethod?.name}</span>? 
                    Tindakan ini tidak dapat dibatalkan dan mungkin mempengaruhi data transaksi.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-orange-200 text-orange-600 hover:bg-orange-50">
                    Batal
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmDeletePaymentMethod}
                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                  >
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
          
          {/* Bank Accounts Tab */}
          <TabsContent value="bank-accounts" className="space-y-6">
            <Card className="border-orange-100 overflow-hidden neo-shadow relative">
              {/* Top decorative bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-red-400 to-orange-500"></div>
              
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full opacity-20 transform translate-x-16 -translate-y-16"></div>
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-red-100 rounded-full opacity-30"></div>
              
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50/30 border-b border-orange-200 pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 mr-3 shadow-sm">
                      <FaUniversity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-orange-800">Rekening Bank</CardTitle>
                      <CardDescription className="text-orange-600/70">Kelola rekening bank untuk transaksi</CardDescription>
                    </div>
                  </div>
                  
                  <Button 
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    onClick={handleAddBankAccount}
                  >
                    <FaPlus className="mr-2 h-4 w-4" />
                    Tambah Rekening
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-orange-50">
                      <TableRow>
                        <TableHead className="text-orange-900 font-medium">Bank</TableHead>
                        <TableHead className="text-orange-900 font-medium">Nomor Rekening</TableHead>
                        <TableHead className="text-orange-900 font-medium">Atas Nama</TableHead>
                        <TableHead className="text-orange-900 font-medium">Cabang</TableHead>
                        <TableHead className="text-orange-900 font-medium">Utama</TableHead>
                        <TableHead className="text-orange-900 font-medium text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankAccounts.map((account) => (
                        <TableRow key={account.id} className="hover:bg-orange-50/60">
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>{account.accountNumber}</TableCell>
                          <TableCell>{account.accountName}</TableCell>
                          <TableCell>{account.branch}</TableCell>
                          <TableCell>
                            {account.isPrimary ? (
                              <div className="bg-green-100 text-green-700 rounded-full p-1 w-6 h-6 flex items-center justify-center">
                                <FaCheck className="h-3 w-3" />
                              </div>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs text-gray-500 hover:text-orange-600"
                                onClick={() => handleSetPrimaryAccount(account.id)}
                              >
                                Set Utama
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-gray-500 hover:text-blue-600"
                                onClick={() => handleEditBankAccount(account)}
                              >
                                <FaEdit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-gray-500 hover:text-red-600"
                                onClick={() => handleDeleteBankAccount(account)}
                              >
                                <FaTrash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            
            {/* Bank Account Dialog */}
            <Dialog open={isBankAccountDialogOpen} onOpenChange={setIsBankAccountDialogOpen}>
              <DialogContent className="fixed left-[50%] top-[50%] z-[100] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-orange-200 rounded-lg bg-white p-6 shadow-xl">
                <div className="absolute inset-0 z-[-1] overflow-hidden rounded-lg">
                  <div className="absolute top-0 right-0 w-56 h-56 bg-orange-200 rounded-full opacity-10 transform translate-x-20 -translate-y-20 blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-56 h-56 bg-amber-200 rounded-full opacity-10 transform -translate-x-16 translate-y-16 blur-2xl"></div>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400 -mt-6 -mx-6 mb-4"></div>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-orange-800">
                    {bankFormData.id === 0 ? "Tambah Rekening Bank" : "Edit Rekening Bank"}
                  </DialogTitle>
                  <DialogDescription className="text-orange-600">
                    {bankFormData.id === 0 
                      ? "Isi formulir di bawah untuk menambahkan rekening baru" 
                      : "Perbarui informasi rekening bank"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="bank-selection" className="text-right">
                      Pilih Bank
                    </Label>
                    <div className="col-span-3 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Cari bank..."
                          value={bankSearchTerm}
                          onChange={(e) => setBankSearchTerm(e.target.value)}
                          className="flex-1 border-orange-200 focus-visible:ring-orange-500"
                        />
                        <Select value={selectedBankType} onValueChange={setSelectedBankType}>
                          <SelectTrigger className="w-32 border-orange-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua</SelectItem>
                            <SelectItem value="BUMN">BUMN</SelectItem>
                            <SelectItem value="Swasta">Swasta</SelectItem>
                            <SelectItem value="Asing">Asing</SelectItem>
                            <SelectItem value="BPD">BPD</SelectItem>
                            <SelectItem value="Syariah">Syariah</SelectItem>
                            <SelectItem value="Digital">Digital</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="max-h-40 overflow-y-auto border border-orange-200 rounded-md">
                        {loadingBanks ? (
                          <div className="p-3 text-center text-gray-500">Memuat data bank...</div>
                        ) : filteredBanks.length > 0 ? (
                          filteredBanks.slice(0, 10).map((bank) => (
                            <div
                              key={bank.code}
                              className={`p-2 cursor-pointer hover:bg-orange-50 border-b last:border-b-0 ${
                                bankFormData.bankCode === bank.code ? 'bg-orange-100' : ''
                              }`}
                              onClick={() => handleBankSelection(bank.code)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium text-sm">{bank.shortName}</div>
                                  <div className="text-xs text-gray-500">{bank.name}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-mono bg-gray-100 px-1 rounded">{bank.code}</div>
                                  <div className="text-xs text-gray-500">{bank.type}</div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center text-gray-500">Tidak ada bank ditemukan</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="bank-name" className="text-right">
                      Nama Bank
                    </Label>
                    <div className="col-span-3 flex gap-2">
                      <Input
                        id="bank-name"
                        value={bankFormData.name}
                        onChange={(e) => setBankFormData({...bankFormData, name: e.target.value})}
                        className="flex-1 border-orange-200 focus-visible:ring-orange-500"
                        placeholder="Nama bank akan terisi otomatis"
                        readOnly
                      />
                      <Input
                        value={bankFormData.bankCode}
                        className="w-20 border-orange-200 focus-visible:ring-orange-500 font-mono text-center"
                        placeholder="Kode"
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="account-number" className="text-right">
                      Nomor Rekening
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="account-number"
                        value={bankFormData.accountNumber}
                        onChange={(e) => setBankFormData({...bankFormData, accountNumber: e.target.value})}
                        className="w-full border-orange-200 focus-visible:ring-orange-500"
                        placeholder="Masukkan nomor rekening"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="account-name" className="text-right">
                      Atas Nama
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="account-name"
                        value={bankFormData.accountName}
                        onChange={(e) => setBankFormData({...bankFormData, accountName: e.target.value})}
                        className="w-full border-orange-200 focus-visible:ring-orange-500"
                        placeholder="Nama pemilik rekening"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="branch" className="text-right">
                      Cabang
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="branch"
                        value={bankFormData.branch}
                        onChange={(e) => setBankFormData({...bankFormData, branch: e.target.value})}
                        className="w-full border-orange-200 focus-visible:ring-orange-500"
                        placeholder="Cabang bank"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="icon" className="text-right">
                      Icon
                    </Label>
                    <div className="col-span-3 flex items-center">
                      <div className="p-1 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 text-white w-8 h-8 flex items-center justify-center">
                        {assetIcons[bankFormData.icon]}
                      </div>
                      <select
                        id="icon"
                        value={bankFormData.icon}
                        onChange={(e) => setBankFormData({...bankFormData, icon: e.target.value})}
                        className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                      >
                        <option value="">Pilih Icon</option>
                        {Object.keys(assetIcons).map(icon => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="is-primary" className="text-right">
                      Akun Utama
                    </Label>
                    <div className="col-span-3 flex items-center">
                      <Switch 
                        id="is-primary"
                        checked={bankFormData.isPrimary}
                        onCheckedChange={(checked) => setBankFormData({...bankFormData, isPrimary: checked})}
                        disabled={bankFormData.id !== 0 && !bankFormData.isPrimary}
                      />
                      <span className="ml-2 text-sm text-gray-500">
                        {bankFormData.isPrimary ? "Jadikan akun utama" : "Bukan akun utama"}
                      </span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsBankAccountDialogOpen(false)}
                    className="border-orange-200 text-orange-600 hover:bg-orange-50"
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit"
                    onClick={handleSaveBankAccount}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  >
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteBankDialogOpen} onOpenChange={setIsDeleteBankDialogOpen}>
              <AlertDialogContent className="fixed left-[50%] top-[50%] z-[100] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-orange-200 rounded-lg bg-white p-6 shadow-xl">
                <div className="absolute inset-0 z-[-1] overflow-hidden rounded-lg">
                  <div className="absolute top-0 right-0 w-56 h-56 bg-red-200 rounded-full opacity-10 transform translate-x-20 -translate-y-20 blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-56 h-56 bg-orange-200 rounded-full opacity-10 transform -translate-x-16 translate-y-16 blur-2xl"></div>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-red-400 to-orange-400 -mt-6 -mx-6 mb-4"></div>
                <AlertDialogHeader>
                  <div className="flex items-center text-red-500 mb-2">
                    <FaExclamationTriangle className="h-5 w-5 mr-2" />
                    <AlertDialogTitle>Hapus Rekening Bank</AlertDialogTitle>
                  </div>
                  <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus rekening <span className="font-semibold">{currentBankAccount?.name} - {currentBankAccount?.accountNumber}</span>? 
                    Tindakan ini tidak dapat dibatalkan dan mungkin mempengaruhi data transaksi.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-orange-200 text-orange-600 hover:bg-orange-50">
                    Batal
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmDeleteBankAccount}
                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                  >
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
          
          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Expense Categories */}
              <Card className="border-orange-100 overflow-hidden neo-shadow relative">
                {/* Top decorative bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-red-400 to-orange-500"></div>
                
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full opacity-20 transform translate-x-16 -translate-y-16"></div>
                <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-red-100 rounded-full opacity-30"></div>
                
                <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50/30 border-b border-orange-200 pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 mr-3 shadow-sm">
                        <FaTags className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-orange-800">Kategori Pengeluaran</CardTitle>
                        <CardDescription className="text-orange-600/70">Kelola kategori untuk transaksi pengeluaran</CardDescription>
                      </div>
                    </div>
                    
                    <Button 
                      size="sm" 
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                      onClick={handleAddExpenseCategory}
                    >
                      <FaPlus className="mr-2 h-3 w-3" />
                      Tambah
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-orange-50">
                        <TableRow>
                          <TableHead className="text-orange-900 font-medium">Nama</TableHead>
                          <TableHead className="text-orange-900 font-medium">Deskripsi</TableHead>
                          <TableHead className="text-orange-900 font-medium w-[80px] text-center">Status</TableHead>
                          <TableHead className="text-orange-900 font-medium w-[80px] text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenseCategories.map((category) => (
                          <TableRow key={category.id} className="hover:bg-orange-50/60">
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell className="text-sm text-gray-600">{category.description}</TableCell>
                            <TableCell className="text-center">
                              <Switch 
                                checked={category.isActive} 
                                onCheckedChange={(checked) => handleCategoryStatusChange(category.id, 'expense', checked)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-gray-500 hover:text-blue-600"
                                  onClick={() => handleEditExpenseCategory(category)}
                                >
                                  <FaEdit className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-gray-500 hover:text-red-600"
                                  onClick={() => handleDeleteExpenseCategory(category)}
                                >
                                  <FaTrash className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            
              {/* Income Categories */}
              <Card className="border-orange-100 overflow-hidden neo-shadow relative">
                {/* Top decorative bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-red-400 to-orange-500"></div>
                
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full opacity-20 transform translate-x-16 -translate-y-16"></div>
                <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-red-100 rounded-full opacity-30"></div>
                
                <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50/30 border-b border-orange-200 pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 mr-3 shadow-sm">
                        <FaTags className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-orange-800">Kategori Pemasukan</CardTitle>
                        <CardDescription className="text-orange-600/70">Kelola kategori untuk transaksi pemasukan</CardDescription>
                      </div>
                    </div>
                    
                    <Button 
                      size="sm" 
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                      onClick={handleAddIncomeCategory}
                    >
                      <FaPlus className="mr-2 h-3 w-3" />
                      Tambah
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-orange-50">
                        <TableRow>
                          <TableHead className="text-orange-900 font-medium">Nama</TableHead>
                          <TableHead className="text-orange-900 font-medium">Deskripsi</TableHead>
                          <TableHead className="text-orange-900 font-medium w-[80px] text-center">Status</TableHead>
                          <TableHead className="text-orange-900 font-medium w-[80px] text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomeCategories.map((category) => (
                          <TableRow key={category.id} className="hover:bg-orange-50/60">
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell className="text-sm text-gray-600">{category.description}</TableCell>
                            <TableCell className="text-center">
                              <Switch 
                                checked={category.isActive} 
                                onCheckedChange={(checked) => handleCategoryStatusChange(category.id, 'income', checked)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-gray-500 hover:text-blue-600"
                                  onClick={() => handleEditIncomeCategory(category)}
                                >
                                  <FaEdit className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-gray-500 hover:text-red-600"
                                  onClick={() => handleDeleteIncomeCategory(category)}
                                >
                                  <FaTrash className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Dialog */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogContent className="fixed left-[50%] top-[50%] z-[100] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-orange-200 rounded-lg bg-white p-6 shadow-xl">
                <div className="absolute inset-0 z-[-1] overflow-hidden rounded-lg">
                  <div className="absolute top-0 right-0 w-56 h-56 bg-orange-200 rounded-full opacity-10 transform translate-x-20 -translate-y-20 blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-56 h-56 bg-amber-200 rounded-full opacity-10 transform -translate-x-16 translate-y-16 blur-2xl"></div>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400 -mt-6 -mx-6 mb-4"></div>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-orange-800">
                    {categoryFormData.id === 0 ? `Tambah Kategori ${categoryFormData.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}` : `Edit Kategori ${categoryFormData.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}`}
                  </DialogTitle>
                  <DialogDescription className="text-orange-600">
                    {categoryFormData.id === 0 
                      ? "Isi formulir di bawah untuk menambahkan kategori baru" 
                      : "Perbarui informasi kategori"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category-name" className="text-right">
                      Nama Kategori
                    </Label>
                    <Input
                      id="category-name"
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData({...categoryFormData, name: e.target.value})}
                      className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                      placeholder="Masukkan nama kategori"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category-desc" className="text-right">
                      Deskripsi
                    </Label>
                    <Textarea
                      id="category-desc"
                      value={categoryFormData.description}
                      onChange={(e) => setCategoryFormData({...categoryFormData, description: e.target.value})}
                      className="col-span-3 border-orange-200 focus-visible:ring-orange-500 h-20 resize-none"
                      placeholder="Deskripsi singkat kategori"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="icon" className="text-right">
                      Icon
                    </Label>
                    <div className="col-span-3 flex items-center">
                      <div className="p-1 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 text-white w-8 h-8 flex items-center justify-center">
                        {assetIcons[categoryFormData.icon]}
                      </div>
                      <select
                        id="icon"
                        value={categoryFormData.icon}
                        onChange={(e) => setCategoryFormData({...categoryFormData, icon: e.target.value})}
                        className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                      >
                        <option value="">Pilih Icon</option>
                        {Object.keys(assetIcons).map(icon => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category-active" className="text-right">
                      Status Aktif
                    </Label>
                    <div className="col-span-3 flex items-center">
                      <Switch 
                        id="category-active"
                        checked={categoryFormData.isActive}
                        onCheckedChange={(checked) => setCategoryFormData({...categoryFormData, isActive: checked})}
                      />
                      <span className="ml-2 text-sm text-gray-500">
                        {categoryFormData.isActive ? "Aktif" : "Tidak Aktif"}
                      </span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCategoryDialogOpen(false)}
                    className="border-orange-200 text-orange-600 hover:bg-orange-50"
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit"
                    onClick={handleSaveCategory}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  >
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Delete Category Confirmation */}
            <AlertDialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
              <AlertDialogContent className="fixed left-[50%] top-[50%] z-[100] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-orange-200 rounded-lg bg-white p-6 shadow-xl">
                <div className="absolute inset-0 z-[-1] overflow-hidden rounded-lg">
                  <div className="absolute top-0 right-0 w-56 h-56 bg-red-200 rounded-full opacity-10 transform translate-x-20 -translate-y-20 blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-56 h-56 bg-orange-200 rounded-full opacity-10 transform -translate-x-16 translate-y-16 blur-2xl"></div>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-red-400 to-orange-400 -mt-6 -mx-6 mb-4"></div>
                <AlertDialogHeader>
                  <div className="flex items-center text-red-500 mb-2">
                    <FaExclamationTriangle className="h-5 w-5 mr-2" />
                    <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
                  </div>
                  <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus kategori <span className="font-semibold">{currentCategory?.name}</span>? 
                    Tindakan ini tidak dapat dibatalkan dan mungkin mempengaruhi data transaksi.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-orange-200 text-orange-600 hover:bg-orange-50">
                    Batal
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmDeleteCategory}
                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                  >
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
          
          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-6">
            <Card className="border-orange-100 overflow-hidden neo-shadow relative">
              {/* Top decorative bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-red-400 to-orange-500"></div>
              
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full opacity-20 transform translate-x-16 -translate-y-16"></div>
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-red-100 rounded-full opacity-30"></div>
              
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50/30 border-b border-orange-200 pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 mr-3 shadow-sm">
                      <FaBoxes className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-orange-800">Manajemen Aset</CardTitle>
                      <CardDescription className="text-orange-600/70">Kelola daftar aset dan inventaris perusahaan</CardDescription>
                    </div>
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    onClick={handleAddAsset}
                  >
                    <FaPlus className="mr-2 h-3 w-3" />
                    Tambah Aset
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-orange-50">
                      <TableRow>
                        <TableHead className="text-orange-900 font-medium w-[60px] text-center">Icon</TableHead>
                        <TableHead className="text-orange-900 font-medium">Nama Aset</TableHead>
                        <TableHead className="text-orange-900 font-medium">Kategori</TableHead>
                        <TableHead className="text-orange-900 font-medium text-right">Nilai (Rp)</TableHead>
                        <TableHead className="text-orange-900 font-medium">Deskripsi</TableHead>
                        <TableHead className="text-orange-900 font-medium w-[80px] text-center">Status</TableHead>
                        <TableHead className="text-orange-900 font-medium w-[80px] text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assets.map((asset) => (
                        <TableRow key={asset.id} className="hover:bg-orange-50/60">
                          <TableCell className="text-center">
                            <div className="flex justify-center items-center w-full h-full">
                              <div className="p-1 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 text-white w-8 h-8 flex items-center justify-center">
                                {assetIcons[asset.icon]}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell>{asset.category}</TableCell>
                          <TableCell className="text-right">{asset.value.toLocaleString('id-ID')}</TableCell>
                          <TableCell className="text-sm text-gray-600 truncate max-w-[200px]">{asset.description}</TableCell>
                          <TableCell className="text-center">
                            <Switch 
                              checked={asset.isActive} 
                              onCheckedChange={(checked) => handleAssetStatusChange(asset.id, checked)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-gray-500 hover:text-blue-600"
                                onClick={() => handleEditAsset(asset)}
                              >
                                <FaEdit className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-gray-500 hover:text-red-600"
                                onClick={() => handleDeleteAsset(asset)}
                              >
                                <FaTrash className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {assets.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            Belum ada data aset. Klik tombol &quot;Tambah Aset&quot; untuk menambahkan.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Asset Dialog */}
            <Dialog open={isAssetDialogOpen} onOpenChange={setIsAssetDialogOpen}>
              <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                <div className="absolute inset-0 z-[-1] overflow-hidden rounded-lg">
                  <div className="absolute top-0 right-0 w-56 h-56 bg-orange-200 rounded-full opacity-10 transform translate-x-20 -translate-y-20 blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-56 h-56 bg-amber-200 rounded-full opacity-10 transform -translate-x-16 translate-y-16 blur-2xl"></div>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 to-amber-400 -mt-6 -mx-6 mb-4"></div>
                <DialogHeader>
                  <DialogTitle>{assetFormData.id === 0 ? "Tambah Aset Baru" : "Edit Aset"}</DialogTitle>
                  <DialogDescription>
                    {assetFormData.id === 0 
                      ? "Silakan masukkan informasi aset baru yang ingin ditambahkan." 
                      : "Perbarui informasi aset yang dipilih."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="asset-name" className="text-right">
                      Nama Aset
                    </Label>
                    <Input
                      id="asset-name"
                      value={assetFormData.name}
                      onChange={(e) => setAssetFormData({...assetFormData, name: e.target.value})}
                      className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                      placeholder="Masukkan nama aset"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="asset-category" className="text-right">
                      Kategori
                    </Label>
                    <Input
                      id="asset-category"
                      value={assetFormData.category}
                      onChange={(e) => setAssetFormData({...assetFormData, category: e.target.value})}
                      className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                      placeholder="Contoh: Elektronik, Kendaraan, Furnitur"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="asset-value" className="text-right">
                      Nilai (Rp)
                    </Label>
                    <Input
                      id="asset-value"
                      type="number"
                      value={assetFormData.value}
                      onChange={(e) => setAssetFormData({...assetFormData, value: parseFloat(e.target.value)})}
                      className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                      placeholder="Nilai aset dalam Rupiah"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="asset-description" className="text-right pt-2">
                      Deskripsi
                    </Label>
                    <Textarea
                      id="asset-description"
                      value={assetFormData.description}
                      onChange={(e) => setAssetFormData({...assetFormData, description: e.target.value})}
                      className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                      placeholder="Deskripsi singkat tentang aset"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="icon" className="text-right">
                      Icon
                    </Label>
                    <div className="col-span-3 flex items-center">
                      <div className="p-1 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 text-white w-8 h-8 flex items-center justify-center">
                        {assetIcons[assetFormData.icon]}
                      </div>
                      <select
                        id="icon"
                        value={assetFormData.icon}
                        onChange={(e) => setAssetFormData({...assetFormData, icon: e.target.value})}
                        className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                      >
                        <option value="">Pilih Icon</option>
                        {Object.keys(assetIcons).map(icon => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="asset-status" className="text-right">
                      Status Aktif
                    </Label>
                    <div className="col-span-3 flex items-center">
                      <Switch 
                        id="asset-status"
                        checked={assetFormData.isActive}
                        onCheckedChange={(checked) => setAssetFormData({...assetFormData, isActive: checked})}
                      />
                      <span className="ml-2 text-sm text-gray-500">
                        {assetFormData.isActive ? "Aktif" : "Tidak Aktif"}
                      </span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAssetDialogOpen(false)}
                    className="border-orange-200 text-orange-600 hover:bg-orange-50"
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit"
                    onClick={handleSaveAsset}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    disabled={!selectedAssetIcon}
                  >
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Delete Asset Confirmation */}
            <AlertDialog open={isDeleteAssetDialogOpen} onOpenChange={setIsDeleteAssetDialogOpen}>
              <AlertDialogContent className="fixed left-[50%] top-[50%] z-[100] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-orange-200 rounded-lg bg-white p-6 shadow-xl">
                <div className="absolute inset-0 z-[-1] overflow-hidden rounded-lg">
                  <div className="absolute top-0 right-0 w-56 h-56 bg-red-200 rounded-full opacity-10 transform translate-x-20 -translate-y-20 blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-56 h-56 bg-orange-200 rounded-full opacity-10 transform -translate-x-16 translate-y-16 blur-2xl"></div>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-red-400 to-orange-400 -mt-6 -mx-6 mb-4"></div>
                <AlertDialogHeader>
                  <div className="flex items-center text-red-500 mb-2">
                    <FaExclamationTriangle className="h-5 w-5 mr-2" />
                    <AlertDialogTitle>Hapus Aset</AlertDialogTitle>
                  </div>
                  <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus aset <span className="font-semibold">{currentAsset?.name}</span>? 
                    Tindakan ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-orange-200 text-orange-600 hover:bg-orange-50">
                    Batal
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmDeleteAsset}
                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                  >
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
          
          {/* Account Journals Tab */}
          <TabsContent value="account-journals" className="space-y-6">
            <Card className="border-orange-100 overflow-hidden neo-shadow relative">
              {/* Top decorative bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-red-400 to-orange-500"></div>
              
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full opacity-20 transform translate-x-16 -translate-y-16"></div>
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-red-100 rounded-full opacity-30"></div>
              
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50/30 border-b border-orange-200 pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 mr-3 shadow-sm">
                      <FaCalculator className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-orange-800">Jurnal Akun</CardTitle>
                      <CardDescription className="text-orange-600/70">Kelola jurnal akun untuk transaksi</CardDescription>
                    </div>
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    onClick={() => {
                      setAccountJournalFormData({
                        id: 0,
                        code: "",
                        name: "",
                        category: "asset",
                        subCategory: "",
                        normalBalance: "debit",
                        isActive: true,
                        description: ""
                      });
                      setIsAccountJournalDialogOpen(true);
                    }}
                  >
                    <FaPlus className="mr-2 h-3 w-3" />
                    Tambah Jurnal
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-orange-50">
                      <TableRow>
                        <TableHead className="text-orange-900 font-medium">Kode</TableHead>
                        <TableHead className="text-orange-900 font-medium">Nama Akun</TableHead>
                        <TableHead className="text-orange-900 font-medium">Kategori</TableHead>
                        <TableHead className="text-orange-900 font-medium">Sub Kategori</TableHead>
                        <TableHead className="text-orange-900 font-medium">Saldo Normal</TableHead>
                        <TableHead className="text-orange-900 font-medium">Status Aktif</TableHead>
                        <TableHead className="text-orange-900 font-medium text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountJournals.map((journal) => (
                        <TableRow key={journal.id} className="hover:bg-orange-50/60">
                          <TableCell>{journal.code}</TableCell>
                          <TableCell className="font-medium">{journal.name}</TableCell>
                          <TableCell>{journal.category}</TableCell>
                          <TableCell>{journal.subCategory}</TableCell>
                          <TableCell>{journal.normalBalance}</TableCell>
                          <TableCell className="text-center">
                            <Switch 
                              checked={journal.isActive} 
                              onCheckedChange={(checked) => {
                                const updatedJournals = accountJournals.map(j => 
                                  j.id === journal.id ? {...j, isActive: checked} : j
                                );
                                setAccountJournals(updatedJournals);
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-gray-500 hover:text-blue-600"
                                onClick={() => {
                                  setCurrentAccountJournal(journal);
                                  setAccountJournalFormData({
                                    id: journal.id,
                                    code: journal.code,
                                    name: journal.name,
                                    category: journal.category,
                                    subCategory: journal.subCategory,
                                    normalBalance: journal.normalBalance,
                                    isActive: journal.isActive,
                                    description: journal.description
                                  });
                                  setIsAccountJournalDialogOpen(true);
                                }}
                              >
                                <FaEdit className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-gray-500 hover:text-red-600"
                                onClick={() => {
                                  setCurrentAccountJournal(journal);
                                  setIsDeleteAccountJournalDialogOpen(true);
                                }}
                              >
                                <FaTrash className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Account Journal Dialog */}
            <Dialog open={isAccountJournalDialogOpen} onOpenChange={setIsAccountJournalDialogOpen}>
              <DialogContent className="fixed left-[50%] top-[50%] z-[100] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-orange-200 rounded-lg bg-white p-6 shadow-xl">
                <div className="absolute inset-0 z-[-1] overflow-hidden rounded-lg">
                  <div className="absolute top-0 right-0 w-56 h-56 bg-orange-200 rounded-full opacity-10 transform translate-x-20 -translate-y-20 blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-56 h-56 bg-amber-200 rounded-full opacity-10 transform -translate-x-16 translate-y-16 blur-2xl"></div>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 to-amber-400 -mt-6 -mx-6 mb-4"></div>
                <DialogHeader>
                  <DialogTitle>{accountJournalFormData.id === 0 ? "Tambah Jurnal Akun" : "Edit Jurnal Akun"}</DialogTitle>
                  <DialogDescription>
                    {accountJournalFormData.id === 0 
                      ? "Silakan masukkan informasi jurnal akun baru yang ingin ditambahkan." 
                      : "Perbarui informasi jurnal akun yang dipilih."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="journal-code" className="text-right">
                      Kode Akun
                    </Label>
                    <Input
                      id="journal-code"
                      value={accountJournalFormData.code}
                      onChange={(e) => setAccountJournalFormData({...accountJournalFormData, code: e.target.value})}
                      className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                      placeholder="Masukkan kode akun"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="journal-name" className="text-right">
                      Nama Akun
                    </Label>
                    <Input
                      id="journal-name"
                      value={accountJournalFormData.name}
                      onChange={(e) => setAccountJournalFormData({...accountJournalFormData, name: e.target.value})}
                      className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                      placeholder="Masukkan nama akun"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="journal-category" className="text-right">
                      Kategori
                    </Label>
                    <select
                      id="journal-category"
                      value={accountJournalFormData.category}
                      onChange={(e) => handleAccountJournalFormChange('category', e.target.value)}
                      className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                    >
                      <option value="asset">Aktiva</option>
                      <option value="liability">Kewajiban</option>
                      <option value="equity">Ekuitas</option>
                      <option value="revenue">Pendapatan</option>
                      <option value="expense">Beban</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="journal-sub-category" className="text-right">
                      Sub Kategori
                    </Label>
                    <Input
                      id="journal-sub-category"
                      value={accountJournalFormData.subCategory}
                      onChange={(e) => setAccountJournalFormData({...accountJournalFormData, subCategory: e.target.value})}
                      className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                      placeholder="Masukkan sub kategori"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="journal-normal-balance" className="text-right">
                      Saldo Normal
                    </Label>
                    <div className="col-span-3 flex items-center">
                      <span className="mr-2">{accountJournalFormData.normalBalance}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="journal-status" className="text-right">
                      Status Aktif
                    </Label>
                    <div className="col-span-3 flex items-center">
                      <Switch 
                        id="journal-status"
                        checked={accountJournalFormData.isActive}
                        onCheckedChange={(checked) => setAccountJournalFormData({...accountJournalFormData, isActive: checked})}
                      />
                      <span className="ml-2 text-sm text-gray-500">
                        {accountJournalFormData.isActive ? "Aktif" : "Tidak Aktif"}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="journal-description" className="text-right pt-2">
                      Deskripsi
                    </Label>
                    <Textarea
                      id="journal-description"
                      value={accountJournalFormData.description}
                      onChange={(e) => setAccountJournalFormData({...accountJournalFormData, description: e.target.value})}
                      className="col-span-3 border-orange-200 focus-visible:ring-orange-500"
                      placeholder="Deskripsi singkat tentang jurnal akun"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAccountJournalDialogOpen(false)}
                    className="border-orange-200 text-orange-600 hover:bg-orange-50"
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit"
                    onClick={() => {
                      if (accountJournalFormData.id === 0) {
                        const newJournal = {
                          ...accountJournalFormData,
                          id: accountJournals.length + 1
                        };
                        setAccountJournals([...accountJournals, newJournal]);
                        toast({
                          title: "Jurnal akun berhasil ditambahkan",
                          description: `${newJournal.name} telah ditambahkan ke daftar jurnal akun.`,
                          variant: "default",
                        });
                      } else {
                        const updatedJournals = accountJournals.map(journal => 
                          journal.id === accountJournalFormData.id ? accountJournalFormData : journal
                        );
                        setAccountJournals(updatedJournals);
                        toast({
                          title: "Jurnal akun berhasil diperbarui",
                          description: `${accountJournalFormData.name} telah diperbarui.`,
                          variant: "default",
                        });
                      }
                      setIsAccountJournalDialogOpen(false);
                    }}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  >
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Delete Account Journal Confirmation */}
            <AlertDialog open={isDeleteAccountJournalDialogOpen} onOpenChange={setIsDeleteAccountJournalDialogOpen}>
              <AlertDialogContent className="fixed left-[50%] top-[50%] z-[100] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-orange-200 rounded-lg bg-white p-6 shadow-xl">
                <div className="absolute inset-0 z-[-1] overflow-hidden rounded-lg">
                  <div className="absolute top-0 right-0 w-56 h-56 bg-red-200 rounded-full opacity-10 transform translate-x-20 -translate-y-20 blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-56 h-56 bg-orange-200 rounded-full opacity-10 transform -translate-x-16 translate-y-16 blur-2xl"></div>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-red-400 to-orange-400 -mt-6 -mx-6 mb-4"></div>
                <AlertDialogHeader>
                  <div className="flex items-center text-red-500 mb-2">
                    <FaExclamationTriangle className="h-5 w-5 mr-2" />
                    <AlertDialogTitle>Hapus Jurnal Akun</AlertDialogTitle>
                  </div>
                  <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus jurnal akun <span className="font-semibold">{currentAccountJournal?.name}</span>? 
                    Tindakan ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-orange-200 text-orange-600 hover:bg-orange-50">
                    Batal
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      const updatedJournals = accountJournals.filter(journal => journal.id !== currentAccountJournal?.id);
                      setAccountJournals(updatedJournals);
                      toast({
                        title: "Jurnal akun dihapus",
                        description: `${currentAccountJournal?.name} berhasil dihapus dari daftar.`,
                        variant: "destructive",
                      });
                      setIsDeleteAccountJournalDialogOpen(false);
                      setCurrentAccountJournal(null);
                    }}
                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                  >
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        </Tabs>
      </div>
    </FinanceLayout>
  );
};

export default FinanceSettingsPage;
