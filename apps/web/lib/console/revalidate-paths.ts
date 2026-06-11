import { DEFAULT_ORG_SLUG, DEFAULT_PROJECT_SLUG } from "./constants";
import { projectPath } from "./paths";

const defaultCtx = {
  orgSlug: DEFAULT_ORG_SLUG,
  projectSlug: DEFAULT_PROJECT_SLUG,
};

/** Legacy revalidate paths에 기본 프로젝트 콘솔 경로를 병합한다. */
export function withConsolePaths(paths: string[]): string[] {
  const set = new Set(paths);

  set.add(projectPath(defaultCtx));
  set.add(projectPath(defaultCtx, "graph"));
  set.add(projectPath(defaultCtx, "graph", "nodes"));
  set.add(projectPath(defaultCtx, "graph", "edges"));
  set.add(projectPath(defaultCtx, "graph", "actions"));
  set.add(projectPath(defaultCtx, "instructions"));
  set.add(projectPath(defaultCtx, "gates"));
  set.add(projectPath(defaultCtx, "log"));
  set.add(projectPath(defaultCtx, "settings", "general"));

  return [...set];
}
