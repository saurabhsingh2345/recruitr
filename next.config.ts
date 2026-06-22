import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'avatars.githubusercontent.com' },
      { hostname: 'github.com' },
    ],
  },
  turbopack: {},
  serverExternalPackages: ['pdf-parse'],
}

export default nextConfig
