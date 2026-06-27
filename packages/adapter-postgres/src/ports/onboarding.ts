import { toRouteSlug } from "@ssota/core";
import { applyTemplate, getTemplateBundleById } from "./templates.js";
import {
  DEFAULT_LOCALE,
  LOCALES,
  type Locale,
  type OnboardingPort,
  type Organization,
  type Profile,
  type Teamspace,
} from "@ssota/core";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { ensureAuthUserRow } from "../ensure-auth-user.js";

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
    onboardingDraftProjectName: row.onboardingDraftProjectName ?? null,
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

function mapProject(row: typeof schema.teamspaces.$inferSelect): Teamspace {
  return {
    id: row.id,
    organizationId: row.organizationId,
    slug: row.slug,
    name: row.name,
    appEnabled: row.appEnabled,
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
      .select({ id: schema.teamspaces.id })
      .from(schema.teamspaces)
      .where(
        and(
          eq(schema.teamspaces.organizationId, organizationId),
          eq(schema.teamspaces.slug, candidate),
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
        await ensureAuthUserRow(tx as unknown as Db, userId, email);

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
              onboardingDraftProjectName: null,
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

    async saveProjectDraftStep({ userId, projectName }) {
      const now = new Date();
      const updated = await db
        .update(schema.profiles)
        .set({
          onboardingStep: "template",
          onboardingDraftProjectName: projectName.trim(),
          updatedAt: now,
        })
        .where(eq(schema.profiles.id, userId))
        .returning({ id: schema.profiles.id });

      if (!updated[0]) {
        throw new Error("Profile is required before saving a project draft");
      }
    },

    async completeTemplateStep({ userId, templateId }) {
      const bundle = getTemplateBundleById(templateId);
      if (!bundle) {
        throw new Error(`Unknown template: ${templateId}`);
      }

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

        const projectName = profile.onboardingDraftProjectName?.trim();
        if (!projectName) {
          throw new Error("Teamspace name draft is required before choosing a template");
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
          .insert(schema.teamspaces)
          .values({
            organizationId: organization.id,
            slug,
            name: projectName,
          })
          .returning();

        const project = mapProject(projectRow!);
        const now = new Date();

        await tx
          .update(schema.profiles)
          .set({
            onboardingStep: "completed",
            onboardingDraftProjectName: null,
            onboardingCompletedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.profiles.id, userId));

        return { organization, project };
      });

      await applyTemplate(db, result.project.id, bundle);

      return result;
    },
  };
}
