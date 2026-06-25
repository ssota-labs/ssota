"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { GraphNode } from "@ssota/core";
import type {
  DesignThemeTokenMap,
  UiComponentContentV2,
} from "@ssota/contracts/catalog";
import { ThemeTokensProvider } from "@ssota/ui/components/design-studio";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@ssota/ui/components/ui/resizable";
import { Button } from "@ssota/ui/components/ui/button";
import {
  clearSessionDraft,
  draftStorageKey,
  readSessionContentV2,
  resolveInitialContentV2,
  writeSessionContentV2,
} from "@/lib/design-studio/draft-storage";
import { createEmptyUiComponentContentV2 } from "@/lib/design-studio/empty-document";
import {
  collectClassNamesFromContentV2,
  hashContentStructure,
} from "@/lib/design-studio/content-structure-hash";
import { buildSourceLayerIndex } from "@/lib/design-studio/source-layers";
import {
  patchSourceClassName,
  readClassNameFromSource,
  type SourceRef,
} from "@/lib/design-studio/source-patch";
import type { UiComponentListRow } from "@/lib/graph/loaders/query-ui-components";
import type { StudioInteractionMode } from "@ssota/studio-renderer";
import { SourceInspectorPanel } from "./source-inspector-panel";
import { PreviewToolbar } from "./preview-toolbar";
import { StudioLeftPanel } from "./studio-left-panel";
import { usePreviewBridge, useStudioNodeMeasure } from "./preview-bridge";

type StudioShellProps = {
  mode?: "authoring" | "preview";
  projectId: string;
  component: GraphNode | null;
  /** Row id highlighted in the left explorer (wireframe id in preview mode). */
  activeListItemId?: string | null;
  components: UiComponentListRow[];
  onSelectComponent: (componentId: string) => void;
  themeTokens: DesignThemeTokenMap;
  themeCss: string;
  previewBasePath: string;
  onDeploy: (input: {
    projectId: string;
    nodeId: string;
    contentV2?: UiComponentContentV2;
  }) => Promise<void>;
  onCreateComponent: () => Promise<void> | void;
};

export function StudioShell(props: StudioShellProps) {
  const { component, mode = "authoring", activeListItemId } = props;
  if (!component) {
    return <StudioShellEmpty {...props} mode={mode} activeListItemId={activeListItemId} />;
  }
  return (
    <StudioShellEditor
      key={component.id}
      {...props}
      mode={mode}
      component={component}
    />
  );
}

function StudioShellEmpty({
  mode = "authoring",
  activeListItemId,
  components,
  onSelectComponent,
  onCreateComponent,
}: StudioShellProps) {
  const [pending, startTransition] = useTransition();
  const isPreview = mode === "preview";
  const hasSelection = Boolean(activeListItemId);

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
        defaultLayout={
          isPreview ? { left: 28, preview: 72 } : { left: 22, preview: 53, inspector: 25 }
        }
      >
        <ResizablePanel
          id="left"
          defaultSize={isPreview ? "28%" : "22%"}
          minSize="16%"
          maxSize={isPreview ? "40%" : "32%"}
        >
          <StudioLeftPanel
            mode={mode}
            components={components}
            activeComponentId={activeListItemId ?? null}
            onSelectComponent={onSelectComponent}
            sourceLayers={null}
            selectedLayerId={null}
            onSelectLayer={() => {}}
            pending={pending}
            onCreateComponent={handleCreateComponent}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="preview" defaultSize={isPreview ? "72%" : "53%"} minSize="35%">
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/20 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isPreview
                ? components.length === 0
                  ? "No wireframes yet. Create wireframe nodes scoped to this initiative."
                  : hasSelection
                    ? "This wireframe has no linked UI component. Add a references edge to a ui_component or set uiComponentId."
                    : "Select a wireframe from the list to preview its linked UI component."
                : "Create a component or pick one from the Components tab."}
            </p>
            {!isPreview ? (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={handleCreateComponent}
              >
                {pending ? "Creating…" : "New component"}
              </Button>
            ) : null}
          </div>
        </ResizablePanel>
        {!isPreview ? (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              id="inspector"
              defaultSize="25%"
              minSize="18%"
              maxSize="35%"
            >
              <div className="flex h-full items-center justify-center border-l p-4 text-xs text-muted-foreground">
                Inspector appears when a component is open.
              </div>
            </ResizablePanel>
          </>
        ) : null}
      </ResizablePanelGroup>
    </div>
  );
}

