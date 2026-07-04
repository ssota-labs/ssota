"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ssota/ui/components/ui/tabs";
import { useJsonRender } from "../context";

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
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">Tabs: no items configured.</p>
    );
  }

  const active = defaultValue ?? items[0]?.value ?? "";

  return (
    <Tabs defaultValue={active} className="flex min-h-0 w-full flex-1 flex-col">
      <TabsList variant={variant}>
        {items.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent
          key={item.value}
          value={item.value}
          className="flex min-h-0 flex-1 flex-col pt-4"
        >
          {runtime?.renderElement(item.panel) ?? null}
        </TabsContent>
      ))}
    </Tabs>
  );
}
