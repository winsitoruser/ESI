import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import InventoryAlerts from '@/components/inventory/InventoryAlerts';
import { Button } from '@/components/ui/button';
import { FaBell, FaArrowLeft, FaHome } from 'react-icons/fa';

const InventoryAlertsPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <DashboardLayout>
      <Head>
        <title>{t('inventory.alertsPageTitle')}</title>
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
              <span>{t('common.back')}</span>
            </Button>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <FaHome className="text-gray-400" />
              <span>/</span>
              <button onClick={() => router.push('/inventory')} className="hover:text-green-600 transition-colors">
                {t('inventory.title')}
              </button>
              <span>/</span>
              <span className="text-gray-900 font-semibold">{t('inventory.alerts.breadcrumb')}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/inventory')}
              className="flex items-center space-x-2"
            >
              <FaHome />
              <span>{t('inventory.alerts.dashboardInventory')}</span>
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-br from-yellow-500 via-orange-600 to-red-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <FaBell className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{t('inventory.alerts.title')}</h1>
                <p className="text-yellow-100 text-sm">{t('inventory.alerts.subtitle')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Component */}
        <InventoryAlerts showInDashboard={false} />
      </div>
    </DashboardLayout>
  );
};

export default InventoryAlertsPage;
