"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GraphNode } from "@ssota/core";
import {
  mergeDesignThemeTokens,
  parseNodeProperties,
  parseThemeCssContent,
  tokensToThemeCss,
  type DesignThemeTokenMap,
} from "@ssota/contracts/catalog";
import { readNodeContent } from "@ssota/core";
import { useArtifactWorkbench } from "../context";
import { useSelection } from "../selection-context";
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

function ArtifactWorkbenchEl({
  nodes,
  themeNode,
}: {
  nodes: RenderNode[];
  themeNode?: RenderNode;
}) {
  const studio = useArtifactWorkbench();
  const selection = useSelection();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const listItems = useMemo(() => toListRows(nodes), [nodes]);
  const { tokens: themeTokens, themeCss } = useMemo(
    () => resolveThemeFromBinding(themeNode),
    [themeNode],
  );

  const isWireframeList =
    nodes.length > 0 && nodes.every((n) => n.catalogKey === "page_wireframe");
  const readOnly = !studio?.onDeployComponent;

  const resolvedSelectionId = selection?.selectedId ?? null;
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(() => {
    if (resolvedSelectionId && nodes.some((n) => n.id === resolvedSelectionId)) {
      return resolvedSelectionId;
    }
    return listItems[0]?.id ?? null;
  });

  useEffect(() => {
    if (resolvedSelectionId && nodes.some((n) => n.id === resolvedSelectionId)) {
      setLocalSelectedId(resolvedSelectionId);
      return;
    }
    if (!resolvedSelectionId && listItems[0] && selection) {
      setLocalSelectedId(listItems[0].id);
      selection.setSelectedId(listItems[0].id);
    }
  }, [resolvedSelectionId, nodes, listItems, selection]);

  const selectedId = localSelectedId;

  const onSelectItem = useCallback(
    (itemId: string) => {
      setLocalSelectedId(itemId);
      selection?.setSelectedId(itemId);
    },
    [selection],
  );

  if (!studio) {
    return (
      <p className="text-muted-foreground text-sm">
        Artifact workbench is not configured for this page.
      </p>
    );
  }

  const activeRow = nodes.find((n) => n.id === selectedId) ?? null;
  const previewComponent = activeRow
    ? toGraphNode(activeRow, studio.projectId)
    : null;

  const handleCreate = async () => {
    if (!studio.onCreateComponent) return;
    const id = await studio.onCreateComponent();
    setLocalSelectedId(id);
    selection?.setSelectedId(id);
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
      readOnly={readOnly}
      listVariant={isWireframeList ? "flat" : "grouped"}
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

function ArtifactWorkbenchView({
  props,
  bindingData,
}: {
  props: Record<string, unknown>;
  bindingData: import("../types").BindingContext;
}) {
  const nodes = boundNodes(bindingData, props);
  const themeBinding =
    typeof props.themeBinding === "string" ? props.themeBinding : "theme";
  const themeNode = boundSingleton(bindingData, themeBinding);

  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex h-full min-h-[320px] items-center justify-center text-sm">
          Loading workbench…
        </div>
      }
    >
      <ArtifactWorkbenchEl nodes={nodes} themeNode={themeNode} />
    </Suspense>
  );
}

export const artifactWorkbenchComponents: Record<string, CatalogComponent> = {
  ArtifactWorkbench: ({ props, bindingData }) => (
    <ArtifactWorkbenchView props={props} bindingData={bindingData} />
  ),
  /** @deprecated Use ArtifactWorkbench */
  ComponentStudio: ({ props, bindingData }) => (
    <ArtifactWorkbenchView props={props} bindingData={bindingData} />
  ),
};
