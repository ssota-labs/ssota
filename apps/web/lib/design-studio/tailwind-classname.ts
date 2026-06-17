export type FontSizeUnit = "px" | "%" | "em";

const DEFAULT_PARENT_FONT_SIZE_PX = 16;

function formatTypographyNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

/** line-height·letter-spacing — 요소 font-size 대비 비율로 단위를 변환합니다. */
function toRelativeTypographyRatio(
  value: string,
  unit: FontSizeUnit,
  fontSizePx: number,
): number | null {
  const num = Number(value.trim());
  if (!Number.isFinite(num)) return null;
  if (fontSizePx <= 0) return null;

  switch (unit) {
    case "%":
      return num / 100;
    case "em":
      return num;
    case "px":
      return num / fontSizePx;
  }
}

function fromRelativeTypographyRatio(
  ratio: number,
  unit: FontSizeUnit,
  fontSizePx: number,
): string {
  switch (unit) {
    case "%":
      return formatTypographyNumber(ratio * 100);
    case "em":
      return formatTypographyNumber(ratio);
    case "px":
      return formatTypographyNumber(ratio * fontSizePx);
  }
}

/** font-size — 부모 font-size(기본 16px) 대비 절대 px로 변환합니다. */
function toAbsoluteFontSizePx(
  value: string,
  unit: FontSizeUnit,
  parentFontSizePx: number,
): number | null {
  const num = Number(value.trim());
  if (!Number.isFinite(num)) return null;

  switch (unit) {
    case "px":
      return num;
    case "%":
      return (parentFontSizePx * num) / 100;
    case "em":
      return parentFontSizePx * num;
  }
}

function fromAbsoluteFontSizePx(
  px: number,
  unit: FontSizeUnit,
  parentFontSizePx: number,
): string {
  switch (unit) {
    case "px":
      return formatTypographyNumber(px);
    case "%":
      return formatTypographyNumber((px / parentFontSizePx) * 100);
    case "em":
      return formatTypographyNumber(px / parentFontSizePx);
  }
}

const NAMED_FONT_SIZE_TO_PX: Record<string, string> = {
  "text-xs": "12",
  "text-sm": "14",
  "text-base": "16",
  "text-lg": "18",
  "text-xl": "20",
  "text-2xl": "24",
  "text-3xl": "30",
};

const PX_FONT_SIZE_PRESETS: Record<string, string> = {
  "10": "text-[10px]",
  "12": "text-xs",
  "14": "text-sm",
  "16": "text-base",
  "18": "text-lg",
  "20": "text-xl",
  "24": "text-2xl",
};

export function parseFontSizeValue(className?: string): {
  value: string;
  unit: FontSizeUnit;
} {
  if (!className) return { value: "", unit: "px" };

  if (className.startsWith("text-[") && className.endsWith("]")) {
    const inner = className.slice(6, -1);
    const match = inner.match(/^([\d.]+)(px|%|em)$/);
    if (match) {
      return {
        value: match[1]!,
        unit: match[2] as FontSizeUnit,
      };
    }
    const pxMatch = inner.match(/^([\d.]+)px$/);
    if (pxMatch) return { value: pxMatch[1]!, unit: "px" };
    const numMatch = inner.match(/^([\d.]+)/);
    return { value: numMatch?.[1] ?? "", unit: "px" };
  }

  if (NAMED_FONT_SIZE_TO_PX[className]) {
    return { value: NAMED_FONT_SIZE_TO_PX[className]!, unit: "px" };
  }

  return { value: "", unit: "px" };
}

export function resolveFontSizePxFromClass(className?: string): number {
  const { value, unit } = parseFontSizeValue(className);
  if (!value.trim()) return DEFAULT_PARENT_FONT_SIZE_PX;
  return (
    toAbsoluteFontSizePx(value, unit, DEFAULT_PARENT_FONT_SIZE_PX) ??
    DEFAULT_PARENT_FONT_SIZE_PX
  );
}

