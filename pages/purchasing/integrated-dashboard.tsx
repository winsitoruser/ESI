import React from 'react';
import { IntegratedDashboard } from '@/modules/purchasing/components/integrated-dashboard';
import { PurchasingNavigation } from '@/modules/purchasing/components/purchasing-navigation';
import Layout from '@/components/Layout';

export default function IntegratedDashboardPage() {
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <PurchasingNavigation />
        <IntegratedDashboard />
      </div>
    </Layout>
  );
}
