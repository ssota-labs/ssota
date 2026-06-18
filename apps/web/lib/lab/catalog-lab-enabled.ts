export function isCatalogLabEnabled(): boolean {
  return process.env.CATALOG_LAB_ENABLED === "true";
}
