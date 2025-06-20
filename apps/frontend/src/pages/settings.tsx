import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Layout from '../components/Layout';

export default function Settings() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {t('nav.settings')}
        </h1>
        <p className="text-gray-600">
          Settings page placeholder - language switcher will be implemented here.
        </p>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});