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
import { getMainAgentRunner } from "@/app/workflows/main-agent-job-runner";
import { getSiteUrl } from "@/lib/auth/config";
import { extractWorkspaceKey, resolveChatTarget } from "./resolve-account";

function notLinkedReply(): string {
  return (
    "I'm not connected to a project yet. An admin can connect this workspace " +
    `from a project's Connections page in SSOTA (${getSiteUrl()}) — pick the ` +
    "project, then Connect → Slack/Discord. After that, @mention me here again."
  );
}

function slackAdapter() {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (botToken) {
    return createSlackAdapter({ signingSecret, botToken });
  }

  const connector = process.env.SLACK_CONNECT_CONNECTOR;
  if (connector) {
    const provider = createVercelConnectProvider();
    const projectId = process.env.CHAT_PROJECT_ID ?? "";
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
            projectId,
            installationId,
          });
          return cred ? { botToken: cred.token } : null;
        },
      },
    });
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
}

async function runAgentStream(message: IncomingMessage) {
  const workspaceKey = extractWorkspaceKey(message.raw);
  const target = await resolveChatTarget(workspaceKey);
  if (!target) {
    return notLinkedReply();
  }
  const { projectId, accountId } = target;
  const text = message.text;
  const threadId = message.threadId ?? `chat:${workspaceKey}`;

  const runner = await getMainAgentRunner();
  const run = await runner.start({
    projectId,
    threadId,
    accountId,
    chatContext: {
      chat: {
        messages: [{ role: "user", content: text }],
      },
      channel: "chat",
      workspace: workspaceKey,
      user: message.author?.userId,
    },
  });

  return uiChunksToText(run.getReadable() as ReadableStream<UIMessageChunk>);
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
      await thread.post(
        await runAgentStream({
          ...message,
          threadId: thread.id,
        }),
      );
    });

    bot.onSubscribedMessage(async (thread, message) => {
      await thread.post(
        await runAgentStream({
          ...message,
          threadId: thread.id,
        }),
      );
    });

    cached = bot;
  }
  return cached;
}
