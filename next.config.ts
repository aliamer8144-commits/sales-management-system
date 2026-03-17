import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  env: {
    // إتاحة متغيرات البيئة للعميل
    NEXT_PUBLIC_APP_NAME: "نظام إدارة المبيعات",
  },
};

export default nextConfig;
