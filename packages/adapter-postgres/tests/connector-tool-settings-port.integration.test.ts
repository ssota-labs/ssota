import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  createConnectorToolSettingsPort,
  createConsolePort,
  createDb,
  DEFAULT_ORG_SLUG,
  SMOKE_EMAIL,
} from "../src/index.js";
import * as schema from "../src/db/schema.js";

loadEnv({ path: new URL("../../../.env.local", import.meta.url).pathname });
loadEnv({
  path: new URL("../../../apps/web/.env.local", import.meta.url).pathname,
});

let skip = false;

describe("connector tool settings port integration", () => {
  let db: ReturnType<typeof createDb>["db"] | undefined;
  let client: ReturnType<typeof createDb>["client"] | undefined;
  let port: ReturnType<typeof createConnectorToolSettingsPort>;
  let orgId: string;
  let profileId: string;

  const toolkit = "notion";
  const connA = `test-conn-a-${Date.now()}`;
  const connB = `test-conn-b-${Date.now()}`;

  beforeAll(async () => {
    try {
      const dbBundle = createDb();
      client = dbBundle.client;
      db = dbBundle.db;
      port = createConnectorToolSettingsPort(db);

      const consolePort = createConsolePort(db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      if (!org) {
        skip = true;
        return;
      }
      orgId = org.id;

      const profileRows = await db
        .select({ id: schema.profiles.id })
        .from(schema.profiles)
        .where(eq(schema.profiles.email, SMOKE_EMAIL))
        .limit(1);
      profileId = profileRows[0]?.id ?? "";
      if (!profileId) skip = true;
    } catch {
      skip = true;
    }
  });

  afterAll(async () => {
    if (db) {
      await db
        .delete(schema.connectorToolSettings)
        .where(
          and(
            eq(schema.connectorToolSettings.orgId, orgId),
            eq(schema.connectorToolSettings.profileId, profileId),
          ),
        );
    }
    await client?.end();
  });

  beforeEach(async (context) => {
    if (skip) {
      context.skip();
      return;
    }
    await db!
      .delete(schema.connectorToolSettings)
      .where(
        and(
          eq(schema.connectorToolSettings.orgId, orgId),
          eq(schema.connectorToolSettings.profileId, profileId),
        ),
      );
  });

  it("stores disabled tools per connection id", async () => {
    await port.setDisabled(orgId, profileId, connA, toolkit, [
      "NOTION_SEARCH",
    ]);
    await port.setDisabled(orgId, profileId, connB, toolkit, []);

    expect(await port.getDisabled(orgId, profileId, connA, toolkit)).toEqual([
      "NOTION_SEARCH",
    ]);
    expect(await port.getDisabled(orgId, profileId, connB, toolkit)).toEqual(
      [],
    );
  });

  it("migrates legacy toolkit row to each connection", async () => {
    await db!.insert(schema.connectorToolSettings).values({
      orgId,
      profileId,
      toolkit,
      connectionId: null,
      disabledTools: ["LEGACY_TOOL"],
    });

    await port.migrateLegacyToolkitToConnections(orgId, profileId, toolkit, [
      connA,
      connB,
    ]);

    expect(await port.getDisabled(orgId, profileId, connA, toolkit)).toEqual([
      "LEGACY_TOOL",
    ]);
    expect(await port.getDisabled(orgId, profileId, connB, toolkit)).toEqual([
      "LEGACY_TOOL",
    ]);

    const legacy = await db!
      .select()
      .from(schema.connectorToolSettings)
      .where(
        and(
          eq(schema.connectorToolSettings.orgId, orgId),
          eq(schema.connectorToolSettings.profileId, profileId),
          eq(schema.connectorToolSettings.toolkit, toolkit),
        ),
      );
    expect(legacy.every((row) => row.connectionId !== null)).toBe(true);
  });

  it("unions disabled tools across connections in getDisabledByToolkit", async () => {
    await port.setDisabled(orgId, profileId, connA, toolkit, ["TOOL_A"]);
    await port.setDisabled(orgId, profileId, connB, toolkit, ["TOOL_B"]);

    const byToolkit = await port.getDisabledByToolkit(orgId, profileId);
    expect(byToolkit[toolkit]?.sort()).toEqual(["TOOL_A", "TOOL_B"]);
  });
});
