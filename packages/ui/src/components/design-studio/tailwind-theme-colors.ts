import { resolveTailwindPaletteColor } from "./tailwind-palette-colors";

export type InspectorColorOption = {
  value: string;
  label: string;
  cssVar?: string;
  swatchClass?: string;
  /** Resolved CSS color for palette presets (no Tailwind utility required). */
  swatchColor?: string;
};

const semanticTextColors: InspectorColorOption[] = [
  { value: "foreground", label: "foreground", cssVar: "--foreground" },
  {
    value: "muted-foreground",
    label: "muted-foreground",
    cssVar: "--muted-foreground",
  },
  { value: "primary", label: "primary", cssVar: "--primary" },
  {
    value: "primary-foreground",
    label: "primary-foreground",
    cssVar: "--primary-foreground",
  },
  { value: "secondary", label: "secondary", cssVar: "--secondary" },
  {
    value: "secondary-foreground",
    label: "secondary-foreground",
    cssVar: "--secondary-foreground",
  },
  { value: "accent", label: "accent", cssVar: "--accent" },
  {
    value: "accent-foreground",
    label: "accent-foreground",
    cssVar: "--accent-foreground",
  },
  { value: "destructive", label: "destructive", cssVar: "--destructive" },
  {
    value: "card-foreground",
    label: "card-foreground",
    cssVar: "--card-foreground",
  },
  {
    value: "popover-foreground",
    label: "popover-foreground",
    cssVar: "--popover-foreground",
  },
  { value: "chart-1", label: "chart-1", cssVar: "--chart-1" },
  { value: "chart-2", label: "chart-2", cssVar: "--chart-2" },
  { value: "chart-3", label: "chart-3", cssVar: "--chart-3" },
  { value: "chart-4", label: "chart-4", cssVar: "--chart-4" },
  { value: "chart-5", label: "chart-5", cssVar: "--chart-5" },
];

const paletteSwatches: [string, string][] = [
  ["slate-400", "bg-slate-400"],
  ["slate-500", "bg-slate-500"],
  ["slate-600", "bg-slate-600"],
  ["gray-400", "bg-gray-400"],
  ["gray-500", "bg-gray-500"],
  ["gray-600", "bg-gray-600"],
  ["zinc-400", "bg-zinc-400"],
  ["zinc-500", "bg-zinc-500"],
  ["zinc-600", "bg-zinc-600"],
  ["neutral-400", "bg-neutral-400"],
  ["neutral-500", "bg-neutral-500"],
  ["neutral-600", "bg-neutral-600"],
  ["stone-400", "bg-stone-400"],
  ["stone-500", "bg-stone-500"],
  ["stone-600", "bg-stone-600"],
  ["red-400", "bg-red-400"],
  ["red-500", "bg-red-500"],
  ["red-600", "bg-red-600"],
  ["orange-400", "bg-orange-400"],
  ["orange-500", "bg-orange-500"],
  ["orange-600", "bg-orange-600"],
  ["amber-400", "bg-amber-400"],
  ["amber-500", "bg-amber-500"],
  ["amber-600", "bg-amber-600"],
  ["yellow-400", "bg-yellow-400"],
  ["yellow-500", "bg-yellow-500"],
  ["yellow-600", "bg-yellow-600"],
  ["lime-400", "bg-lime-400"],
  ["lime-500", "bg-lime-500"],
  ["lime-600", "bg-lime-600"],
  ["green-400", "bg-green-400"],
  ["green-500", "bg-green-500"],
  ["green-600", "bg-green-600"],
  ["emerald-400", "bg-emerald-400"],
  ["emerald-500", "bg-emerald-500"],
  ["emerald-600", "bg-emerald-600"],
  ["teal-400", "bg-teal-400"],
  ["teal-500", "bg-teal-500"],
  ["teal-600", "bg-teal-600"],
  ["cyan-400", "bg-cyan-400"],
  ["cyan-500", "bg-cyan-500"],
  ["cyan-600", "bg-cyan-600"],
  ["sky-400", "bg-sky-400"],
  ["sky-500", "bg-sky-500"],
  ["sky-600", "bg-sky-600"],
  ["blue-400", "bg-blue-400"],
  ["blue-500", "bg-blue-500"],
  ["blue-600", "bg-blue-600"],
  ["indigo-400", "bg-indigo-400"],
  ["indigo-500", "bg-indigo-500"],
  ["indigo-600", "bg-indigo-600"],
  ["violet-400", "bg-violet-400"],
  ["violet-500", "bg-violet-500"],
  ["violet-600", "bg-violet-600"],
  ["purple-400", "bg-purple-400"],
  ["purple-500", "bg-purple-500"],
  ["purple-600", "bg-purple-600"],
  ["fuchsia-400", "bg-fuchsia-400"],
  ["fuchsia-500", "bg-fuchsia-500"],
  ["fuchsia-600", "bg-fuchsia-600"],
  ["pink-400", "bg-pink-400"],
  ["pink-500", "bg-pink-500"],
  ["pink-600", "bg-pink-600"],
  ["rose-400", "bg-rose-400"],
  ["rose-500", "bg-rose-500"],
  ["rose-600", "bg-rose-600"],
];

const paletteTextColors: InspectorColorOption[] = paletteSwatches.map(
  ([value, swatchClass]) => ({
    value,
    label: value,
    swatchClass,
    swatchColor: resolveTailwindPaletteColor(value),
  }),
);

export const TEXT_THEME_COLOR_OPTIONS: InspectorColorOption[] = [
  ...semanticTextColors,
  ...paletteTextColors,
];

const semanticBorderColors: InspectorColorOption[] = [
  { value: "border", label: "border", cssVar: "--border" },
  { value: "input", label: "input", cssVar: "--input" },
  { value: "ring", label: "ring", cssVar: "--ring" },
  { value: "primary", label: "primary", cssVar: "--primary" },
  { value: "secondary", label: "secondary", cssVar: "--secondary" },
  { value: "destructive", label: "destructive", cssVar: "--destructive" },
  { value: "muted", label: "muted", cssVar: "--muted" },
  { value: "accent", label: "accent", cssVar: "--accent" },
  { value: "foreground", label: "foreground", cssVar: "--foreground" },
  { value: "background", label: "background", cssVar: "--background" },
];

const paletteBorderColors: InspectorColorOption[] = paletteSwatches.map(
  ([value, swatchClass]) => ({
    value,
    label: value,
    swatchClass,
    swatchColor: resolveTailwindPaletteColor(value),
  }),
);

export const BORDER_THEME_COLOR_OPTIONS: InspectorColorOption[] = [
  ...semanticBorderColors,
  ...paletteBorderColors,
];
