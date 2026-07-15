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

  // flex-1/min-h-0으로 뷰포트 높이에 잠그지 않는다 — 부모 ConsolePageFrame의
  // overflow-y-auto가 페이지 스크롤을 담당한다 (roadmap과 동일).
  return (
    <Tabs defaultValue={active} className="flex w-full flex-col">
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
          className="mt-0 flex flex-col pt-0"
        >
          {runtime?.renderElement(item.panel) ?? null}
        </TabsContent>
      ))}
    </Tabs>
  );
}
