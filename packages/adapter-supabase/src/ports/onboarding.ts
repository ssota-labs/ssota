import { toRouteSlug } from "@ssota/core";
import {
  DEFAULT_LOCALE,
  LOCALES,
  type Locale,
  type OnboardingPort,
  type Organization,
  type Profile,
  type Project,
} from "@ssota/core";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { seedDomainCatalog } from "./db-catalog-read-port.js";
import { seedWorkflows } from "./workflow-port.js";
import { seedPages } from "./page-port.js";

function parseLocale(value: string | null | undefined): Locale {
  if (value && (LOCALES as readonly string[]).includes(value)) {
    return value as Locale;
  }
  return DEFAULT_LOCALE;
}

function mapProfile(row: typeof schema.profiles.$inferSelect): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    onboardingStep: row.onboardingStep as Profile["onboardingStep"],
    onboardingCompletedAt: row.onboardingCompletedAt,
    locale: parseLocale(row.locale),
  };
}

function mapOrganization(row: typeof schema.organizations.$inferSelect): Organization {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
  };
}

function mapProject(row: typeof schema.projects.$inferSelect): Project {
  return {
    id: row.id,
    organizationId: row.organizationId,
    slug: row.slug,
    name: row.name,
  };
}

async function allocateUniqueOrgSlug(db: Db, baseName: string): Promise<string> {
  const base = toRouteSlug(baseName);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await db
      .select({ id: schema.organizations.id })
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, candidate))
      .limit(1);
    if (!existing[0]) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function allocateUniqueProjectSlug(
  db: Db,
  organizationId: string,
  baseName: string,
): Promise<string> {
  const base = toRouteSlug(baseName);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.organizationId, organizationId),
          eq(schema.projects.slug, candidate),
        ),
      )
      .limit(1);
    if (!existing[0]) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function getPersonalOrganization(
  tx: Parameters<Parameters<Db["transaction"]>[0]>[0],
  userId: string,
): Promise<Organization | null> {
  const orgRows = await tx
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.ownerUserId, userId))
    .limit(1);
  return orgRows[0] ? mapOrganization(orgRows[0]) : null;
}

export function createOnboardingPort(db: Db): OnboardingPort {
  return {
    async getProfile(userId) {
      const rows = await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, userId))
        .limit(1);
      const row = rows[0];
      return row ? mapProfile(row) : null;
    },

    async updateLocale(userId, locale) {
      const now = new Date();
      await db
        .update(schema.profiles)
        .set({ locale, updatedAt: now })
        .where(eq(schema.profiles.id, userId));
    },

    async completeProfileStep({ userId, email, displayName, organizationName }) {
      return db.transaction(async (tx) => {
        const existingProfile = await tx
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.id, userId))
          .limit(1);

        const now = new Date();
        if (existingProfile[0]) {
          await tx
            .update(schema.profiles)
            .set({
              email,
              displayName: displayName.trim(),
              onboardingStep: "project",
              updatedAt: now,
            })
            .where(eq(schema.profiles.id, userId));
        } else {
          await tx.insert(schema.profiles).values({
            id: userId,
            email,
            displayName: displayName.trim(),
            onboardingStep: "project",
          });
        }

        let organization = await getPersonalOrganization(tx, userId);

        if (organization) {
          await tx
            .update(schema.organizations)
            .set({ name: organizationName.trim() })
            .where(eq(schema.organizations.id, organization.id));
          organization = { ...organization, name: organizationName.trim() };
        } else {
          const slug = await allocateUniqueOrgSlug(tx as unknown as Db, organizationName);
          const [inserted] = await tx
            .insert(schema.organizations)
            .values({
              slug,
              name: organizationName.trim(),
              ownerUserId: userId,
            })
            .returning();
          organization = mapOrganization(inserted!);

          await tx.insert(schema.organizationMemberships).values({
            organizationId: organization.id,
            userId,
            role: "owner",
          });
        }

        return { organization };
      });
    },

    async completeProjectStep({ userId, projectName }) {
      const result = await db.transaction(async (tx) => {
        const profileRows = await tx
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.id, userId))
          .limit(1);
        const profile = profileRows[0];
        if (!profile) {
          throw new Error("Profile is required before creating a project");
        }

        const organization = await getPersonalOrganization(tx, userId);
        if (!organization) {
          throw new Error("Personal organization is required before creating a project");
        }

        const slug = await allocateUniqueProjectSlug(
          tx as unknown as Db,
          organization.id,
          projectName,
        );

        const [projectRow] = await tx
          .insert(schema.projects)
          .values({
            organizationId: organization.id,
            slug,
            name: projectName.trim(),
          })
          .returning();

        const project = mapProject(projectRow!);
        const now = new Date();

        await tx
          .update(schema.profiles)
          .set({
            onboardingStep: "completed",
            onboardingCompletedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.profiles.id, userId));

        return { organization, project };
      });

      await seedDomainCatalog(db, result.project.id);
      // Workflows are a core, domain-agnostic concept — bootstrap-seed alongside
      // the catalog.
      await seedWorkflows(db, result.project.id);
      // Notion-style page tree (pages table) — the sole page system.
      await seedPages(db, result.project.id);

      return result;
    },
  };
}
