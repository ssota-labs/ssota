import { appProjectPath } from "@/lib/console/app-paths";
import { orgPath } from "@/lib/console/paths";
import { resolveOrg } from "@/lib/console/resolve-project";
import { resolveEndUserContext } from "@/lib/request-context";
import { getChatPort, getOrCreateProjectAccount } from "@/lib/ports";

export type ChatScope = {
  teamspaceId: string;
  accountId: string;
  chat: ReturnType<typeof getChatPort>;
  chatBase: string;
  orgSlug: string;
  teamspaceSlug: string;
  appMode: boolean;
};

export async function loadBuilderChatScope(
  orgSlug: string,
  teamspaceSlug: string,
): Promise<ChatScope> {
  const ctx = { orgSlug, teamspaceSlug };
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const account = await getOrCreateProjectAccount(project.id);
  return {
    teamspaceId: project.id,
    accountId: account.id,
    chat: getChatPort(project.id, account.id),
    chatBase: orgPath(ctx, "c"),
    orgSlug,
    teamspaceSlug,
    appMode: false,
  };
}

export async function loadEndUserChatScope(
  orgSlug: string,
  teamspaceSlug: string,
): Promise<ChatScope> {
  const ctx = await resolveEndUserContext(orgSlug, teamspaceSlug);
  const routeCtx = { orgSlug, teamspaceSlug };
  return {
    teamspaceId: ctx.teamspaceId,
    accountId: ctx.accountId,
    chat: getChatPort(ctx.teamspaceId, ctx.accountId),
    chatBase: appProjectPath(routeCtx, "c"),
    orgSlug,
    teamspaceSlug,
    appMode: true,
  };
}
