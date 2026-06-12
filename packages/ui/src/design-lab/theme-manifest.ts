export type ThemeVariable = {
  name: string;
  label: string;
  kind: "color" | "length";
  defaultValue: string;
  min?: number;
  max?: number;
  step?: number;
};

export const THEME_MANIFEST: ThemeVariable[] = [
  {
    name: "--primary",
    label: "Primary",
    kind: "color",
    defaultValue: "oklch(0.52 0.105 223.128)",
  },
  {
    name: "--primary-foreground",
    label: "Primary foreground",
    kind: "color",
    defaultValue: "oklch(0.984 0.019 200.873)",
  },
  {
    name: "--background",
    label: "Background",
    kind: "color",
    defaultValue: "oklch(1 0 0)",
  },
  {
    name: "--foreground",
    label: "Foreground",
    kind: "color",
    defaultValue: "oklch(0.141 0.005 285.823)",
  },
  {
    name: "--border",
    label: "Border",
    kind: "color",
    defaultValue: "oklch(0.92 0.004 286.32)",
  },
  {
    name: "--radius",
    label: "Radius base",
    kind: "length",
    defaultValue: "0.625rem",
    min: 0,
    max: 24,
    step: 1,
  },
];
