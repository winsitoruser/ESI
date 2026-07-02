import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  FaClipboardList, FaPlus, FaEye, FaPrint, FaFileAlt,
  FaCheckCircle, FaExclamationTriangle, FaClock, FaWarehouse
} from 'react-icons/fa';

interface StockOpname {
  id: number;
  opname_number: string;
  opname_type: string;
  warehouse_id: number;
  warehouse?: any;
  status: string;
  scheduled_date: string;
  start_date: string;
  end_date: string;
  performed_by: string;
  total_items: number;
  counted_items: number;
  items_with_variance: number;
  total_variance_value: number;
  created_at: string;
}

const StockOpnameListPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, formatCurrency, formatDate } = useTranslation();
  const [stockOpnames, setStockOpnames] = useState<StockOpname[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    loadStockOpnames();
  }, []);

  const loadStockOpnames = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stock-opname');
      const result = await response.json();
      
      if (result.success) {
        setStockOpnames(result.data);
      }
    } catch (error) {
      console.error('Error loading stock opnames:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      draft: { color: 'bg-gray-100 text-gray-700', icon: FaClock, label: t('inventory.stockOpname.draft') },
      in_progress: { color: 'bg-blue-100 text-blue-700', icon: FaClock, label: t('inventory.stockOpname.inProgressStatus') },
      completed: { color: 'bg-green-100 text-green-700', icon: FaCheckCircle, label: t('inventory.stockOpname.completedStatus') },
      approved: { color: 'bg-purple-100 text-purple-700', icon: FaCheckCircle, label: t('inventory.stockOpname.approved') },
      posted: { color: 'bg-indigo-100 text-indigo-700', icon: FaCheckCircle, label: t('inventory.stockOpname.posted') }
    };
    const badge = badges[status] || badges.draft;
    const Icon = badge.icon;
    return (
      <Badge className={badge.color}>
        <Icon className="mr-1" />
        {badge.label}
      </Badge>
    );
  };


  const filteredOpnames = stockOpnames.filter(opname => {
    if (filter === 'all') return true;
    return opname.status === filter;
  });

  return (
    <DashboardLayout>
      <Head>
        <title>{t('inventory.stockOpname.pageTitle')}</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/inventory">
                <Button variant="outline" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                  <FaWarehouse className="mr-2" />
                  {t('inventory.pageTitle')}
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center">
                  <FaClipboardList className="mr-3" />
                  {t('inventory.stockOpname.title')}
                </h1>
                <p className="text-indigo-100">
                  {t('inventory.stockOpname.subtitle')}
                </p>
              </div>
            </div>
            <Link href="/inventory/stock-opname/create">
              <Button className="bg-white text-indigo-600 hover:bg-indigo-50 font-semibold px-6 py-3">
                <FaPlus className="mr-2" />
                {t('inventory.stockOpname.createNew')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex space-x-2">
            {[
              { value: 'all', label: t('inventory.stockOpname.all') },
              { value: 'draft', label: t('inventory.stockOpname.draft') },
              { value: 'in_progress', label: t('inventory.stockOpname.inProgressStatus') },
              { value: 'completed', label: t('inventory.stockOpname.completedStatus') },
              { value: 'approved', label: t('inventory.stockOpname.approved') }
            ].map(tab => (
              <Button
                key={tab.value}
                variant={filter === tab.value ? 'default' : 'outline'}
                onClick={() => setFilter(tab.value)}
                className="px-4 py-2"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Stock Opname List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('common.loading')}</p>
          </div>
        ) : filteredOpnames.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FaClipboardList className="mx-auto text-6xl text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {t('inventory.stockOpname.noData')}
              </h3>
              <p className="text-gray-500 mb-6">
                {t('inventory.stockOpname.noDataDesc')}
              </p>
              <Link href="/inventory/stock-opname/create">
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <FaPlus className="mr-2" />
                  {t('inventory.stockOpname.createNew')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredOpnames.map(opname => (
              <Card key={opname.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">
                          {opname.opname_number}
                        </h3>
                        {getStatusBadge(opname.status)}
                        {opname.items_with_variance > 0 && (
                          <Badge className="bg-yellow-100 text-yellow-700">
                            <FaExclamationTriangle className="mr-1" />
                            {opname.items_with_variance} Variance
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">{t('inventory.stockOpname.warehouse')}</p>
                          <p className="font-semibold text-gray-900">
                            {opname.warehouse?.name || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t('inventory.stockOpname.date')}</p>
                          <p className="font-semibold text-gray-900">
                            {formatDate(opname.scheduled_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t('inventory.stockOpname.progress')}</p>
                          <p className="font-semibold text-gray-900">
                            {opname.counted_items}/{opname.total_items} items
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t('inventory.stockOpname.totalVariance')}</p>
                          <p className={`font-semibold ${opname.total_variance_value < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(opname.total_variance_value)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-4">{t('inventory.stockOpname.performedBy')}: {opname.performed_by}</span>
                        <span>{t('inventory.stockOpname.createdAt')}: {formatDate(opname.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <Link href={`/inventory/stock-opname/${opname.id}`}>
                        <Button variant="outline" size="sm">
                          <FaEye className="mr-2" />
                          {t('inventory.stockOpname.detail')}
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm">
                        <FaPrint className="mr-2" />
                        Print
                      </Button>
                      {opname.items_with_variance > 0 && (
                        <Button variant="outline" size="sm" className="text-yellow-600 border-yellow-600">
                          <FaFileAlt className="mr-2" />
                          Incident
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StockOpnameListPage;
