import type { ReactNode } from "react";

import {
  resolveVariant,
  type CatalogItem,
} from "../lib/catalog-navigation";
import type { StoryCatalogEntry } from "../lib/story-catalog";
import { PreviewCanvas } from "./PreviewCanvas";
import { VariantToolbar } from "./VariantToolbar";

type PreviewFrameProps = {
  item: CatalogItem | null;
  variantId: string | null;
  onSelectVariant: (variantId: string) => void;
};

function renderPreviewContent(
  item: CatalogItem,
  variant: StoryCatalogEntry | null,
): ReactNode {
  if (item.render) return item.render();
  if (variant) return variant.render();
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

  const variant = item.variants
    ? resolveVariant(item, variantId)
    : null;
  const activeVariantId = variant?.id ?? variantId ?? "";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {item.variants && item.variants.length > 1 && variant && (
        <VariantToolbar
          componentLabel={item.label}
          variants={item.variants}
          selectedVariantId={activeVariantId}
          onSelectVariant={onSelectVariant}
        />
      )}
      <PreviewCanvas>
        {renderPreviewContent(item, variant)}
      </PreviewCanvas>
    </div>
  );
}
