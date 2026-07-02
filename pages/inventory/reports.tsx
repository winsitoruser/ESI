import React, { useState } from "react";
import { NextPage } from "next";
import InventoryLayout from "@/components/layouts/inventory-layout";
import { useTranslation } from '@/lib/i18n';
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { mockCategories, mockProducts, mockStocks } from "@/modules/inventory/types";
import { formatRupiah } from "@/lib/utils";
import { 
  FaChartBar, 
  FaFileExport, 
  FaFilePdf,
  FaFileExcel,
  FaPrint,
  FaChartPie,
  FaChartLine,
  FaBoxOpen,
  FaArrowUp,
  FaArrowDown,
  FaCalendarAlt,
  FaWarehouse,
  FaExclamationTriangle,
  FaInfoCircle,
  FaSearch,
  FaMapMarkerAlt,
  FaCubes,
  FaStore,
  FaFilter,
  FaCalendarDay
} from "react-icons/fa";
import StockMovementHistoryModal from "@/modules/inventory/components/StockMovementHistoryModal";
import StockValueSummaryCard from "@/modules/inventory/components/StockValueSummaryCard";
import { 
  generateStockValueData, 
  generateProductStockValueData,
  getProductGroupValueData,
  getLocationStockValueData 
} from "@/modules/inventory/utils/stockReportUtils";

import {
  exportStockValueSummaryToPDF,
  exportStockValueSummaryToExcel,
  exportProductsToExcel,
  printStockValueSummary
} from "@/modules/inventory/utils/exportUtils";

import {
  fetchStockValueReport,
  fetchStockMovementReport,
  fetchLowStockReport,
  fetchProductAnalysisReport,
  generateReport
} from "@/lib/adapters/reports-adapter";

// Helper function to format date
const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

// Definisikan tipe data untuk StockMovement
interface StockMovement {
  id: string;
  date: Date;
  type: "in" | "out" | "adjustment";
  reference: string;
  productName: string;
  quantity: number;
  fromTo: string;
  notes: string;
}

// Generate movement data dengan timestamps terbaru
const generateMovementData = (): StockMovement[] => {
  const currentDate = new Date();
  const yesterday = new Date(currentDate);
  yesterday.setDate(currentDate.getDate() - 1);
  
  const twoDaysAgo = new Date(currentDate);
  twoDaysAgo.setDate(currentDate.getDate() - 2);
  
  const threeDaysAgo = new Date(currentDate);
  threeDaysAgo.setDate(currentDate.getDate() - 3);
  
  const lastWeek = new Date(currentDate);
  lastWeek.setDate(currentDate.getDate() - 7);
  
  const twoWeeksAgo = new Date(currentDate);
  twoWeeksAgo.setDate(currentDate.getDate() - 14);
  
  // Mock data untuk pergerakan stok dengan tanggal yang lebih realistis
  return [
    { id: "SM001", date: twoWeeksAgo, type: "in", reference: "PO-2023-001", productName: "Paracetamol 500mg", quantity: 100, fromTo: "PT Kimia Farma", notes: "Pesanan reguler" },
    { id: "SM002", date: lastWeek, type: "out", reference: "SO-2023-045", productName: "Paracetamol 500mg", quantity: 5, fromTo: "Pelanggan", notes: "Penjualan retail" },
    { id: "SM003", date: lastWeek, type: "in", reference: "PO-2023-002", productName: "Amoxicillin 500mg", quantity: 50, fromTo: "PT Dexa Medica", notes: "Pesanan bulanan" },
    { id: "SM004", date: threeDaysAgo, type: "adjustment", reference: "ADJ-2023-001", productName: "Vitamin C 1000mg", quantity: -2, fromTo: "Gudang", notes: "Kerusakan produk" },
    { id: "SM005", date: twoDaysAgo, type: "out", reference: "SO-2023-046", productName: "Amoxicillin 500mg", quantity: 10, fromTo: "Klinik Sehat", notes: "Penjualan grosir" },
    { id: "SM006", date: yesterday, type: "in", reference: "PO-2023-003", productName: "Minyak Kayu Putih 60ml", quantity: 30, fromTo: "PT Eagle Indo Pharma", notes: "Pesanan mendesak" },
    { id: "SM007", date: currentDate, type: "out", reference: "SO-2023-047", productName: "Vitamin C 1000mg", quantity: 15, fromTo: "Pelanggan", notes: "Penjualan retail" },
    { id: "SM008", date: currentDate, type: "adjustment", reference: "ADJ-2023-002", productName: "Antasida Tablet", quantity: 5, fromTo: "Gudang", notes: "Koreksi stok opname" },
    { id: "SM009", date: currentDate, type: "in", reference: "PO-2023-004", productName: "Ibuprofen 400mg", quantity: 45, fromTo: "PT Kimia Farma", notes: "Pengisian stok bulanan" },
    { id: "SM010", date: yesterday, type: "out", reference: "SO-2023-048", productName: "Betadine Solution 60ml", quantity: 8, fromTo: "Puskesmas Jaya", notes: "Penjualan grosir" },
  ];
};

// Generate low stock data dengan data cabang tambahan
const generateLowStockData = () => {
  // Mock data untuk produk dengan stok rendah
  const products = [
    { id: "LS001", name: "Paracetamol 500mg", sku: "MED-PCT-500", categoryName: "Obat Bebas", currentStock: 10, minStock: 15, price: 12000, supplier: "PT Kimia Farma", branchId: "branch-001" },
    { id: "LS002", name: "Amoxicillin 500mg", sku: "MED-AMX-500", categoryName: "Obat Keras", currentStock: 5, minStock: 20, price: 25000, supplier: "PT Dexa Medica", branchId: "branch-001" },
    { id: "LS003", name: "Vitamin C 1000mg", sku: "SUP-VTC-1000", categoryName: "Vitamin", currentStock: 8, minStock: 25, price: 15000, supplier: "PT Bayer Indonesia", branchId: "branch-002" },
    { id: "LS004", name: "Antasida Tablet", sku: "MED-ANT-001", categoryName: "Obat Bebas", currentStock: 12, minStock: 30, price: 8000, supplier: "PT Kimia Farma", branchId: "branch-002" },
    { id: "LS005", name: "Minyak Kayu Putih 60ml", sku: "OTC-MKP-60", categoryName: "Obat Luar", currentStock: 3, minStock: 10, price: 18000, supplier: "PT Eagle Indo Pharma", branchId: "branch-003" },
    { id: "LS006", name: "Cefixime 200mg", sku: "MED-CFX-200", categoryName: "Obat Keras", currentStock: 7, minStock: 15, price: 35000, supplier: "PT Dexa Medica", branchId: "branch-003" },
    { id: "LS007", name: "Betadine Solution 60ml", sku: "OTC-BET-60", categoryName: "Obat Luar", currentStock: 5, minStock: 12, price: 20000, supplier: "PT Mahakam Beta Farma", branchId: "branch-004" },
    { id: "LS008", name: "Ibuprofen 400mg", sku: "MED-IBU-400", categoryName: "Obat Bebas Terbatas", currentStock: 9, minStock: 20, price: 15000, supplier: "PT Kimia Farma", branchId: "branch-004" },
  ];
  
  return products.filter(product => product.currentStock < product.minStock);
};

