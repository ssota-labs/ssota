import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Sentry는 opt-in이다. `NEXT_PUBLIC_SENTRY_ENABLED=1`일 때만 빌드 플러그인
 * (`withSentryConfig`)과 런타임 `Sentry.init`(instrumentation.ts →
 * sentry.server/edge.config.ts, instrumentation-client.ts)을 켠다.
 * 기본은 완전 비활성 — 패키지·설정 파일은 그대로 두고 플래그 하나로 다시 켠다.
 * apps/web/next.config.ts와 같은 규칙 (값은 정확히 `"1"`만 인정).
 */
const sentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED === "1";

/**
 * Sentry CLI expects org/project **slugs**; numeric ids (dashboard URL에서 복사한
 * `45116307…` 류)를 넣으면 "Project not found"로 업로드가 실패한다. 숫자값은
 * 미설정으로 취급하고, org·project·auth token 셋이 모두 유효할 때만 소스맵
 * 업로드를 켠다 — 불완전하면 릴리즈 생성/업로드 자체를 건너뛴다 (빌드는 진행).
 */
function resolveSentrySlug(value: string | undefined): string | undefined {
  const slug = value?.trim();
  if (!slug || /^\d+$/.test(slug)) return undefined;
  return slug;
}

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ssota/core",
    "@ssota/contracts",
    "@ssota/adapter-postgres",
    "@ssota/ui",
  ],
  allowedDevOrigins: ["127.0.0.1"],
};

function withSentry(config: NextConfig): NextConfig {
  // Sentry off (default): no build plugin, no sentry-cli, no source-map upload.
  if (!sentryEnabled) return config;

  // Sentry on: wraps the build to upload source maps and instrument the runtime.
  // Runtime events still require NEXT_PUBLIC_SENTRY_DSN; source maps upload only
  // when SENTRY_AUTH_TOKEN/ORG/PROJECT are all valid slugs (CI/Vercel).
  const sentryOrg = resolveSentrySlug(process.env.SENTRY_ORG);
  const sentryProject = resolveSentrySlug(process.env.SENTRY_PROJECT);
  const sentryUploadReady = Boolean(
    process.env.SENTRY_AUTH_TOKEN && sentryOrg && sentryProject,
  );

  return withSentryConfig(config, {
    // The bundler plugin falls back to SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN
    // env vars whenever an option is `undefined` (`??`), so an incomplete env
    // would still run `sentry-cli releases new` and fail. Pass empty strings
    // (not undefined) to opt out explicitly when the config is incomplete.
    org: sentryOrg ?? "",
    project: sentryProject ?? "",
    authToken: sentryUploadReady ? process.env.SENTRY_AUTH_TOKEN : "",
    sourcemaps: { disable: !sentryUploadReady },
    release: { create: sentryUploadReady, finalize: sentryUploadReady },
    silent: !process.env.CI,
    widenClientFileUpload: true,
    webpack: {
      treeshake: {
        removeDebugLogging: true,
      },
    },
  });
}

export default withSentry(nextConfig);
