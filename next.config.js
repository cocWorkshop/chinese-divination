/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Increase default server timeout for long LLM calls
  serverRuntimeConfig: {
    maxDuration: 600,
  },
}
module.exports = nextConfig
