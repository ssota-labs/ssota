import { useMemo, useState } from "react";

import { DesignLabProvider, useDesignLab } from "./context/design-lab-context";
import { OverrideStyle } from "./components/OverrideStyle";
import { Shell } from "./components/Shell";
import {
  DEFAULT_STORY_ID,
  STORY_CATALOG,
  type StoryCatalogEntry,
} from "./lib/story-catalog";

function AppHeader() {
  const { isDark, setIsDark } = useDesignLab();

  return (
    <header className="flex h-10 items-center justify-between border-b border-border bg-card px-4">
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

function AppContent() {
  const defaultStory = useMemo(
    () =>
      STORY_CATALOG.find((s) => s.id === DEFAULT_STORY_ID) ??
      STORY_CATALOG[0] ??
      null,
    [],
  );

  const [selectedStory, setSelectedStory] = useState<StoryCatalogEntry | null>(
    defaultStory,
  );

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <div className="flex-1 overflow-hidden">
        <Shell
          selectedStory={selectedStory}
          selectedId={selectedStory?.id ?? null}
          onSelectStory={setSelectedStory}
        />
      </div>
      <OverrideStyle />
    </div>
  );
}

export function App() {
  return (
    <DesignLabProvider>
      <AppContent />
    </DesignLabProvider>
  );
}
