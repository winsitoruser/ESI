import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function RequisitionsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/hq/inventory/transfers');
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Redirecting to Transfer & Requisition...</p>
    </div>
  );
}
