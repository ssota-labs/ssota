"use client";

import { useSearchParams } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ssota/ui/components/ui/tabs";
import { useJsonRender, usePageHoistedTabs } from "../context";

export type TabItemDef = {
  value: string;
  label: string;
  /** Element id rendered inside this tab panel. */
  panel: string;
};

export function TabsEl({
  defaultValue,
  items,
  variant = "line",
}: {
  defaultValue?: string;
  items: TabItemDef[];
  variant?: "default" | "line";
}) {
  const runtime = useJsonRender();
  const hoisted = usePageHoistedTabs();
  const searchParams = useSearchParams();

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">Tabs: no items configured.</p>
    );
  }

  const fallback = defaultValue ?? items[0]?.value ?? "";
  const tabParam = searchParams.get("tab");
  const active =
    hoisted && tabParam && items.some((item) => item.value === tabParam)
      ? tabParam
      : fallback;

  return (
    <Tabs
      value={active}
      className="flex min-h-0 w-full flex-1 flex-col"
    >
      {!hoisted ? (
        <TabsList variant={variant}>
          {items.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      ) : null}
      {items.map((item) => (
        <TabsContent
          key={item.value}
          value={item.value}
          className={hoisted ? "flex min-h-0 flex-1 flex-col" : "flex min-h-0 flex-1 flex-col pt-4"}
        >
          {runtime?.renderElement(item.panel) ?? null}
        </TabsContent>
      ))}
    </Tabs>
  );
}
