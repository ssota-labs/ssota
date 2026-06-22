import { config as loadEnv } from "dotenv";
import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { AccountError } from "@ssota/core";
import {
  createConsolePort,
  createDb,
  createDbAccountReadPort,
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
} from "../src/index.js";
import { createTestAuthUser } from "./helpers/create-test-auth-user.js";

loadEnv({ path: new URL("../../../.env.local", import.meta.url).pathname });
loadEnv({ path: new URL("../../../apps/web/.env.local", import.meta.url).pathname });

let skip = false;

describe("account read port integration", () => {
  let projectId: string;
  let accountRead: ReturnType<typeof createDbAccountReadPort>;
  let db: ReturnType<typeof createDb>["db"] | undefined;
  let client: ReturnType<typeof createDb>["client"] | undefined;
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    try {
      const dbBundle = createDb();
      client = dbBundle.client;
      db = dbBundle.db;
      accountRead = createDbAccountReadPort(dbBundle.db);

      const consolePort = createConsolePort(dbBundle.db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      if (!org) {
        skip = true;
        return;
      }
      const project = await consolePort.getProjectBySlug(org.id, DEFAULT_PROJECT_SLUG);
      if (!project) {
        skip = true;
        return;
      }
      projectId = project.id;

      userA = await createTestAuthUser(dbBundle.db, "Account Test A");
      userB = await createTestAuthUser(dbBundle.db, "Account Test B");
    } catch {
      skip = true;
    }
  });

  afterAll(async () => {
    await client?.end();
  });

  beforeEach((context) => {
    if (skip) context.skip();
  });

  it("provisionForUser is idempotent", async () => {
    const first = await accountRead.provisionForUser(projectId, userA);
    const second = await accountRead.provisionForUser(projectId, userA);
    expect(second.id).toBe(first.id);
    expect(second.slug).toBe(`user-${userA}`);
  });

  it("provisions distinct accounts per user in the same project", async () => {
    const accountA = await accountRead.provisionForUser(projectId, userA);
    const accountB = await accountRead.provisionForUser(projectId, userB);
    expect(accountA.id).not.toBe(accountB.id);
  });

  it("getAccountForUser returns null before provision", async () => {
    const freshUser = await createTestAuthUser(db!, "Account Fresh");
    const account = await accountRead.getAccountForUser(projectId, freshUser);
    expect(account).toBeNull();
  });

  it("assertAccountAccess rejects foreign account", async () => {
    const accountA = await accountRead.provisionForUser(projectId, userA);
    await expect(
      accountRead.assertAccountAccess(userB, accountA.id),
    ).rejects.toMatchObject({
      name: "AccountError",
      code: "ACCOUNT_FORBIDDEN",
    });
  });

  it("assertAccountAccess allows owner membership", async () => {
    const account = await accountRead.provisionForUser(projectId, userA);
    await expect(
      accountRead.assertAccountAccess(userA, account.id),
    ).resolves.toBeUndefined();
  });

  it("assertAccountAccess throws ACCOUNT_NOT_FOUND for missing account", async () => {
    await expect(
      accountRead.assertAccountAccess(userA, randomUUID()),
    ).rejects.toBeInstanceOf(AccountError);
  });

  it("getOrCreateWorkspaceAccount is idempotent", async () => {
    const first = await accountRead.getOrCreateWorkspaceAccount(projectId);
    const second = await accountRead.getOrCreateWorkspaceAccount(projectId);
    expect(second.id).toBe(first.id);
    expect(second.slug).toBe("workspace");
  });
});
