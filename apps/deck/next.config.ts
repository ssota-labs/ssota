import path from "node:path";
import type { NextConfig } from "next";

// deck는 @ssota/ui 소스를 직접 소비하는 독립 프레젠테이션 앱이다.
// 디자인 시스템(@ssota/ui)을 transpile 대상으로 두고, eslint는 빌드에서 제외한다.
const nextConfig: NextConfig = {
  transpilePackages: ["@ssota/ui"],
  turbopack: {
    // 모노레포 루트로 워크스페이스 루트를 고정 (lockfile 추론 경고 제거).
    root: path.join(import.meta.dirname, "../.."),
  },
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
