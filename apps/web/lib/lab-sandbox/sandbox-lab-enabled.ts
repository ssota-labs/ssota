/** Top-level /lab sandbox — frontend-only, no DB. Disabled in production unless explicitly enabled. */
export function isSandboxLabEnabled(): boolean {
  if (process.env.SANDBOX_LAB_ENABLED === "true") return true;
  if (process.env.SANDBOX_LAB_ENABLED === "false") return false;
  return process.env.NODE_ENV !== "production";
}
