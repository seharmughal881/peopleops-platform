import type { NextConfig } from 'next'

const baselineHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', '),
  },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // pdfkit ships AFM font binaries that should be loaded from disk, not bundled.
  // xlsx also benefits from being external (smaller server bundle).
  serverExternalPackages: ['pdfkit', 'xlsx'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: baselineHeaders,
      },
    ]
  },
}

export default nextConfig
