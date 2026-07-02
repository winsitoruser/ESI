import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Shortcut page: `/hq/settings/integrations/setup/[code]` adalah alias dari
 * halaman manage. Halaman manage menangani flow "buat konfigurasi baru" secara
 * otomatis ketika belum ada konfigurasi aktif untuk provider ybs.
 */
export default function IntegrationSetupRedirect() {
  const router = useRouter();
  const { code, ...rest } = router.query;

  useEffect(() => {
    if (!code) return;
    const qs = new URLSearchParams({
      ...(Object.fromEntries(
        Object.entries(rest).filter(([, v]) => typeof v === 'string')
      ) as Record<string, string>),
      mode: 'setup'
    }).toString();
    router.replace(`/hq/settings/integrations/manage/${code}${qs ? `?${qs}` : ''}`);
  }, [code]);

  return (
    <div className="flex items-center justify-center min-h-[40vh] text-gray-500 text-sm">
      Mengarahkan ke halaman setup...
    </div>
  );
}
