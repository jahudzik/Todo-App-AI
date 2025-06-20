import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Layout from '../components/Layout';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Settings() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <div className="p-6 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {t('settings.title')}
        </h1>
        
        <div className="space-y-6">
          <LanguageSwitcher />
          
          {/* Placeholder for future settings */}
          <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-200">
            <p className="text-gray-500 text-center">
              Additional settings will be added here in the future.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});