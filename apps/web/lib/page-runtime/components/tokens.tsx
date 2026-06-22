"use client";

import { useRef, useState } from "react";
import { useAction } from "../context";
import { boundNode } from "../bindings";
import type { CatalogComponent, TokenDef } from "../types";

function TokenFieldEl({
  def,
  value,
  onChange,
}: {
  def: TokenDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const label = def.label ?? def.name;
  if (def.kind === "color") {
    return (
      <label className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs">{label}</span>
        <div className="flex items-center gap-2">
          <span
            className="border-border size-8 shrink-0 rounded-md border"
            style={{ backgroundColor: value || undefined }}
          />
          <input
            className="border-border w-full rounded-md border px-2 py-1 font-mono text-xs"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </label>
    );
  }
  if (def.kind === "select") {
    return (
      <label className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs">{label}</span>
        <select
          className="border-border w-full rounded-md border px-2 py-1 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {(def.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <input
        className="border-border w-full rounded-md border px-2 py-1 font-mono text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Token grid bound to an action; debounced, sends the full token map `{ tokens }`. */
function TokenListEl({
  actionKey,
  manifest,
  initial,
}: {
  actionKey?: string;
  manifest: TokenDef[];
  initial: Record<string, string>;
}) {
  const onAction = useAction();
  const [map, setMap] = useState<Record<string, string>>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const set = (name: string, value: string) => {
    setMap((prev) => {
      const next = { ...prev, [name]: value };
      if (onAction && actionKey) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          void onAction(actionKey, { tokens: next });
        }, 500);
      }
      return next;
    });
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {manifest.map((t) => (
        <TokenFieldEl
          key={t.name}
          def={t}
          value={map[t.name] ?? ""}
          onChange={(v) => set(t.name, v)}
        />
      ))}
    </div>
  );
}

export const tokenComponents: Record<string, CatalogComponent> = {
  TokenList: ({ props, bindingData }) => {
    const node = boundNode(bindingData, props);
    const field = typeof props.field === "string" ? props.field : "tokens";
    const stored = (node?.properties?.[field] ?? {}) as Record<string, string>;
    const manifest = Array.isArray(props.manifest)
      ? (props.manifest as TokenDef[])
      : [];
    const initial: Record<string, string> = {};
    for (const t of manifest) initial[t.name] = stored[t.name] ?? "";
    return (
      <TokenListEl
        actionKey={typeof props.action === "string" ? props.action : undefined}
        manifest={manifest}
        initial={initial}
      />
    );
  },
};
