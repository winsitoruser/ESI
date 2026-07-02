import React, { useState, useEffect, useCallback } from "react";
import { NextPage } from "next";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from '@/lib/i18n';
import Link from "next/link";
import { useRouter } from "next/router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { mockProducts, Product } from "@/modules/inventory/types";
import { Supplier } from "@/types/inventory";
import { formatRupiah } from "@/lib/utils";
import { addMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VerticalSidebar from "@/components/layouts/vertical-sidebar";
import { 
  FaWarehouse, 
  FaPlus, 
  FaSearch, 
  FaCalendarAlt, 
  FaUserTie, 
  FaEdit, 
  FaTrash, 
  FaBarcode,
  FaBoxOpen,
  FaSave,
  FaFile,
  FaTimes,
  FaTruck,
  FaMoneyBillWave,
  FaShoppingCart,
  FaExchangeAlt,
  FaInfoCircle,
  FaDatabase,
  FaChartLine,
  FaCheck,
  FaSync,
  FaHome,
  FaChartBar,
  FaClipboardList,
  FaMinus,
  FaUndo,
  FaFileUpload,
  FaFileAlt,
  FaFileImage,
  FaFilePdf,
  FaFileExcel,
  FaFileWord,
  FaPaperclip
} from "react-icons/fa";

// Import service integrasi - using the exported singleton instance
// Service will be initialized dynamically in the component
import { nanoid } from "nanoid";
import { GoodsReceipt, ReceiptItem, PurchaseOrder } from "@/modules/inventory/types/receipt-types";
import DocumentUploader, { UploadedDocument } from "@/components/inventory/document-uploader";

interface ReceivePageProps {}

interface ProductWithSKU {
  id: string;
  sku?: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
  description?: string;
  category?: string;
  expiryDate?: string;
  supplier?: string;
  purchasePrice?: number;
}

// Define integration status type
type IntegrationStatusItem = {
  module: string;
  status: "pending" | "success" | "error";
  message: string;
};

const ReceivePage: NextPage<ReceivePageProps> = () => {
  // Service - using the singleton instance with fallback
  const [receiptService, setReceiptService] = useState<any>(null);
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Initialize service on component mount
  useEffect(() => {
    const initializeService = async () => {
      try {
        if (typeof window !== 'undefined') {
          const module = await import("@/modules/inventory/services/integrated-receipt-service");
          setReceiptService(module.integratedReceiptService);
          console.log('Receipt service loaded successfully');
        }
      } catch (error) {
        console.error('Error loading integrated receipt service:', error);
        // Set a fallback service with the required methods
        setReceiptService({
          getSuppliers: async () => ({ suppliers: [], pagination: {}, isFallback: true }),
          getPendingPurchaseOrders: async () => {
            return [
              {
                id: "po1",
                poNumber: "PO-2025-0001",
                orderDate: "2025-04-01",
                status: "approved",
                supplierId: "supp1",
                supplierName: "PT Farmasi Berkah",
                items: [
                  {
                    id: "poitem1",
                    productId: "prod1",
                    productName: "Paracetamol 500mg",
                    productSku: "PCM-500",
                    orderedQuantity: 100,
                    receivedQuantity: 0,
                    unit: "box",
                    unitPrice: 15000,
                    taxPercentage: 11,
                    discountPercentage: 0,
                    subtotal: 1500000,
                    total: 1665000
                  }
                ],
                subtotal: 1500000,
                tax: 165000,
                discount: 0,
                total: 1665000
              }
            ];
          },
          processCompleteGoodsReceipt: async (receipt: any) => {
            console.log('Procesando recibo con fallback mock:', receipt);
            toast({
              title: "Informasi",
              description: "Simulasi: Data pemrosesan penerimaan barang disimpan secara lokal.",
              duration: 5000
            });
            
            return {
              success: true,
              receiptId: `GR-MOCK-${Date.now()}`,
              invoiceId: `INV-MOCK-${Date.now()}`,
              messages: [
                '✅ Penerimaan barang berhasil disimpan (simulasi)',
                '✅ Stok produk berhasil diperbarui (simulasi)',
                '✅ Faktur pembelian berhasil dibuat (simulasi)'
              ]
            };
          },
          validateReceiptForm: () => {
            const errors: string[] = [];
            
            // Basic form validation
            if (!receiptForm.receiptNumber?.trim()) {
              errors.push("Nomor penerimaan harus diisi");
            } else if (receiptForm.receiptNumber.length < 3) {
              errors.push("Nomor penerimaan minimal 3 karakter");
            }
            
            if (!receiptForm.supplierId) {
              errors.push("Supplier harus dipilih");
            }
            
            if (!receiptForm.receivedDate) {
              errors.push("Tanggal penerimaan harus diisi");
            } else {
              const receivedDate = new Date(receiptForm.receivedDate);
              const today = new Date();
              const maxFutureDate = new Date();
              maxFutureDate.setDate(today.getDate() + 7);
              
              if (receivedDate > maxFutureDate) {
                errors.push("Tanggal penerimaan tidak boleh lebih dari 7 hari ke depan");
              }
              
              const minPastDate = new Date();
              minPastDate.setFullYear(today.getFullYear() - 1);
              
              if (receivedDate < minPastDate) {
                errors.push("Tanggal penerimaan tidak boleh lebih dari 1 tahun yang lalu");
              }
            }
            
            if (receiptItems.length === 0) {
              errors.push("Minimal harus ada satu item yang diterima");
            }
            
            // Enhanced item validation
            receiptItems.forEach((item, index) => {
              const itemPrefix = `Item ${index + 1}`;
              
              if (!item.productId) {
                errors.push(`${itemPrefix}: Produk harus dipilih`);
              }
              
              if (!item.batchNumber?.trim()) {
                errors.push(`${itemPrefix}: Nomor batch harus diisi`);
              } else if (item.batchNumber.length < 2) {
                errors.push(`${itemPrefix}: Nomor batch minimal 2 karakter`);
              }
              
              if (!item.expiryDate) {
                errors.push(`${itemPrefix}: Tanggal kadaluarsa harus diisi`);
              } else {
                const expiryDate = new Date(item.expiryDate);
                const today = new Date();
                const minExpiryDate = new Date();
                minExpiryDate.setMonth(today.getMonth() + 1); // Minimal 1 bulan dari sekarang
                
                if (expiryDate <= today) {
                  errors.push(`${itemPrefix}: Tanggal kadaluarsa sudah lewat`);
                } else if (expiryDate < minExpiryDate) {
                  errors.push(`${itemPrefix}: Tanggal kadaluarsa terlalu dekat (minimal 1 bulan dari sekarang)`);
                }
              }
              
              if (item.quantity <= 0) {
                errors.push(`${itemPrefix}: Jumlah harus lebih dari 0`);
              } else if (item.quantity > 10000) {
                errors.push(`${itemPrefix}: Jumlah terlalu besar (maksimal 10,000)`);
              }
              
              if (item.unitPrice <= 0) {
                errors.push(`${itemPrefix}: Harga satuan harus lebih dari 0`);
              } else if (item.unitPrice > 10000000) {
                errors.push(`${itemPrefix}: Harga satuan terlalu besar (maksimal Rp 10,000,000)`);
              }
              
              // Check for duplicate batch numbers
              const duplicateBatch = receiptItems.find((otherItem, otherIndex) => 
                otherIndex !== index && 
                otherItem.productId === item.productId && 
                otherItem.batchNumber === item.batchNumber
              );
              
              if (duplicateBatch) {
                errors.push(`${itemPrefix}: Nomor batch sudah digunakan untuk produk yang sama`);
              }
            });
            
            // Check total amount limits
            const totalAmount = receiptItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            if (totalAmount > 1000000000) { // 1 miliar
              errors.push("Total nilai penerimaan terlalu besar (maksimal Rp 1,000,000,000)");
            }
            
            return errors;
          },
          validatePurchaseOrder: (order: any) => {
            const errors: string[] = [];
            
            if (!order) {
              errors.push("Purchase order tidak ditemukan");
              return errors;
            }
            
            if (!order.items || order.items.length === 0) {
              errors.push("Purchase order tidak memiliki item");
            }
            
            if (order.status !== 'approved') {
              errors.push(`Purchase order belum disetujui (status: ${order.status})`);
            }
            
            // Check if PO is not expired
            if (order.expectedDeliveryDate) {
              const deliveryDate = new Date(order.expectedDeliveryDate);
              const today = new Date();
              const maxOverdueDate = new Date();
              maxOverdueDate.setDate(today.getDate() - 30); // 30 hari overdue
              
              if (deliveryDate < maxOverdueDate) {
                errors.push("Purchase order sudah terlalu lama overdue (lebih dari 30 hari)");
              }
            }
            
            // Validate supplier consistency
            if (receiptForm.supplierId && order.supplierId !== receiptForm.supplierId) {
              errors.push("Supplier pada PO tidak sesuai dengan supplier yang dipilih");
            }
            
            // Check if items are valid
            if (order.items) {
              order.items.forEach((item: any, index: number) => {
                if (!item.productId) {
                  errors.push(`Item PO ${index + 1}: Product ID tidak valid`);
                }
                if (!item.quantity || item.quantity <= 0) {
                  errors.push(`Item PO ${index + 1}: Quantity tidak valid`);
                }
                if (!item.unitPrice || item.unitPrice <= 0) {
                  errors.push(`Item PO ${index + 1}: Unit price tidak valid`);
                }
              });
            }
            
            return errors;
          },
          searchProducts: async () => ({ products: [], pagination: {}, isFallback: true }),
          getPurchaseOrderById: async () => null,
        });
      }
    };

    initializeService();
  }, []);
  

  // State section 
  const [pendingOrders, setPendingOrders] = useState<PurchaseOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<ProductWithSKU[]>([]);
  const [searchResult, setSearchResult] = useState<ProductWithSKU | null>(null);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [receiptNote, setReceiptNote] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [warehouseId, setWarehouseId] = useState("warehouse-001");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentView, setCurrentView] = useState<"main" | "integration-status">("main");
  
  // Supplier states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [supplierLoadError, setSupplierLoadError] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  
  // State untuk dokumen yang di-upload
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  
  // State untuk tab dan form return
  const [currentTab, setCurrentTab] = useState<"receive" | "return">("receive");
  const [returnForm, setReturnForm] = useState({
    id: "",
    returnNumber: "",
    returnDate: new Date().toISOString().split('T')[0],
    reason: "",
    notes: ""
  });
  
  // Integration status tracking
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatusItem[]>([
    { module: "inventory", status: "pending" as const, message: "⏳ Menunggu proses..." },
    { module: "finance", status: "pending" as const, message: "⏳ Menunggu proses..." },
    { module: "purchaseorder", status: "pending" as const, message: "⏳ Menunggu proses..." },
  ]);
  
  // Formulir penerimaan
  const [receiptForm, setReceiptForm] = useState({
    id: "",
    poNumber: "",
    invoiceNumber: "",
    receiptNumber: "",
    receiptDate: new Date().toISOString().split('T')[0],
    receivedDate: new Date().toISOString().split('T')[0],
    dueDate: (() => {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date.toISOString().split('T')[0];
    })(),
    supplierId: "",
    paymentStatus: "unpaid" as const,
    financeStatus: "paid" as const,
    paymentMethod: "transfer" as const,
    taxIncluded: false,
    taxRate: 11,
    subtotal: 0,
    taxAmount: 0,
    discountAmount: 0,
    discountPercentage: 0,
    total: 0,
    notes: ""
  });
  
  // Calculations
  useEffect(() => {
    let subtotal = receiptItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    let taxAmount = 0;
    
    if (receiptForm.taxIncluded) {
      taxAmount = subtotal * (receiptForm.taxRate / 100);
    }
    
    const total = subtotal + taxAmount - receiptForm.discountAmount;
    
    setReceiptForm(prev => ({
      ...prev,
      subtotal,
      taxAmount,
      total
    }));
  }, [receiptItems, receiptForm.taxIncluded, receiptForm.taxRate, receiptForm.discountAmount]);
  
  // Load suppliers from API
  const loadSuppliers = async () => {
    // Don't proceed if receiptService is not available
    if (!receiptService) {
      console.warn('Receipt service not available');
      setSupplierLoadError("Layanan supplier belum siap. Silakan coba lagi.");
      setIsLoadingSuppliers(false);
      return;
    }

    try {
      setIsLoadingSuppliers(true);
      setSupplierLoadError(null);
      
      // Use integrated receipt service to get suppliers
      const result = await receiptService.getSuppliers({
        status: 'active', // Only get active suppliers
        limit: 100 // Limit to 100 suppliers
      });
      
      console.log('Suppliers loaded:', result.suppliers);
      
      if (!result.suppliers || result.suppliers.length === 0) {
        setSupplierLoadError("Tidak ada supplier yang ditemukan.");
      }
      
      setSuppliers(result.suppliers || []);
      
      // Show fallback warning if using mock data
      if (result.isFallback) {
        toast({
          title: "Informasi",
          description: "Menggunakan data supplier lokal karena server tidak tersedia.",
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
      setSupplierLoadError(
        error instanceof Error 
          ? `Gagal memuat supplier: ${error.message}` 
          : "Terjadi kesalahan saat memuat daftar supplier."
      );
      
      toast({
        title: "Error",
        description: "Tidak dapat memuat daftar supplier.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSuppliers(false);
    }
  };
  
  // Load pending orders on mount
  const loadPendingOrders = async () => {
    // Don't proceed if receiptService is not available
    if (!receiptService) {
      console.warn('Receipt service not available');
      setPoLoadError("Layanan penerimaan belum siap. Silakan coba lagi.");
      setIsLoadingPOs(false);
      return;
    }

    try {
      setIsLoadingPOs(true);
      setPoLoadError(null);
      
      const orders = await receiptService.getPendingPurchaseOrders();
      console.log('Pending orders loaded:', orders);
      
      if (!orders || orders.length === 0) {
        setPoLoadError("Tidak ada pesanan pembelian yang tertunda ditemukan.");
      }
      
      setPendingOrders(orders || []);
    } catch (error) {
      console.error('Error loading pending orders:', error);
      setPoLoadError(
        error instanceof Error 
          ? `Gagal memuat pesanan: ${error.message}` 
          : "Terjadi kesalahan saat memuat daftar pesanan tertunda."
      );
      
      toast({
        title: "Error",
        description: "Tidak dapat memuat daftar pesanan tertunda.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPOs(false);
    }
  };
  
  // Add loading state for POs
  const [isLoadingPOs, setIsLoadingPOs] = useState(false);
  const [poLoadError, setPoLoadError] = useState<string | null>(null);
  const [poValidationErrors, setPoValidationErrors] = useState<{[key: string]: string}>({});
  
  // Search products from API
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [productSearchError, setProductSearchError] = useState<string | null>(null);
  
  const searchProducts = useCallback(async () => {
    if (!receiptService || !searchQuery || searchQuery.length < 2) {
      setFilteredProducts([]);
      setProductSearchError(null);
      return;
    }

    try {
      setIsSearchingProducts(true);
      setProductSearchError(null);
      
      // Use integrated receipt service to search products
      const result = await receiptService.searchProducts({
        search: searchQuery,
        limit: 10,
        page: 1
      });
      
      setFilteredProducts(result.products || []);
      
      // Show fallback warning if using mock data
      if (result.isFallback) {
        console.warn('Using fallback mock product data');
      }
      
      if (result.products.length === 0) {
        setProductSearchError("Tidak ada produk yang ditemukan.");
      }
    } catch (error) {
      console.error('Error searching products:', error);
      setProductSearchError(
        error instanceof Error 
          ? `Gagal mencari produk: ${error.message}` 
          : "Terjadi kesalahan saat mencari produk."
      );
    } finally {
      setIsSearchingProducts(false);
    }
  }, [searchQuery, receiptService]);

  useEffect(() => {
    searchProducts();
  }, [searchProducts]);

  // Product search effect
  useEffect(() => {
    if (searchQuery.length >= 3) {
      // Use searchProducts function to search products from API
      searchProducts();
    } else {
      setFilteredProducts([]);
    }
  }, [searchQuery]);
  
  // Add validatePurchaseOrder function
  const validatePurchaseOrder = (order: any) => {
    const errors: string[] = [];
    
    if (!order) {
      errors.push("Purchase order tidak ditemukan");
      return errors;
    }
    
    if (!order.items || order.items.length === 0) {
      errors.push("Purchase order tidak memiliki item");
    }
    
    if (order.status !== 'approved') {
      errors.push(`Purchase order belum disetujui (status: ${order.status})`);
    }
    
    // Check if PO is not expired
    if (order.expectedDeliveryDate) {
      const deliveryDate = new Date(order.expectedDeliveryDate);
      const today = new Date();
      const maxOverdueDate = new Date();
      maxOverdueDate.setDate(today.getDate() - 30); // 30 hari overdue
      
      if (deliveryDate < maxOverdueDate) {
        errors.push("Purchase order sudah terlalu lama overdue (lebih dari 30 hari)");
      }
    }
    
    // Validate supplier consistency
    if (receiptForm.supplierId && order.supplierId !== receiptForm.supplierId) {
      errors.push("Supplier pada PO tidak sesuai dengan supplier yang dipilih");
    }
    
    // Check if items are valid
    if (order.items) {
      order.items.forEach((item: any, index: number) => {
        if (!item.productId) {
          errors.push(`Item PO ${index + 1}: Product ID tidak valid`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item PO ${index + 1}: Quantity tidak valid`);
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          errors.push(`Item PO ${index + 1}: Unit price tidak valid`);
        }
      });
    }
    
    return errors;
  };
  
  // Handle selecting an order
  const handleSelectOrder = async (order: PurchaseOrder) => {
    // Reset any previous validation errors
    setPoValidationErrors({});
    
    // Enhanced validation before processing
    const validationErrors = validatePurchaseOrder(order);
    if (validationErrors.length > 0) {
      toast({
        title: "Validasi Gagal",
        description: `${validationErrors.length} error ditemukan: ${validationErrors.slice(0, 3).join(", ")}${validationErrors.length > 3 ? '...' : ''}`,
        variant: "destructive",
      });
      
      // Log all validation errors for debugging
      console.error('Validation errors:', validationErrors);
      return;
    }
    
    console.log("Selected PO:", order.poNumber);
    console.log("PO items count:", order.items.length);
    
    // Jika order belum memiliki items lengkap, coba ambil data PO lengkap
    if (!order.items || order.items.length === 0) {
      try {
        console.log("Fetching complete PO data for:", order.id);
        const completePO = await receiptService.getPurchaseOrderById(order.id);
        
        if (completePO && completePO.items && completePO.items.length > 0) {
          console.log("Successfully fetched complete PO with items:", completePO.items.length);
          order = completePO;
        } else {
          console.warn("Failed to fetch complete PO or PO has no items");
          toast({
            title: "Data Tidak Lengkap",
            description: "Tidak dapat mengambil data lengkap pesanan pembelian.",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        console.error("Error fetching complete PO:", error);
        toast({
          title: "Error",
          description: "Gagal mengambil data lengkap pesanan pembelian.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setSelectedOrder(order);
    
    // Set supplier info
    setSupplierName(order.supplierName);
    setReceiptForm(prev => ({
      ...prev,
      poNumber: order.poNumber,
      supplierId: order.supplierId,
      // Populate other fields as needed
    }));
    
    // Convert order items to receipt items
    const items: ReceiptItem[] = order.items.map(item => {
      console.log("Processing PO item:", item);
      return {
        id: nanoid(),
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku || '',
        batchNumber: `B-${new Date().getTime().toString().slice(-6)}`,
        expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString().split('T')[0],
        quantity: item.quantity,
        receivedQuantity: item.quantity,
        unit: item.unit || 'pcs',
        unitPrice: item.unitPrice,
        taxPercentage: 11,
        discountPercentage: 0,
        taxAmount: item.unitPrice * item.quantity * 0.11,
        discountAmount: 0,
        subtotal: item.unitPrice * item.quantity,
        total: item.unitPrice * item.quantity * 1.11,
        notes: '',
        poItemId: item.id
      };
    });
    
    console.log("Generated receipt items:", items);
    
    setReceiptItems(items);
    
    toast({
      title: "Pesanan Dipilih",
      description: `Pesanan ${order.poNumber} berhasil dimuat dengan ${items.length} item.`,
    });
  };
  
  // Handle updating a receipt item
  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...receiptItems];
    // Update specific field
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    // Jika field yang diupdate mempengaruhi perhitungan, recalculate subtotal, tax, total
    if (field === 'quantity' || field === 'unitPrice' || field === 'taxPercentage' || field === 'discountPercentage') {
      const item = updatedItems[index];
      const subtotal = item.quantity * item.unitPrice;
      const taxAmount = subtotal * (item.taxPercentage / 100);
      const discountAmount = subtotal * (item.discountPercentage / 100);
      
      updatedItems[index] = {
        ...item,
        subtotal,
        taxAmount,
        discountAmount,
        total: subtotal + taxAmount - discountAmount
      };
    }
    
    setReceiptItems(updatedItems);
  };
  
  // Handle adding a product from search
  const handleAddProduct = (product: ProductWithSKU) => {
    // Generate a unique ID for the receipt item
    const newItemId = nanoid();
    
    const newItem: ReceiptItem = {
      id: newItemId,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      batchNumber: `B-${new Date().getTime().toString().slice(-6)}`,
      expiryDate: addMonths(new Date(), 12).toISOString().split('T')[0],
      quantity: 1,
      receivedQuantity: 1,
      unit: product.unit || 'pcs',
      unitPrice: product.purchasePrice || 0,
      discountPercentage: 0,
      taxPercentage: 11,
      taxAmount: (product.purchasePrice || 0) * 0.11,
      discountAmount: 0,
      subtotal: product.purchasePrice || 0,
      total: (product.purchasePrice || 0) * 1.11,
      notes: '',
      poItemId: null
    };
    
    setReceiptItems(prev => [...prev, newItem]);
    setSearchQuery('');
    setSearchResult(null);
    setFilteredProducts([]);
  };
  
  // Handle removing an item
  const handleRemoveItem = (index: number) => {
    setReceiptItems(items => items.filter((_, i) => i !== index));
  };
  
  // Handler untuk menambah dan upload dokumen
  const handleAddDocuments = async (newDocuments: File[]) => {
    // Tampilkan loading state
    toast({
      title: "Loading",
      description: "Mengunggah dokumen..."
    });
    
    try {
      // Tambahkan ke state sementara untuk preview dengan URL.createObjectURL
      const processedDocs = newDocuments.map(file => ({
        id: nanoid(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        file,
        isUploading: true
      }));
      
      setUploadedDocuments([...uploadedDocuments, ...processedDocs]);
      
      // Upload ke server via API
      const formData = new FormData();
      
      // Tambahkan file ke form data
      newDocuments.forEach(file => {
        formData.append('file', file);
      });
      
      // Tambahkan metadata
      if (currentTab === 'receive' && receiptForm.id) {
        formData.append('receiptId', receiptForm.id);
      } else if (currentTab === 'return' && returnForm.id) {
        formData.append('returnId', returnForm.id);
      }
      
      // Kirim ke API
      const response = await fetch('/api/inventory/documents/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Gagal mengunggah dokumen');
      }
      
      const result = await response.json();
      
      // Update state dengan data dari server
      const serverDocs = result.data.map((doc: any) => ({
        id: doc.id,
        name: doc.originalName,
        size: doc.size,
        type: doc.fileType,
        url: doc.url,
        thumbnailUrl: doc.thumbnailUrl,
        description: doc.description,
        isUploaded: true
      }));
      
      // Ganti temporary docs dengan server docs
      const updatedDocs = uploadedDocuments.filter(d => !processedDocs.some(pd => pd.id === d.id));
      setUploadedDocuments([...updatedDocs, ...serverDocs]);
      
      toast({
        title: "Sukses",
        description: "Dokumen berhasil diunggah"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengunggah dokumen',
        variant: "destructive"
      });
      console.error('Upload error:', error);
    }
  };
  
  // Handler untuk menghapus dokumen
  const handleRemoveDocument = async (id: string) => {
    try {
      const docToRemove = uploadedDocuments.find(doc => doc.id === id);
      
      // Hapus dari state lokal
      setUploadedDocuments(prev => {
        // Revoke object URL jika diperlukan
        if (docToRemove?.url && docToRemove.url.startsWith('blob:')) {
          URL.revokeObjectURL(docToRemove.url);
        }
        return prev.filter(doc => doc.id !== id);
      });
      
      // Hapus dari server jika sudah terupload (memiliki ID server)
      if (docToRemove?.isUploaded) {
        const response = await fetch(`/api/inventory/documents?id=${id}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Gagal menghapus dokumen dari server');
        }
        
        toast({
          title: "Sukses",
          description: "Dokumen berhasil dihapus"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus dokumen',
        variant: "destructive"
      });
      console.error('Delete error:', error);
    }
  };

  // Fungsi untuk memproses penerimaan barang
  const handleProcessReceipt = async () => {
    // Validasi sebelum proses
    if (!selectedOrder) {
      toast({
        title: "Validasi Gagal",
        description: "Pilih pesanan pembelian terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }
    
    // Revalidate PO before submission
    const poValidationErrors = validatePurchaseOrder(selectedOrder);
    if (poValidationErrors.length > 0) {
      toast({
        title: "Validasi Gagal",
        description: "Pesanan pembelian tidak valid. Silakan pilih pesanan lain.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if receipt items are available
    if (receiptItems.length === 0) {
      toast({
        title: "Validasi Gagal",
        description: "Tambahkan minimal satu item untuk penerimaan barang.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate receipt form data
    if (!receiptForm.invoiceNumber || !receiptForm.receivedDate) {
      toast({
        title: "Validasi Gagal",
        description: "Mohon lengkapi nomor faktur dan tanggal penerimaan.",
        variant: "destructive",
      });
      return;
    }
    
    // Enhanced validation before processing
    const validationErrors = receiptService.validateReceiptForm();
    if (validationErrors.length > 0) {
      toast({
        title: "Validasi Gagal",
        description: `${validationErrors.length} error ditemukan: ${validationErrors.slice(0, 3).join(", ")}${validationErrors.length > 3 ? '...' : ''}`,
        variant: "destructive",
      });
      
      // Log all validation errors for debugging
      console.error('Validation errors:', validationErrors);
      return;
    }
    
    // Additional business logic validation
    const totalItems = receiptItems.length;
    const totalQuantity = receiptItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = receiptItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    
    console.log('Receipt validation passed:', {
      totalItems,
      totalQuantity,
      totalValue: formatRupiah(totalValue),
      receiptNumber: receiptForm.receiptNumber
    });
    
    // Start processing
    setIsProcessing(true);
    setCurrentView("integration-status");
    
    try {
      // Reset integration status to pending
      setIntegrationStatus([
        { module: "inventory", status: "pending", message: "⏳ Memproses penerimaan barang..." },
        { module: "finance", status: "pending", message: "⏳ Menunggu proses..." },
        { module: "purchaseorder", status: "pending", message: "⏳ Menunggu proses..." },
      ]);
      
      // Calculate totals
      const subtotal = receiptItems.reduce((sum, item) => sum + item.subtotal, 0);
      const taxAmount = subtotal * (receiptForm.taxRate / 100);
      const discountAmount = receiptForm.discountAmount || 0;
      const totalAmount = subtotal + taxAmount - discountAmount;
      
      // Prepare receipt object
      const receipt: GoodsReceipt = {
        id: nanoid(), // temporary ID for new receipt
        receiptNumber: `GR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        purchaseOrderId: selectedOrder.id,
        supplierId: selectedOrder.supplierId,
        supplierName: selectedOrder.supplierName,
        invoiceNumber: receiptForm.invoiceNumber,
        date: receiptForm.receiptDate,
        dueDate: receiptForm.dueDate,
        notes: receiptNote,
        status: 'approved' as const,
        items: receiptItems.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          batchNumber: item.batchNumber || `B${new Date().getTime().toString().slice(-8)}`,
          expiryDate: item.expiryDate || addMonths(new Date(), 12).toISOString(),
          quantity: item.receivedQuantity,
          unitPrice: item.unitPrice || 0,
          subtotal: item.subtotal,
          taxPercentage: receiptForm.taxRate,
          taxAmount: (item.subtotal * receiptForm.taxRate) / 100,
          discountPercentage: 0,
          discountAmount: 0,
          total: item.total
        })),
        subtotal: subtotal,
        tax: taxAmount,
        discount: discountAmount,
        total: totalAmount,
        createdBy: "current-user", // This would come from auth context in a real implementation
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        financeStatus: 'pending' as const,
        paymentMethod: receiptForm.paymentMethod || 'transfer'
      };
      
      // Update inventory status
      setIntegrationStatus(prev => {
        return prev.map(item => 
          item.module === "inventory" 
            ? { ...item, status: "success" as const, message: "✅ Penerimaan barang berhasil diproses" }
            : item
        );
      });
      
      // Process complete goods receipt with all integrations
      const result = await receiptService.processCompleteGoodsReceipt(receipt);
      
      if (result.success) {
        // Update integration status for each module
        setTimeout(() => {
          setIntegrationStatus(prev => {
            return prev.map(item => 
              item.module === "inventory" 
                ? { ...item, status: "success" as const, message: "✅ Stok barang diperbarui" }
                : item
            );
          });
        }, 800);
        
        setTimeout(() => {
          setIntegrationStatus(prev => {
            return prev.map(item => 
              item.module === "finance" 
                ? { ...item, status: "success" as const, message: "✅ Faktur pembelian dibuat" }
                : item
            );
          });
        }, 1500);
        
        setTimeout(() => {
          setIntegrationStatus(prev => {
            return prev.map(item => 
              item.module === "purchaseorder" 
                ? { ...item, status: "success" as const, message: "✅ Status PO diperbarui" }
                : item
            );
          });
        }, 2200);
        
        // Reset form after successful submission
        setTimeout(() => {
          // Show comprehensive success message
        const successCount = result.messages.filter(msg => msg.includes('✅')).length;
        const warningCount = result.messages.filter(msg => msg.includes('⚠️')).length;
        
        toast({
          title: "Penerimaan Berhasil",
          description: `${successCount} integrasi berhasil${warningCount > 0 ? `, ${warningCount} peringatan` : ''}. Receipt ID: ${result.receiptId}`,
          duration: 8000
        });
        
        // Log detailed results for debugging
        console.log('Receipt processing completed:', {
          success: result.success,
          receiptId: result.receiptId,
          invoiceId: result.invoiceId,
          messages: result.messages,
          integrationSummary: {
            successful: successCount,
            warnings: warningCount
          }
        });
        
        // Reset form
        setReceiptItems([]);
        setSelectedOrder(null);
        setReceiptNote("");
        setReceiptForm({
          id: "",
          poNumber: "",
          invoiceNumber: "",
          receiptNumber: "",
          receiptDate: new Date().toISOString().split('T')[0],
          receivedDate: new Date().toISOString().split('T')[0],
          dueDate: (() => {
            const date = new Date();
            date.setDate(date.getDate() + 30);
            return date.toISOString().split('T')[0];
          })(),
          supplierId: "",
          paymentStatus: "unpaid" as const,
          financeStatus: "paid" as const,
          paymentMethod: "transfer" as const,
          taxIncluded: false,
          taxRate: 11,
          subtotal: 0,
          taxAmount: 0,
          discountAmount: 0,
          discountPercentage: 0,
          total: 0,
          notes: ""
        });
        
        // Load fresh pending orders
        loadPendingOrders();
        
        // Reset processing state
        setIsProcessing(false);
        setCurrentView("main");
        }, 2500);
      } else {
        // Show detailed error message
        const errorMessages = result.messages.filter((msg: string) => msg.includes('❌'));
        const firstError = errorMessages[0] || result.messages[0] || 'Unknown error';
        
        toast({
          title: "Penerimaan Gagal",
          description: `${errorMessages.length} error: ${firstError.replace('❌ ', '')}`,
          variant: "destructive",
        });
        
        // Log detailed error for debugging
        console.error('Receipt processing failed:', {
          success: result.success,
          messages: result.messages,
          errorCount: errorMessages.length
        });
        
        // Reset integration status to show errors
        setTimeout(() => {
          setIntegrationStatus(prev => 
            prev.map(item => ({
              ...item,
              status: "error" as const,
              message: "❌ Proses gagal"
            }))
          );
          
          setIsProcessing(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Error processing receipt:", error);
      
      setTimeout(() => {
        setIntegrationStatus(prev => {
          return prev.map(item => ({
            module: item.module,
            status: 'error' as const,
            message: `❌ Gagal: ${item.module} tidak dapat diperbarui`
          }));
        });
      }, 1000);
      
      setIsProcessing(false);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menyimpan penerimaan: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };
  
  const router = useRouter();
  const currentPath = router.pathname;

  // Define navigation items
  const navigationItems = [
    { name: 'Laporan', path: '/inventory/reports', icon: <FaChartBar className="w-4 h-4" /> },
    { name: 'Penerimaan dan Retur', path: '/inventory/receive', icon: <FaTruck className="w-4 h-4" /> },
    { name: 'Penyesuaian', path: '/inventory/adjustment', icon: <FaExchangeAlt className="w-4 h-4" /> },
    { name: 'Grafik Stok', path: '/inventory/stock-graph', icon: <FaChartBar className="w-4 h-4" /> },
  ];
  
  // La función validatePurchaseOrder ya está definida arriba
  // La función loadPendingOrders ya está definida arriba

  // Load pending orders and suppliers when component mounts and when receiptService changes
  useEffect(() => {
    if (receiptService) {
      loadPendingOrders();
      loadSuppliers();
    } else {
      console.log('Receipt service not ready, waiting for initialization...');
    }
  }, [receiptService]);

  return (
    <DashboardLayout>
      <VerticalSidebar />
      <div className="h-full">
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {/* Green Gradient Border */}
          <div className="w-full h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <Breadcrumbs
              items={[
                { title: "Dashboard", href: "/dashboard" },
                { title: "Inventori", href: "/inventory" },
                { title: "Penerimaan dan Retur", href: "/inventory/receive" },
              ]}
              className="p-6 pb-0"
            />
            
            {/* Quick Navigation */}
            <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-2">
              <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
                <a href="/inventory" className="flex items-center px-3 py-2 rounded-md transition-colors whitespace-nowrap text-sm hover:bg-green-50 text-gray-700 hover:text-green-600">
                  <span className="mr-1.5">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" className="w-4 h-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                      <path d="M280.37 148.26L96 300.11V464a16 16 0 0 0 16 16l112.06-.29a16 16 0 0 0 15.92-16V368a16 16 0 0 1 16-16h64a16 16 0 0 1 16 16v95.64a16 16 0 0 0 16 16.05L464 480a16 16 0 0 0 16-16V300L295.67 148.26a12.19 12.19 0 0 0-15.3 0zM255.83 432a175.61 175.61 0 0 1-146-77.8l101.8 4.87a12 12 0 0 0 12.57-12v-47.4a12 12 0 0 0-12-12H12a12 12 0 0 0-12 12V500a12 12 0 0 0 12 12h47.35a12 12 0 0 0 12-12.6l-4.15-82.57A247.17 247.17 0 0 0 255.83 504c121.11 0 221.93-86.92 243.55-201.82a12 12 0 0 0-11.8-14.18h-49.05a12 12 0 0 0-11.67 9.26A175.86 175.86 0 0 1 255.83 432z"></path>
                    </svg>
                  </span>
                  <span>Beranda</span>
                </a>
                <a href="/inventory/products" className="flex items-center px-3 py-2 rounded-md transition-all whitespace-nowrap text-sm
                      hover:bg-green-50 text-gray-700 hover:text-green-600">
                  <span className="mr-1.5">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 640 512" className="w-4 h-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                      <path d="M425.7 256c-16.9 0-32.8-9-41.4-23.4L320 126l-64.2 106.6c-8.7 14.5-24.6 23.5-41.5 23.5-4.5 0-9-.6-13.3-1.9L64 215v178c0 14.7 10 27.5 24.2 31l216.2 54.1c10.2 2.5 20.9 2.5 31 0L551.8 424c14.2-3.6 24.2-16.4 24.2-31V215l-137 39.1c-4.3 1.3-8.8 1.9-13.3 1.9zm212.6-112.2L586.8 41c-3.1-6.2-9.8-9.8-16.7-8.9L494 110.1c-9-9-21.2-14.1-33.9-14.1H416V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48v320c0 26.5 21.5 48 48 48h16c0 53 43 96 96 96s96-43 96-96h128c0 53 43 96 96 96s96-43 96-96h48c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zM160 464c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm320 0c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm80-208H416V144h44.1l99.9 99.9V256z"></path>
                    </svg>
                  </span>
                  <span>Produk</span>
                </a>
                <a href="/inventory/stocktake" className="flex items-center px-3 py-2 rounded-md transition-all whitespace-nowrap text-sm
                      hover:bg-green-50 text-gray-700 hover:text-green-600">
                  <span className="mr-1.5">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 384 512" className="w-4 h-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                      <path d="M336 64h-16V243.9c0-12.7-5.1-24.9-14.1-33.9L320 126l-64.2 106.6c-8.7 14.5-24.6 23.5-41.5 23.5-4.5 0-9-.6-13.3-1.9L64 215v178c0 14.7 10 27.5 24.2 31l216.2 54.1c10.2 2.5 20.9 2.5 31 0L551.8 424c14.2-3.6 24.2-16.4 24.2-31V215l-137 39.1c-4.3 1.3-8.8 1.9-13.3 1.9zm212.6-112.2L586.8 41c-3.1-6.2-9.8-9.8-16.7-8.9L494 110.1c-9-9-21.2-14.1-33.9-14.1H416V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48v320c0 26.5 21.5 48 48 48h16c0 53 43 96 96 96s96-43 96-96h128c0 53 43 96 96 96s96-43 96-96h48c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zM160 464c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm320 0c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm80-208H416V144h44.1l99.9 99.9V256z"></path>
                    </svg>
                  </span>
                  <span>Stock Opname</span>
                </a>
                <a href="/inventory/expiry" className="flex items-center px-3 py-2 rounded-md transition-all whitespace-nowrap text-sm
                      hover:bg-red-50 text-gray-700 hover:text-red-600">
                  <span className="mr-1.5">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="w-4 h-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                      <path d="M440.65 12.57l4 82.77A247.16 247.16 0 0 0 255.83 8C134.73 8 33.91 94.92 12.29 209.82A12 12 0 0 0 24.09 224h49.05a12 12 0 0 0 11.67-9.26 175.91 175.91 0 0 1 317-56.94l-101.46-4.86a12 12 0 0 0-12.57 12v47.41a12 12 0 0 0 12 12H500a12 12 0 0 0 12-12V12a12 12 0 0 0-12-12h-47.37a12 12 0 0 0-11.98 12.57zM255.83 432a175.61 175.61 0 0 1-146-77.8l101.8 4.87a12 12 0 0 0 12.57-12v-47.4a12 12 0 0 0-12-12H12a12 12 0 0 0-12 12V500a12 12 0 0 0 12 12h47.35a12 12 0 0 0 12-12.6l-4.15-82.57A247.17 247.17 0 0 0 255.83 504c121.11 0 221.93-86.92 243.55-201.82a12 12 0 0 0-11.8-14.18h-49.05a12 12 0 0 0-11.67 9.26A175.86 175.86 0 0 1 255.83 432z"></path>
                    </svg>
                  </span>
                  <span>Kadaluarsa</span>
                </a>
                <a href="/inventory/reports" className="flex items-center px-3 py-2 rounded-md transition-all whitespace-nowrap text-sm
                      hover:bg-red-50 text-gray-700 hover:text-red-600">
                  <span className="mr-1.5">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="w-4 h-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                      <path d="M332.8 320h38.4c6.4 0 12.8-6.4 12.8-12.8V172.8c0-6.4-6.4-12.8-12.8-12.8h-38.4c-6.4 0-12.8 6.4-12.8 12.8v134.4c0 6.4 6.4 12.8 12.8 12.8zm96 0h38.4c6.4 0 12.8-6.4 12.8-12.8V76.8c0-6.4-6.4-12.8-12.8-12.8h-38.4c-6.4 0-12.8 6.4-12.8 12.8v230.4c0 6.4 6.4 12.8 12.8 12.8zm-288 0h38.4c6.4 0 12.8-6.4 12.8-12.8v-70.4c0-6.4-6.4-12.8-12.8-12.8h-38.4c-6.4 0-12.8 6.4-12.8 12.8v70.4c0 6.4 6.4 12.8 12.8 12.8zm96 0h38.4c6.4 0 12.8-6.4 12.8-12.8V108.8c0-6.4-6.4-12.8-12.8-12.8h-38.4c-6.4 0-12.8 6.4-12.8 12.8v198.4c0 6.4 6.4 12.8 12.8 12.8zm320 0c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm80-208H416V144h44.1l99.9 99.9V256z"></path>
                    </svg>
                  </span>
                  <span>Laporan</span>
                </a>
                <a href="/inventory/receive" className="flex items-center px-3 py-2 rounded-md transition-all whitespace-nowrap text-sm
                      bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-sm">
                  <span className="mr-1.5">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 640 512" className="w-4 h-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                      <path d="M624 352h-16V243.9c0-12.7-5.1-24.9-14.1-33.9L494 110.1c-9-9-21.2-14.1-33.9-14.1H416V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48v320c0 26.5 21.5 48 48 48h16c0 53 43 96 96 96s96-43 96-96h128c0 53 43 96 96 96s96-43 96-96h48c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zM160 464c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm320 0c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm80-208H416V144h44.1l99.9 99.9V256z"></path>
                    </svg>
                  </span>
                  <span>Penerimaan dan Retur</span>
                </a>
                <a href="/inventory/adjustment" className="flex items-center px-3 py-2 rounded-md transition-all whitespace-nowrap text-sm
                      hover:bg-red-50 text-gray-700 hover:text-red-600">
                  <span className="mr-1.5">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="w-4 h-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                      <path d="M496 384H64V80c0-8.84-7.16-16-16-16H16C7.16 64 0 71.16 0 80v336c0 17.67 14.33 32 32 32h464c8.84 0 16-7.16 16-16v-32c0-8.84-7.16-16-16-16z"></path>
                    </svg>
                  </span>
                  <span>Penyesuaian</span>
                </a>
                <a href="/inventory/master" className="flex items-center px-3 py-2 rounded-md transition-all whitespace-nowrap text-sm
                      hover:bg-red-50 text-gray-700 hover:text-red-600">
                  <span className="mr-1.5">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="w-4 h-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                      <path d="M464 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zm-6 400H54a6 6 0 0 1-6-6V86a6 6 0 0 1 6-6h404a6 6 0 0 1 6 6v340a6 6 0 0 1-6 6zm-42-92v24c0 6.627-5.373 12-12 12H204c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h200c6.627 0 12 5.373 12 12zm0-96v24c0 6.627-5.373 12-12 12H204c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h200c6.627 0 12 5.373 12 12zm0-96v24c0 6.627-5.373 12-12 12H204c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h200c6.627 0 12 5.373 12 12zm-252 12c0 19.882-16.118 36-36 36s-36-16.118-36-36 16.118-36 36-36 36 16.118 36 36zm0 96c0 19.882-16.118 36-36 36s-36-16.118-36-36 16.118-36 36-36 36 16.118 36 36zm0 96c0 19.882-16.118 36-36 36s-36-16.118-36-36 16.118-36 36-36 36 16.118 36 36z"></path>
                    </svg>
                  </span>
                  <span>Master Inventory</span>
                </a>
                <a href="/inventory/stock-graph" className="flex items-center px-3 py-2 rounded-md transition-all whitespace-nowrap text-sm
                      hover:bg-red-50 text-gray-700 hover:text-red-600">
                  <span className="mr-1.5">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="w-4 h-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                      <path d="M496 384H64V80c0-8.84-7.16-16-16-16H16C7.16 64 0 71.16 0 80v336c0 17.67 14.33 32 32 32h464c8.84 0 16-7.16 16-16v-32c0-8.84-7.16-16-16-16z"></path>
                    </svg>
                  </span>
                  <span>Grafik Stok</span>
                </a>
              </div>
            </div>
            
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white flex items-center">
                    <FaWarehouse className="mr-3 h-6 w-6" /> 
                    Penerimaan & Retur Barang
                  </h1>
                  <p className="text-green-50 mt-1 text-sm">
                    Kelola penerimaan dan retur barang dari supplier
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20" 
                    onClick={() => router.push('/inventory/receipt-history')}
                  >
                    <FaFile className="mr-2 h-3 w-3" /> Riwayat
                  </Button>
                </div>
              </div>
            </div>
            
            <Tabs defaultValue="receive" className="w-full mt-6">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger 
                  value="receive"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white"
                >
                  <FaTruck className="mr-2 h-4 w-4" /> Penerimaan
                </TabsTrigger>
                <TabsTrigger 
                  value="return"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white"
                >
                  <FaExchangeAlt className="mr-2 h-4 w-4" /> Retur
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="receive" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column (2/3) */}
                  <div className="lg:col-span-2 space-y-6">
                    {currentView === "integration-status" && (
                      <Card className="border-green-200">
                        <CardHeader>
                          <CardTitle className="text-red-700 flex items-center">
                            <FaSync className="mr-2 h-5 w-5" /> Status Integrasi
                          </CardTitle>
                          <CardDescription className="text-red-600/80">
                            Status proses integrasi dengan modul lain
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {integrationStatus.map((status, index) => (
                              <div key={index} className="flex items-center space-x-4">
                                <div className="flex-shrink-0">
                                  {status.status === 'pending' && <FaSync className="h-5 w-5 text-amber-500 animate-spin" />}
                                  {status.status === 'success' && <FaCheck className="h-5 w-5 text-green-500" />}
                                  {status.status === 'error' && <FaTimes className="h-5 w-5 text-red-500" />}
                                </div>
                                <div className="flex-grow">
                                  <h4 className="font-medium capitalize">{status.module}</h4>
                                  <p className="text-sm text-gray-600">{status.message}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Receipt Details Card */}
                    <Card className="border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-gray-900 flex items-center">
                          <FaTruck className="mr-2 h-5 w-5 text-green-600" /> Detail Penerimaan
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                          Masukkan informasi penerimaan barang
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* PO Selection */}
                          <div className="space-y-2">
                            <Label htmlFor="poNumber">No. Purchase Order</Label>
                            <div className="flex gap-2">
                              <Select 
                                value={receiptForm.poNumber}
                                onValueChange={(value) => {
                                  const order = pendingOrders.find(o => o.poNumber === value);
                                  if (order) {
                                    handleSelectOrder(order);
                                  }
                                }}
                              >
                                <SelectTrigger className="border-red-200 focus:ring-red-500">
                                  <SelectValue placeholder="Pilih Pesanan..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {pendingOrders.length === 0 && (
                                    <div className="py-2 px-2 text-sm text-gray-500 italic">
                                      {isLoadingPOs ? "Memuat pesanan..." : 
                                       poLoadError ? poLoadError : "Tidak ada pesanan tersedia"}
                                    </div>
                                  )}
                                  {pendingOrders.map((order) => (
                                    <SelectItem key={order.poNumber} value={order.poNumber}>
                                      {order.poNumber} - {order.supplierName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              <Button
                                variant="outline"
                                className="border-green-200 text-green-600 hover:bg-green-50"
                                onClick={() => loadPendingOrders()}
                                disabled={isLoadingPOs}
                              >
                                {isLoadingPOs ? (
                                  <FaSync className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FaSync className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            {poValidationErrors["order"] && (
                              <p className="text-sm text-red-500">{poValidationErrors["order"]}</p>
                            )}
                            {poLoadError && (
                              <p className="text-sm text-red-500">{poLoadError}</p>
                            )}
                          </div>
                          
                          {/* Invoice Number */}
                          <div className="space-y-2">
                            <Label htmlFor="invoiceNumber">No. Faktur/Invoice</Label>
                            <Input 
                              id="invoiceNumber"
                              value={receiptForm.invoiceNumber}
                              onChange={(e) => setReceiptForm({...receiptForm, invoiceNumber: e.target.value})}
                              placeholder="Masukkan No. Faktur"
                              className="border-red-200 focus-visible:ring-red-500"
                            />
                          </div>
                          
                          {/* Receipt Date */}
                          <div className="space-y-2">
                            <Label htmlFor="receiptDate">Tanggal Penerimaan</Label>
                            <Input 
                              id="receiptDate"
                              type="date"
                              value={receiptForm.receiptDate}
                              onChange={(e) => setReceiptForm({...receiptForm, receiptDate: e.target.value})}
                              className="border-red-200 focus-visible:ring-red-500"
                            />
                          </div>
                          
                          {/* Due Date */}
                          <div className="space-y-2">
                            <Label htmlFor="dueDate">Jatuh Tempo Pembayaran</Label>
                            <Input 
                              id="dueDate"
                              type="date"
                              value={receiptForm.dueDate}
                              onChange={(e) => setReceiptForm({...receiptForm, dueDate: e.target.value})}
                              className="border-red-200 focus-visible:ring-red-500"
                            />
                          </div>
                          
                          {/* Supplier */}
                          <div className="space-y-2">
                            <Label htmlFor="supplierName">Supplier</Label>
                            <div className="flex gap-2">
                              <Select 
                                value={selectedSupplierId}
                                onValueChange={(value) => {
                                  setSelectedSupplierId(value);
                                  const supplier = suppliers.find(s => s.id === value);
                                  if (supplier) {
                                    setSupplierName(supplier.name);
                                    setReceiptForm(prev => ({
                                      ...prev,
                                      supplierId: supplier.id
                                    }));
                                  }
                                }}
                                disabled={!!selectedOrder || isLoadingSuppliers}
                              >
                                <SelectTrigger className="border-red-200 focus:ring-red-500">
                                  <SelectValue placeholder="Pilih Supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                  {suppliers.map((supplier) => (
                                    <SelectItem key={supplier.id} value={supplier.id}>
                                      {supplier.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.open('/inventory/master/suppliers', '_blank')}
                                className="ml-2 border-green-200 text-green-600 hover:bg-green-50"
                                disabled={isLoadingSuppliers}
                              >
                                {isLoadingSuppliers ? (
                                  <FaSync className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FaPlus className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            {supplierLoadError && (
                              <p className="text-sm text-red-500">{supplierLoadError}</p>
                            )}
                          </div>
                          
                          {/* Payment Status */}
                          <div className="space-y-2">
                            <Label htmlFor="paymentStatus">Status Pembayaran</Label>
                            <Select 
                              value={receiptForm.paymentStatus} 
                              onValueChange={(value: any) => setReceiptForm({...receiptForm, paymentStatus: value})}
                            >
                              <SelectTrigger className="border-red-200 focus:ring-red-500">
                                <SelectValue placeholder="Pilih status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unpaid">Belum Dibayar</SelectItem>
                                <SelectItem value="partial">Dibayar Sebagian</SelectItem>
                                <SelectItem value="paid">Lunas</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Notes - Full Width */}
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="notes">Catatan</Label>
                            <Textarea 
                              id="notes"
                              value={receiptForm.notes}
                              onChange={(e) => setReceiptForm({...receiptForm, notes: e.target.value})}
                              placeholder="Catatan tambahan..."
                              rows={3}
                              className="border-red-200 focus-visible:ring-red-500 min-h-[100px]"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    

                    
                    {/* Receipt Items Card */}
                    <Card className="border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-gray-900 flex items-center">
                          <FaBoxOpen className="mr-2 h-5 w-5 text-green-600" /> Item Penerimaan
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                          Tambahkan produk yang diterima
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4 flex">
                          <Input 
                            placeholder="Cari produk atau scan barcode"
                            className="mr-2"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                            <FaSearch className="mr-2 h-4 w-4" /> Cari
                          </Button>
                        </div>
                        
                        {/* Search Results */}
                        {filteredProducts.length > 0 && (
                          <div className="mt-2 mb-4 border rounded-md max-h-60 overflow-auto">
                            {filteredProducts.map((product) => (
                              <div 
                                key={product.id}
                                className="p-2 hover:bg-gray-100 cursor-pointer border-b flex justify-between items-center"
                                onClick={() => handleAddProduct(product)}
                              >
                                <div>
                                  <p className="font-medium">{product.name}</p>
                                  <p className="text-sm text-gray-500">SKU: {product.sku} | Stok: {product.stock} {product.unit}</p>
                                </div>
                                <Button size="sm" variant="ghost" className="text-red-600">
                                  <FaPlus className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Items Table */}
                        {receiptItems.length > 0 ? (
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>No</TableHead>
                                  <TableHead>Produk</TableHead>
                                  <TableHead>Batch</TableHead>
                                  <TableHead>Jumlah</TableHead>
                                  <TableHead>Harga</TableHead>
                                  <TableHead>Subtotal</TableHead>
                                  <TableHead>Expire</TableHead>
                                  <TableHead></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {receiptItems.map((item, index) => (
                                  <TableRow key={item.id || index}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-medium">
                                      <div className="flex flex-col">
                                        <span>{item.productName}</span>
                                        <span className="text-xs text-gray-500">{item.productSku}</span>
                                        {item.poItemId && (
                                          <span className="text-xs text-orange-500">
                                            Dari PO: {selectedOrder?.poNumber}
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Input 
                                        type="text"
                                        value={item.batchNumber || ''}
                                        onChange={(e) => handleUpdateItem(index, 'batchNumber', e.target.value)}
                                        className="w-24 h-8 border-red-200 focus-visible:ring-red-500"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center">
                                        <Button 
                                          variant="outline" 
                                          size="icon"
                                          className="h-8 w-8 rounded-r-none border-red-200"
                                          onClick={() => {
                                            if (item.quantity > 1) 
                                              handleUpdateItem(index, 'quantity', item.quantity - 1)
                                          }}
                                        >
                                          <FaMinus className="h-3 w-3" />
                                        </Button>
                                        <Input 
                                          type="number" 
                                          min="1"
                                          value={item.quantity}
                                          onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                          className="w-16 h-8 rounded-none text-center border-x-0 border-red-200 focus-visible:ring-red-500"
                                        />
                                        <Button 
                                          variant="outline" 
                                          size="icon" 
                                          className="h-8 w-8 rounded-l-none border-red-200"
                                          onClick={() => handleUpdateItem(index, 'quantity', item.quantity + 1)}
                                        >
                                          <FaPlus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Input 
                                        type="text"
                                        value={formatRupiah(item.unitPrice)}
                                        onChange={(e) => {
                                          const value = e.target.value.replace(/[^\d]/g, '');
                                          handleUpdateItem(index, 'unitPrice', parseFloat(value) || 0);
                                        }}
                                        className="w-24 h-8 border-red-200 focus-visible:ring-red-500"
                                      />
                                    </TableCell>
                                    <TableCell>{formatRupiah(item.unitPrice * item.quantity)}</TableCell>
                                    <TableCell>
                                      <Input 
                                        type="date"
                                        value={item.expiryDate}
                                        onChange={(e) => handleUpdateItem(index, 'expiryDate', e.target.value)}
                                        className="w-32 h-8 border-red-200 focus-visible:ring-red-500"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-green-600 hover:text-green-800 hover:bg-green-50"
                                        onClick={() => handleRemoveItem(index)}
                                      >
                                        <FaTrash className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-center p-6 border border-dashed border-gray-300 rounded-md">
                            <FaBoxOpen className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                            <h3 className="text-gray-500 font-medium">Belum ada item</h3>
                            <p className="text-gray-400 mb-4">Gunakan form pencarian di atas untuk menambahkan produk</p>
                          </div>
                        )}
                        
                        <div className="flex justify-center">
                          <Button 
                            className="mt-4 border-dashed border-2 border-green-300 bg-white text-green-600 hover:bg-green-50 w-full max-w-md mx-auto"
                            onClick={() => {
                              const searchInput = document.getElementById('product-search');
                              if (searchInput) searchInput.focus();
                            }}
                          >
                            <FaPlus className="mr-2 h-4 w-4" /> Tambah Item
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Right Column (1/3) - Summary & Actions */}
                  <div className="space-y-6">
                    {/* Document Upload for Receipt */}
                    <Card className="border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-gray-900 flex items-center">
                          <FaPaperclip className="mr-2 h-5 w-5 text-green-600" /> Dokumen Pendukung
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                          Unggah dokumen seperti surat jalan, invoice, atau bukti kondisi barang
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <DocumentUploader
                          documents={uploadedDocuments}
                          onAddDocuments={handleAddDocuments}
                          onRemoveDocument={handleRemoveDocument}
                        />
                      </CardContent>
                    </Card>
                    
                    {/* Order Summary */}
                    <Card className="border-gray-200 sticky top-6">
                      <CardHeader>
                        <CardTitle className="text-gray-900">
                          Ringkasan Penerimaan
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                          Total nilai penerimaan barang
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium">{formatRupiah(receiptForm.subtotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pajak ({receiptForm.taxRate}%):</span>
                            <span className="font-medium">{formatRupiah(receiptForm.taxAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Diskon:</span>
                            <span className="font-medium">{formatRupiah(receiptForm.discountAmount)}</span>
                          </div>
                          <div className="h-px bg-gray-200 my-2"></div>
                          <div className="flex justify-between font-bold text-lg">
                            <span>Total:</span>
                            <span className="text-green-600">{formatRupiah(receiptForm.total)}</span>
                          </div>
                          
                          <Button 
                            className="w-full mt-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                            onClick={handleProcessReceipt}
                            disabled={isProcessing || receiptItems.length === 0}
                          >
                            {isProcessing ? (
                              <>
                                <FaSync className="mr-2 h-4 w-4 animate-spin" /> Memproses...
                              </>
                            ) : (
                              <>
                                <FaSave className="mr-2 h-4 w-4" /> Simpan Penerimaan
                              </>
                            )}
                          </Button>
                          
                          <Button 
                            variant="outline"
                            className="w-full mt-2 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setReceiptItems([]);
                              setSearchQuery('');
                              setReceiptForm({
                                poNumber: "",
                                invoiceNumber: "",
                                receiptDate: new Date().toISOString().split('T')[0],
                                dueDate: (() => {
                                  const date = new Date();
                                  date.setDate(date.getDate() + 30);
                                  return date.toISOString().split('T')[0];
                                })(),
                                supplierId: "",
                                paymentStatus: "unpaid",
                                financeStatus: "paid",
                                paymentMethod: "transfer",
                                taxIncluded: false,
                                taxRate: 11,
                                discountPercentage: 0,
                                discountAmount: 0,
                                notes: ""
                              });
                            }}
                          >
                            <FaTimes className="mr-2 h-4 w-4" /> Batal
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Integration Status Card */}
                    <Card className="border-red-200">
                      <CardHeader>
                        <CardTitle className="text-red-700">
                          Status Integrasi
                        </CardTitle>
                        <CardDescription className="text-red-600/80">
                          Informasi integrasi dengan modul lain
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center text-sm">
                            <Badge variant="outline" className="mr-2 bg-green-50 text-green-600 border-green-200">
                              Ready
                            </Badge>
                            <span>Inventory</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Badge variant="outline" className="mr-2 bg-green-50 text-green-600 border-green-200">
                              Ready
                            </Badge>
                            <span>Finance</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Badge variant="outline" className="mr-2 bg-green-50 text-green-600 border-green-200">
                              Ready
                            </Badge>
                            <span>Purchasing</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="return" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column (2/3) */}
                  <div className="lg:col-span-2 space-y-6">
                    {currentView === "integration-status" && (
                      <Card className="border-red-200 col-span-3">
                        <CardHeader>
                          <CardTitle className="text-red-700 flex items-center">
                            <FaSync className="mr-2 h-5 w-5" /> Status Integrasi
                          </CardTitle>
                          <CardDescription className="text-red-600/80">
                            Informasi proses integrasi dengan modul lain
                          </CardDescription>
                        </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Reference Number */}
                          <div className="space-y-2">
                            <Label htmlFor="referenceNumber">No. Penerimaan/Faktur</Label>
                            <div className="flex gap-2">
                              <Input 
                                id="referenceNumber"
                                placeholder="Masukkan No. Referensi"
                                className="flex-1 border-red-200 focus-visible:ring-red-500"
                              />
                              <Button 
                                variant="outline" 
                                size="icon"
                              >
                                <FaSearch className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Return Type */}
                          <div className="space-y-2">
                            <Label htmlFor="returnType">Tipe Retur</Label>
                            <Select>
                              <SelectTrigger className="border-red-200 focus:ring-red-500">
                                <SelectValue placeholder="Pilih tipe retur" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="supplier">Retur ke Supplier</SelectItem>
                                <SelectItem value="damaged">Barang Rusak</SelectItem>
                                <SelectItem value="expired">Barang Kadaluarsa</SelectItem>
                                <SelectItem value="other">Lainnya</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Return Date */}
                          <div className="space-y-2">
                            <Label htmlFor="returnDate">Tanggal Retur</Label>
                            <Input 
                              id="returnDate"
                              type="date"
                              defaultValue={new Date().toISOString().split('T')[0]}
                              className="border-red-200 focus-visible:ring-red-500"
                            />
                          </div>
                          
                          {/* Supplier */}
                          <div className="space-y-2">
                            <Label htmlFor="supplier">Supplier</Label>
                            <Select>
                              <SelectTrigger className="border-red-200 focus:ring-red-500">
                                <SelectValue placeholder="Pilih supplier" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="supplier-1">PT Farmasi Utama</SelectItem>
                                <SelectItem value="supplier-2">Kimia Farma</SelectItem>
                                <SelectItem value="supplier-3">Apotek Sehat</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Notes Field - Full Width */}
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="returnNotes">Catatan Retur</Label>
                            <Textarea 
                              id="returnNotes"
                              placeholder="Tambahkan catatan tentang retur barang ini"
                              className="min-h-[100px]"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    )}
                    
                    {/* Return Details Card */}
                    <Card className="border-red-200">
                      <CardHeader>
                        <CardTitle className="text-red-700 flex items-center">
                          <FaExchangeAlt className="mr-2 h-5 w-5" /> Detail Retur
                        </CardTitle>
                        <CardDescription className="text-red-600/80">
                          Masukkan informasi retur barang
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Reference Number */}
                          <div className="space-y-2">
                            <Label htmlFor="referenceNumber">No. Penerimaan/Faktur</Label>
                            <div className="flex gap-2">
                              <Input 
                                id="referenceNumber"
                                placeholder="Masukkan No. Referensi"
                                className="flex-1 border-red-200 focus-visible:ring-red-500"
                              />
                              <Button 
                                variant="outline" 
                                size="icon"
                              >
                                <FaSearch className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Return Type */}
                          <div className="space-y-2">
                            <Label htmlFor="returnType">Tipe Retur</Label>
                            <Select>
                              <SelectTrigger className="border-red-200 focus:ring-red-500">
                                <SelectValue placeholder="Pilih tipe retur" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="supplier">Retur ke Supplier</SelectItem>
                                <SelectItem value="damaged">Barang Rusak</SelectItem>
                                <SelectItem value="expired">Barang Kadaluarsa</SelectItem>
                                <SelectItem value="other">Lainnya</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Return Date */}
                          <div className="space-y-2">
                            <Label htmlFor="returnDate">Tanggal Retur</Label>
                            <Input 
                              id="returnDate"
                              type="date"
                              defaultValue={new Date().toISOString().split('T')[0]}
                              className="border-red-200 focus-visible:ring-red-500"
                            />
                          </div>
                          
                          {/* Supplier */}
                          <div className="space-y-2">
                            <Label htmlFor="supplier">Supplier</Label>
                            <Select>
                              <SelectTrigger className="border-red-200 focus:ring-red-500">
                                <SelectValue placeholder="Pilih supplier" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="supplier-1">PT Farmasi Utama</SelectItem>
                                <SelectItem value="supplier-2">Kimia Farma</SelectItem>
                                <SelectItem value="supplier-3">Apotek Sehat</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Notes Field - Full Width */}
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="returnNotes">Catatan Retur</Label>
                            <Textarea 
                              id="returnNotes"
                              placeholder="Tambahkan catatan tentang retur barang ini"
                              className="min-h-[100px]"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Return Items Card */}
                    <Card className="border-red-200">
                      <CardHeader>
                        <CardTitle className="text-red-700 flex items-center">
                          <FaBoxOpen className="mr-2 h-5 w-5" /> Item Retur
                        </CardTitle>
                        <CardDescription className="text-red-600/80">
                          Tambahkan produk yang akan diretur
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4 flex">
                          <Input 
                            placeholder="Cari produk atau scan barcode"
                            className="mr-2"
                          />
                          <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                            <FaSearch className="mr-2 h-4 w-4" /> Cari
                          </Button>
                        </div>
                        
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Produk</TableHead>
                                <TableHead>Batch</TableHead>
                                <TableHead>Jumlah</TableHead>
                                <TableHead>Harga</TableHead>
                                <TableHead>Subtotal</TableHead>
                                <TableHead>Alasan</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-medium">Paracetamol 500mg</TableCell>
                                <TableCell>B12345</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <Button 
                                      variant="outline" 
                                      size="icon"
                                      className="h-8 w-8 rounded-r-none"
                                    >
                                      <FaMinus className="h-3 w-3" />
                                    </Button>
                                    <Input 
                                      type="number" 
                                      min="1"
                                      defaultValue="5"
                                      className="w-16 h-8 rounded-none text-center"
                                    />
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      className="h-8 w-8 rounded-l-none"
                                    >
                                      <FaPlus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell>Rp 5.000</TableCell>
                                <TableCell>Rp 25.000</TableCell>
                                <TableCell>
                                  <Select defaultValue="damaged">
                                    <SelectTrigger className="w-[120px] border-red-200 focus:ring-red-500">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="damaged">Rusak</SelectItem>
                                      <SelectItem value="expired">Kadaluarsa</SelectItem>
                                      <SelectItem value="wrong_item">Salah Item</SelectItem>
                                      <SelectItem value="excess">Kelebihan</SelectItem>
                                      <SelectItem value="recall">Recall</SelectItem>
                                      <SelectItem value="other">Lainnya</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                  >
                                    <FaTrash className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Amoxicillin 500mg</TableCell>
                                <TableCell>B22222</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-r-none"
                                  >
                                    <FaMinus className="h-3 w-3" />
                                  </Button>
                                  <Input 
                                    type="number" 
                                    min="1"
                                    defaultValue="2"
                                    className="w-16 h-8 rounded-none text-center"
                                  />
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-l-none"
                                  >
                                    <FaPlus className="h-3 w-3" />
                                  </Button>
                                </div>
                                </TableCell>
                                <TableCell>Rp 10.000</TableCell>
                                <TableCell>Rp 20.000</TableCell>
                                <TableCell>
                                  <Select defaultValue="expired">
                                    <SelectTrigger className="w-[120px] border-red-200 focus:ring-red-500">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="damaged">Rusak</SelectItem>
                                      <SelectItem value="expired">Kadaluarsa</SelectItem>
                                      <SelectItem value="wrong_item">Salah Item</SelectItem>
                                      <SelectItem value="excess">Kelebihan</SelectItem>
                                      <SelectItem value="recall">Recall</SelectItem>
                                      <SelectItem value="other">Lainnya</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                  >
                                    <FaTrash className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                        
                        <div className="flex justify-center">
                          <Button className="mt-4 border-dashed border-2 border-red-300 bg-white text-red-600 hover:bg-red-50 w-full max-w-md mx-auto">
                            <FaPlus className="mr-2 h-4 w-4" /> Tambah Item
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Right Column (1/3) */}
                  <div className="space-y-6">
                    {/* Document Upload Card for Return */}
                    <Card className="border-red-200">
                      <CardHeader>
                        <CardTitle className="text-red-700 flex items-center">
                          <FaPaperclip className="mr-2 h-5 w-5" /> Bukti Retur
                        </CardTitle>
                        <CardDescription className="text-red-600/80">
                          Unggah foto atau dokumen kondisi barang untuk mendukung pengajuan retur
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <DocumentUploader
                          documents={uploadedDocuments}
                          onAddDocuments={handleAddDocuments}
                          onRemoveDocument={handleRemoveDocument}
                        />
                      </CardContent>
                    </Card>
                    
                    {/* Return Summary Card */}
                    <Card className="border-red-200">
                      <CardHeader>
                        <CardTitle className="text-red-700">
                          Ringkasan Retur
                        </CardTitle>
                        <CardDescription className="text-red-600/80">
                          Total nilai barang yang diretur
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium">Rp 45.000</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pajak (11%):</span>
                            <span className="font-medium">Rp 4.950</span>
                          </div>
                          <div className="h-px bg-gray-200 my-2"></div>
                          <div className="flex justify-between font-bold text-lg">
                            <span>Total:</span>
                            <span className="text-red-600">Rp 49.950</span>
                          </div>
                          
                          <Button 
                            className="w-full mt-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                          >
                            <FaSave className="mr-2 h-4 w-4" /> Simpan Retur
                          </Button>
                          
                          <Button 
                            variant="outline"
                            className="w-full mt-2 border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <FaTimes className="mr-2 h-4 w-4" /> Batal
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Integration Status Card */}
                    <Card className="border-red-200">
                      <CardHeader>
                        <CardTitle className="text-red-700">
                          Status Integrasi
                        </CardTitle>
                        <CardDescription className="text-red-600/80">
                          Informasi integrasi dengan modul lain
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center text-sm">
                            <Badge variant="outline" className="mr-2 bg-green-50 text-green-600 border-green-200">
                              Ready
                            </Badge>
                            <span>Inventory</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Badge variant="outline" className="mr-2 bg-green-50 text-green-600 border-green-200">
                              Ready
                            </Badge>
                            <span>Finance</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Badge variant="outline" className="mr-2 bg-green-50 text-green-600 border-green-200">
                              Ready
                            </Badge>
                            <span>Supplier</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ReceivePage;
