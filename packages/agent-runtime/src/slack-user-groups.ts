import { slackHandleFromAgentName } from "./slack-user-group-handle.js";

export { slackHandleFromAgentName };

type SlackApiResponse<T> = { ok: boolean; error?: string } & T;

async function slackApi<T>(
  token: string,
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as SlackApiResponse<T>;
  if (!data.ok) {
    throw new Error(data.error ?? `Slack API ${method} failed`);
  }
  return data;
}

export type CreatedSlackUserGroup = {
  id: string;
  handle: string;
};

/** Create and enable a Slack user group for @mention routing to an agent. */
export async function createSlackUserGroupForAgent(
  token: string,
  agentName: string,
  description?: string,
): Promise<CreatedSlackUserGroup> {
  const handle = slackHandleFromAgentName(agentName);
  const created = await slackApi<{
    usergroup: { id: string; handle?: string };
  }>(token, "usergroups.create", {
    name: agentName.slice(0, 80),
    handle,
    description:
      description ??
      `SSOTA agent — mention @${handle} in Slack to run this agent.`,
    include_count: false,
  });

  const id = created.usergroup.id;
  await slackApi(token, "usergroups.enable", { usergroup: id });

  return {
    id,
    handle: created.usergroup.handle ?? handle,
  };
}
