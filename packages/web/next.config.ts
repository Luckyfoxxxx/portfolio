import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@portfolio/core", "@portfolio/db", "@portfolio/api-adapters"],
  serverExternalPackages: ["better-sqlite3", "@node-rs/argon2"],
};

export default nextConfig;
