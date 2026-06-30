import { DEFAULT_ORG_SLUG, DEFAULT_TEAMSPACE_SLUG } from "./constants";
import { orgPath } from "./paths";

const defaultCtx = {
  orgSlug: DEFAULT_ORG_SLUG,
  teamspaceSlug: DEFAULT_TEAMSPACE_SLUG,
};

/** Console v2.7 revalidate paths에 기본 프로젝트 경로를 병합한다. */
export function withConsolePaths(paths: string[]): string[] {
  const set = new Set(paths);

  set.add(orgPath(defaultCtx, "overview"));
  set.add(orgPath(defaultCtx, "tasks"));
  set.add(orgPath(defaultCtx, "agents"));
  set.add(orgPath(defaultCtx, "skills"));
  set.add(orgPath(defaultCtx, "workflow", "map"));
  set.add(orgPath(defaultCtx, "workflow", "instructions"));
  set.add(orgPath(defaultCtx, "executive", "roadmap"));
  set.add(orgPath(defaultCtx, "research", "hypotheses"));
  set.add(orgPath(defaultCtx, "initiatives"));
  set.add(orgPath(defaultCtx, "settings", "general"));
  set.add(orgPath(defaultCtx, "developer", "setup"));

  return [...set];
}
