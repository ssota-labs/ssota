export type WireframeViewport = "mobile" | "tablet" | "desktop";

export type WireframeViewportSize = {
  width: number;
  height: number;
};

export const WIREFRAME_VIEWPORT_SIZES: Record<
  WireframeViewport,
  WireframeViewportSize
> = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
};

export const WIREFRAME_VIEWPORT_ORDER: WireframeViewport[] = [
  "mobile",
  "tablet",
  "desktop",
];
