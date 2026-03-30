/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.friasneto.com.br' },
      { protocol: 'https', hostname: 'atletico.com.br' },
    ],
  },
};

module.exports = nextConfig;
