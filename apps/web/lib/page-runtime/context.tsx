"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { JsonRenderSpec } from "@ssota/contracts";
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