const ReportsPage: NextPage = () => {
  const [tab, setTab] = useState("stock-value");
  const [period, setPeriod] = useState("all-time");
  const { t, formatDate } = useTranslation();
  const [exportFormat, setExportFormat] = useState("pdf");
  const [valueView, setValueView] = useState<'category' | 'product' | 'group'>('category');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [apiData, setApiData] = useState<any>(null);
  const [isFromMock, setIsFromMock] = useState(false);
  
  // State untuk filter tanggal
  const today = new Date();
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(today.getMonth() - 1);
  
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({ from: oneMonthAgo, to: today });
  
  const [movementType, setMovementType] = useState<string>('all');
  
  // State for Stock Movement History Modal
  const [showMovementHistory, setShowMovementHistory] = useState(false);
  
  // Get data from utilities (fallback data)
  const { totalStockValue, previousTotalValue, categoryValues } = generateStockValueData();
  const productValues = generateProductStockValueData();
  const { totalValue: groupTotalValue, groupValues } = getProductGroupValueData();
  
  // Load reports data from API
  const loadReportsData = async () => {
    setIsLoading(true);
    try {
      let result;
      switch (tab) {
        case 'stock-value':
          result = await fetchStockValueReport({ branch: selectedBranch, period });
          break;
        case 'stock-movement':
          result = await fetchStockMovementReport({ branch: selectedBranch, period });
          break;
        case 'low-stock':
          result = await fetchLowStockReport({ branch: selectedBranch });
          break;
        case 'product-analysis':
          result = await fetchProductAnalysisReport({ branch: selectedBranch, period });
          break;
        default:
          result = await fetchStockValueReport({ branch: selectedBranch, period });
      }
      
      if (result.success) {
        setApiData(result.data);
        setIsFromMock(result.isFromMock);
      }
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load data on component mount and when filters change
  React.useEffect(() => {
    loadReportsData();
  }, [tab, selectedBranch, period]);
  // Branch data - mapped to database locations
  const mockBranches = [
    {
      id: "all",
      name: "Semua Cabang",
      code: "ALL",
    },
    {
      id: "warehouse-001",
      name: "Gudang Pusat",
      code: "WH-001",
      address: "Jl. Industri No. 1",
      phone: "021-5551234",
    },
    {
      id: "branch-001",
      name: "Toko Cabang A",
      code: "ST-001", 
      address: "Jl. Raya Utara No. 45",
      phone: "022-4201234",
    },
    {
      id: "branch-002",
      name: "Toko Cabang B",
      code: "ST-002",
      address: "Jl. Pemuda No. 56",
      phone: "031-5678901",
    },
    {
      id: "warehouse-002",
      name: "Gudang Regional Jakarta",
      code: "WH-002",
      address: "Jl. Industri No. 2",
      phone: "021-5551235",
    },
    {
      id: "branch-003",
      name: "Toko Cabang C",
      code: "ST-003",
      address: "Jl. Diponegoro No. 78",
      phone: "061-4567890",
    },
    {
      id: "branch-004",
      name: "Toko Cabang D",
      code: "ST-004",
      address: "Jl. Merdeka No. 90",
      phone: "062-3456789",
    }
  ];
  
  // Legacy data for compatibility
  const movementData = generateMovementData();
  const lowStockData = generateLowStockData();
  
  // Handle data export
  const handleExportData = async () => {
    if (isLoading) {
      alert('Sedang memuat data, silakan tunggu...');
      return;
    }
    
    // Check if we have any data to export
    const hasData = (categoryValues && categoryValues.length > 0) || 
                    (apiData && (apiData.summary || apiData.movements || apiData.products));
    
    if (!hasData) {
      alert('Tidak ada data untuk diekspor');
      return;
    }
    
    // Try to generate report via API first
    try {
      const result = await generateReport(tab, {
        branch: selectedBranch,
        period: period,
        format: exportFormat
      }, exportFormat);
      
      if (result.success && result.data) {
        // Show success message with download option
        const downloadConfirm = confirm(`Laporan berhasil dibuat!\nID: ${result.data.reportId}\n\nKlik OK untuk mengunduh atau Cancel untuk menutup.`);
        if (downloadConfirm && result.data.downloadUrl) {
          window.open(result.data.downloadUrl, '_blank');
        }
        return;
      }
    } catch (error) {
      console.warn('API export failed, using fallback:', error);
    }

    // Fallback export based on current tab
    const branchCode = selectedBranch !== 'all' ? mockBranches.find(b => b.id === selectedBranch)?.code + '-' : '';
    const dateStr = new Date().toISOString().split('T')[0];
    
    switch (tab) {
      case 'stock-value':
        // Use API data if available, otherwise fallback to mock
        const exportCategories = apiData?.summary?.categories || categoryValues;
        switch (exportFormat) {
          case 'pdf':
            exportStockValueSummaryToPDF(
              exportCategories,
              `laporan-nilai-stok-${branchCode}${dateStr}.pdf`
            );
            break;
          case 'excel':
            exportStockValueSummaryToExcel(
              exportCategories,
              `laporan-nilai-stok-${branchCode}${dateStr}.xlsx`
            );
            break;
          case 'csv':
            exportStockValueSummaryToExcel(
              exportCategories,
              `laporan-nilai-stok-${branchCode}${dateStr}.csv`
            );
            break;
        }
        break;
      case 'stock-movement':
        // Use API data if available, otherwise fallback to mock
        const exportMovements = apiData?.movements || movementData;
        exportProductsToExcel(
          exportMovements.map((m: any) => ({
            id: m.id,
            code: m.referenceNumber || m.reference,
            name: m.productName,
            category: m.movementType || m.type,
            stockQty: Math.abs(m.quantity),
            buyPrice: 0,
            stockValue: 0,
            unit: 'Movement'
          })),
          `laporan-pergerakan-stok-${branchCode}${dateStr}.xlsx`
        );
        break;
      case 'low-stock':
        // Use API data if available, otherwise fallback to mock
        const exportLowStock = apiData?.products || lowStockData;
        exportProductsToExcel(
          exportLowStock.map((p: any) => ({
            id: p.id,
            code: p.sku,
            name: p.name || p.productName,
            category: p.categoryName,
            stockQty: p.currentStock,
            buyPrice: p.price,
            stockValue: p.currentStock * p.price,
            unit: 'Pcs'
          })),
          `laporan-stok-minimum-${branchCode}${dateStr}.xlsx`
        );
        break;
      case 'product-analysis':
        alert('Export analisis produk akan segera tersedia');
        break;
      default:
        alert('Format export tidak didukung');
    }
  };
  
  // Handle print purchase order for low stock
  const handlePrintPurchaseOrder = () => {
    if (isLoading) {
      alert('Sedang memuat data, silakan tunggu...');
      return;
    }
    
    // Get low stock data
    const lowStockProducts = apiData?.products || lowStockData;
    
    if (!lowStockProducts || lowStockProducts.length === 0) {
      alert('Tidak ada produk dengan stok minimum untuk dicetak');
      return;
    }
    
    // Filter by selected branch
    const filteredProducts = lowStockProducts.filter((item: any) => 
      selectedBranch === 'all' || item.branchId === selectedBranch || item.locationId === selectedBranch
    );
    
    if (filteredProducts.length === 0) {
      alert('Tidak ada produk dengan stok minimum di cabang yang dipilih');
      return;
    }
    
    const branchInfo = selectedBranch === 'all' 
      ? { name: 'Semua Cabang', code: 'ALL' }
      : mockBranches.find(b => b.id === selectedBranch) || { name: 'Semua Cabang', code: 'ALL' };
    
    const poNumber = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // Create purchase order HTML
    const poContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pesanan Pembelian - ${poNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #f97316; padding-bottom: 20px; }
            .header h1 { color: #f97316; margin: 0; font-size: 28px; }
            .header h2 { color: #666; margin: 5px 0; font-size: 18px; font-weight: normal; }
            .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .info-box { flex: 1; }
            .info-box h3 { color: #f97316; margin: 0 0 10px 0; font-size: 14px; }
            .info-box p { margin: 5px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #f97316; color: white; font-weight: bold; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; background-color: #fff8f0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
            .signature { display: flex; justify-content: space-between; margin-top: 60px; }
            .signature-box { text-align: center; width: 200px; }
            .signature-line { border-top: 1px solid #000; margin-top: 60px; padding-top: 5px; }
            .notes { margin-top: 20px; padding: 15px; background-color: #fff8f0; border-left: 4px solid #f97316; }
            .notes h4 { margin: 0 0 10px 0; color: #f97316; }
            .urgent { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>FARMAX APOTEK</h1>
            <h2>PESANAN PEMBELIAN (PURCHASE ORDER)</h2>
            <p style="margin: 10px 0 0 0; font-size: 14px;">No: <strong>${poNumber}</strong></p>
          </div>
          
          <div class="info-section">
            <div class="info-box">
              <h3>INFORMASI CABANG:</h3>
              <p><strong>${branchInfo.name}</strong></p>
              <p>Kode: ${branchInfo.code}</p>
              <p>Tanggal: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div class="info-box" style="text-align: right;">
              <h3>STATUS:</h3>
              <p class="urgent">⚠️ URGENT - STOK MINIMUM</p>
              <p>Total Item: ${filteredProducts.length} produk</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 5%">No</th>
                <th style="width: 15%">Kode SKU</th>
                <th style="width: 30%">Nama Produk</th>
                <th style="width: 12%" class="text-center">Stok Saat Ini</th>
                <th style="width: 12%" class="text-center">Stok Minimum</th>
                <th style="width: 12%" class="text-center">Defisit</th>
                <th style="width: 14%" class="text-center">Qty Order</th>
              </tr>
            </thead>
            <tbody>
              ${filteredProducts.map((item: any, index: number) => {
                const deficit = item.minStock - item.currentStock;
                const orderQty = Math.max(deficit * 2, item.minStock); // Order 2x deficit or minimum stock
                return `
                  <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${item.sku}</td>
                    <td>
                      <strong>${item.name}</strong>
                      ${item.categoryName ? `<br><small style="color: #666;">${item.categoryName}</small>` : ''}
                    </td>
                    <td class="text-center">${item.currentStock}</td>
                    <td class="text-center">${item.minStock}</td>
                    <td class="text-center" style="color: #dc2626; font-weight: bold;">${deficit}</td>
                    <td class="text-center" style="background-color: #fef3c7; font-weight: bold;">${orderQty}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="total-row">
                <td colspan="6" class="text-right">Total Quantity Order:</td>
                <td class="text-center">${filteredProducts.reduce((sum: number, item: any) => {
                  const deficit = item.minStock - item.currentStock;
                  return sum + Math.max(deficit * 2, item.minStock);
                }, 0)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="notes">
            <h4>CATATAN PENTING:</h4>
            <ul style="margin: 5px 0; padding-left: 20px;">
              <li>Produk-produk di atas telah mencapai atau di bawah stok minimum</li>
              <li>Quantity order dihitung 2x defisit untuk buffer stok</li>
              <li>Mohon segera diproses untuk menghindari kehabisan stok</li>
              <li>Konfirmasi ketersediaan supplier sebelum order</li>
            </ul>
          </div>
          
          <div class="signature">
            <div class="signature-box">
              <div class="signature-line">
                Dibuat Oleh<br>
                <small>Bagian Inventory</small>
              </div>
            </div>
            <div class="signature-box">
              <div class="signature-line">
                Disetujui Oleh<br>
                <small>Manager</small>
              </div>
            </div>
            <div class="signature-box">
              <div class="signature-line">
                Diterima Oleh<br>
                <small>Supplier</small>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p style="text-align: center; font-size: 11px; color: #666;">
              Dokumen ini dicetak secara otomatis dari sistem Farmax Apotek<br>
              Tanggal Cetak: ${new Date().toLocaleString('id-ID')}
            </p>
          </div>
        </body>
      </html>
    `;
    
    // Create iframe and print
    const printFrame = document.createElement('iframe');
    printFrame.style.display = 'none';
    document.body.appendChild(printFrame);
    
    printFrame.contentDocument?.open();
    printFrame.contentDocument?.write(poContent);
    printFrame.contentDocument?.close();
    
    printFrame.onload = () => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 100);
    };
  };
  
  // Handle print report
  const handlePrintReport = () => {
    if (isLoading) {
      alert('Sedang memuat data, silakan tunggu...');
      return;
    }
    
    // Check if we have any data to print
    const hasData = (categoryValues && categoryValues.length > 0) || 
                    (apiData && (apiData.summary || apiData.movements || apiData.products));
    
    if (!hasData) {
      alert('Tidak ada data untuk dicetak');
      return;
    }
    
    // Custom print function with branch information
    const branchInfo = selectedBranch === 'all' 
      ? { name: 'Semua Cabang' }
      : mockBranches.find(b => b.id === selectedBranch) || { name: 'Semua Cabang' };
    
    // Use API data if available, otherwise fallback to mock
    const printCategories = apiData?.summary?.categories || categoryValues;
      
    // Create HTML content for printing
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ringkasan Nilai Stok - ${branchInfo.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f97316; color: white; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { color: #f97316; margin-bottom: 5px; }
            .total { font-weight: bold; background-color: #fff8f0; }
            .date { text-align: right; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>FARMAX APOTEK</h1>
            <h2>Laporan Nilai Stok - ${branchInfo.name}</h2>
          </div>
          <div class="date">
            <p>Tanggal: ${formatDate(new Date())}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 10%">No</th>
                <th style="width: 40%">Kategori</th>
                <th style="width: 20%">Jumlah Produk</th>
                <th style="width: 30%">Nilai Stok</th>
              </tr>
            </thead>
            <tbody>
              ${printCategories.map((category: any, index: number) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${category.name}</td>
                  <td>${category.itemCount}</td>
                  <td>${formatRupiah(category.value)}</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td colspan="3">Total</td>
                <td>${formatRupiah(printCategories.reduce((sum: number, cat: any) => sum + cat.value, 0))}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    // Create an iframe for printing
    const printFrame = document.createElement('iframe');
    printFrame.style.display = 'none';
    document.body.appendChild(printFrame);
    
    // Write the content to the iframe and print
    printFrame.contentDocument?.open();
    printFrame.contentDocument?.write(printContent);
    printFrame.contentDocument?.close();
    
    // Wait for the iframe to load before printing
    printFrame.onload = () => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      document.body.removeChild(printFrame);
    };
  };
  
  return (
    <InventoryLayout>
      <div className="flex flex-col min-h-screen">
        <Breadcrumbs
          items={[
            { title: t('sidebar.dashboard'), href: "/dashboard" },
            { title: t('inventory.title'), href: "/inventory" },
            { title: t('inventory.reports.title'), href: "/inventory/reports" },
          ]}
          className="p-6 pb-0"
        />
        
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                <FaChartBar className="mr-3 text-orange-500" /> {t('inventory.reportsTitle')}
              </h1>
              <p className="text-gray-600 mt-1">
                {t('inventory.reportsSubtitle')}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('inventory.reports.exportFormat')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                className="bg-orange-600 hover:bg-orange-700"
                onClick={handleExportData}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <FaFileExport className="mr-2 h-4 w-4" />
                )}
                {t('inventory.reports.export')}
              </Button>
              
              {isFromMock && (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <FaInfoCircle className="mr-1 h-3 w-3" />
                  {t('inventory.reports.simulationData')}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="stock-value" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
                <FaChartPie className="h-4 w-4 mr-2" />
                <span>{t('inventory.reports.stockValue')}</span>
              </TabsTrigger>
              <TabsTrigger value="stock-movement" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
                <FaChartLine className="h-4 w-4 mr-2" />
                <span>{t('inventory.reports.stockMovement')}</span>
              </TabsTrigger>
              <TabsTrigger value="low-stock" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
                <FaArrowDown className="h-4 w-4 mr-2" />
                <span>{t('inventory.reports.lowStock')}</span>
              </TabsTrigger>
              <TabsTrigger value="product-analysis" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
                <FaBoxOpen className="h-4 w-4 mr-2" />
                <span>{t('inventory.reports.productAnalysis')}</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Stock Value Tab Content */}
            <TabsContent value="stock-value" className="space-y-6 mt-6">
              {/* Stock Value View Options */}
              <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700">{t('inventory.reports.branchFilter')}:</span>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder={t('inventory.reports.selectBranch')} />
                    </SelectTrigger>
                    <SelectContent>
                      {mockBranches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.id === 'all' ? (
                            branch.name
                          ) : (
                            <div className="flex items-center">
                              <FaStore className="mr-2 h-3.5 w-3.5 text-orange-500" />
                              {branch.name} 
                              {branch.code && <span className="ml-1 text-xs text-gray-500">({branch.code})</span>}
                            </div>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2">
                <Button 
                  variant={valueView === 'category' ? 'default' : 'outline'}
                  className={valueView === 'category' ? 'bg-orange-600 hover:bg-orange-700' : 'border-orange-200 text-orange-700 hover:bg-orange-50'}
                  onClick={() => setValueView('category')}
                  size="sm"
                >
                  <FaBoxOpen className="mr-2 h-3 w-3" /> {t('inventory.reports.category')}
                </Button>
                <Button 
                  variant={valueView === 'product' ? 'default' : 'outline'}
                  className={valueView === 'product' ? 'bg-orange-600 hover:bg-orange-700' : 'border-orange-200 text-orange-700 hover:bg-orange-50'}
                  onClick={() => setValueView('product')}
                  size="sm"
                >
                  <FaCubes className="mr-2 h-3 w-3" /> {t('inventory.reports.productLabel')}
                </Button>
                <Button 
                  variant={valueView === 'group' ? 'default' : 'outline'}
                  className={valueView === 'group' ? 'bg-orange-600 hover:bg-orange-700' : 'border-orange-200 text-orange-700 hover:bg-orange-50'}
                  onClick={() => setValueView('group')}
                  size="sm"
                >
                  <FaChartPie className="mr-2 h-3 w-3" /> {t('inventory.reports.group')}
                </Button>
                </div>
              </div>
              
              {/* Loading State */}
              {isLoading && (
                <div className="flex justify-center items-center p-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                  <span className="ml-3 text-gray-600">{t('inventory.loadingReports')}</span>
                </div>
              )}
              
              {/* Category View */}
              {!isLoading && valueView === 'category' && (
                <div className="grid grid-cols-1 gap-6">
                  <StockValueSummaryCard
                    totalValue={apiData?.summary?.totalValue || totalStockValue}
                    previousTotalValue={apiData?.summary?.previousTotalValue || previousTotalValue}
                    categoryValues={apiData?.summary?.categories || categoryValues}
                    onPrint={handlePrintReport}
                    onExport={handleExportData}
                  />
                  
                  <Card className="border-orange-200 mt-6">
                    <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>{t('inventory.reports.highestStockValue')} {selectedBranch !== 'all' && `- ${mockBranches.find(b => b.id === selectedBranch)?.name}`}</CardTitle>
                          <CardDescription>
                            {t('inventory.reports.highestStockValueDesc')}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-orange-50">
                              <TableHead>{t('inventory.reports.productLabel')}</TableHead>
                              <TableHead>{t('inventory.reports.category')}</TableHead>
                              <TableHead className="text-center">{t('inventory.reports.stock')}</TableHead>
                              <TableHead className="text-right">{t('inventory.reports.buyPrice')}</TableHead>
                              <TableHead className="text-right">{t('inventory.reports.totalValue')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {productValues.slice(0, 10).map((product) => (
                              <TableRow key={product.id} className="hover:bg-orange-50">
                                <TableCell>
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-gray-500">{product.sku}</div>
                                </TableCell>
                                <TableCell>{product.categoryName}</TableCell>
                                <TableCell className="text-center">{product.currentStock}</TableCell>
                                <TableCell className="text-right">{formatRupiah(product.price)}</TableCell>
                                <TableCell className="text-right font-medium">{formatRupiah(product.value)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                          <TableFooter className="bg-orange-50">
                            <TableRow>
                              <TableCell colSpan={4} className="text-right font-bold">
                                {t('inventory.reports.totalValue')} ({productValues.length} {t('inventory.reports.productsCount')})
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {formatRupiah(totalStockValue)}
                              </TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Product View */}
              {!isLoading && valueView === 'product' && (
                <div className="space-y-6">
                  <Card className="border-orange-200 shadow-md">
                    <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>{t('inventory.reports.stockValuePerProduct')} {selectedBranch !== 'all' && `- ${mockBranches.find(b => b.id === selectedBranch)?.name}`}</CardTitle>
                          <CardDescription>
                            {t('inventory.reports.stockValuePerProductDesc')}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Input placeholder={t('inventory.reports.searchProduct')} className="pl-9 w-[250px]" />
                            <FaSearch className="absolute left-3 top-3 text-gray-400" />
                          </div>
                          <Button 
                            variant="outline" 
                            className="border-orange-200 text-orange-600 hover:bg-orange-50"
                            onClick={() => exportProductsToExcel(
                              productValues.map(p => ({
                                id: p.id,
                                code: p.sku,
                                name: p.name,
                                category: p.categoryName,
                                stockQty: p.currentStock,
                                buyPrice: p.price,
                                stockValue: p.value,
                                unit: 'Pcs' // Menggunakan default unit
                              })), 
                              `produk-nilai-stok-${new Date().toISOString().split('T')[0]}.xlsx`
                            )}
                          >
                            <FaFileExcel className="mr-2 h-4 w-4" /> {t('inventory.reports.exportExcel')}
                          </Button>
                          <Button 
                            variant="outline" 
                            className="border-orange-200 text-orange-600 hover:bg-orange-50"
                            onClick={() => window.print()}
                          >
                            <FaPrint className="mr-2 h-4 w-4" /> {t('inventory.reports.print')}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="border-t">
                        <div className="p-4 bg-orange-50 flex items-center justify-between">
                          <div className="flex items-center">
                            <Badge className="bg-orange-100 text-orange-800 mr-2">{t('inventory.reports.total')}: {productValues.length} {t('inventory.reports.productsCount')}</Badge>
                            <span className="text-sm text-gray-600">
                              {t('inventory.reports.totalValue')}: <span className="font-bold">{formatRupiah(totalStockValue)}</span>
                            </span>
                          </div>
                          <Select defaultValue="value-desc">
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder={t('inventory.reports.sortBy')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="value-desc">{t('inventory.reports.valueHighest')}</SelectItem>
                              <SelectItem value="value-asc">{t('inventory.reports.valueLowest')}</SelectItem>
                              <SelectItem value="name-asc">{t('inventory.reports.nameAZ')}</SelectItem>
                              <SelectItem value="name-desc">{t('inventory.reports.nameZA')}</SelectItem>
                              <SelectItem value="stock-desc">{t('inventory.reports.stockHighest')}</SelectItem>
                              <SelectItem value="stock-asc">{t('inventory.reports.stockLowest')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="max-h-[600px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 z-10">
                            <TableRow className="bg-white">
                              <TableHead>{t('inventory.reports.productLabel')}</TableHead>
                              <TableHead>{t('inventory.reports.category')}</TableHead>
                              <TableHead className="text-center">{t('inventory.reports.stock')}</TableHead>
                              <TableHead className="text-right">{t('inventory.reports.buyPrice')}</TableHead>
                              <TableHead className="text-right">{t('inventory.reports.totalValue')}</TableHead>
                              <TableHead className="text-center">{t('inventory.reports.expiry')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {productValues.slice(0, 30).map((product) => (
                              <TableRow key={product.id} className="hover:bg-orange-50">
                                <TableCell>
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-gray-500">{product.sku}</div>
                                </TableCell>
                                <TableCell>{product.categoryName}</TableCell>
                                <TableCell className="text-center">{product.currentStock}</TableCell>
                                <TableCell className="text-right">{formatRupiah(product.price)}</TableCell>
                                <TableCell className="text-right font-medium">{formatRupiah(product.value)}</TableCell>
                                <TableCell className="text-center">
                                  {product.expiryDate ? formatDate(product.expiryDate) : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      <div className="p-4 text-center border-t">
                        <Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50">
                          {t('inventory.reports.viewAllProducts')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Group View */}
              {!isLoading && valueView === 'group' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border-orange-200 md:col-span-2 shadow-md">
                    <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
                      <CardTitle>{t('inventory.reports.stockValueByGroup')} {selectedBranch !== 'all' && `- ${mockBranches.find(b => b.id === selectedBranch)?.name}`}</CardTitle>
                      <CardDescription>
                        {t('inventory.reports.stockValueByGroupDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500">{t('inventory.reports.totalStockValue')}</p>
                            <p className="text-3xl font-bold text-gray-900">
                              {formatRupiah(groupTotalValue)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          {groupValues.map((group) => (
                            <div key={group.id} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                  <div 
                                    className="w-3 h-3 rounded-full mr-2" 
                                    style={{ backgroundColor: group.color }}
                                  ></div>
                                  <p className="text-sm font-medium">{group.name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{formatRupiah(group.value)}</p>
                                  {group.trend !== 'stable' && (
                                    <Badge className={group.trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                      {group.trend === 'up' ? <FaArrowUp className="mr-1 h-3 w-3" /> : <FaArrowDown className="mr-1 h-3 w-3" />}
                                      {group.trendPercentage.toFixed(1)}%
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full" 
                                  style={{ 
                                    width: `${group.percentage}%`,
                                    backgroundColor: group.color 
                                  }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>{group.itemCount} produk</span>
                                <span>{group.percentage.toFixed(1)}% dari total</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-orange-200 shadow-md">
                    <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
                      <CardTitle>{t('inventory.reports.groupDetail')}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {(apiData?.summary?.groupValues || groupValues).map((group: any) => (
                          <div key={group.id} className={`p-4 rounded-lg bg-opacity-10 border`} style={{ backgroundColor: `${group.color}20`, borderColor: `${group.color}40` }}>
                            <div className="flex items-start">
                              <div className="p-3 rounded-full mr-4" style={{ backgroundColor: `${group.color}30` }}>
                                <div className="h-6 w-6" style={{ color: group.color }}>
                                  <FaBoxOpen />
                                </div>
                              </div>
                              <div>
                                <p className="font-medium" style={{ color: group.color }}>{group.name}</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{formatRupiah(group.value)}</p>
                                <p className="text-sm text-gray-500 mt-1">{group.itemCount} produk</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              

            </TabsContent>
            
            {/* Stock Movement Tab Content */}
            <TabsContent value="stock-movement" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-orange-200 md:col-span-3">
                  <CardHeader className="border-b">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>{t('inventory.reports.stockMovement')}</CardTitle>
                        <CardDescription>
                          {t('inventory.reports.stockMovementDesc')}
                        </CardDescription>
                      </div>
                    </div>
                    
                    {/* Filter controls */}
                    <div className="flex flex-wrap gap-4 mt-4 items-center border-t border-gray-100 pt-4">
                      <div className="flex flex-col space-y-1">
                        <Label htmlFor="dateFrom" className="text-xs font-medium text-gray-700">{t('inventory.reports.dateFrom')}</Label>
                        <div className="flex items-center border rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-orange-500">
                          <span className="pl-3 text-gray-400">
                            <FaCalendarDay size={14} />
                          </span>
                          <input 
                            type="date" 
                            id="dateFrom"
                            className="py-1 px-2 outline-none text-sm flex-1" 
                            value={dateRange.from.toISOString().split('T')[0]}
                            onChange={(e) => {
                              const newFrom = new Date(e.target.value);
                              setDateRange({ ...dateRange, from: newFrom });
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-1">
                        <Label htmlFor="dateTo" className="text-xs font-medium text-gray-700">{t('inventory.reports.dateTo')}</Label>
                        <div className="flex items-center border rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-orange-500">
                          <span className="pl-3 text-gray-400">
                            <FaCalendarDay size={14} />
                          </span>
                          <input 
                            type="date" 
                            id="dateTo"
                            className="py-1 px-2 outline-none text-sm flex-1" 
                            value={dateRange.to.toISOString().split('T')[0]}
                            onChange={(e) => {
                              const newTo = new Date(e.target.value);
                              setDateRange({ ...dateRange, to: newTo });
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-1">
                        <Label htmlFor="movementType" className="text-xs font-medium text-gray-700">{t('inventory.reports.movementType')}</Label>
                        <Select value={movementType} onValueChange={setMovementType}>
                          <SelectTrigger id="movementType" className="w-[180px]">
                            <SelectValue placeholder={t('inventory.reports.movementType')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('inventory.reports.allMovements')}</SelectItem>
                            <SelectItem value="in">{t('inventory.reports.stockIn')}</SelectItem>
                            <SelectItem value="out">{t('inventory.reports.stockOut')}</SelectItem>
                            <SelectItem value="adjustment">{t('inventory.reports.adjustmentType')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex flex-col space-y-1">
                        <Label className="opacity-0 text-xs">Filter</Label>
                        <Button variant="default" size="sm" className="px-4 bg-orange-600 hover:bg-orange-700">
                          <FaFilter className="mr-2 h-3.5 w-3.5" />
                          {t('inventory.reports.applyFilter')}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead>{t('inventory.reports.date')}</TableHead>
                            <TableHead>{t('inventory.reports.reference')}</TableHead>
                            <TableHead>{t('inventory.reports.productLabel')}</TableHead>
                            <TableHead>{t('inventory.reports.type')}</TableHead>
                            <TableHead className="text-center">{t('inventory.reports.quantity')}</TableHead>
                            <TableHead>{t('inventory.reports.sourceDestination')}</TableHead>
                            <TableHead>{t('inventory.reports.notes')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8">
                                <div className="flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                                  <span className="ml-3 text-gray-600">{t('common.loading')}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            /* Use API data if available, otherwise fallback to mock */
                            (apiData?.movements || movementData)
                              .filter((movement: any) => {
                                // Filter berdasarkan tanggal
                                const movementDate = new Date(movement.date || movement.createdAt);
                                const isInDateRange = movementDate >= dateRange.from && 
                                                     movementDate <= dateRange.to;
                                
                                // Filter berdasarkan tipe
                                const movementTypeValue = movement.movementType || movement.type;
                                const isTypeMatch = movementType === 'all' || 
                                                  movementTypeValue === movementType;
                                
                                return isInDateRange && isTypeMatch;
                              })
                              .map((movement: any) => {
                                const movementTypeValue = movement.movementType || movement.type;
                                return (
                                  <TableRow key={movement.id} className="hover:bg-gray-50">
                                    <TableCell>{formatDate(new Date(movement.date || movement.createdAt))}</TableCell>
                                    <TableCell className="font-medium">{movement.referenceNumber || movement.reference}</TableCell>
                                    <TableCell>{movement.productName}</TableCell>
                                    <TableCell>
                                      {movementTypeValue === "in" && (
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                          <FaArrowUp className="mr-1 h-3 w-3" /> {t('inventory.reports.stockIn')}
                                        </Badge>
                                      )}
                                      {movementTypeValue === "out" && (
                                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                          <FaArrowDown className="mr-1 h-3 w-3" /> {t('inventory.reports.stockOut')}
                                        </Badge>
                                      )}
                                      {movementTypeValue === "adjustment" && (
                                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                                          {t('inventory.reports.adjustmentType')}
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">{Math.abs(movement.quantity)}</TableCell>
                                    <TableCell>{movement.locationName || movement.fromTo}</TableCell>
                                    <TableCell>{movement.notes || "-"}</TableCell>
                                  </TableRow>
                                );
                              })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="mt-4 text-center">
                      <Button 
                        variant="link" 
                        className="text-indigo-600"
                        onClick={() => setShowMovementHistory(true)}
                      >
                        {t('inventory.reports.viewFullHistory')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Low Stock Tab Content */}
            <TabsContent value="low-stock" className="space-y-6 mt-6">
              <Card className="border-orange-200">
                <CardHeader className="border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{t('inventory.reports.lowStockProducts')}</CardTitle>
                      <CardDescription>
                        {t('inventory.reports.lowStockProductsDesc')}
                      </CardDescription>
                    </div>
                    <Button 
                      className="bg-red-600 hover:bg-red-700"
                      onClick={handlePrintPurchaseOrder}
                    >
                      <FaPrint className="mr-2 h-4 w-4" /> {t('inventory.reports.printPurchaseOrder')}
                    </Button>
                  </div>
                  
                  {/* Filter controls - Low Stock */}
                  <div className="flex flex-wrap gap-4 mt-4 items-center border-t border-gray-100 pt-4">
                    <div className="flex flex-col space-y-1">
                      <Label htmlFor="lowStockDateFrom" className="text-xs font-medium text-gray-700">{t('inventory.reports.stockDate')}</Label>
                      <div className="flex items-center border rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-orange-500">
                        <span className="pl-3 text-gray-400">
                          <FaCalendarDay size={14} />
                        </span>
                        <input 
                          type="date" 
                          id="lowStockDateFrom"
                          className="py-1 px-2 outline-none text-sm flex-1" 
                          value={dateRange.from.toISOString().split('T')[0]}
                          onChange={(e) => {
                            const newDate = new Date(e.target.value);
                            setDateRange({ ...dateRange, from: newDate, to: newDate });
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-1">
                      <Label htmlFor="lowStockBranch" className="text-xs font-medium text-gray-700">{t('inventory.reports.branch')}</Label>
                      <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                        <SelectTrigger id="lowStockBranch" className="w-[200px]">
                          <SelectValue placeholder={t('inventory.reports.selectBranch')} />
                        </SelectTrigger>
                        <SelectContent>
                          {mockBranches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.id === 'all' ? (
                                branch.name
                              ) : (
                                <div className="flex items-center">
                                  <FaStore className="mr-2 h-3.5 w-3.5 text-orange-500" />
                                  {branch.name} 
                                  {branch.code && <span className="ml-1 text-xs text-gray-500">({branch.code})</span>}
                                </div>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex flex-col space-y-1">
                      <Label className="opacity-0 text-xs">Filter</Label>
                      <Button variant="default" size="sm" className="px-4 bg-orange-600 hover:bg-orange-700">
                        <FaFilter className="mr-2 h-3.5 w-3.5" />
                        {t('inventory.reports.applyFilter')}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>{t('inventory.reports.productLabel')}</TableHead>
                          <TableHead className="text-center">{t('inventory.reports.currentStock')}</TableHead>
                          <TableHead className="text-center">{t('inventory.reports.minimumStock')}</TableHead>
                          <TableHead className="text-center">{t('inventory.reports.deficit')}</TableHead>
                          <TableHead>{t('common.status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                                <span className="ml-3 text-gray-600">{t('common.loading')}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (apiData?.products || lowStockData).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                              {t('inventory.reports.noLowStockProducts')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          /* Use API data if available, otherwise fallback to mock */
                          (apiData?.products || lowStockData)
                            .filter((item: any) => selectedBranch === 'all' || item.branchId === selectedBranch || item.locationId === selectedBranch)
                            .map((item: any) => {
                              const deficit = item.minStock - item.currentStock;
                              
                              return (
                                <TableRow key={item.id} className="hover:bg-gray-50">
                                  <TableCell>
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-sm text-gray-500">{item.sku}</div>
                                  </TableCell>
                                  <TableCell className="text-center">{item.currentStock}</TableCell>
                                  <TableCell className="text-center">{item.minStock}</TableCell>
                                  <TableCell className="text-center font-medium text-red-600">{deficit}</TableCell>
                                  <TableCell>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                      <div 
                                        className="bg-red-600 h-2.5 rounded-full" 
                                        style={{ width: `${Math.round((deficit / item.minStock) * 100)}%` }}
                                      ></div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {Math.round((deficit / item.minStock) * 100)}% {t('inventory.reports.belowMinimum')}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Product Analysis Tab Content */}
            <TabsContent value="product-analysis" className="space-y-6 mt-6">
              {/* Loading State */}
              {isLoading && (
                <div className="flex justify-center items-center p-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                  <span className="ml-3 text-gray-600">{t('inventory.reports.loadingProductAnalysis')}</span>
                </div>
              )}
              
              {!isLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Selling Products */}
                  <Card className="border-orange-200">
                    <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                      <CardTitle className="flex items-center">
                        <FaArrowUp className="mr-2 h-5 w-5 text-green-600" />
                        {t('inventory.reports.topSellingProducts')}
                      </CardTitle>
                      <CardDescription>
                        {t('inventory.reports.topSellingProductsDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {(apiData?.topSellingProducts && apiData.topSellingProducts.length > 0 ? apiData.topSellingProducts : []).length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <FaInfoCircle className="mx-auto h-12 w-12 mb-3 text-gray-400" />
                            <p>{t('inventory.reports.noSalesData')}</p>
                          </div>
                        ) : (
                          (apiData?.topSellingProducts || []).map((product: any, index: number) => (
                          <div key={product.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center">
                              <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-bold mr-3">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{product.productName}</p>
                                <p className="text-sm text-gray-500">{product.sku}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">{product.totalSold} {t('inventory.reports.sold')}</p>
                              <p className="text-sm text-gray-600">{formatRupiah(product.revenue)}</p>
                              <div className="flex items-center mt-1">
                                {product.trend === 'up' && <FaArrowUp className="h-3 w-3 text-green-500 mr-1" />}
                                {product.trend === 'down' && <FaArrowDown className="h-3 w-3 text-red-500 mr-1" />}
                                <span className="text-xs text-gray-500">Margin: {product.profitMargin}%</span>
                              </div>
                            </div>
                          </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Slow Moving Products */}
                  <Card className="border-orange-200">
                    <CardHeader className="border-b bg-gradient-to-r from-red-50 to-pink-50">
                      <CardTitle className="flex items-center">
                        <FaExclamationTriangle className="mr-2 h-5 w-5 text-red-600" />
                        {t('inventory.reports.slowMovingProducts')}
                      </CardTitle>
                      <CardDescription>
                        {t('inventory.reports.slowMovingProductsDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {(apiData?.slowMovingProducts && apiData.slowMovingProducts.length > 0 ? apiData.slowMovingProducts : []).length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <FaInfoCircle className="mx-auto h-12 w-12 mb-3 text-gray-400" />
                            <p>{t('inventory.reports.noSlowMoving')}</p>
                            <p className="text-sm mt-2">{t('inventory.reports.allProductsMoving')}</p>
                          </div>
                        ) : (
                          (apiData?.slowMovingProducts || []).map((product: any) => (
                          <div key={product.id} className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-gray-900">{product.productName}</p>
                                <p className="text-sm text-gray-500">{product.sku}</p>
                              </div>
                              <Badge className="bg-red-100 text-red-800">
                                {product.daysSinceLastSale} {t('inventory.reports.days')}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">{t('inventory.reports.remainingStock')}</p>
                                <p className="font-medium">{product.currentStock} {t('inventory.reports.unitLabel')}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">{t('inventory.reports.stockValue')}</p>
                                <p className="font-medium">{formatRupiah(product.value)}</p>
                              </div>
                            </div>
                            <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                              <p className="text-xs text-yellow-800">
                                <FaInfoCircle className="inline mr-1" />
                                {product.recommendation}
                              </p>
                            </div>
                          </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Product Performance Summary */}
                  <Card className="border-orange-200 lg:col-span-2">
                    <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
                      <CardTitle className="flex items-center">
                        <FaChartBar className="mr-2 h-5 w-5 text-orange-600" />
                        {t('inventory.reports.performanceSummary')}
                      </CardTitle>
                      <CardDescription>
                        {t('inventory.reports.performanceSummaryDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <FaCubes className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                          <p className="text-2xl font-bold text-blue-600">156</p>
                          <p className="text-sm text-gray-600">{t('inventory.reports.totalActiveProducts')}</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <FaArrowUp className="h-8 w-8 mx-auto text-green-600 mb-2" />
                          <p className="text-2xl font-bold text-green-600">89%</p>
                          <p className="text-sm text-gray-600">{t('inventory.reports.activeMovingProducts')}</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <FaExclamationTriangle className="h-8 w-8 mx-auto text-red-600 mb-2" />
                          <p className="text-2xl font-bold text-red-600">17</p>
                          <p className="text-sm text-gray-600">{t('inventory.reports.slowMovingLabel')}</p>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <FaChartLine className="h-8 w-8 mx-auto text-orange-600 mb-2" />
                          <p className="text-2xl font-bold text-orange-600">23%</p>
                          <p className="text-sm text-gray-600">{t('inventory.reports.averageMargin')}</p>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 mb-4">{t('inventory.reports.categoryAnalysis')}</h4>
                        <div className="space-y-3">
                          {[
                            { name: 'Obat Keras', products: 45, revenue: 1250000000, margin: 28, trend: 'up' },
                            { name: 'Obat Bebas', products: 32, revenue: 850000000, margin: 25, trend: 'up' },
                            { name: 'Vitamin & Suplemen', products: 28, revenue: 425000000, margin: 22, trend: 'stable' },
                            { name: 'Obat Luar', products: 18, revenue: 322500000, margin: 20, trend: 'down' }
                          ].map((category) => (
                            <div key={category.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center">
                                <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                                <div>
                                  <p className="font-medium">{category.name}</p>
                                  <p className="text-sm text-gray-500">{category.products} {t('inventory.reports.productsCount')}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{formatRupiah(category.revenue)}</p>
                                <div className="flex items-center">
                                  {category.trend === 'up' && <FaArrowUp className="h-3 w-3 text-green-500 mr-1" />}
                                  {category.trend === 'down' && <FaArrowDown className="h-3 w-3 text-red-500 mr-1" />}
                                  <span className="text-sm text-gray-600">Margin: {category.margin}%</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Stock Movement History Modal */}
      <StockMovementHistoryModal
        open={showMovementHistory}
        onClose={() => setShowMovementHistory(false)}
        movements={apiData?.movements || movementData}
      />
    </InventoryLayout>
  );
};

export default ReportsPage;
