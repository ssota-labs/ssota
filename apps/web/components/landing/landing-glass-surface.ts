import { cn } from "@/lib/utils";

/** 히어로 프롬프트·하단 CTA 등 랜딩 글래스 서피스 공통 토큰 */
export const landingGlassSurfaceClassName =
  "border border-white/20 ring-1 ring-inset ring-primary/15 backdrop-blur-lg bg-primary/15 shadow-lg shadow-black/15 supports-backdrop-filter:bg-primary/10";

export function landingGlassPanelClassName(
  ...extra: Parameters<typeof cn>
) {
  return cn(
    landingGlassSurfaceClassName,
    "rounded-[2rem] md:rounded-[2.5rem]",
    ...extra,
  );
}

export function landingGlassPillClassName(...extra: Parameters<typeof cn>) {
  return cn(landingGlassSurfaceClassName, "rounded-full", ...extra);
}
