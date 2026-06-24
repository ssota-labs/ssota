import { and, asc, desc, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { chatMessages, chatThreads } from "../db/schema.js";

export interface ChatScope {
  projectId: string;
  accountId?: string | null;
}

export interface ChatThreadRecord {
  id: string;
  projectId: string;
  accountId: string | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageRecord {
  id: string;
  threadId: string;
  role: string;
  parts: unknown[];
  createdAt: Date;
}

export interface AppendChatMessageInput {
  threadId: string;
  role: string;
  parts: unknown[];
}

/**
 * Persistence for in-app web chat (multi-turn). Threads + messages are scoped to
 * a project account; the `/api/chat/web` route appends the user turn, replays
 * prior turns into the agent, then the main-agent workflow appends the assistant
 * turn when the durable run finishes.
 */
export function createChatPort(db: Db, scope: ChatScope) {
  const { projectId } = scope;
  const accountId = scope.accountId ?? null;

  function toThread(row: ChatThreadRecord): ChatThreadRecord {
    return row;
  }

  return {
    async createThread(title?: string): Promise<ChatThreadRecord> {
      const [row] = await db
        .insert(chatThreads)
        .values({ projectId, accountId, title: title ?? "New chat" })
        .returning();
      return toThread(row!);
    },

    async getThread(threadId: string): Promise<ChatThreadRecord | null> {
      const [row] = await db
        .select()
        .from(chatThreads)
        .where(
          and(eq(chatThreads.id, threadId), eq(chatThreads.projectId, projectId)),
        )
        .limit(1);
      return row ?? null;
    },

    /** Threads for the scope, newest activity first. */
    async listThreads(limit = 50): Promise<ChatThreadRecord[]> {
      const where = accountId
        ? and(
            eq(chatThreads.projectId, projectId),
            eq(chatThreads.accountId, accountId),
          )
        : eq(chatThreads.projectId, projectId);
      return db
        .select()
        .from(chatThreads)
        .where(where)
        .orderBy(desc(chatThreads.updatedAt))
        .limit(limit);
    },

    /** Most recent thread for the scope, or null. */
    async latestThread(): Promise<ChatThreadRecord | null> {
      const where = accountId
        ? and(
            eq(chatThreads.projectId, projectId),
            eq(chatThreads.accountId, accountId),
          )
        : eq(chatThreads.projectId, projectId);
      const [row] = await db
        .select()
        .from(chatThreads)
        .where(where)
        .orderBy(desc(chatThreads.updatedAt))
        .limit(1);
      return row ?? null;
    },

    async listMessages(threadId: string): Promise<ChatMessageRecord[]> {
      const rows = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.threadId, threadId))
        .orderBy(asc(chatMessages.createdAt));
      return rows.map((r) => ({
        id: r.id,
        threadId: r.threadId,
        role: r.role,
        parts: (r.parts ?? []) as unknown[],
        createdAt: r.createdAt,
      }));
    },

    async deleteThread(threadId: string): Promise<boolean> {
      const thread = await db
        .select()
        .from(chatThreads)
        .where(
          and(eq(chatThreads.id, threadId), eq(chatThreads.projectId, projectId)),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null);
      if (!thread) return false;
      if (accountId !== null && thread.accountId !== accountId) {
        return false;
      }
      const result = await db
        .delete(chatThreads)
        .where(
          and(eq(chatThreads.id, threadId), eq(chatThreads.projectId, projectId)),
        )
        .returning({ id: chatThreads.id });
      return result.length > 0;
    },

    async appendMessage(
      input: AppendChatMessageInput,
    ): Promise<ChatMessageRecord> {
      const [row] = await db
        .insert(chatMessages)
        .values({
          threadId: input.threadId,
          role: input.role,
          parts: input.parts,
        })
        .returning();
      await db
        .update(chatThreads)
        .set({ updatedAt: new Date() })
        .where(eq(chatThreads.id, input.threadId));
      return {
        id: row!.id,
        threadId: row!.threadId,
        role: row!.role,
        parts: (row!.parts ?? []) as unknown[],
        createdAt: row!.createdAt,
      };
    },
  };
}
