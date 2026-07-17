import type { NextConfig } from "next";

/**
 * Strict Content-Security-Policy.
 *
 * Notes on tradeoffs:
 * - `script-src` allows `'unsafe-inline'` because we serve statically-cached,
 *   revalidated public pages (feed, piece, profile) to hit the LCP < 1.5s budget.
 *   A per-request nonce would force fully dynamic rendering and defeat that cache.
 *   Everything else is locked down (`object-src 'none'`, `base-uri 'self'`,
 *   `frame-ancestors 'none'`, `form-action 'self'`), and we never use `'unsafe-eval'`.
 * - Mux Player streams HLS from stream.mux.com, posters from image.mux.com, and
 *   reports playback analytics to *.litix.io (Mux Data).
 * - Supabase serves REST/Storage over https and Realtime over wss.
 * - Mux direct uploads PUT to storage.googleapis.com.
 */
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://*.supabase.co https://image.mux.com`,
  `media-src 'self' blob: https://*.supabase.co https://stream.mux.com`,
  `font-src 'self' data:`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://stream.mux.com https://image.mux.com https://*.litix.io https://storage.googleapis.com https://api.mux.com`,
  `worker-src 'self' blob:`,
  `frame-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
]
  .join("; ")
  .concat(";");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Human-made art, human-made discovery. Opt out of third-party AI crawlers/training.
  { key: "X-Robots-Tag", value: "noai, noimageai" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), browsing-topics=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "image.mux.com" },
    ],
  },
  // sharp is a native dependency used only in server routes; keep it external.
  serverExternalPackages: ["sharp"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
