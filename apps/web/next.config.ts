import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@enos/ui", "@enos/agentos-client"],
};

export default nextConfig;
