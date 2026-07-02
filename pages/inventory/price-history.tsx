import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import PriceChangeHistory from '@/components/inventory/PriceChangeHistory';
import { FaHistory } from 'react-icons/fa';

const PriceHistoryPage: React.FC = () => {
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
        <title>{t('inventory.priceHistory.pageTitle')}</title>
      </Head>

      <PriceChangeHistory showAll={true} />
    </DashboardLayout>
  );
};

export default PriceHistoryPage;