export function formatFontSizeClass(
  value: string,
  unit: FontSizeUnit,
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (unit === "px") {
    if (PX_FONT_SIZE_PRESETS[trimmed]) return PX_FONT_SIZE_PRESETS[trimmed];
    return `text-[${trimmed}px]`;
  }

  return `text-[${trimmed}${unit}]`;
}

const FONT_SIZE_UNIT_DEFAULTS: Record<FontSizeUnit, string> = {
  px: "16",
  "%": "100",
  em: "1",
};

/** 값이 비어 있을 때도 단위 전환이 classname에 반영되도록 기본값을 채웁니다. */
export function formatFontSizeOnUnitChange(
  value: string,
  currentUnit: FontSizeUnit,
  nextUnit: FontSizeUnit,
  parentFontSizePx = DEFAULT_PARENT_FONT_SIZE_PX,
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return formatFontSizeClass(FONT_SIZE_UNIT_DEFAULTS[nextUnit], nextUnit);
  }

  const px = toAbsoluteFontSizePx(trimmed, currentUnit, parentFontSizePx);
  if (px === null) return formatFontSizeClass(trimmed, nextUnit);

  return formatFontSizeClass(
    fromAbsoluteFontSizePx(px, nextUnit, parentFontSizePx),
    nextUnit,
  );
}

const NAMED_LINE_HEIGHT_TO_EM: Record<string, string> = {
  "leading-none": "1",
  "leading-tight": "1.25",
  "leading-snug": "1.375",
  "leading-relaxed": "1.625",
  "leading-loose": "2",
};

const EM_LINE_HEIGHT_TO_NAMED: Record<string, string> = {
  "1": "leading-none",
  "1.25": "leading-tight",
  "1.375": "leading-snug",
  "1.625": "leading-relaxed",
  "2": "leading-loose",
};

export function parseLineHeightValue(className?: string): {
  value: string;
  unit: FontSizeUnit;
} {
  if (!className || className === "leading-normal") {
    return { value: "", unit: "em" };
  }

  if (className.startsWith("leading-[") && className.endsWith("]")) {
    const inner = className.slice(9, -1);
    const match = inner.match(/^([\d.]+)(px|%|em)$/);
    if (match) {
      return {
        value: match[1]!,
        unit: match[2] as FontSizeUnit,
      };
    }
    return { value: inner, unit: "em" };
  }

  if (NAMED_LINE_HEIGHT_TO_EM[className]) {
    return { value: NAMED_LINE_HEIGHT_TO_EM[className]!, unit: "em" };
  }

  return { value: className.replace(/^leading-/, ""), unit: "em" };
}

export function formatLineHeightClass(
  value: string,
  unit: FontSizeUnit,
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed === "normal") return "leading-normal";

  if (unit === "em" && EM_LINE_HEIGHT_TO_NAMED[trimmed]) {
    return EM_LINE_HEIGHT_TO_NAMED[trimmed];
  }

  return `leading-[${trimmed}${unit}]`;
}

const LINE_HEIGHT_UNIT_DEFAULTS: Record<FontSizeUnit, string> = {
  px: "24",
  "%": "150",
  em: "1.5",
};

export function formatLineHeightOnUnitChange(
  value: string,
  currentUnit: FontSizeUnit,
  nextUnit: FontSizeUnit,
  fontSizePx = DEFAULT_PARENT_FONT_SIZE_PX,
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return formatLineHeightClass(LINE_HEIGHT_UNIT_DEFAULTS[nextUnit], nextUnit);
  }

  const ratio = toRelativeTypographyRatio(trimmed, currentUnit, fontSizePx);
  if (ratio === null) return formatLineHeightClass(trimmed, nextUnit);

  return formatLineHeightClass(
    fromRelativeTypographyRatio(ratio, nextUnit, fontSizePx),
    nextUnit,
  );
}

