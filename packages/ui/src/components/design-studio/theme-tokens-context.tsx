"use client";

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  tokensToThemeCss,
  type DesignThemeTokenMap,
} from "@ssota/contracts/catalog";

const INSPECTOR_THEME_SCOPE_CLASS = "studio-inspector-theme";

type ThemeTokensContextValue = {
  tokens: DesignThemeTokenMap;
  scopeClassName: string;
  scopeRef: RefObject<HTMLDivElement | null>;
  scopeElement: HTMLDivElement | null;
};

const ThemeTokensContext = createContext<ThemeTokensContextValue | null>(null);

type ThemeTokensProviderProps = {
  tokens: DesignThemeTokenMap;
  children: ReactNode;
};

export function ThemeTokensProvider({
  tokens,
  children,
}: ThemeTokensProviderProps) {
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const [scopeElement, setScopeElement] = useState<HTMLDivElement | null>(null);
  const themeCss = useMemo(() => tokensToThemeCss(tokens), [tokens]);

  const setScopeNode = useCallback((node: HTMLDivElement | null) => {
    scopeRef.current = node;
    setScopeElement(node);
  }, []);

  const value = useMemo(
    () => ({
      tokens,
      scopeClassName: INSPECTOR_THEME_SCOPE_CLASS,
      scopeRef,
      scopeElement,
    }),
    [tokens, scopeElement],
  );

  return (
    <ThemeTokensContext value={value}>
      {themeCss ? (
        <style
          dangerouslySetInnerHTML={{
            __html: `.${INSPECTOR_THEME_SCOPE_CLASS} {\n${themeCss}\n}`,
          }}
        />
      ) : null}
      <div ref={setScopeNode} className={INSPECTOR_THEME_SCOPE_CLASS}>
        {children}
      </div>
    </ThemeTokensContext>
  );
}

export function useThemeTokens(): DesignThemeTokenMap | null {
  return use(ThemeTokensContext)?.tokens ?? null;
}

export function useThemeTokensContext(): ThemeTokensContextValue | null {
  return use(ThemeTokensContext);
}
