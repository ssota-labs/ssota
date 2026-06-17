export function clampChannel(value: number, max = 255): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function rgbComponentsToHex(r: number, g: number, b: number): string {
  const channel = (value: number) =>
    clampChannel(value).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "").slice(0, 6);
  if (normalized.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToHsv(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;
  return { h, s, v };
}

export function hsvToRgb(
  h: number,
  s: number,
  v: number,
): { r: number; g: number; b: number } {
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const vn = Math.max(0, Math.min(100, v)) / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vn - c;

  let rn = 0;
  let gn = 0;
  let bn = 0;
  const sector = ((h % 360) + 360) % 360;

  if (sector < 60) {
    rn = c;
    gn = x;
  } else if (sector < 120) {
    rn = x;
    gn = c;
  } else if (sector < 180) {
    gn = c;
    bn = x;
  } else if (sector < 240) {
    gn = x;
    bn = c;
  } else if (sector < 300) {
    rn = x;
    bn = c;
  } else {
    rn = c;
    bn = x;
  }

  return {
    r: clampChannel((rn + m) * 255),
    g: clampChannel((gn + m) * 255),
    b: clampChannel((bn + m) * 255),
  };
}

export function formatAlphaDecimal(alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const rounded = Math.round(clamped * 1000) / 1000;
  return String(rounded);
}

export function hexToRgba(hex: string, alpha = "1"): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function formatInspectorColorWithAlpha(
  hex: string,
  alphaPercent: string,
): string {
  const percent = Number(alphaPercent);
  const alpha = Number.isFinite(percent) ? percent / 100 : 1;
  return hexToRgba(hex, formatAlphaDecimal(alpha));
}

export function parseInspectorColorAlphaPercent(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || !isDirectColorValue(trimmed)) return "100";

  if (/^#[0-9a-fA-F]{8}$/.test(trimmed)) {
    return String(
      Math.round((Number.parseInt(trimmed.slice(7, 9), 16) / 255) * 100),
    );
  }

  if (/^#[0-9a-fA-F]{4}$/.test(trimmed)) {
    const channel = trimmed[4]!;
    return String(
      Math.round((Number.parseInt(channel + channel, 16) / 255) * 100),
    );
  }

  const rgbaComma = trimmed.match(
    /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/i,
  );
  if (rgbaComma) {
    return String(Math.round(Number(rgbaComma[1]) * 100));
  }

  const rgbaSlash = trimmed.match(
    /^rgba?\(\s*[\d.]+\s+[\d.]+\s+[\d.]+\s*\/\s*([\d.]+%?)\s*\)/i,
  );
  if (rgbaSlash) {
    const raw = rgbaSlash[1]!;
    if (raw.endsWith("%")) return raw.slice(0, -1);
    return String(Math.round(Number(raw) * 100));
  }

  return "100";
}

export function isDirectColorValue(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("#") ||
    /^rgba?\(/i.test(trimmed) ||
    /^hsla?\(/i.test(trimmed) ||
    /^oklch\(/i.test(trimmed) ||
    /^lab\(/i.test(trimmed)
  );
}

export function toHexColor(color: string): string {
  if (color.startsWith("#")) {
    return color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color.slice(0, 7);
  }
  return "#000000";
}
