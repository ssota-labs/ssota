import { createHash } from "node:crypto";
import type { StudioBuildInput } from "./types.js";

export function computeBuildHash(input: StudioBuildInput): string {
  const payload = JSON.stringify({
    projectId: input.projectId,
    entry: input.entry,
    files: input.files,
    toolchainDigest: input.toolchainDigest,
    themeCss: input.themeCss ?? "",
    studioRuntimeInject: input.studioRuntimeInject,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}