function StudioShellEditor({
  mode = "authoring",
  projectId,
  component,
  activeListItemId,
  components,
  onSelectComponent,
  themeTokens,
  themeCss,
  previewBasePath,
  onDeploy,
  onCreateComponent,
}: StudioShellProps & { component: GraphNode }) {
  const isPreview = mode === "preview";
  const highlightedListId = activeListItemId ?? component.id;
  const props = (component?.properties ?? {}) as {
    slug?: string;
    tier?: string;
    entry?: string;
  };

  const storageKey = component
    ? draftStorageKey(projectId, component.id)
    : null;

  const previewUrl = `${previewBasePath}?mode=bundle`;

  const [contentV2, setContentV2] = useState<UiComponentContentV2>(() => {
    if (!component) return createEmptyUiComponentContentV2();
    if (isPreview) {
      return resolveInitialContentV2({
        sessionContent: null,
        publishedProperties: component.properties,
        fallback: createEmptyUiComponentContentV2(),
      });
    }
    const key = draftStorageKey(projectId, component.id);
    return resolveInitialContentV2({
      sessionContent: readSessionContentV2(key),
      publishedProperties: component.properties,
      fallback: createEmptyUiComponentContentV2(),
    });
  });
  const [buildPreview, setBuildPreview] = useState<{
    jsUrl: string;
    cssUrl?: string;
    buildId: string;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] =
    useState<StudioInteractionMode>(isPreview ? "preview" : "inspect");
  const [pending, startTransition] = useTransition();
  const {
    iframeRef,
    ready,
    syncUtilityCss,
    patchNodeClassName,
    syncTheme,
    syncInteractionMode,
    syncBundle,
    highlightNode,
  } = usePreviewBridge(previewUrl);

  const [selectedSourceRef, setSelectedSourceRef] = useState<SourceRef | null>(
    null,
  );

  const structureHash = useMemo(
    () => hashContentStructure(contentV2),
    [contentV2],
  );
  const contentV2Ref = useRef(contentV2);

  useEffect(() => {
    contentV2Ref.current = contentV2;
  }, [contentV2]);

  const sourceLayers = useMemo(() => {
    if (!component) return null;
    if (contentV2.layerIndex) return [contentV2.layerIndex];
    const entry =
      typeof props.entry === "string" ? props.entry : "Component.tsx";
    return buildSourceLayerIndex(contentV2.files, entry);
  }, [component, contentV2, props.entry]);

  const selectedSourceClassName = useMemo(() => {
    if (!selectedSourceRef) return "";
    return readClassNameFromSource(contentV2.files, selectedSourceRef) ?? "";
  }, [contentV2.files, selectedSourceRef]);

  const domReferencePx = useStudioNodeMeasure(
    iframeRef,
    selectedId,
    ready,
    selectedSourceClassName,
  );

  useEffect(() => {
    if (!storageKey || isPreview) return;
    const timer = window.setTimeout(() => {
      writeSessionContentV2(storageKey, contentV2);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [contentV2, storageKey, isPreview]);

  useEffect(() => {
    if (!component || !ready) return;
    syncTheme(themeCss);
  }, [component, ready, themeCss, syncTheme]);

  useEffect(() => {
    if (!component || !ready) return;
    syncInteractionMode(interactionMode);
  }, [component, ready, interactionMode, syncInteractionMode]);

  useEffect(() => {
    if (!component || !ready || !buildPreview) return;
    void syncUtilityCss(collectClassNamesFromContentV2(contentV2Ref.current));
  }, [component, ready, buildPreview, structureHash, syncUtilityCss]);

  useEffect(() => {
    if (!component) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch("/api/studio/build", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              properties: {
                ...component.properties,
                files: contentV2Ref.current.files,
                layerIndex: contentV2Ref.current.layerIndex,
              },
            }),
          });
          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as
              | { error?: string }
              | null;
            console.warn(
              "[studio/build]",
              response.status,
              payload?.error ?? response.statusText,
            );
            return;
          }
          const payload = (await response.json()) as {
            url: string;
            cssUrl?: string;
            buildId: string;
          };
          setBuildPreview({
            jsUrl: payload.url,
            cssUrl: payload.cssUrl,
            buildId: payload.buildId,
          });
        } catch {
          // preview build is best-effort until deploy
        }
      })();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [component, structureHash, projectId]);

  useEffect(() => {
    if (!component || !ready || !buildPreview) return;
    syncBundle(buildPreview);
  }, [component, ready, buildPreview, syncBundle]);

  useEffect(() => {
    if (!ready || !selectedId) return;
    highlightNode(selectedId);
  }, [ready, selectedId, highlightNode]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (
        event as CustomEvent<{ nodeId: string; sourceRef?: SourceRef }>
      ).detail;
      setSelectedId(detail.nodeId);
      setSelectedSourceRef(detail.sourceRef ?? null);
    };
    window.addEventListener("studio-select", handler);
    return () => window.removeEventListener("studio-select", handler);
  }, []);

  const handleSourceClassNameChange = useCallback(
    (nextClassName: string) => {
      if (!selectedId || !selectedSourceRef) return;
      const nextFiles = patchSourceClassName(
        contentV2.files,
        selectedSourceRef,
        nextClassName,
      );
      const nextContent = { ...contentV2, files: nextFiles };
      setContentV2(nextContent);
      void patchNodeClassName(
        selectedId,
        nextClassName,
        collectClassNamesFromContentV2(nextContent),
      );
    },
    [contentV2, patchNodeClassName, selectedId, selectedSourceRef],
  );

  const handleDeploy = () => {
    if (!component) return;
    startTransition(async () => {
      await onDeploy({
        projectId,
        nodeId: component.id,
        contentV2,
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
        defaultLayout={
          isPreview ? { left: 28, preview: 72 } : { left: 22, preview: 53, inspector: 25 }
        }
      >
        <ResizablePanel
          id="left"
          defaultSize={isPreview ? "28%" : "22%"}
          minSize="16%"
          maxSize={isPreview ? "40%" : "32%"}
        >
          <StudioLeftPanel
            mode={mode}
            components={components}
            activeComponentId={highlightedListId}
            onSelectComponent={onSelectComponent}
            sourceLayers={isPreview ? null : sourceLayers}
            selectedLayerId={selectedId}
            onSelectLayer={setSelectedId}
            pending={pending}
            onCreateComponent={handleCreateComponent}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="preview" defaultSize={isPreview ? "72%" : "53%"} minSize="35%">
          <div className="flex h-full min-h-0 flex-col bg-muted/30">
            {!isPreview ? (
              <PreviewToolbar
                mode={interactionMode}
                onModeChange={setInteractionMode}
                disabled={!ready}
                onDeploy={handleDeploy}
                deployDisabled={false}
                deployPending={pending}
              />
            ) : null}
            <iframe
              ref={iframeRef}
              title="Design preview"
              src={previewUrl}
              className="min-h-0 flex-1 w-full border-0 bg-background"
            />
          </div>
        </ResizablePanel>
        {!isPreview ? (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              id="inspector"
              defaultSize="25%"
              minSize="18%"
              maxSize="35%"
            >
              <ThemeTokensProvider tokens={themeTokens}>
                <SourceInspectorPanel
                  selectedId={selectedId}
                  selectedSourceRef={selectedSourceRef}
                  className={selectedSourceClassName}
                  onClassNameChange={handleSourceClassNameChange}
                  readOnly={Boolean(selectedId && !selectedSourceRef)}
                  domReferencePx={domReferencePx}
                />
              </ThemeTokensProvider>
            </ResizablePanel>
          </>
        ) : null}
      </ResizablePanelGroup>
    </div>
  );
}
