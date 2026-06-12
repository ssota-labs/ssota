import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { DesignCatalog } from "./DesignCatalog";
import { InspectorPanel } from "./InspectorPanel";
import { PreviewFrame } from "./PreviewFrame";
import type { CatalogGroup, CatalogSelection } from "../lib/catalog-navigation";
import { findCatalogItem } from "../lib/catalog-navigation";
import type { DocsCatalogEntry } from "../lib/docs-catalog";
import type { CanvasView } from "../lib/url-state";
import type { ComponentDocsMeta } from "../lib/story-catalog";

type ShellProps = {
  groups: CatalogGroup[];
  selection: CatalogSelection;
  onSelect: (selection: CatalogSelection) => void;
  docsMeta: Map<string, ComponentDocsMeta>;
  docsCatalog: Map<string, DocsCatalogEntry>;
  canvasView: CanvasView;
  onCanvasViewChange: (view: CanvasView) => void;
};

export function Shell({
  groups,
  selection,
  onSelect,
  docsMeta,
  docsCatalog,
  canvasView,
  onCanvasViewChange,
}: ShellProps) {
  const selectedItem = findCatalogItem(
    groups,
    selection.groupId,
    selection.itemId,
  );

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
        <DesignCatalog
          groups={groups}
          selection={selection}
          onSelect={onSelect}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        id="canvas"
        defaultSize="58%"
        minSize="35%"
        className="min-h-0"
      >
        <PreviewFrame
          item={selectedItem ?? null}
          variantId={selection.variantId}
          onSelectVariant={(variantId) =>
            onSelect({ ...selection, variantId })
          }
          canvasView={canvasView}
          onCanvasViewChange={onCanvasViewChange}
          docsMeta={docsMeta}
          docsCatalog={docsCatalog}
        />
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
