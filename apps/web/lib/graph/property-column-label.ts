import { toCatalogLabel } from "@loopos/core";

/** Property catalog key → human-readable column label */
export function propertyColumnLabel(propertyKey: string): string {
  const label = toCatalogLabel(propertyKey);
  if (label === propertyKey && propertyKey === propertyKey.toLowerCase()) {
    return propertyKey.charAt(0).toUpperCase() + propertyKey.slice(1);
  }
  return label;
}