const NAMED_LETTER_SPACING_TO_EM: Record<string, string> = {
  "tracking-tighter": "-0.05",
  "tracking-tight": "-0.025",
  "tracking-wide": "0.025",
  "tracking-wider": "0.05",
  "tracking-widest": "0.1",
};

const EM_LETTER_SPACING_TO_NAMED: Record<string, string> = {
  "-0.05": "tracking-tighter",
  "-0.025": "tracking-tight",
  "0.025": "tracking-wide",
  "0.05": "tracking-wider",
  "0.1": "tracking-widest",
};

export function parseLetterSpacingValue(className?: string): {
  value: string;
  unit: FontSizeUnit;
} {
  if (!className || className === "tracking-normal") {
    return { value: "", unit: "em" };
  }

  if (className.startsWith("tracking-[") && className.endsWith("]")) {
    const inner = className.slice(10, -1);
    const match = inner.match(/^(-?[\d.]+)(px|%|em)$/);
    if (match) {
      return {
        value: match[1]!,
        unit: match[2] as FontSizeUnit,
      };
    }
    return { value: inner, unit: "em" };
  }

  if (NAMED_LETTER_SPACING_TO_EM[className]) {
    return { value: NAMED_LETTER_SPACING_TO_EM[className]!, unit: "em" };
  }

  return { value: className.replace(/^tracking-/, ""), unit: "em" };
}

export function formatLetterSpacingClass(
  value: string,
  unit: FontSizeUnit,
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed === "normal") return "tracking-normal";

  if (unit === "em" && EM_LETTER_SPACING_TO_NAMED[trimmed]) {
    return EM_LETTER_SPACING_TO_NAMED[trimmed];
  }

  return `tracking-[${trimmed}${unit}]`;
}

const LETTER_SPACING_UNIT_DEFAULTS: Record<FontSizeUnit, string> = {
  px: "0",
  "%": "0",
  em: "0",
};

export function formatLetterSpacingOnUnitChange(
  value: string,
  currentUnit: FontSizeUnit,
  nextUnit: FontSizeUnit,
  fontSizePx = DEFAULT_PARENT_FONT_SIZE_PX,
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return formatLetterSpacingClass(
      LETTER_SPACING_UNIT_DEFAULTS[nextUnit],
      nextUnit,
    );
  }

  const ratio = toRelativeTypographyRatio(trimmed, currentUnit, fontSizePx);
  if (ratio === null) return formatLetterSpacingClass(trimmed, nextUnit);

  return formatLetterSpacingClass(
    fromRelativeTypographyRatio(ratio, nextUnit, fontSizePx),
    nextUnit,
  );
}

export function formatSpacingPx(
  prefix: string,
  value: string,
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return `${prefix}-[${trimmed}px]`;
}

export function formatBorderWidthPx(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed === "1") return "border";
  if (trimmed === "0") return "border-0";
  if (trimmed === "2") return "border-2";
  if (trimmed === "4") return "border-4";
  if (trimmed === "8") return "border-8";
  return `border-[${trimmed}px]`;
}

export function parseBorderWidthPx(className?: string): string {
  if (!className) return "";
  if (className === "border") return "1";

  const arbitrary = className.match(/^border-\[(.+)\]$/);
  if (arbitrary) {
    const pxMatch = arbitrary[1]!.match(/^([\d.]+)px$/);
    if (pxMatch) return pxMatch[1]!;
    return "";
  }

  const scaleMatch = className.match(/^border-(\d+)$/);
  if (scaleMatch) {
    return scaleMatch[1]!;
  }

  return "";
}

const NAMED_RADIUS_TO_PX: Record<string, string> = {
  "rounded-none": "0",
  rounded: "4",
  "rounded-sm": "2",
  "rounded-md": "6",
  "rounded-lg": "8",
  "rounded-xl": "12",
  "rounded-2xl": "16",
  "rounded-3xl": "24",
  "rounded-full": "9999",
};

export type RadiusUnit = "px" | "%";

