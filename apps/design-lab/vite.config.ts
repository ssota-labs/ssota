import path from "node:path";
import { defineConfig } from "vite";

const uiRoot = path.resolve(__dirname, "../../packages/ui/src");

export default defineConfig({
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
});
