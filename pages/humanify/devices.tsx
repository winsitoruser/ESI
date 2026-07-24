import { useEffect } from 'react';
import { useRouter } from 'next/router';

/** Alias — halaman asli: /humanify/attendance/devices */
export default function DevicesAliasRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/humanify/attendance/devices');
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
      Mengalihkan ke Perangkat Absensi…
    </div>
  );
}
