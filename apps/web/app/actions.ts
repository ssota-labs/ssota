"use server";

import {
  type TaskStatus,
  BlockNoteContentSchema,
  SpawnTaskInputSchema,
  UpdateTaskInputSchema,
  UpsertAgentDefinitionInputSchema,
} from "@ssota/contracts";
import { spawnTask } from "@ssota/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolvePostAuthPath } from "@/lib/onboarding/resolve";
import { withConsolePaths } from "@/lib/console/revalidate";
import { getAuthProvider } from "@/lib/auth/provider";
import { clearAuthSignedOut } from "@/lib/auth/signed-out-cookie";
import { getSiteUrl, isGoogleAuthEnabled } from "@/lib/auth/config";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getGraphPorts, getTaskPort, getAgentDefinitionPort } from "@/lib/ports";
import { uploadEditorAsset } from "@/lib/editor/storage";
import { createSlackUserGroupForAgent } from "@ssota/agent-runtime";
import { getSlackBotTokenForTeamspace } from "@/lib/chat/slack-token";
import {
  assertSlackMentionUserGroupUnique,
  listTeamspaceAgentDefinitions,
} from "@/lib/chat/slack-inbound-route";

function loginRedirect(error: string, next?: string | null): never {
  const params = new URLSearchParams({ error });
  const safe = safeNextPath(next);
  if (safe) params.set("next", safe);
  redirect(`/login?${params.toString()}`);
}

async function resolvePostSignInPath(userId: string, next?: string | null) {
  const safe = safeNextPath(next);
  if (safe) return safe;
  return resolvePostAuthPath(userId);
}

export async function updateAgentDefinitionAction(
  teamspaceId: string,
  input: {
    id: string;
    name: string;
    description?: string;
    instructions: unknown;
    isMain?: boolean;
    referenceOnly?: boolean;
    toolBundles?: string[];
    runPolicy?: {
      model?: string;
      allowedTriggers?: string[];
      linkedWorkerAgentIds?: string[];
      enabledConnectorProviders?: string[];
      connectionTriggers?: Array<{
        id: string;
        provider: string;
        kind: string;
        label: string;
        enabled?: boolean;
        slackUserGroupId?: string;
        slackUserGroupHandle?: string;
        showTypingIndicator?: boolean;
      }>;
      maxSteps?: number;
      sandboxPolicy?: "none" | "optional" | "required";
      approvalPolicy?: "none" | "gate" | "human";
      timeoutMs?: number;
    };
    scriptToolIds?: string[];
  },
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = UpsertAgentDefinitionInputSchema.parse({
    id: input.id,
    name: input.name,
    description: input.description ?? "",
    instructions: BlockNoteContentSchema.parse(input.instructions),
    isMain: input.isMain ?? false,
    referenceOnly: input.referenceOnly ?? false,
    toolBundles: input.toolBundles,
    runPolicy: input.runPolicy,
  });

  const port = getAgentDefinitionPort(teamspaceId);
  const definitions = await listTeamspaceAgentDefinitions(
    () => port.listDefinitions(),
    (id) => port.getById(id),
  );
  for (const trigger of parsed.runPolicy.connectionTriggers ?? []) {
    if (
      trigger.id === "slack:agent_mentioned" &&
      trigger.enabled &&
      trigger.slackUserGroupId
    ) {
      await assertSlackMentionUserGroupUnique(
        definitions,
        parsed.id,
        trigger.slackUserGroupId,
      );
    }
  }

  await port.upsertDefinition(parsed);

  if (input.scriptToolIds) {
    const { getScriptToolPort } = await import("@/lib/ports");
    await getScriptToolPort(teamspaceId).setAgentScriptTools(
      input.id,
      input.scriptToolIds,
    );
  }

  for (const path of withConsolePaths(["/agents"])) {
    revalidatePath(path);
  }
}

/** @deprecated Use updateAgentDefinitionAction */
export const updateWorkflowInstructionAction = updateAgentDefinitionAction;

export async function provisionSlackAgentMentionTriggerAction(
  teamspaceId: string,
  input: { agentDefinitionId: string; agentName: string },
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const token = await getSlackBotTokenForTeamspace(teamspaceId);
  if (!token) {
    throw new Error(
      "Connect Slack on the Channels page before adding a Slack mention trigger.",
    );
  }

  const created = await createSlackUserGroupForAgent(
    token,
    input.agentName,
    `SSOTA agent — mention @${input.agentName} in Slack to run this agent.`,
  );

  return {
    slackUserGroupId: created.id,
    slackUserGroupHandle: created.handle,
  };
}

export async function updateTaskStatusAction(
  teamspaceId: string,
  taskId: string,
  status: TaskStatus,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = UpdateTaskInputSchema.parse({ taskId, status });
  const result = await getTaskPort(teamspaceId).updateTask(parsed.taskId, {
    status: parsed.status,
  });

  for (const path of withConsolePaths(["/tasks"])) {
    revalidatePath(path);
  }
  return result;
}

