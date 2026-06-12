import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@ssota/ui/components/ui/resizable";

import { InspectorPanel } from "./InspectorPanel";
import { PreviewCanvas } from "./PreviewCanvas";
import { StoryCatalog } from "./StoryCatalog";
import type { StoryCatalogEntry } from "../lib/story-catalog";

type ShellProps = {
  selectedStory: StoryCatalogEntry | null;
  selectedId: string | null;
  onSelectStory: (entry: StoryCatalogEntry) => void;
};

export function Shell({
  selectedStory,
  selectedId,
  onSelectStory,
}: ShellProps) {
  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      <ResizablePanel defaultSize={18} minSize={14} maxSize={28}>
        <StoryCatalog selectedId={selectedId} onSelect={onSelectStory} />
      </ResizablePanel>
      <ResizableHandle className="w-px bg-border" />
      <ResizablePanel defaultSize={58} minSize={40}>
        <PreviewCanvas>
          {selectedStory ? selectedStory.render() : (
            <p className="text-sm text-muted-foreground">
              왼쪽에서 스토리를 선택하세요.
            </p>
          )}
        </PreviewCanvas>
      </ResizablePanel>
      <ResizableHandle className="w-px bg-border" />
      <ResizablePanel defaultSize={24} minSize={18} maxSize={36}>
        <InspectorPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
