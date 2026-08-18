import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { connectorToolSettings } from "../../db/schema.js";

/**
 * Per-(org, user, connection) connector tool restrictions. The Composio entity is
 * org + profile; each connected account (connection_id) has its own disabled set.
 */
export interface ConnectorToolSettingsPort {
  /** Disabled tool slugs per toolkit — union across connections (runtime; Phase 2 refines). */
  getDisabledByToolkit(
    orgId: string,
    profileId: string,
  ): Promise<Record<string, string[]>>;
  /** Disabled tool slugs for a single connected account. */
  getDisabled(
    orgId: string,
    profileId: string,
    connectionId: string,
    toolkit: string,
  ): Promise<string[]>;
  /** Replace the disabled set for a connected account (upsert). */
  setDisabled(
    orgId: string,
    profileId: string,
    connectionId: string,
    toolkit: string,
    disabled: string[],
  ): Promise<void>;
  /**
   * Copy a legacy per-toolkit row to every live connection id, then delete the
   * legacy row. No-op when there is no legacy row or connectionIds is empty.
   */
  migrateLegacyToolkitToConnections(
    orgId: string,
    profileId: string,
    toolkit: string,
    connectionIds: string[],
  ): Promise<void>;
}

export function createConnectorToolSettingsPort(db: Db): ConnectorToolSettingsPort {
  const t = connectorToolSettings;
  return {
    async getDisabledByToolkit(orgId, profileId) {
      const rows = await db
        .select()
        .from(t)
        .where(and(eq(t.orgId, orgId), eq(t.profileId, profileId)));
      const out: Record<string, string[]> = {};
      for (const row of rows) {
        const toolkit = row.toolkit;
        const slugs = row.disabledTools ?? [];
        if (slugs.length === 0) continue;
        const existing = out[toolkit] ?? [];
        out[toolkit] = [...new Set([...existing, ...slugs])].sort();
      }
      return out;
    },

    async getDisabled(orgId, profileId, connectionId, toolkit) {
      const rows = await db
        .select()
        .from(t)
        .where(
          and(
            eq(t.orgId, orgId),
            eq(t.profileId, profileId),
            eq(t.connectionId, connectionId),
          ),
        )
        .limit(1);
      if (rows[0]) return rows[0].disabledTools ?? [];

      const legacy = await db
        .select()
        .from(t)
        .where(
          and(
            eq(t.orgId, orgId),
            eq(t.profileId, profileId),
            isNull(t.connectionId),
            eq(t.toolkit, toolkit),
          ),
        )
        .limit(1);
      return legacy[0]?.disabledTools ?? [];
    },

    async setDisabled(orgId, profileId, connectionId, toolkit, disabled) {
      const existing = await db
        .select({ id: t.id })
        .from(t)
        .where(
          and(
            eq(t.orgId, orgId),
            eq(t.profileId, profileId),
            eq(t.connectionId, connectionId),
          ),
        )
        .limit(1);

      if (existing[0]) {
        await db
          .update(t)
          .set({ disabledTools: disabled, toolkit, updatedAt: new Date() })
          .where(eq(t.id, existing[0].id));
        return;
      }

      await db.insert(t).values({
        orgId,
        profileId,
        connectionId,
        toolkit,
        disabledTools: disabled,
      });
    },

    async migrateLegacyToolkitToConnections(
      orgId,
      profileId,
      toolkit,
      connectionIds,
    ) {
      const uniqueIds = [...new Set(connectionIds.filter(Boolean))];
      if (uniqueIds.length === 0) return;

      const legacyRows = await db
        .select()
        .from(t)
        .where(
          and(
            eq(t.orgId, orgId),
            eq(t.profileId, profileId),
            isNull(t.connectionId),
            eq(t.toolkit, toolkit),
          ),
        )
        .limit(1);
      const legacy = legacyRows[0];
      if (!legacy) return;

      const disabled = legacy.disabledTools ?? [];
      const existing = await db
        .select({ connectionId: t.connectionId })
        .from(t)
        .where(
          and(
            eq(t.orgId, orgId),
            eq(t.profileId, profileId),
            inArray(t.connectionId, uniqueIds),
          ),
        );
      const existingIds = new Set(
        existing
          .map((row) => row.connectionId)
          .filter((id): id is string => typeof id === "string"),
      );

      for (const connectionId of uniqueIds) {
        if (existingIds.has(connectionId)) continue;
        await db.insert(t).values({
          orgId,
          profileId,
          connectionId,
          toolkit,
          disabledTools: disabled,
        });
      }

      await db
        .delete(t)
        .where(
          and(
            eq(t.orgId, orgId),
            eq(t.profileId, profileId),
            isNull(t.connectionId),
            eq(t.toolkit, toolkit),
          ),
        );
    },
  };
}
