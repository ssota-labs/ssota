"use client";

import type { ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { Button } from "@loopos/ui/components/ui/button";
import { cn } from "@loopos/ui/lib/utils";
import type { EdgeCatalogEntry, NodeCatalogEntry } from "@loopos/core";
import { useSlidePanel } from "./use-slide-panel";

export type SchemaPanelSelection =
  | { kind: "node"; entry: NodeCatalogEntry }
  | { kind: "edge"; entry: EdgeCatalogEntry }
  | null;

type SchemaDetailPanelProps = {
  selection: SchemaPanelSelection;
  onClose: () => void;
};

export function SchemaDetailPanel({ selection, onClose }: SchemaDetailPanelProps) {
  const isOpen = selection !== null;
  const { shouldRender, isAnimating } = useSlidePanel(isOpen);

  if (!shouldRender || !selection) return null;

  return (
    <div
      className={cn(
        "absolute bottom-0 right-0 z-50 h-full w-full border-l border-t border-border bg-background/95 shadow-2xl backdrop-blur-md md:h-[90%] md:w-[50%] md:rounded-tl-lg",
        isAnimating ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
      )}
      style={{
        transition:
          "all 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease-out, opacity 0.3s ease-out",
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {selection.kind === "node" ? "Node definition" : "Edge definition"}
            </p>
            <h2 className="text-sm font-semibold">{selection.entry.label}</h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close panel">
            <X className="size-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {selection.kind === "node" ? (
            <NodeDefinitionContent entry={selection.entry} />
          ) : (
            <EdgeDefinitionContent entry={selection.entry} />
          )}
        </div>
      </div>
    </div>
  );
}

function DefinitionSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-xs font-medium text-muted-foreground">{title}</h3>
      <div className="text-sm text-foreground">{children}</div>
    </section>
  );
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground">—</p>;
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-xs"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function NodeDefinitionContent({ entry }: { entry: NodeCatalogEntry }) {
  const lifecycleKeys = Object.keys(entry.lifecycleTransitions);

  return (
    <>
      <DefinitionSection title="Key">
        <p className="font-mono">{entry.nodeType}</p>
      </DefinitionSection>
      <DefinitionSection title="Family · Archetype">
        <p>
          {entry.family} · <span className="font-mono">{entry.archetypeId}</span>
        </p>
      </DefinitionSection>
      {entry.contentGuide ? (
        <DefinitionSection title="Content guide">
          <p className="whitespace-pre-wrap text-muted-foreground">{entry.contentGuide}</p>
        </DefinitionSection>
      ) : null}
      <DefinitionSection title="Properties">
        <TagList items={entry.propertyRefs} />
      </DefinitionSection>
      <DefinitionSection title="Allowed actions">
        <TagList items={entry.allowedActionRefs} />
      </DefinitionSection>
      <DefinitionSection title="Lifecycle transitions">
        {lifecycleKeys.length === 0 ? (
          <p className="text-muted-foreground">—</p>
        ) : (
          <ul className="space-y-1.5">
            {lifecycleKeys.map((status) => {
              const transitions =
                entry.lifecycleTransitions[
                  status as keyof typeof entry.lifecycleTransitions
                ] ?? [];
              return (
                <li key={status} className="font-mono text-xs">
                  <span className="text-foreground">{status}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span>{transitions.join(", ") || "—"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </DefinitionSection>
    </>
  );
}

function EdgeDefinitionContent({ entry }: { entry: EdgeCatalogEntry }) {
  return (
    <>
      <DefinitionSection title="Key">
        <p className="font-mono">{entry.edgeType}</p>
      </DefinitionSection>
      <DefinitionSection title="Source node types (domain)">
        <TagList items={entry.domain} />
      </DefinitionSection>
      <DefinitionSection title="Target node types (range)">
        <TagList items={entry.range} />
      </DefinitionSection>
      <DefinitionSection title="Cardinality">
        <p>{entry.cardinality}</p>
      </DefinitionSection>
      <DefinitionSection title="Representation">
        <p>{entry.representation}</p>
      </DefinitionSection>
    </>
  );
}
