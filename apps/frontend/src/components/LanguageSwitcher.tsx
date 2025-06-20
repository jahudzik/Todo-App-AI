import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();

  const languages = [
    { code: 'en', name: t('settings.language.english') },
    { code: 'pl', name: t('settings.language.polish') },
  ];

  const handleLanguageChange = async (locale: string) => {
    // Use Next.js router to change locale
    await router.push(router.asPath, router.asPath, { locale });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('settings.language.title')}
      </h3>
      <p className="text-gray-600 mb-4">
        {t('settings.language.description')}
      </p>
      
      {/* Current language indicator */}
      <div className="mb-4 p-3 bg-blue-50 rounded-md">
        <p className="text-sm text-blue-800">
          {t('settings.language.current', { 
            language: languages.find(lang => lang.code === i18n.language)?.name 
          })}
        </p>
      </div>

      {/* Language options */}
      <div className="space-y-2">
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`
              w-full text-left px-4 py-3 rounded-md border transition-colors duration-200
              ${
                i18n.language === language.code
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{language.name}</span>
              {i18n.language === language.code && (
                <svg
                  className="h-5 w-5 text-primary-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}