export function parseRadiusValue(className?: string): {
  value: string;
  unit: RadiusUnit;
} {
  if (!className) return { value: "", unit: "px" };

  if (NAMED_RADIUS_TO_PX[className]) {
    return { value: NAMED_RADIUS_TO_PX[className]!, unit: "px" };
  }

  const arbitrary = className.match(/-\[(.+)\]$/);
  if (arbitrary) {
    const match = arbitrary[1]!.match(/^([\d.]+)(px|%)$/);
    if (match) {
      return {
        value: match[1]!,
        unit: match[2] as RadiusUnit,
      };
    }
    const pxMatch = arbitrary[1]!.match(/^([\d.]+)px$/);
    if (pxMatch) return { value: pxMatch[1]!, unit: "px" };
  }

  return { value: "", unit: "px" };
}

export function parseRadiusPx(className?: string): string {
  return parseRadiusValue(className).value;
}

export function formatRadiusClass(
  prefix: string,
  value: string,
  unit: RadiusUnit = "px",
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (unit === "px" && prefix === "rounded" && trimmed === "9999") {
    return "rounded-full";
  }
  return `${prefix}-[${trimmed}${unit}]`;
}

export function formatRadiusPx(prefix: string, value: string): string | undefined {
  return formatRadiusClass(prefix, value, "px");
}

export function parseOpacityPercent(className?: string): string {
  if (!className) return "";

  const arbitrary = className.match(/^opacity-\[(.+)\]$/);
  if (arbitrary) {
    const percentMatch = arbitrary[1]!.match(/^([\d.]+)%$/);
    if (percentMatch) return clampOpacityPercent(percentMatch[1]!);
    const decimalMatch = arbitrary[1]!.match(/^0?\.([\d]+)$/);
    if (decimalMatch) {
      return clampOpacityPercent(String(Number(`0.${decimalMatch[1]}`) * 100));
    }
    return "";
  }

  const scaleMatch = className.match(/^opacity-(\d+)$/);
  if (scaleMatch) {
    return clampOpacityPercent(scaleMatch[1]!);
  }

  return "";
}

function clampOpacityPercent(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  return String(Math.min(100, Math.max(0, numeric)));
}

export function formatOpacityPercent(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return undefined;
  const clamped = Math.min(100, Math.max(0, numeric));
  if (clamped >= 0 && clamped <= 100 && Number.isInteger(clamped) && clamped % 5 === 0) {
    return `opacity-${clamped}`;
  }
  return `opacity-[${clamped}%]`;
}

export function stripColorToken(className?: string, prefix?: string): string {
  if (!className) return "";
  if (prefix && className.startsWith(`${prefix}-`)) {
    const rest = className.slice(prefix.length + 1);
    if (rest.startsWith("[") && rest.endsWith("]")) {
      return rest.slice(1, -1);
    }
    return rest;
  }
  return className;
}

export function formatColorToken(
  prefix: string,
  value: string,
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("rgb") ||
    trimmed.startsWith("hsl") ||
    trimmed.startsWith("lab")
  ) {
    return `${prefix}-[${trimmed}]`;
  }
  return `${prefix}-${trimmed}`;
}

export function parseSpacingPx(className?: string): string {
  if (!className) return "";

  const arbitrary = className.match(/-\[(.+)\]$/);
  if (arbitrary) {
    const pxMatch = arbitrary[1]!.match(/^(-?[\d.]+)px$/);
    if (pxMatch) return pxMatch[1]!;
    return "";
  }

  const scaleMatch = className.match(/-(.+)$/);
  if (!scaleMatch) return "";

  const token = scaleMatch[1]!;
  if (/^-?\d+(\.\d+)?$/.test(token)) {
    return String(Number(token) * 4);
  }

  return "";
}

function applyMarginShorthand(
  parsed: ParsedClassName,
  base: string,
  sides: Array<"marginTop" | "marginRight" | "marginBottom" | "marginLeft">,
) {
  for (const side of sides) {
    parsed[side] = base;
  }
}

