"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { JsonRenderSpec, TableViewState } from "@ssota/contracts";
import type { UiComponentContentV2 } from "@ssota/contracts/catalog";
import type { BindingContext } from "./types";

export type JsonRenderRuntime = {
  spec: JsonRenderSpec;
  bindingData: BindingContext;
  renderElement: (elementId: string) => ReactNode;
};

export const JsonRenderContext = createContext<JsonRenderRuntime | null>(null);
export const useJsonRender = () => useContext(JsonRenderContext);

/** Invoked when an interactive element fires its action. */
export type OnAction = (
  actionKey: string,
  input: Record<string, unknown>,
) => void | Promise<void>;

export const ActionContext = createContext<OnAction | undefined>(undefined);
export const useAction = () => useContext(ActionContext);

export type FormCtx = {
  values: Record<string, unknown>;
  setValue: (name: string, value: unknown) => void;
};
export const FormValuesContext = createContext<FormCtx | null>(null);
export const useFormValues = () => useContext(FormValuesContext);

/** `/{org}/{project}` prefix for in-page links (e.g. NodeTable rows). */
export const BasePathContext = createContext<string>("");
export const useBasePath = () => useContext(BasePathContext);

/** Triggers a server-side build for an unbuilt buildable Widget node. */
export const WidgetBuildContext = createContext<
  ((nodeId: string) => void | Promise<void>) | undefined
>(undefined);
export const useWidgetBuild = () => useContext(WidgetBuildContext);

/** Artifact workbench runtime (ui_component / page_wireframe pages). */
export type ArtifactWorkbenchRuntime = {
  projectId: string;
  previewBasePath: string;
  onCreateComponent?: () => Promise<string>;
  onDeployComponent?: (input: {
    nodeId: string;
    contentV2: UiComponentContentV2;
  }) => Promise<void>;
};

export const ArtifactWorkbenchContext = createContext<
  ArtifactWorkbenchRuntime | null
>(null);
export const useArtifactWorkbench = () => useContext(ArtifactWorkbenchContext);

/** @deprecated Use {@link ArtifactWorkbenchRuntime}. */
export type ComponentStudioRuntime = ArtifactWorkbenchRuntime;
/** @deprecated Use {@link useArtifactWorkbench}. */
export const ComponentStudioContext = ArtifactWorkbenchContext;
/** @deprecated Use {@link useArtifactWorkbench}. */
export const useComponentStudio = useArtifactWorkbench;

/**
 * Per-user table view-state persistence for the advanced data table. `initial`
 * seeds each table element from its saved state (keyed by spec element id);
 * `save` persists a table's view state. Absent in the lab preview (tables fall
 * back to ephemeral state).
 */
export type PageViewStateRuntime = {
  initial: Record<string, TableViewState>;
  save: (elementId: string, viewState: TableViewState) => void | Promise<void>;
};
export const PageViewStateContext = createContext<PageViewStateRuntime | null>(
  null,
);
export const usePageViewState = () => useContext(PageViewStateContext);
