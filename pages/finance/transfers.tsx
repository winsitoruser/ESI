import { NextPage } from "next";
import { useEffect } from "react";
import { useRouter } from "next/router";
import FinanceLayout from "@/components/layouts/finance-layout";
import { useTranslation } from '@/lib/i18n';
import TransfersComponent from "@/components/finance/TransfersComponent";
import { useAuth } from "@/hooks/useAuth";
import { checkAccess, getRedirectPathByRole } from "@/middleware/auth";
import { Toaster } from "react-hot-toast";

const FinanceTransfersPage: NextPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  
  // Check user access to finance module
  useEffect(() => {
    if (!loading && user) {
      const hasAccess = checkAccess(user, 'finance');
      if (!hasAccess) {
        // Redirect based on role
        router.replace(getRedirectPathByRole(user.role));
      }
    }
  }, [user, loading, router]);
  
  // Show loading or unauthorized state
  if (loading) {
    return (
      <FinanceLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Memuat...</p>
          </div>
        </div>
      </FinanceLayout>
    );
  }
  
  if (!user || !checkAccess(user, 'finance')) {
    return (
      <FinanceLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md p-6 bg-red-50 rounded-lg border border-red-200">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-700 mb-2">Access Denied</h2>
            <p className="text-gray-700 mb-4">
              You don't have permission to access the Finance module. Please contact your administrator if you believe this is a mistake.
            </p>
          </div>
        </div>
      </FinanceLayout>
    );
  }

  return (
    <FinanceLayout>
      <Toaster position="top-right" />
      <TransfersComponent />
    </FinanceLayout>
  );
};

export default FinanceTransfersPage;
