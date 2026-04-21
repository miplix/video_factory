import type { NextConfig } from 'next';

const config: NextConfig = {
  serverExternalPackages: ['@resvg/resvg-js', 'satori'],
  experimental: {
    // Needed for @resvg/resvg-js native bindings
  },
};

export default config;
