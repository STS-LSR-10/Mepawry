import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Workers has no built-in image optimizer; photos are already compressed before upload
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'imagedelivery.net' }, // Cloudflare Images
    ],
  },
}

export default nextConfig
