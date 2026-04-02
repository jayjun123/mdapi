import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Capacitor(오프라인 번들)용: 정적 export로 out/ 생성
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
