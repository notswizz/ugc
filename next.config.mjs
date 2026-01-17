/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  async redirects() {
    return [
      // Creator campaign routes -> jobs routes
      {
        source: '/creator/campaigns',
        destination: '/creator/jobs',
        permanent: false,
      },
      {
        source: '/creator/campaigns/history',
        destination: '/creator/jobs/history',
        permanent: false,
      },
      {
        source: '/creator/campaigns/:path*',
        destination: '/creator/jobs/:path*',
        permanent: false,
      },
      // Brand campaign routes -> jobs routes
      {
        source: '/brand/campaigns',
        destination: '/brand/jobs',
        permanent: false,
      },
      {
        source: '/brand/campaigns/new',
        destination: '/brand/jobs/new',
        permanent: false,
      },
      {
        source: '/brand/campaigns/:path*',
        destination: '/brand/jobs/:path*',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
