/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdfjs-dist', 'nodemailer', 'canvas'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdfjs-dist requires canvas on server; mock it if needed
      config.externals = [...(config.externals || []), 'canvas'];
    }
    return config;
  },
};

module.exports = nextConfig;
