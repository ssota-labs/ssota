import type { CatalogItem } from "../lib/catalog-navigation";
import type { DocsCatalogEntry } from "../lib/docs-catalog";
import type { ComponentDocsMeta } from "../lib/story-catalog";
import { MarkdownDocs } from "./MarkdownDocs";
import { PropsTable } from "./PropsTable";

type DocumentationPanelProps = {
  selectedItem: CatalogItem;
  docsMeta: ComponentDocsMeta | undefined;
  docs: DocsCatalogEntry | undefined;
};

export function DocumentationPanel({
  selectedItem,
  docsMeta,
  docs,
}: DocumentationPanelProps) {
  const hasAutodocs = docsMeta?.tags?.includes("autodocs");
  const hasArgTypes =
    docsMeta?.argTypes && Object.keys(docsMeta.argTypes).length > 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      {docs ? (
        <MarkdownDocs content={docs.content} />
      ) : (
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {selectedItem.label}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {hasAutodocs
              ? "문서가 없습니다. `{component}.docs.md` 파일을 추가하세요."
              : "이 컴포넌트에 연결된 문서가 없습니다."}
          </p>
        </header>
      )}

      {hasArgTypes && docsMeta?.argTypes && (
        <section className="mt-10 border-t border-border pt-8">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">Props</h2>
            {hasAutodocs && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                autodocs
              </span>
            )}
          </div>
          <PropsTable argTypes={docsMeta.argTypes} />
        </section>
      )}
    </div>
  );
}
