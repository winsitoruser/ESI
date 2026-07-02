import React, { useEffect, useState } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import FleetCommandCenter from '../../../components/hq/fleet/FleetCommandCenter';

/**
 * Pusat Kendali Armada & Transportasi (Unified Super Module)
 *
 * Halaman ini menggabungkan tiga modul legacy:
 *   - Fleet Management (legacy)
 *   - FMS (Fleet Management System)
 *   - TMS (Transport Management System)
 *
 * Dengan integrasi cross-module ke Aplikasi Driver, HRIS, Finance,
 * dan Inventory. Seluruh sub-halaman lama (seperti /hq/fleet/vehicles,
 * /hq/fleet/drivers, /hq/fleet/live, dll) tetap berfungsi dan dapat
 * diakses melalui Module Hub.
 */
export default function FleetIndexPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return (
    <HQLayout>
      <FleetCommandCenter />
    </HQLayout>
  );
}
