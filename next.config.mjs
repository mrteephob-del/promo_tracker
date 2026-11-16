/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/promo_tracker',
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
