import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FaClipboardList, FaSearch, FaSave, FaDownload, 
  FaPrint, FaPlus, FaEdit, FaCheck, FaTimes, FaExclamationTriangle,
  FaChartLine, FaFileAlt, FaUserCheck, FaHistory, FaCamera,
  FaBarcode, FaWarehouse, FaBoxes, FaExclamationCircle,
  FaCheckCircle, FaTimesCircle, FaArrowLeft, FaHome, FaFilter,
  FaDollarSign, FaPercentage, FaInfoCircle
} from 'react-icons/fa';

interface StockOpnameItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  location: string;
  uom: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  variancePercentage: number;
  unitCost: number;
  varianceValue: number;
  status: 'pending' | 'counted' | 'verified' | 'investigated' | 'approved';
  varianceCategory: 'minor' | 'moderate' | 'major' | 'none';
  countedBy: string;
  countDate: string;
  recountRequired: boolean;
  rootCause: string;
  notes: string;
  photos: string[];
}

const StockOpnamePageNew: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, formatCurrency } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('counting');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterVariance, setFilterVariance] = useState('all');
  const [items, setItems] = useState<StockOpnameItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [opnameData, setOpnameData] = useState({
    opnameNumber: `SO-2024-${String(Date.now()).slice(-4)}`,
    opnameType: 'full' as 'full' | 'cycle' | 'spot',
    date: new Date().toISOString().split('T')[0],
    location: 'Gudang Utama',
    warehouse: 'WH-001',
    performedBy: session?.user?.name || 'Admin',
    supervisedBy: '',
    notes: '',
    status: 'draft' as 'draft' | 'in_progress' | 'completed' | 'approved' | 'posted'
  });

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    loadProducts();
  }, []);


  const loadProducts = async () => {
    setLoading(true);
    try {
      const mockProducts: StockOpnameItem[] = [
        {
          id: '1',
          productId: 'prod-001',
          productName: 'Roti Tawar Premium',
          sku: 'PRD-ROTI-001',
          category: 'Finished Goods',
          location: 'Rak A1',
          uom: 'loaf',
          systemStock: 120,
          physicalStock: 0,
          difference: 0,
          variancePercentage: 0,
          unitCost: 15000,
          varianceValue: 0,
          status: 'pending',
          varianceCategory: 'none',
          countedBy: '',
          countDate: '',
          recountRequired: false,
          rootCause: '',
          notes: '',
          photos: []
        },
        {
          id: '2',
          productId: 'prod-002',
          productName: 'Kue Brownies Coklat',
          sku: 'PRD-KUE-001',
          category: 'Finished Goods',
          location: 'Rak A2',
          uom: 'pcs',
          systemStock: 85,
          physicalStock: 0,
          difference: 0,
          variancePercentage: 0,
          unitCost: 25000,
          varianceValue: 0,
          status: 'pending',
          varianceCategory: 'none',
          countedBy: '',
          countDate: '',
          recountRequired: false,
          rootCause: '',
          notes: '',
          photos: []
        },
        {
          id: '3',
          productId: 'prod-003',
          productName: 'Tepung Terigu Premium',
          sku: 'RM001',
          category: 'Raw Material',
          location: 'Gudang B1',
          uom: 'kg',
          systemStock: 500,
          physicalStock: 0,
          difference: 0,
          variancePercentage: 0,
          unitCost: 12000,
          varianceValue: 0,
          status: 'pending',
          varianceCategory: 'none',
          countedBy: '',
          countDate: '',
          recountRequired: false,
          rootCause: '',
          notes: '',
          photos: []
        },
        {
          id: '4',
          productId: 'prod-004',
          productName: 'Gula Pasir Halus',
          sku: 'RM002',
          category: 'Raw Material',
          location: 'Gudang B2',
          uom: 'kg',
          systemStock: 300,
          physicalStock: 0,
          difference: 0,
          variancePercentage: 0,
          unitCost: 15000,
          varianceValue: 0,
          status: 'pending',
          varianceCategory: 'none',
          countedBy: '',
          countDate: '',
          recountRequired: false,
          rootCause: '',
          notes: '',
          photos: []
        },
        {
          id: '5',
          productId: 'prod-005',
          productName: 'Mentega',
          sku: 'RM003',
          category: 'Raw Material',
          location: 'Gudang B3',
          uom: 'kg',
          systemStock: 100,
          physicalStock: 0,
          difference: 0,
          variancePercentage: 0,
          unitCost: 45000,
          varianceValue: 0,
          status: 'pending',
          varianceCategory: 'none',
          countedBy: '',
          countDate: '',
          recountRequired: false,
          rootCause: '',
          notes: '',
          photos: []
        },
        {
          id: '6',
          productId: 'prod-006',
          productName: 'Coklat Bubuk',
          sku: 'RM006',
          category: 'Raw Material',
          location: 'Gudang B4',
          uom: 'kg',
          systemStock: 40,
          physicalStock: 0,
          difference: 0,
          variancePercentage: 0,
          unitCost: 85000,
          varianceValue: 0,
          status: 'pending',
          varianceCategory: 'none',
          countedBy: '',
          countDate: '',
          recountRequired: false,
          rootCause: '',
          notes: '',
          photos: []
        },
        {
          id: '7',
          productId: 'prod-007',
          productName: 'Telur Ayam',
          sku: 'RM004',
          category: 'Raw Material',
          location: 'Chiller C1',
          uom: 'kg',
          systemStock: 80,
          physicalStock: 0,
          difference: 0,
          variancePercentage: 0,
          unitCost: 28000,
          varianceValue: 0,
          status: 'pending',
          varianceCategory: 'none',
          countedBy: '',
          countDate: '',
          recountRequired: false,
          rootCause: '',
          notes: '',
          photos: []
        },
        {
          id: '8',
          productId: 'prod-008',
          productName: 'Susu Bubuk',
          sku: 'RM005',
          category: 'Raw Material',
          location: 'Gudang B5',
          uom: 'kg',
          systemStock: 50,
          physicalStock: 0,
          difference: 0,
          variancePercentage: 0,
          unitCost: 95000,
          varianceValue: 0,
          status: 'pending',
          varianceCategory: 'none',
          countedBy: '',
          countDate: '',
          recountRequired: false,
          rootCause: '',
          notes: '',
          photos: []
        }
      ];
      setItems(mockProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhysicalStockChange = (id: string, value: string) => {
    const physicalStock = parseInt(value) || 0;
    setItems(items.map(item => {
      if (item.id === id) {
        const difference = physicalStock - item.systemStock;
        const variancePercentage = item.systemStock > 0 ? (difference / item.systemStock) * 100 : 0;
        const varianceValue = difference * item.unitCost;
        
        let varianceCategory: 'minor' | 'moderate' | 'major' | 'none' = 'none';
        const absVariancePercentage = Math.abs(variancePercentage);
        const absVarianceValue = Math.abs(varianceValue);
        
        if (absVariancePercentage > 5 || absVarianceValue > 500000) {
          varianceCategory = 'major';
        } else if (absVariancePercentage > 2 || absVarianceValue > 100000) {
          varianceCategory = 'moderate';
        } else if (difference !== 0) {
          varianceCategory = 'minor';
        }
        
        return {
          ...item,
          physicalStock,
          difference,
          variancePercentage,
          varianceValue,
          varianceCategory,
          status: difference !== 0 ? 'counted' : 'pending',
          countDate: new Date().toISOString().split('T')[0],
          countedBy: session?.user?.name || 'Admin'
        };
      }
      return item;
    }));
  };

  const handleVerifyItem = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, status: 'verified' as const } : item
    ));
  };

  const handleInvestigateItem = (id: string, rootCause: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, status: 'investigated' as const, rootCause } : item
    ));
  };

  const handleApproveItem = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, status: 'approved' as const } : item
    ));
  };

  const handleNotesChange = (id: string, notes: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, notes } : item
    ));
  };

  const handleStartOpname = () => {
    setOpnameData({ ...opnameData, status: 'in_progress' });
    alert('Stock opname dimulai! Silakan lakukan penghitungan fisik.');
  };

  const handleCompleteOpname = () => {
    const uncountedItems = items.filter(item => item.status === 'pending').length;
    if (uncountedItems > 0) {
      alert(`Masih ada ${uncountedItems} item yang belum dihitung!`);
      return;
    }
    setOpnameData({ ...opnameData, status: 'completed' });
    setActiveTab('variance');
    alert('Stock opname selesai! Silakan review variance analysis.');
  };

  const handleApproveOpname = () => {
    const unapprovedVariances = items.filter(
      item => item.varianceCategory !== 'none' && item.status !== 'approved'
    ).length;
    
    if (unapprovedVariances > 0) {
      alert(`Masih ada ${unapprovedVariances} variance yang belum diapprove!`);
      return;
    }
    
    setOpnameData({ ...opnameData, status: 'approved' });
    alert('Stock opname telah diapprove! Siap untuk posting adjustment.');
  };

  const handleCreateAdjustment = () => {
    const itemsWithVariance = items.filter(item => item.difference !== 0);
    
    if (itemsWithVariance.length === 0) {
      alert('Tidak ada variance yang perlu disesuaikan');
      return;
    }

    const adjustmentSummary = itemsWithVariance.map(item => ({
      product: item.productName,
      difference: item.difference,
      value: item.varianceValue
    }));

    console.log('Creating adjustment:', adjustmentSummary);
    
    alert(
      `Adjustment akan dibuat untuk ${itemsWithVariance.length} items\n\n` +
      `Total Variance Value: ${formatCurrency(totalVarianceValue)}\n\n` +
      `Adjustment document akan dibuat dan menunggu approval.`
    );
    
    setOpnameData({ ...opnameData, status: 'posted' });
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    
    const matchesVariance = 
      filterVariance === 'all' ||
      (filterVariance === 'with_variance' && item.difference !== 0) ||
      (filterVariance === 'no_variance' && item.difference === 0) ||
      (filterVariance === item.varianceCategory);
    
    return matchesSearch && matchesCategory && matchesVariance;
  });

  // Statistics
  const totalItems = items.length;
  const countedItems = items.filter(item => item.status !== 'pending').length;
  const itemsWithVariance = items.filter(item => item.difference !== 0).length;
  const totalVarianceValue = items.reduce((sum, item) => sum + item.varianceValue, 0);
  const accuracyRate = totalItems > 0 ? ((totalItems - itemsWithVariance) / totalItems * 100).toFixed(1) : 0;
  
  const varianceByCategory = {
    minor: items.filter(item => item.varianceCategory === 'minor').length,
    moderate: items.filter(item => item.varianceCategory === 'moderate').length,
    major: items.filter(item => item.varianceCategory === 'major').length
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: <Badge className="bg-gray-100 text-gray-700">Pending</Badge>,
      counted: <Badge className="bg-blue-100 text-blue-700">Counted</Badge>,
      verified: <Badge className="bg-green-100 text-green-700">Verified</Badge>,
      investigated: <Badge className="bg-yellow-100 text-yellow-700">Investigated</Badge>,
      approved: <Badge className="bg-purple-100 text-purple-700">Approved</Badge>
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getVarianceBadge = (category: string) => {
    const badges = {
      none: <Badge className="bg-gray-100 text-gray-600">No Variance</Badge>,
      minor: <Badge className="bg-blue-100 text-blue-700">Minor</Badge>,
      moderate: <Badge className="bg-yellow-100 text-yellow-700">Moderate</Badge>,
      major: <Badge className="bg-red-100 text-red-700">Major</Badge>
    };
    return badges[category as keyof typeof badges] || badges.none;
  };

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Stock Opname Professional | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Link href="/inventory">
                <Button variant="outline" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                  <FaArrowLeft className="mr-2" />
                  Kembali
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center">
                  <FaClipboardList className="mr-3" />
                  Stock Opname Professional
                </h1>
                <p className="text-indigo-100">
                  Sistem penghitungan fisik inventory dengan variance analysis & approval workflow
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-indigo-200">Nomor SO</p>
              <p className="text-2xl font-bold">{opnameData.opnameNumber}</p>
              <Badge className={`mt-2 ${
                opnameData.status === 'posted' ? 'bg-green-500' :
                opnameData.status === 'approved' ? 'bg-purple-500' :
                opnameData.status === 'completed' ? 'bg-blue-500' :
                opnameData.status === 'in_progress' ? 'bg-yellow-500' :
                'bg-gray-500'
              }`}>
                {opnameData.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-xs text-indigo-200 mb-1">Total Items</p>
              <p className="text-2xl font-bold">{totalItems}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-xs text-indigo-200 mb-1">Counted</p>
              <p className="text-2xl font-bold">{countedItems}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-xs text-indigo-200 mb-1">With Variance</p>
              <p className="text-2xl font-bold">{itemsWithVariance}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-xs text-indigo-200 mb-1">Accuracy Rate</p>
              <p className="text-2xl font-bold">{accuracyRate}%</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-xs text-indigo-200 mb-1">Variance Value</p>
              <p className="text-lg font-bold">{formatCurrency(Math.abs(totalVarianceValue))}</p>
            </div>
          </div>
        </div>

        {/* Opname Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FaFileAlt className="mr-2 text-indigo-600" />
              Informasi Stock Opname
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe Opname
                </label>
                <select
                  value={opnameData.opnameType}
                  onChange={(e) => setOpnameData({...opnameData, opnameType: e.target.value as any})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={opnameData.status !== 'draft'}
                >
                  <option value="full">Full Count</option>
                  <option value="cycle">Cycle Count</option>
                  <option value="spot">Spot Check</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal
                </label>
                <Input
                  type="date"
                  value={opnameData.date}
                  onChange={(e) => setOpnameData({...opnameData, date: e.target.value})}
                  disabled={opnameData.status !== 'draft'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lokasi/Warehouse
                </label>
                <Input
                  type="text"
                  value={opnameData.location}
                  onChange={(e) => setOpnameData({...opnameData, location: e.target.value})}
                  placeholder="Gudang/Area"
                  disabled={opnameData.status !== 'draft'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dilakukan Oleh
                </label>
                <Input
                  type="text"
                  value={opnameData.performedBy}
                  onChange={(e) => setOpnameData({...opnameData, performedBy: e.target.value})}
                  disabled={opnameData.status !== 'draft'}
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-3">
              {opnameData.status === 'draft' && (
                <Button onClick={handleStartOpname} className="bg-green-600 hover:bg-green-700">
                  <FaCheckCircle className="mr-2" />
                  Mulai Stock Opname
                </Button>
              )}
              {opnameData.status === 'in_progress' && (
                <Button onClick={handleCompleteOpname} className="bg-blue-600 hover:bg-blue-700">
                  <FaCheck className="mr-2" />
                  Selesaikan Counting
                </Button>
              )}
              {opnameData.status === 'completed' && (
                <Button onClick={handleApproveOpname} className="bg-purple-600 hover:bg-purple-700">
                  <FaUserCheck className="mr-2" />
                  Approve Opname
                </Button>
              )}
              {opnameData.status === 'approved' && (
                <Button onClick={handleCreateAdjustment} className="bg-indigo-600 hover:bg-indigo-700">
                  <FaSave className="mr-2" />
                  Create Adjustment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="counting">
              <FaBarcode className="mr-2" />
              Physical Counting
            </TabsTrigger>
            <TabsTrigger value="variance">
              <FaChartLine className="mr-2" />
              Variance Analysis
            </TabsTrigger>
            <TabsTrigger value="summary">
              <FaFileAlt className="mr-2" />
              Summary & Report
            </TabsTrigger>
          </TabsList>

          {/* Counting Tab */}
          <TabsContent value="counting" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Cari produk, SKU, atau lokasi..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">Semua Kategori</option>
                      <option value="Finished Goods">Finished Goods</option>
                      <option value="Raw Material">Raw Material</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={filterVariance}
                      onChange={(e) => setFilterVariance(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">Semua Status</option>
                      <option value="with_variance">Ada Variance</option>
                      <option value="no_variance">Tidak Ada Variance</option>
                      <option value="major">Major Variance</option>
                      <option value="moderate">Moderate Variance</option>
                      <option value="minor">Minor Variance</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Counting Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lokasi</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok Sistem</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok Fisik</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selisih</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                              <p className="text-xs text-gray-500">{item.sku}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-900">{item.location}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-gray-900">
                              {item.systemStock} {item.uom}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={item.physicalStock || ''}
                              onChange={(e) => handlePhysicalStockChange(item.id, e.target.value)}
                              className="w-24"
                              placeholder="0"
                              disabled={opnameData.status !== 'in_progress'}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-semibold ${
                              item.difference > 0 ? 'text-green-600' : 
                              item.difference < 0 ? 'text-red-600' : 
                              'text-gray-900'
                            }`}>
                              {item.difference > 0 ? '+' : ''}{item.difference}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {getVarianceBadge(item.varianceCategory)}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="px-4 py-3">
                            {item.status === 'counted' && (
                              <Button
                                size="sm"
                                onClick={() => handleVerifyItem(item.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <FaCheck className="mr-1" />
                                Verify
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Variance Analysis Tab */}
          <TabsContent value="variance" className="space-y-6">
            {/* Variance Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Major Variance</p>
                      <p className="text-3xl font-bold text-red-600">{varianceByCategory.major}</p>
                    </div>
                    <FaExclamationCircle className="text-4xl text-red-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">&gt; 5% atau &gt; Rp 500K</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Moderate Variance</p>
                      <p className="text-3xl font-bold text-yellow-600">{varianceByCategory.moderate}</p>
                    </div>
                    <FaExclamationTriangle className="text-4xl text-yellow-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">2-5% atau Rp 100-500K</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Minor Variance</p>
                      <p className="text-3xl font-bold text-blue-600">{varianceByCategory.minor}</p>
                    </div>
                    <FaInfoCircle className="text-4xl text-blue-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">&lt; 2% atau &lt; Rp 100K</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-indigo-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Variance Value</p>
                      <p className="text-xl font-bold text-indigo-600">
                        {formatCurrency(Math.abs(totalVarianceValue))}
                      </p>
                    </div>
                    <FaDollarSign className="text-4xl text-indigo-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Financial Impact</p>
                </CardContent>
              </Card>
            </div>

            {/* Variance Items */}
            <Card>
              <CardHeader>
                <CardTitle>Items dengan Variance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.filter(item => item.difference !== 0).map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{item.productName}</h3>
                            {getVarianceBadge(item.varianceCategory)}
                            {getStatusBadge(item.status)}
                          </div>
                          <p className="text-sm text-gray-600">SKU: {item.sku} • Location: {item.location}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Variance Value</p>
                          <p className={`text-xl font-bold ${item.varianceValue < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(item.varianceValue)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-3">
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-600">System Stock</p>
                          <p className="text-lg font-semibold">{item.systemStock} {item.uom}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-600">Physical Stock</p>
                          <p className="text-lg font-semibold">{item.physicalStock} {item.uom}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-600">Difference</p>
                          <p className={`text-lg font-semibold ${item.difference < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {item.difference > 0 ? '+' : ''}{item.difference} {item.uom}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-600">Variance %</p>
                          <p className={`text-lg font-semibold ${item.variancePercentage < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {item.variancePercentage.toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      {item.varianceCategory !== 'none' && item.varianceCategory !== 'minor' && (
                        <div className="space-y-2">
                          <Input
                            placeholder="Root cause analysis..."
                            value={item.rootCause}
                            onChange={(e) => handleInvestigateItem(item.id, e.target.value)}
                            className="mb-2"
                          />
                          <Input
                            placeholder="Notes..."
                            value={item.notes}
                            onChange={(e) => handleNotesChange(item.id, e.target.value)}
                          />
                          {item.status === 'investigated' && (
                            <Button
                              size="sm"
                              onClick={() => handleApproveItem(item.id)}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <FaUserCheck className="mr-2" />
                              Approve Variance
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Stock Opname Summary Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Header Info */}
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                    <div>
                      <p className="text-sm text-gray-600">Opname Number</p>
                      <p className="font-semibold">{opnameData.opnameNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-semibold">{opnameData.date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-semibold">{opnameData.location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Performed By</p>
                      <p className="font-semibold">{opnameData.performedBy}</p>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-600 mb-1">Total Items</p>
                        <p className="text-2xl font-bold text-blue-700">{totalItems}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-600 mb-1">Accuracy Rate</p>
                        <p className="text-2xl font-bold text-green-700">{accuracyRate}%</p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <p className="text-sm text-yellow-600 mb-1">Items with Variance</p>
                        <p className="text-2xl font-bold text-yellow-700">{itemsWithVariance}</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg">
                        <p className="text-sm text-red-600 mb-1">Total Variance Value</p>
                        <p className="text-lg font-bold text-red-700">{formatCurrency(Math.abs(totalVarianceValue))}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button variant="outline">
                      <FaPrint className="mr-2" />
                      Print Report
                    </Button>
                    <Button variant="outline">
                      <FaDownload className="mr-2" />
                      Export Excel
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                      <FaSave className="mr-2" />
                      Save & Close
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default StockOpnamePageNew;
