import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import {
  FaExclamationTriangle, FaExclamationCircle, FaInfoCircle,
  FaCalendarAlt, FaBoxes, FaDollarSign, FaLightbulb,
  FaTimes, FaChevronDown, FaChevronUp, FaBell
} from 'react-icons/fa';

interface ExpiryAlert {
  id: string;
  productName: string;
  sku: string;
  batchNumber: string;
  expiryDate: string;
  daysUntilExpiry: number;
  quantity: number;
  unit: string;
  location: string;
  severity: 'critical' | 'warning' | 'info';
  suggestedAction: string;
}

interface OverstockAlert {
  id: string;
  productName: string;
  sku: string;
  currentStock: number;
  averageSales: number;
  daysOfStock: number;
  unit: string;
  location: string;
  severity: 'high' | 'medium';
  suggestedAction: string;
  potentialLoss?: number;
}

interface PriceChangeAlert {
  id: string;
  productName: string;
  sku: string;
  oldPrice: number;
  newPrice: number;
  changePercentage: number;
  changeDate: string;
  changedBy: string;
  reason?: string;
  type: 'increase' | 'decrease';
}

interface PricingSuggestion {
  id: string;
  productName: string;
  sku: string;
  currentPrice: number;
  costPrice: number;
  currentMargin: number;
  suggestedPrice: number;
  suggestedMargin: number;
  reason: string;
  competitorPrice?: number;
  averageMarketPrice?: number;
  salesTrend: 'increasing' | 'stable' | 'decreasing';
}

interface InventoryAlertsProps {
  showInDashboard?: boolean;
}

