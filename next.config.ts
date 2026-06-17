import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/**/*": ["./proto/**/*.proto"],
  },
};

export default nextConfig;
