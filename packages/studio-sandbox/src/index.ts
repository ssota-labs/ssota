import {
  buildArtifactPaths,
  buildStudioPreview,
  computeBuildHash,
} from "@ssota/studio-build";
import type { StudioBuildArtifacts, StudioBuildInput } from "@ssota/studio-build";
import { createViteScaffold, studioBuildBackend } from "./vite-scaffold.js";

export type StudioBuildOutput = Awaited<ReturnType<typeof buildStudioPreview>>;

export async function runStudioBuild(
  input: StudioBuildInput,
): Promise<StudioBuildOutput> {
  if (studioBuildBackend() === "sandbox") {
    try {
      return await buildInSandbox(input);
    } catch (error) {
      console.warn(
        "[studio-sandbox] sandbox build failed, falling back to esbuild",
        error,
      );
    }
  }
  return buildStudioPreview(input);
}

async function buildInSandbox(input: StudioBuildInput): Promise<StudioBuildOutput> {
  let Sandbox: typeof import("@vercel/sandbox").Sandbox;
  try {
    ({ Sandbox } = await import("@vercel/sandbox"));
  } catch {
    throw new Error("@vercel/sandbox is not installed");
  }

  const sandbox = await Sandbox.create({
    runtime: "node24",
  });

  try {
    const files = createViteScaffold(input);

    for (const [filePath, contents] of Object.entries(files)) {
      const write = (
        sandbox as unknown as {
          writeFile?: (path: string, body: string) => Promise<void>;
        }
      ).writeFile;
      if (!write) {
        throw new Error("Sandbox file API unavailable");
      }
      await write.call(sandbox, filePath, contents);
    }

    const install = await sandbox.runCommand({
      cmd: "pnpm",
      args: ["install", "--frozen-lockfile"],
    });
    if (install.exitCode !== 0) {
      throw new Error("pnpm install failed in sandbox");
    }

    const build = await sandbox.runCommand({
      cmd: "pnpm",
      args: ["exec", "vite", "build"],
    });
    if (build.exitCode !== 0) {
      throw new Error("vite build failed in sandbox");
    }

    const read = (
      sandbox as unknown as {
        readFile?: (path: string) => Promise<Uint8Array>;
      }
    ).readFile;
    if (!read) {
      throw new Error("Sandbox read API unavailable");
    }

    const jsBytes = await read.call(sandbox, "dist/bundle.js");
    let cssBytes: Uint8Array | undefined;
    try {
      cssBytes = await read.call(sandbox, "dist/style.css");
    } catch {
      cssBytes = undefined;
    }

    const buildHash = computeBuildHash(input);
    const artifacts: StudioBuildArtifacts = {
      js: jsBytes,
      css: cssBytes,
    };
    return {
      buildHash,
      artifacts,
      paths: buildArtifactPaths(input.projectId, buildHash),
    };
  } finally {
    await sandbox.stop();
  }
}
