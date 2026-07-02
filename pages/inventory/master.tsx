import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FaBoxOpen, FaLayerGroup, FaUsers, FaTags,
  FaPlus, FaSearch, FaEdit, FaTrash,
  FaWarehouse, FaIndustry, FaCubes, FaBoxes, FaSync
} from 'react-icons/fa';
import { 
  useMasterSummary, 
  useCategories, 
  useSuppliers, 
  useUnits, 
  useBrands, 
  useWarehouses, 
  useTags 
} from '@/hooks/useInventoryMaster';

const InventoryMasterPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data from backend using hooks
  const { summary, isLoading: summaryLoading, refresh: refreshSummary } = useMasterSummary();
  const { categories, count: categoriesCount } = useCategories();
  const { suppliers, count: suppliersCount } = useSuppliers();
  const { units, count: unitsCount } = useUnits();
  const { brands, count: brandsCount } = useBrands();
  const { warehouses, count: warehousesCount } = useWarehouses();
  const { tags, count: tagsCount } = useTags();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  if (status === "loading" || summaryLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>{t('inventory.masterPageTitle')}</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <FaLayerGroup className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">{t('inventory.masterTitle')}</h1>
                    <p className="text-green-100 text-sm">{t('inventory.masterSubtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="hidden lg:flex items-center space-x-4">
                <div className="text-right bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
                  <p className="text-xs text-green-100">{t('inventory.master.totalMasterData')}</p>
                  <p className="text-2xl font-bold">
                    {(summary?.categories || 0) + (summary?.suppliers || 0) + (summary?.units || 0) + 
                     (summary?.brands || 0) + (summary?.warehouses || 0) + (summary?.locations || 0) + 
                     (summary?.manufacturers || 0) + (summary?.tags || 0)}
                  </p>
                </div>
                <Button
                  onClick={() => refreshSummary()}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <FaSync className="mr-2" />
                  {t('common.refresh')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions dengan Button Sejajar */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{t('dashboard.quickActions')}</CardTitle>
              {/* Button pipih dan panjang sejajar dengan judul */}
              <div className="flex gap-2">
                <Button
                  onClick={() => router.push('/inventory/products/new')}
                  className="h-8 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm"
                >
                  <FaPlus className="mr-2 text-xs" />
                  {t('inventory.addProduct')}
                </Button>
                <Button
                  onClick={() => router.push('/inventory/receive')}
                  className="h-8 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm"
                >
                  <FaBoxOpen className="mr-2 text-xs" />
                  {t('inventory.master.receiveProduct')}
                </Button>
                <Button
                  onClick={() => router.push('/inventory/stock-opname')}
                  className="h-8 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-sm"
                >
                  <FaSearch className="mr-2 text-xs" />
                  {t('inventory.master.stockOpname')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Kategori Produk */}
              <Link href="/inventory/master/categories">
                <div className="group relative overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 rounded-lg p-6 transition-all duration-300 hover:shadow-lg cursor-pointer border border-blue-200">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-blue-300 rounded-lg flex items-center justify-center mb-3">
                      <FaLayerGroup className="text-2xl text-blue-700" />
                    </div>
                    <span className="text-sm font-semibold text-center text-blue-900">{t('inventory.master.productCategories')}</span>
                    <span className="text-xs text-blue-700 mt-1">{t('inventory.master.manageCategories')}</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-blue-500 text-white text-xs">{summary?.categories || 0}</Badge>
                  </div>
                </div>
              </Link>

              {/* Supplier */}
              <Link href="/inventory/master/suppliers">
                <div className="group relative overflow-hidden bg-gradient-to-br from-green-100 to-emerald-200 hover:from-green-200 hover:to-emerald-300 rounded-lg p-6 transition-all duration-300 hover:shadow-lg cursor-pointer border border-green-200">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-green-300 rounded-lg flex items-center justify-center mb-3">
                      <FaUsers className="text-2xl text-green-700" />
                    </div>
                    <span className="text-sm font-semibold text-center text-green-900">{t('inventory.master.supplier')}</span>
                    <span className="text-xs text-green-700 mt-1">{t('inventory.master.manageSuppliers')}</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-500 text-white text-xs">{summary?.suppliers || 0}</Badge>
                  </div>
                </div>
              </Link>

              {/* Satuan */}
              <Link href="/inventory/master/units">
                <div className="group relative overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 rounded-lg p-6 transition-all duration-300 hover:shadow-lg cursor-pointer border border-purple-200">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-purple-300 rounded-lg flex items-center justify-center mb-3">
                      <FaCubes className="text-2xl text-purple-700" />
                    </div>
                    <span className="text-sm font-semibold text-center text-purple-900">{t('inventory.master.units')}</span>
                    <span className="text-xs text-purple-700 mt-1">{t('inventory.master.manageUnits')}</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-purple-500 text-white text-xs">{summary?.units || 0}</Badge>
                  </div>
                </div>
              </Link>

              {/* Brand/Merek */}
              <Link href="/inventory/master/brands">
                <div className="group relative overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200 hover:from-orange-200 hover:to-orange-300 rounded-lg p-6 transition-all duration-300 hover:shadow-lg cursor-pointer border border-orange-200">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-orange-300 rounded-lg flex items-center justify-center mb-3">
                      <FaTags className="text-2xl text-orange-700" />
                    </div>
                    <span className="text-sm font-semibold text-center text-orange-900">{t('inventory.master.brands')}</span>
                    <span className="text-xs text-orange-700 mt-1">{t('inventory.master.manageBrands')}</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-orange-500 text-white text-xs">{summary?.brands || 0}</Badge>
                  </div>
                </div>
              </Link>

              {/* Gudang */}
              <Link href="/inventory/master/warehouses">
                <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-100 to-indigo-200 hover:from-indigo-200 hover:to-indigo-300 rounded-lg p-6 transition-all duration-300 hover:shadow-lg cursor-pointer border border-indigo-200">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-indigo-300 rounded-lg flex items-center justify-center mb-3">
                      <FaWarehouse className="text-2xl text-indigo-700" />
                    </div>
                    <span className="text-sm font-semibold text-center text-indigo-900">{t('inventory.master.warehouses')}</span>
                    <span className="text-xs text-indigo-700 mt-1">{t('inventory.master.manageWarehouses')}</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-indigo-500 text-white text-xs">{summary?.warehouses || 0}</Badge>
                  </div>
                </div>
              </Link>

              {/* Lokasi Rak */}
              <Link href="/inventory/master/locations">
                <div className="group relative overflow-hidden bg-gradient-to-br from-cyan-100 to-cyan-200 hover:from-cyan-200 hover:to-cyan-300 rounded-lg p-6 transition-all duration-300 hover:shadow-lg cursor-pointer border border-cyan-200">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-cyan-300 rounded-lg flex items-center justify-center mb-3">
                      <FaBoxes className="text-2xl text-cyan-700" />
                    </div>
                    <span className="text-sm font-semibold text-center text-cyan-900">{t('inventory.master.rackLocations')}</span>
                    <span className="text-xs text-cyan-700 mt-1">{t('inventory.master.manageLocations')}</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-cyan-500 text-white text-xs">{summary?.locations || 0}</Badge>
                  </div>
                </div>
              </Link>

              {/* Manufacturer */}
              <Link href="/inventory/master/manufacturers">
                <div className="group relative overflow-hidden bg-gradient-to-br from-pink-100 to-rose-200 hover:from-pink-200 hover:to-rose-300 rounded-lg p-6 transition-all duration-300 hover:shadow-lg cursor-pointer border border-pink-200">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-pink-300 rounded-lg flex items-center justify-center mb-3">
                      <FaIndustry className="text-2xl text-pink-700" />
                    </div>
                    <span className="text-sm font-semibold text-center text-pink-900">{t('inventory.master.manufacturer')}</span>
                    <span className="text-xs text-pink-700 mt-1">{t('inventory.master.manageManufacturers')}</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-pink-500 text-white text-xs">{summary?.manufacturers || 0}</Badge>
                  </div>
                </div>
              </Link>

              {/* Tags */}
              <Link href="/inventory/master/tags">
                <div className="group relative overflow-hidden bg-gradient-to-br from-yellow-100 to-amber-200 hover:from-yellow-200 hover:to-amber-300 rounded-lg p-6 transition-all duration-300 hover:shadow-lg cursor-pointer border border-yellow-200">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-yellow-300 rounded-lg flex items-center justify-center mb-3">
                      <FaTags className="text-2xl text-yellow-700" />
                    </div>
                    <span className="text-sm font-semibold text-center text-yellow-900">{t('inventory.master.tags')}</span>
                    <span className="text-xs text-yellow-700 mt-1">{t('inventory.master.manageTags')}</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-yellow-500 text-white text-xs">{summary?.tags || 0}</Badge>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-xl">{t('inventory.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { action: 'Kategori "Elektronik" ditambahkan', time: '5 menit yang lalu', type: 'category', color: 'blue' },
                { action: 'Supplier "PT Maju Jaya" diperbarui', time: '15 menit yang lalu', type: 'supplier', color: 'green' },
                { action: 'Satuan "Lusin" ditambahkan', time: '1 jam yang lalu', type: 'unit', color: 'purple' },
                { action: 'Brand "Samsung" diperbarui', time: '2 jam yang lalu', type: 'brand', color: 'orange' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full bg-${activity.color}-500`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{activity.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default InventoryMasterPage;
