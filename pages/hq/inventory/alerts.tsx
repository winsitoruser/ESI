import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import HQLayout from '../../../components/hq/HQLayout';
import {
  Bell,
  RefreshCw,
  Download,
  Search,
  Filter,
  ChevronLeft,
  Building2,
  Warehouse,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ArrowRightLeft,
  ShoppingCart,
  Calendar,
  BarChart3,
  Check
} from 'lucide-react';

interface StockAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'overstock' | 'expiring' | 'slow_moving';
  priority: 'low' | 'medium' | 'high' | 'critical';
  product: {
    id: string;
    name: string;
    sku: string;
    category: string;
  };
  branch: {
    id: string;
    name: string;
    code: string;
  };
  currentStock: number;
  minStock: number;
  maxStock: number;
  suggestedAction: string;
  createdAt: string;
  isRead: boolean;
  isResolved: boolean;
}

export default function InventoryAlerts() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hq/inventory/alerts');
      if (response.ok) {
        const json = await response.json();
        const payload = json.data || json;
        if (payload.alerts) setAlerts(payload.alerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  if (!mounted) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return t('inventory.alJustNow');
    if (diffHours < 24) return t('inventory.alHoursAgo').replace('{hours}', String(diffHours));
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'out_of_stock': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'low_stock': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'overstock': return <TrendingUp className="w-5 h-5 text-blue-600" />;
      case 'expiring': return <Clock className="w-5 h-5 text-orange-600" />;
      case 'slow_moving': return <TrendingDown className="w-5 h-5 text-purple-600" />;
      default: return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'out_of_stock': return t('inventory.alTypeOutOfStock');
      case 'low_stock': return t('inventory.alTypeLowStock');
      case 'overstock': return t('inventory.alTypeOverstock');
      case 'expiring': return t('inventory.alTypeExpiringSoon');
      case 'slow_moving': return t('inventory.alTypeSlowMoving');
      default: return type;
    }
  };

  const getAlertTypeBadge = (type: string) => {
    switch (type) {
      case 'out_of_stock': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">{t('inventory.alTypeOutOfStock')}</span>;
      case 'low_stock': return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">{t('inventory.alTypeLowStock')}</span>;
      case 'overstock': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{t('inventory.alTypeOverstock')}</span>;
      case 'expiring': return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">{t('inventory.alTypeExpiring')}</span>;
      case 'slow_moving': return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">{t('inventory.alTypeSlowMoving')}</span>;
      default: return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <span className="px-2 py-1 bg-red-500 text-white rounded text-xs">{t('inventory.alPriorityCritical')}</span>;
      case 'high': return <span className="px-2 py-1 bg-orange-500 text-white rounded text-xs">{t('inventory.alPriorityHigh')}</span>;
      case 'medium': return <span className="px-2 py-1 bg-yellow-500 text-white rounded text-xs">{t('inventory.alPriorityMedium')}</span>;
      case 'low': return <span className="px-2 py-1 bg-gray-500 text-white rounded text-xs">{t('inventory.alPriorityLow')}</span>;
      default: return null;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.branch.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || alert.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || alert.priority === priorityFilter;
    const matchesResolved = showResolved || !alert.isResolved;
    return matchesSearch && matchesType && matchesPriority && matchesResolved;
  });

  const stats = {
    total: alerts.filter(a => !a.isResolved).length,
    critical: alerts.filter(a => a.priority === 'critical' && !a.isResolved).length,
    high: alerts.filter(a => a.priority === 'high' && !a.isResolved).length,
    unread: alerts.filter(a => !a.isRead && !a.isResolved).length
  };

  const markAsRead = (alertId: string) => {
    setAlerts(alerts.map(a => a.id === alertId ? { ...a, isRead: true } : a));
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(alerts.map(a => a.id === alertId ? { ...a, isResolved: true } : a));
  };

  const markAllAsRead = () => {
    setAlerts(alerts.map(a => ({ ...a, isRead: true })));
  };

  return (
    <HQLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hq/inventory" className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('inventory.alTitle')}</h1>
              <p className="text-gray-500">{t('inventory.alSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              <CheckCircle className="w-4 h-4" />
              {t('inventory.alMarkAllRead')}
            </button>
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" />
              {t('inventory.alRefresh')}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">{t('inventory.alStatTotal')}</p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
                <p className="text-sm text-red-600">{t('inventory.alStatCritical')}</p>
              </div>
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-700">{stats.high}</p>
                <p className="text-sm text-orange-600">{t('inventory.alStatHigh')}</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.unread}</p>
                <p className="text-sm text-blue-600">{t('inventory.alStatUnread')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Alert Banner */}
        {stats.critical > 0 && (
          <div className="bg-red-600 rounded-xl p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">{t('inventory.alCriticalBanner').replace('{count}', String(stats.critical))}</p>
                <p className="text-red-100 text-sm">{t('inventory.alCriticalBannerDesc')}</p>
              </div>
            </div>
            <button
              onClick={() => { setTypeFilter('out_of_stock'); setPriorityFilter('critical'); }}
              className="px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
            >
              {t('inventory.alViewNow')}
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('inventory.alSearchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">{t('inventory.alAllTypes')}</option>
              <option value="out_of_stock">{t('inventory.alTypeOutOfStock')}</option>
              <option value="low_stock">{t('inventory.alTypeLowStock')}</option>
              <option value="overstock">{t('inventory.alTypeOverstock')}</option>
              <option value="expiring">{t('inventory.alTypeExpiring')}</option>
              <option value="slow_moving">{t('inventory.alTypeSlowMoving')}</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">{t('inventory.alAllPriority')}</option>
              <option value="critical">{t('inventory.alPriorityCritical')}</option>
              <option value="high">{t('inventory.alPriorityHigh')}</option>
              <option value="medium">{t('inventory.alPriorityMedium')}</option>
              <option value="low">{t('inventory.alPriorityLow')}</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="rounded border-gray-300"
              />
              {t('inventory.alShowResolved')}
            </label>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-xl border p-4 transition-all ${
                alert.isResolved ? 'border-gray-200 opacity-60' :
                alert.priority === 'critical' ? 'border-red-300 bg-red-50/30' :
                alert.priority === 'high' ? 'border-orange-300 bg-orange-50/30' :
                'border-gray-200'
              } ${!alert.isRead && !alert.isResolved ? 'border-l-4 border-l-blue-500' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  alert.type === 'out_of_stock' ? 'bg-red-100' :
                  alert.type === 'low_stock' ? 'bg-yellow-100' :
                  alert.type === 'overstock' ? 'bg-blue-100' :
                  alert.type === 'expiring' ? 'bg-orange-100' :
                  'bg-purple-100'
                }`}>
                  {getAlertIcon(alert.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getAlertTypeBadge(alert.type)}
                        {getPriorityBadge(alert.priority)}
                        {alert.isResolved && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> {t('inventory.alResolved')}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900">{alert.product.name}</h4>
                      <p className="text-sm text-gray-500">{alert.product.sku} • {alert.product.category}</p>
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap">{formatDate(alert.createdAt)}</p>
                  </div>

                  <div className="mt-3 flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      {alert.branch.code.startsWith('WH') ? (
                        <Warehouse className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Building2 className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-600">{alert.branch.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`font-medium ${alert.currentStock === 0 ? 'text-red-600' : alert.currentStock < alert.minStock ? 'text-yellow-600' : 'text-gray-900'}`}>
                        {t('inventory.alStock')}: {alert.currentStock}
                      </span>
                      <span className="text-gray-400">{t('inventory.alMin')}: {alert.minStock}</span>
                      <span className="text-gray-400">{t('inventory.alMax')}: {alert.maxStock}</span>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">{t('inventory.alSuggestion')}: </span>
                      {alert.suggestedAction}
                    </p>
                  </div>

                  {!alert.isResolved && (
                    <div className="mt-3 flex items-center gap-2">
                      {(alert.type === 'out_of_stock' || alert.type === 'low_stock') && (
                        <>
                          <Link
                            href={`/hq/inventory/transfers?product=${alert.product.id}&to=${alert.branch.code}`}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                            {t('inventory.alTransfer')}
                          </Link>
                          <Link
                            href="/hq/purchase-orders"
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            {t('inventory.alCreatePO')}
                          </Link>
                        </>
                      )}
                      {!alert.isRead && (
                        <button
                          onClick={() => markAsRead(alert.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                        >
                          <Eye className="w-4 h-4" />
                          {t('inventory.alMarkRead')}
                        </button>
                      )}
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                      >
                        <Check className="w-4 h-4" />
                        {t('inventory.alResolve')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredAlerts.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('inventory.alNoAlerts')}</h3>
              <p className="text-gray-500">{t('inventory.alNoAlertsDesc')}</p>
            </div>
          )}
        </div>
      </div>
    </HQLayout>
  );
}
