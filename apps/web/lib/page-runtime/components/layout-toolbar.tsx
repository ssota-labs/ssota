"use client";

import { useState } from "react";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { useAction } from "../context";

export type ToolbarActionDef = {
  label: string;
  action: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
};

export function ToolbarEl({
  title,
  searchPlaceholder,
  actions = [],
}: {
  title?: string;
  searchPlaceholder?: string;
  actions?: ToolbarActionDef[];
}) {
  const onAction = useAction();
  const [query, setQuery] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  return (
    <div
      className="border-border bg-card mb-4 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid="catalog-toolbar"
    >
      <div className="min-w-0 flex-1 space-y-2">
        {title ? <h2 className="text-sm font-medium">{title}</h2> : null}
        {searchPlaceholder ? (
          <Input
            type="search"
            value={query}
            placeholder={searchPlaceholder}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && onAction) {
                void onAction("search", { query });
              }
            }}
            className="max-w-sm"
            aria-label={searchPlaceholder}
          />
        ) : null}
      </div>
      {actions.length > 0 ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions.map((item) => {
            const disabled = !onAction || pendingAction === item.action;
            return (
              <Button
                key={item.action}
                type="button"
                size="sm"
                variant={item.variant ?? "default"}
                disabled={disabled}
                onClick={async () => {
                  if (!onAction) return;
                  setPendingAction(item.action);
                  try {
                    await onAction(item.action, { query });
                  } finally {
                    setPendingAction(null);
                  }
                }}
              >
                {pendingAction === item.action ? "…" : item.label}
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
