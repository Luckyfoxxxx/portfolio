import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow importing from workspace packages without transpiling
  },
  // Treat workspace packages as external (they use TypeScript directly)
  transpilePackages: ["@portfolio/core", "@portfolio/db", "@portfolio/api-adapters"],
  serverExternalPackages: ["better-sqlite3", "@node-rs/argon2"],
};

export default nextConfig;
