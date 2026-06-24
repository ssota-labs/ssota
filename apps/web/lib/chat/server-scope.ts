import { appProjectPath } from "@/lib/console/app-paths";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { resolveEndUserContext } from "@/lib/request-context";
import { getChatPort, getOrCreateProjectAccount } from "@/lib/ports";

export type ChatScope = {
  projectId: string;
  accountId: string;
  chat: ReturnType<typeof getChatPort>;
  chatBase: string;
  orgSlug: string;
  projectSlug: string;
  appMode: boolean;
};

export async function loadBuilderChatScope(
  orgSlug: string,
  projectSlug: string,
): Promise<ChatScope> {
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const account = await getOrCreateProjectAccount(project.id);
  return {
    projectId: project.id,
    accountId: account.id,
    chat: getChatPort(project.id, account.id),
    chatBase: projectPath(ctx, "c"),
    orgSlug,
    projectSlug,
    appMode: false,
  };
}

export async function loadEndUserChatScope(
  orgSlug: string,
  projectSlug: string,
): Promise<ChatScope> {
  const ctx = await resolveEndUserContext(orgSlug, projectSlug);
  const routeCtx = { orgSlug, projectSlug };
  return {
    projectId: ctx.projectId,
    accountId: ctx.accountId,
    chat: getChatPort(ctx.projectId, ctx.accountId),
    chatBase: appProjectPath(routeCtx, "c"),
    orgSlug,
    projectSlug,
    appMode: true,
  };
}
