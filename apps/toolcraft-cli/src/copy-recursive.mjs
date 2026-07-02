import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_IGNORED_NAMES = new Set([
  ".DS_Store",
  ".git",
  ".turbo",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function assertDirectory(directoryPath, label) {
  let stats;

  try {
    stats = await fs.stat(directoryPath);
  } catch {
    throw new Error(`${label} was not found: ${directoryPath}`);
  }

  if (!stats.isDirectory()) {
    throw new Error(`${label} must be a directory: ${directoryPath}`);
  }
}

export async function ensureWritableTargetDirectory(targetDir, { force = false } = {}) {
  await fs.mkdir(targetDir, { recursive: true });

  const entries = await fs.readdir(targetDir);
  const meaningfulEntries = entries.filter((entry) => entry !== ".DS_Store");

  if (meaningfulEntries.length > 0 && !force) {
    throw new Error(
      `Target directory is not empty: ${targetDir}. Use --force to write into it.`,
    );
  }
}

export async function copyDirectory(sourceDir, targetDir, options = {}) {
  const ignoredNames = options.ignoredNames ?? DEFAULT_IGNORED_NAMES;

  await assertDirectory(sourceDir, "Source directory");
  await fs.mkdir(targetDir, { recursive: true });

  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoredNames.has(entry.name)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath, { ignoredNames });
      continue;
    }

    if (entry.isSymbolicLink()) {
      const linkTarget = await fs.readlink(sourcePath);
      await fs.rm(targetPath, { force: true, recursive: true });
      await fs.symlink(linkTarget, targetPath);
      continue;
    }

    if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

export async function removeDirectory(directoryPath) {
  await fs.rm(directoryPath, { force: true, recursive: true });
}
