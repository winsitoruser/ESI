import React from 'react';
import Head from 'next/head';
import HQLayout from '@/components/hq/HQLayout';
import HelpdeskConsole from '@/components/hq/helpdesk/HelpdeskConsole';
import { useTranslation } from '@/lib/i18n';

export default function HelpdeskPage() {
  const { t } = useTranslation();
  return (
    <HQLayout title={t('hd.title')} subtitle={t('hd.subtitle')}>
      <Head>
        <title>{t('hd.title')} — Bedagang HQ</title>
      </Head>
      <HelpdeskConsole />
    </HQLayout>
  );
}
