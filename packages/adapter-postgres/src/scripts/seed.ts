import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { eq, sql } from "drizzle-orm";
import { createDb } from "../db/client.js";
import * as schema from "../db/schema.js";
import {
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
  LOCAL_AUTH_USER_EMAIL,
  LOCAL_AUTH_USER_ID,
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
  SMOKE_MEMBER_EMAIL,
  SMOKE_MEMBER_PASSWORD,
} from "../constants.js";
import { seedGraphInstances } from "./seed/graph-instances.js";
import { seedInboundChannelFixtures } from "./seed/inbound-channels.js";
import { seedScheduleFixtures } from "./seed/schedules.js";
import { seedBuiltinSkills } from "./seed/builtin-skills.js";
import { seedCommunitySkills } from "./seed/community-skills.js";
import { seedMainDefaultSkillBindings } from "./seed/main-default-skill-bindings.js";
import { seedSwdlSkillsAndBindings } from "./seed/swdl-skills.js";
import { applyTemplate, SOFTWARE_DEV_TEMPLATE } from "../ports/templates.js";
import { ensureAuthUserRow } from "../ensure-auth-user.js";
import { SWDL_AGENT_IDS } from "@ssota/contracts/agents";

loadEnv({ path: "../../.env.local" });
loadEnv({ path: "../../apps/web/.env.local" });
loadEnv();