function applyPaddingShorthand(
  parsed: ParsedClassName,
  base: string,
  sides: Array<
    "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft"
  >,
) {
  for (const side of sides) {
    parsed[side] = base;
  }
}

export type ShadowPreset =
  | "none"
  | "sm"
  | "default"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "custom";

export type ShadowValue = {
  preset: ShadowPreset;
  x: string;
  y: string;
  blur: string;
  spread: string;
  color: string;
  inset: boolean;
};

export type ParsedClassName = {
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  fontStyle?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textColor?: string;
  textAlign?: string;
  textTransform?: string;
  textDecoration?: string;
  display?: string;
  flexDirection?: string;
  alignItems?: string;
  justifyContent?: string;
  gap?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  width?: string;
  height?: string;
  background?: string;
  borderStyle?: string;
  borderWidth?: string;
  borderColor?: string;
  borderRadius?: string;
  borderRadiusTopLeft?: string;
  borderRadiusTopRight?: string;
  borderRadiusBottomLeft?: string;
  borderRadiusBottomRight?: string;
  opacity?: string;
  shadow: ShadowValue;
  remainder: string[];
};

const TEXT_SIZES = new Set([
  "text-xs",
  "text-sm",
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
  "text-3xl",
  "text-4xl",
  "text-5xl",
  "text-6xl",
  "text-7xl",
  "text-8xl",
  "text-9xl",
]);

const TEXT_ALIGNS = new Set([
  "text-left",
  "text-center",
  "text-right",
  "text-justify",
  "text-start",
  "text-end",
]);

const FONT_WEIGHTS = new Set([
  "font-thin",
  "font-extralight",
  "font-light",
  "font-normal",
  "font-medium",
  "font-semibold",
  "font-bold",
  "font-extrabold",
  "font-black",
]);

const FONT_FAMILIES = new Set(["font-sans", "font-serif", "font-mono"]);

const FONT_STYLES = new Set(["italic", "not-italic"]);

const TEXT_TRANSFORMS = new Set([
  "uppercase",
  "lowercase",
  "capitalize",
  "normal-case",
]);

const TEXT_DECORATIONS = new Set([
  "underline",
  "line-through",
  "overline",
  "no-underline",
]);

const DISPLAYS = new Set([
  "block",
  "inline-block",
  "inline",
  "flex",
  "inline-flex",
  "grid",
  "inline-grid",
  "hidden",
  "contents",
]);

const FLEX_DIRECTIONS = new Set([
  "flex-row",
  "flex-row-reverse",
  "flex-col",
  "flex-col-reverse",
]);

const ALIGN_ITEMS = new Set([
  "items-start",
  "items-end",
  "items-center",
  "items-baseline",
  "items-stretch",
]);

const JUSTIFY_CONTENT = new Set([
  "justify-start",
  "justify-end",
  "justify-center",
  "justify-between",
  "justify-around",
  "justify-evenly",
]);

const BORDER_STYLES = new Set([
  "border-solid",
  "border-dashed",
  "border-dotted",
  "border-double",
  "border-hidden",
  "border-none",
]);

const BORDER_WIDTH_SCALES = new Set([
  "border-0",
  "border-2",
  "border-4",
  "border-8",
]);

const SHADOW_PRESET_MAP: Record<string, ShadowPreset> = {
  "shadow-none": "none",
  "shadow-sm": "sm",
  shadow: "default",
  "shadow-md": "md",
  "shadow-lg": "lg",
  "shadow-xl": "xl",
  "shadow-2xl": "2xl",
};

const DEFAULT_SHADOW: ShadowValue = {
  preset: "none",
  x: "0px",
  y: "0px",
  blur: "0px",
  spread: "0px",
  color: "rgba(0, 0, 0, 0.1)",
  inset: false,
};

