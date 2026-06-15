import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { createDb } from "../db/client.js";
import * as schema from "../db/schema.js";
import {
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
} from "../constants.js";
import { seedGraphInstances } from "./seed/graph-instances.js";

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
    .insert(schema.projects)
    .values({
      organizationId,
      slug: DEFAULT_PROJECT_SLUG,
      name: "SSOTA Dev",
    })
    .onConflictDoNothing()
    .returning();

  let projectId = project?.id;
  if (!projectId) {
    const rows = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(eq(schema.projects.slug, DEFAULT_PROJECT_SLUG))
      .limit(1);
    projectId = rows[0]?.id;
  }

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

  if (projectId) {
    await db
      .insert(schema.tasks)
      .values({
        projectId,
        workflowKey: "work.implement_feature",
        title: "Archive generic runtime and focus active product on development workflow",
        status: "ready",
        executorType: "Agent",
        assignee: "automation",
        context: { source: "seed" },
        acceptanceCriteria: [
          "Active Drizzle schema keeps only profiles, organizations, memberships, projects, tasks, nodes, and edges.",
          "Generic graph runtime files live under archive/generic-runtime.",
        ],
        idempotencyKey: "seed:archive-generic-runtime",
      })
      .onConflictDoNothing();

    await db
      .insert(schema.tasks)
      .values({
        projectId,
        workflowKey: "orchestrator.bootstrap",
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

    await seedGraphInstances(db, projectId);
  }

  return { organizationId, projectId };
}

async function seedSmokeUser(): Promise<string | undefined> {
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
  if (found) return found.id;

  const { data, error } = await admin.auth.admin.createUser({
    email: SMOKE_EMAIL,
    password: SMOKE_PASSWORD,
    email_confirm: true,
    user_metadata: { name: "Smoke Operator" },
  });

  if (error) throw error;
  return data.user?.id;
}

async function main() {
  const { db, client } = createDb();
  console.log("Seeding smoke user...");
  const smokeUserId = await seedSmokeUser();
  console.log("Seeding active console runtime...");
  await seedConsole(db, smokeUserId);
  console.log("Seed complete.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
