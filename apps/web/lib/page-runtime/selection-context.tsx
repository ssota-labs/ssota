"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { BindingDef } from "@ssota/contracts";

export type UrlSelectionConfig = {
  bindingKey: string;
  param: string;
  catalogKey: string;
};

export type SelectionRuntime = {
  /** Active row id from the resolved `url_selection` binding (null when unset). */
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  param: string;
};

const SelectionContext = createContext<SelectionRuntime | null>(null);

export function useSelection() {
  return useContext(SelectionContext);
}

export function extractUrlSelectionBindings(
  bindings: Record<string, BindingDef>,
): UrlSelectionConfig[] {
  return Object.entries(bindings).flatMap(([bindingKey, def]) =>
    def.kind === "url_selection"
      ? [
          {
            bindingKey,
            param: def.param,
            catalogKey: def.catalogKey,
          },
        ]
      : [],
  );
}

function readSelectedId(
  bindingData: Record<string, unknown>,
  config: UrlSelectionConfig | undefined,
): string | null {
  if (!config) return null;
  const value = bindingData[config.bindingKey];
  if (value && typeof value === "object" && "id" in value) {
    return String((value as { id: string }).id);
  }
  return null;
}

export function SelectionProvider({
  children,
  config,
  bindingData,
}: {
  children: ReactNode;
  config: UrlSelectionConfig | null;
  bindingData: Record<string, unknown>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = useMemo(
    () => readSelectedId(bindingData, config ?? undefined),
    [bindingData, config],
  );

  const setSelectedId = useCallback(
    (id: string | null) => {
      if (!config) return;
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set(config.param, id);
      } else {
        params.delete(config.param);
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [config, router, searchParams],
  );

  const value = useMemo<SelectionRuntime | null>(
    () =>
      config
        ? {
            selectedId,
            setSelectedId,
            param: config.param,
          }
        : null,
    [config, selectedId, setSelectedId],
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}