const InventoryAlerts: React.FC<InventoryAlertsProps> = ({ showInDashboard = false }) => {
  const { t, formatCurrency } = useTranslation();
  const [expandedSection, setExpandedSection] = useState<string | null>('expiry');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State untuk data dari API
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([]);
  const [overstockAlerts, setOverstockAlerts] = useState<OverstockAlert[]>([]);
  const [priceChangeAlerts, setPriceChangeAlerts] = useState<PriceChangeAlert[]>([]);
  const [pricingSuggestions, setPricingSuggestions] = useState<PricingSuggestion[]>([]);

  // Fetch data dari API saat component mount
  useEffect(() => {
    fetchAlertsData();
  }, []);

  const fetchAlertsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch expiry alerts dari API
      try {
        const expiryRes = await fetch('/api/inventory/expiry?daysUntil=30');
        const expiryData = await expiryRes.json();
        
        if (expiryData.success && expiryData.data) {
          const mappedExpiry = expiryData.data.map((item: any) => ({
            id: item.id || `EXP-${item.product_id}`,
            productName: item.product_name || item.name,
            sku: item.sku || 'N/A',
            batchNumber: item.batch_number || 'N/A',
            expiryDate: item.expiry_date || item.expiry,
            daysUntilExpiry: item.days_until_expiry || 0,
            quantity: item.quantity || 0,
            unit: item.unit || 'pcs',
            location: item.location || 'Toko Pusat',
            severity: item.days_until_expiry <= 3 ? 'critical' : item.days_until_expiry <= 7 ? 'warning' : 'info',
            suggestedAction: item.days_until_expiry <= 3 
              ? 'Diskon 30% atau return ke supplier'
              : item.days_until_expiry <= 7
              ? 'Promo buy 1 get 1 atau diskon 20%'
              : 'Monitor penjualan, transfer ke cabang jika perlu'
          }));
          setExpiryAlerts(mappedExpiry);
        } else {
          setExpiryAlerts([]);
        }
      } catch (err) {
        console.warn('Expiry API error:', err);
        setExpiryAlerts([]);
      }

      // Fetch overstock dari API baru
      try {
        const overstockRes = await fetch('/api/inventory/overstock?limit=10');
        const overstockData = await overstockRes.json();
        
        if (overstockData.success && overstockData.data) {
          const mappedOverstock = overstockData.data.map((item: any) => ({
            id: item.id,
            productName: item.product_name,
            sku: item.sku,
            currentStock: item.current_stock,
            averageSales: item.average_sales,
            daysOfStock: item.days_of_stock,
            unit: item.unit,
            location: item.location,
            severity: item.severity,
            suggestedAction: item.suggested_action,
            potentialLoss: item.potential_loss
          }));
          setOverstockAlerts(mappedOverstock);
        } else {
          setOverstockAlerts([]);
        }
      } catch (err) {
        console.warn('Overstock API error:', err);
        setOverstockAlerts([]);
      }

      // Fetch price changes dari API baru
      try {
        const priceChangesRes = await fetch('/api/inventory/price-changes?limit=10&days=7');
        const priceChangesData = await priceChangesRes.json();
        
        if (priceChangesData.success && priceChangesData.data) {
          const mappedPriceChanges = priceChangesData.data.map((item: any) => ({
            id: item.id,
            productName: item.product_name,
            sku: item.sku,
            oldPrice: item.old_price,
            newPrice: item.new_price,
            changePercentage: item.change_percentage,
            changeDate: item.change_date,
            changedBy: item.changed_by || 'System',
            reason: item.change_reason,
            type: item.change_type
          }));
          setPriceChangeAlerts(mappedPriceChanges);
        } else {
          setPriceChangeAlerts([]);
        }
      } catch (err) {
        console.warn('Price changes API error:', err);
        setPriceChangeAlerts([]);
      }

      // Fetch pricing suggestions dari API baru
      try {
        const suggestionsRes = await fetch('/api/inventory/pricing-suggestions?limit=10');
        const suggestionsData = await suggestionsRes.json();
        
        if (suggestionsData.success && suggestionsData.data) {
          const mappedSuggestions = suggestionsData.data.map((item: any) => ({
            id: item.id,
            productName: item.product_name,
            sku: item.sku,
            currentPrice: item.current_price,
            costPrice: item.cost_price || 0,
            currentMargin: parseFloat(item.current_margin) || 0,
            suggestedPrice: item.suggested_price,
            suggestedMargin: parseFloat(item.suggested_margin) || 0,
            reason: item.reason,
            competitorPrice: item.competitor_price,
            averageMarketPrice: item.market_price,
            salesTrend: item.sales_trend || 'stable'
          }));
          setPricingSuggestions(mappedSuggestions);
        } else {
          setPricingSuggestions([]);
        }
      } catch (err) {
        console.warn('Pricing suggestions API error:', err);
        setPricingSuggestions([]);
      }
      
    } catch (err) {
      console.error('Error fetching alerts data:', err);
      // Set empty arrays jika terjadi error
      setExpiryAlerts([]);
      setOverstockAlerts([]);
      setPriceChangeAlerts([]);
      setPricingSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Mock data sebagai fallback
  const mockExpiryAlerts: ExpiryAlert[] = [
    {
      id: 'EXP001',
      productName: 'Susu UHT 1L',
      sku: 'SUS-001',
      batchNumber: 'BATCH-2024-001',
      expiryDate: '2024-01-26',
      daysUntilExpiry: 2,
      quantity: 50,
      unit: 'pcs',
      location: 'Toko Pusat',
      severity: 'critical',
      suggestedAction: 'Diskon 30% atau return ke supplier'
    },
    {
      id: 'EXP002',
      productName: 'Roti Tawar',
      sku: 'ROT-001',
      batchNumber: 'BATCH-2024-015',
      expiryDate: '2024-01-28',
      daysUntilExpiry: 4,
      quantity: 30,
      unit: 'pcs',
      location: 'Toko Cabang A',
      severity: 'warning',
      suggestedAction: 'Promo buy 1 get 1 atau diskon 20%'
    },
    {
      id: 'EXP003',
      productName: 'Yogurt 200ml',
      sku: 'YOG-001',
      batchNumber: 'BATCH-2024-020',
      expiryDate: '2024-02-05',
      daysUntilExpiry: 12,
      quantity: 100,
      unit: 'pcs',
      location: 'Gudang Pusat',
      severity: 'info',
      suggestedAction: 'Monitor penjualan, transfer ke cabang jika perlu'
    }
  ];

  const mockOverstockAlerts: OverstockAlert[] = [
    {
      id: 'OVR001',
      productName: 'Minyak Goreng 2L',
      sku: 'MIN-001',
      currentStock: 500,
      averageSales: 20,
      daysOfStock: 25,
      unit: 'pcs',
      location: 'Gudang Pusat',
      severity: 'high',
      suggestedAction: 'Kurangi order, distribusi ke cabang, atau promo',
      potentialLoss: 2000000
    },
    {
      id: 'OVR002',
      productName: 'Gula Pasir 1kg',
      sku: 'GUL-001',
      currentStock: 300,
      averageSales: 25,
      daysOfStock: 12,
      unit: 'pcs',
      location: 'Toko Pusat',
      severity: 'medium',
      suggestedAction: 'Monitor, pertimbangkan promo jika tidak bergerak'
    }
  ];

  // Mock data untuk price changes (sementara)
  const mockPriceChangeAlerts: PriceChangeAlert[] = [
    {
      id: 'PRC001',
      productName: 'Kopi Arabica Premium 250g',
      sku: 'KOP-001',
      oldPrice: 45000,
      newPrice: 50000,
      changePercentage: 11.11,
      changeDate: '2024-01-24',
      changedBy: 'Manager Toko',
      reason: 'Kenaikan harga supplier',
      type: 'increase'
    },
    {
      id: 'PRC002',
      productName: 'Teh Hijau Organik',
      sku: 'TEH-001',
      oldPrice: 35000,
      newPrice: 30000,
      changePercentage: -14.29,
      changeDate: '2024-01-23',
      changedBy: 'Admin',
      reason: 'Promo clearance',
      type: 'decrease'
    }
  ];

  // Mock data untuk pricing suggestions (sementara)
  const mockPricingSuggestions: PricingSuggestion[] = [
    {
      id: 'SUG001',
      productName: 'Beras Premium 5kg',
      sku: 'BER-001',
      currentPrice: 75000,
      costPrice: 60000,
      currentMargin: 25,
      suggestedPrice: 82000,
      suggestedMargin: 36.67,
      reason: 'Harga kompetitor lebih tinggi, margin bisa ditingkatkan',
      competitorPrice: 85000,
      averageMarketPrice: 80000,
      salesTrend: 'stable'
    },
    {
      id: 'SUG002',
      productName: 'Snack Keripik',
      sku: 'SNK-001',
      currentPrice: 15000,
      costPrice: 10000,
      currentMargin: 50,
      suggestedPrice: 13500,
      suggestedMargin: 35,
      reason: 'Penjualan menurun, turunkan harga untuk boost sales',
      competitorPrice: 12000,
      averageMarketPrice: 13000,
      salesTrend: 'decreasing'
    },
    {
      id: 'SUG003',
      productName: 'Air Mineral 600ml',
      sku: 'AIR-001',
      currentPrice: 3000,
      costPrice: 2000,
      currentMargin: 50,
      suggestedPrice: 3500,
      suggestedMargin: 75,
      reason: 'Produk fast moving, demand tinggi, bisa naikkan harga',
      competitorPrice: 3500,
      averageMarketPrice: 3200,
      salesTrend: 'increasing'
    }
  ];


  const getSeverityBadge = (severity: string) => {
    const config = {
      critical: { color: 'bg-red-100 text-red-700 border-red-300', label: 'Kritis', icon: FaExclamationTriangle },
      warning: { color: 'bg-orange-100 text-orange-700 border-orange-300', label: 'Peringatan', icon: FaExclamationCircle },
      info: { color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Info', icon: FaInfoCircle },
      high: { color: 'bg-red-100 text-red-700 border-red-300', label: 'Tinggi', icon: FaExclamationTriangle },
      medium: { color: 'bg-orange-100 text-orange-700 border-orange-300', label: 'Sedang', icon: FaExclamationCircle }
    };
    const severityConfig = config[severity as keyof typeof config];
    const Icon = severityConfig.icon;
    return (
      <Badge className={`${severityConfig.color} border`}>
        <Icon className="mr-1" />
        {severityConfig.label}
      </Badge>
    );
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return '📈';
    if (trend === 'decreasing') return '📉';
    return '➡️';
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const criticalCount = expiryAlerts.filter(a => a.severity === 'critical').length;
  const overstockCount = overstockAlerts.filter(a => a.severity === 'high').length;
  const priceChangeCount = priceChangeAlerts.length;
  const suggestionCount = pricingSuggestions.length;

  if (showInDashboard) {
    // Loading state
    if (loading) {
      return (
        <div className="space-y-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="ml-3 text-gray-600">Memuat alerts...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Critical Alerts Summary */}
        {criticalCount > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-red-500 text-xl mr-3" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Perhatian! {criticalCount} Produk Kritis</h3>
                <p className="text-sm text-red-700">Produk akan expired dalam 2-3 hari. Tindakan segera diperlukan.</p>
              </div>
              <Button size="sm" className="bg-red-600 hover:bg-red-700">
                Lihat Detail
              </Button>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border-2 border-red-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Near Expiry</p>
                <p className="text-2xl font-bold text-red-600">{expiryAlerts.length}</p>
              </div>
              <FaCalendarAlt className="text-red-400 text-2xl" />
            </div>
          </div>
          <div className="bg-white border-2 border-orange-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Overstock</p>
                <p className="text-2xl font-bold text-orange-600">{overstockAlerts.length}</p>
              </div>
              <FaBoxes className="text-orange-400 text-2xl" />
            </div>
          </div>
          <div className="bg-white border-2 border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Price Changes</p>
                <p className="text-2xl font-bold text-blue-600">{priceChangeCount}</p>
              </div>
              <FaDollarSign className="text-blue-400 text-2xl" />
            </div>
          </div>
          <div className="bg-white border-2 border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Suggestions</p>
                <p className="text-2xl font-bold text-green-600">{suggestionCount}</p>
              </div>
              <FaLightbulb className="text-green-400 text-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Expiry Alerts */}
      <Card className="shadow-lg border-0">
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection('expiry')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <FaCalendarAlt className="text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Alert Produk Mendekati Expired</CardTitle>
                <p className="text-sm text-gray-600">{expiryAlerts.length} produk perlu perhatian</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {criticalCount > 0 && (
                <Badge className="bg-red-100 text-red-700">
                  {criticalCount} Kritis
                </Badge>
              )}
              {expandedSection === 'expiry' ? <FaChevronUp /> : <FaChevronDown />}
            </div>
          </div>
        </CardHeader>
        {expandedSection === 'expiry' && (
          <CardContent>
            {expiryAlerts.length === 0 ? (
              <div className="text-center py-8">
                <FaCalendarAlt className="mx-auto text-4xl text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium">Belum ada produk yang mendekati expired</p>
                <p className="text-sm text-gray-500 mt-1">Data akan muncul ketika ada produk dengan tanggal kadaluarsa dalam 30 hari</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expiryAlerts.map((alert) => (
                <div key={alert.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-red-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{alert.productName}</h4>
                        {getSeverityBadge(alert.severity)}
                      </div>
                      <p className="text-sm text-gray-600">SKU: {alert.sku} | Batch: {alert.batchNumber}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">Tanggal ED</p>
                      <p className="font-semibold text-red-600">{alert.expiryDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Sisa Hari</p>
                      <p className="font-semibold text-gray-900">{alert.daysUntilExpiry} hari</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Quantity</p>
                      <p className="font-semibold text-gray-900">{alert.quantity} {alert.unit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Lokasi</p>
                      <p className="font-semibold text-gray-900">{alert.location}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <FaLightbulb className="text-blue-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900">Saran Tindakan:</p>
                      <p className="text-sm text-blue-700">{alert.suggestedAction}</p>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Overstock Alerts */}
      <Card className="shadow-lg border-0">
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection('overstock')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <FaBoxes className="text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Alert Overstock</CardTitle>
                <p className="text-sm text-gray-600">{overstockAlerts.length} produk stok berlebih</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {overstockCount > 0 && (
                <Badge className="bg-orange-100 text-orange-700">
                  {overstockCount} Tinggi
                </Badge>
              )}
              {expandedSection === 'overstock' ? <FaChevronUp /> : <FaChevronDown />}
            </div>
          </div>
        </CardHeader>
        {expandedSection === 'overstock' && (
          <CardContent>
            {overstockAlerts.length === 0 ? (
              <div className="text-center py-8">
                <FaBoxes className="mx-auto text-4xl text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium">Belum ada produk overstock</p>
                <p className="text-sm text-gray-500 mt-1">Data akan muncul ketika stok produk melebihi batas maksimum</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overstockAlerts.map((alert) => (
                <div key={alert.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{alert.productName}</h4>
                        {getSeverityBadge(alert.severity)}
                      </div>
                      <p className="text-sm text-gray-600">SKU: {alert.sku} | {alert.location}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">Stok Saat Ini</p>
                      <p className="font-semibold text-orange-600">{alert.currentStock} {alert.unit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Rata-rata Penjualan</p>
                      <p className="font-semibold text-gray-900">{alert.averageSales} {alert.unit}/hari</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Days of Stock</p>
                      <p className="font-semibold text-gray-900">{alert.daysOfStock} hari</p>
                    </div>
                    {alert.potentialLoss && (
                      <div>
                        <p className="text-xs text-gray-500">Potensi Kerugian</p>
                        <p className="font-semibold text-red-600">{formatCurrency(alert.potentialLoss)}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-start space-x-2 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <FaLightbulb className="text-blue-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900">Saran Tindakan:</p>
                      <p className="text-sm text-blue-700">{alert.suggestedAction}</p>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Price Change Alerts */}
      <Card className="shadow-lg border-0">
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection('priceChange')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaDollarSign className="text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Riwayat Perubahan Harga</CardTitle>
                <p className="text-sm text-gray-600">{priceChangeCount} perubahan harga terbaru</p>
              </div>
            </div>
            {expandedSection === 'priceChange' ? <FaChevronUp /> : <FaChevronDown />}
          </div>
        </CardHeader>
        {expandedSection === 'priceChange' && (
          <CardContent>
            {priceChangeAlerts.length === 0 ? (
              <div className="text-center py-8">
                <FaDollarSign className="mx-auto text-4xl text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium">Belum ada riwayat perubahan harga</p>
                <p className="text-sm text-gray-500 mt-1">Data akan muncul ketika ada perubahan harga produk dalam 7 hari terakhir</p>
              </div>
            ) : (
              <div className="space-y-3">
                {priceChangeAlerts.map((alert) => (
                <div key={alert.id} className="border-2 border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{alert.productName}</h4>
                      <p className="text-sm text-gray-600">SKU: {alert.sku}</p>
                    </div>
                    <Badge className={alert.type === 'increase' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                      {alert.type === 'increase' ? '↑' : '↓'} {Math.abs(alert.changePercentage).toFixed(2)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">Harga Lama</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(alert.oldPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Harga Baru</p>
                      <p className={`font-semibold ${alert.type === 'increase' ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(alert.newPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tanggal</p>
                      <p className="font-semibold text-gray-900">{alert.changeDate}</p>
                    </div>
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-600">Diubah oleh: <span className="font-semibold">{alert.changedBy}</span></p>
                    {alert.reason && (
                      <p className="text-gray-600">Alasan: <span className="font-semibold">{alert.reason}</span></p>
                    )}
                  </div>
                </div>
              ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Pricing Suggestions */}
      <Card className="shadow-lg border-0">
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection('pricing')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FaLightbulb className="text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Saran Penetapan Harga Jual</CardTitle>
                <p className="text-sm text-gray-600">{suggestionCount} saran optimasi harga</p>
              </div>
            </div>
            {expandedSection === 'pricing' ? <FaChevronUp /> : <FaChevronDown />}
          </div>
        </CardHeader>
        {expandedSection === 'pricing' && (
          <CardContent>
            {pricingSuggestions.length === 0 ? (
              <div className="text-center py-8">
                <FaLightbulb className="mx-auto text-4xl text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium">Belum ada saran penetapan harga</p>
                <p className="text-sm text-gray-500 mt-1">Sistem akan memberikan saran harga berdasarkan margin dan tren penjualan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pricingSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{suggestion.productName}</h4>
                        <span className="text-lg">{getTrendIcon(suggestion.salesTrend)}</span>
                      </div>
                      <p className="text-sm text-gray-600">SKU: {suggestion.sku}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">Harga Saat Ini</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(suggestion.currentPrice)}</p>
                      <p className="text-xs text-gray-500">Margin: {suggestion.currentMargin.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Harga Disarankan</p>
                      <p className="font-semibold text-green-600">{formatCurrency(suggestion.suggestedPrice)}</p>
                      <p className="text-xs text-green-600">Margin: {suggestion.suggestedMargin.toFixed(1)}%</p>
                    </div>
                    {suggestion.competitorPrice && (
                      <div>
                        <p className="text-xs text-gray-500">Harga Kompetitor</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(suggestion.competitorPrice)}</p>
                      </div>
                    )}
                    {suggestion.averageMarketPrice && (
                      <div>
                        <p className="text-xs text-gray-500">Harga Pasar</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(suggestion.averageMarketPrice)}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-start space-x-2 p-3 bg-green-50 border-l-4 border-green-500 rounded mb-3">
                    <FaLightbulb className="text-green-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-900">Alasan:</p>
                      <p className="text-sm text-green-700">{suggestion.reason}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      Terapkan Harga
                    </Button>
                    <Button size="sm" variant="outline">
                      Lihat Detail
                    </Button>
                  </div>
                </div>
              ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default InventoryAlerts;
