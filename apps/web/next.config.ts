import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compile workspace TypeScript packages through the Next.js bundler.
  transpilePackages: ["@lwill/authentication-context"],
};

export default nextConfig;
