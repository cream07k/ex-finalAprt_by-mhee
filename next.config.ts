import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// ── Content Security Policy ──
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com";

const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.ytimg.com https://i.ytimg.com",
  "media-src 'self' blob:",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "connect-src 'self' https://easyslip.com https://*.googlevideo.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security",   value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options",             value: "DENY" },
  { key: "X-Content-Type-Options",      value: "nosniff" },
  { key: "Referrer-Policy",             value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",          value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control",      value: "on" },
  { key: "Content-Security-Policy",     value: csp },
];

const nextConfig: NextConfig = {
  // output standalone เปิดเฉพาะตอน build Docker (ไม่ใช้บน Vercel)
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  poweredByHeader:  false,
  reactStrictMode:  true,
  compress:         true,

  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.ytimg.com" },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: isProd
          ? securityHeaders
          : securityHeaders.filter(h => h.key !== "Strict-Transport-Security"),
      },
    ];
  },

  async redirects() {
    return [
      { source: "/", destination: "/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
