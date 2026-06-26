"use client";

import * as React from "react";
import { CaretRightIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { boundNode } from "../bindings";
import {
  coerceSchemaDoc,
  methodBadgeClass,
  pathSegments,
  type ApiEndpoint,
  type SchemaProperty,
  type SchemaResponse,
} from "../schema-doc";
import type { CatalogComponent } from "../types";

/**
 * A rich REST-API reference: a list of collapsible endpoint rows, each with a
 * color-coded method badge, a path (parameters highlighted), an optional auth
 * lock + status tag, a parameter table, a recursive request-body schema, and a
 * response list. Domain-agnostic — the schema is supplied via props (`endpoints`)
 * or read from a bound node property.
 */

function MethodBadge({ method }: { method: ApiEndpoint["method"] }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide",
        methodBadgeClass(method),
      )}
    >
      {method}
    </span>
  );
}

function PathLabel({ path }: { path: string }) {
  return (
    <span className="font-mono text-xs">
      {pathSegments(path).map((seg, i) => (
        <span
          key={i}
          className={seg.param ? "text-primary font-medium" : "text-foreground"}
        >
          {seg.text}
        </span>
      ))}
    </span>
  );
}

function RequiredTag({ required }: { required?: boolean }) {
  return required ? (
    <span className="text-red-500 dark:text-red-400">required</span>
  ) : (
    <span className="text-muted-foreground/70">optional</span>
  );
}

/** Recursive request/response property tree (objects nest, arrays show items). */
function PropertyRow({
  prop,
  depth,
}: {
  prop: SchemaProperty;
  depth: number;
}) {
  const children = prop.properties ?? prop.items;
  const isArray = !!prop.items && !prop.properties;
  return (
    <>
      <div
        className="hover:bg-muted/40 flex items-baseline gap-2 rounded px-2 py-1"
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <code className="text-foreground text-xs font-medium">{prop.name}</code>
        {prop.type ? (
          <span className="text-muted-foreground font-mono text-[11px]">
            {prop.type}
            {isArray ? "[]" : ""}
          </span>
        ) : null}
        {prop.required ? (
          <span className="text-[10px] text-red-500 dark:text-red-400">required</span>
        ) : null}
        {prop.description ? (
          <span className="text-muted-foreground ml-auto truncate text-[11px]">
            {prop.description}
          </span>
        ) : null}
      </div>
      {children?.map((child) => (
        <PropertyRow key={child.name} prop={child} depth={depth + 1} />
      ))}
    </>
  );
}

function ParameterTable({ params }: { params: NonNullable<ApiEndpoint["parameters"]> }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            {["Name", "In", "Type", "Required", "Description"].map((h) => (
              <th key={h} className="px-2.5 py-1.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={`${p.in}-${p.name}`} className="border-t">
              <td className="px-2.5 py-1.5">
                <code className="text-foreground font-medium">{p.name}</code>
              </td>
              <td className="px-2.5 py-1.5">
                <span className="bg-muted text-muted-foreground inline-flex rounded px-1.5 py-0.5 font-mono text-[10px]">
                  {p.in}
                </span>
              </td>
              <td className="text-muted-foreground px-2.5 py-1.5 font-mono">
                {p.type ?? "—"}
              </td>
              <td className="px-2.5 py-1.5 text-[11px]">
                <RequiredTag required={p.required} />
              </td>
              <td className="text-muted-foreground px-2.5 py-1.5">
                {p.description ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResponseRow({ res }: { res: SchemaResponse }) {
  const ok = /^2/.test(res.status);
  const redirect = /^3/.test(res.status);
  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold",
            ok
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : redirect
                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
          )}
        >
          {res.status}
        </span>
        {res.shape ? (
          <code className="text-muted-foreground font-mono text-[11px]">
            {res.shape}
          </code>
        ) : res.description ? (
          <span className="text-muted-foreground text-xs">{res.description}</span>
        ) : null}
      </div>
      {res.body?.length ? (
        <div className="border-t py-1">
          {res.body.map((p) => (
            <PropertyRow key={p.name} prop={p} depth={0} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
      {children}
    </div>
  );
}

function EndpointRow({ endpoint }: { endpoint: ApiEndpoint }) {
  const [open, setOpen] = React.useState(endpoint.defaultOpen ?? false);
  const hasDetail =
    (endpoint.parameters?.length ?? 0) > 0 ||
    (endpoint.requestBody?.length ?? 0) > 0 ||
    (endpoint.responses?.length ?? 0) > 0;

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2.5 px-3 py-2.5 text-left",
          hasDetail && "hover:bg-muted/40",
        )}
      >
        <CaretRightIcon
          className={cn(
            "text-muted-foreground size-3 shrink-0 transition-transform",
            !hasDetail && "opacity-0",
            open && "rotate-90",
          )}
        />
        <MethodBadge method={endpoint.method} />
        <PathLabel path={endpoint.path} />
        {endpoint.tag ? (
          <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide">
            {endpoint.tag}
          </span>
        ) : null}
        {endpoint.summary ? (
          <span className="text-muted-foreground truncate text-xs">
            {endpoint.summary}
          </span>
        ) : null}
        {endpoint.auth ? (
          <LockSimpleIcon
            className="text-muted-foreground ml-auto size-3.5 shrink-0"
            aria-label={`Auth: ${endpoint.auth}`}
          />
        ) : null}
      </button>

      {open && hasDetail ? (
        <div className="space-y-3 border-t px-3 py-3">
          {endpoint.description ? (
            <p className="text-muted-foreground text-xs">{endpoint.description}</p>
          ) : null}
          {endpoint.auth ? (
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <LockSimpleIcon className="size-3.5" />
              <span className="font-medium">Auth:</span> {endpoint.auth}
            </div>
          ) : null}
          {endpoint.parameters?.length ? (
            <div className="space-y-1.5">
              <SectionLabel>Parameters</SectionLabel>
              <ParameterTable params={endpoint.parameters} />
            </div>
          ) : null}
          {endpoint.requestBody?.length ? (
            <div className="space-y-1.5">
              <SectionLabel>Request Body</SectionLabel>
              <div className="rounded-md border py-1">
                {endpoint.requestBody.map((p) => (
                  <PropertyRow key={p.name} prop={p} depth={0} />
                ))}
              </div>
            </div>
          ) : null}
          {endpoint.responses?.length ? (
            <div className="space-y-1.5">
              <SectionLabel>Responses</SectionLabel>
              <div className="space-y-1.5">
                {endpoint.responses.map((r) => (
                  <ResponseRow key={r.status} res={r} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const schemaDisplayComponents: Record<string, CatalogComponent> = {
  SchemaDisplay: ({ props, bindingData }) => {
    // Data from a bound node property, else inline `endpoints`/`method`+`path`.
    const node = boundNode(bindingData, props);
    const property =
      typeof props.property === "string" ? props.property : "endpoints";
    const raw = node ? node.properties?.[property] : (props.endpoints ?? props);
    const doc = coerceSchemaDoc(raw);

    if (doc.endpoints.length === 0) {
      return (
        <div className="text-muted-foreground border-border rounded border border-dashed p-4 text-xs">
          SchemaDisplay: no endpoints to display.
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {typeof props.title === "string" ? (
          <h3 className="text-sm font-semibold">{props.title}</h3>
        ) : null}
        {doc.endpoints.map((ep) => (
          <EndpointRow key={ep.id} endpoint={ep} />
        ))}
      </div>
    );
  },
};
