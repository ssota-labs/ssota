"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ssota/ui/components/ui/sheet";

export type WorkflowLensNode = {
  id: string;
  nodeType: string;
  title: string;
  lifecycleStatus: string;
  canonicalUrl: string;
  content: string;
  updatedAt: string;
  properties: Record<string, unknown>;
};

export type WorkflowLensType = {
  nodeType: string;
  label: string;
  slug: string;
  description: string;
  rows: WorkflowLensNode[];
  tableHref: string;
};

export type WorkflowLensPhase = {
  key: string;
  title: string;
  description: string;
  types: WorkflowLensType[];
};

type WorkflowLensProps = {
  phases: WorkflowLensPhase[];
};

export function WorkflowLens({ phases }: WorkflowLensProps) {
  const [selected, setSelected] = useState<WorkflowLensType | null>(null);

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-7">
        {phases.map((phase) => (
          <section key={phase.key} className="space-y-3">
            <div className="min-h-24 rounded-lg border bg-muted/30 p-3">
              <div className="text-sm font-semibold">{phase.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {phase.description}
              </p>
            </div>
            <div className="space-y-3">
              {phase.types.length === 0 ? (
                <Card>
                  <CardContent className="p-3 text-xs text-muted-foreground">
                    No catalog types in this phase yet.
                  </CardContent>
                </Card>
              ) : (
                phase.types.map((type) => (
                  <button
                    key={type.nodeType}
                    type="button"
                    onClick={() => setSelected(type)}
                    className="w-full rounded-lg text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Card>
                      <CardHeader className="space-y-2 p-3">
                        <CardTitle className="text-sm">{type.label}</CardTitle>
                        <CardDescription className="line-clamp-2 text-xs">
                          {type.description}
                        </CardDescription>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary">{type.rows.length} rows</Badge>
                          <span className="text-xs text-muted-foreground">
                            Open
                          </span>
                        </div>
                      </CardHeader>
                    </Card>
                  </button>
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-2xl">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.label}</SheetTitle>
                <SheetDescription>{selected.description}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{selected.nodeType}</Badge>
                  <Badge variant="outline">{selected.rows.length} rows</Badge>
                  <Button
                    render={<Link href={selected.tableHref} />}
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                  >
                    Open table
                  </Button>
                </div>

                {selected.rows.length === 0 ? (
                  <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                    No nodes yet. Create one from the Graph table or through an
                    action contract.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selected.rows.map((row) => (
                      <div key={row.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium">{row.title}</div>
                            <div className="mt-1 font-mono text-xs text-muted-foreground">
                              {row.id}
                            </div>
                          </div>
                          <Badge variant="outline">{row.lifecycleStatus}</Badge>
                        </div>
                        {row.content ? (
                          <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                            {row.content}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {row.canonicalUrl ? (
                            <Button
                              render={<Link href={row.canonicalUrl} />}
                              variant="outline"
                              size="sm"
                              nativeButton={false}
                            >
                              Open document
                            </Button>
                          ) : null}
                          <Badge variant="secondary">
                            Updated {row.updatedAt.slice(0, 10)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
