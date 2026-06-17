export type FontSizeUnit = "px" | "%" | "em";

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

export function formatSpacingPx(
  prefix: string,
  value: string,
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return `${prefix}-[${trimmed}px]`;
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
  borderRadius?: string;
  borderWidth?: string;
  borderColor?: string;
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
    if (base.startsWith("rounded")) {
      parsed.borderRadius = base;
      continue;
    }
    if (base === "border" || base.startsWith("border-")) {
      if (base === "border" || /^border-\d+$/.test(base)) {
        parsed.borderWidth = base;
        continue;
      }
      if (base.startsWith("border-") && !base.startsWith("border-radius")) {
        parsed.borderColor = base;
        continue;
      }
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
  if (parsed.borderWidth) tokens.push(parsed.borderWidth);
  if (parsed.borderColor) tokens.push(parsed.borderColor);
  if (parsed.borderRadius) tokens.push(parsed.borderRadius);

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
