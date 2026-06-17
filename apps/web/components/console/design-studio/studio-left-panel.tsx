"use client";

import { useState } from "react";
import type { StudioNode } from "@ssota/contracts/catalog";
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
import { LayersPanel } from "./layers-panel";

type StudioLeftPanelProps = {
  components: UiComponentListRow[];
  activeComponentId: string | null;
  studioBasePath: string;
  root: StudioNode | null;
  selectedLayerId: string | null;
  onSelectLayer: (nodeId: string) => void;
  pending?: boolean;
  onCreateComponent: () => Promise<void> | void;
};

export function StudioLeftPanel({
  components,
  activeComponentId,
  studioBasePath,
  root,
  selectedLayerId,
  onSelectLayer,
  pending = false,
  onCreateComponent,
}: StudioLeftPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

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
            disabled={!root}
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
            studioBasePath={studioBasePath}
            searchQuery={searchQuery}
          />
        </TabsContent>
        <TabsContent
          value="layers"
          className="mt-0 min-h-0 flex-1 overflow-hidden"
        >
          {root ? (
            <LayersPanel
              root={root}
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
