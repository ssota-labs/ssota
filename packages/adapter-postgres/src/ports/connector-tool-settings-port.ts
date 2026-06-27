import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { connectorToolSettings } from "../db/schema.js";

/**
 * Per-(org, user, toolkit) connector tool restrictions. The Composio entity is
 * org + profile, so settings are keyed by (orgId, profileId, toolkit) and shared
 * across that org's projects — mirroring how the connections themselves are
 * shared.
 */
export interface ConnectorToolSettingsPort {
  /** Disabled tool slugs per toolkit for the entity, e.g. `{ gmail: ["GMAIL_DELETE"] }`. */
  getDisabledByToolkit(
    orgId: string,
    profileId: string,
  ): Promise<Record<string, string[]>>;
  /** Disabled tool slugs for a single toolkit. */
  getDisabled(
    orgId: string,
    profileId: string,
    toolkit: string,
  ): Promise<string[]>;
  /** Replace the disabled set for a toolkit (upsert). */
  setDisabled(
    orgId: string,
    profileId: string,
    toolkit: string,
    disabled: string[],
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
        out[row.toolkit] = row.disabledTools ?? [];
      }
      return out;
    },

    async getDisabled(orgId, profileId, toolkit) {
      const rows = await db
        .select()
        .from(t)
        .where(
          and(
            eq(t.orgId, orgId),
            eq(t.profileId, profileId),
            eq(t.toolkit, toolkit),
          ),
        )
        .limit(1);
      return rows[0]?.disabledTools ?? [];
    },

    async setDisabled(orgId, profileId, toolkit, disabled) {
      await db
        .insert(t)
        .values({ orgId, profileId, toolkit, disabledTools: disabled })
        .onConflictDoUpdate({
          target: [t.orgId, t.profileId, t.toolkit],
          set: { disabledTools: disabled, updatedAt: new Date() },
        });
    },
  };
}
