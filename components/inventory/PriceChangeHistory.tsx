import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import {
  FaDollarSign, FaChartLine, FaInfoCircle, FaHistory,
  FaTimes, FaCalendarAlt, FaUser, FaArrowUp, FaArrowDown,
  FaExclamationTriangle, FaCheckCircle, FaEye, FaDownload
} from 'react-icons/fa';

interface PriceChange {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  oldPrice: number;
  newPrice: number;
  changeAmount: number;
  changePercentage: number;
  changeDate: string;
  changeTime: string;
  changedBy: string;
  approvedBy?: string;
  reason: string;
  type: 'increase' | 'decrease';
  impact: 'high' | 'medium' | 'low';
  affectedLocations: string[];
  salesBefore?: number;
  salesAfter?: number;
  marginBefore: number;
  marginAfter: number;
  costPrice: number;
  competitorPrice?: number;
  notes?: string;
}

interface PriceHistoryDetail {
  productId: string;
  productName: string;
  sku: string;
  currentPrice: number;
  costPrice: number;
  currentMargin: number;
  priceChanges: PriceChange[];
  totalChanges: number;
  averageChangePercentage: number;
  priceVolatility: 'stable' | 'moderate' | 'volatile';
  lastChangeDate: string;
}

interface TooltipProps {
  title: string;
  content: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ title, content, children }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64">
          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl">
            <div className="font-semibold mb-1">{title}</div>
            <div className="text-gray-300">{content}</div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-8 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface PriceChangeHistoryProps {
  productId?: string;
  showAll?: boolean;
}

