/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config: { experiments: { asyncWebAssembly: boolean; topLevelAwait: boolean; layers: boolean; }; output: { webassemblyModuleFilename: string; }; }) => {
    config.experiments = {
      asyncWebAssembly: true,
      topLevelAwait: true,
      layers: true,
    };
    config.output.webassemblyModuleFilename = "static/wasm/[modulehash].wasm";
    return config;
  },
};

module.exports = nextConfig;
