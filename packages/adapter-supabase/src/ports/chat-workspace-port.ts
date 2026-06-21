import { and, desc, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { chatWorkspaces } from "../db/schema.js";

export interface ChatWorkspaceTarget {
  projectId: string;
  accountId: string | null;
}

export interface ChatWorkspaceRow {
  id: string;
  platform: string;
  workspaceKey: string;
  accountId: string | null;
  name: string | null;
}

export interface LinkChatWorkspaceInput {
  projectId: string;
  accountId?: string | null;
  platform: string;
  workspaceKey: string;
  name?: string | null;
}

/**
 * Reader/writer for chat workspace → project links. `resolve` is called per
 * inbound message to route it to the right project; `link` is called when a
 * creator connects a workspace to one of their projects. Idempotent on
 * `workspaceKey` (a workspace maps to exactly one project).
 */
export function createChatWorkspacePort(db: Db) {
  return {
    async resolve(workspaceKey: string): Promise<ChatWorkspaceTarget | null> {
      const [row] = await db
        .select({
          projectId: chatWorkspaces.projectId,
          accountId: chatWorkspaces.accountId,
        })
        .from(chatWorkspaces)
        .where(eq(chatWorkspaces.workspaceKey, workspaceKey))
        .limit(1);
      return row
        ? { projectId: row.projectId, accountId: row.accountId }
        : null;
    },

    async link(input: LinkChatWorkspaceInput): Promise<void> {
      await db
        .insert(chatWorkspaces)
        .values({
          projectId: input.projectId,
          accountId: input.accountId ?? null,
          platform: input.platform,
          workspaceKey: input.workspaceKey,
          name: input.name ?? null,
        })
        .onConflictDoUpdate({
          target: chatWorkspaces.workspaceKey,
          set: {
            projectId: input.projectId,
            accountId: input.accountId ?? null,
            platform: input.platform,
            name: input.name ?? null,
            updatedAt: new Date(),
          },
        });
    },

    async list(projectId: string): Promise<ChatWorkspaceRow[]> {
      return db
        .select({
          id: chatWorkspaces.id,
          platform: chatWorkspaces.platform,
          workspaceKey: chatWorkspaces.workspaceKey,
          accountId: chatWorkspaces.accountId,
          name: chatWorkspaces.name,
        })
        .from(chatWorkspaces)
        .where(eq(chatWorkspaces.projectId, projectId))
        .orderBy(desc(chatWorkspaces.createdAt));
    },

    /** Scoped by projectId so a client can't unlink another project's row. */
    async unlink(id: string, projectId: string): Promise<void> {
      await db
        .delete(chatWorkspaces)
        .where(
          and(
            eq(chatWorkspaces.id, id),
            eq(chatWorkspaces.projectId, projectId),
          ),
        );
    },
  };
}
