"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { GraphNode } from "@ssota/core";
import type { UiComponentDocument } from "@ssota/contracts/catalog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@ssota/ui/components/ui/resizable";
import { Button } from "@ssota/ui/components/ui/button";
import type { ProjectRouteContext } from "@/lib/console/paths";
import {
  clearSessionDraft,
  draftStorageKey,
  readSessionDraft,
  resolveInitialDraft,
  writeSessionDraft,
} from "@/lib/design-studio/draft-storage";
import { createEmptyUiComponentDocument } from "@/lib/design-studio/empty-document";
import { updateStudioNode } from "@/lib/design-studio/tree-utils";
import type { UiComponentListRow } from "@/lib/graph/loaders/query-ui-components";
import type { ResolvedComponentMap, StudioInteractionMode } from "@ssota/studio-renderer";
import { InspectorPanel } from "./inspector-panel";
import { PreviewToolbar } from "./preview-toolbar";
import { StudioLeftPanel } from "./studio-left-panel";
import { usePreviewBridge } from "./preview-bridge";

type StudioShellProps = {
  ctx: ProjectRouteContext;
  projectId: string;
  component: GraphNode | null;
  components: UiComponentListRow[];
  studioBasePath: string;
  themeContent: string;
  previewPath: string;
  resolvedComponents: ResolvedComponentMap;
  onDeploy: (input: {
    projectId: string;
    nodeId: string;
    document: UiComponentDocument;
    revalidatePath: string;
  }) => Promise<void>;
  onCreateComponent: () => Promise<void> | void;
};

export function StudioShell({
  projectId,
  component,
  components,
  studioBasePath,
  themeContent,
  previewPath,
  resolvedComponents,
  onDeploy,
  onCreateComponent,
}: StudioShellProps) {
  const props = (component?.properties ?? {}) as {
    slug?: string;
    tier?: string;
    draft?: string;
  };
  const storageKey = component
    ? draftStorageKey(projectId, component.id)
    : null;

  const [document, setDocument] = useState<UiComponentDocument>(() =>
    component
      ? resolveInitialDraft({
          sessionDraft: null,
          propertiesDraft: props.draft,
          publishedContent: component.content,
          fallback: createEmptyUiComponentDocument(),
        })
      : createEmptyUiComponentDocument(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    component ? "root" : null,
  );
  const [interactionMode, setInteractionMode] =
    useState<StudioInteractionMode>("inspect");
  const [pending, startTransition] = useTransition();
  const {
    iframeRef,
    ready,
    previewUrl,
    syncTree,
    syncResolvedComponents,
    syncUtilityCss,
    syncTheme,
    syncInteractionMode,
    highlightNode,
  } = usePreviewBridge(previewPath);

  useEffect(() => {
    if (!component || !storageKey) return;
    const sessionDraft = readSessionDraft(storageKey);
    const nextProps = component.properties as {
      slug?: string;
      tier?: string;
      draft?: string;
    };
    setDocument(
      resolveInitialDraft({
        sessionDraft,
        propertiesDraft: nextProps.draft,
        publishedContent: component.content,
        fallback: createEmptyUiComponentDocument(),
      }),
    );
    setSelectedId("root");
  }, [component, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    const timer = window.setTimeout(() => {
      writeSessionDraft(storageKey, document);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [document, storageKey]);

  useEffect(() => {
    if (!component || !ready) return;
    syncTree(document.root);
  }, [component, ready, document.root, syncTree]);

  useEffect(() => {
    if (!component || !ready) return;
    syncResolvedComponents(resolvedComponents);
  }, [component, ready, resolvedComponents, syncResolvedComponents]);

  useEffect(() => {
    if (!component || !ready) return;
    void syncUtilityCss(document.root, resolvedComponents);
  }, [component, ready, document.root, resolvedComponents, syncUtilityCss]);

  useEffect(() => {
    if (!component || !ready) return;
    syncTheme(themeContent);
  }, [component, ready, themeContent, syncTheme]);

  useEffect(() => {
    if (!component || !ready) return;
    syncInteractionMode(interactionMode);
  }, [component, ready, interactionMode, syncInteractionMode]);

  useEffect(() => {
    if (!ready || !selectedId) return;
    highlightNode(selectedId);
  }, [ready, selectedId, highlightNode]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId: string }>).detail;
      setSelectedId(detail.nodeId);
    };
    window.addEventListener("studio-select", handler);
    return () => window.removeEventListener("studio-select", handler);
  }, []);

  const handlePatch = useCallback((nodeId: string, patch: Record<string, unknown>) => {
    setDocument((current) => ({
      ...current,
      root: updateStudioNode(current.root, nodeId, (node) => {
        if (node.kind === "element") {
          return {
            ...node,
            tag: typeof patch.tag === "string" ? patch.tag : node.tag,
            className:
              typeof patch.className === "string"
                ? patch.className
                : node.className,
          };
        }
        if (node.kind === "text") {
          return {
            ...node,
            text: typeof patch.text === "string" ? patch.text : node.text,
          };
        }
        if (node.kind === "component") {
          return {
            ...node,
            className:
              typeof patch.className === "string"
                ? patch.className
                : node.className,
          };
        }
        return node;
      }),
    }));
  }, []);

  const handleDeploy = () => {
    if (!component) return;
    startTransition(async () => {
      await onDeploy({
        projectId,
        nodeId: component.id,
        document,
        revalidatePath: previewPath.replace(/\?.*$/, "").replace(/^\//, ""),
      });
      if (storageKey) {
        clearSessionDraft(storageKey);
      }
    });
  };

  const handleCreateComponent = () => {
    startTransition(() => {
      void onCreateComponent();
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="design-studio-shell">
      <ResizablePanelGroup
        id="design-studio-panels"
        orientation="horizontal"
        className="min-h-0 flex-1"
        defaultLayout={{ left: 22, preview: 53, inspector: 25 }}
      >
        <ResizablePanel id="left" defaultSize="22%" minSize="16%" maxSize="32%">
          <StudioLeftPanel
            components={components}
            activeComponentId={component?.id ?? null}
            studioBasePath={studioBasePath}
            root={component ? document.root : null}
            selectedLayerId={selectedId}
            onSelectLayer={setSelectedId}
            pending={pending}
            onCreateComponent={handleCreateComponent}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="preview" defaultSize="53%" minSize="35%">
          {component ? (
            <div className="flex h-full min-h-0 flex-col bg-muted/30">
              <PreviewToolbar
                mode={interactionMode}
                onModeChange={setInteractionMode}
                disabled={!ready}
                onDeploy={handleDeploy}
                deployDisabled={!component}
                deployPending={pending}
              />
              <iframe
                ref={iframeRef}
                title="Design preview"
                src={previewUrl}
                className="min-h-0 flex-1 w-full border-0 bg-background"
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/20 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Create a component or pick one from the Components tab.
              </p>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={handleCreateComponent}
              >
                {pending ? "Creating…" : "New component"}
              </Button>
            </div>
          )}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          id="inspector"
          defaultSize="25%"
          minSize="18%"
          maxSize="35%"
        >
          {component ? (
            <InspectorPanel
              root={document.root}
              selectedId={selectedId}
              onPatch={handlePatch}
            />
          ) : (
            <div className="flex h-full items-center justify-center border-l p-4 text-xs text-muted-foreground">
              Inspector appears when a component is open.
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
