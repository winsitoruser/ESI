import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/lib/i18n';
import { 
  FaBox, FaTag, FaWarehouse, FaEdit, FaTrash, FaChartLine, 
  FaHistory, FaShoppingCart, FaBoxes, FaArrowUp, FaArrowDown,
  FaCalendar, FaDollarSign, FaBarcode, FaInfoCircle, FaTruck,
  FaMapMarkerAlt, FaClock, FaExclamationTriangle
} from 'react-icons/fa';

export interface ProductDetail {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit?: string;
  supplier: string;
  description?: string;
  status: 'active' | 'inactive';
}

interface ProductDetailsData {
  product: any;
  stock: {
    total: number;
    by_location: any[];
    batches: any[];
  };
  purchase_history: any[];
  last_order: any;
  avg_purchase_price: number;
  stock_movements: any[];
  movement_stats: {
    total_in: number;
    total_out: number;
    total_movements: number;
  };
}

interface ProductDetailModalProps {
  product: ProductDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (product: ProductDetail) => void;
  onDelete?: (productId: string) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  const { t, formatCurrency, formatDate } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [detailsData, setDetailsData] = useState<ProductDetailsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      fetchProductDetails();
    }
  }, [isOpen, product]);

  const fetchProductDetails = async () => {
    if (!product) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${product.id}/details`);
      const data = await response.json();
      if (data.success) {
        setDetailsData(data.data);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  const formatDateTime = (date: string) => {
    return formatDate(date, 'datetime');
  };

  const profitMargin = ((product.price - product.cost) / product.price * 100).toFixed(1);
  const stockStatus = product.stock <= product.minStock ? 'low' : 'normal';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                <FaBox className="text-white text-2xl" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">{product.name}</DialogTitle>
                <div className="flex items-center space-x-3 mt-1">
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <FaBarcode className="text-gray-400" />
                    <span>SKU: {product.sku}</span>
                  </div>
                  <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                    {product.status === 'active' ? t('inventory.active') : t('inventory.productDetail.inactive')}
                  </Badge>
                  <Badge variant={stockStatus === 'low' ? 'destructive' : 'default'}>
                    {stockStatus === 'low' ? t('inventory.statusLow') : t('inventory.statusNormal')}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <FaInfoCircle />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="stock" className="flex items-center space-x-2">
                <FaBoxes />
                <span>Stok & Batch</span>
              </TabsTrigger>
              <TabsTrigger value="movements" className="flex items-center space-x-2">
                <FaChartLine />
                <span>Pergerakan</span>
              </TabsTrigger>
              <TabsTrigger value="purchases" className="flex items-center space-x-2">
                <FaShoppingCart />
                <span>Riwayat Beli</span>
              </TabsTrigger>
              <TabsTrigger value="supplier" className="flex items-center space-x-2">
                <FaTruck />
                <span>Supplier</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <FaDollarSign className="text-green-600" />
                    <span className="text-sm text-green-700 font-medium">{t('inventory.sellingPrice')}</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(product.price)}
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <FaDollarSign className="text-blue-600" />
                    <span className="text-sm text-blue-700 font-medium">{t('inventory.productDetail.costPrice')}</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(product.cost)}
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <FaChartLine className="text-purple-600" />
                    <span className="text-sm text-purple-700 font-medium">Margin</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">{profitMargin}%</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <FaBox className="text-orange-600" />
                    <span className="text-sm text-orange-700 font-medium">{t('inventory.productDetail.totalStock')}</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-700">{product.stock} {product.unit || 'pcs'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                    <FaTag className="text-purple-600" />
                    <span>{t('inventory.productDetail.productInfo')}</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('inventory.category')}</span>
                      <span className="text-sm font-medium text-gray-900">{product.category || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('inventory.productDetail.unit')}</span>
                      <span className="text-sm font-medium text-gray-900">{product.unit || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('inventory.productDetail.minStock')}</span>
                      <span className="text-sm font-medium text-gray-900">{product.minStock || 0}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-sm text-gray-600">{t('common.status')}</span>
                      <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                        {product.status === 'active' ? t('inventory.active') : t('inventory.productDetail.inactive')}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                    <FaWarehouse className="text-orange-600" />
                    <span>Supplier</span>
                  </h4>
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin h-8 w-8 mx-auto border-4 border-blue-600 border-t-transparent rounded-full"></div>
                    </div>
                  ) : detailsData?.product?.supplier ? (
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">{t('inventory.productDetail.name')}</span>
                        <span className="text-sm font-medium text-gray-900">{detailsData.product.supplier.name}</span>
                      </div>
                      {detailsData.product.supplier.contact_person && (
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">{t('inventory.productDetail.contact')}</span>
                          <span className="text-sm font-medium text-gray-900">{detailsData.product.supplier.contact_person}</span>
                        </div>
                      )}
                      {detailsData.product.supplier.phone && (
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">Telepon</span>
                          <span className="text-sm font-medium text-gray-900">{detailsData.product.supplier.phone}</span>
                        </div>
                      )}
                      {detailsData.avg_purchase_price > 0 && (
                        <div className="flex justify-between py-2">
                          <span className="text-sm text-gray-600">{t('inventory.productDetail.avgPrice')}</span>
                          <span className="text-sm font-medium text-green-600">{formatCurrency(detailsData.avg_purchase_price)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">{t('inventory.productDetail.noSupplier')}</p>
                  )}
                </div>
              </div>

              {product.description && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">{t('inventory.productDetail.description')}</h4>
                  <p className="text-sm text-gray-700">{product.description}</p>
                </div>
              )}
            </TabsContent>

            {/* Stock & Batch Tab */}
            <TabsContent value="stock" className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-12 w-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
                  <p className="text-gray-600">{t('inventory.loading')}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <FaBoxes className="text-blue-600" />
                        <span className="text-sm text-blue-700 font-medium">Total Stok</span>
                      </div>
                      <p className="text-3xl font-bold text-blue-700">{detailsData?.stock?.total || 0}</p>
                      <p className="text-xs text-blue-600 mt-1">{product.unit || 'pcs'}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <FaMapMarkerAlt className="text-green-600" />
                        <span className="text-sm text-green-700 font-medium">Lokasi</span>
                      </div>
                      <p className="text-3xl font-bold text-green-700">{detailsData?.stock?.by_location?.length || 0}</p>
                      <p className="text-xs text-green-600 mt-1">lokasi berbeda</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <FaBox className="text-purple-600" />
                        <span className="text-sm text-purple-700 font-medium">Batch</span>
                      </div>
                      <p className="text-3xl font-bold text-purple-700">{detailsData?.stock?.batches?.length || 0}</p>
                      <p className="text-xs text-purple-600 mt-1">batch aktif</p>
                    </div>
                  </div>

                  {/* Stock by Location */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-4 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                        <FaMapMarkerAlt className="text-blue-600" />
                        <span>Stok per Lokasi</span>
                      </h4>
                    </div>
                    <div className="p-4">
                      {detailsData?.stock?.by_location && detailsData.stock.by_location.length > 0 ? (
                        <div className="space-y-2">
                          {detailsData.stock.by_location.map((loc: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <FaWarehouse className="text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">Lokasi {loc.location_id || 'Default'}</p>
                                  {loc.batch_number && (
                                    <p className="text-xs text-gray-500">Batch: {loc.batch_number}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-gray-900">{loc.quantity} {product.unit || 'pcs'}</p>
                                {loc.expiry_date && (
                                  <p className="text-xs text-orange-600 flex items-center space-x-1">
                                    <FaCalendar />
                                    <span>Exp: {formatDate(loc.expiry_date)}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-4">Tidak ada data stok</p>
                      )}
                    </div>
                  </div>

                  {/* Batches */}
                  {detailsData?.stock?.batches && detailsData.stock.batches.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                      <div className="p-4 border-b border-gray-200">
                        <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                          <FaBox className="text-purple-600" />
                          <span>Informasi Batch</span>
                        </h4>
                      </div>
                      <div className="p-4">
                        <div className="space-y-2">
                          {detailsData.stock.batches.map((batch: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">Batch: {batch.batch_number}</p>
                                <p className="text-sm text-gray-600">Lokasi: {batch.location_id || 'Default'}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-gray-900">{batch.quantity} {product.unit || 'pcs'}</p>
                                {batch.expiry_date && (
                                  <p className="text-xs text-orange-600">Exp: {formatDate(batch.expiry_date)}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Stock Movements Tab */}
            <TabsContent value="movements" className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-12 w-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
                  <p className="text-gray-600">Memuat pergerakan stok...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <FaArrowUp className="text-green-600" />
                        <span className="text-sm text-green-700 font-medium">Stok Masuk</span>
                      </div>
                      <p className="text-3xl font-bold text-green-700">{detailsData?.movement_stats?.total_in || 0}</p>
                      <p className="text-xs text-green-600 mt-1">30 hari terakhir</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <FaArrowDown className="text-red-600" />
                        <span className="text-sm text-red-700 font-medium">Stok Keluar</span>
                      </div>
                      <p className="text-3xl font-bold text-red-700">{detailsData?.movement_stats?.total_out || 0}</p>
                      <p className="text-xs text-red-600 mt-1">30 hari terakhir</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <FaHistory className="text-blue-600" />
                        <span className="text-sm text-blue-700 font-medium">Total Transaksi</span>
                      </div>
                      <p className="text-3xl font-bold text-blue-700">{detailsData?.movement_stats?.total_movements || 0}</p>
                      <p className="text-xs text-blue-600 mt-1">pergerakan</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-4 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                        <FaHistory className="text-blue-600" />
                        <span>Riwayat Pergerakan Stok (30 Hari Terakhir)</span>
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      {detailsData?.stock_movements && detailsData.stock_movements.length > 0 ? (
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipe</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Jumlah</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Referensi</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Catatan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {detailsData.stock_movements.map((movement: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  <div className="flex items-center space-x-1">
                                    <FaClock className="text-gray-400" />
                                    <span>{formatDateTime(movement.created_at)}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant={movement.movement_type === 'in' ? 'default' : 'destructive'}>
                                    {movement.movement_type === 'in' ? (
                                      <><FaArrowUp className="mr-1" /> Masuk</>
                                    ) : (
                                      <><FaArrowDown className="mr-1" /> Keluar</>
                                    )}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`font-semibold ${movement.movement_type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                    {movement.movement_type === 'in' ? '+' : '-'}{Math.abs(movement.quantity)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {movement.reference_type || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {movement.notes || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FaHistory className="mx-auto text-4xl text-gray-300 mb-2" />
                          <p>Tidak ada riwayat pergerakan stok</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Purchase History Tab */}
            <TabsContent value="purchases" className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-12 w-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
                  <p className="text-gray-600">Memuat riwayat pembelian...</p>
                </div>
              ) : (
                <>
                  {detailsData?.last_order && (
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-700 font-medium mb-1">Pesanan Terakhir</p>
                          <p className="text-2xl font-bold text-blue-900">{formatDate(detailsData.last_order.order_date)}</p>
                          <p className="text-sm text-blue-600 mt-1">PO: {detailsData.last_order.po_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-blue-700 mb-1">Jumlah</p>
                          <p className="text-2xl font-bold text-blue-900">{detailsData.last_order.quantity} {product.unit || 'pcs'}</p>
                          <p className="text-sm text-blue-600 mt-1">{formatCurrency(detailsData.last_order.unit_price)}/unit</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-4 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                        <FaShoppingCart className="text-green-600" />
                        <span>Riwayat Pembelian</span>
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      {detailsData?.purchase_history && detailsData.purchase_history.length > 0 ? (
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No. PO</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Supplier</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Qty</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Harga/Unit</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Subtotal</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {detailsData.purchase_history.map((purchase: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-blue-600">{purchase.po_number}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(purchase.order_date)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{purchase.supplier_name || '-'}</td>
                                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{purchase.quantity}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(purchase.unit_price)}</td>
                                <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">{formatCurrency(purchase.subtotal)}</td>
                                <td className="px-4 py-3 text-center">
                                  <Badge variant={
                                    purchase.status === 'completed' ? 'default' :
                                    purchase.status === 'pending' ? 'secondary' : 'destructive'
                                  }>
                                    {purchase.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FaShoppingCart className="mx-auto text-4xl text-gray-300 mb-2" />
                          <p>Tidak ada riwayat pembelian</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {(detailsData?.avg_purchase_price ?? 0) > 0 && (
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FaDollarSign className="text-green-600 text-xl" />
                          <span className="font-semibold text-green-900">{t('inventory.productDetail.avgPrice')}</span>
                        </div>
                        <p className="text-2xl font-bold text-green-700">{formatCurrency(detailsData?.avg_purchase_price ?? 0)}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Supplier Tab */}
            <TabsContent value="supplier" className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-12 w-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
                  <p className="text-gray-600">Memuat data supplier...</p>
                </div>
              ) : detailsData?.product?.supplier ? (
                <>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center">
                        <FaTruck className="text-white text-2xl" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-orange-900 mb-1">{detailsData.product.supplier.name}</h3>
                        <p className="text-sm text-orange-700">Supplier Utama</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Informasi Kontak</h4>
                      <div className="space-y-2">
                        {detailsData.product.supplier.contact_person && (
                          <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Kontak Person</span>
                            <span className="text-sm font-medium text-gray-900">{detailsData.product.supplier.contact_person}</span>
                          </div>
                        )}
                        {detailsData.product.supplier.phone && (
                          <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Telepon</span>
                            <span className="text-sm font-medium text-gray-900">{detailsData.product.supplier.phone}</span>
                          </div>
                        )}
                        {detailsData.product.supplier.email && (
                          <div className="flex justify-between py-2">
                            <span className="text-sm text-gray-600">Email</span>
                            <span className="text-sm font-medium text-gray-900">{detailsData.product.supplier.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Informasi Harga</h4>
                      <div className="space-y-2">
                        {detailsData.avg_purchase_price > 0 && (
                          <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">{t('inventory.productDetail.avgPrice')}</span>
                            <span className="text-sm font-medium text-green-600">{formatCurrency(detailsData.avg_purchase_price)}</span>
                          </div>
                        )}
                        {detailsData.last_order && (
                          <>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Harga Terakhir</span>
                              <span className="text-sm font-medium text-blue-600">{formatCurrency(detailsData.last_order.unit_price)}</span>
                            </div>
                            <div className="flex justify-between py-2">
                              <span className="text-sm text-gray-600">Pesanan Terakhir</span>
                              <span className="text-sm font-medium text-gray-900">{formatDate(detailsData.last_order.order_date)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {detailsData.purchase_history && detailsData.purchase_history.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Statistik Pembelian</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg text-center">
                          <p className="text-sm text-blue-700 mb-1">Total Pesanan</p>
                          <p className="text-2xl font-bold text-blue-900">{detailsData.purchase_history.length}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg text-center">
                          <p className="text-sm text-green-700 mb-1">Total Qty</p>
                          <p className="text-2xl font-bold text-green-900">
                            {detailsData.purchase_history.reduce((sum: number, p: any) => sum + parseFloat(p.quantity || 0), 0)}
                          </p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg text-center">
                          <p className="text-sm text-purple-700 mb-1">Total Nilai</p>
                          <p className="text-lg font-bold text-purple-900">
                            {formatCurrency(detailsData.purchase_history.reduce((sum: number, p: any) => sum + parseFloat(p.subtotal || 0), 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <FaExclamationTriangle className="mx-auto text-5xl text-gray-300 mb-4" />
                  <p className="text-gray-600 text-lg">Tidak ada supplier terdaftar</p>
                  <p className="text-gray-500 text-sm mt-2">Tambahkan supplier untuk produk ini</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <div className="border-t pt-4 flex space-x-2">
          <Button
            onClick={() => onEdit?.(product)}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <FaEdit className="mr-2" />
            Edit Produk
          </Button>
          <Button
            onClick={() => onDelete?.(product.id)}
            variant="destructive"
            className="flex-1"
          >
            <FaTrash className="mr-2" />
            Hapus Produk
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="px-6"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailModal;
