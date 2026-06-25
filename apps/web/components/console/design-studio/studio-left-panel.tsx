"use client";

import { useState } from "react";
import type { UiComponentLayerIndexNode } from "@ssota/contracts/catalog";
import { PlusIcon } from "@phosphor-icons/react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ssota/ui/components/ui/tabs";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import type { UiComponentListRow } from "@/lib/graph/loaders/query-ui-components";
import { ComponentsPanel } from "./components-panel";
import { SourceLayersPanel } from "./layers-panel";

type StudioLeftPanelProps = {
  mode?: "authoring" | "preview";
  components: UiComponentListRow[];
  activeComponentId: string | null;
  onSelectComponent: (componentId: string) => void;
  sourceLayers: UiComponentLayerIndexNode[] | null;
  selectedLayerId: string | null;
  onSelectLayer: (nodeId: string) => void;
  pending?: boolean;
  onCreateComponent: () => Promise<void> | void;
};

export function StudioLeftPanel({
  mode = "authoring",
  components,
  activeComponentId,
  onSelectComponent,
  sourceLayers,
  selectedLayerId,
  onSelectLayer,
  pending = false,
  onCreateComponent,
}: StudioLeftPanelProps) {
  const isPreview = mode === "preview";
  const layersEnabled = Boolean(sourceLayers?.length) && !isPreview;
  const [searchQuery, setSearchQuery] = useState("");

  if (isPreview) {
    return (
      <div className="flex h-full min-h-0 flex-col border-r bg-card">
        <div className="shrink-0 border-b p-2">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            placeholder="Search wireframes..."
            className="h-8"
            aria-label="Search wireframes"
          />
        </div>
        <ComponentsPanel
          components={components}
          activeComponentId={activeComponentId}
          onSelectComponent={onSelectComponent}
          searchQuery={searchQuery}
          variant="flat"
          emptyMessage="No wireframes scoped to this initiative."
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-r bg-card">
      <Tabs defaultValue="components" className="flex h-full min-h-0 flex-col">
        <TabsList
          variant="line"
          className="h-10 w-full shrink-0 justify-start rounded-none border-b bg-transparent px-2"
        >
          <TabsTrigger value="components" className="flex-1 text-xs">
            Components
          </TabsTrigger>
          <TabsTrigger
            value="layers"
            className="flex-1 text-xs"
            disabled={!layersEnabled}
          >
            Layers
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="components"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="shrink-0 space-y-2 border-b p-2">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
              placeholder="Search components..."
              className="h-8"
              aria-label="Search components"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full"
              disabled={pending}
              onClick={() => void onCreateComponent()}
            >
              <PlusIcon className="size-3.5" />
              {pending ? "Creating…" : "New component"}
            </Button>
          </div>
          <ComponentsPanel
            components={components}
            activeComponentId={activeComponentId}
            onSelectComponent={onSelectComponent}
            searchQuery={searchQuery}
          />
        </TabsContent>
        <TabsContent
          value="layers"
          className="mt-0 min-h-0 flex-1 overflow-hidden"
        >
          {sourceLayers ? (
            <SourceLayersPanel
              layers={sourceLayers}
              selectedId={selectedLayerId}
              onSelect={onSelectLayer}
              embedded
            />
          ) : (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              Select a component to inspect its layer tree.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
