import path from "node:path";
import * as esbuild from "esbuild";
import { assertAllowedDependencies, isAllowedImport } from "./allowlist.js";
import type { StudioBuildArtifacts, StudioBuildInput } from "./types.js";

const VIRTUAL_NAMESPACE = "studio-vfs";
const BOOTSTRAP_MODULE = "@ssota/studio-preview-runtime/bootstrap";

function normalizeVirtualPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.startsWith("./")) {
    return normalized.slice(2);
  }
  if (normalized.startsWith("/")) {
    return normalized.slice(1);
  }
  return normalized;
}

function loaderForPath(filePath: string): esbuild.Loader {
  if (filePath.endsWith(".css")) return "css";
  if (filePath.endsWith(".json")) return "json";
  if (filePath.endsWith(".tsx")) return "tsx";
  if (filePath.endsWith(".ts")) return "ts";
  if (filePath.endsWith(".jsx")) return "jsx";
  return "js";
}

function resolveImporterPath(importer: string): string {
  if (!importer || importer === "<stdin>") {
    return "__studio_entry__.tsx";
  }
  const base = path.posix.basename(importer);
  if (base === "__studio_entry__.tsx") {
    return "__studio_entry__.tsx";
  }
  return normalizeVirtualPath(importer);
}

function createVirtualFilesPlugin(
  files: Record<string, string>,
  dependencies: Record<string, string>,
) {
  const fileMap = new Map<string, string>();
  for (const [filePath, contents] of Object.entries(files)) {
    fileMap.set(normalizeVirtualPath(filePath), contents);
  }

  return {
    name: "studio-virtual-files",
    setup(build: esbuild.PluginBuild) {
      build.onResolve({ filter: /^\./ }, (args) => {
        const isVirtualImporter =
          args.namespace === VIRTUAL_NAMESPACE ||
          !args.importer ||
          args.importer === "<stdin>" ||
          path.posix.basename(args.importer) === "__studio_entry__.tsx";

        if (!isVirtualImporter) {
          return undefined;
        }

        const importerPath = resolveImporterPath(args.importer);
        const resolved = normalizeVirtualPath(
          path.posix.join(path.posix.dirname(importerPath), args.path),
        );
        if (fileMap.has(resolved)) {
          return { path: resolved, namespace: VIRTUAL_NAMESPACE };
        }
        return { errors: [{ text: `Virtual file not found: ${args.path}` }] };
      });

      build.onResolve({ filter: /.*/, namespace: VIRTUAL_NAMESPACE }, async (args) => {
        if (args.path.startsWith(".")) {
          return undefined;
        }
        if (!isAllowedImport(args.path, dependencies)) {
          return { errors: [{ text: `Dependency not allowed: ${args.path}` }] };
        }
        return build.resolve(args.path, {
          resolveDir: process.cwd(),
          kind: args.kind,
          importer: args.importer,
        });
      });

      build.onLoad({ filter: /.*/, namespace: VIRTUAL_NAMESPACE }, (args) => {
        const contents = fileMap.get(args.path);
        if (contents === undefined) {
          return { errors: [{ text: `Virtual file not found: ${args.path}` }] };
        }
        return { contents, loader: loaderForPath(args.path) };
      });
    },
  };
}

function createEntryWrapper(entry: string, studioRuntimeInject: boolean): string {
  const entryPath = normalizeVirtualPath(entry);
  if (studioRuntimeInject) {
    return `
import { mountStudioPreview } from "${BOOTSTRAP_MODULE}";
import Entry from "./${entryPath}";

const Component = (Entry as { default?: React.ComponentType }).default ?? Entry;
mountStudioPreview(Component as React.ComponentType);
`;
  }

  return `
import React from "react";
import { createRoot } from "react-dom/client";
import Entry from "./${entryPath}";

const Component = (Entry as { default?: React.ComponentType }).default ?? Entry;
const rootEl = document.getElementById("studio-root");
if (rootEl) {
  createRoot(rootEl).render(React.createElement(Component as React.ComponentType));
}
`;
}

export async function buildStudioBundle(
  input: StudioBuildInput,
): Promise<StudioBuildArtifacts> {
  if (!input.entry.trim()) {
    throw new Error("entry is required");
  }
  if (Object.keys(input.files).length === 0) {
    throw new Error("files must not be empty");
  }

  const entryPath = normalizeVirtualPath(input.entry);
  const hasEntry = Object.keys(input.files).some(
    (filePath) => normalizeVirtualPath(filePath) === entryPath,
  );
  if (!hasEntry) {
    throw new Error(`entry file not found in files: ${input.entry}`);
  }

  assertAllowedDependencies(input.dependencies);

  const wrapperSource = createEntryWrapper(input.entry, input.studioRuntimeInject);
  const virtualFiles = {
    ...input.files,
    "__studio_entry__.tsx": wrapperSource,
  };

  const result = await esbuild.build({
    absWorkingDir: process.cwd(),
    stdin: {
      contents: wrapperSource,
      sourcefile: "__studio_entry__.tsx",
      loader: "tsx",
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2020",
    jsx: "automatic",
    sourcemap: "inline",
    plugins: [createVirtualFilesPlugin(virtualFiles, input.dependencies)],
    logLevel: "silent",
  });

  const jsFile =
    result.outputFiles.find(
      (file) =>
        (file.path.endsWith(".js") || file.path === "<stdout>") &&
        !file.path.endsWith(".map"),
    ) ?? result.outputFiles.at(0);
  if (!jsFile) {
    throw new Error("esbuild did not emit JavaScript output");
  }

  const mapFile = result.outputFiles.find((file) =>
    file.path.endsWith(".map"),
  );
  const cssFile = result.outputFiles.find((file) => file.path.endsWith(".css"));

  const themeCss = input.themeCss?.trim();
  const cssChunks: Uint8Array[] = [];
  if (cssFile) {
    cssChunks.push(cssFile.contents);
  }
  if (themeCss) {
    cssChunks.push(new TextEncoder().encode(`\n${themeCss}\n`));
  }

  return {
    js: jsFile.contents,
    css:
      cssChunks.length > 0
        ? concatUint8Arrays(cssChunks)
        : undefined,
    map: mapFile?.contents,
  };
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}
