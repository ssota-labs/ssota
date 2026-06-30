import { join } from "node:path";

const ensureDepsScript = join(__dirname, "../scripts/e2e-ensure-web-deps.sh");

/** Prefix dev server commands so workspace dist/ exists before next dev bundles. */
export function withWebDeps(command: string): string {
  return `bash ${ensureDepsScript} ${command}`;
}
