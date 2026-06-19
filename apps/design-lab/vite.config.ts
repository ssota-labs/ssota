import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const uiRoot = path.resolve(__dirname, "../../packages/ui/src");
const contractsCatalogRoot = path.resolve(
  __dirname,
  "../../packages/contracts/src/catalog/index.ts",
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": uiRoot,
      "@ssota/ui": uiRoot,
      "@ssota/contracts/catalog": contractsCatalogRoot,
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "../..")],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  base: "/",
});
