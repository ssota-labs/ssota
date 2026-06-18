import { z } from "zod";

export const workspaceNavLinkSchema = z.object({
  type: z.literal("link"),
  key: z.string().min(1),
  label: z.string().min(1),
  pageNodeId: z.string().uuid(),
  icon: z.string().optional(),
});

export const workspaceNavGroupSchema: z.ZodType<{
  type: "group";
  key: string;
  label: string;
  children: WorkspaceNavLink[];
}> = z.lazy(() =>
  z.object({
    type: z.literal("group"),
    key: z.string().min(1),
    label: z.string().min(1),
    children: z.array(workspaceNavLinkSchema),
  }),
);

export const workspaceNavSectionSchema: z.ZodType<{
  type: "section";
  key: string;
  label: string;
  children: (WorkspaceNavLink | WorkspaceNavGroup)[];
}> = z.lazy(() =>
  z.object({
    type: z.literal("section"),
    key: z.string().min(1),
    label: z.string().min(1),
    children: z.array(
      z.union([workspaceNavLinkSchema, workspaceNavGroupSchema]),
    ),
  }),
);

export const workspaceNavSeparatorSchema = z.object({
  type: z.literal("separator"),
});

export const workspaceNavEntrySchema = z.union([
  workspaceNavSeparatorSchema,
  workspaceNavLinkSchema,
  workspaceNavGroupSchema,
  workspaceNavSectionSchema,
]);

export const workspaceDefinitionSchema = z.object({
  nav: z.array(workspaceNavEntrySchema).default([]),
  navInitiative: z.array(workspaceNavEntrySchema).optional(),
});

export type WorkspaceNavLink = z.infer<typeof workspaceNavLinkSchema>;
export type WorkspaceNavGroup = z.infer<typeof workspaceNavGroupSchema>;
export type WorkspaceNavSection = z.infer<typeof workspaceNavSectionSchema>;
export type WorkspaceNavEntry = z.infer<typeof workspaceNavEntrySchema>;
export type WorkspaceDefinition = z.infer<typeof workspaceDefinitionSchema>;
