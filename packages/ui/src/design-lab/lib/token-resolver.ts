import {
  getTokensForSlotAndClasses,
  SLOT_DEFAULT_TOKENS,
  TOKEN_MANIFEST,
  type TokenDefinition,
} from "../token-manifest";

export type ResolvedSelection = {
  element: HTMLElement;
  slot: string;
  cnClasses: string[];
  tokens: TokenDefinition[];
};

export function extractCnClasses(element: HTMLElement): string[] {
  const classes = new Set<string>();
  for (const cls of element.classList) {
    if (cls.startsWith("cn-")) classes.add(cls);
  }
  return [...classes];
}

export function findSlotElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  const withSlot = target.closest("[data-slot]");
  if (withSlot instanceof HTMLElement) return withSlot;

  const withCn = target.closest('[class*="cn-"]');
  if (withCn instanceof HTMLElement) return withCn;

  return target;
}

export function resolveSlot(element: HTMLElement): string {
  const dataSlot = element.getAttribute("data-slot");
  if (dataSlot) return dataSlot;

  const cnClasses = extractCnClasses(element);
  for (const token of TOKEN_MANIFEST) {
    if (cnClasses.includes(token.className)) return token.slot;
  }

  return "unknown";
}

export function resolveTokensFromElement(element: HTMLElement): TokenDefinition[] {
  const slot = resolveSlot(element);
  const cnClasses = extractCnClasses(element);

  let tokens = getTokensForSlotAndClasses(slot, cnClasses);

  const slotDefaults = SLOT_DEFAULT_TOKENS[slot];
  if (tokens.length === 0 && slotDefaults) {
    tokens = TOKEN_MANIFEST.filter((t) =>
      slotDefaults.includes(t.className),
    );
  }

  const seen = new Set<string>();
  return tokens.filter((t) => {
    if (seen.has(t.className)) return false;
    seen.add(t.className);
    return true;
  });
}

export function resolveSelection(target: EventTarget | null): ResolvedSelection | null {
  const element = findSlotElement(target);
  if (!element) return null;

  const slot = resolveSlot(element);
  const cnClasses = extractCnClasses(element);
  const tokens = resolveTokensFromElement(element);

  return { element, slot, cnClasses, tokens };
}
