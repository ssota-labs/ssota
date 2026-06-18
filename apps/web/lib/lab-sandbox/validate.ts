import { pageRuntimeDefinitionSchema, workspaceDefinitionSchema } from "@ssota/contracts";
import { z } from "zod";
import type { LabSandboxState } from "./types";

const nodeCatalogSchema = z.array(
  z.object({
    id: z.string().uuid(),
    key: z.string().min(1),
    label: z.string().min(1),
    propertySchema: z.record(z.unknown()).optional(),
  }),
);

const edgeCatalogSchema = z.array(
  z.object({
    id: z.string().uuid(),
    key: z.string().min(1),
    label: z.string().min(1),
    domainCatalogIds: z.array(z.string().uuid()),
    rangeCatalogIds: z.array(z.string().uuid()),
  }),
);

const nodesSchema = z.array(
  z.object({
    id: z.string().uuid(),
    catalogKey: z.string().min(1),
    title: z.string(),
    properties: z.record(z.unknown()),
  }),
);

const pagesSchema = z.array(
  z.object({
    id: z.string().uuid(),
    pageKey: z.string().min(1),
    title: z.string(),
    definition: pageRuntimeDefinitionSchema,
  }),
);

const workspaceSeedSchema = z.object({
  nav: z.array(z.unknown()),
});

export type LabValidateMode =
  | "node-catalog"
  | "edge-catalog"
  | "nodes"
  | "pages"
  | "workspace"
  | "page-definition"
  | "workspace-runtime";

export function validateLabJson(mode: LabValidateMode, json: string): string | null {
  try {
    const data = JSON.parse(json) as unknown;
    switch (mode) {
      case "node-catalog":
        nodeCatalogSchema.parse(data);
        break;
      case "edge-catalog":
        edgeCatalogSchema.parse(data);
        break;
      case "nodes":
        nodesSchema.parse(data);
        break;
      case "pages":
        pagesSchema.parse(data);
        break;
      case "workspace":
        workspaceSeedSchema.parse(data);
        break;
      case "page-definition":
        pageRuntimeDefinitionSchema.parse(data);
        break;
      case "workspace-runtime":
        workspaceDefinitionSchema.parse(data);
        break;
    }
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Invalid JSON";
  }
}

export function parseLabState(json: string): LabSandboxState | string {
  try {
    return z
      .object({
        nodeCatalog: nodeCatalogSchema,
        edgeCatalog: edgeCatalogSchema,
        nodes: nodesSchema,
        edges: z.array(z.unknown()).default([]),
        pages: pagesSchema,
        workspace: workspaceSeedSchema,
      })
      .parse(JSON.parse(json)) as LabSandboxState;
  } catch (err) {
    return err instanceof Error ? err.message : "Invalid fixture bundle";
  }
}
