module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pl'],
    localeDetection: true,
  },
  reloadOnPrerender: process.env.NODE_ENV === 'development',
};