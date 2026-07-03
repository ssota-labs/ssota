import {
  isEmulateEnabled,
  resolveProviderApiUrl,
} from "./connections/provider-api-base.js";
import { slackHandleFromAgentName } from "./slack-user-group-handle.js";

export { slackHandleFromAgentName };

type SlackApiResponse<T> = { ok: boolean; error?: string } & T;

async function slackApi<T>(
  token: string,
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = resolveProviderApiUrl("slack", `https://slack.com/api/${method}`);
  const response = await fetch(url, {
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

/** Deterministic user-group ids for local emulate (usergroups.* is not implemented). */
export function emulateSlackUserGroupForAgent(agentName: string): CreatedSlackUserGroup {
  const handle = slackHandleFromAgentName(agentName);
  const compact = handle.replace(/-/g, "").toUpperCase().slice(0, 8).padEnd(8, "0");
  return { id: `S0${compact}`, handle };
}

/** Create and enable a Slack user group for @mention routing to an agent. */
export async function createSlackUserGroupForAgent(
  token: string,
  agentName: string,
  description?: string,
): Promise<CreatedSlackUserGroup> {
  const handle = slackHandleFromAgentName(agentName);

  if (isEmulateEnabled()) {
    return emulateSlackUserGroupForAgent(agentName);
  }

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
