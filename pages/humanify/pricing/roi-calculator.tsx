import HumanifyRoiCalculatorPage from '@/components/humanify/HumanifyRoiCalculatorPage';
import HumanifySeoHead from '@/components/humanify/HumanifySeoHead';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

const PAGE_TITLE = `Kalkulator ROI HRIS | Hitung Penghematan Anda — ${HUMANIFY_BRAND.name}`;
const PAGE_DESCRIPTION = `Hitung estimasi penghematan biaya dan waktu dengan menggunakan ${HUMANIFY_BRAND.name}. Kalkulator ROI interaktif untuk perusahaan Anda.`;

export default function RoiCalculatorRoute() {
  return (
    <>
      <HumanifySeoHead
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        path={HUMANIFY_BRAND.roiCalculatorPath}
        keywords="harga HRIS, paket HR software, biaya payroll software, harga humanify, HRIS Indonesia, software HR terjangkau, pricing HRIS, kalkulator ROI"
      />
      <HumanifyRoiCalculatorPage />
    </>
  );
}
