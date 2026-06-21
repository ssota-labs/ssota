"use client";

import dynamic from "next/dynamic";
import { useBasePath, useWidgetBuild } from "../context";
import type { CatalogComponent } from "../types";
import type { ResolvedArtifact } from "@/lib/design-studio/resolve-artifact-binding";

const WidgetEl = dynamic(
  () => import("../catalog-widget").then((m) => m.WidgetEl),
  { ssr: false },
);

/** Widget bound to base path + build trigger from context. */
function BoundWidget({
  data,
  height,
  componentProps,
}: {
  data: ResolvedArtifact | undefined;
  height?: number;
  componentProps?: Record<string, unknown>;
}) {
  const basePath = useBasePath();
  const onBuildWidget = useWidgetBuild();
  const nodeId = data?.nodeId;
  return (
    <WidgetEl
      data={data}
      basePath={basePath}
      height={height}
      componentProps={componentProps}
      onBuild={onBuildWidget && nodeId ? () => onBuildWidget(nodeId) : undefined}
    />
  );
}

/** Embed of a built component artifact (the catalog's open-ended escape hatch). */
export const widgetComponents: Record<string, CatalogComponent> = {
  Widget: ({ props, bindingData }) => {
    const data =
      typeof props.binding === "string"
        ? (bindingData[props.binding] as ResolvedArtifact | undefined)
        : undefined;
    return (
      <BoundWidget
        data={data}
        height={typeof props.height === "number" ? props.height : undefined}
        componentProps={
          props.componentProps &&
          typeof props.componentProps === "object" &&
          !Array.isArray(props.componentProps)
            ? (props.componentProps as Record<string, unknown>)
            : undefined
        }
      />
    );
  },
};
