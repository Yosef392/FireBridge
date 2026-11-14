import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [{ source: "/dashboard/predictions", destination: "/dashboard/model", permanent: false }];
  },
};

export default nextConfig;
