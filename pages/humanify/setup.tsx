import Head from 'next/head';
import SaasSetupWizard from '@/components/humanify/SaasSetupWizard';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

export default function HumanifySetupPage() {
  return (
    <>
      <Head>
        <title>Setup Workspace — {HUMANIFY_BRAND.name}</title>
        <meta name="description" content="Wizard setup awal workspace Humanify HRIS" />
        <link rel="icon" href={HUMANIFY_BRAND.welcomeLogoPath} type="image/png" />
      </Head>
      <SaasSetupWizard />
    </>
  );
}
