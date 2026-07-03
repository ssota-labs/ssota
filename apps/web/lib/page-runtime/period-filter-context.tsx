"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parsePeriodPreset, type PeriodRange } from "./period-preset";

export type PeriodFilterRuntime = {
  period: string | null;
  range: PeriodRange | null;
  setPeriod: (period: string | null) => void;
  param: string;
};

const PeriodFilterContext = createContext<PeriodFilterRuntime | null>(null);

export function usePeriodFilter(): PeriodFilterRuntime {
  const ctx = useContext(PeriodFilterContext);
  if (!ctx) {
    return {
      period: null,
      range: null,
      setPeriod: () => {},
      param: "period",
    };
  }
  return ctx;
}

export function PeriodFilterProvider({
  children,
  param = "period",
}: {
  children: ReactNode;
  param?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = searchParams.get(param);

  const range = useMemo(
    () => (period ? parsePeriodPreset(period) : null),
    [period],
  );

  const setPeriod = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) {
        params.set(param, next);
      } else {
        params.delete(param);
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [param, router, searchParams],
  );

  const value = useMemo<PeriodFilterRuntime>(
    () => ({
      period,
      range,
      setPeriod,
      param,
    }),
    [param, period, range, setPeriod],
  );

  return (
    <PeriodFilterContext.Provider value={value}>
      {children}
    </PeriodFilterContext.Provider>
  );
}
