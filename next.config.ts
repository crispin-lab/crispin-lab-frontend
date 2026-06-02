import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // dynamic route 의 client Router Cache 를 비활성화.
    // `/spaces` 처럼 cookies() 가드 + 클라이언트 fetch 흐름에서 뒤로가기 시
    // cached RSC 가 isPending=true 상태의 snapshot 을 재사용해 목록이 영원히 안 보이는 회귀를 잡는다.
    // static route 의 prefetch (5분) 은 그대로 유지.
    staleTimes: {
      dynamic: 0,
      static: 300,
    },
  },
};

export default nextConfig;
