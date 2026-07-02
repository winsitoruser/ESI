import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VarianceResolutionModal from '@/components/inventory/VarianceResolutionModal';
import Link from 'next/link';
import { 
  FaClipboardList, FaSearch, FaSave, FaDownload, 
  FaPrint, FaPlus, FaEdit, FaCheck, FaTimes, FaExclamationTriangle,
  FaChartLine, FaFileAlt, FaUserCheck, FaHistory, FaCamera,
  FaBarcode, FaWarehouse, FaBoxes, FaExclamationCircle,
  FaCheckCircle, FaTimesCircle, FaArrowLeft, FaHome, FaFilter
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

interface OpnameHeader {
  opnameId: string;
  opnameNumber: string;
  opnameType: 'full' | 'cycle' | 'spot';
  status: 'draft' | 'in_progress' | 'completed' | 'approved' | 'posted';
  scheduledDate: string;
  startDate: string;
  endDate: string;
  location: string;
  warehouse: string;
  performedBy: string[];
  supervisedBy: string;
  approvedBy: string;
  notes: string;
  totalItems: number;
  countedItems: number;
  itemsWithVariance: number;
  totalVarianceValue: number;
}

const StockOpnamePage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<StockOpnameItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVarianceModal, setShowVarianceModal] = useState(false);
  const [selectedVarianceItem, setSelectedVarianceItem] = useState<StockOpnameItem | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [opnameData, setOpnameData] = useState({
    opnameNumber: `SO-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    warehouseId: '',
    locationId: '',
    performedBy: session?.user?.name || '',
    notes: ''
  });

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    loadProducts();
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      loadLocations(selectedWarehouse);
    }
  }, [selectedWarehouse]);

  const loadWarehouses = async () => {
    try {
      const response = await fetch('/api/warehouses');
      const result = await response.json();
      if (result.success) {
        setWarehouses(result.data);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadLocations = async (warehouseId: string) => {
    try {
      const response = await fetch(`/api/locations?warehouse_id=${warehouseId}`);
      const result = await response.json();
      if (result.success) {
        setLocations(result.data);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Fetch products from API
      const response = await fetch('/api/inventory/products');
      const result = await response.json();
      
      if (result.success && result.data) {
        // Transform products to stock opname items
        const opnameItems: StockOpnameItem[] = result.data.map((product: any) => ({
          id: product.id.toString(),
          productId: product.id.toString(),
          productName: product.name,
          sku: product.sku,
          category: product.category || 'General',
          location: '', // Will be set when location is selected
          uom: product.unit || 'pcs',
          systemStock: product.stock || 0,
          physicalStock: 0,
          difference: 0,
          variancePercentage: 0,
          unitCost: product.price || 0,
          varianceValue: 0,
          status: 'pending' as const,
          varianceCategory: 'none' as const,
          countedBy: '',
          countDate: '',
          recountRequired: false,
          rootCause: '',
          notes: '',
          photos: []
        }));
        setItems(opnameItems);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Gagal memuat data produk. Pastikan backend sudah running.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhysicalStockChange = async (id: string, value: string) => {
    const physicalStock = parseFloat(value) || 0;
    
    setItems(items.map(item => {
      if (item.id === id) {
        const difference = physicalStock - item.systemStock;
        const variancePercentage = item.systemStock > 0 ? (difference / item.systemStock) * 100 : 0;
        const varianceValue = difference * item.unitCost;
        
        // Determine variance category
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
          status: physicalStock > 0 ? 'counted' as const : 'pending' as const,
          countDate: new Date().toISOString().split('T')[0],
          countedBy: session?.user?.name || 'Admin'
        };
      }
      return item;
    }));
  };

  const handleNotesChange = (id: string, notes: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, notes } : item
    ));
  };

  const handleVerifyItem = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, status: 'verified' as const } : item
    ));
  };

  const handleOpenVarianceResolution = (item: StockOpnameItem) => {
    setSelectedVarianceItem(item);
    setShowVarianceModal(true);
  };

  const handleIncidentSubmit = async (incidentData: any) => {
    try {
      // Save incident report to backend
      const incidentPayload = {
        incident_number: incidentData.incidentNumber,
        product_id: parseInt(incidentData.varianceItem.productId),
        variance_quantity: incidentData.varianceItem.difference,
        variance_value: incidentData.varianceItem.varianceValue,
        variance_category: incidentData.varianceItem.varianceCategory,
        why_1: incidentData.investigation.why1,
        why_2: incidentData.investigation.why2,
        why_3: incidentData.investigation.why3,
        why_4: incidentData.investigation.why4,
        why_5: incidentData.investigation.why5,
        root_cause: incidentData.investigation.rootCause,
        evidence_notes: incidentData.investigation.evidence,
        witness_statement: incidentData.investigation.witness,
        immediate_action: incidentData.correctiveAction.immediateAction,
        corrective_action: incidentData.correctiveAction.correctiveAction,
        preventive_action: incidentData.correctiveAction.preventiveAction,
        responsible_person: incidentData.correctiveAction.responsiblePerson,
        target_date: incidentData.correctiveAction.targetDate,
        approval_level: incidentData.approval.level,
        approver_comments: incidentData.approval.comments
      };

      const response = await fetch('/api/incident-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(incidentPayload)
      });

      const result = await response.json();
      
      if (result.success) {
        setIncidents([result.data, ...incidents]);
        
        // Update item status
        setItems(items.map(item => 
          item.id === incidentData.varianceItem.id 
            ? { ...item, status: 'investigated' as const, rootCause: incidentData.investigation.rootCause }
            : item
        ));

        alert(
          `✅ LAPORAN INSIDEN BERHASIL DIBUAT!\n\n` +
          `Nomor Insiden: ${incidentData.incidentNumber}\n` +
          `Produk: ${incidentData.varianceItem.productName}\n` +
          `Selisih: ${incidentData.varianceItem.difference} unit\n` +
          `Akar Masalah: ${incidentData.investigation.rootCause}\n\n` +
          `Status: Menunggu Persetujuan ${incidentData.approval.level}\n\n` +
          `Laporan dapat di-print untuk dokumentasi.`
        );
      } else {
        alert('Gagal membuat incident report: ' + result.message);
      }
    } catch (error) {
      console.error('Error creating incident report:', error);
      alert('Gagal membuat incident report. Pastikan backend sudah running.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getVarianceBadge = (category: string) => {
    const badges = {
      none: { color: 'bg-gray-100 text-gray-600', label: 'Tidak Ada Selisih' },
      minor: { color: 'bg-blue-100 text-blue-700', label: 'Kecil' },
      moderate: { color: 'bg-yellow-100 text-yellow-700', label: 'Sedang' },
      major: { color: 'bg-red-100 text-red-700', label: 'Besar' }
    };
    const badge = badges[category as keyof typeof badges] || badges.none;
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { color: 'bg-gray-100 text-gray-700', label: 'Menunggu' },
      counted: { color: 'bg-blue-100 text-blue-700', label: 'Dihitung' },
      verified: { color: 'bg-green-100 text-green-700', label: 'Terverifikasi' },
      investigated: { color: 'bg-yellow-100 text-yellow-700', label: 'Diinvestigasi' },
      approved: { color: 'bg-purple-100 text-purple-700', label: 'Disetujui' }
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  const handleSaveOpname = async () => {
    setLoading(true);
    try {
      const countedItems = items.filter(item => item.physicalStock > 0 || item.status !== 'pending');
      
      if (countedItems.length === 0) {
        alert('Belum ada item yang dihitung!');
        setLoading(false);
        return;
      }

      if (!opnameData.warehouseId) {
        alert('Pilih gudang terlebih dahulu!');
        setLoading(false);
        return;
      }

      const opnamePayload = {
        opname_number: opnameData.opnameNumber,
        opname_type: 'full',
        warehouse_id: parseInt(opnameData.warehouseId),
        location_id: opnameData.locationId ? parseInt(opnameData.locationId) : null,
        scheduled_date: opnameData.date,
        performed_by: opnameData.performedBy,
        notes: opnameData.notes,
        items: countedItems.map(item => ({
          product_id: parseInt(item.productId),
          location_id: opnameData.locationId ? parseInt(opnameData.locationId) : null,
          system_stock: item.systemStock,
          physical_stock: item.physicalStock,
          unit_cost: item.unitCost,
          counted_by: item.countedBy,
          notes: item.notes
        }))
      };

      const response = await fetch('/api/stock-opname', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(opnamePayload)
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Stock opname berhasil disimpan!\n\nNomor: ${result.data.opname_number}\nTotal Items: ${countedItems.length}`);
        loadProducts();
      } else {
        alert('Gagal menyimpan: ' + result.message);
      }
    } catch (error) {
      console.error('Error saving stock opname:', error);
      alert('Gagal menyimpan stock opname. Pastikan backend sudah running.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdjustment = async () => {
    const itemsWithDifference = items.filter(item => item.difference !== 0);
    
    if (itemsWithDifference.length === 0) {
      alert('Tidak ada perbedaan stok yang perlu disesuaikan');
      return;
    }

    setLoading(true);
    try {
      const adjustmentItems = itemsWithDifference.map(item => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        currentStock: item.systemStock,
        newStock: item.physicalStock,
        adjustmentQuantity: item.difference,
        adjustmentType: item.difference > 0 ? 'increase' : 'decrease',
        reason: 'Stock Opname',
        notes: item.notes || `Penyesuaian dari stock opname ${opnameData.opnameNumber}`
      }));

      const adjustmentPayload = {
        date: opnameData.date,
        adjustedBy: opnameData.performedBy,
        status: 'pending',
        notes: `Adjustment dari stock opname ${opnameData.opnameNumber}`,
        items: adjustmentItems
      };

      console.log('Creating adjustment:', adjustmentPayload);
      
      alert('Adjustment berhasil dibuat!');
      router.push('/inventory/adjustment');
    } catch (error) {
      console.error('Error creating adjustment:', error);
      alert('Gagal membuat adjustment');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDifference = items.reduce((sum, item) => sum + Math.abs(item.difference), 0);
  const itemsWithDifference = items.filter(item => item.difference !== 0).length;
  const verifiedItems = items.filter(item => item.status === 'verified').length;

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-sky-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Stock Opname | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
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
                  Stock Opname
                </h1>
                <p className="text-indigo-100">
                  Lakukan penghitungan fisik stok barang
                </p>
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-xs text-indigo-200 mb-1">Total Item</p>
              <p className="text-2xl font-bold">{items.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-xs text-indigo-200 mb-1">Terverifikasi</p>
              <p className="text-2xl font-bold">{verifiedItems}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-xs text-indigo-200 mb-1">Ada Selisih</p>
              <p className="text-2xl font-bold">{itemsWithDifference}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-xs text-indigo-200 mb-1">Insiden</p>
              <p className="text-2xl font-bold">{incidents.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-xs text-indigo-200 mb-1">Total Selisih</p>
              <p className="text-lg font-bold">{totalDifference}</p>
            </div>
          </div>
        </div>

        {/* Opname Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Informasi Stock Opname</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor SO
              </label>
              <input
                type="text"
                value={opnameData.opnameNumber}
                onChange={(e) => setOpnameData({...opnameData, opnameNumber: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal
              </label>
              <input
                type="date"
                value={opnameData.date}
                onChange={(e) => setOpnameData({...opnameData, date: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gudang
              </label>
              <select
                value={opnameData.warehouseId}
                onChange={(e) => {
                  setOpnameData({...opnameData, warehouseId: e.target.value, locationId: ''});
                  setSelectedWarehouse(e.target.value);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Pilih Gudang</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lokasi/Rak
              </label>
              <select
                value={opnameData.locationId}
                onChange={(e) => setOpnameData({...opnameData, locationId: e.target.value})}
                disabled={!opnameData.warehouseId}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Pilih Lokasi</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dilakukan Oleh
              </label>
              <input
                type="text"
                value={opnameData.performedBy}
                onChange={(e) => setOpnameData({...opnameData, performedBy: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Incident Management Section */}
        {incidents.length > 0 && (
          <Card className="shadow-lg border-0 bg-gradient-to-br from-red-50 to-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FaExclamationTriangle className="mr-2 text-red-600" />
                Laporan Insiden & Penyelesaian Selisih
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {incidents.map((incident) => (
                  <div key={incident.incidentNumber} className="p-4 bg-white border border-red-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge className="bg-red-100 text-red-700">{incident.incidentNumber}</Badge>
                          <Badge className="bg-yellow-100 text-yellow-700">
                            Menunggu Persetujuan {incident.approval.level}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-gray-900">{incident.varianceItem.productName}</h3>
                        <p className="text-sm text-gray-600">SKU: {incident.varianceItem.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Nilai Selisih</p>
                        <p className="text-xl font-bold text-red-600">
                          {formatCurrency(Math.abs(incident.varianceItem.varianceValue))}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-xs text-gray-600">Selisih</p>
                        <p className="font-semibold text-red-600">
                          {incident.varianceItem.difference} unit
                        </p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-xs text-gray-600">Akar Masalah</p>
                        <p className="font-semibold text-sm truncate">
                          {incident.investigation.rootCause}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-xs text-gray-600">Dibuat</p>
                        <p className="font-semibold text-sm">
                          {new Date(incident.createdAt).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button size="sm" variant="outline">
                        <FaPrint className="mr-2" />
                        Cetak Laporan
                      </Button>
                      <Button size="sm" variant="outline">
                        <FaFileAlt className="mr-2" />
                        Lihat Detail
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari produk..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={handleSaveOpname}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <FaSave />
              <span>Simpan</span>
            </button>
            <button
              onClick={handleCreateAdjustment}
              disabled={loading || itemsWithDifference === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <FaCheck />
              <span>Buat Adjustment</span>
            </button>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lokasi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok Sistem</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok Fisik</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selisih</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
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
                      <span className="text-sm font-semibold text-gray-900">{item.systemStock} {item.uom}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={item.physicalStock || ''}
                        onChange={(e) => handlePhysicalStockChange(item.id, e.target.value)}
                        className="w-24"
                        placeholder="0"
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
                      {item.varianceValue !== 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          {formatCurrency(Math.abs(item.varianceValue))}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {item.difference !== 0 && item.status === 'counted' && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenVarianceResolution(item)}
                            className="bg-red-600 hover:bg-red-700"
                            title="Selesaikan Selisih & Buat Laporan Insiden"
                          >
                            <FaExclamationTriangle className="mr-1" />
                            Selesaikan
                          </Button>
                        )}
                        {item.status === 'counted' && item.difference === 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleVerifyItem(item.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <FaCheck className="mr-1" />
                            Verifikasi
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Variance Resolution Modal */}
      <VarianceResolutionModal
        isOpen={showVarianceModal}
        onClose={() => setShowVarianceModal(false)}
        varianceItem={selectedVarianceItem}
        onSubmit={handleIncidentSubmit}
      />
    </DashboardLayout>
  );
};

export default StockOpnamePage;
