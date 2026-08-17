import { createHash } from "node:crypto";
import type { SkillFile } from "@ssota/contracts";

/** Stable SHA-256 over skill file bundle (matches adapter skill-helpers). */
export function hashSkillFiles(files: SkillFile[]): string {
  const payload = [...files]
    .map((f) => `${f.path}\0${f.contents}`)
    .sort()
    .join("\n");
  return createHash("sha256").update(payload).digest("hex");
}
