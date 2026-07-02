import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ProductionFormModal from '@/components/inventory/ProductionFormModal';
import WasteManagementModal from '@/components/inventory/WasteManagementModal';
import {
  FaIndustry, FaPlus, FaPlay, FaCheck, FaClock, FaBoxOpen,
  FaClipboardCheck, FaExclamationTriangle, FaChartLine, FaFlask,
  FaWarehouse, FaArrowRight, FaCheckCircle, FaTimes, FaArrowLeft, FaHome,
  FaTrash, FaDollarSign
} from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Recipe {
  id: string;
  name: string;
  sku: string;
  batchSize: number;
  batchUnit: string;
  ingredients: {
    materialId: string;
    materialName: string;
    quantity: number;
    unit: string;
    available: number;
  }[];
  totalCost: number;
  costPerUnit: number;
}

interface ProductionBatch {
  id: string;
  batchNumber: string;
  recipeId: string;
  recipeName: string;
  productSku: string;
  plannedQuantity: number;
  producedQuantity: number;
  unit: string;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  startDate: string;
  completionDate?: string;
  materialsUsed: {
    materialId: string;
    materialName: string;
    plannedQty: number;
    usedQty: number;
    unit: string;
  }[];
  totalCost: number;
  createdBy: string;
  notes?: string;
}

const ProductionManagementPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);
  const [productionList, setProductionList] = useState<ProductionBatch[]>([]);
  const [wasteRecords, setWasteRecords] = useState<any[]>([]);
  const [financialLoss, setFinancialLoss] = useState<number>(0);
  const [inventoryStock, setInventoryStock] = useState<{[key: string]: number}>({});
  const [rawMaterialStock, setRawMaterialStock] = useState<{[key: string]: number}>({
    'RM001': 500, // Tepung Terigu Premium
    'RM002': 300, // Gula Pasir Halus
    'RM003': 100, // Mentega
    'RM004': 80,  // Telur Ayam
    'RM005': 50,  // Susu Bubuk
    'RM006': 40   // Coklat Bubuk
  });
  const [loading, setLoading] = useState(false);
  const [tableExists, setTableExists] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [autoSetupAttempted, setAutoSetupAttempted] = useState(false);

  // Auto-setup and fetch data on mount
  useEffect(() => {
    initializeWasteManagement();
  }, []);

  const initializeWasteManagement = async () => {
    // Try to fetch data first
    const dataFetched = await fetchWasteData();
    const statsFetched = await fetchWasteStats();

    // If both failed (table doesn't exist), auto-setup
    if (!dataFetched && !statsFetched && !autoSetupAttempted) {
      setAutoSetupAttempted(true);
      await setupWasteTable(true); // true = auto setup
    }
  };

  const fetchWasteData = async (): Promise<boolean> => {
    try {
      const response = await axios.get('/api/waste?limit=10');
      if (response.data.success) {
        setWasteRecords(response.data.data);
        setTableExists(true);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error fetching waste data:', error);
      if (error.response?.status === 500) {
        setTableExists(false);
      }
      return false;
    }
  };

  const fetchWasteStats = async (): Promise<boolean> => {
    try {
      const response = await axios.get('/api/waste/stats');
      if (response.data.success) {
        setFinancialLoss(response.data.data.netLoss);
        setTableExists(true);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error fetching waste stats:', error);
      if (error.response?.status === 500) {
        setTableExists(false);
      }
      return false;
    }
  };

  const setupWasteTable = async (isAutoSetup: boolean = false) => {
    setSetupLoading(true);
    
    if (isAutoSetup) {
      toast.loading('Menyiapkan database Waste Management...', { id: 'auto-setup' });
    }

    try {
      const response = await axios.post('/api/waste/setup');
      if (response.data.success) {
        if (isAutoSetup) {
          toast.success(
            'Database berhasil disiapkan! Sistem Waste Management siap digunakan.',
            { id: 'auto-setup', duration: 4000 }
          );
        } else {
          toast.success(
            response.data.alreadyExists 
              ? 'Table sudah ada, siap digunakan!' 
              : 'Table berhasil dibuat! Sistem siap digunakan.',
            { duration: 4000 }
          );
        }
        setTableExists(true);
        // Refresh data
        await fetchWasteData();
        await fetchWasteStats();
      }
    } catch (error: any) {
      console.error('Error setting up waste table:', error);
      if (isAutoSetup) {
        toast.error(
          'Gagal setup otomatis. Klik tombol "Setup Database" untuk mencoba lagi.',
          { id: 'auto-setup', duration: 5000 }
        );
      } else {
        toast.error(
          error.response?.data?.message || 'Gagal membuat table. Periksa koneksi database.',
          { duration: 5000 }
        );
      }
    } finally {
      setSetupLoading(false);
    }
  };

  const handleWasteSubmit = async (wasteData: any) => {
    setLoading(true);
    
    try {
      // Prepare data for API
      const apiData = {
        productId: wasteData.productId || null,
        productName: wasteData.productName || null,
        productSku: wasteData.productSku || null,
        wasteType: wasteData.wasteType,
        quantity: parseFloat(wasteData.quantity),
        unit: wasteData.unit,
        costValue: parseFloat(wasteData.costValue),
        reason: wasteData.reason,
        disposalMethod: wasteData.disposalMethod,
        clearancePrice: wasteData.clearancePrice ? parseFloat(wasteData.clearancePrice) : null,
        wasteDate: wasteData.wasteDate || new Date().toISOString(),
        notes: wasteData.notes || null
      };

      // Send to API
      const response = await axios.post('/api/waste', apiData);

      if (response.data.success) {
        const savedWaste = response.data.data;
        
        // Calculate net loss
        const netLoss = wasteData.disposalMethod === 'clearance_sale' 
          ? wasteData.costValue - (wasteData.clearancePrice || 0)
          : wasteData.costValue;

        // Reduce inventory if it's finished product waste
        if (wasteData.productSku && inventoryStock[wasteData.productSku]) {
          setInventoryStock(prev => ({
            ...prev,
            [wasteData.productSku]: Math.max(0, prev[wasteData.productSku] - wasteData.quantity)
          }));
        }

        // Refresh data from API
        await fetchWasteData();
        await fetchWasteStats();

        // Show success notification
        const recoveryInfo = wasteData.disposalMethod === 'clearance_sale'
          ? `Recovery: ${formatCurrency(wasteData.clearancePrice)} | Net Loss: ${formatCurrency(netLoss)}`
          : `Total Loss: ${formatCurrency(netLoss)}`;

        toast.success(
          `Limbah tercatat! ${savedWaste.wasteNumber} - ${wasteData.productName || 'Material'} (${wasteData.quantity} ${wasteData.unit}). ${recoveryInfo}`,
          { duration: 5000 }
        );

        setShowWasteModal(false);
      }
    } catch (error: any) {
      console.error('Error saving waste:', error);
      toast.error(
        error.response?.data?.message || 'Gagal menyimpan data limbah. Silakan coba lagi.',
        { duration: 4000 }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProductionSubmit = (data: any) => {
    // Reduce raw material stock
    const updatedRawMaterials = { ...rawMaterialStock };
    data.materialsNeeded.forEach((material: any) => {
      if (updatedRawMaterials[material.materialId] !== undefined) {
        updatedRawMaterials[material.materialId] -= material.plannedQty;
      }
    });
    setRawMaterialStock(updatedRawMaterials);

    // Add to production list
    const newBatch: ProductionBatch = {
      id: `BATCH${Date.now()}`,
      batchNumber: `BATCH-2024-${String(productionList.length + 1).padStart(3, '0')}`,
      recipeId: data.recipeId,
      recipeName: data.recipeName,
      productSku: data.productSku,
      plannedQuantity: data.plannedQuantity,
      producedQuantity: 0,
      unit: data.unit,
      status: 'in-progress',
      startDate: data.startDate,
      materialsUsed: data.materialsNeeded,
      totalCost: data.totalCost,
      createdBy: 'Admin',
      notes: data.notes
    };
    // Add finished product to inventory
    const currentStock = inventoryStock[data.productSku] || 0;
    setInventoryStock({
      ...inventoryStock,
      [data.productSku]: currentStock + data.plannedQuantity
    });

    setProductionList([newBatch, ...productionList]);
    
    // Show detailed success message
    const materialSummary = data.materialsNeeded.map((m: any) => 
      `  - ${m.materialName}: -${m.plannedQty} ${m.unit}`
    ).join('\n');
    
    alert(
      `✅ PRODUKSI BERHASIL DISELESAIKAN!\n\n` +
      `📦 Batch: ${newBatch.batchNumber}\n` +
      `🏭 Produk: ${newBatch.recipeName}\n` +
      `📊 Jumlah: ${newBatch.plannedQuantity} ${newBatch.unit}\n` +
      `💰 Total Biaya: ${formatCurrency(data.totalCost)}\n\n` +
      `📉 BAHAN BAKU BERKURANG:\n${materialSummary}\n\n` +
      `📈 PRODUK JADI BERTAMBAH:\n` +
      `  + ${data.plannedQuantity} ${data.unit} ${data.recipeName}\n\n` +
      `✨ Stok inventory telah diperbarui!`
    );
  };

  const handleCompleteBatch = (batch: ProductionBatch) => {
    // Update batch status to completed
    const updatedBatches = productionList.map(b => {
      if (b.id === batch.id) {
        return {
          ...b,
          status: 'completed' as const,
          producedQuantity: b.plannedQuantity,
          completionDate: new Date().toISOString().split('T')[0],
          materialsUsed: b.materialsUsed.map(m => ({
            ...m,
            usedQty: m.plannedQty
          }))
        };
      }
      return b;
    });
    
    setProductionList(updatedBatches);

    // Add to inventory stock
    setInventoryStock(prev => ({
      ...prev,
      [batch.productSku]: (prev[batch.productSku] || 0) + batch.plannedQuantity
    }));

    toast.success(
      `Batch ${batch.batchNumber} selesai! ${batch.plannedQuantity} ${batch.unit} ${batch.recipeName} ditambahkan ke inventory.`,
      { duration: 5000 }
    );
  };

  const handleViewDetail = (batch: ProductionBatch) => {
    // Show detailed information in alert
    const materialsInfo = batch.materialsUsed
      .map(m => `  • ${m.materialName}: ${m.usedQty}/${m.plannedQty} ${m.unit}`)
      .join('\n');

    const statusText = {
      'planned': '📋 Direncanakan',
      'in-progress': '🔄 Sedang Produksi',
      'completed': '✅ Selesai',
      'cancelled': '❌ Dibatalkan'
    }[batch.status];

    alert(
      `📦 DETAIL BATCH PRODUKSI\n\n` +
      `Nomor Batch: ${batch.batchNumber}\n` +
      `Produk: ${batch.recipeName}\n` +
      `SKU: ${batch.productSku}\n` +
      `Status: ${statusText}\n\n` +
      `📊 KUANTITAS:\n` +
      `  Target: ${batch.plannedQuantity} ${batch.unit}\n` +
      `  Diproduksi: ${batch.producedQuantity} ${batch.unit}\n\n` +
      `📅 TANGGAL:\n` +
      `  Mulai: ${batch.startDate}\n` +
      `  ${batch.completionDate ? `Selesai: ${batch.completionDate}` : 'Belum selesai'}\n\n` +
      `🧪 BAHAN YANG DIGUNAKAN:\n${materialsInfo}\n\n` +
      `💰 Total Biaya: ${formatCurrency(batch.totalCost)}\n` +
      `👤 Dibuat oleh: ${batch.createdBy}\n` +
      `${batch.notes ? `\n📝 Catatan: ${batch.notes}` : ''}`
    );
  };

  // Recipes with dynamic stock availability
  const recipes: Recipe[] = [
    {
      id: 'RCP001',
      name: 'Roti Tawar Premium',
      sku: 'PRD-ROTI-001',
      batchSize: 10,
      batchUnit: 'loaf',
      ingredients: [
        { materialId: 'RM001', materialName: 'Tepung Terigu Premium', quantity: 5, unit: 'kg', available: rawMaterialStock['RM001'] || 0 },
        { materialId: 'RM002', materialName: 'Gula Pasir Halus', quantity: 0.5, unit: 'kg', available: rawMaterialStock['RM002'] || 0 },
        { materialId: 'RM003', materialName: 'Mentega', quantity: 0.3, unit: 'kg', available: rawMaterialStock['RM003'] || 0 },
        { materialId: 'RM004', materialName: 'Telur Ayam', quantity: 0.4, unit: 'kg', available: rawMaterialStock['RM004'] || 0 },
        { materialId: 'RM005', materialName: 'Susu Bubuk', quantity: 0.2, unit: 'kg', available: rawMaterialStock['RM005'] || 0 },
      ],
      totalCost: 109200,
      costPerUnit: 10920
    },
    {
      id: 'RCP002',
      name: 'Kue Coklat Premium',
      sku: 'PRD-KUE-001',
      batchSize: 20,
      batchUnit: 'pcs',
      ingredients: [
        { materialId: 'RM001', materialName: 'Tepung Terigu Premium', quantity: 2, unit: 'kg', available: rawMaterialStock['RM001'] || 0 },
        { materialId: 'RM002', materialName: 'Gula Pasir Halus', quantity: 1, unit: 'kg', available: rawMaterialStock['RM002'] || 0 },
        { materialId: 'RM003', materialName: 'Mentega', quantity: 0.5, unit: 'kg', available: rawMaterialStock['RM003'] || 0 },
        { materialId: 'RM004', materialName: 'Telur Ayam', quantity: 0.6, unit: 'kg', available: rawMaterialStock['RM004'] || 0 },
        { materialId: 'RM006', materialName: 'Coklat Bubuk', quantity: 0.3, unit: 'kg', available: rawMaterialStock['RM006'] || 0 },
      ],
      totalCost: 109300,
      costPerUnit: 5465
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      planned: { color: 'bg-blue-100 text-blue-700', icon: FaClock, label: 'Direncanakan' },
      'in-progress': { color: 'bg-yellow-100 text-yellow-700', icon: FaPlay, label: 'Sedang Proses' },
      completed: { color: 'bg-green-100 text-green-700', icon: FaCheckCircle, label: 'Selesai' },
      cancelled: { color: 'bg-red-100 text-red-700', icon: FaTimes, label: 'Dibatalkan' }
    };
    const statusConfig = config[status as keyof typeof config] || config.planned;
    const Icon = statusConfig.icon;
    return (
      <Badge className={statusConfig.color}>
        <Icon className="mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const checkMaterialAvailability = (recipe: Recipe, multiplier: number = 1) => {
    return recipe.ingredients.every(ing => ing.available >= ing.quantity * multiplier);
  };

  const getMaxBatches = (recipe: Recipe) => {
    const maxBatches = recipe.ingredients.map(ing => 
      Math.floor(ing.available / ing.quantity)
    );
    return Math.min(...maxBatches);
  };

  // Mock data for demo - merge with productionList
  const mockBatches: ProductionBatch[] = [
    {
      id: 'BATCH001',
      batchNumber: 'BTH-2024-001',
      recipeId: 'RCP001',
      recipeName: 'Roti Tawar Premium',
      productSku: 'PRD-ROTI-001',
      plannedQuantity: 50,
      producedQuantity: 50,
      unit: 'loaf',
      status: 'completed',
      startDate: '2024-01-20',
      completionDate: '2024-01-20',
      materialsUsed: [
        { materialId: 'RM001', materialName: 'Tepung Terigu Premium', plannedQty: 25, usedQty: 25, unit: 'kg' },
        { materialId: 'RM002', materialName: 'Gula Pasir Halus', plannedQty: 2.5, usedQty: 2.5, unit: 'kg' },
        { materialId: 'RM003', materialName: 'Mentega', plannedQty: 1.5, usedQty: 1.5, unit: 'kg' },
        { materialId: 'RM004', materialName: 'Telur Ayam', plannedQty: 2, usedQty: 2, unit: 'kg' },
        { materialId: 'RM005', materialName: 'Susu Bubuk', plannedQty: 1, usedQty: 1, unit: 'kg' },
      ],
      totalCost: 546000,
      createdBy: 'Admin',
      notes: 'Produksi berjalan lancar'
    },
    {
      id: 'BATCH002',
      batchNumber: 'BTH-2024-002',
      recipeId: 'RCP002',
      recipeName: 'Kue Coklat Premium',
      productSku: 'PRD-KUE-001',
      plannedQuantity: 100,
      producedQuantity: 85,
      unit: 'pcs',
      status: 'in-progress',
      startDate: '2024-01-24',
      materialsUsed: [
        { materialId: 'RM001', materialName: 'Tepung Terigu Premium', plannedQty: 10, usedQty: 8.5, unit: 'kg' },
        { materialId: 'RM002', materialName: 'Gula Pasir Halus', plannedQty: 5, usedQty: 4.25, unit: 'kg' },
        { materialId: 'RM003', materialName: 'Mentega', plannedQty: 2.5, usedQty: 2.1, unit: 'kg' },
        { materialId: 'RM004', materialName: 'Telur Ayam', plannedQty: 3, usedQty: 2.55, unit: 'kg' },
        { materialId: 'RM006', materialName: 'Coklat Bubuk', plannedQty: 1.5, usedQty: 1.3, unit: 'kg' },
      ],
      totalCost: 465025,
      createdBy: 'Admin',
      notes: 'Sedang dalam proses produksi'
    }
  ];

  const allBatches = [...productionList, ...mockBatches];
  
  const stats = {
    totalBatches: allBatches.length,
    inProgress: allBatches.filter(b => b.status === 'in-progress').length,
    completed: allBatches.filter(b => b.status === 'completed').length,
    totalProduced: allBatches.reduce((sum, b) => sum + b.producedQuantity, 0)
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Manajemen Produksi | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Breadcrumb & Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <FaArrowLeft />
              <span>Kembali</span>
            </Button>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <FaHome className="text-gray-400" />
              <span>/</span>
              <button onClick={() => router.push('/inventory')} className="hover:text-green-600 transition-colors">
                Inventory
              </button>
              <span>/</span>
              <span className="text-gray-900 font-semibold">Produksi</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/inventory')}
            className="flex items-center space-x-2"
          >
            <FaHome />
            <span>Dashboard Inventory</span>
          </Button>
        </div>

        {/* Header - Professional & Elegant */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-8 py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <FaIndustry className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-white mb-1">Manajemen Produksi</h1>
                  <p className="text-sm text-slate-300">Kelola produksi dan tracking bahan baku</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowWasteModal(true)}
                  variant="outline"
                  className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                  size="sm"
                >
                  <FaTrash className="mr-2 w-4 h-4" />
                  Catat Limbah
                </Button>
                <Button
                  onClick={() => setShowProductionModal(true)}
                  className="bg-white text-slate-900 hover:bg-slate-100"
                  size="sm"
                >
                  <FaPlus className="mr-2 w-4 h-4" />
                  Mulai Produksi
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Grid - Clean & Professional */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-gray-200 p-px">
            <div className="bg-white p-5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Batch</p>
                <FaClipboardCheck className="text-gray-400 w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBatches}</p>
            </div>
            <div className="bg-white p-5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Proses</p>
                <FaPlay className="text-amber-500 w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
            </div>
            <div className="bg-white p-5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Selesai</p>
                <FaCheckCircle className="text-emerald-500 w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
            </div>
            <div className="bg-white p-5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Diproduksi</p>
                <FaBoxOpen className="text-blue-500 w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.totalProduced}</p>
            </div>
            <div className="bg-white p-5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Kerugian</p>
                <FaDollarSign className="text-red-500 w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-red-600">{formatCurrency(financialLoss)}</p>
            </div>
          </div>
        </div>

        {/* Inventory Stock Status - Professional & Clean */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="flex items-center text-base font-semibold text-gray-900">
                <FaBoxOpen className="mr-2 w-5 h-5 text-emerald-600" />
                Stok Produk Jadi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {Object.keys(inventoryStock).length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <FaBoxOpen className="text-2xl text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Belum ada produk yang diproduksi</p>
                    <p className="text-xs text-gray-400 mt-1">Mulai produksi untuk menambah stok</p>
                  </div>
                ) : (
                  Object.entries(inventoryStock).map(([sku, quantity]) => {
                    const recipe = recipes.find(r => r.sku === sku);
                    return (
                      <div key={sku} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 transition-all">
                        <div>
                          <p className="font-semibold text-gray-900">{recipe?.name || sku}</p>
                          <p className="text-xs text-gray-500 mt-0.5">SKU: {sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-emerald-600">{quantity}</p>
                          <p className="text-xs text-gray-500">{recipe?.batchUnit || 'unit'}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="flex items-center text-base font-semibold text-gray-900">
                <FaWarehouse className="mr-2 w-5 h-5 text-amber-600" />
                Stok Bahan Baku
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        ID
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Nama Bahan
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Stok
                      </th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(rawMaterialStock).map(([materialId, quantity]) => {
                      const materialNames: {[key: string]: string} = {
                        'RM001': 'Tepung Terigu Premium',
                        'RM002': 'Gula Pasir Halus',
                        'RM003': 'Mentega',
                        'RM004': 'Telur Ayam',
                        'RM005': 'Susu Bubuk',
                        'RM006': 'Coklat Bubuk'
                      };
                      const isLow = quantity < 50;
                      
                      return (
                        <tr key={materialId} className={`hover:bg-gray-50 transition-colors ${
                          isLow ? 'bg-red-50/30' : ''
                        }`}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs font-medium text-gray-700">{materialId}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                                isLow ? 'bg-red-500' : 'bg-emerald-500'
                              }`}></div>
                              <span className="text-sm font-medium text-gray-900">
                                {materialNames[materialId]}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className={`text-base font-bold ${
                                isLow ? 'text-red-600' : 'text-amber-600'
                              }`}>
                                {quantity}
                              </span>
                              <span className="text-xs text-gray-500">kg</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {isLow ? (
                              <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs">
                                <FaExclamationTriangle className="mr-1 w-2.5 h-2.5" />
                                Rendah
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs">
                                <FaCheckCircle className="mr-1 w-2.5 h-2.5" />
                                Normal
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Waste Management Summary - Simple, Professional & Elegant */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-base font-semibold text-gray-900">
                <FaTrash className="mr-2 w-5 h-5 text-red-600" />
                Manajemen Limbah & Produk Sisa
              </CardTitle>
              <Button
                onClick={() => setShowWasteModal(true)}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <FaPlus className="mr-2 w-4 h-4" />
                Catat Limbah
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Setup Banner if table doesn't exist */}
            {!tableExists && (
              <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="text-amber-600 text-xl mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 mb-1">Setup Database Diperlukan</h3>
                    <p className="text-sm text-amber-800 mb-3">
                      Table <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">wastes</code> belum dibuat. 
                      Klik tombol di bawah untuk membuat table secara otomatis.
                    </p>
                    <Button
                      onClick={() => setupWasteTable(false)}
                      disabled={setupLoading}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      size="sm"
                    >
                      {setupLoading ? (
                        <>
                          <FaClock className="mr-2 w-4 h-4 animate-spin" />
                          Membuat Table...
                        </>
                      ) : (
                        <>
                          <FaCheckCircle className="mr-2 w-4 h-4" />
                          Setup Database Sekarang
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Simplified Stats - 2 Columns */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Total Limbah</p>
                <p className="text-2xl font-bold text-gray-900">{wasteRecords.length}</p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Total Kerugian</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(financialLoss)}</p>
              </div>
            </div>

            {wasteRecords.length === 0 && tableExists ? (
              <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <FaCheckCircle className="text-xl text-emerald-600" />
                </div>
                <p className="text-sm text-gray-600">Belum ada limbah yang tercatat</p>
              </div>
            ) : (
              <div className="space-y-2">
                {wasteRecords.slice(0, 3).map((waste) => (
                  <div key={waste.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-red-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-900">{waste.wasteNumber}</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">{waste.wasteType}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{waste.productName || 'Raw Material'}</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {waste.quantity} {waste.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-red-600">{formatCurrency(waste.costValue)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {wasteRecords.length > 3 && (
                  <p className="text-center text-xs text-gray-500 pt-1">
                    +{wasteRecords.length - 3} lainnya
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Recipes - Professional & Clean */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200 bg-gray-50">
            <CardTitle className="flex items-center text-base font-semibold text-gray-900">
              <FaFlask className="mr-2 w-5 h-5 text-indigo-600" />
              Resep Tersedia untuk Produksi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recipes.map((recipe) => {
                const canProduce = checkMaterialAvailability(recipe);
                const maxBatches = getMaxBatches(recipe);
                
                return (
                  <div key={recipe.id} className={`border rounded-lg p-5 transition-all ${
                    canProduce 
                      ? 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md' 
                      : 'border-red-200 bg-red-50 hover:border-red-300'
                  }`}>
                    {/* Recipe Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">{recipe.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>SKU: {recipe.sku}</span>
                          <span>•</span>
                          <span>{recipe.batchSize} {recipe.batchUnit}</span>
                        </div>
                      </div>
                      {canProduce ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                          <FaCheckCircle className="mr-1 w-3 h-3" />
                          Siap
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 text-xs">
                          <FaExclamationTriangle className="mr-1 w-3 h-3" />
                          Stok Rendah
                        </Badge>
                      )}
                    </div>

                    {/* Ingredients Availability */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                      <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Ketersediaan Bahan</p>
                      <div className="space-y-2">
                        {recipe.ingredients.map((ing, idx) => {
                          const available = ing.available >= ing.quantity;
                          const percentage = (ing.available / ing.quantity) * 100;
                          return (
                            <div key={idx}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className={`${available ? 'text-gray-700' : 'text-red-600'}`}>
                                  {ing.materialName}
                                </span>
                                <span className={`font-semibold ${available ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {ing.available} / {ing.quantity} {ing.unit}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className={`h-full rounded-full ${
                                    available ? 'bg-emerald-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Maks Batch</p>
                        <p className="text-2xl font-bold text-gray-900">{maxBatches}</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Biaya/Batch</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(recipe.totalCost)}</p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      className={`w-full ${
                        canProduce 
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!canProduce}
                      onClick={() => {
                        setSelectedBatch({
                          id: '',
                          batchNumber: '',
                          recipeId: recipe.id,
                          recipeName: recipe.name,
                          productSku: recipe.sku,
                          plannedQuantity: recipe.batchSize,
                          producedQuantity: 0,
                          unit: recipe.batchUnit,
                          status: 'planned',
                          startDate: new Date().toISOString().split('T')[0],
                          materialsUsed: recipe.ingredients.map(ing => ({
                            materialId: ing.materialId,
                            materialName: ing.materialName,
                            plannedQty: ing.quantity,
                            usedQty: 0,
                            unit: ing.unit
                          })),
                          totalCost: recipe.totalCost,
                          createdBy: 'Admin'
                        });
                        setShowProductionModal(true);
                      }}
                    >
                      <FaPlay className="mr-2 w-4 h-4" />
                      {canProduce ? 'Mulai Produksi' : 'Stok Tidak Cukup'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Production Batches Aktif - Professional & Clean */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200 bg-gray-50">
            <CardTitle className="flex items-center text-base font-semibold text-gray-900">
              <FaPlay className="mr-2 w-5 h-5 text-amber-600" />
              Batch Produksi Aktif
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {allBatches.filter(b => b.status === 'in-progress' || b.status === 'planned').length === 0 ? (
                <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                  <FaClipboardCheck className="mx-auto text-4xl text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600">Tidak ada batch produksi aktif</p>
                  <p className="text-xs text-gray-400 mt-1">Klik "Mulai Produksi" untuk memulai batch baru</p>
                </div>
              ) : (
                allBatches.filter(b => b.status === 'in-progress' || b.status === 'planned').map((batch) => (
                <div key={batch.id} className="border border-gray-200 bg-white rounded-lg p-5 hover:border-gray-300 hover:shadow-md transition-all">
                  {/* Header Section */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">{batch.batchNumber}</h3>
                        {getStatusBadge(batch.status)}
                      </div>
                      <p className="text-sm text-gray-600">{batch.recipeName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">SKU: {batch.productSku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Tanggal Produksi</p>
                      <p className="font-semibold text-gray-900">{batch.startDate}</p>
                      {batch.completionDate && (
                        <p className="text-xs text-emerald-600 mt-1">Selesai: {batch.completionDate}</p>
                      )}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Rencana</p>
                      <p className="text-xl font-bold text-gray-900">{batch.plannedQuantity}</p>
                      <p className="text-xs text-gray-500">{batch.unit}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Diproduksi</p>
                      <p className="text-xl font-bold text-indigo-600">{batch.producedQuantity}</p>
                      <p className="text-xs text-gray-500">{batch.unit}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Total Biaya</p>
                      <p className="text-lg font-bold text-emerald-600">{formatCurrency(batch.totalCost)}</p>
                    </div>
                  </div>

                  {/* Materials Used */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Bahan Digunakan</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {batch.materialsUsed.map((material, idx) => {
                        const percentage = (material.usedQty / material.plannedQty) * 100;
                        const isComplete = material.usedQty >= material.plannedQty;
                        return (
                          <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-700">{material.materialName}</span>
                              <span className={`text-xs font-semibold ${isComplete ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {material.usedQty} / {material.plannedQty} {material.unit}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className={`h-full rounded-full ${
                                  isComplete ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  {batch.notes && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                      <p className="text-sm text-gray-700">{batch.notes}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {batch.status === 'in-progress' && (
                      <Button 
                        onClick={() => handleCompleteBatch(batch)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" 
                        size="sm"
                      >
                        <FaCheck className="mr-2 w-4 h-4" />
                        Selesaikan
                      </Button>
                    )}
                    <Button 
                      onClick={() => handleViewDetail(batch)}
                      variant="outline" 
                      className="flex-1 border-gray-300 hover:bg-gray-50" 
                      size="sm"
                    >
                      Lihat Detail
                    </Button>
                  </div>
                </div>
              ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Riwayat Produksi (Completed Batches) - Professional & Clean */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200 bg-gray-50">
            <CardTitle className="flex items-center text-base font-semibold text-gray-900">
              <FaCheckCircle className="mr-2 w-5 h-5 text-emerald-600" />
              Riwayat Produksi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {allBatches.filter(b => b.status === 'completed').length === 0 ? (
                <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                  <FaClipboardCheck className="mx-auto text-4xl text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600">Belum ada riwayat produksi</p>
                  <p className="text-xs text-gray-400 mt-1">Batch yang selesai akan muncul di sini</p>
                </div>
              ) : (
                allBatches.filter(b => b.status === 'completed').map((batch) => (
                <div key={batch.id} className="border border-emerald-200 bg-emerald-50/30 rounded-lg p-5 hover:border-emerald-300 hover:shadow-md transition-all">
                  {/* Header Section */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">{batch.batchNumber}</h3>
                        {getStatusBadge(batch.status)}
                      </div>
                      <p className="text-sm text-gray-600">{batch.recipeName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">SKU: {batch.productSku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Tanggal Produksi</p>
                      <p className="font-semibold text-gray-900">{batch.startDate}</p>
                      {batch.completionDate && (
                        <p className="text-xs text-emerald-600 mt-1 font-semibold">✓ Selesai: {batch.completionDate}</p>
                      )}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white border border-emerald-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Target</p>
                      <p className="text-xl font-bold text-gray-900">{batch.plannedQuantity}</p>
                      <p className="text-xs text-gray-500">{batch.unit}</p>
                    </div>
                    <div className="bg-white border border-emerald-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Diproduksi</p>
                      <p className="text-xl font-bold text-emerald-600">{batch.producedQuantity}</p>
                      <p className="text-xs text-gray-500">{batch.unit}</p>
                    </div>
                    <div className="bg-white border border-emerald-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Total Biaya</p>
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(batch.totalCost)}</p>
                    </div>
                  </div>

                  {/* Materials Used - Compact View */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Bahan Digunakan</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {batch.materialsUsed.map((material: any, idx: number) => (
                        <div key={idx} className="bg-white border border-gray-200 rounded-lg p-2">
                          <p className="text-xs text-gray-700 font-medium">{material.materialName}</p>
                          <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                            {material.usedQty} {material.unit}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {batch.notes && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                      <p className="text-sm text-gray-700">{batch.notes}</p>
                    </div>
                  )}

                  {/* Action Button - View Detail Only */}
                  <Button 
                    onClick={() => handleViewDetail(batch)}
                    variant="outline" 
                    className="w-full border-emerald-300 hover:bg-emerald-50 text-emerald-700" 
                    size="sm"
                  >
                    <FaClipboardCheck className="mr-2 w-4 h-4" />
                    Lihat Detail Lengkap
                  </Button>
                </div>
              ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Form Modal */}
      <ProductionFormModal
        isOpen={showProductionModal}
        onClose={() => setShowProductionModal(false)}
        recipes={recipes}
        onSubmit={handleProductionSubmit}
      />

      {/* Waste Management Modal */}
      <WasteManagementModal
        isOpen={showWasteModal}
        onClose={() => setShowWasteModal(false)}
        productionBatch={selectedBatch}
        onSubmit={handleWasteSubmit}
      />
    </DashboardLayout>
  );
};

export default ProductionManagementPage;
