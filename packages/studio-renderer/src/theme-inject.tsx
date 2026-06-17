export const STUDIO_PREVIEW_CLASS = "studio-preview";

export function buildStudioThemeCss(cssText: string): string {
  if (!cssText.trim()) return "";
  return `.${STUDIO_PREVIEW_CLASS} {\n${cssText}\n}`;
}

export function StudioThemeStyle({ cssText }: { cssText: string }) {
  const scoped = buildStudioThemeCss(cssText);
  if (!scoped) return null;
  return <style id="studio-theme-overrides">{scoped}</style>;
}
