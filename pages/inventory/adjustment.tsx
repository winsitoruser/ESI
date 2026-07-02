import React, { useState, useRef, useEffect } from "react";
import { NextPage } from "next";
import InventoryLayout from "@/components/layouts/inventory-layout";
import { useTranslation } from '@/lib/i18n';
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { mockProducts, Product, mockStocks } from "@/modules/inventory/types";
import { formatRupiah } from "@/lib/utils";
import { 
  FaBalanceScale, 
  FaPlus, 
  FaSearch, 
  FaCalendarAlt, 
  FaUserAlt, 
  FaEdit, 
  FaTrash, 
  FaBarcode,
  FaSave,
  FaFile,
  FaTimes,
  FaArrowUp,
  FaArrowDown,
  FaHistory,
  FaExchangeAlt,
  FaFileAlt,
  FaPrint,
  FaClipboardCheck,
  FaList,
  FaFilePdf,
  FaFileExcel,
  FaDownload
} from "react-icons/fa";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Interface for adjustment item
interface AdjustmentItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  newStock: number;
  adjustmentQuantity: number;
  adjustmentType: "increase" | "decrease";
  reason: string;
  fromStocktake?: boolean;
}

// Interface for adjustment history
interface AdjustmentHistory {
  id: string;
  date: Date;
  adjustmentNumber: string;
  adjustmentBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  totalItems: number;
  items: AdjustmentItem[];
}

// Interface for stocktake item
interface StocktakeItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  systemStock: number;
  actualStock: number;
  difference: number;
  notes?: string;
}

// Interface for stocktake
interface Stocktake {
  id: string;
  stocktakeNumber: string;
  date: Date;
  location: string;
  conductedBy: string;
  verifiedBy?: string;
  status: 'approved' | 'pending' | 'rejected';
  notes?: string;
  items: StocktakeItem[];
}

// Mock data for stocktake
const mockStocktake: Stocktake[] = [
  {
    id: "ST-001",
    stocktakeNumber: "SO/2025/04/001",
    date: new Date("2025-04-05"),
    location: "Rak Obat Utama",
    conductedBy: "Eko Santoso",
    verifiedBy: "Budi Hartono",
    status: "approved",
    notes: "Stock opname bulanan",
    items: [
      {
        id: "ST-001-1",
        productId: "P001",
        productName: "Paracetamol 500mg",
        sku: "MED-PCT-500",
        systemStock: 120,
        actualStock: 112,
        difference: -8,
        notes: "Beberapa kemasan rusak"
      },
      {
        id: "ST-001-2",
        productId: "P002",
        productName: "Amoxicillin 500mg",
        sku: "MED-AMX-500",
        systemStock: 85,
        actualStock: 90,
        difference: 5,
        notes: "Terdapat barang datang yang belum diinput"
      },
      {
        id: "ST-001-3",
        productId: "P003",
        productName: "Vitamin C 1000mg",
        sku: "SUP-VTC-1000",
        systemStock: 200,
        actualStock: 195,
        difference: -5,
        notes: "Ditemukan produk kadaluarsa"
      }
    ]
  },
  {
    id: "ST-002",
    stocktakeNumber: "SO/2025/04/002",
    date: new Date("2025-04-06"),
    location: "Rak Kosmetik",
    conductedBy: "Diana Putri",
    verifiedBy: "Eko Santoso",
    status: "approved",
    notes: "Stock opname pada rak kosmetik",
    items: [
      {
        id: "ST-002-1",
        productId: "P010",
        productName: "Sunscreen SPF 50",
        sku: "COS-SUN-50",
        systemStock: 45,
        actualStock: 42,
        difference: -3,
        notes: "Beberapa produk tester tidak terhitung"
      },
      {
        id: "ST-002-2",
        productId: "P011",
        productName: "Facial Wash",
        sku: "COS-FCW-001",
        systemStock: 60,
        actualStock: 58,
        difference: -2,
        notes: undefined
      }
    ]
  }
];

// Mock data for adjustment history
const mockAdjustmentHistory: AdjustmentHistory[] = [
  {
    id: "ADJ-H-001",
    date: new Date("2025-03-25"),
    adjustmentNumber: "ADJ/2025/03/001",
    adjustmentBy: "Ahmad Rizky",
    approvedBy: "David Miller",
    status: 'approved',
    notes: "Penyesuaian bulanan",
    totalItems: 3,
    items: [
      { id: "ADJ-I-001-1", productId: "P001", productName: "Paracetamol 500mg", sku: "MED-PCT-500", currentStock: 120, newStock: 112, adjustmentQuantity: 8, adjustmentType: "decrease", reason: "damaged" },
      { id: "ADJ-I-001-2", productId: "P002", productName: "Amoxicillin 500mg", sku: "MED-AMX-500", currentStock: 85, newStock: 90, adjustmentQuantity: 5, adjustmentType: "increase", reason: "count error" },
      { id: "ADJ-I-001-3", productId: "P003", productName: "Vitamin C 1000mg", sku: "SUP-VTC-1000", currentStock: 200, newStock: 195, adjustmentQuantity: 5, adjustmentType: "decrease", reason: "expired" }
    ]
  },
  {
    id: "ADJ-H-002",
    date: new Date("2025-03-28"),
    adjustmentNumber: "ADJ/2025/03/002",
    adjustmentBy: "Budi Santoso",
    status: 'pending',
    notes: "Penyesuaian setelah stock opname",
    totalItems: 2,
    items: [
      { id: "ADJ-I-002-1", productId: "P004", productName: "Ibuprofen 400mg", sku: "MED-IBP-400", currentStock: 75, newStock: 70, adjustmentQuantity: 5, adjustmentType: "decrease", reason: "damaged", fromStocktake: true },
      { id: "ADJ-I-002-2", productId: "P005", productName: "Loratadine 10mg", sku: "MED-LRT-10", currentStock: 60, newStock: 65, adjustmentQuantity: 5, adjustmentType: "increase", reason: "count error", fromStocktake: true }
    ]
  },
  {
    id: "ADJ-H-003",
    date: new Date("2025-04-01"),
    adjustmentNumber: "ADJ/2025/04/001",
    adjustmentBy: "Cindy Wijaya",
    approvedBy: "Eko Prasetyo",
    status: 'approved',
    totalItems: 1,
    items: [
      { id: "ADJ-I-003-1", productId: "P006", productName: "Cetirizine 10mg", sku: "MED-CTR-10", currentStock: 45, newStock: 40, adjustmentQuantity: 5, adjustmentType: "decrease", reason: "damaged" }
    ]
  },
  {
    id: "ADJ-H-004",
    date: new Date("2025-04-03"),
    adjustmentNumber: "ADJ/2025/04/002",
    adjustmentBy: "Diana Purnama",
    approvedBy: "Farhan Ahmad",
    status: 'rejected',
    notes: "Format nomor penyesuaian tidak sesuai",
    totalItems: 2,
    items: [
      { id: "ADJ-I-004-1", productId: "P007", productName: "Omeprazole 20mg", sku: "MED-OMP-20", currentStock: 55, newStock: 50, adjustmentQuantity: 5, adjustmentType: "decrease", reason: "damaged" },
      { id: "ADJ-I-004-2", productId: "P008", productName: "Metformin 500mg", sku: "MED-MTF-500", currentStock: 100, newStock: 90, adjustmentQuantity: 10, adjustmentType: "decrease", reason: "expired" }
    ]
  }
];

