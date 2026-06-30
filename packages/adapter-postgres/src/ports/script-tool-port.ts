import { and, eq, isNull } from "drizzle-orm";
import type { ActionPortsScope, ScriptToolPort } from "@ssota/core";
import {
  ScriptToolSchema,
  type ScriptTool,
  type ScriptToolIndex,
} from "@ssota/contracts";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

type ScriptToolRow = typeof schema.scriptTools.$inferSelect;

function mapScriptTool(row: ScriptToolRow): ScriptTool {
  return ScriptToolSchema.parse({
    id: row.id,
    teamspaceId: row.teamspaceId,
    accountId: row.accountId,
    key: row.key,
    name: row.name,
    description: row.description,
    inputSchema: row.inputSchema,
    outputSchema: row.outputSchema,
    script: row.script,
    runtime: row.runtime,
    permissions: row.permissions,
    defaultConfig: row.defaultConfig,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function mapIndex(row: ScriptToolRow): ScriptToolIndex {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    version: row.version,
  };
}

export function createScriptToolPort(
  db: Db,
  scope: ActionPortsScope,
): ScriptToolPort {
  const { teamspaceId } = scope;

  return {
    async listScriptTools() {
      const rows = await db
        .select()
        .from(schema.scriptTools)
        .where(
          and(
            eq(schema.scriptTools.teamspaceId, teamspaceId),
            isNull(schema.scriptTools.accountId),
          ),
        );
      return rows.map(mapIndex);
    },

    async getByKey(key) {
      const rows = await db
        .select()
        .from(schema.scriptTools)
        .where(
          and(
            eq(schema.scriptTools.teamspaceId, teamspaceId),
            eq(schema.scriptTools.key, key),
            isNull(schema.scriptTools.accountId),
          ),
        )
        .limit(1);
      return rows[0] ? mapScriptTool(rows[0]) : null;
    },

    async listForAgentDefinition(agentDefinitionId) {
      const rows = await db
        .select({
          tool: schema.scriptTools,
          enabled: schema.agentDefinitionScriptTools.enabled,
          config: schema.agentDefinitionScriptTools.config,
        })
        .from(schema.agentDefinitionScriptTools)
        .innerJoin(
          schema.scriptTools,
          eq(
            schema.agentDefinitionScriptTools.scriptToolId,
            schema.scriptTools.id,
          ),
        )
        .where(
          and(
            eq(
              schema.agentDefinitionScriptTools.agentDefinitionId,
              agentDefinitionId,
            ),
            eq(schema.agentDefinitionScriptTools.enabled, true),
          ),
        );
      return rows.map((r) => mapScriptTool(r.tool));
    },
  };
}
