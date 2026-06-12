import { useMemo, useState } from "react";

import { OverrideStyle } from "./components/OverrideStyle";
import { Shell } from "./components/Shell";
import { DesignLabProvider, useDesignLab } from "./context/design-lab-context";
import {
  DEFAULT_STORY_ID,
  type StoryCatalogEntry,
} from "./lib/story-catalog";

export type DesignLabProps = {
  stories: StoryCatalogEntry[];
  defaultStoryId?: string;
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
  defaultStoryId = DEFAULT_STORY_ID,
}: DesignLabProps) {
  const defaultStory = useMemo(
    () =>
      stories.find((s) => s.id === defaultStoryId) ?? stories[0] ?? null,
    [stories, defaultStoryId],
  );

  const [selectedStory, setSelectedStory] = useState<StoryCatalogEntry | null>(
    defaultStory,
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <DesignLabHeader />
      <div className="min-h-0 flex-1 overflow-hidden">
        <Shell
          stories={stories}
          selectedStory={selectedStory}
          selectedId={selectedStory?.id ?? null}
          onSelectStory={setSelectedStory}
        />
      </div>
      <OverrideStyle />
    </div>
  );
}

export function DesignLab({ stories, defaultStoryId }: DesignLabProps) {
  return (
    <DesignLabProvider>
      <DesignLabContent stories={stories} defaultStoryId={defaultStoryId} />
    </DesignLabProvider>
  );
}
