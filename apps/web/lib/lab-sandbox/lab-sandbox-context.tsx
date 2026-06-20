"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LAB_SANDBOX } from "./default-fixtures";
import type { LabSandboxState } from "./types";

const STORAGE_KEY = "ssota-lab-sandbox-v1";

type LabSandboxContextValue = {
  state: LabSandboxState;
  setState: (next: LabSandboxState) => void;
  reset: () => void;
  selectedPageId: string | null;
  setSelectedPageId: (id: string | null) => void;
};

const LabSandboxContext = createContext<LabSandboxContextValue | null>(null);

function loadInitialState(): LabSandboxState {
  if (typeof window === "undefined") return DEFAULT_LAB_SANDBOX;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAB_SANDBOX;
    return JSON.parse(raw) as LabSandboxState;
  } catch {
    return DEFAULT_LAB_SANDBOX;
  }
}

export function LabSandboxProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: LabSandboxState;
}) {
  const [state, setStateInternal] = useState<LabSandboxState>(
    initialState ?? DEFAULT_LAB_SANDBOX,
  );
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    initialState?.pages[0]?.id ?? DEFAULT_LAB_SANDBOX.pages[0]?.id ?? null,
  );

  useEffect(() => {
    if (initialState) return;
    setStateInternal(loadInitialState());
  }, [initialState]);

  const setState = useCallback((next: LabSandboxState) => {
    setStateInternal(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // quota / private mode
    }
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_LAB_SANDBOX);
    setSelectedPageId(DEFAULT_LAB_SANDBOX.pages[0]?.id ?? null);
  }, [setState]);

  const value = useMemo(
    () => ({
      state,
      setState,
      reset,
      selectedPageId,
      setSelectedPageId,
    }),
    [state, setState, reset, selectedPageId],
  );

  return (
    <LabSandboxContext.Provider value={value}>
      {children}
    </LabSandboxContext.Provider>
  );
}

export function useLabSandbox() {
  const ctx = useContext(LabSandboxContext);
  if (!ctx) {
    throw new Error("useLabSandbox must be used within LabSandboxProvider");
  }
  return ctx;
}