export async function spawnTaskAction(
  teamspaceId: string,
  input: {
    title: string;
    agentDefinitionId: string;
    assignee?: string;
    executorType?: "Agent" | "Human" | "System";
  },
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = SpawnTaskInputSchema.parse({
    title: input.title,
    agentDefinitionId: input.agentDefinitionId,
    assignee: input.assignee,
    executorType: input.executorType,
    acceptanceCriteria: ["Complete the work described in the task title and context"],
    context: {
      executionDirective: {
        goal:
          input.title.length >= 10
            ? input.title
            : `Complete task: ${input.title}`,
        background: "Created from Console tasks UI for human or agent execution.",
        steps: [
          "Review task title and acceptance criteria",
          "Complete the requested work",
          "Update task status and result when done",
        ],
        constraints: [],
        contextRefs: { nodeIds: [], edgeIds: [], taskIds: [] },
      },
    },
  });
  const graphPorts = await getGraphPorts(teamspaceId);
  await spawnTask(
    {
      tasks: getTaskPort(teamspaceId),
      graphRead: graphPorts.graphRead,
      agentDefinitions: getAgentDefinitionPort(teamspaceId),
    },
    teamspaceId,
    parsed,
  );

  for (const path of withConsolePaths(["/tasks"])) {
    revalidatePath(path);
  }
}

export async function signInWithGoogleAction(formData: FormData) {
  const next = formData.get("next");
  const nextValue = typeof next === "string" ? next : undefined;

  if (!isGoogleAuthEnabled()) {
    loginRedirect("Google 로그인이 활성화되지 않았습니다", nextValue);
  }

  const callbackParams = new URLSearchParams();
  const safe = safeNextPath(nextValue);
  if (safe) callbackParams.set("next", safe);
  const callbackQuery = callbackParams.toString();
  const redirectTo = `${getSiteUrl()}/auth/callback${callbackQuery ? `?${callbackQuery}` : ""}`;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error) loginRedirect(error.message, nextValue);
  if (data.url) redirect(data.url);
  loginRedirect("Google 로그인을 시작할 수 없습니다", nextValue);
}

const INVALID_CREDENTIALS_MESSAGE = "이메일 또는 비밀번호가 올바르지 않습니다";

function isInvalidLoginCredentials(error: { message: string; code?: string }) {
  return (
    error.code === "invalid_credentials" ||
    error.message.toLowerCase().includes("invalid login credentials")
  );
}

function isUserAlreadyRegistered(error: { message: string }) {
  return error.message.toLowerCase().includes("user already registered");
}

export async function signInAction(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const next = formData.get("next");
  const nextValue = typeof next === "string" ? next : undefined;

  if (typeof email !== "string" || typeof password !== "string") {
    throw new Error("email and password required");
  }

  const supabase = await createSupabaseServerClient();
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!signInError && signInData.user) {
    await clearAuthSignedOut();
    const path = await resolvePostSignInPath(signInData.user.id, nextValue);
    redirect(path);
  }

  if (signInError && isInvalidLoginCredentials(signInError)) {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (!signUpError && signUpData.user) {
      if (signUpData.user.identities?.length === 0) {
        loginRedirect(INVALID_CREDENTIALS_MESSAGE, nextValue);
      }

      await clearAuthSignedOut();
      const path = await resolvePostSignInPath(signUpData.user.id, nextValue);
      redirect(path);
    }

    if (signUpError) {
      if (isUserAlreadyRegistered(signUpError)) {
        loginRedirect(INVALID_CREDENTIALS_MESSAGE, nextValue);
      }
      loginRedirect(signUpError.message, nextValue);
    }

    loginRedirect("Sign up failed", nextValue);
  }

  loginRedirect(signInError?.message ?? "로그인에 실패했습니다", nextValue);
}

export async function signOutAction() {
  const provider = await getAuthProvider();
  await provider.signOut();
  redirect("/login");
}

export async function searchMentionNodesAction(input: {
  teamspaceId: string;
  query: string;
}): Promise<{
  ok: boolean;
  items: Array<{ id: string; label: string; nodeType: string }>;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, items: [], error: "Unauthorized" };

  const query = input.query.trim().toLowerCase();
  const { graphRead } = await getGraphPorts(input.teamspaceId);
  const nodes = await graphRead.queryNodes({ teamspaceId: input.teamspaceId, limit: 80 });
  const items = nodes
    .map((node) => {
      const title = String(
        node.properties.title ??
          node.properties.name ??
          node.properties.label ??
          node.title ??
          node.id,
      );
      return {
        id: node.id,
        label: title,
        nodeType: node.catalogKey,
      };
    })
    .filter((item) => {
      if (!query) return true;
      return (
        item.label.toLowerCase().includes(query) ||
        item.nodeType.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    })
    .slice(0, 8);

  return { ok: true, items };
}

export async function uploadEditorImageAction(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const teamspaceId = String(formData.get("teamspaceId") ?? "").trim();
  const file = formData.get("file");
  if (!teamspaceId) return { ok: false, error: "teamspaceId required" };
  if (!(file instanceof File)) return { ok: false, error: "file required" };
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Only image uploads are supported" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Image must be 5MB or smaller" };
  }

  try {
    const url = await uploadEditorAsset(teamspaceId, file);
    return { ok: true, url };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}
