import HumanifyRoiCalculatorPage from '@/components/humanify/HumanifyRoiCalculatorPage';
import HumanifySeoHead from '@/components/humanify/HumanifySeoHead';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import {
  buildBreadcrumbJsonLd,
  buildHowToRoiJsonLd,
  buildWebPageJsonLd,
} from '@/lib/humanify/seo';

const PAGE_TITLE = `Kalkulator ROI HRIS | Hitung Penghematan Anda — ${HUMANIFY_BRAND.name}`;
const PAGE_DESCRIPTION = `Hitung estimasi penghematan biaya dan waktu dengan ${HUMANIFY_BRAND.name}. Kalkulator ROI interaktif untuk perusahaan di Indonesia.`;

export default function RoiCalculatorRoute() {
  return (
    <>
      <HumanifySeoHead
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        path={HUMANIFY_BRAND.roiCalculatorPath}
        keywords={[
          'kalkulator ROI HRIS',
          'harga HRIS',
          'biaya payroll software',
          'harga Humanify',
          'HRIS Indonesia',
          'software HR terjangkau',
        ]}
        jsonLd={[
          buildWebPageJsonLd({
            name: PAGE_TITLE,
            description: PAGE_DESCRIPTION,
            path: HUMANIFY_BRAND.roiCalculatorPath,
          }),
          buildHowToRoiJsonLd(),
          buildBreadcrumbJsonLd([
            { name: 'Beranda', path: '/' },
            { name: 'Kalkulator ROI', path: HUMANIFY_BRAND.roiCalculatorPath },
          ]),
        ]}
      />
      <HumanifyRoiCalculatorPage />
    </>
  );
}
