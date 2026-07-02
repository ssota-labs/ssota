import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

import { copyDirectory, removeDirectory } from "../src/copy-recursive.mjs";

const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = path.resolve(packageRoot, "..");
const templatesRoot = path.join(packageRoot, "templates");

const sources = [
  {
    from: path.join(repoRoot, "starter"),
    to: path.join(templatesRoot, "starter"),
  },
  {
    from: path.join(repoRoot, "packages/ui/src"),
    to: path.join(templatesRoot, "ui"),
  },
  {
    from: path.join(repoRoot, "packages/toolcraft-runtime/src"),
    to: path.join(templatesRoot, "runtime"),
  },
];

await removeDirectory(templatesRoot);

for (const source of sources) {
  await copyDirectory(source.from, source.to);
}

const starterGitignorePath = path.join(templatesRoot, "starter/.gitignore");
const starterPackGitignorePath = path.join(templatesRoot, "starter/gitignore");
await fs.copyFile(starterGitignorePath, starterPackGitignorePath);
