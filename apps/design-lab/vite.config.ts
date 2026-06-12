import path from "node:path";
import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const uiRoot = path.resolve(__dirname, "../../packages/ui/src");

const mdxPlugin = mdx({
  providerImportSource: "@mdx-js/react",
});

export default defineConfig({
  plugins: [
    {
      ...mdxPlugin,
      enforce: "pre",
    },
    react(),
  ],
  resolve: {
    alias: {
      "@": uiRoot,
      "@ssota/ui": uiRoot,
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