const PriceChangeHistory: React.FC<PriceChangeHistoryProps> = ({ productId, showAll = true }) => {
  const { formatCurrency } = useTranslation();
  const [selectedProduct, setSelectedProduct] = useState<PriceHistoryDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterImpact, setFilterImpact] = useState<string>('all');

  // Mock data - Price Changes
  const priceChanges: PriceChange[] = [
    {
      id: 'PC001',
      productId: 'PRD001',
      productName: 'Kopi Arabica Premium 250g',
      sku: 'KOP-001',
      category: 'Minuman',
      oldPrice: 45000,
      newPrice: 50000,
      changeAmount: 5000,
      changePercentage: 11.11,
      changeDate: '2024-01-24',
      changeTime: '10:30',
      changedBy: 'Manager Toko',
      approvedBy: 'Direktur Operasional',
      reason: 'Kenaikan harga bahan baku dari supplier',
      type: 'increase',
      impact: 'high',
      affectedLocations: ['Toko Pusat', 'Cabang A', 'Cabang B'],
      salesBefore: 150,
      salesAfter: 120,
      marginBefore: 35,
      marginAfter: 42,
      costPrice: 29000,
      competitorPrice: 52000,
      notes: 'Supplier menaikkan harga 15%, disesuaikan dengan harga pasar'
    },
    {
      id: 'PC002',
      productId: 'PRD002',
      productName: 'Teh Hijau Organik',
      sku: 'TEH-001',
      category: 'Minuman',
      oldPrice: 35000,
      newPrice: 30000,
      changeAmount: -5000,
      changePercentage: -14.29,
      changeDate: '2024-01-23',
      changeTime: '14:15',
      changedBy: 'Admin',
      approvedBy: 'Manager Toko',
      reason: 'Promo clearance - stok mendekati expired',
      type: 'decrease',
      impact: 'medium',
      affectedLocations: ['Toko Pusat'],
      salesBefore: 30,
      salesAfter: 85,
      marginBefore: 40,
      marginAfter: 25,
      costPrice: 22500,
      competitorPrice: 33000,
      notes: 'Promo 2 minggu untuk mempercepat penjualan sebelum expired'
    },
    {
      id: 'PC003',
      productId: 'PRD003',
      productName: 'Gula Pasir 1kg',
      sku: 'GUL-001',
      category: 'Bahan Pokok',
      oldPrice: 14000,
      newPrice: 15500,
      changeAmount: 1500,
      changePercentage: 10.71,
      changeDate: '2024-01-22',
      changeTime: '09:00',
      changedBy: 'Manager Purchasing',
      approvedBy: 'Direktur Operasional',
      reason: 'Penyesuaian harga pasar dan inflasi',
      type: 'increase',
      impact: 'high',
      affectedLocations: ['Semua Lokasi'],
      salesBefore: 200,
      salesAfter: 180,
      marginBefore: 16.67,
      marginAfter: 22.58,
      costPrice: 12000,
      competitorPrice: 16000,
      notes: 'Harga pasar naik signifikan, disesuaikan untuk maintain margin'
    },
    {
      id: 'PC004',
      productId: 'PRD004',
      productName: 'Minyak Goreng 2L',
      sku: 'MIN-001',
      category: 'Bahan Pokok',
      oldPrice: 32000,
      newPrice: 29000,
      changeAmount: -3000,
      changePercentage: -9.38,
      changeDate: '2024-01-21',
      changeTime: '11:45',
      changedBy: 'Manager Toko',
      approvedBy: 'Manager Regional',
      reason: 'Kompetisi harga dengan toko sebelah',
      type: 'decrease',
      impact: 'medium',
      affectedLocations: ['Cabang A', 'Cabang B'],
      salesBefore: 80,
      salesAfter: 140,
      marginBefore: 28,
      marginAfter: 16,
      costPrice: 24500,
      competitorPrice: 28000,
      notes: 'Strategi untuk meningkatkan market share di area kompetitif'
    },
    {
      id: 'PC005',
      productId: 'PRD005',
      productName: 'Beras Premium 5kg',
      sku: 'BER-001',
      category: 'Bahan Pokok',
      oldPrice: 70000,
      newPrice: 75000,
      changeAmount: 5000,
      changePercentage: 7.14,
      changeDate: '2024-01-20',
      changeTime: '08:30',
      changedBy: 'Admin',
      approvedBy: 'Manager Toko',
      reason: 'Kenaikan harga supplier dan logistik',
      type: 'increase',
      impact: 'low',
      affectedLocations: ['Toko Pusat'],
      salesBefore: 50,
      salesAfter: 48,
      marginBefore: 25,
      marginAfter: 28.57,
      costPrice: 55000,
      competitorPrice: 78000,
      notes: 'Masih di bawah harga kompetitor, margin tetap sehat'
    }
  ];


  const getImpactBadge = (impact: string) => {
    const config = {
      high: { color: 'bg-red-100 text-red-700 border-red-300', label: 'Dampak Tinggi', icon: FaExclamationTriangle },
      medium: { color: 'bg-orange-100 text-orange-700 border-orange-300', label: 'Dampak Sedang', icon: FaInfoCircle },
      low: { color: 'bg-green-100 text-green-700 border-green-300', label: 'Dampak Rendah', icon: FaCheckCircle }
    };
    const impactConfig = config[impact as keyof typeof config];
    const Icon = impactConfig.icon;
    return (
      <Badge className={`${impactConfig.color} border`}>
        <Icon className="mr-1" />
        {impactConfig.label}
      </Badge>
    );
  };

  const getChangeIcon = (type: string) => {
    return type === 'increase' ? (
      <FaArrowUp className="text-red-600" />
    ) : (
      <FaArrowDown className="text-green-600" />
    );
  };

  const filteredChanges = priceChanges.filter(change => {
    const matchesType = filterType === 'all' || change.type === filterType;
    const matchesImpact = filterImpact === 'all' || change.impact === filterImpact;
    return matchesType && matchesImpact;
  });

  const stats = {
    total: priceChanges.length,
    increases: priceChanges.filter(c => c.type === 'increase').length,
    decreases: priceChanges.filter(c => c.type === 'decrease').length,
    highImpact: priceChanges.filter(c => c.impact === 'high').length
  };

  return (
    <div className="space-y-6">
      {/* Header dengan Penjelasan */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FaHistory className="text-white text-xl" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Riwayat Perubahan Harga</CardTitle>
                  <p className="text-sm text-gray-600">Tracking dan analisis perubahan harga produk</p>
                </div>
              </div>
              
              {/* Penjelasan Fungsi */}
              <div className="bg-white rounded-lg p-4 border-l-4 border-blue-600">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <FaInfoCircle className="mr-2 text-blue-600" />
                  Fungsi Riwayat Perubahan Harga:
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span><strong>Monitoring Harga:</strong> Melacak setiap perubahan harga produk dengan detail lengkap termasuk tanggal, waktu, dan user yang mengubah</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span><strong>Analisis Dampak:</strong> Mengukur dampak perubahan harga terhadap penjualan dan margin keuntungan</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span><strong>Audit Trail:</strong> Dokumentasi lengkap untuk keperluan audit dan compliance, termasuk alasan perubahan dan approval</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span><strong>Perbandingan Kompetitor:</strong> Membandingkan harga dengan kompetitor untuk strategi pricing yang optimal</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span><strong>Trend Analysis:</strong> Mengidentifikasi pola perubahan harga untuk perencanaan strategis</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats dengan Tooltip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tooltip
          title="Total Perubahan"
          content="Jumlah total perubahan harga yang tercatat dalam periode ini. Semakin banyak perubahan bisa mengindikasikan volatilitas harga atau penyesuaian strategi pricing."
        >
          <Card className="cursor-help hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Perubahan</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FaHistory className="text-blue-400 text-2xl" />
              </div>
            </CardContent>
          </Card>
        </Tooltip>

        <Tooltip
          title="Kenaikan Harga"
          content="Jumlah produk yang mengalami kenaikan harga. Biasanya disebabkan oleh kenaikan cost, inflasi, atau strategi untuk meningkatkan margin."
        >
          <Card className="cursor-help hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Kenaikan Harga</p>
                  <p className="text-2xl font-bold text-red-600">{stats.increases}</p>
                </div>
                <FaArrowUp className="text-red-400 text-2xl" />
              </div>
            </CardContent>
          </Card>
        </Tooltip>

        <Tooltip
          title="Penurunan Harga"
          content="Jumlah produk yang mengalami penurunan harga. Biasanya untuk promo, clearance, atau strategi kompetisi harga."
        >
          <Card className="cursor-help hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Penurunan Harga</p>
                  <p className="text-2xl font-bold text-green-600">{stats.decreases}</p>
                </div>
                <FaArrowDown className="text-green-400 text-2xl" />
              </div>
            </CardContent>
          </Card>
        </Tooltip>

        <Tooltip
          title="Dampak Tinggi"
          content="Perubahan harga dengan dampak signifikan terhadap penjualan atau margin. Memerlukan monitoring ketat dan evaluasi hasil."
        >
          <Card className="cursor-help hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Dampak Tinggi</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.highImpact}</p>
                </div>
                <FaExclamationTriangle className="text-orange-400 text-2xl" />
              </div>
            </CardContent>
          </Card>
        </Tooltip>
      </div>

      {/* Filters */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Filter Tipe Perubahan:
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Tipe</option>
                <option value="increase">Kenaikan Harga</option>
                <option value="decrease">Penurunan Harga</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Filter Dampak:
              </label>
              <select
                value={filterImpact}
                onChange={(e) => setFilterImpact(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Dampak</option>
                <option value="high">Dampak Tinggi</option>
                <option value="medium">Dampak Sedang</option>
                <option value="low">Dampak Rendah</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <FaDownload className="mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Changes List */}
      <div className="space-y-4">
        {filteredChanges.map((change) => (
          <Card key={change.id} className="shadow-lg border-0 hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{change.productName}</h3>
                    {getImpactBadge(change.impact)}
                    <Badge className={change.type === 'increase' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                      {getChangeIcon(change.type)}
                      <span className="ml-1">{change.type === 'increase' ? 'Naik' : 'Turun'} {Math.abs(change.changePercentage).toFixed(2)}%</span>
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">SKU: {change.sku} | Kategori: {change.category}</p>
                </div>
              </div>

              {/* Price Comparison dengan Tooltip */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <Tooltip
                  title="Harga Lama"
                  content="Harga jual sebelum perubahan. Digunakan sebagai baseline untuk menghitung persentase perubahan."
                >
                  <div className="cursor-help">
                    <p className="text-xs text-gray-500 flex items-center">
                      Harga Lama
                      <FaInfoCircle className="ml-1 text-gray-400" />
                    </p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(change.oldPrice)}</p>
                  </div>
                </Tooltip>

                <Tooltip
                  title="Harga Baru"
                  content="Harga jual setelah perubahan. Harga ini yang akan berlaku untuk transaksi selanjutnya."
                >
                  <div className="cursor-help">
                    <p className="text-xs text-gray-500 flex items-center">
                      Harga Baru
                      <FaInfoCircle className="ml-1 text-gray-400" />
                    </p>
                    <p className={`text-lg font-bold ${change.type === 'increase' ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(change.newPrice)}
                    </p>
                  </div>
                </Tooltip>

                <Tooltip
                  title="Selisih Harga"
                  content="Perbedaan absolut antara harga lama dan baru. Angka positif menunjukkan kenaikan, negatif menunjukkan penurunan."
                >
                  <div className="cursor-help">
                    <p className="text-xs text-gray-500 flex items-center">
                      Selisih
                      <FaInfoCircle className="ml-1 text-gray-400" />
                    </p>
                    <p className={`text-lg font-bold ${change.changeAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {change.changeAmount > 0 ? '+' : ''}{formatCurrency(change.changeAmount)}
                    </p>
                  </div>
                </Tooltip>

                <Tooltip
                  title="Harga Pokok"
                  content="Harga beli atau cost produk. Digunakan untuk menghitung margin keuntungan."
                >
                  <div className="cursor-help">
                    <p className="text-xs text-gray-500 flex items-center">
                      Harga Pokok
                      <FaInfoCircle className="ml-1 text-gray-400" />
                    </p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(change.costPrice)}</p>
                  </div>
                </Tooltip>

                {change.competitorPrice && (
                  <Tooltip
                    title="Harga Kompetitor"
                    content="Harga jual produk serupa di kompetitor. Digunakan untuk analisis positioning dan strategi pricing."
                  >
                    <div className="cursor-help">
                      <p className="text-xs text-gray-500 flex items-center">
                        Harga Kompetitor
                        <FaInfoCircle className="ml-1 text-gray-400" />
                      </p>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(change.competitorPrice)}</p>
                    </div>
                  </Tooltip>
                )}
              </div>

              {/* Margin Analysis dengan Tooltip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600">
                <Tooltip
                  title="Margin Sebelum"
                  content="Persentase keuntungan sebelum perubahan harga. Dihitung dari (Harga Jual - Harga Pokok) / Harga Jual × 100%"
                >
                  <div className="cursor-help">
                    <p className="text-xs text-gray-600 flex items-center">
                      Margin Sebelum
                      <FaInfoCircle className="ml-1 text-gray-400" />
                    </p>
                    <p className="text-lg font-bold text-gray-900">{change.marginBefore.toFixed(2)}%</p>
                  </div>
                </Tooltip>

                <Tooltip
                  title="Margin Sesudah"
                  content="Persentase keuntungan setelah perubahan harga. Margin yang lebih tinggi berarti keuntungan lebih besar per unit."
                >
                  <div className="cursor-help">
                    <p className="text-xs text-gray-600 flex items-center">
                      Margin Sesudah
                      <FaInfoCircle className="ml-1 text-gray-400" />
                    </p>
                    <p className={`text-lg font-bold ${change.marginAfter > change.marginBefore ? 'text-green-600' : 'text-red-600'}`}>
                      {change.marginAfter.toFixed(2)}%
                    </p>
                  </div>
                </Tooltip>

                {change.salesBefore && change.salesAfter && (
                  <>
                    <Tooltip
                      title="Penjualan Sebelum"
                      content="Rata-rata penjualan per hari sebelum perubahan harga. Digunakan untuk mengukur dampak perubahan harga terhadap volume penjualan."
                    >
                      <div className="cursor-help">
                        <p className="text-xs text-gray-600 flex items-center">
                          Sales Sebelum
                          <FaInfoCircle className="ml-1 text-gray-400" />
                        </p>
                        <p className="text-lg font-bold text-gray-900">{change.salesBefore} unit/hari</p>
                      </div>
                    </Tooltip>

                    <Tooltip
                      title="Penjualan Sesudah"
                      content="Rata-rata penjualan per hari setelah perubahan harga. Penurunan sales bisa terjadi saat harga naik, atau sebaliknya."
                    >
                      <div className="cursor-help">
                        <p className="text-xs text-gray-600 flex items-center">
                          Sales Sesudah
                          <FaInfoCircle className="ml-1 text-gray-400" />
                        </p>
                        <p className={`text-lg font-bold ${change.salesAfter > change.salesBefore ? 'text-green-600' : 'text-red-600'}`}>
                          {change.salesAfter} unit/hari
                        </p>
                      </div>
                    </Tooltip>
                  </>
                )}
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <FaCalendarAlt className="text-gray-400 mr-2" />
                    <span className="text-gray-600">Tanggal:</span>
                    <span className="font-semibold text-gray-900 ml-2">{change.changeDate} {change.changeTime}</span>
                  </div>
                  <div className="flex items-center">
                    <FaUser className="text-gray-400 mr-2" />
                    <span className="text-gray-600">Diubah oleh:</span>
                    <span className="font-semibold text-gray-900 ml-2">{change.changedBy}</span>
                  </div>
                  {change.approvedBy && (
                    <div className="flex items-center">
                      <FaCheckCircle className="text-green-500 mr-2" />
                      <span className="text-gray-600">Disetujui oleh:</span>
                      <span className="font-semibold text-gray-900 ml-2">{change.approvedBy}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Lokasi Terdampak:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {change.affectedLocations.map((loc, idx) => (
                        <Badge key={idx} className="bg-gray-100 text-gray-700">
                          {loc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason & Notes */}
              <div className="space-y-3">
                <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                  <p className="text-sm">
                    <span className="font-semibold text-yellow-900">Alasan Perubahan:</span>
                    <span className="text-yellow-700 ml-2">{change.reason}</span>
                  </p>
                </div>
                {change.notes && (
                  <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <p className="text-sm">
                      <span className="font-semibold text-blue-900">Catatan:</span>
                      <span className="text-blue-700 ml-2">{change.notes}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-2 mt-4">
                <Button size="sm" variant="outline">
                  <FaEye className="mr-2" />
                  Lihat Detail Lengkap
                </Button>
                <Button size="sm" variant="outline">
                  <FaChartLine className="mr-2" />
                  Analisis Dampak
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Legend / Penjelasan Istilah */}
      <Card className="shadow-lg border-0 bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <FaInfoCircle className="mr-2 text-blue-600" />
            Penjelasan Istilah & Metrik
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Metrik Harga:</h4>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Harga Lama:</strong> Harga jual sebelum perubahan</li>
                <li><strong>Harga Baru:</strong> Harga jual setelah perubahan</li>
                <li><strong>Selisih:</strong> Perbedaan absolut (Harga Baru - Harga Lama)</li>
                <li><strong>Persentase:</strong> (Selisih / Harga Lama) × 100%</li>
                <li><strong>Harga Pokok:</strong> Cost atau harga beli produk</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Metrik Performa:</h4>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Margin:</strong> (Harga Jual - Harga Pokok) / Harga Jual × 100%</li>
                <li><strong>Sales Before/After:</strong> Rata-rata penjualan per hari</li>
                <li><strong>Dampak Tinggi:</strong> Perubahan {'>'} 10% atau produk fast-moving</li>
                <li><strong>Dampak Sedang:</strong> Perubahan 5-10%</li>
                <li><strong>Dampak Rendah:</strong> Perubahan {'<'} 5%</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PriceChangeHistory;
