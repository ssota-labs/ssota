import type { ComponentType } from "react";

import type { CatalogItem, CatalogSelection } from "../lib/catalog-navigation";
import type { ComponentDocsMeta, ArgTypeDef } from "../lib/story-catalog";
import type { DocsCatalogEntry } from "../lib/docs-catalog";

type DocsInspectorProps = {
  selection: CatalogSelection;
  selectedItem: CatalogItem | null;
  docsMeta: Map<string, ComponentDocsMeta>;
  docsCatalog: Map<string, DocsCatalogEntry>;
};

function controlLabel(argType: ArgTypeDef): string {
  if (!argType.control) return "—";
  if (typeof argType.control === "string") return argType.control;
  return argType.control.type;
}

function PropsTable({ argTypes }: { argTypes: Record<string, ArgTypeDef> }) {
  const entries = Object.entries(argTypes);
  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        argTypes가 정의되지 않았습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-left text-[0.625rem]">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-2 py-1.5 font-medium text-foreground">Prop</th>
            <th className="px-2 py-1.5 font-medium text-foreground">Control</th>
            <th className="px-2 py-1.5 font-medium text-foreground">Options</th>
            <th className="px-2 py-1.5 font-medium text-foreground">Default</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, argType]) => (
            <tr key={name} className="border-b border-border last:border-0">
              <td className="px-2 py-1.5 font-mono text-foreground">{name}</td>
              <td className="px-2 py-1.5 text-muted-foreground">
                {controlLabel(argType)}
              </td>
              <td className="px-2 py-1.5 text-muted-foreground">
                {argType.options?.join(", ") ?? "—"}
              </td>
              <td className="px-2 py-1.5 text-muted-foreground">
                {argType.table?.defaultValue?.summary ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MdxContent({
  Component,
}: {
  Component: ComponentType<Record<string, unknown>>;
}) {
  return (
    <div className="design-lab-docs prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-strong:text-foreground prose-li:text-muted-foreground">
      <Component />
    </div>
  );
}

export function DocsInspector({
  selection,
  selectedItem,
  docsMeta,
  docsCatalog,
}: DocsInspectorProps) {
  if (selection.groupId !== "components" || !selectedItem) {
    return (
      <p className="text-xs text-muted-foreground">
        컴포넌트를 선택하면 문서와 props 테이블이 표시됩니다.
      </p>
    );
  }

  const meta = docsMeta.get(selectedItem.id);
  const docs = docsCatalog.get(selectedItem.id);
  const hasAutodocs = meta?.tags?.includes("autodocs");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {selectedItem.label}
        </h3>
        {meta?.title && (
          <p className="mt-0.5 font-mono text-[0.625rem] text-muted-foreground">
            {meta.title}
          </p>
        )}
        {hasAutodocs && (
          <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[0.625rem] text-muted-foreground">
            autodocs
          </span>
        )}
      </div>

      {meta?.argTypes && Object.keys(meta.argTypes).length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium text-foreground">Props</h4>
          <PropsTable argTypes={meta.argTypes} />
        </div>
      )}

      <div>
        <h4 className="mb-2 text-xs font-medium text-foreground">Documentation</h4>
        {docs ? (
          <MdxContent Component={docs.Component} />
        ) : (
          <p className="text-xs text-muted-foreground">
            {hasAutodocs
              ? "MDX 문서가 없습니다. `{component}.docs.mdx` 파일을 추가하세요."
              : "이 컴포넌트에 연결된 문서가 없습니다."}
          </p>
        )}
      </div>
    </div>
  );
}
