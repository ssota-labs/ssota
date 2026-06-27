import { defineConfig } from "vitest/config";
import path from "node:path";

const uiSrc = path.resolve(__dirname, "../../packages/ui/src");

export default defineConfig({
  resolve: {
    // Mirror apps/web/tsconfig.json `paths`. The shadcn convention remaps a few
    // `@/…` specifiers into `packages/ui/src` while `@/*` otherwise resolves to
    // apps/web. Vitest does not read tsconfig paths, so transitively-loaded
    // `packages/ui` source (e.g. advanced-data-table) would otherwise fail to
    // resolve its own `@/components/ui/*` self-imports. Order = most specific first.
    alias: [
      { find: "@/lib/utils", replacement: path.join(uiSrc, "lib/utils.ts") },
      { find: "@/components/ui", replacement: path.join(uiSrc, "components/ui") },
      { find: "@/hooks", replacement: path.join(uiSrc, "hooks") },
      { find: "@", replacement: path.resolve(__dirname, ".") },
    ],
  },
  test: {
    globals: true,
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
