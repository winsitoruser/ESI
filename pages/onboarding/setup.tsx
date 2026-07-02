import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from '@/lib/i18n';
import { useSession } from 'next-auth/react';
import BusinessTypeWizard from '@/components/onboarding/BusinessTypeWizard';

export default function OnboardingSetup() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);
  
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }
  
  return <BusinessTypeWizard />;
}