// Adjustment reasons
const adjustmentReasons = [
  { id: "damaged", label: "Produk Rusak" },
  { id: "expired", label: "Produk Kadaluarsa" },
  { id: "counting", label: "Hasil Stock Opname" },
  { id: "lost", label: "Kehilangan" },
  { id: "admin", label: "Kesalahan Admin" },
  { id: "other", label: "Lainnya" }
];

const AdjustmentPage: NextPage = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Adjustment form state
  const [adjustmentNumber, setAdjustmentNumber] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [adjustmentBy, setAdjustmentBy] = useState("");
  const [notes, setNotes] = useState("");
  
  // Adjustment items state
  const [adjustmentItems, setAdjustmentItems] = useState<AdjustmentItem[]>([]);
  
  // Product search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Selected product for adding to adjustment
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedStock, setSelectedStock] = useState<number>(0);
  const [newStock, setNewStock] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<"increase" | "decrease">("increase");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  
  // Tab and history state
  const [activeTab, setActiveTab] = useState<"manual" | "stockopname" | "history">("manual");
  const [adjustmentHistory, setAdjustmentHistory] = useState<AdjustmentHistory[]>(mockAdjustmentHistory);
  const [selectedHistory, setSelectedHistory] = useState<AdjustmentHistory | null>(null);
  const [showAdjustmentDoc, setShowAdjustmentDoc] = useState<boolean>(false);
  const documentRef = useRef<HTMLDivElement>(null);
  
  // Stocktake state
  const [stocktakes, setStocktakes] = useState<Stocktake[]>(mockStocktake);
  const [selectedStocktake, setSelectedStocktake] = useState<Stocktake | null>(null);
  const [stocktakeItems, setStocktakeItems] = useState<StocktakeItem[]>([]);
  const [showStocktakeDetails, setShowStocktakeDetails] = useState<boolean>(false);

  // Load adjustment history on component mount
  useEffect(() => {
    loadAdjustmentHistory();
  }, []);
  
  // Format date for display
  const formatDate = (date: Date | undefined): string => {
    if (!date) return "";
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Handle product search
  const handleSearch = () => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    // Simulate API call with timeout
    setTimeout(() => {
      const results = mockProducts.filter(
        product =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.sku ? product.sku.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
          (product.barcode && product.barcode.includes(searchQuery))
      );
      
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
  };
  
  // Handle product selection
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchResults([]);
    setSearchQuery("");
    
    // Get current stock for selected product
    const stock = mockStocks.find(s => s.productId === product.id);
    const currentStock = stock ? stock.inStock : 0;
    
    setSelectedStock(currentStock);
    setNewStock(currentStock);
  };
  
  // Handle adjustment type change and update new stock calculation
  const handleAdjustmentTypeChange = (type: "increase" | "decrease") => {
    setAdjustmentType(type);
    
    // Reset new stock to current stock when changing type
    setNewStock(selectedStock);
  };
  
  // Calculate adjustment quantity based on current and new stock
  const calculateAdjustmentQuantity = (currentStock: number, newStock: number, type: "increase" | "decrease"): number => {
    return type === "increase" 
      ? newStock - currentStock 
      : currentStock - newStock;
  };
  
  // Add product to adjustment items
  const handleAddProduct = () => {
    if (!selectedProduct) return;
    
    const adjustmentQuantity = calculateAdjustmentQuantity(
      selectedStock,
      newStock,
      adjustmentType
    );
    
    // Determine reason text
    const type = adjustmentType;
    const reasonObj = adjustmentReasons.find(r => r.id === reason);
    const reasonText = reason === "other" ? customReason : reasonObj?.label || "";
    
    const newItem: AdjustmentItem = {
      id: Date.now().toString(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      sku: selectedProduct.sku || '', // Maneja el caso donde sku podría ser undefined
      currentStock: selectedStock,
      newStock,
      adjustmentQuantity,
      adjustmentType: type,
      reason: reasonText,
    };
    
    setAdjustmentItems([...adjustmentItems, newItem]);
    
    // Reset product selection
    setSelectedProduct(null);
    setSelectedStock(0);
    setNewStock(0);
    setReason("");
    setCustomReason("");
    
    toast({
      title: "Produk ditambahkan",
      description: `${newItem.productName} telah ditambahkan ke penyesuaian`,
    });
  };
  
  // Remove item from adjustment
  const handleRemoveItem = (id: string) => {
    setAdjustmentItems(adjustmentItems.filter(item => item.id !== id));
    
    toast({
      title: "Produk dihapus",
      description: "Produk telah dihapus dari penyesuaian",
      variant: "destructive",
    });
  };
  
  // View stocktake details
  const handleViewStocktake = (stocktake: Stocktake) => {
    setSelectedStocktake(stocktake);
    setStocktakeItems(stocktake.items);
    setShowStocktakeDetails(true);
  };
  
  // Add stocktake items to adjustment
  const handleAddStocktakeToAdjustment = () => {
    if (!selectedStocktake) return;
    
    // Create adjustment items from stocktake items
    const newItems = selectedStocktake.items.map(item => {
      const adjustmentType: "increase" | "decrease" = item.difference < 0 ? "decrease" : "increase";
      return {
        id: Date.now().toString() + item.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        currentStock: item.systemStock,
        newStock: item.actualStock,
        adjustmentQuantity: Math.abs(item.difference),
        adjustmentType: adjustmentType,
        reason: "Hasil Stock Opname",
        fromStocktake: true
      } as AdjustmentItem;
    });
    
    // Set adjustment form data
    setAdjustmentNumber(`ADJ/SO/${selectedStocktake.stocktakeNumber.split("/").slice(-2).join("/")}`);
    setAdjustmentDate(new Date().toISOString().substring(0, 10));
    setAdjustmentBy(selectedStocktake.conductedBy);
    setNotes(`Penyesuaian dari Stock Opname ${selectedStocktake.stocktakeNumber}`);
    
    // Add items to adjustment
    setAdjustmentItems([...adjustmentItems, ...newItems]);
    
    // Change to manual tab to show the created adjustment
    setActiveTab("manual");
    setShowStocktakeDetails(false);
    
    toast({
      title: "Stock Opname ditambahkan",
      description: `${newItems.length} item dari Stock Opname ${selectedStocktake.stocktakeNumber} telah ditambahkan ke penyesuaian`,
    });
  };
  
  // Save adjustment with API integration
  const handleSaveAdjustment = async () => {
    if (!adjustmentNumber || !adjustmentDate || !adjustmentBy) {
      toast({
        title: "Data tidak lengkap",
        description: "Mohon lengkapi data penyesuaian",
        variant: "destructive",
      });
      return;
    }
    
    if (adjustmentItems.length === 0) {
      toast({
        title: "Tidak ada item",
        description: "Tambahkan minimal 1 item untuk penyesuaian",
        variant: "destructive",
      });
      return;
    }

    // Validate adjustment items
    const invalidItems = adjustmentItems.filter(item => 
      !item.productId || !item.reason || item.adjustmentQuantity <= 0
    );

    if (invalidItems.length > 0) {
      toast({
        title: "Data item tidak valid",
        description: "Pastikan semua item memiliki produk, alasan, dan jumlah yang valid",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Prepare adjustment data
      const adjustmentData = {
        adjustmentNumber,
        date: adjustmentDate,
        adjustedBy: adjustmentBy,
        status: 'pending' as const,
        notes,
        items: adjustmentItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          currentStock: item.currentStock,
          newStock: item.newStock,
          adjustmentQuantity: item.adjustmentQuantity,
          adjustmentType: item.adjustmentType,
          reason: item.reason,
          notes: item.notes || ''
        }))
      };

      // Call API to save adjustment
      const response = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adjustmentData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Penyesuaian disimpan",
          description: `Penyesuaian ${result.data.adjustmentNumber} berhasil disimpan`,
        });
        
        // Reset form
        setAdjustmentNumber("");
        setAdjustmentDate(new Date().toISOString().substring(0, 10));
        setAdjustmentBy("");
        setNotes("");
        setAdjustmentItems([]);

        // Refresh adjustment history
        loadAdjustmentHistory();
      } else {
        throw new Error(result.error || 'Failed to save adjustment');
      }
    } catch (error) {
      console.error('Error saving adjustment:', error);
      toast({
        title: "Gagal menyimpan",
        description: "Terjadi kesalahan saat menyimpan penyesuaian: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };

  // Load adjustment history from API
  const loadAdjustmentHistory = async () => {
    try {
      const response = await fetch('/api/inventory/adjustments?page=1&limit=20');
      const result = await response.json();

      if (result.success) {
        const formattedHistory: AdjustmentHistory[] = result.data.adjustments.map((adj: any) => ({
          id: adj.id,
          date: new Date(adj.date),
          adjustmentNumber: adj.adjustmentNumber,
          adjustmentBy: adj.adjustedBy,
          approvedBy: adj.approvedBy,
          status: adj.status,
          notes: adj.notes,
          totalItems: adj.totalItems,
          items: adj.items.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            currentStock: item.currentStock,
            newStock: item.newStock,
            adjustmentQuantity: item.adjustmentQuantity,
            adjustmentType: item.adjustmentType,
            reason: item.reason,
            fromStocktake: false
          }))
        }));

        setAdjustmentHistory(formattedHistory);
      }
    } catch (error) {
      console.error('Error loading adjustment history:', error);
      // Keep using mock data if API fails
    }
  };

  // View document handler
  const handleViewDocument = (history: AdjustmentHistory) => {
    setSelectedHistory(history);
    setShowAdjustmentDoc(true);
  };
  
  // Print document handler
  const handlePrintDocument = () => {
    if (!documentRef.current) return;
    
    const printContent = documentRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Create print window
    document.body.innerHTML = `
      <html>
        <head>
          <title>Dokumen Penyesuaian</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .letterhead { border-bottom: 1px solid #f97316; padding-bottom: 12px; margin-bottom: 12px; }
            .logo { width: 60px; height: 60px; float: left; margin-right: 12px; }
            .logo-circle { width: 100%; height: 100%; background: linear-gradient(135deg, #f97316, #f59e0b); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; }
            .letterhead h1 { margin: 0; color: #ea580c; font-size: 18px; }
            .letterhead h2 { margin: 3px 0; color: #4b5563; font-size: 14px; }
            .letterhead p { margin: 1px 0; color: #6b7280; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #f97316; }
            .header p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #fff8eb; }
            .signature-area { display: flex; justify-content: space-between; padding: 0 40px; margin-top: 30px; }
            .signature-box { width: 30%; text-align: center; }
            .signature-line { margin-top: 70px; margin-bottom: 10px; border-top: 1px solid #000; width: 80%; margin-left: auto; margin-right: auto; }
            .location-date { margin: 40px 0 20px; text-align: center; }
            .signature-title { margin-bottom: 60px; font-weight: 500; }
            .signature-name { font-weight: 500; }
            .signature-role { font-size: 12px; color: #666; margin-top: 4px; }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Reload to restore all event handlers
  };
  
  // Export to PDF handler
  const handleExportToPDF = () => {
    if (!documentRef.current || !selectedHistory) return;
    
    toast({
      title: "Mengekspor dokumen",
      description: "Membuat file PDF, mohon tunggu...",
    });
    
    const element = documentRef.current;
    const filename = `Penyesuaian_${selectedHistory.adjustmentNumber.replace(/\//g, '-')}.pdf`;
    
    html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(filename);
      
      toast({
        title: "Ekspor berhasil",
        description: `File PDF telah diunduh: ${filename}`,
      });
    });
  };
  
  // Export to Excel handler
  const handleExportToExcel = () => {
    if (!selectedHistory) return;
    
    toast({
      title: "Mengekspor dokumen",
      description: "Membuat file Excel, mohon tunggu...",
    });
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Create header for the data
    const headerData = [
      ['Dokumen Penyesuaian Stok'],
      ['Nomor:', selectedHistory.adjustmentNumber],
      ['Tanggal:', formatDate(selectedHistory.date)],
      ['Disesuaikan Oleh:', selectedHistory.adjustmentBy],
      ['Disetujui Oleh:', selectedHistory.approvedBy || '-'],
      ['Status:', selectedHistory.status === 'approved' ? 'Disetujui' : selectedHistory.status === 'rejected' ? 'Ditolak' : 'Menunggu'],
      ['Catatan:', selectedHistory.notes || '-'],
      [''],
      ['Daftar Item:'],
      ['No', 'Produk', 'SKU', 'Stok Awal', 'Stok Baru', 'Penyesuaian', 'Alasan']
    ];
    
    // Add item data
    const itemData = selectedHistory.items.map((item, index) => {
      return [
        index + 1,
        item.productName,
        item.sku,
        item.currentStock,
        item.newStock,
        `${item.adjustmentType === 'increase' ? '+' : '-'}${item.adjustmentQuantity}`,
        item.reason
      ];
    });
    
    // Combine header and item data
    const wsData = [...headerData, ...itemData];
    
    // Create worksheet and add to workbook
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Penyesuaian Stok');
    
    // Style the header
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Merge title cells
      { s: { r: 8, c: 0 }, e: { r: 8, c: 6 } }  // Merge 'Daftar Item' cells
    ];
    
    // Generate Excel file and trigger download
    const filename = `Penyesuaian_${selectedHistory.adjustmentNumber.replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    toast({
      title: "Ekspor berhasil",
      description: `File Excel telah diunduh: ${filename}`,
    });
  };
  
  return (
    <InventoryLayout>
      <style jsx global>
        {`
          .dropdown:hover .dropdown-menu {
            display: block;
          }
        `}
      </style>
      <div className="flex flex-col">
        <Breadcrumbs
          items={[
            { title: t('sidebar.dashboard'), href: "/dashboard" },
            { title: t('inventory.title'), href: "/inventory" },
            { title: t('inventory.adjustment.title'), href: "/inventory/adjustment" },
          ]}
          className="mb-6"
        />
        
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                <FaBalanceScale className="mr-3 text-orange-500" /> {t('inventory.adjustment.title')}
              </h1>
              <p className="text-gray-600 mt-1">
                {t('inventory.adjustment.subtitle')}
              </p>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-2 border-b border-orange-100">
            <button
              onClick={() => setActiveTab("manual")}
              className={`px-4 py-2 font-medium rounded-t-lg transition-all ${activeTab === "manual" 
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white" 
                : "text-gray-600 hover:text-orange-500 hover:bg-orange-50"}`}
            >
              <FaExchangeAlt className="inline-block mr-2" /> {t('inventory.adjustment.manualTab')}
            </button>
            <button
              onClick={() => setActiveTab("stockopname")}
              className={`px-4 py-2 font-medium rounded-t-lg transition-all ${activeTab === "stockopname" 
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white" 
                : "text-gray-600 hover:text-orange-500 hover:bg-orange-50"}`}
            >
              <FaClipboardCheck className="inline-block mr-2" /> {t('inventory.adjustment.stockOpnameTab')}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 font-medium rounded-t-lg transition-all ${activeTab === "history" 
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white" 
                : "text-gray-600 hover:text-orange-500 hover:bg-orange-50"}`}
            >
              <FaHistory className="inline-block mr-2" /> {t('inventory.adjustment.historyTab')}
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="mt-4">
            {/* Manual Adjustment Tab */}
            {activeTab === "manual" && (
              <div className="space-y-6">
                <Card className="overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500"></div>
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold flex items-center">
                      <FaExchangeAlt className="mr-2 text-orange-500" /> {t('inventory.adjustment.manualForm')}
                    </CardTitle>
                    <CardDescription>
                      {t('inventory.adjustment.manualFormDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div>
                        <Label htmlFor="adjustment-number">{t('inventory.adjustment.adjustmentNumber')}</Label>
                        <Input
                          id="adjustment-number"
                          value={adjustmentNumber}
                          onChange={(e) => setAdjustmentNumber(e.target.value)}
                          placeholder="ADJ/YYYY/MM/001"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="adjustment-date">{t('inventory.adjustment.date')}</Label>
                        <Input
                          id="adjustment-date"
                          type="date"
                          value={adjustmentDate}
                          onChange={(e) => setAdjustmentDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="adjustment-by">{t('inventory.adjustment.adjustedBy')}</Label>
                        <Input
                          id="adjustment-by"
                          value={adjustmentBy}
                          onChange={(e) => setAdjustmentBy(e.target.value)}
                          placeholder={t('inventory.adjustment.officerName')}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <Label htmlFor="notes">{t('inventory.adjustment.notes')}</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t('inventory.adjustment.notesPlaceholder')}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    
                    <div className="bg-orange-50 p-4 rounded-lg mb-6">
                      <h3 className="font-medium text-orange-800 mb-3">{t('inventory.adjustment.searchProduct')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <div className="relative">
                            <Input
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder={t('inventory.adjustment.searchPlaceholder')}
                              className="pr-10"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <FaSearch className="text-gray-400" />
                            </div>
                          </div>
                          {isSearching && <p className="text-sm text-gray-500 mt-1">{t('inventory.adjustment.searching')}</p>}
                          {searchResults.length > 0 && (
                            <div className="mt-2 bg-white shadow-lg rounded-md border border-gray-200 absolute z-10 max-h-60 overflow-y-auto w-full md:w-1/2">
                              {searchResults.map((product) => (
                                <div
                                  key={product.id}
                                  className="p-2 hover:bg-orange-50 cursor-pointer border-b last:border-b-0"
                                  onClick={() => handleSelectProduct(product)}
                                >
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-gray-500">
                                    {product.sku && <span className="mr-2">SKU: {product.sku}</span>}
                                    {product.barcode && <span>Barcode: {product.barcode}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <Button
                            onClick={handleSearch}
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                          >
                            <FaSearch className="mr-2" /> {t('inventory.adjustment.searchProduct')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  
                    {/* Product Adjustment Form */}
                    {selectedProduct && (
                      <div className="bg-white border border-orange-200 rounded-lg p-4 mb-6">
                        <h3 className="font-medium text-orange-800 mb-3">{t('inventory.adjustment.adjustmentInfo')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-500">{t('inventory.adjustment.product')}</p>
                            <p className="font-medium">{selectedProduct.name}</p>
                            {selectedProduct.sku && <p className="text-sm">SKU: {selectedProduct.sku}</p>}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">{t('inventory.adjustment.currentStock')}</p>
                            <p className="font-medium">{selectedStock}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <Label htmlFor="adjustment-type">{t('inventory.adjustment.adjustmentType')}</Label>
                            <div className="flex space-x-2 mt-1">
                              <Button
                                type="button"
                                onClick={() => handleAdjustmentTypeChange("increase")}
                                className={`flex-1 ${adjustmentType === "increase" 
                                  ? "bg-gradient-to-r from-green-500 to-emerald-500" 
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                              >
                                <FaArrowUp className="mr-1" /> {t('inventory.adjustment.increase')}
                              </Button>
                              <Button
                                type="button"
                                onClick={() => handleAdjustmentTypeChange("decrease")}
                                className={`flex-1 ${adjustmentType === "decrease" 
                                  ? "bg-gradient-to-r from-red-500 to-rose-500" 
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                              >
                                <FaArrowDown className="mr-1" /> {t('inventory.adjustment.decrease')}
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="new-stock">{t('inventory.adjustment.newStock')}</Label>
                            <Input
                              id="new-stock"
                              type="number"
                              value={newStock}
                              onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                              min={adjustmentType === "decrease" ? 0 : selectedStock}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="adjustment-quantity">{t('inventory.adjustment.adjustmentQty')}</Label>
                            <Input
                              id="adjustment-quantity"
                              type="number"
                              value={calculateAdjustmentQuantity(selectedStock, newStock, adjustmentType)}
                              disabled
                              className="mt-1 bg-gray-100"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label htmlFor="reason">{t('inventory.adjustment.reason')}</Label>
                            <Select 
                              value={reason} 
                              onValueChange={setReason}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder={t('inventory.adjustment.selectReason')} />
                              </SelectTrigger>
                              <SelectContent>
                                {adjustmentReasons.map((r) => (
                                  <SelectItem key={r.id} value={r.id}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {reason === "other" && (
                            <div>
                              <Label htmlFor="custom-reason">{t('inventory.adjustment.otherReason')}</Label>
                              <Input
                                id="custom-reason"
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder={t('inventory.adjustment.enterReason')}
                                className="mt-1"
                              />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-end mt-4">
                          <Button 
                            variant="outline" 
                            onClick={() => setSelectedProduct(null)} 
                            className="mr-2 border-orange-200 text-orange-600 hover:bg-orange-50"
                          >
                            <FaTimes className="mr-1" /> {t('common.cancel')}
                          </Button>
                          <Button 
                            onClick={handleAddProduct}
                            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                            disabled={!reason || (reason === "other" && !customReason)}
                          >
                            <FaPlus className="mr-1" /> {t('inventory.adjustment.addProduct')}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Items Table */}
                    {adjustmentItems.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-medium text-gray-800 mb-3">{t('inventory.adjustment.itemList')}</h3>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-orange-50">
                                <TableHead className="w-[50px]">No</TableHead>
                                <TableHead>{t('inventory.adjustment.product')}</TableHead>
                                <TableHead>{t('inventory.adjustment.currentStock')}</TableHead>
                                <TableHead>{t('inventory.adjustment.newStock')}</TableHead>
                                <TableHead>{t('inventory.adjustment.adjustmentCol')}</TableHead>
                                <TableHead>{t('inventory.adjustment.reason')}</TableHead>
                                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {adjustmentItems.map((item, index) => (
                                <TableRow key={item.id}>
                                  <TableCell>{index + 1}</TableCell>
                                  <TableCell>
                                    <div className="font-medium">{item.productName}</div>
                                    <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                                  </TableCell>
                                  <TableCell>{item.currentStock}</TableCell>
                                  <TableCell>{item.newStock}</TableCell>
                                  <TableCell>
                                    <Badge className={item.adjustmentType === "increase" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                      {item.adjustmentType === "increase" ? "+" : "-"}{item.adjustmentQuantity}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{item.reason}</TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveItem(item.id)}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <FaTrash />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        
                        <div className="mt-4 flex justify-end">
                          <Button 
                            onClick={handleSaveAdjustment}
                            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                          >
                            <FaSave className="mr-2" /> {t('inventory.adjustment.saveAdjustment')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Stockopname Adjustment Tab */}
            {activeTab === "stockopname" && (
              <div className="space-y-6">
                <Card className="overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500"></div>
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold flex items-center">
                      <FaClipboardCheck className="mr-2 text-orange-500" /> {t('inventory.adjustment.stockOpnameTab')}
                    </CardTitle>
                    <CardDescription>
                      {t('inventory.adjustment.stockOpnameDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stocktakes.length === 0 ? (
                      <div className="p-6 text-center">
                        <FaList className="mx-auto text-5xl text-orange-300 mb-4" />
                        <h3 className="text-xl font-medium text-gray-700 mb-2">{t('inventory.adjustment.noStocktake')}</h3>
                        <p className="text-gray-500 mb-4">{t('inventory.adjustment.noStocktakeDesc')}</p>
                        <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                          <FaClipboardCheck className="mr-2" /> {t('inventory.adjustment.startNewStocktake')}
                        </Button>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-orange-50">
                              <TableHead>{t('inventory.adjustment.stocktakeNumber')}</TableHead>
                              <TableHead>{t('inventory.adjustment.date')}</TableHead>
                              <TableHead>{t('inventory.adjustment.location')}</TableHead>
                              <TableHead>{t('inventory.adjustment.conductedBy')}</TableHead>
                              <TableHead>{t('inventory.adjustment.verifiedBy')}</TableHead>
                              <TableHead>{t('common.status')}</TableHead>
                              <TableHead className="text-right">{t('common.actions')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stocktakes.map((stocktake) => (
                              <TableRow key={stocktake.id}>
                                <TableCell className="font-medium">{stocktake.stocktakeNumber}</TableCell>
                                <TableCell>{formatDate(stocktake.date)}</TableCell>
                                <TableCell>{stocktake.location}</TableCell>
                                <TableCell>{stocktake.conductedBy}</TableCell>
                                <TableCell>{stocktake.verifiedBy || "-"}</TableCell>
                                <TableCell>
                                  <Badge className={
                                    stocktake.status === "approved" 
                                      ? "bg-green-100 text-green-800" 
                                      : stocktake.status === "rejected"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-yellow-100 text-yellow-800"
                                  }>
                                    {stocktake.status === "approved" 
                                      ? t('inventory.adjustment.approved') 
                                      : stocktake.status === "rejected"
                                        ? t('inventory.adjustment.rejected')
                                        : t('inventory.adjustment.pending')}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleViewStocktake(stocktake)}
                                    className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                                  >
                                    <FaFileAlt />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Adjustment History Tab */}
            {activeTab === "history" && (
              <div className="space-y-6">
                <Card className="overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500"></div>
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold flex items-center">
                      <FaHistory className="mr-2 text-orange-500" /> {t('inventory.adjustment.historyTab')}
                    </CardTitle>
                    <CardDescription>
                      {t('inventory.adjustment.historyDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-orange-50">
                            <TableHead>{t('inventory.adjustment.adjustmentNumber')}</TableHead>
                            <TableHead>{t('inventory.adjustment.date')}</TableHead>
                            <TableHead>{t('inventory.adjustment.adjustedBy')}</TableHead>
                            <TableHead>{t('inventory.adjustment.approvedBy')}</TableHead>
                            <TableHead>{t('inventory.adjustment.totalItems')}</TableHead>
                            <TableHead>{t('common.status')}</TableHead>
                            <TableHead className="text-right">{t('common.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {adjustmentHistory.map((history) => (
                            <TableRow key={history.id}>
                              <TableCell className="font-medium">{history.adjustmentNumber}</TableCell>
                              <TableCell>{formatDate(history.date)}</TableCell>
                              <TableCell>{history.adjustmentBy}</TableCell>
                              <TableCell>{history.approvedBy || "-"}</TableCell>
                              <TableCell>{history.totalItems}</TableCell>
                              <TableCell>
                                <Badge className={
                                  history.status === "approved" 
                                    ? "bg-green-100 text-green-800" 
                                    : history.status === "rejected"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                }>
                                  {history.status === "approved" 
                                    ? t('inventory.adjustment.approved') 
                                    : history.status === "rejected"
                                      ? t('inventory.adjustment.rejected')
                                      : t('inventory.adjustment.pending')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleViewDocument(history)}
                                  className="text-orange-500 hover:text-orange-700 hover:bg-orange-50 mr-1"
                                >
                                  <FaFileAlt />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => {
                                    setSelectedHistory(history);
                                    setShowAdjustmentDoc(true);
                                    setTimeout(() => handlePrintDocument(), 500);
                                  }}
                                >
                                  <FaPrint />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Stocktake Details Modal */}
            {showStocktakeDetails && selectedStocktake && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">{t('inventory.adjustment.stocktakeDetail')}</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowStocktakeDetails(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <FaTimes />
                    </Button>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <p><span className="font-medium">{t('inventory.adjustment.stocktakeNumber')}:</span> {selectedStocktake.stocktakeNumber}</p>
                        <p><span className="font-medium">{t('inventory.adjustment.date')}:</span> {formatDate(selectedStocktake.date)}</p>
                        <p><span className="font-medium">{t('inventory.adjustment.location')}:</span> {selectedStocktake.location}</p>
                      </div>
                      <div>
                        <p><span className="font-medium">{t('inventory.adjustment.conductedBy')}:</span> {selectedStocktake.conductedBy}</p>
                        <p><span className="font-medium">{t('inventory.adjustment.verifiedBy')}:</span> {selectedStocktake.verifiedBy || "-"}</p>
                        <p>
                          <span className="font-medium">{t('common.status')}:</span> 
                          <Badge className={
                            selectedStocktake.status === "approved" 
                              ? "bg-green-100 text-green-800 ml-2" 
                              : selectedStocktake.status === "rejected"
                                ? "bg-red-100 text-red-800 ml-2"
                                : "bg-yellow-100 text-yellow-800 ml-2"
                          }>
                            {selectedStocktake.status === "approved" 
                              ? t('inventory.adjustment.approved') 
                              : selectedStocktake.status === "rejected"
                                ? t('inventory.adjustment.rejected')
                                : t('inventory.adjustment.pending')}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    
                    {selectedStocktake.notes && (
                      <div className="mb-6">
                        <p className="font-medium">{t('inventory.adjustment.notes')}:</p>
                        <p className="bg-gray-50 p-3 rounded-md">{selectedStocktake.notes}</p>
                      </div>
                    )}
                    
                    <h3 className="font-semibold text-lg mb-3">{t('inventory.adjustment.stocktakeItems')}</h3>
                    <div className="border rounded-lg overflow-hidden mb-6">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-orange-50">
                            <TableHead className="w-[50px]">No</TableHead>
                            <TableHead>{t('inventory.adjustment.product')}</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>{t('inventory.adjustment.systemStock')}</TableHead>
                            <TableHead>{t('inventory.adjustment.actualStock')}</TableHead>
                            <TableHead>{t('inventory.adjustment.difference')}</TableHead>
                            <TableHead>{t('inventory.adjustment.notes')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stocktakeItems.map((item, index) => (
                            <TableRow key={item.id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>
                                <div className="font-medium">{item.productName}</div>
                              </TableCell>
                              <TableCell>{item.sku}</TableCell>
                              <TableCell>{item.systemStock}</TableCell>
                              <TableCell>{item.actualStock}</TableCell>
                              <TableCell>
                                <Badge className={
                                  item.difference === 0 
                                    ? "bg-gray-100 text-gray-800" 
                                    : item.difference > 0
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                }>
                                  {item.difference > 0 ? "+" : ""}{item.difference}
                                </Badge>
                              </TableCell>
                              <TableCell>{item.notes || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  
                  <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowStocktakeDetails(false)}
                      className="border-orange-200 text-orange-600 hover:bg-orange-50"
                    >
                      <FaTimes className="mr-2" /> {t('common.close')}
                    </Button>
                    <Button 
                      onClick={handleAddStocktakeToAdjustment}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    >
                      <FaExchangeAlt className="mr-2" /> {t('inventory.adjustment.createAdjustment')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Adjustment Document Modal */}
            {showAdjustmentDoc && selectedHistory && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">{t('inventory.adjustment.adjustmentDocument')}</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdjustmentDoc(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <FaTimes />
                    </Button>
                  </div>
                  
                  <div className="p-8" ref={documentRef}>
                    <div className="document-content">
                      {/* Kop Surat (Letterhead) */}
                      <div className="letterhead border-b border-orange-500 pb-3 mb-4">
                        <div className="flex items-center">
                          <div className="logo w-16 h-16 relative mr-3">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                              <span>FX</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <h1 className="text-xl font-bold text-orange-600">APOTEK FARMAX</h1>
                            <h2 className="text-sm font-semibold text-gray-700">Solusi Lengkap Kebutuhan Kesehatan Anda</h2>
                            <p className="text-xs text-gray-600 mt-0.5">Jl. Kesehatan No. 123, Jakarta Selatan 12345</p>
                            <p className="text-xs text-gray-600">Telp: (021) 555-7890 | Email: info@apotekfarmax.co.id</p>
                            <p className="text-xs text-gray-600">www.apotekfarmax.co.id</p>
                          </div>
                        </div>
                      </div>

                      <div className="header text-center mb-4">
                        <h1 className="text-xl font-bold text-orange-500 mb-1">{t('inventory.adjustment.adjustmentDocument')}</h1>
                        <p className="text-gray-500 text-sm">{t('inventory.adjustment.numberLabel')}: {selectedHistory.adjustmentNumber}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <p><span className="font-medium">{t('inventory.adjustment.date')}:</span> {formatDate(selectedHistory.date)}</p>
                          <p><span className="font-medium">{t('inventory.adjustment.adjustedBy')}:</span> {selectedHistory.adjustmentBy}</p>
                          {selectedHistory.approvedBy && (
                            <p><span className="font-medium">{t('inventory.adjustment.approvedBy')}:</span> {selectedHistory.approvedBy}</p>
                          )}
                        </div>
                        <div>
                          <p>
                            <span className="font-medium">{t('common.status')}:</span> 
                            <span className={
                              selectedHistory.status === "approved" 
                                ? "text-green-600" 
                                : selectedHistory.status === "rejected"
                                  ? "text-red-600"
                                  : "text-yellow-600"
                            }>
                              {selectedHistory.status === "approved" 
                                ? t('inventory.adjustment.approved') 
                                : selectedHistory.status === "rejected"
                                  ? t('inventory.adjustment.rejected')
                                  : t('inventory.adjustment.pending')}
                            </span>
                          </p>
                          <p><span className="font-medium">{t('inventory.adjustment.totalItems')}:</span> {selectedHistory.totalItems}</p>
                          {selectedHistory.notes && (
                            <p><span className="font-medium">{t('inventory.adjustment.notes')}:</span> {selectedHistory.notes}</p>
                          )}
                        </div>
                      </div>
                      
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-orange-50">
                            <th className="border border-gray-300 p-2 text-left">No</th>
                            <th className="border border-gray-300 p-2 text-left">{t('inventory.adjustment.product')}</th>
                            <th className="border border-gray-300 p-2 text-left">SKU</th>
                            <th className="border border-gray-300 p-2 text-left">{t('inventory.adjustment.initialStock')}</th>
                            <th className="border border-gray-300 p-2 text-left">{t('inventory.adjustment.newStock')}</th>
                            <th className="border border-gray-300 p-2 text-left">{t('inventory.adjustment.adjustmentCol')}</th>
                            <th className="border border-gray-300 p-2 text-left">{t('inventory.adjustment.reason')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedHistory.items.map((item, index) => (
                            <tr key={item.id}>
                              <td className="border border-gray-300 p-2">{index + 1}</td>
                              <td className="border border-gray-300 p-2">{item.productName}</td>
                              <td className="border border-gray-300 p-2">{item.sku}</td>
                              <td className="border border-gray-300 p-2">{item.currentStock}</td>
                              <td className="border border-gray-300 p-2">{item.newStock}</td>
                              <td className="border border-gray-300 p-2">
                                <span className={item.adjustmentType === "increase" ? "text-green-600" : "text-red-600"}>
                                  {item.adjustmentType === "increase" ? "+" : "-"}{item.adjustmentQuantity}
                                </span>
                              </td>
                              <td className="border border-gray-300 p-2">{item.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      <div className="mt-20 mb-8">
                        <div className="flex justify-between">
                          <div className="w-1/3"></div>
                          <div className="w-1/3 text-center">
                            <p className="font-medium text-gray-800 mb-1">{t('inventory.adjustment.submittedAt')}: Jakarta</p>
                            <p className="text-sm text-gray-600">{t('inventory.adjustment.date')}: {formatDate(selectedHistory.date)}</p>
                          </div>
                          <div className="w-1/3"></div>
                        </div>
                      </div>
                      
                      <div className="signature-area flex justify-between px-8 mt-6">
                        <div className="w-1/3 text-center">
                          <p className="font-medium text-gray-700 mb-16">{t('inventory.adjustment.createdBy')},</p>
                          <div className="signature-line w-full mx-auto border-b border-gray-400 mb-2"></div>
                          <p className="font-medium">{selectedHistory.adjustmentBy}</p>
                          <p className="text-xs text-gray-500 mt-1">({t('inventory.adjustment.warehouseOfficer')})</p>
                        </div>
                        
                        <div className="w-1/3 text-center">
                          <p className="font-medium text-gray-700 mb-16">{t('inventory.adjustment.acknowledgedBy')},</p>
                          <div className="signature-line w-full mx-auto border-b border-gray-400 mb-2"></div>
                          <p className="font-medium">{t('inventory.adjustment.pharmacyHead')}</p>
                          <p className="text-xs text-gray-500 mt-1">({t('inventory.adjustment.leader')})</p>
                        </div>
                        
                        <div className="w-1/3 text-center">
                          <p className="font-medium text-gray-700 mb-16">{selectedHistory.status === "approved" ? t('inventory.adjustment.approved') : t('inventory.adjustment.needsApproval')} {t('inventory.adjustment.byLabel')},</p>
                          <div className="signature-line w-full mx-auto border-b border-gray-400 mb-2"></div>
                          <p className="font-medium">{selectedHistory.approvedBy || "_____________"}</p>
                          <p className="text-xs text-gray-500 mt-1">({t('inventory.adjustment.responsiblePharmacist')})</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAdjustmentDoc(false)}
                      className="border-orange-200 text-orange-600 hover:bg-orange-50"
                    >
                      <FaTimes className="mr-2" /> {t('common.close')}
                    </Button>
                    <div className="dropdown inline-block relative">
                      <Button
                        variant="outline"
                        className="border-orange-200 text-orange-600 hover:bg-orange-50 inline-flex items-center"
                      >
                        <FaDownload className="mr-2" /> {t('inventory.adjustment.download')}
                        <svg className="fill-current h-4 w-4 ml-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                        </svg>
                      </Button>
                      <div className="dropdown-menu absolute hidden text-gray-700 pt-1 right-0 w-48 z-50">
                        <Button
                          variant="ghost"
                          onClick={handleExportToPDF}
                          className="rounded-t bg-white hover:bg-gray-100 py-2 px-4 w-full text-left flex items-center text-sm"
                        >
                          <FaFilePdf className="mr-2 text-red-500" /> {t('inventory.adjustment.exportPDF')}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={handleExportToExcel}
                          className="rounded-b bg-white hover:bg-gray-100 py-2 px-4 w-full text-left flex items-center text-sm"
                        >
                          <FaFileExcel className="mr-2 text-green-600" /> {t('inventory.adjustment.exportExcel')}
                        </Button>
                      </div>
                    </div>
                    <Button 
                      onClick={handlePrintDocument}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    >
                      <FaPrint className="mr-2" /> {t('inventory.adjustment.printDocument')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </InventoryLayout>
  );
};

// Navigation items for cross-module integration
AdjustmentPage.navigationItems = [
  {
    title: "Inventaris",
    items: [
      { name: "Penerimaan Barang", href: "/inventory/receive", icon: "📦" },
      { name: "Penyesuaian Stok", href: "/inventory/adjustment", icon: "⚖️", active: true },
      { name: "Stock Opname", href: "/inventory/stocktake", icon: "📋" },
      { name: "Laporan Stok", href: "/inventory/reports", icon: "📊" },
      { name: "Grafik Stok", href: "/inventory/stock-graph", icon: "📈" }
    ]
  },
  {
    title: "Keuangan",
    items: [
      { name: "Dashboard Keuangan", href: "/finance/dashboard", icon: "💰" },
      { name: "Buku Besar", href: "/finance/ledger", icon: "📚" }
    ]
  },
  {
    title: "Pembelian",
    items: [
      { name: "Purchase Order", href: "/purchasing/orders", icon: "🛒" },
      { name: "Defekta", href: "/purchasing/defecta", icon: "⚠️" }
    ]
  }
];

export default AdjustmentPage;
