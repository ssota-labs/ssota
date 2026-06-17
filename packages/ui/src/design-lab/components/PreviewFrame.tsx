import type { ReactNode } from "react";

import {
  resolveVariant,
  type CatalogItem,
} from "../lib/catalog-navigation";
import type { DocsCatalogEntry } from "../lib/docs-catalog";
import type { CanvasView } from "../lib/url-state";
import type { ComponentDocsMeta, StoryCatalogEntry } from "../lib/story-catalog";
import { CanvasViewToolbar } from "./CanvasViewToolbar";
import { DocumentationPanel } from "./DocumentationPanel";
import { PreviewCanvas } from "./PreviewCanvas";

type PreviewFrameProps = {
  item: CatalogItem | null;
  variantId: string | null;
  onSelectVariant: (variantId: string) => void;
  canvasView: CanvasView;
  onCanvasViewChange: (view: CanvasView) => void;
  docsMeta: Map<string, ComponentDocsMeta>;
  docsCatalog: Map<string, DocsCatalogEntry>;
  storyArgs: Record<string, unknown>;
};

function renderPreviewContent(
  item: CatalogItem,
  variant: StoryCatalogEntry | null,
  storyArgs: Record<string, unknown>,
): ReactNode {
  if (item.render) return item.render();
  if (variant) {
    if (variant.supportsControls) {
      return variant.renderWithArgs(storyArgs);
    }
    return variant.render();
  }
  return (
    <p className="text-sm text-muted-foreground">
      이 항목에 대한 프리뷰가 없습니다.
    </p>
  );
}

export function PreviewFrame({
  item,
  variantId,
  onSelectVariant,
  canvasView,
  onCanvasViewChange,
  docsMeta,
  docsCatalog,
  storyArgs,
}: PreviewFrameProps) {
  if (!item) {
    return (
      <PreviewCanvas>
        <p className="text-sm text-muted-foreground">
          왼쪽에서 항목을 선택하세요.
        </p>
      </PreviewCanvas>
    );
  }

  const variant = item.variants ? resolveVariant(item, variantId) : null;
  const activeVariantId = variant?.id ?? variantId ?? "";
  const isComponent = item.groupId === "components";
  const showVariantToolbar =
    item.groupId === "components" || item.groupId === "design-studio";
  const hasDocumentation =
    isComponent &&
    (docsCatalog.has(item.id) ||
      docsMeta.get(item.id)?.tags?.includes("autodocs") === true);
  const effectiveView =
    canvasView === "documentation" && hasDocumentation
      ? "documentation"
      : "preview";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showVariantToolbar && (
        <CanvasViewToolbar
          componentLabel={item.label}
          variants={item.variants}
          selectedVariantId={activeVariantId}
          onSelectVariant={onSelectVariant}
          canvasView={effectiveView}
          onCanvasViewChange={onCanvasViewChange}
          showDocumentation={hasDocumentation}
        />
      )}

      {effectiveView === "documentation" ? (
        <div className="min-h-0 flex-1 overflow-y-auto bg-background">
          <DocumentationPanel
            selectedItem={item}
            docsMeta={docsMeta.get(item.id)}
            docs={docsCatalog.get(item.id)}
          />
        </div>
      ) : (
        <PreviewCanvas>
          {renderPreviewContent(item, variant, storyArgs)}
        </PreviewCanvas>
      )}
    </div>
  );
}
