import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  onboardingStep: text("onboarding_step").notNull().default("profile"),
  onboardingDraftProjectName: text("onboarding_draft_project_name"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", {
    withTimezone: true,
  }),
  locale: text("locale").notNull().default("en"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  ownerUserId: uuid("owner_user_id").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const teamspaces = pgTable(
  "teamspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    appEnabled: boolean("app_enabled").notNull().default(false),
    mainInstructions: jsonb("main_instructions")
      .notNull()
      .default([])
      .$type<unknown[]>(),
    mainToolBundles: jsonb("main_tool_bundles")
      .notNull()
      .default([])
      .$type<string[]>(),
    mainRunPolicy: jsonb("main_run_policy")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgSlugUnique: uniqueIndex("teamspaces_org_slug_unique").on(
      table.organizationId,
      table.slug,
    ),
  }),
);


/** @deprecated Use `teamspaces` — alias for transitional imports. */
export const projects = teamspaces;

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgUserUnique: uniqueIndex("organization_memberships_org_user_unique").on(
      table.organizationId,
      table.userId,
    ),
  }),
);

export const organizationInvitations = pgTable(
  "organization_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    inviterUserId: uuid("inviter_user_id")
      .notNull()
      .references(() => profiles.id),
    inviteeEmail: text("invitee_email").notNull(),
    inviteeUserId: uuid("invitee_user_id").references(() => profiles.id),
    role: text("role").notNull().default("member"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdIdx: index("organization_invitations_organization_id_idx").on(
      table.organizationId,
    ),
  }),
);

export const organizationBilling = pgTable("organization_billing", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: text("plan").notNull().default("none"),
  status: text("status").notNull().default("none"),
  seatQuantity: integer("seat_quantity").notNull().default(1),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  eventId: text("event_id").primaryKey(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});


/**
 * End-user data partition within a deployed tenant SaaS (Phase 5). A Teamspace is
 * the builder's agent-SaaS definition; accounts are the isolated spaces
 * SSOTA-naive end users work in. Instance rows carry `account_id` (null =
 * shared/builder). No recursive org/project for end users — sub-structure is
 * expressed via the builder's node catalog.
 */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamspaceId: uuid("teamspace_id")
      .notNull()
      .references(() => teamspaces.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    ownerUserId: uuid("owner_user_id").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectSlugUnique: uniqueIndex("accounts_project_slug_unique").on(
      table.teamspaceId,
      table.slug,
    ),
    projectIdx: index("accounts_project_id_idx").on(table.teamspaceId),
  }),
);

export const accountMemberships = pgTable(
  "account_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    accountUserUnique: uniqueIndex("account_memberships_account_user_unique").on(
      table.accountId,
      table.userId,
    ),
  }),
);


export const betaSignups = pgTable(
  "beta_signups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    source: text("source").notNull().default("landing"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex("beta_signups_email_unique").on(table.email),
    statusIdx: index("beta_signups_status_idx").on(table.status),
  }),
);

