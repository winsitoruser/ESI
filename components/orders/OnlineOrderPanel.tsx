import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, Clock, CheckCircle, XCircle, ChefHat, Truck, Package, RefreshCw,
  Volume2, VolumeX, AlertTriangle, User, Phone, MapPin, ShoppingBag,
  Play, Pause, Check, X, Timer, Bike, Store, UtensilsCrossed, Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';

interface OnlineOrder {
  id: string;
  orderNumber: string;
  queueNumber: number;
  platform: 'gofood' | 'grabfood' | 'shopeefood' | 'tokopedia' | 'shopee' | 'walkin' | 'dine_in';
  platformOrderId: string;
  customerName: string;
  customerPhone?: string;
  orderType: 'delivery' | 'pickup' | 'dine_in';
  items: Array<{ id: string; name: string; quantity: number; price: number; notes?: string; }>;
  subtotal: number;
  deliveryFee?: number;
  platformFee?: number;
  total: number;
  status: 'new' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'completed' | 'cancelled';
  priority: 'normal' | 'high' | 'urgent';
  estimatedPrepTime: number;
  estimatedPickupTime?: string;
  driverInfo?: { name: string; phone: string; vehicle: string; plateNumber: string; };
  notes?: string;
  createdAt: string;
  tableNumber?: string;
}

interface OrderStats {
  total: number;
  new: number;
  accepted: number;
  preparing: number;
  ready: number;
  online: number;
  offline: number;
  avgPrepTime: number;
  byPlatform: Record<string, number>;
}

