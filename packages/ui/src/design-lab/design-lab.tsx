import { useMemo, useState } from "react";

import { createBuiltInCatalogItems } from "./components/built-in-previews";
import { OverrideStyle } from "./components/OverrideStyle";
import { Shell } from "./components/Shell";
import { DesignLabProvider, useDesignLab } from "./context/design-lab-context";
import {
  buildCatalogGroups,
  DEFAULT_SELECTION,
  type CatalogSelection,
} from "./lib/catalog-navigation";
import type { StoryCatalogEntry } from "./lib/story-catalog";

export type DesignLabProps = {
  stories: StoryCatalogEntry[];
  defaultSelection?: CatalogSelection;
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

function DesignLabContent({
  stories,
  defaultSelection = DEFAULT_SELECTION,
}: DesignLabProps) {
  const builtIn = useMemo(() => createBuiltInCatalogItems(), []);
  const groups = useMemo(
    () => buildCatalogGroups(stories, builtIn),
    [stories, builtIn],
  );

  const [selection, setSelection] =
    useState<CatalogSelection>(defaultSelection);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <DesignLabHeader />
      <div className="min-h-0 flex-1 overflow-hidden">
        <Shell
          groups={groups}
          selection={selection}
          onSelect={setSelection}
        />
      </div>
      <OverrideStyle />
    </div>
  );
}

export function DesignLab({ stories, defaultSelection }: DesignLabProps) {
  return (
    <DesignLabProvider>
      <DesignLabContent
        stories={stories}
        defaultSelection={defaultSelection}
      />
    </DesignLabProvider>
  );
}
