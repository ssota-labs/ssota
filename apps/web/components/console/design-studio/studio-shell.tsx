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
import { exportUiComponentDocumentToJsx } from "@/lib/design-studio/export-jsx";
import { updateStudioNode } from "@/lib/design-studio/tree-utils";
import { LayersPanel } from "./layers-panel";
import { InspectorPanel } from "./inspector-panel";
import { usePreviewBridge } from "./preview-bridge";

type StudioShellProps = {
  ctx: ProjectRouteContext;
  projectId: string;
  component: GraphNode;
  themeContent: string;
  previewPath: string;
  onSaveDraft: (input: {
    projectId: string;
    nodeId: string;
    draft: string;
    revalidatePath: string;
  }) => Promise<void>;
  onDeploy: (input: {
    projectId: string;
    nodeId: string;
    document: UiComponentDocument;
    revalidatePath: string;
  }) => Promise<void>;
};

export function StudioShell({
  projectId,
  component,
  themeContent,
  previewPath,
  onSaveDraft,
  onDeploy,
}: StudioShellProps) {
  const storageKey = draftStorageKey(projectId, component.id);
  const props = component.properties as {
    slug?: string;
    tier?: string;
    draft?: string;
  };

  const [document, setDocument] = useState<UiComponentDocument>(() =>
    resolveInitialDraft({
      sessionDraft: null,
      propertiesDraft: props.draft,
      publishedContent: component.content,
      fallback: createEmptyUiComponentDocument(),
    }),
  );
  const [selectedId, setSelectedId] = useState<string | null>("root");
  const [pending, startTransition] = useTransition();
  const { iframeRef, ready, previewUrl, syncTree, syncTheme } =
    usePreviewBridge(previewPath);

  useEffect(() => {
    const sessionDraft = readSessionDraft(storageKey);
    setDocument(
      resolveInitialDraft({
        sessionDraft,
        propertiesDraft: props.draft,
        publishedContent: component.content,
        fallback: createEmptyUiComponentDocument(),
      }),
    );
  }, [storageKey, props.draft, component.content]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      writeSessionDraft(storageKey, document);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [document, storageKey]);

  useEffect(() => {
    if (!ready) return;
    syncTree(document.root);
  }, [ready, document.root, syncTree]);

  useEffect(() => {
    if (!ready) return;
    syncTheme(themeContent);
  }, [ready, themeContent, syncTheme]);

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

  const handleSaveDraft = () => {
    startTransition(async () => {
      await onSaveDraft({
        projectId,
        nodeId: component.id,
        draft: JSON.stringify(document),
        revalidatePath: previewPath.replace(/\?.*$/, "").replace(/^\//, ""),
      });
      writeSessionDraft(storageKey, document);
    });
  };

  const handleClearSessionDraft = () => {
    clearSessionDraft(storageKey);
  };

  const handleDeploy = () => {
    startTransition(async () => {
      await onDeploy({
        projectId,
        nodeId: component.id,
        document,
        revalidatePath: previewPath.replace(/\?.*$/, "").replace(/^\//, ""),
      });
      clearSessionDraft(storageKey);
    });
  };

  const handleCopyJsx = async () => {
    const jsx = exportUiComponentDocumentToJsx(document.root);
    await navigator.clipboard.writeText(jsx);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">{component.title}</h1>
          <p className="text-sm text-muted-foreground">
            {props.slug} · {props.tier ?? "primitive"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleCopyJsx()}
          >
            Copy JSX
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearSessionDraft}
          >
            Clear session
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={handleSaveDraft}
          >
            Save draft
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={handleDeploy}
          >
            Deploy
          </Button>
        </div>
      </div>

      <ResizablePanelGroup
        id="design-studio-shell"
        orientation="horizontal"
        className="min-h-0 flex-1"
        defaultLayout={{ layers: 20, preview: 55, inspector: 25 }}
      >
        <ResizablePanel id="layers" defaultSize="20%" minSize="14%" maxSize="30%">
          <LayersPanel
            root={document.root}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="preview" defaultSize="55%" minSize="35%">
          <div className="h-full min-h-0 bg-muted/30">
            <iframe
              ref={iframeRef}
              title="Design preview"
              src={previewUrl}
              className="h-full w-full border-0 bg-background"
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          id="inspector"
          defaultSize="25%"
          minSize="18%"
          maxSize="35%"
        >
          <InspectorPanel
            root={document.root}
            selectedId={selectedId}
            onPatch={handlePatch}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
