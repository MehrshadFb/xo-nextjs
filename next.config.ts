import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**/*": ["./proto/**/*.proto"],
  },
};

export default nextConfig;
