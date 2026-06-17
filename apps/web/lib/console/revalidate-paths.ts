import { DEFAULT_ORG_SLUG, DEFAULT_PROJECT_SLUG } from "./constants";
import { projectPath } from "./paths";

const defaultCtx = {
  orgSlug: DEFAULT_ORG_SLUG,
  projectSlug: DEFAULT_PROJECT_SLUG,
};

/** Console v2.7 revalidate paths에 기본 프로젝트 경로를 병합한다. */
export function withConsolePaths(paths: string[]): string[] {
  const set = new Set(paths);

  set.add(projectPath(defaultCtx, "overview"));
  set.add(projectPath(defaultCtx, "tasks"));
  set.add(projectPath(defaultCtx, "workflow", "map"));
  set.add(projectPath(defaultCtx, "executive", "roadmap"));
  set.add(projectPath(defaultCtx, "research", "hypotheses"));
  set.add(projectPath(defaultCtx, "initiatives"));
  set.add(projectPath(defaultCtx, "settings", "general"));
  set.add(projectPath(defaultCtx, "developer", "setup"));

  return [...set];
}
