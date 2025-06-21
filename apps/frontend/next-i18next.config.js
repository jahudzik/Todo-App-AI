module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pl'],
    localeDetection: false,
  },
  reloadOnPrerender: process.env.NODE_ENV === 'development',
};