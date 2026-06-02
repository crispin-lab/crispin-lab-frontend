import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // dynamic route 의 cached RSC 가 isPending skeleton state 를 재사용하는 회귀 차단.
    staleTimes: { dynamic: 0, static: 300 },
  },
};

export default nextConfig;
