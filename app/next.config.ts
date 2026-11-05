import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server in .next/standalone with only the node_modules files it actually uses
  output: "standalone",
  reactCompiler: true,
  serverExternalPackages: ["dockerode", "ssh2"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
