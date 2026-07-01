import { Chat } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createDiscordAdapter } from "@chat-adapter/discord";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createMigrationBackedPostgresState } from "./postgres-state";
import {
  createVercelConnectProvider,
  createVercelOidcVerifier,
  type UIMessageChunk,
} from "@ssota/agent-runtime";
import { start } from "workflow/api";
import {
  createModelCallToUIChunkTransform,
  type ModelCallStreamPart,
} from "@ai-sdk/workflow";
import { runMainWorkflowAgent } from "@/app/workflows/main-workflow-agent";
import { getSiteUrl } from "@/lib/auth/config";
import { extractWorkspaceKey, resolveChatTarget } from "./resolve-account";
import type { SlackInboundRoute } from "./slack-inbound-route";
import {
  listTeamspaceAgentDefinitions,
  resolveSlackInboundRoute,
} from "./slack-inbound-route";
import { getAgentDefinitionPort } from "@/lib/ports";

type ChatThreadState = {
  agentDefinitionId?: string;
};

function notLinkedReply(): string {
  return (
    "I'm not connected to a project yet. An admin can connect this workspace " +
    `from a project's Connections page in SSOTA (${getSiteUrl()}) — pick the ` +
    "project, then Connect → Slack/Discord. After that, @mention me here again."
  );
}

function slackAdapter() {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const staticToken = process.env.SLACK_BOT_TOKEN;
  const connectDisabled =
    process.env.SLACK_CONNECT === "0" || Boolean(staticToken);

  if (!connectDisabled) {
    const connector = process.env.SLACK_CONNECT_CONNECTOR ?? "slack";
    const provider = createVercelConnectProvider();
    const teamspaceId = process.env.CHAT_PROJECT_ID ?? "";
    const useIntake = process.env.SLACK_CONNECT_INTAKE !== "0";
    return createSlackAdapter({
      ...(useIntake
        ? { webhookVerifier: createVercelOidcVerifier() }
        : { signingSecret }),
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      installationProvider: {
        getInstallation: async (installationId: string) => {
          const cred = await provider.getToken(connector, {
            teamspaceId,
            installationId,
          });
          return cred ? { botToken: cred.token } : null;
        },
      },
    });
  }

  if (staticToken) {
    return createSlackAdapter({ signingSecret, botToken: staticToken });
  }

  return createSlackAdapter({ signingSecret });
}

async function* uiChunksToText(
  readable: ReadableStream<UIMessageChunk>,
): AsyncIterable<string> {
  const reader = readable.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value as { type?: string; delta?: string } | undefined;
      if (chunk?.type === "text-delta" && typeof chunk.delta === "string") {
        yield chunk.delta;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

interface IncomingMessage {
  text: string;
  author?: { userId?: string };
  raw?: unknown;
  threadId?: string;
  isMention?: boolean;
  id?: string;
}

const handledMessageIds = new Map<string, number>();
const HANDLED_TTL_MS = 60_000;

function shouldHandleMessage(messageId: string | undefined): boolean {
  if (!messageId) return true;
  const now = Date.now();
  for (const [id, expiresAt] of handledMessageIds) {
    if (expiresAt <= now) handledMessageIds.delete(id);
  }
  if (handledMessageIds.has(messageId)) return false;
  handledMessageIds.set(messageId, now + HANDLED_TTL_MS);
  return true;
}

async function loadDefinitions(teamspaceId: string) {
  const port = getAgentDefinitionPort(teamspaceId);
  return listTeamspaceAgentDefinitions(
    () => port.listDefinitions(),
    (id) => port.getById(id),
  );
}

async function runAgentStream(
  message: IncomingMessage,
  target: { teamspaceId: string; accountId?: string },
  route: SlackInboundRoute,
  threadId: string,
  workspaceKey: string | undefined,
) {
  const run = await start(runMainWorkflowAgent, [
    {
      teamspaceId: target.teamspaceId,
      threadId,
      accountId: target.accountId,
      agentDefinitionId: route.isMain ? undefined : route.agentDefinitionId,
      chatContext: {
        trigger: "chatbot",
        chat: {
          messages: [{ role: "user", content: message.text }],
        },
        channel: "chat",
        workspace: workspaceKey,
        user: message.author?.userId,
      },
    },
  ]);

  const readable = run.getReadable() as ReadableStream<ModelCallStreamPart>;
  return uiChunksToText(
    readable.pipeThrough(
      createModelCallToUIChunkTransform(),
    ) as ReadableStream<UIMessageChunk>,
  );
}

async function handleInboundMessage(
  thread: {
    id: string;
    post: (
      message: string | AsyncIterable<string>,
    ) => Promise<unknown>;
    startTyping: (status?: string) => Promise<void>;
    setState: (state: Partial<ChatThreadState>) => Promise<void>;
    state: Promise<ChatThreadState | null>;
    subscribe: () => Promise<void>;
  },
  message: IncomingMessage,
) {
  if (!shouldHandleMessage(message.id)) return;

  const workspaceKey = extractWorkspaceKey(message.raw);
  const target = await resolveChatTarget(workspaceKey);
  if (!target) {
    await thread.post(notLinkedReply());
    return;
  }

  const threadState = await thread.state;
  const definitions = await loadDefinitions(target.teamspaceId);
  const route = await resolveSlackInboundRoute({
    definitions,
    messageText: message.text,
    messageIsBotMention: message.isMention ?? false,
    threadAgentDefinitionId: threadState?.agentDefinitionId,
  });

  if (!route) return;

  await thread.setState({ agentDefinitionId: route.agentDefinitionId });

  if (route.showTypingIndicator) {
    await thread.startTyping();
  }

  await thread.post(
    await runAgentStream(message, target, route, thread.id, workspaceKey),
  );
}

let cached: Chat | undefined;

export function getBot(): Chat {
  if (!cached) {
    const bot = new Chat({
      userName: process.env.CHAT_BOT_NAME ?? "ssota",
      adapters: {
        slack: slackAdapter(),
        ...(process.env.DISCORD_BOT_TOKEN
          ? { discord: createDiscordAdapter() }
          : {}),
        ...(process.env.TELEGRAM_BOT_TOKEN
          ? { telegram: createTelegramAdapter() }
          : {}),
      },
      state: createMigrationBackedPostgresState({
        url: process.env.DATABASE_URL,
      }),
      dedupeTtlMs: 600_000,
    });

    bot.onNewMention(async (thread, message) => {
      await thread.subscribe();
      await handleInboundMessage(thread, {
        ...message,
        threadId: thread.id,
        isMention: true,
      });
    });

    bot.onNewMessage(/<!subteam\^/i, async (thread, message) => {
      await thread.subscribe();
      await handleInboundMessage(thread, {
        ...message,
        threadId: thread.id,
        isMention: false,
      });
    });

    bot.onSubscribedMessage(async (thread, message) => {
      await handleInboundMessage(thread, {
        ...message,
        threadId: thread.id,
        isMention: message.isMention,
      });
    });

    cached = bot;
  }
  return cached;
}
