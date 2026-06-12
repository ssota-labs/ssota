import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { InspectorPanel } from "./InspectorPanel";
import { PreviewCanvas } from "./PreviewCanvas";
import { StoryCatalog } from "./StoryCatalog";
import type { StoryCatalogEntry } from "../lib/story-catalog";

type ShellProps = {
  stories: StoryCatalogEntry[];
  selectedStory: StoryCatalogEntry | null;
  selectedId: string | null;
  onSelectStory: (entry: StoryCatalogEntry) => void;
};

export function Shell({
  stories,
  selectedStory,
  selectedId,
  onSelectStory,
}: ShellProps) {
  return (
    <ResizablePanelGroup
      id="design-lab-shell"
      orientation="horizontal"
      className="h-full min-h-0"
      defaultLayout={{ catalog: 18, canvas: 58, inspector: 24 }}
    >
      <ResizablePanel
        id="catalog"
        defaultSize="18%"
        minSize="14%"
        maxSize="28%"
        className="min-h-0"
      >
        <StoryCatalog
          stories={stories}
          selectedId={selectedId}
          onSelect={onSelectStory}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        id="canvas"
        defaultSize="58%"
        minSize="35%"
        className="min-h-0"
      >
        <PreviewCanvas>
          {selectedStory ? selectedStory.render() : (
            <p className="text-sm text-muted-foreground">
              왼쪽에서 스토리를 선택하세요.
            </p>
          )}
        </PreviewCanvas>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        id="inspector"
        defaultSize="24%"
        minSize="18%"
        maxSize="36%"
        className="min-h-0"
      >
        <InspectorPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
