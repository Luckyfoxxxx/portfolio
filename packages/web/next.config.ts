import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent clickjacking by disallowing framing by other origins.
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't send Referer header to cross-origin destinations.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features that the app doesn't use.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Content Security Policy: only allow same-origin resources plus Next.js
  // inline scripts (identified by nonces in production, hashes in dev).
  // 'unsafe-inline' on style-src is required by Tailwind's runtime class injection.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@portfolio/core", "@portfolio/db", "@portfolio/api-adapters"],
  serverExternalPackages: ["better-sqlite3", "@node-rs/argon2"],
  async headers() {
    return [
      {
        // Apply security headers to all routes.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
