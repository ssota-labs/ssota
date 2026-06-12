import { useEffect, useMemo, useRef, useState } from "react";

import { createBuiltInCatalogItems } from "./components/built-in-previews";
import { OverrideStyle } from "./components/OverrideStyle";
import { Shell } from "./components/Shell";
import { DesignLabProvider, useDesignLab } from "./context/design-lab-context";
import {
  buildCatalogGroups,
  DEFAULT_SELECTION,
  type CatalogSelection,
} from "./lib/catalog-navigation";
import type { DocsCatalogEntry } from "./lib/docs-catalog";
import {
  buildUrlSearchParams,
  parseUrlState,
  type CanvasView,
} from "./lib/url-state";
import type { ComponentDocsMeta, StoryCatalogEntry } from "./lib/story-catalog";

import "./styles/design-lab-docs.css";

export type DesignLabProps = {
  stories: StoryCatalogEntry[];
  docsCatalog: Map<string, DocsCatalogEntry>;
  docsMeta: Map<string, ComponentDocsMeta>;
  defaultSelection?: CatalogSelection;
  visualMode?: boolean;
};

function DesignLabHeader() {
  const { isDark, setIsDark } = useDesignLab();

  return (
    <header className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">
          SSOTA Design Lab
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[0.625rem] text-muted-foreground">
          style-ssota
        </span>
      </div>
      <button
        type="button"
        onClick={() => setIsDark(!isDark)}
        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
      >
        {isDark ? "Light" : "Dark"}
      </button>
    </header>
  );
}

function getInitialState(
  defaultSelection: CatalogSelection,
  visualMode?: boolean,
): {
  selection: CatalogSelection;
  isDark: boolean;
  visualMode: boolean;
  canvasView: CanvasView;
} {
  if (typeof window === "undefined") {
    return {
      selection: defaultSelection,
      isDark: false,
      visualMode: visualMode ?? false,
      canvasView: "preview",
    };
  }

  const parsed = parseUrlState(new URLSearchParams(window.location.search));
  return {
    selection: parsed.selection ?? defaultSelection,
    isDark: parsed.isDark ?? false,
    visualMode: visualMode ?? parsed.visualMode ?? false,
    canvasView: parsed.canvasView ?? "preview",
  };
}

function DesignLabContent({
  stories,
  docsCatalog,
  docsMeta,
  defaultSelection = DEFAULT_SELECTION,
  visualMode: visualModeProp,
}: DesignLabProps) {
  const builtIn = useMemo(() => createBuiltInCatalogItems(), []);
  const groups = useMemo(
    () => buildCatalogGroups(stories, builtIn),
    [stories, builtIn],
  );

  const initial = useMemo(
    () => getInitialState(defaultSelection, visualModeProp),
    [defaultSelection, visualModeProp],
  );

  const [selection, setSelection] = useState<CatalogSelection>(initial.selection);
  const [canvasView, setCanvasView] = useState<CanvasView>(initial.canvasView);
  const { isDark, setIsDark, setVisualMode } = useDesignLab();
  const skipUrlSync = useRef(true);

  useEffect(() => {
    setIsDark(initial.isDark);
    setVisualMode(initial.visualMode);
  }, [initial.isDark, initial.visualMode, setIsDark, setVisualMode]);

  useEffect(() => {
    if (skipUrlSync.current) {
      skipUrlSync.current = false;
      return;
    }
    if (typeof window === "undefined") return;

    const params = buildUrlSearchParams(selection, isDark, { canvasView });
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", next);
  }, [selection, isDark, canvasView]);

  function handleSelect(nextSelection: CatalogSelection) {
    setSelection(nextSelection);
    if (nextSelection.groupId !== "components") {
      setCanvasView("preview");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <DesignLabHeader />
      <div className="min-h-0 flex-1 overflow-hidden">
        <Shell
          groups={groups}
          selection={selection}
          onSelect={handleSelect}
          docsMeta={docsMeta}
          docsCatalog={docsCatalog}
          canvasView={canvasView}
          onCanvasViewChange={setCanvasView}
        />
      </div>
      <OverrideStyle />
    </div>
  );
}

export function DesignLab({
  stories,
  docsCatalog,
  docsMeta,
  defaultSelection,
  visualMode,
}: DesignLabProps) {
  return (
    <DesignLabProvider>
      <DesignLabContent
        stories={stories}
        docsCatalog={docsCatalog}
        docsMeta={docsMeta}
        defaultSelection={defaultSelection}
        visualMode={visualMode}
      />
    </DesignLabProvider>
  );
}
