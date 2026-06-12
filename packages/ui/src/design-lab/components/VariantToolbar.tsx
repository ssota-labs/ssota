import { formatVariantLabel } from "../lib/catalog-navigation";
import type { StoryCatalogEntry } from "../lib/story-catalog";

type VariantToolbarProps = {
  componentLabel: string;
  variants: StoryCatalogEntry[];
  selectedVariantId: string;
  onSelectVariant: (variantId: string) => void;
};

export function VariantToolbar({
  componentLabel,
  variants,
  selectedVariantId,
  onSelectVariant,
}: VariantToolbarProps) {
  if (variants.length <= 1) return null;

  return (
    <div className="shrink-0 border-b border-border bg-card px-4 py-2">
      <div className="flex items-center gap-3 overflow-x-auto">
        <span className="shrink-0 text-xs font-medium text-foreground">
          {componentLabel}
        </span>
        <div className="flex gap-1">
          {variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelectVariant(variant.id)}
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs transition-colors ${
                selectedVariantId === variant.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {formatVariantLabel(variant.storyName)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
