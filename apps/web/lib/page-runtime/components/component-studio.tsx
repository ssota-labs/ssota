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

function ComponentStudioEl({
  nodes,
  themeNode,
}: {
  nodes: RenderNode[];
  themeNode?: RenderNode;
}) {
  const studio = useComponentStudio();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const components = useMemo(() => toListRows(nodes), [nodes]);
  const { tokens: themeTokens, themeCss } = useMemo(
    () => resolveThemeFromBinding(themeNode),
    [themeNode],
  );

  const queryComponentId = searchParams.get("component");
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const initial = studio?.initialComponentId ?? queryComponentId;
    if (initial && nodes.some((n) => n.id === initial)) return initial;
    return components[0]?.id ?? null;
  });

  useEffect(() => {
    if (queryComponentId && nodes.some((n) => n.id === queryComponentId)) {
      setSelectedId(queryComponentId);
    }
  }, [queryComponentId, nodes]);

  const syncUrl = useCallback(
    (componentId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (componentId) {
        params.set("component", componentId);
      } else {
        params.delete("component");
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  const onSelectComponent = useCallback(
    (componentId: string) => {
      setSelectedId(componentId);
      syncUrl(componentId);
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

  const activeNode = nodes.find((n) => n.id === selectedId) ?? null;
  const component = activeNode
    ? toGraphNode(activeNode, studio.projectId)
    : null;

  const handleCreate = async () => {
    const id = await studio.onCreateComponent();
    setSelectedId(id);
    syncUrl(id);
  };

  const handleDeploy = async (input: {
    projectId: string;
    nodeId: string;
    contentV2?: import("@ssota/contracts/catalog").UiComponentContentV2;
  }) => {
    if (!input.contentV2) return;
    await studio.onDeployComponent({
      nodeId: input.nodeId,
      contentV2: input.contentV2,
    });
    startTransition(() => router.refresh());
  };

  return (
    <StudioShell
      projectId={studio.projectId}
      component={component}
      components={components}
      onSelectComponent={onSelectComponent}
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

    return (
      <Suspense
        fallback={
          <div className="text-muted-foreground flex h-full min-h-[320px] items-center justify-center text-sm">
            Loading studio…
          </div>
        }
      >
        <ComponentStudioEl nodes={nodes} themeNode={themeNode} />
      </Suspense>
    );
  },
};
