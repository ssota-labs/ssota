import type { SandboxSource } from "@ssota/contracts";
import type { SandboxHandle } from "@ssota/core";

/**
 * Brokered git checkout — credentials stay outside the VM.
 * MVP: clone via shell with optional token env injected per source.
 */
export async function checkoutSandboxSources(
  handle: SandboxHandle,
  sources: readonly SandboxSource[],
  options?: { githubToken?: string },
): Promise<void> {
  for (const source of sources) {
    let cloneUrl = source.url;
    if (options?.githubToken && source.provider === "github") {
      cloneUrl = source.url.replace(
        "https://github.com/",
        `https://x-access-token:${options.githubToken}@github.com/`,
      );
    }

    const parentDir = source.path.split("/").slice(0, -1).join("/") || "/";
    await handle.exec("mkdir", ["-p", parentDir]);

    const exists = await handle.exec("test", ["-d", source.path]);
    if (exists.exitCode === 0) {
      await handle.exec("git", ["-C", source.path, "fetch", "origin"]);
      await handle.exec("git", ["-C", source.path, "checkout", source.branch]);
      await handle.exec("git", ["-C", source.path, "pull", "--ff-only"]);
      continue;
    }

    await handle.exec("git", [
      "clone",
      "--branch",
      source.branch,
      "--depth",
      "1",
      cloneUrl,
      source.path,
    ]);
  }
}

export async function runSetupScript(
  handle: SandboxHandle,
  setupScript: string | null | undefined,
  cwd: string,
): Promise<void> {
  if (!setupScript?.trim()) return;
  const result = await handle.exec("bash", ["-lc", setupScript], { cwd });
  if (result.exitCode !== 0) {
    throw new Error(
      `Setup script failed (exit ${result.exitCode}): ${result.stderr || result.stdout}`,
    );
  }
}
