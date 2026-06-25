"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { GraphNode } from "@ssota/core";
import {
  mergeDesignThemeTokens,
  parseNodeProperties,
  parseThemeCssContent,
  tokensToThemeCss,
  type DesignThemeTokenMap,
} from "@ssota/contracts/catalog";
import { readNodeContent } from "@ssota/core";
import { useComponentStudio } from "../context";
import { boundNodes, boundSingleton } from "../bindings";
import type { CatalogComponent, RenderNode } from "../types";
import type { UiComponentListRow } from "@/lib/graph/loaders/query-ui-components";

const StudioShell = dynamic(
  () =>
    import("@/components/console/design-studio/studio-shell").then(
      (m) => m.StudioShell,
    ),
  { ssr: false },
);

type StudioMode = "authoring" | "preview";

function toListRows(nodes: RenderNode[]): UiComponentListRow[] {
  return nodes
    .map((node) => {
      const props = node.properties as { slug?: string; tier?: string };
      return {
        id: node.id,
        title: node.title || "Untitled",
        slug: props.slug ?? node.id.slice(0, 8),
        tier: props.tier ?? "primitive",
        updatedAt: "",
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

function toGraphNode(node: RenderNode, projectId: string): GraphNode {
  return {
    id: node.id,
    projectId,
    nodeCatalogId: "",
    catalogKey: node.catalogKey,
    catalogLabel: node.catalogKey,
    title: node.title,
    properties: node.properties,
    schemaVersion: 1,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

function resolveThemeFromBinding(
  themeNode: RenderNode | undefined,
): { tokens: DesignThemeTokenMap; themeCss: string } {
  if (!themeNode) {
    const tokens = mergeDesignThemeTokens({});
    return { tokens, themeCss: tokensToThemeCss(tokens) };
  }

  const parsed = parseNodeProperties(
    "design_theme",
    themeNode.properties ?? {},
  );
  let userTokens = (parsed.tokens ?? {}) as DesignThemeTokenMap;
  if (Object.keys(userTokens).length === 0) {
    const legacy = readNodeContent(themeNode.properties)?.trim();
    if (legacy) {
      userTokens = parseThemeCssContent(legacy);
    }
  }
  const tokens = mergeDesignThemeTokens(userTokens);
  return { tokens, themeCss: tokensToThemeCss(tokens) };
}

/** Linked ui_component from attachChildren (`uiComponents`) or `uiComponentId`. */
function resolveWireframePreviewNode(
  wireframe: RenderNode,
  projectId: string,
): GraphNode | null {
  const props = wireframe.properties ?? {};
  const linked = props.uiComponents;
  if (Array.isArray(linked) && linked.length > 0) {
    const first = linked[0];
    if (first && typeof first === "object" && "id" in first) {
      return toGraphNode(first as RenderNode, projectId);
    }
  }
  const componentId = props.uiComponentId;
  if (typeof componentId === "string" && componentId.length > 0) {
    return {
      id: componentId,
      projectId,
      nodeCatalogId: "",
      catalogKey: "ui_component",
      catalogLabel: "ui_component",
      title: wireframe.title,
      properties: {},
      schemaVersion: 1,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
  }
  return null;
}

function ComponentStudioEl({
  nodes,
  themeNode,
  mode,
  selectionParam,
}: {
  nodes: RenderNode[];
  themeNode?: RenderNode;
  mode: StudioMode;
  selectionParam: string;
}) {
  const studio = useComponentStudio();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const listItems = useMemo(() => toListRows(nodes), [nodes]);
  const { tokens: themeTokens, themeCss } = useMemo(
    () => resolveThemeFromBinding(themeNode),
    [themeNode],
  );

  const querySelectionId = searchParams.get(selectionParam);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const initial = studio?.initialSelectionId ?? querySelectionId;
    if (initial && nodes.some((n) => n.id === initial)) return initial;
    return listItems[0]?.id ?? null;
  });

  useEffect(() => {
    if (querySelectionId && nodes.some((n) => n.id === querySelectionId)) {
      setSelectedId(querySelectionId);
    }
  }, [querySelectionId, nodes]);

  const syncUrl = useCallback(
    (itemId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (itemId) {
        params.set(selectionParam, itemId);
      } else {
        params.delete(selectionParam);
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams, selectionParam],
  );

  const onSelectItem = useCallback(
    (itemId: string) => {
      setSelectedId(itemId);
      syncUrl(itemId);
    },
    [syncUrl],
  );

  if (!studio) {
    return (
      <p className="text-muted-foreground text-sm">
        Component studio is not configured for this page.
      </p>
    );
  }

  const activeRow = nodes.find((n) => n.id === selectedId) ?? null;

  const previewComponent =
    mode === "preview" && activeRow
      ? resolveWireframePreviewNode(activeRow, studio.projectId)
      : activeRow
        ? toGraphNode(activeRow, studio.projectId)
        : null;

  const handleCreate = async () => {
    if (!studio.onCreateComponent) return;
    const id = await studio.onCreateComponent();
    setSelectedId(id);
    syncUrl(id);
  };

  const handleDeploy = async (input: {
    projectId: string;
    nodeId: string;
    contentV2?: import("@ssota/contracts/catalog").UiComponentContentV2;
  }) => {
    if (!input.contentV2 || !studio.onDeployComponent) return;
    await studio.onDeployComponent({
      nodeId: input.nodeId,
      contentV2: input.contentV2,
    });
    startTransition(() => router.refresh());
  };

  return (
    <StudioShell
      mode={mode}
      projectId={studio.projectId}
      component={previewComponent}
      activeListItemId={selectedId}
      components={listItems}
      onSelectComponent={onSelectItem}
      themeTokens={themeTokens}
      themeCss={themeCss}
      previewBasePath={studio.previewBasePath}
      onDeploy={handleDeploy}
      onCreateComponent={handleCreate}
    />
  );
}

export const componentStudioComponents: Record<string, CatalogComponent> = {
  ComponentStudio: ({ props, bindingData }) => {
    const nodes = boundNodes(bindingData, props);
    const themeBinding =
      typeof props.themeBinding === "string" ? props.themeBinding : "theme";
    const themeNode = boundSingleton(bindingData, themeBinding);
    const mode: StudioMode =
      props.mode === "preview" ? "preview" : "authoring";
    const selectionParam =
      typeof props.selectionParam === "string" && props.selectionParam.length > 0
        ? props.selectionParam
        : "component";

    return (
      <Suspense
        fallback={
          <div className="text-muted-foreground flex h-full min-h-[320px] items-center justify-center text-sm">
            Loading studio…
          </div>
        }
      >
        <ComponentStudioEl
          nodes={nodes}
          themeNode={themeNode}
          mode={mode}
          selectionParam={selectionParam}
        />
      </Suspense>
    );
  },
};
