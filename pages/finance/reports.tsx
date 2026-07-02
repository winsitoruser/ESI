import { NextPage } from "next";
import { useState, useEffect, Suspense, lazy } from "react";
import FinanceLayout from "../../components/layouts/finance-layout";
import { useTranslation } from '@/lib/i18n';
import { useAuth } from "../../hooks/useAuth";
import { useRouter } from "next/router";

// Lazy load the heavy ReportsComponent
const ReportsComponent = lazy(() => import("../../components/finance/ReportsComponent"));

// Simplified interface for client-side rendering
interface ReportsPageProps {}

// Mock financial data
const summaryData = [
  { period: 'Jan 2025', income: 32500000, expense: 22300000, profit: 10200000, growth: 3.5 },
  { period: 'Feb 2025', income: 36700000, expense: 25100000, profit: 11600000, growth: 13.7 },
  { period: 'Mar 2025', income: 40200000, expense: 24500000, profit: 15700000, growth: 35.3 }
];

const FinanceReportsPage: NextPage<ReportsPageProps> = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Handle authentication and authorization
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Check user role permissions
      if (user.role === 'CASHIER') {
        router.push('/pos/kasir');
        return;
      } else if (user.role === 'PHARMACIST') {
        router.push('/inventory');
        return;
      }
      
      // User is authorized
      setIsAuthorized(true);
    }
  }, [loading, user, router]);

  // Show loading while checking auth
  if (loading || !isAuthorized) {
    return (
      <FinanceLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </FinanceLayout>
    );
  }

  return (
    <FinanceLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <div className="h-8 w-1.5 bg-gradient-to-b from-orange-400 to-amber-500 rounded-full mr-3"></div>
          <h2 className="text-xl font-bold text-gray-800">Laporan Keuangan</h2>
        </div>
        
        {/* Lazy-loaded Reports Component */}
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="ml-3 text-gray-600">Loading reports...</span>
          </div>
        }>
          <ReportsComponent />
        </Suspense>
      </div>
    </FinanceLayout>
  );
};

// Removed getServerSideProps to enable static generation and faster loading

export default FinanceReportsPage;
