import type { StudioBuildInput } from "@ssota/studio-build";

export function createViteScaffold(input: StudioBuildInput): Record<string, string> {
  const themeCss = input.themeCss?.trim() ?? "";
  const entryPath = input.entry.replace(/^\.\//, "");

  return {
    "package.json": JSON.stringify(input.packageJson, null, 2),
    "pnpm-lock.yaml": input.lockfile,
    "vite.config.ts": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    lib: {
      entry: "src/__studio_entry__.tsx",
      formats: ["es"],
      fileName: () => "bundle.js",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
    },
    cssCodeSplit: false,
  },
});
`,
    "index.html": `<!doctype html><html><body><div id="studio-root"></div></body></html>`,
    "src/styles/theme.css": themeCss
      ? `:root {\n${themeCss}\n}\n`
      : ":root {}\n",
    "src/__studio_entry__.tsx": `import { mountStudioPreview } from "@ssota/studio-preview-runtime/bootstrap";
import Entry from "./${entryPath}";

const Component = (Entry as { default?: React.ComponentType }).default ?? Entry;
mountStudioPreview(Component as React.ComponentType);
`,
    ...Object.fromEntries(
      Object.entries(input.files).map(([filePath, source]) => [
        `src/${filePath.replace(/^\.\//, "")}`,
        source,
      ]),
    ),
  };
}

export function studioBuildBackend(): "esbuild" | "sandbox" {
  const configured = process.env.STUDIO_BUILD_BACKEND?.trim().toLowerCase();
  if (configured === "sandbox") return "sandbox";
  return "esbuild";
}
