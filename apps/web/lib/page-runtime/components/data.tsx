import Link from "next/link";
import { Badge } from "@ssota/ui/components/ui/badge";
import { useBasePath } from "../context";
import { boundNodes } from "../bindings";
import type { CatalogComponent, RenderNode } from "../types";

function NodeTableEl({
  nodes,
  columns,
  rowHref,
  title,
}: {
  nodes: RenderNode[];
  columns: { key: string; header: string }[];
  rowHref?: string;
  title?: string;
}) {
  const basePath = useBasePath();
  const cols = columns.length ? columns : [{ key: "title", header: "Title" }];
  const cell = (node: RenderNode, key: string) =>
    key === "title"
      ? node.title
      : String((node.properties as Record<string, unknown>)?.[key] ?? "—");
  return (
    <div className="space-y-2">
      {title ? <h2 className="text-sm font-medium">{title}</h2> : null}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-muted-foreground text-left">
            {cols.map((c) => (
              <th key={c.key} className="border-b px-2 py-1 font-medium">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => (
            <tr key={node.id} className="hover:bg-muted/40">
              {cols.map((c, i) => (
                <td key={c.key} className="border-b px-2 py-1">
                  {i === 0 && rowHref ? (
                    <Link
                      href={`${basePath}/${rowHref}/${node.id}`}
                      className="text-foreground hover:underline"
                    >
                      {cell(node, c.key)}
                    </Link>
                  ) : (
                    cell(node, c.key)
                  )}
                </td>
              ))}
            </tr>
          ))}
          {nodes.length === 0 ? (
            <tr>
              <td colSpan={cols.length} className="text-muted-foreground px-2 py-2">
                No rows
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

/** Components that read graph data via bindings. */
export const dataComponents: Record<string, CatalogComponent> = {
  NodeList: ({ props, bindingData }) => {
    const rows = boundNodes(bindingData, props);
    return (
      <div className="space-y-2">
        {props.title ? (
          <h2 className="text-sm font-medium">{String(props.title)}</h2>
        ) : null}
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="border-border rounded-md border px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{row.title}</span>
                <Badge variant="outline">{row.catalogKey}</Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {String(row.properties.lifecycleStatus ?? "—")}
              </p>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="text-muted-foreground text-sm">No rows</li>
          ) : null}
        </ul>
      </div>
    );
  },
  NodeTable: ({ props, bindingData }) => (
    <NodeTableEl
      nodes={boundNodes(bindingData, props)}
      columns={
        Array.isArray(props.columns)
          ? (props.columns as { key: string; header: string }[])
          : []
      }
      rowHref={typeof props.rowHref === "string" ? props.rowHref : undefined}
      title={props.title ? String(props.title) : undefined}
    />
  ),
  NodeField: ({ props }) => (
    <div className="text-sm">
      <span className="text-muted-foreground">{String(props.label)}: </span>
      <span>{String(props.value ?? "—")}</span>
    </div>
  ),
  NodeDocument: () => (
    <div className="bg-muted/40 rounded-md border p-4 text-sm">
      Document preview (mock)
    </div>
  ),
};