const platformConfig: Record<string, { name: string; color: string; bgColor: string; icon: any }> = {
  gofood: { name: 'GoFood', color: 'text-green-600', bgColor: 'bg-green-500', icon: Bike },
  grabfood: { name: 'GrabFood', color: 'text-green-500', bgColor: 'bg-green-600', icon: Bike },
  shopeefood: { name: 'ShopeeFood', color: 'text-orange-500', bgColor: 'bg-orange-500', icon: Bike },
  tokopedia: { name: 'Tokopedia', color: 'text-green-600', bgColor: 'bg-green-500', icon: Package },
  shopee: { name: 'Shopee', color: 'text-orange-500', bgColor: 'bg-orange-500', icon: Package },
  walkin: { name: 'Walk-in', color: 'text-blue-600', bgColor: 'bg-blue-500', icon: User },
  dine_in: { name: 'Dine-in', color: 'text-purple-600', bgColor: 'bg-purple-500', icon: UtensilsCrossed }
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  new: { label: 'BARU', color: 'text-red-700', bgColor: 'bg-red-100 border-red-300' },
  accepted: { label: 'DITERIMA', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-300' },
  preparing: { label: 'DIMASAK', color: 'text-amber-700', bgColor: 'bg-amber-100 border-amber-300' },
  ready: { label: 'SIAP', color: 'text-green-700', bgColor: 'bg-green-100 border-green-300' },
  completed: { label: 'SELESAI', color: 'text-gray-600', bgColor: 'bg-gray-100 border-gray-300' },
  cancelled: { label: 'BATAL', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' }
};

const priorityConfig: Record<string, { label: string; color: string; pulse: boolean }> = {
  normal: { label: 'Normal', color: 'bg-gray-100 text-gray-600', pulse: false },
  high: { label: 'Prioritas', color: 'bg-amber-100 text-amber-700', pulse: false },
  urgent: { label: 'URGENT', color: 'bg-red-500 text-white', pulse: true }
};

export default function OnlineOrderPanel() {
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [newOrderCount, setNewOrderCount] = useState(0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const getTimeSince = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit`;
    const hours = Math.floor(minutes / 60);
    return `${hours} jam ${minutes % 60} menit`;
  };

  const playNotificationSound = useCallback(() => {
    if (soundEnabled) {
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {}
    }
  }, [soundEnabled]);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders/online?status=new,accepted,preparing,ready&limit=50');
      const data = await response.json();
      
      if (data.success) {
        const prevNewCount = orders.filter(o => o.status === 'new').length;
        const newNewCount = data.data.filter((o: OnlineOrder) => o.status === 'new').length;
        
        if (newNewCount > prevNewCount && prevNewCount > 0) {
          playNotificationSound();
          toast.success('🔔 Pesanan baru masuk!', { duration: 3000 });
        }
        
        setOrders(data.data);
        setStats(data.stats);
        setNewOrderCount(newNewCount);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [orders, playNotificationSound]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleOrderAction = async (orderId: string, action: string) => {
    try {
      const response = await fetch(`/api/orders/online?id=${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Pesanan ${action === 'accept' ? 'diterima' : action === 'start_prep' ? 'mulai dimasak' : action === 'ready' ? 'siap diambil' : action === 'complete' ? 'selesai' : 'diupdate'}!`);
        fetchOrders();
        setSelectedOrder(null);
      }
    } catch (error) {
      toast.error('Gagal mengupdate pesanan');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'online') return !['walkin', 'dine_in'].includes(order.platform);
    if (filter === 'offline') return ['walkin', 'dine_in'].includes(order.platform);
    return true;
  });

  const groupedOrders = {
    new: filteredOrders.filter(o => o.status === 'new'),
    accepted: filteredOrders.filter(o => o.status === 'accepted'),
    preparing: filteredOrders.filter(o => o.status === 'preparing'),
    ready: filteredOrders.filter(o => o.status === 'ready')
  };

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${newOrderCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}>
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Antrian Pesanan</h3>
              <p className="text-xs text-gray-500">{stats?.total || 0} pesanan aktif</p>
            </div>
          </div>
          
          {newOrderCount > 0 && (
            <Badge className="bg-red-500 text-white animate-bounce">
              {newOrderCount} Pesanan Baru!
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['all', 'online', 'offline'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filter === f ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f === 'all' ? 'Semua' : f === 'online' ? 'Online' : 'Offline'}
              </button>
            ))}
          </div>
          
          <Button variant="outline" size="sm" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Baru', count: stats?.new || 0, color: 'bg-red-500' },
          { label: 'Diterima', count: stats?.accepted || 0, color: 'bg-blue-500' },
          { label: 'Dimasak', count: stats?.preparing || 0, color: 'bg-amber-500' },
          { label: 'Siap', count: stats?.ready || 0, color: 'bg-green-500' },
          { label: 'Avg Time', count: `${stats?.avgPrepTime || 0}m`, color: 'bg-purple-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
              <span className="text-white font-bold text-sm">{stat.count}</span>
            </div>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Platform Stats */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {Object.entries(stats?.byPlatform || {}).map(([platform, count]) => {
          const config = platformConfig[platform];
          if (!config || count === 0) return null;
          const Icon = config.icon;
          return (
            <div key={platform} className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} text-white text-xs font-medium whitespace-nowrap`}>
              <Icon className="w-3.5 h-3.5" />
              <span>{config.name}</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded-full">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Order Queue Display */}
      <div className="grid grid-cols-4 gap-4">
        {/* New Orders - Urgent Attention */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-semibold text-red-700">Pesanan Baru ({groupedOrders.new.length})</span>
          </div>
          {groupedOrders.new.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-400 text-sm">
              Tidak ada pesanan baru
            </div>
          ) : (
            groupedOrders.new.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={handleOrderAction}
                onClick={() => setSelectedOrder(order)}
              />
            ))
          )}
        </div>

        {/* Accepted Orders */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="font-semibold text-blue-700">Diterima ({groupedOrders.accepted.length})</span>
          </div>
          {groupedOrders.accepted.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-400 text-sm">
              Tidak ada
            </div>
          ) : (
            groupedOrders.accepted.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={handleOrderAction}
                onClick={() => setSelectedOrder(order)}
              />
            ))
          )}
        </div>

        {/* Preparing Orders */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <span className="font-semibold text-amber-700">Dimasak ({groupedOrders.preparing.length})</span>
          </div>
          {groupedOrders.preparing.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-400 text-sm">
              Tidak ada
            </div>
          ) : (
            groupedOrders.preparing.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={handleOrderAction}
                onClick={() => setSelectedOrder(order)}
              />
            ))
          )}
        </div>

        {/* Ready Orders */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-semibold text-green-700">Siap Diambil ({groupedOrders.ready.length})</span>
          </div>
          {groupedOrders.ready.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-400 text-sm">
              Tidak ada
            </div>
          ) : (
            groupedOrders.ready.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={handleOrderAction}
                onClick={() => setSelectedOrder(order)}
              />
            ))
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onAction={handleOrderAction}
        />
      )}
    </div>
  );
}

