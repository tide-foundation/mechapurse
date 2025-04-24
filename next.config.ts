/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // 🔥 This enables optimized standalone build output
  output: 'standalone',

  webpack(config: { module: { rules: { test: RegExp; type: string }[] } }) {
    config.module.rules.push({
      test: /\.json$/,
      type: 'json',
    });
    return config;
  },
};

module.exports = nextConfig;

