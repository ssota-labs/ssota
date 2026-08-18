/** catalog key → URL slug (snake_case lowercase) */
export function toCatalogSlug(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

/** catalog key → default display label */
export function toCatalogLabel(key: string): string {
  if (key.includes("_")) {
    return key
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return key;
}
