/** 배포 환경에서만 `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` 로 켭니다. */
export function isGoogleAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";
}

/** OAuth redirectTo·콜백에 쓰는 공개 사이트 origin (trailing slash 없음). */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://127.0.0.1:3000";
}