async function seedConsole(db: ReturnType<typeof createDb>["db"], smokeUserId?: string) {
  if (smokeUserId) {
    await db
      .insert(schema.profiles)
      .values({
        id: smokeUserId,
        email: SMOKE_EMAIL,
        displayName: "Smoke Operator",
        onboardingStep: "completed",
        onboardingCompletedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.profiles.id,
        set: {
          email: SMOKE_EMAIL,
          displayName: "Smoke Operator",
          onboardingStep: "completed",
          onboardingCompletedAt: new Date(),
          updatedAt: new Date(),
        },
      });
  }

  const [org] = await db
    .insert(schema.organizations)
    .values({
      slug: DEFAULT_ORG_SLUG,
      name: "SSOTA Labs",
      ownerUserId: smokeUserId,
    })
    .onConflictDoUpdate({
      target: schema.organizations.slug,
      set: { name: "SSOTA Labs", ownerUserId: smokeUserId },
    })
    .returning();

  let organizationId = org?.id;
  if (!organizationId) {
    const rows = await db
      .select({ id: schema.organizations.id })
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, DEFAULT_ORG_SLUG))
      .limit(1);
    organizationId = rows[0]?.id;
  }
  if (!organizationId) return null;

  const [project] = await db
    .insert(schema.teamspaces)
    .values({
      organizationId,
      slug: DEFAULT_TEAMSPACE_SLUG,
      name: "SSOTA Dev",
      appEnabled: true,
    })
    .onConflictDoNothing()
    .returning();

  let teamspaceId = project?.id;
  if (!teamspaceId) {
    const rows = await db
      .select({ id: schema.teamspaces.id })
      .from(schema.teamspaces)
      .where(eq(schema.teamspaces.slug, DEFAULT_TEAMSPACE_SLUG))
      .limit(1);
    teamspaceId = rows[0]?.id;
  }

  if (teamspaceId) {
    await db
      .update(schema.teamspaces)
      .set({ appEnabled: true })
      .where(eq(schema.teamspaces.id, teamspaceId));
  }

  await db
    .insert(schema.teamspaces)
    .values({
      organizationId,
      slug: "app-disabled",
      name: "App Disabled (E2E)",
      appEnabled: false,
    })
    .onConflictDoNothing();

  if (smokeUserId) {
    await db
      .insert(schema.profiles)
      .values({
        id: smokeUserId,
        email: SMOKE_EMAIL,
        displayName: "Smoke Operator",
        onboardingStep: "completed",
        onboardingCompletedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.profiles.id,
        set: {
          email: SMOKE_EMAIL,
          displayName: "Smoke Operator",
          onboardingStep: "completed",
          onboardingCompletedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    await db
      .insert(schema.organizationMemberships)
      .values({
        organizationId,
        userId: smokeUserId,
        role: "owner",
      })
      .onConflictDoNothing();
  }

  if (teamspaceId) {
    await seedGraphInstances(db, teamspaceId);
    await applyTemplate(db, teamspaceId, SOFTWARE_DEV_TEMPLATE);
    // Platform Console chat (outside Domain Pack): Main config/agent only.
    const { seedTeamspaceMainConfig } = await import(
      "../ports/teamspace-main-config-port.js"
    );
    const { seedMainAgentDefinition } = await import(
      "../ports/agent-definition-port.js"
    );
    await seedTeamspaceMainConfig(db, teamspaceId);
    await seedMainAgentDefinition(db, teamspaceId);
    await seedScheduleFixtures(db, teamspaceId);
    await seedInboundChannelFixtures(db, teamspaceId);

    const deliveryAgentId = SWDL_AGENT_IDS.delivery;
    const orchestratorAgentId = SWDL_AGENT_IDS.orchestrator;

    await db
      .insert(schema.tasks)
      .values({
        teamspaceId,
        agentDefinitionId: deliveryAgentId,
        title: "Archive generic runtime and focus active product on development workflow",
        status: "ready",
        executorType: "Agent",
        assignee: "automation",
        context: { source: "seed" },
        acceptanceCriteria: [
          "Active Drizzle schema keeps the Console v2.7 tables (profiles, organizations, memberships, teamspaces, tasks, accounts, node_catalog, edge_catalog, nodes, edges, pages, agent_definitions, schedules, …).",
          "Generic graph runtime removed from the repo — available in git history only.",
        ],
        idempotencyKey: "seed:archive-generic-runtime",
      })
      .onConflictDoNothing();

    await db
      .insert(schema.tasks)
      .values({
        teamspaceId,
        agentDefinitionId: orchestratorAgentId,
        title: "Configure Cursor Automations for ssota-dev orchestrators",
        status: "ready",
        executorType: "Human",
        assignee: "automation",
        context: { source: "seed", dogfood: true },
        acceptanceCriteria: [
          "Daily, weekly, monthly, and watchdog automations documented.",
          "ssota MCP connected in automation environment.",
        ],
        idempotencyKey: "seed:orchestrator-bootstrap",
      })
      .onConflictDoNothing();
  }

  return { organizationId, teamspaceId };
}

/**
 * `AUTH=local` uses a fixed user id. `profiles.id` FK-references auth.users, so
 * seed that row on Supabase local (docker/postgres/shim.sql only covers plain Postgres).
 */
async function seedLocalAuthUser(db: ReturnType<typeof createDb>["db"]) {
  const userId = process.env.LOCAL_AUTH_USER_ID ?? LOCAL_AUTH_USER_ID;
  const email = process.env.LOCAL_AUTH_USER_EMAIL ?? LOCAL_AUTH_USER_EMAIL;
  await ensureAuthUserRow(db, userId, email);
}

async function seedSmokeUser(
  db: ReturnType<typeof createDb>["db"],
): Promise<string | undefined> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing; skipping smoke auth user");
    return undefined;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing.users.find((user) => user.email === SMOKE_EMAIL);
  if (found) {
    await admin.auth.admin.updateUserById(found.id, { password: SMOKE_PASSWORD });
    return found.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: SMOKE_EMAIL,
    password: SMOKE_PASSWORD,
    email_confirm: true,
    user_metadata: { name: "Smoke Operator" },
  });

  if (error) {
    if (error.code === "email_exists") {
      const rows = await db.execute<{ id: string }>(sql`
        SELECT id::text AS id FROM auth.users WHERE email = ${SMOKE_EMAIL} LIMIT 1
      `);
      const row = rows[0] as { id: string } | undefined;
      return row?.id;
    }
    throw error;
  }
  return data.user?.id;
}