function splitVariants(token: string): { variants: string[]; base: string } {
  const parts = token.split(":");
  if (parts.length === 1) {
    return { variants: [], base: token };
  }
  return { variants: parts.slice(0, -1), base: parts[parts.length - 1]! };
}

function isTextColor(base: string): boolean {
  if (!base.startsWith("text-")) return false;
  if (TEXT_SIZES.has(base) || TEXT_ALIGNS.has(base)) return false;
  return true;
}

function parseArbitraryShadow(base: string): ShadowValue | null {
  const match = base.match(/^shadow-\[(.+)\]$/);
  if (!match) return null;

  let raw = match[1]!.replace(/_/g, " ").trim();
  let inset = false;
  if (raw.startsWith("inset ")) {
    inset = true;
    raw = raw.slice(6).trim();
  }

  const rgbaMatch = raw.match(/(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|\S+)$/);
  const color = rgbaMatch ? rgbaMatch[1]! : "rgba(0, 0, 0, 0.1)";
  const sizePart = rgbaMatch ? raw.slice(0, -color.length).trim() : raw;
  const sizes = sizePart.split(/\s+/).filter(Boolean);

  return {
    preset: "custom",
    x: sizes[0] ?? "0px",
    y: sizes[1] ?? "0px",
    blur: sizes[2] ?? "0px",
    spread: sizes[3] ?? "0px",
    color,
    inset,
  };
}

function serializeArbitraryShadow(shadow: ShadowValue): string {
  const inset = shadow.inset ? "inset " : "";
  const color = shadow.color.replace(/\s+/g, "");
  const value = `${inset}${shadow.x} ${shadow.y} ${shadow.blur} ${shadow.spread} ${color}`
    .trim()
    .replace(/\s+/g, "_");
  return `shadow-[${value}]`;
}

