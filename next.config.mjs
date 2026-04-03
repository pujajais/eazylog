/** @type {import('next').NextConfig} */
const nextConfig = {
  // Three.js requires this for proper bundling
  transpilePackages: ['three'],
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
};

export default nextConfig;
