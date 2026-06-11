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
    personalOrganizationId: row.personalOrganizationId,
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

    async completeProfileStep({ userId, email, displayName, workspaceName }) {
      return db.transaction(async (tx) => {
        const existingProfile = await tx
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.id, userId))
          .limit(1);

        let organizationId = existingProfile[0]?.personalOrganizationId ?? null;
        let organization: Organization | null = null;

        if (organizationId) {
          const orgRows = await tx
            .select()
            .from(schema.organizations)
            .where(eq(schema.organizations.id, organizationId))
            .limit(1);
          organization = orgRows[0] ? mapOrganization(orgRows[0]) : null;
        }

        if (!organization) {
          const ownedOrg = await tx
            .select()
            .from(schema.organizations)
            .where(eq(schema.organizations.ownerUserId, userId))
            .limit(1);

          if (ownedOrg[0]) {
            organization = mapOrganization(ownedOrg[0]);
            organizationId = organization.id;
          } else {
            const slug = await allocateUniqueOrgSlug(tx as unknown as Db, workspaceName);
            const [inserted] = await tx
              .insert(schema.organizations)
              .values({
                slug,
                name: workspaceName.trim(),
                ownerUserId: userId,
              })
              .returning();
            organization = mapOrganization(inserted!);
            organizationId = organization.id;

            await tx.insert(schema.organizationMemberships).values({
              organizationId: organizationId!,
              userId,
              role: "owner",
            });
          }
        } else {
          await tx
            .update(schema.organizations)
            .set({ name: workspaceName.trim() })
            .where(eq(schema.organizations.id, organization.id));
          organization = { ...organization, name: workspaceName.trim() };
        }

        const now = new Date();
        if (existingProfile[0]) {
          await tx
            .update(schema.profiles)
            .set({
              email,
              displayName: displayName.trim(),
              personalOrganizationId: organizationId,
              onboardingStep: "project",
              updatedAt: now,
            })
            .where(eq(schema.profiles.id, userId));
        } else {
          await tx.insert(schema.profiles).values({
            id: userId,
            email,
            displayName: displayName.trim(),
            personalOrganizationId: organizationId,
            onboardingStep: "project",
          });
        }

        return { organization };
      });
    },

    async completeProjectStep({ userId, projectName }) {
      return db.transaction(async (tx) => {
        const profileRows = await tx
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.id, userId))
          .limit(1);
        const profile = profileRows[0];
        if (!profile?.personalOrganizationId) {
          throw new Error("Personal organization is required before creating a project");
        }

        const orgRows = await tx
          .select()
          .from(schema.organizations)
          .where(eq(schema.organizations.id, profile.personalOrganizationId))
          .limit(1);
        const orgRow = orgRows[0];
        if (!orgRow) {
          throw new Error("Personal organization not found");
        }

        const organization = mapOrganization(orgRow);
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
          .insert(schema.userProjectPreferences)
          .values({
            userId,
            orgSlug: organization.slug,
            projectSlug: project.slug,
          })
          .onConflictDoUpdate({
            target: schema.userProjectPreferences.userId,
            set: {
              orgSlug: organization.slug,
              projectSlug: project.slug,
              updatedAt: now,
            },
          });

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
    },
  };
}