export function parseClassName(className: string | undefined): ParsedClassName {
  const parsed: ParsedClassName = {
    shadow: { ...DEFAULT_SHADOW },
    remainder: [],
  };

  const tokens = (className ?? "").split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const { variants, base } = splitVariants(token);
    if (variants.length > 0) {
      parsed.remainder.push(token);
      continue;
    }

    if (TEXT_SIZES.has(base) || /^text-\[.+\]$/.test(base)) {
      parsed.fontSize = base;
      continue;
    }
    if (TEXT_ALIGNS.has(base)) {
      parsed.textAlign = base;
      continue;
    }
    if (isTextColor(base)) {
      parsed.textColor = base;
      continue;
    }
    if (FONT_WEIGHTS.has(base)) {
      parsed.fontWeight = base;
      continue;
    }
    if (FONT_FAMILIES.has(base)) {
      parsed.fontFamily = base;
      continue;
    }
    if (FONT_STYLES.has(base)) {
      parsed.fontStyle = base;
      continue;
    }
    if (TEXT_TRANSFORMS.has(base)) {
      parsed.textTransform = base;
      continue;
    }
    if (TEXT_DECORATIONS.has(base)) {
      parsed.textDecoration = base;
      continue;
    }
    if (base.startsWith("leading-") || /^leading-\[.+\]$/.test(base)) {
      parsed.lineHeight = base;
      continue;
    }
    if (base.startsWith("tracking-") || /^tracking-\[.+\]$/.test(base)) {
      parsed.letterSpacing = base;
      continue;
    }
    if (DISPLAYS.has(base)) {
      parsed.display = base;
      continue;
    }
    if (FLEX_DIRECTIONS.has(base)) {
      parsed.flexDirection = base;
      continue;
    }
    if (ALIGN_ITEMS.has(base)) {
      parsed.alignItems = base;
      continue;
    }
    if (JUSTIFY_CONTENT.has(base)) {
      parsed.justifyContent = base;
      continue;
    }
    if (base.startsWith("gap-") || base === "gap") {
      parsed.gap = base;
      continue;
    }
    if (base.startsWith("mt-") || base === "mt") {
      parsed.marginTop = base;
      continue;
    }
    if (base.startsWith("mr-") || base === "mr") {
      parsed.marginRight = base;
      continue;
    }
    if (base.startsWith("mb-") || base === "mb") {
      parsed.marginBottom = base;
      continue;
    }
    if (base.startsWith("ml-") || base === "ml") {
      parsed.marginLeft = base;
      continue;
    }
    if (base.startsWith("mx-") || base === "mx") {
      applyMarginShorthand(parsed, base, ["marginLeft", "marginRight"]);
      continue;
    }
    if (base.startsWith("my-") || base === "my") {
      applyMarginShorthand(parsed, base, ["marginTop", "marginBottom"]);
      continue;
    }
    if (
      base.startsWith("m-") &&
      !base.startsWith("mx-") &&
      !base.startsWith("my-") &&
      !base.startsWith("mt-") &&
      !base.startsWith("mr-") &&
      !base.startsWith("mb-") &&
      !base.startsWith("ml-")
    ) {
      applyMarginShorthand(parsed, base, [
        "marginTop",
        "marginRight",
        "marginBottom",
        "marginLeft",
      ]);
      continue;
    }
    if (base.startsWith("pt-") || base === "pt") {
      parsed.paddingTop = base;
      continue;
    }
    if (base.startsWith("pr-") || base === "pr") {
      parsed.paddingRight = base;
      continue;
    }
    if (base.startsWith("pb-") || base === "pb") {
      parsed.paddingBottom = base;
      continue;
    }
    if (base.startsWith("pl-") || base === "pl") {
      parsed.paddingLeft = base;
      continue;
    }
    if (base.startsWith("px-") || base === "px") {
      applyPaddingShorthand(parsed, base, ["paddingLeft", "paddingRight"]);
      continue;
    }
    if (base.startsWith("py-") || base === "py") {
      applyPaddingShorthand(parsed, base, ["paddingTop", "paddingBottom"]);
      continue;
    }
    if (
      base.startsWith("p-") &&
      !base.startsWith("px-") &&
      !base.startsWith("py-") &&
      !base.startsWith("pt-") &&
      !base.startsWith("pr-") &&
      !base.startsWith("pb-") &&
      !base.startsWith("pl-")
    ) {
      applyPaddingShorthand(parsed, base, [
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
      ]);
      continue;
    }
    if (base.startsWith("w-")) {
      parsed.width = base;
      continue;
    }
    if (base.startsWith("h-")) {
      parsed.height = base;
      continue;
    }
    if (base.startsWith("bg-")) {
      parsed.background = base;
      continue;
    }
    if (BORDER_STYLES.has(base)) {
      parsed.borderStyle = base;
      continue;
    }
    if (base.startsWith("rounded-tl")) {
      parsed.borderRadiusTopLeft = base;
      continue;
    }
    if (base.startsWith("rounded-tr")) {
      parsed.borderRadiusTopRight = base;
      continue;
    }
    if (base.startsWith("rounded-bl")) {
      parsed.borderRadiusBottomLeft = base;
      continue;
    }
    if (base.startsWith("rounded-br")) {
      parsed.borderRadiusBottomRight = base;
      continue;
    }
    if (base.startsWith("rounded")) {
      parsed.borderRadius = base;
      continue;
    }
    if (base === "border" || BORDER_WIDTH_SCALES.has(base)) {
      parsed.borderWidth = base;
      continue;
    }
    if (base.startsWith("border-[") && base.endsWith("]")) {
      const inner = base.slice(8, -1);
      if (/^[\d.]+px$/.test(inner)) {
        parsed.borderWidth = base;
        continue;
      }
      parsed.borderColor = base;
      continue;
    }
    if (base.startsWith("border-")) {
      parsed.borderColor = base;
      continue;
    }
    if (base.startsWith("opacity-")) {
      parsed.opacity = base;
      continue;
    }
    if (SHADOW_PRESET_MAP[base]) {
      parsed.shadow = {
        ...DEFAULT_SHADOW,
        preset: SHADOW_PRESET_MAP[base]!,
      };
      continue;
    }
    const customShadow = parseArbitraryShadow(base);
    if (customShadow) {
      parsed.shadow = customShadow;
      continue;
    }

    parsed.remainder.push(token);
  }

  return parsed;
}

