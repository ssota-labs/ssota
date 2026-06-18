"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { GraphNode } from "@ssota/core";
import type {
  UiComponentContentV2,
  UiComponentDocument,
} from "@ssota/contracts/catalog";
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
  getUiComponentRepresentation,
  readSessionContentV2,
  readSessionDraft,
  resolveInitialContentV2,
  resolveInitialDraft,
  writeSessionContentV2,
  writeSessionDraft,
} from "@/lib/design-studio/draft-storage";
import {
  createEmptyUiComponentContentV2,
  createEmptyUiComponentDocument,
} from "@/lib/design-studio/empty-document";
import { updateStudioNode, findStudioNode } from "@/lib/design-studio/tree-utils";
import { buildSourceLayerIndex } from "@/lib/design-studio/source-layers";
import {
  patchSourceClassName,
  readClassNameFromSource,
  type SourceRef,
} from "@/lib/design-studio/source-patch";
import type { UiComponentListRow } from "@/lib/graph/loaders/query-ui-components";
import type { ResolvedComponentMap, StudioInteractionMode } from "@ssota/studio-renderer";
import { InspectorPanel } from "./inspector-panel";
import { SourceInspectorPanel } from "./source-inspector-panel";
import { PreviewToolbar } from "./preview-toolbar";
import { StudioLeftPanel } from "./studio-left-panel";
import { usePreviewBridge, useStudioNodeMeasure } from "./preview-bridge";

