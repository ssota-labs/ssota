import { z } from "zod";

/**
 * Workspace navigation, stored on a `workspace` graph node and rendered as the
 * console sidebar. Arbitrarily nestable (group/section children may themselves
 * be groups/sections). A link targets either an `href` (existing console route,
 * relative to the project base, e.g. "executive/roadmap") or a `pageNodeId`
 * (future dynamic `/p/{routeKey}` page). `labelKey` is an optional i18n key —
 * the renderer prefers it over the literal `label` when present.
 */

export interface WorkspaceNavSeparator {
  type: "separator";
}

export interface WorkspaceNavLink {
  type: "link";
  key: string;
  label: string;
  labelKey?: string;
  href?: string;
  pageNodeId?: string;
  icon?: string;
}

export interface WorkspaceNavGroup {
  type: "group";
  key: string;
  label: string;
  labelKey?: string;
  children: WorkspaceNavEntry[];
}

export interface WorkspaceNavSection {
  type: "section";
  key: string;
  label: string;
  labelKey?: string;
  children: WorkspaceNavEntry[];
}

export type WorkspaceNavEntry =
  | WorkspaceNavSeparator
  | WorkspaceNavLink
  | WorkspaceNavGroup
  | WorkspaceNavSection;

export const workspaceNavSeparatorSchema = z.object({
  type: z.literal("separator"),
});

export const workspaceNavLinkSchema = z
  .object({
    type: z.literal("link"),
    key: z.string().min(1),
    label: z.string().min(1),
    labelKey: z.string().optional(),
    href: z.string().optional(),
    pageNodeId: z.string().uuid().optional(),
    icon: z.string().optional(),
  })
  .refine((v) => v.href !== undefined || v.pageNodeId !== undefined, {
    message: "nav link requires href or pageNodeId",
  });

export const workspaceNavGroupSchema: z.ZodType<WorkspaceNavGroup> = z.lazy(() =>
  z.object({
    type: z.literal("group"),
    key: z.string().min(1),
    label: z.string().min(1),
    labelKey: z.string().optional(),
    children: z.array(workspaceNavEntrySchema),
  }),
);

export const workspaceNavSectionSchema: z.ZodType<WorkspaceNavSection> = z.lazy(
  () =>
    z.object({
      type: z.literal("section"),
      key: z.string().min(1),
      label: z.string().min(1),
      labelKey: z.string().optional(),
      children: z.array(workspaceNavEntrySchema),
    }),
);

export const workspaceNavEntrySchema: z.ZodType<WorkspaceNavEntry> = z.lazy(() =>
  z.union([
    workspaceNavSeparatorSchema,
    workspaceNavLinkSchema,
    workspaceNavGroupSchema,
    workspaceNavSectionSchema,
  ]),
);

export const workspaceDefinitionSchema = z.object({
  nav: z.array(workspaceNavEntrySchema).default([]),
  navInitiative: z.array(workspaceNavEntrySchema).optional(),
});

export type WorkspaceDefinition = z.infer<typeof workspaceDefinitionSchema>;