export function serializeClassName(parsed: ParsedClassName): string {
  const tokens: string[] = [];

  if (parsed.fontFamily) tokens.push(parsed.fontFamily);
  if (parsed.fontSize) tokens.push(parsed.fontSize);
  if (parsed.fontWeight) tokens.push(parsed.fontWeight);
  if (parsed.fontStyle) tokens.push(parsed.fontStyle);
  if (parsed.lineHeight) tokens.push(parsed.lineHeight);
  if (parsed.letterSpacing) tokens.push(parsed.letterSpacing);
  if (parsed.textAlign) tokens.push(parsed.textAlign);
  if (parsed.textTransform) tokens.push(parsed.textTransform);
  if (parsed.textDecoration) tokens.push(parsed.textDecoration);
  if (parsed.textColor) tokens.push(parsed.textColor);
  if (parsed.display) tokens.push(parsed.display);
  if (parsed.flexDirection) tokens.push(parsed.flexDirection);
  if (parsed.alignItems) tokens.push(parsed.alignItems);
  if (parsed.justifyContent) tokens.push(parsed.justifyContent);
  if (parsed.gap) tokens.push(parsed.gap);
  if (parsed.marginTop) tokens.push(parsed.marginTop);
  if (parsed.marginRight) tokens.push(parsed.marginRight);
  if (parsed.marginBottom) tokens.push(parsed.marginBottom);
  if (parsed.marginLeft) tokens.push(parsed.marginLeft);
  if (parsed.paddingTop) tokens.push(parsed.paddingTop);
  if (parsed.paddingRight) tokens.push(parsed.paddingRight);
  if (parsed.paddingBottom) tokens.push(parsed.paddingBottom);
  if (parsed.paddingLeft) tokens.push(parsed.paddingLeft);
  if (parsed.width) tokens.push(parsed.width);
  if (parsed.height) tokens.push(parsed.height);
  if (parsed.background) tokens.push(parsed.background);
  if (parsed.borderStyle) tokens.push(parsed.borderStyle);
  if (parsed.borderWidth) tokens.push(parsed.borderWidth);
  if (parsed.borderColor) tokens.push(parsed.borderColor);
  if (parsed.borderRadius) tokens.push(parsed.borderRadius);
  if (parsed.borderRadiusTopLeft) tokens.push(parsed.borderRadiusTopLeft);
  if (parsed.borderRadiusTopRight) tokens.push(parsed.borderRadiusTopRight);
  if (parsed.borderRadiusBottomLeft) tokens.push(parsed.borderRadiusBottomLeft);
  if (parsed.borderRadiusBottomRight) tokens.push(parsed.borderRadiusBottomRight);
  if (parsed.opacity) tokens.push(parsed.opacity);

  const { shadow } = parsed;
  if (shadow.preset === "none") {
    tokens.push("shadow-none");
  } else if (shadow.preset === "custom") {
    tokens.push(serializeArbitraryShadow(shadow));
  } else if (shadow.preset === "default") {
    tokens.push("shadow");
  } else {
    tokens.push(`shadow-${shadow.preset}`);
  }

  tokens.push(...parsed.remainder);

  return tokens.join(" ").trim();
}

export function patchClassName(
  className: string | undefined,
  patch: Partial<Omit<ParsedClassName, "remainder" | "shadow">> & {
    shadow?: Partial<ShadowValue>;
  },
): string {
  const parsed = parseClassName(className);
  const next: ParsedClassName = {
    ...parsed,
    ...patch,
    shadow: patch.shadow ? { ...parsed.shadow, ...patch.shadow } : parsed.shadow,
  };
  return serializeClassName(next);
}
