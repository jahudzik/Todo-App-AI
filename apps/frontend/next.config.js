const { i18n } = require('./next-i18next.config');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  i18n,
  transpilePackages: ['@db'],
  experimental: {
    esmExternals: true,
  },
};

module.exports = nextConfig;