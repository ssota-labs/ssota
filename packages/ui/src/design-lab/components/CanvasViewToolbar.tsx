import { formatVariantLabel } from "../lib/catalog-navigation";
import type { CanvasView } from "../lib/url-state";
import type { StoryCatalogEntry } from "../lib/story-catalog";

type CanvasViewToolbarProps = {
  componentLabel: string;
  variants?: StoryCatalogEntry[];
  selectedVariantId: string;
  onSelectVariant: (variantId: string) => void;
  canvasView: CanvasView;
  onCanvasViewChange: (view: CanvasView) => void;
  showDocumentation: boolean;
};

const VIEW_OPTIONS: { id: CanvasView; label: string }[] = [
  { id: "preview", label: "Preview" },
  { id: "documentation", label: "Documentation" },
];

export function CanvasViewToolbar({
  componentLabel,
  variants,
  selectedVariantId,
  onSelectVariant,
  canvasView,
  onCanvasViewChange,
  showDocumentation,
}: CanvasViewToolbarProps) {
  const visibleViews = showDocumentation
    ? VIEW_OPTIONS
    : VIEW_OPTIONS.filter((v) => v.id === "preview");

  return (
    <div className="shrink-0 border-b border-border bg-card px-4 py-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="shrink-0 text-xs font-medium text-foreground">
          {componentLabel}
        </span>

        {variants && variants.length > 1 && canvasView === "preview" && (
          <div className="flex flex-wrap gap-1">
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
        )}

        <div className="ml-auto flex shrink-0 gap-1 rounded-md border border-border p-0.5">
          {visibleViews.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => onCanvasViewChange(view.id)}
              className={`rounded px-2.5 py-1 text-xs transition-colors ${
                canvasView === view.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
