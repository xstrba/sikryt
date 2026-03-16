import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["dockerode", "ssh2"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
