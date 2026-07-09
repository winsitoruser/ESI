import Head from 'next/head';
import HumanifyRoiCalculatorPage from '@/components/humanify/HumanifyRoiCalculatorPage';
import { HUMANIFY_BRAND, NAINCODE } from '@/lib/humanify/branding';

const PAGE_TITLE = `Kalkulator ROI HRIS | Hitung Penghematan Anda — ${HUMANIFY_BRAND.name}`;
const PAGE_DESCRIPTION = `Hitung estimasi penghematan biaya dan waktu dengan menggunakan ${HUMANIFY_BRAND.name}. Kalkulator ROI interaktif untuk perusahaan Anda.`;

export default function RoiCalculatorRoute() {
  return (
    <>
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <meta
          name="keywords"
          content="harga HRIS, paket HR software, biaya payroll software, harga humanify, HRIS Indonesia, software HR terjangkau, pricing HRIS"
        />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <link rel="icon" href={HUMANIFY_BRAND.welcomeLogoPath} type="image/png" />
        <link rel="canonical" href={`${NAINCODE.website}/humanify/pricing/roi-calculator`} />
      </Head>
      <HumanifyRoiCalculatorPage />
    </>
  );
}
