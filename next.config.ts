import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Test builds can use their own folder (NEXT_DIST_DIR=.next-test) so they never overwrite the files of a
  // running `npm run dev`, which shares .next by default.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async redirects() {
    return [{ source: "/dashboard/predictions", destination: "/dashboard/model", permanent: false }];
  },
};

export default nextConfig;