// Order Card Component
function OrderCard({ 
  order, 
  onAction, 
  onClick 
}: { 
  order: OnlineOrder; 
  onAction: (id: string, action: string) => void;
  onClick: () => void;
}) {
  const platform = platformConfig[order.platform];
  const status = statusConfig[order.status];
  const priority = priorityConfig[order.priority];
  const Icon = platform?.icon || Package;

  const getTimeSince = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Baru';
    return `${minutes}m`;
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border-2 p-3 cursor-pointer hover:shadow-lg transition-all ${status.bgColor} ${priority.pulse ? 'animate-pulse' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 ${platform?.bgColor || 'bg-gray-500'} rounded-lg flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3 text-gray-400" />
              <span className="font-bold text-lg">{order.queueNumber}</span>
            </div>
            <p className="text-xs text-gray-500">{order.orderNumber}</p>
          </div>
        </div>
        <div className="text-right">
          <Badge className={priority.color}>{priority.label}</Badge>
          <p className="text-xs text-gray-500 mt-1">{getTimeSince(order.createdAt)}</p>
        </div>
      </div>

      {/* Customer */}
      <div className="flex items-center gap-2 mb-2 text-sm">
        <User className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-medium truncate">{order.customerName}</span>
        {order.tableNumber && (
          <Badge variant="outline" className="text-xs">Meja {order.tableNumber}</Badge>
        )}
      </div>

      {/* Items Preview */}
      <div className="space-y-1 mb-2">
        {order.items.slice(0, 2).map((item, idx) => (
          <div key={idx} className="text-xs flex items-center">
            <span className="font-semibold text-orange-600 mr-1">{item.quantity}x</span>
            <span className="text-gray-700 truncate">{item.name}</span>
          </div>
        ))}
        {order.items.length > 2 && (
          <p className="text-xs text-gray-400">+{order.items.length - 2} item lagi</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Timer className="w-3.5 h-3.5" />
          <span>{order.estimatedPrepTime}m</span>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {order.status === 'new' && (
            <Button size="sm" className="h-7 px-2 bg-green-500 hover:bg-green-600" onClick={() => onAction(order.id, 'accept')}>
              <Check className="w-3.5 h-3.5" />
            </Button>
          )}
          {order.status === 'accepted' && (
            <Button size="sm" className="h-7 px-2 bg-amber-500 hover:bg-amber-600" onClick={() => onAction(order.id, 'start_prep')}>
              <ChefHat className="w-3.5 h-3.5" />
            </Button>
          )}
          {order.status === 'preparing' && (
            <Button size="sm" className="h-7 px-2 bg-green-500 hover:bg-green-600" onClick={() => onAction(order.id, 'ready')}>
              <CheckCircle className="w-3.5 h-3.5" />
            </Button>
          )}
          {order.status === 'ready' && (
            <Button size="sm" className="h-7 px-2 bg-blue-500 hover:bg-blue-600" onClick={() => onAction(order.id, 'complete')}>
              <Package className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Order Detail Modal
function OrderDetailModal({
  order,
  onClose,
  onAction
}: {
  order: OnlineOrder;
  onClose: () => void;
  onAction: (id: string, action: string) => void;
}) {
  const platform = platformConfig[order.platform];
  const status = statusConfig[order.status];
  const Icon = platform?.icon || Package;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`p-4 ${platform?.bgColor || 'bg-gray-500'} text-white rounded-t-2xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">#{order.queueNumber}</span>
                  <Badge className="bg-white/20">{status.label}</Badge>
                </div>
                <p className="text-sm opacity-80">{order.orderNumber} • {platform?.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Customer Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Informasi Pelanggan</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span>{order.customerName}</span>
              </div>
              {order.customerPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{order.customerPhone}</span>
                </div>
              )}
              {order.tableNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>Meja {order.tableNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Est. {order.estimatedPrepTime} menit</span>
              </div>
            </div>
          </div>

          {/* Driver Info */}
          {order.driverInfo && (
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Info Driver</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Nama:</span> {order.driverInfo.name}</div>
                <div><span className="text-gray-500">HP:</span> {order.driverInfo.phone}</div>
                <div><span className="text-gray-500">Kendaraan:</span> {order.driverInfo.vehicle}</div>
                <div><span className="text-gray-500">Plat:</span> {order.driverInfo.plateNumber}</div>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Detail Pesanan</h4>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-orange-600">{item.quantity}x</span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    {item.notes && <p className="text-xs text-gray-500 mt-1">📝 {item.notes}</p>}
                  </div>
                  <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.deliveryFee && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ongkir</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
            )}
            {order.platformFee && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Biaya Platform</span>
                <span>{formatCurrency(order.platformFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span className="text-orange-600">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {order.status === 'new' && (
              <>
                <Button variant="outline" className="flex-1" onClick={() => onAction(order.id, 'cancel')}>
                  <X className="w-4 h-4 mr-2" />Tolak
                </Button>
                <Button className="flex-1 bg-green-500 hover:bg-green-600" onClick={() => onAction(order.id, 'accept')}>
                  <Check className="w-4 h-4 mr-2" />Terima
                </Button>
              </>
            )}
            {order.status === 'accepted' && (
              <Button className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={() => onAction(order.id, 'start_prep')}>
                <ChefHat className="w-4 h-4 mr-2" />Mulai Masak
              </Button>
            )}
            {order.status === 'preparing' && (
              <Button className="flex-1 bg-green-500 hover:bg-green-600" onClick={() => onAction(order.id, 'ready')}>
                <CheckCircle className="w-4 h-4 mr-2" />Siap Diambil
              </Button>
            )}
            {order.status === 'ready' && (
              <Button className="flex-1 bg-blue-500 hover:bg-blue-600" onClick={() => onAction(order.id, 'complete')}>
                <Package className="w-4 h-4 mr-2" />Selesai
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
