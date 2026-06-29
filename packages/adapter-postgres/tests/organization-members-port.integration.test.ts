import { config as loadEnv } from "dotenv";
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { SettingsError } from "@ssota/core";
import {
  createConsolePort,
  createDb,
  createOrganizationMembersPort,
  DEFAULT_ORG_SLUG,
  SMOKE_EMAIL,
} from "../src/index.js";
import { createTestAuthUser } from "./helpers/create-test-auth-user.js";
import * as schema from "../src/db/schema.js";
import { eq } from "drizzle-orm";

loadEnv({ path: new URL("../../../.env.local", import.meta.url).pathname });
loadEnv({ path: new URL("../../../apps/web/.env.local", import.meta.url).pathname });

let skip = false;

describe("organization members port integration", () => {
  let db: ReturnType<typeof createDb>["db"] | undefined;
  let client: ReturnType<typeof createDb>["client"] | undefined;
  let organizationId: string;
  let ownerUserId: string;
  let membersPort: ReturnType<typeof createOrganizationMembersPort>;

  beforeAll(async () => {
    try {
      const dbBundle = createDb();
      client = dbBundle.client;
      db = dbBundle.db;
      membersPort = createOrganizationMembersPort(db);

      const consolePort = createConsolePort(db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      if (!org) {
        skip = true;
        return;
      }
      organizationId = org.id;

      const ownerRows = await db
        .select({ id: schema.profiles.id })
        .from(schema.profiles)
        .where(eq(schema.profiles.email, SMOKE_EMAIL))
        .limit(1);
      ownerUserId = ownerRows[0]?.id ?? org.ownerUserId ?? "";
      if (!ownerUserId) skip = true;
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

  it("returns members view for org member", async () => {
    const view = await membersPort.getMembersView(organizationId, ownerUserId);
    expect(view).not.toBeNull();
    expect(view!.organizationId).toBe(organizationId);
    expect(view!.userRole).toBe("owner");
    expect(view!.currentMembers.length).toBeGreaterThan(0);
  });

  it("invite → accept adds membership", async () => {
    const inviteeId = await createTestAuthUser(db!, "Invitee Accept");
    const inviteeRows = await db!
      .select({ email: schema.profiles.email })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, inviteeId))
      .limit(1);
    const inviteeEmail = inviteeRows[0]!.email;

    const invite = await membersPort.inviteMember({
      organizationId,
      actorUserId: ownerUserId,
      inviteeEmail,
    });
    expect(invite.invitationId).toBeTruthy();

    const pending = await membersPort.listPendingInvitesForUser(inviteeId);
    expect(pending.some((p) => p.id === invite.invitationId)).toBe(true);

    const result = await membersPort.respondToInvitation({
      invitationId: invite.invitationId,
      actorUserId: inviteeId,
      accept: true,
    });
    expect(result.organizationSlug).toBe(DEFAULT_ORG_SLUG);

    const view = await membersPort.getMembersView(organizationId, ownerUserId);
    expect(view!.currentMembers.some((m) => m.userId === inviteeId)).toBe(true);
  });

  it("rejects duplicate invite for existing member", async () => {
    await expect(
      membersPort.inviteMember({
        organizationId,
        actorUserId: ownerUserId,
        inviteeEmail: SMOKE_EMAIL,
      }),
    ).rejects.toMatchObject({
      code: "ALREADY_MEMBER",
    } satisfies Partial<SettingsError>);
  });

  it("non-owner cannot invite", async () => {
    const memberId = await createTestAuthUser(db!, "Member Only");
    await db!.insert(schema.organizationMemberships).values({
      organizationId,
      userId: memberId,
      role: "member",
    });

    const memberRows = await db!
      .select({ email: schema.profiles.email })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, memberId))
      .limit(1);

    await expect(
      membersPort.inviteMember({
        organizationId,
        actorUserId: memberId,
        inviteeEmail: `new-${memberId.slice(0, 8)}@ssota.test`,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("owner can remove member", async () => {
    const targetId = await createTestAuthUser(db!, "Remove Target");
    await db!.insert(schema.organizationMemberships).values({
      organizationId,
      userId: targetId,
      role: "member",
    });

    await membersPort.removeMember({
      organizationId,
      actorUserId: ownerUserId,
      targetUserId: targetId,
    });

    const view = await membersPort.getMembersView(organizationId, ownerUserId);
    expect(view!.currentMembers.some((m) => m.userId === targetId)).toBe(false);
  });
});
