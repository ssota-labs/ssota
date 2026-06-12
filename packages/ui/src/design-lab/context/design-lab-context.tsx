import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  buildExportCss,
  buildOverrideCss,
  type ThemeOverrides,
  type TokenOverrides,
} from "../lib/override-engine";
import type { ResolvedSelection } from "../lib/token-resolver";

type DesignLabContextValue = {
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  tokenOverrides: TokenOverrides;
  themeOverrides: ThemeOverrides;
  setTokenOverride: (
    className: string,
    property: string,
    value: string,
  ) => void;
  setThemeOverride: (name: string, value: string) => void;
  resetOverrides: () => void;
  overrideCss: string;
  exportCss: string;
  selection: ResolvedSelection | null;
  setSelection: (selection: ResolvedSelection | null) => void;
};

const DesignLabContext = createContext<DesignLabContextValue | null>(null);

export function DesignLabProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [tokenOverrides, setTokenOverrides] = useState<TokenOverrides>({});
  const [themeOverrides, setThemeOverrides] = useState<ThemeOverrides>({});
  const [selection, setSelection] = useState<ResolvedSelection | null>(null);

  const setTokenOverride = useCallback(
    (className: string, property: string, value: string) => {
      setTokenOverrides((prev) => ({
        ...prev,
        [className]: {
          ...prev[className],
          [property]: value,
        },
      }));
    },
    [],
  );

  const setThemeOverride = useCallback((name: string, value: string) => {
    setThemeOverrides((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const resetOverrides = useCallback(() => {
    setTokenOverrides({});
    setThemeOverrides({});
  }, []);

  const overrideCss = useMemo(
    () => buildOverrideCss(tokenOverrides, themeOverrides),
    [tokenOverrides, themeOverrides],
  );

  const exportCss = useMemo(
    () => buildExportCss(tokenOverrides, themeOverrides),
    [tokenOverrides, themeOverrides],
  );

  const value = useMemo(
    () => ({
      isDark,
      setIsDark,
      tokenOverrides,
      themeOverrides,
      setTokenOverride,
      setThemeOverride,
      resetOverrides,
      overrideCss,
      exportCss,
      selection,
      setSelection,
    }),
    [
      isDark,
      tokenOverrides,
      themeOverrides,
      setTokenOverride,
      setThemeOverride,
      resetOverrides,
      overrideCss,
      exportCss,
      selection,
    ],
  );

  return (
    <DesignLabContext value={value}>{children}</DesignLabContext>
  );
}

export function useDesignLab(): DesignLabContextValue {
  const ctx = use(DesignLabContext);
  if (!ctx) {
    throw new Error("useDesignLab must be used within DesignLabProvider");
  }
  return ctx;
}
