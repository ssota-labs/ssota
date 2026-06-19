export function normalizeHexColor(color: string): string {
  if (!color.startsWith("#")) return color;
  return color.length === 4
    ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
    : color.slice(0, 7);
}

function rgbStringToHex(color: string): string | null {
  const rgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!rgba) return null;
  const r = Number(rgba[1]).toString(16).padStart(2, "0");
  const g = Number(rgba[2]).toString(16).padStart(2, "0");
  const b = Number(rgba[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function canvasColorToHex(color: string): string | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.clearRect(0, 0, 1, 1);
  context.fillStyle = "#000000";
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const data = context.getImageData(0, 0, 1, 1).data;
  const r = data[0];
  const g = data[1];
  const b = data[2];
  const a = data[3];
  if (r === undefined || g === undefined || b === undefined || a === undefined || a === 0) {
    return null;
  }

  const toHex = (channel: number) => channel.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function cssColorToHex(color: string): string | null {
  return rgbStringToHex(color) ?? canvasColorToHex(color);
}

export function hexFromScopedCssVar(
  cssVar: string,
  scopeElement: HTMLElement,
): string | null {
  const probe = document.createElement("span");
  probe.style.color = `var(${cssVar})`;
  probe.style.display = "none";
  scopeElement.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  return cssColorToHex(computed);
}

export function colorValueToHex(
  color: string,
  scopeElement?: HTMLElement | null,
): string {
  const trimmed = color.trim();
  if (!trimmed) return "#000000";

  if (trimmed.startsWith("#")) {
    return normalizeHexColor(trimmed);
  }

  const directHex = cssColorToHex(trimmed);
  if (directHex) return directHex;

  if (typeof document === "undefined") {
    return "#000000";
  }

  const probe = document.createElement("span");
  probe.style.color = trimmed;
  probe.style.display = "none";

  const mountTarget = scopeElement ?? document.body;
  mountTarget.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();

  return cssColorToHex(computed) ?? "#000000";
}

export function hexToRgba(hex: string, alpha = "1"): string {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