type StudioShellProps = {
  ctx: ProjectRouteContext;
  projectId: string;
  component: GraphNode | null;
  components: UiComponentListRow[];
  studioBasePath: string;
  themeContent: string;
  previewBasePath: string;
  resolvedComponents: ResolvedComponentMap;
  onDeploy: (input: {
    projectId: string;
    nodeId: string;
    document?: UiComponentDocument;
    contentV2?: UiComponentContentV2;
    themeCss?: string;
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
  previewBasePath,
  resolvedComponents,
  onDeploy,
  onCreateComponent,
}: StudioShellProps) {
  const props = (component?.properties ?? {}) as {
    slug?: string;
    tier?: string;
    draft?: string;
    representation?: string;
    entry?: string;
  };
  const representation = component
    ? getUiComponentRepresentation(component.properties)
    : "tree";
  const isSource = representation === "source";

  const storageKey = component
    ? draftStorageKey(projectId, component.id)
    : null;

  const previewUrl = useMemo(() => {
    if (!component) return `${previewBasePath}?mode=draft`;
    return isSource
      ? `${previewBasePath}?mode=bundle`
      : `${previewBasePath}?mode=draft`;
  }, [component, isSource, previewBasePath]);

  const [document, setDocument] = useState<UiComponentDocument>(() =>
    component && !isSource
      ? resolveInitialDraft({
          sessionDraft: null,
          publishedContent: component.content,
          fallback: createEmptyUiComponentDocument(),
        })
      : createEmptyUiComponentDocument(),
  );
  const [contentV2, setContentV2] = useState<UiComponentContentV2>(() => {
    if (!component || !isSource) return createEmptyUiComponentContentV2();
    const key = draftStorageKey(projectId, component.id);
    return resolveInitialContentV2({
      sessionContent: readSessionContentV2(key),
      publishedContent: component.content,
      fallback: createEmptyUiComponentContentV2(),
    });
  });
  const [buildPreview, setBuildPreview] = useState<{
    jsUrl: string;
    cssUrl?: string;
    buildId: string;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    component ? (isSource ? null : "root") : null,
  );
  const [interactionMode, setInteractionMode] =
    useState<StudioInteractionMode>("inspect");
  const [pending, startTransition] = useTransition();
  const {
    iframeRef,
    ready,
    syncTree,
    syncResolvedComponents,
    syncUtilityCss,
    syncSourceUtilityCss,
    syncTheme,
    syncInteractionMode,
    syncBundle,
    patchNode,
    highlightNode,
  } = usePreviewBridge(previewUrl);

  const [selectedSourceRef, setSelectedSourceRef] = useState<SourceRef | null>(
    null,
  );

  const sourceLayers = useMemo(() => {
    if (!isSource) return null;
    if (contentV2.layerIndex) return [contentV2.layerIndex];
    const entry =
      typeof props.entry === "string" ? props.entry : "Component.tsx";
    return buildSourceLayerIndex(contentV2.files, entry);
  }, [contentV2, isSource, props.entry]);

  const selectedSourceClassName = useMemo(() => {
    if (!selectedSourceRef) return "";
    return readClassNameFromSource(contentV2.files, selectedSourceRef) ?? "";
  }, [contentV2.files, selectedSourceRef]);

  const selectedNode = selectedId
    ? findStudioNode(document.root, selectedId)
    : null;
  const measureKey =
    selectedNode &&
    (selectedNode.kind === "element" || selectedNode.kind === "component")
      ? (selectedNode.className ?? "")
      : "";
  const domReferencePx = useStudioNodeMeasure(
    iframeRef,
    selectedId,
    ready,
    measureKey,
  );

  useEffect(() => {
    if (!component || !storageKey) return;
    const nextRepresentation = getUiComponentRepresentation(component.properties);
    if (nextRepresentation === "source") {
      setContentV2(
        resolveInitialContentV2({
          sessionContent: readSessionContentV2(storageKey),
          publishedContent: component.content,
          fallback: createEmptyUiComponentContentV2(),
        }),
      );
      setSelectedId(null);
      return;
    }

    setDocument(
      resolveInitialDraft({
        sessionDraft: readSessionDraft(storageKey),
        publishedContent: component.content,
        fallback: createEmptyUiComponentDocument(),
      }),
    );
    setSelectedId("root");
  }, [component, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    const timer = window.setTimeout(() => {
      if (isSource) {
        writeSessionContentV2(storageKey, contentV2);
      } else {
        writeSessionDraft(storageKey, document);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [document, contentV2, storageKey, isSource]);

  useEffect(() => {
    if (!component || !ready || isSource) return;
    syncTree(document.root);
  }, [component, ready, document.root, syncTree, isSource]);

  useEffect(() => {
    if (!component || !ready || isSource) return;
    syncResolvedComponents(resolvedComponents);
  }, [component, ready, resolvedComponents, syncResolvedComponents, isSource]);

  useEffect(() => {
    if (!component || !ready || isSource) return;
    void syncUtilityCss(document.root, resolvedComponents);
  }, [component, ready, document.root, resolvedComponents, syncUtilityCss, isSource]);

  useEffect(() => {
    if (!component || !ready || !isSource) return;
    void syncSourceUtilityCss(contentV2.files);
  }, [component, ready, isSource, contentV2.files, syncSourceUtilityCss]);

  useEffect(() => {
    if (!component || !ready) return;
    syncTheme(themeContent);
  }, [component, ready, themeContent, syncTheme]);

  useEffect(() => {
    if (!component || !ready) return;
    syncInteractionMode(interactionMode);
  }, [component, ready, interactionMode, syncInteractionMode]);

  useEffect(() => {
    if (!component || !isSource) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch("/api/studio/build", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              properties: component.properties,
              content: JSON.stringify(contentV2),
              themeCss: themeContent,
            }),
          });
          if (!response.ok) return;
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
  }, [component, contentV2, isSource, projectId, themeContent]);

  useEffect(() => {
    if (!component || !ready || !isSource || !buildPreview) return;
    syncBundle(buildPreview);
  }, [component, ready, isSource, buildPreview, syncBundle]);

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
      setContentV2((current) => ({ ...current, files: nextFiles }));
      patchNode(selectedId, { className: nextClassName });
    },
    [contentV2.files, patchNode, selectedId, selectedSourceRef],
  );

  const handlePatch = useCallback(
    (nodeId: string, patch: Record<string, unknown>) => {
    if (isSource) return;
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
  }, [isSource]);

  const handleDeploy = () => {
    if (!component) return;
    startTransition(async () => {
      await onDeploy({
        projectId,
        nodeId: component.id,
        document: isSource ? undefined : document,
        contentV2: isSource ? contentV2 : undefined,
        themeCss: themeContent,
        revalidatePath: previewBasePath.replace(/^\//, ""),
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
            root={component && !isSource ? document.root : null}
            sourceLayers={component && isSource ? sourceLayers : null}
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
            isSource ? (
              <SourceInspectorPanel
                selectedId={selectedId}
                selectedSourceRef={selectedSourceRef}
                className={selectedSourceClassName}
                onClassNameChange={handleSourceClassNameChange}
                readOnly={Boolean(selectedId && !selectedSourceRef)}
              />
            ) : (
              <InspectorPanel
                root={document.root}
                selectedId={selectedId}
                domReferencePx={domReferencePx}
                onPatch={handlePatch}
              />
            )
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
