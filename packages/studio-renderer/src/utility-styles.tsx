export const STUDIO_UTILITY_STYLE_ID = "studio-utility-overrides";

export function StudioUtilityStyle({ cssText }: { cssText: string }) {
  if (!cssText.trim()) return null;
  return <style id={STUDIO_UTILITY_STYLE_ID}>{cssText}</style>;
}
