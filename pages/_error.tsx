import { NextPageContext } from 'next';
import { useTranslation } from '@/lib/i18n';

interface ErrorProps {
  statusCode?: number;
}

function ErrorPage({ statusCode }: ErrorProps) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">
          {statusCode || 'Error'}
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          {statusCode === 404
            ? t('errorPages.pageNotFound')
            : statusCode === 500
            ? t('errorPages.serverError')
            : t('errorPages.genericError')}
        </p>
        <a
          href="/"
          className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('errorPages.backToHome')}
        </a>
      </div>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default ErrorPage;
