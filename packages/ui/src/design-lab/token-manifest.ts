export type TokenFieldKind = "length" | "color" | "number";

export type TokenField = {
  property: string;
  label: string;
  kind: TokenFieldKind;
  defaultValue: string;
  min?: number;
  max?: number;
  step?: number;
};

export type TokenDefinition = {
  className: string;
  label: string;
  slot: string;
  fields: TokenField[];
};

export const TOKEN_MANIFEST: TokenDefinition[] = [
  {
    className: "cn-button",
    label: "Button base",
    slot: "button",
    fields: [
      { property: "border-radius", label: "Radius", kind: "length", defaultValue: "0.375rem", min: 0, max: 24, step: 1 },
      { property: "font-size", label: "Font size", kind: "length", defaultValue: "0.75rem", min: 8, max: 20, step: 1 },
    ],
  },
  {
    className: "cn-button-size-default",
    label: "Button size default",
    slot: "button",
    fields: [
      { property: "height", label: "Height", kind: "length", defaultValue: "1.75rem", min: 16, max: 48, step: 1 },
      { property: "padding-inline", label: "Padding X", kind: "length", defaultValue: "0.5rem", min: 0, max: 32, step: 1 },
      { property: "font-size", label: "Font size", kind: "length", defaultValue: "0.75rem", min: 8, max: 20, step: 1 },
    ],
  },
  {
    className: "cn-button-size-sm",
    label: "Button size sm",
    slot: "button",
    fields: [
      { property: "height", label: "Height", kind: "length", defaultValue: "1.5rem", min: 16, max: 48, step: 1 },
      { property: "padding-inline", label: "Padding X", kind: "length", defaultValue: "0.5rem", min: 0, max: 32, step: 1 },
    ],
  },
  {
    className: "cn-button-variant-default",
    label: "Button variant default",
    slot: "button",
    fields: [
      { property: "background-color", label: "Background", kind: "color", defaultValue: "oklch(0.52 0.105 223.128)" },
    ],
  },
  {
    className: "cn-input",
    label: "Input",
    slot: "input",
    fields: [
      { property: "height", label: "Height", kind: "length", defaultValue: "1.75rem", min: 16, max: 48, step: 1 },
      { property: "padding-inline", label: "Padding X", kind: "length", defaultValue: "0.5rem", min: 0, max: 32, step: 1 },
      { property: "border-radius", label: "Radius", kind: "length", defaultValue: "0.375rem", min: 0, max: 24, step: 1 },
    ],
  },
  {
    className: "cn-card",
    label: "Card",
    slot: "card",
    fields: [
      { property: "border-radius", label: "Radius", kind: "length", defaultValue: "0.5rem", min: 0, max: 24, step: 1 },
      { property: "gap", label: "Gap", kind: "length", defaultValue: "0.875rem", min: 0, max: 32, step: 1 },
    ],
  },
  {
    className: "cn-card-header",
    label: "Card header",
    slot: "card-header",
    fields: [
      { property: "gap", label: "Gap", kind: "length", defaultValue: "0.25rem", min: 0, max: 24, step: 1 },
      { property: "padding-inline", label: "Padding X", kind: "length", defaultValue: "0.875rem", min: 0, max: 32, step: 1 },
    ],
  },
  {
    className: "cn-table-head",
    label: "Table head",
    slot: "table-head",
    fields: [
      { property: "height", label: "Height", kind: "length", defaultValue: "2rem", min: 16, max: 48, step: 1 },
      { property: "padding-inline", label: "Padding X", kind: "length", defaultValue: "0.5rem", min: 0, max: 32, step: 1 },
    ],
  },
  {
    className: "cn-table-cell",
    label: "Table cell",
    slot: "table-cell",
    fields: [
      { property: "padding-inline", label: "Padding X", kind: "length", defaultValue: "0.5rem", min: 0, max: 32, step: 1 },
      { property: "padding-block", label: "Padding Y", kind: "length", defaultValue: "0.375rem", min: 0, max: 24, step: 1 },
    ],
  },
  {
    className: "cn-badge",
    label: "Badge",
    slot: "badge",
    fields: [
      { property: "height", label: "Height", kind: "length", defaultValue: "1.25rem", min: 12, max: 32, step: 1 },
      { property: "padding-inline", label: "Padding X", kind: "length", defaultValue: "0.5rem", min: 0, max: 24, step: 1 },
      { property: "font-size", label: "Font size", kind: "length", defaultValue: "0.625rem", min: 8, max: 16, step: 1 },
      { property: "border-radius", label: "Radius", kind: "length", defaultValue: "9999px", min: 0, max: 9999, step: 1 },
    ],
  },
  {
    className: "cn-badge-variant-default",
    label: "Badge variant default",
    slot: "badge",
    fields: [
      { property: "background-color", label: "Background", kind: "color", defaultValue: "oklch(0.52 0.105 223.128)" },
    ],
  },
];

export const SLOT_DEFAULT_TOKENS: Record<string, string[]> = {
  button: ["cn-button", "cn-button-size-default"],
  input: ["cn-input"],
  card: ["cn-card"],
  "card-header": ["cn-card-header"],
  "card-title": ["cn-card"],
  "card-description": ["cn-card"],
  "card-content": ["cn-card"],
  "card-footer": ["cn-card"],
  "table-head": ["cn-table-head"],
  "table-cell": ["cn-table-cell"],
  table: ["cn-table-head", "cn-table-cell"],
  badge: ["cn-badge"],
};

export function getTokenByClassName(className: string): TokenDefinition | undefined {
  return TOKEN_MANIFEST.find((t) => t.className === className);
}

export function getTokensForSlotAndClasses(
  slot: string,
  cnClasses: string[],
): TokenDefinition[] {
  const matched = TOKEN_MANIFEST.filter(
    (t) => cnClasses.includes(t.className) || t.slot === slot,
  );
  const seen = new Set<string>();
  return matched.filter((t) => {
    if (seen.has(t.className)) return false;
    seen.add(t.className);
    return cnClasses.includes(t.className) || t.slot === slot;
  });
}
