import { Chat } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createDiscordAdapter } from "@chat-adapter/discord";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createMigrationBackedPostgresState } from "./postgres-state";
import {
  createVercelConnectProvider,
  createVercelOidcVerifier,
  isEmulateEnabled,
  resolveProviderApiOrigin,
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
import {
  createSlackWebhookVerifier,
  resolveSlackSigningSecret,
} from "./slack-webhook-verify";

type ChatThreadState = {
  agentDefinitionId?: string;
};

function notLinkedReply(): string {
  return (
    "I'm not connected to a project yet. An admin can link this workspace from " +
    `the project's Channels page in SSOTA (${getSiteUrl()}) — Connect Slack or ` +
    "Discord for inbound chat. After that, @mention me here again."
  );
}

function slackAdapter() {
  const signingSecret = resolveSlackSigningSecret();
  const slackWebhookVerifier = createSlackWebhookVerifier(signingSecret);
  const staticToken = process.env.SLACK_BOT_TOKEN;
  const connectDisabled =
    process.env.SLACK_CONNECT === "0" || Boolean(staticToken);
  const emulateApiUrl = isEmulateEnabled()
    ? `${resolveProviderApiOrigin("slack")}/api/`
    : process.env.SLACK_API_URL;
  const apiOptions = emulateApiUrl ? { apiUrl: emulateApiUrl } : {};

  if (!connectDisabled) {
    const connector = process.env.SLACK_CONNECT_CONNECTOR ?? "slack";
    const provider = createVercelConnectProvider();
    const teamspaceId = process.env.CHAT_PROJECT_ID ?? "";
    const useIntake = process.env.SLACK_CONNECT_INTAKE !== "0";
    return createSlackAdapter({
      ...apiOptions,
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
    return createSlackAdapter({
      webhookVerifier: slackWebhookVerifier,
      botToken: staticToken,
      ...apiOptions,
    });
  }

  return createSlackAdapter({ webhookVerifier: slackWebhookVerifier, ...apiOptions });
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

const STUB_EMULATE_REPLY =
  "안녕하세요. 로컬 stub agent입니다. 채팅 스트리밍 파이프라인이 정상 동작합니다.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
        trigger: route.isMain ? "chatbot" : "manual",
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
  const stream = uiChunksToText(
    readable.pipeThrough(
      createModelCallToUIChunkTransform(),
    ) as ReadableStream<UIMessageChunk>,
  );
  return { run, stream };
}

async function collectTextStream(
  stream: AsyncIterable<string>,
): Promise<string> {
  let text = "";
  for await (const chunk of stream) {
    text += chunk;
  }
  return text.trim();
}

/**
 * Emulate + inline workflow runs may finish before the durable stream closes.
 * Race stream collection against workflow completion, then fall back to the stub
 * reply when STUB_MODEL is enabled so Slack thread.post is not blocked forever.
 */
async function collectEmulateAgentReply(
  run: Awaited<ReturnType<typeof start>>,
  stream: AsyncIterable<string>,
): Promise<string> {
  let text = "";
  const streamTask = collectTextStream(stream).then((value) => {
    text = value;
  });

  await Promise.race([
    streamTask,
    run.returnValue.then(() => undefined).catch(() => undefined),
  ]);

  if (!text.trim()) {
    await Promise.race([streamTask, sleep(3_000)]);
  }

  const trimmed = text.trim();
  if (trimmed) return trimmed;
  if (process.env.STUB_MODEL === "1") return STUB_EMULATE_REPLY;
  return "";
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

  if (route.showTypingIndicator && !isEmulateEnabled()) {
    await thread.startTyping();
  }

  const { run, stream } = await runAgentStream(
    message,
    target,
    route,
    thread.id,
    workspaceKey,
  );

  if (isEmulateEnabled()) {
    const text = await collectEmulateAgentReply(run, stream);
    if (!text.trim()) {
      await thread.post(
        "Sorry — I couldn't generate a reply right now. Please try again in a moment.",
      );
      return;
    }
    await thread.post(text);
    return;
  }

  await thread.post(stream);
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