async function seedSmokeMemberUser(
  db: ReturnType<typeof createDb>["db"],
  organizationId: string,
): Promise<string | undefined> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing; skipping member auth user");
    return undefined;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing.users.find((user) => user.email === SMOKE_MEMBER_EMAIL);
  let memberUserId = found?.id;

  if (!memberUserId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: SMOKE_MEMBER_EMAIL,
      password: SMOKE_MEMBER_PASSWORD,
      email_confirm: true,
      user_metadata: { name: "Smoke Member" },
    });

    if (error) {
      if (error.code === "email_exists") {
        const rows = await db.execute<{ id: string }>(sql`
          SELECT id::text AS id FROM auth.users WHERE email = ${SMOKE_MEMBER_EMAIL} LIMIT 1
        `);
        memberUserId = (rows[0] as { id: string } | undefined)?.id;
      } else {
        throw error;
      }
    } else {
      memberUserId = data.user?.id;
    }
  }

  if (!memberUserId) return undefined;

  await db
    .insert(schema.profiles)
    .values({
      id: memberUserId,
      email: SMOKE_MEMBER_EMAIL,
      displayName: "Smoke Member",
      onboardingStep: "completed",
      onboardingCompletedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.profiles.id,
      set: {
        email: SMOKE_MEMBER_EMAIL,
        displayName: "Smoke Member",
        onboardingStep: "completed",
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

  await db
    .insert(schema.organizationMemberships)
    .values({
      organizationId,
      userId: memberUserId,
      role: "member",
    })
    .onConflictDoNothing();

  return memberUserId;
}

async function seedAllProjectCatalogs(db: ReturnType<typeof createDb>["db"]) {
  const projects = await db
    .select({ id: schema.teamspaces.id })
    .from(schema.teamspaces);
  for (const { id } of projects) {
    await applyTemplate(db, id, SOFTWARE_DEV_TEMPLATE);
  }
}

async function seedDefaultSandboxEnvironments(db: ReturnType<typeof createDb>["db"]) {
  const projects = await db
    .select({ id: schema.teamspaces.id })
    .from(schema.teamspaces);
  const { createSandboxEnvironmentPort } = await import("../ports/sandbox-environment-port.js");
  for (const { id: teamspaceId } of projects) {
    const port = createSandboxEnvironmentPort(db, { teamspaceId });
    const existing = await port.getByKey("sandbox.dev_node24");
    if (existing) continue;
    await port.upsertEnvironment({
      key: "sandbox.dev_node24",
      name: "Dev Node 24",
      description: "Default empty Node 24 sandbox for coding agents",
      runtime: "node24",
      workingRoot: "/vercel/sandbox",
    });
  }
}

async function main() {
  const { db, client } = createDb();
  console.log("Seeding local auth user (AUTH=local)...");
  await seedLocalAuthUser(db);
  console.log("Seeding smoke user...");
  const smokeUserId = await seedSmokeUser(db);
  console.log("Seeding active console runtime...");
  const consoleSeed = await seedConsole(db, smokeUserId);
  if (consoleSeed?.organizationId && smokeUserId) {
    console.log("Seeding smoke org member (non-owner)...");
    await seedSmokeMemberUser(db, consoleSeed.organizationId);
  }
  console.log("Backfilling node/edge catalog for all projects...");
  await seedAllProjectCatalogs(db);
  console.log("Seeding platform builtin skills...");
  const builtinCount = await seedBuiltinSkills(db);
  console.log(`Seeded ${builtinCount} builtin skills.`);
  console.log("Seeding community explore catalog...");
  const communityCount = await seedCommunitySkills(db);
  console.log(`Seeded ${communityCount} community skills.`);
  if (consoleSeed?.organizationId && consoleSeed.teamspaceId) {
    console.log("Seeding SWDL domain skill pack + agent bindings...");
    const swdl = await seedSwdlSkillsAndBindings(db, {
      organizationId: consoleSeed.organizationId,
      teamspaceId: consoleSeed.teamspaceId,
    });
    console.log(
      `Seeded ${swdl.skills} SWDL skills; bound ${swdl.bindings} agent skill links.`,
    );
    console.log("Seeding main agent default skill bindings (platform chat)...");
    const boundCount = await seedMainDefaultSkillBindings(db, {
      organizationId: consoleSeed.organizationId,
      teamspaceId: consoleSeed.teamspaceId,
    });
    console.log(`Bound ${boundCount} default skills to main agent.`);
  }
  console.log("Seeding default sandbox environments...");
  await seedDefaultSandboxEnvironments(db);
  console.log("Seed complete.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
