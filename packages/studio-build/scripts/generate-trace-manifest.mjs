#!/usr/bin/env node
/**
 * Generates studio-trace-manifest.json from esbuild metafile by importing every
 * @ssota/ui component entry. Re-run after @ssota/ui or lockfile dependency changes.
 */
import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const resolveRoot = path.join(packageDir, "../../apps/web");
const monorepoRoot = path.join(packageDir, "../..");

function packageRoot(file) {
  if (file.startsWith("packages/")) {
    const parts = file.split("/");
    return parts.slice(0, 3).join("/");
  }
  const pnpmPrefix = "node_modules/.pnpm/";
  const pnpmIdx = file.indexOf(pnpmPrefix);
  if (pnpmIdx >= 0) {
    const rest = file.slice(pnpmIdx + pnpmPrefix.length);
    const pkgFolder = rest.split("/")[0];
    const after = rest.slice(pkgFolder.length + 1);
    if (after.startsWith("node_modules/")) {
      const inner = after.slice("node_modules/".length);
      const segments = inner.split("/");
      const innerPkg = segments[0].startsWith("@")
        ? `${segments[0]}/${segments[1]}`
        : segments[0];
      return `${pnpmPrefix}${pkgFolder}/node_modules/${innerPkg}`;
    }
  }
  return path.posix.dirname(file);
}

function compressManifestToGlobs(filePaths) {
  const roots = new Set(filePaths.map((file) => packageRoot(file)));
  return [...roots].sort().map((root) => `${root}/**/*`);
}

function listUiComponentEntries() {
  const uiDir = path.join(monorepoRoot, "packages/ui/src/components/ui");
  return fs
    .readdirSync(uiDir)
    .filter((file) => file.endsWith(".tsx") && !file.endsWith(".stories.tsx"));
}

async function main() {
  const uiFiles = listUiComponentEntries();
  const importLines = uiFiles
    .map((file) => `import '@ssota/ui/components/ui/${file.replace(/\.tsx$/, "")}';`)
    .join("\n");

  const files = {
    "Component.tsx": `${importLines}
import { Button } from '@ssota/ui/components/ui/button';
export default function Component() { return <Button>Hi</Button>; }`,
  };

  const virtualNamespace = "studio-vfs";
  const fileMap = new Map(Object.entries(files));
  const wrapper = `import { mountStudioPreview } from '@ssota/studio-preview-runtime/bootstrap';
import Entry from './Component.tsx';
mountStudioPreview((Entry.default ?? Entry));`;
  fileMap.set("__studio_entry__.tsx", wrapper);

  const result = await esbuild.build({
    absWorkingDir: resolveRoot,
    stdin: { contents: wrapper, loader: "tsx", resolveDir: resolveRoot },
    bundle: true,
    write: false,
    metafile: true,
    platform: "browser",
    format: "esm",
    jsx: "automatic",
    logLevel: "silent",
    plugins: [
      {
        name: "studio-vfs",
        setup(build) {
          build.onResolve({ filter: /^\./ }, (args) => {
            const importer = args.importer?.includes("__studio_entry__")
              ? "__studio_entry__.tsx"
              : path.posix.basename(args.importer || "");
            const base = path.posix.dirname(importer);
            const resolved = path.posix
              .normalize(path.posix.join(base, args.path))
              .replace(/^\.\//, "");
            if (fileMap.has(resolved)) {
              return { path: resolved, namespace: virtualNamespace };
            }
          });
          build.onResolve({ filter: /.*/, namespace: virtualNamespace }, (args) => {
            if (args.path.startsWith(".")) return;
            return build.resolve(args.path, {
              resolveDir: resolveRoot,
              kind: args.kind,
            });
          });
          build.onLoad({ filter: /.*/, namespace: virtualNamespace }, (args) => ({
            contents: fileMap.get(args.path),
            loader: "tsx",
          }));
        },
      },
    ],
  });

  const tracedFiles = [];
  let totalBytes = 0;
  for (const input of Object.keys(result.metafile.inputs)) {
    const absolute = path.resolve(resolveRoot, input);
    try {
      totalBytes += fs.statSync(absolute).size;
      tracedFiles.push(path.relative(monorepoRoot, absolute).replace(/\\/g, "/"));
    } catch {
      // skip missing paths
    }
  }

  tracedFiles.sort();
  const globs = compressManifestToGlobs(tracedFiles);
  const manifest = {
    generatedAt: new Date().toISOString(),
    fileCount: tracedFiles.length,
    totalBytes,
    globs,
    files: tracedFiles,
  };

  const outPath = path.join(packageDir, "studio-trace-manifest.json");
  fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `Wrote ${outPath} (${tracedFiles.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MiB)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
