import type { JsonRenderSpec } from "@ssota/contracts";
import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@ssota/ui/components/ui/tabs";
import {
  SectionHeaderStatic,
  SegmentedListSkeleton,
} from "@/components/console/route-loaders";

type SpecElement = JsonRenderSpec["elements"][string];

type TabItem = { value: string; label: string; panel: string };

function specElements(spec: JsonRenderSpec): SpecElement[] {
  return Object.values(spec.elements);
}

function findElementByType(
  spec: JsonRenderSpec,
  type: string,
): SpecElement | undefined {
  return specElements(spec).find((element) => element.type === type);
}

function readStringProp(props: Record<string, unknown> | undefined, key: string) {
  const value = props?.[key];
  return typeof value === "string" ? value : undefined;
}

function readTabItems(props: Record<string, unknown> | undefined): TabItem[] {
  const raw = props?.items;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const value = typeof record.value === "string" ? record.value : undefined;
    const label = typeof record.label === "string" ? record.label : undefined;
    const panel = typeof record.panel === "string" ? record.panel : undefined;
    if (!value || !label || !panel) return [];
    return [{ value, label, panel }];
  });
}

function childTypesForElement(
  spec: JsonRenderSpec,
  element: SpecElement | undefined,
): string[] {
  if (!element) return [];
  if (element.children?.length) {
    return element.children.map(
      (childId: string) => spec.elements[childId]?.type ?? "unknown",
    );
  }
  return [element.type];
}

function SectionContentSkeleton({ childTypes }: { childTypes: string[] }) {
  if (childTypes.includes("DocumentCardListSheet")) {
    return <SegmentedListSkeleton rows={4} row="card" />;
  }

  if (childTypes.includes("DataTable")) {
    return (
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (
    childTypes.some(
      (type) => type === "DocumentEditor" || type === "RichTextEditor",
    )
  ) {
    return (
      <div className="space-y-3 rounded-lg border bg-card p-6">
        <Skeleton className="h-7 w-2/3 max-w-md rounded-sm" />
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-4 w-full rounded-sm" />
        ))}
        <Skeleton className="h-4 w-[85%] rounded-sm" />
      </div>
    );
  }

  return <SegmentedListSkeleton rows={3} />;
}

/** 로딩 크롬 — 실제 TabsEl(`variant="line"`)과 동일한 TabsList 톤. */
function TabsBarStatic({
  items,
  activeValue,
}: {
  items: TabItem[];
  activeValue: string;
}) {
  if (items.length === 0) return null;

  return (
    <Tabs
      value={activeValue}
      className="pointer-events-none flex w-fit flex-col"
      aria-hidden
    >
      <TabsList variant="line">
        {items.map((item) => (
          <TabsTrigger key={item.value} value={item.value} tabIndex={-1}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Binding-backed content skeleton derived from a page spec tree. */
export function PageSpecContentSkeleton({ spec }: { spec: JsonRenderSpec }) {
  const elements = specElements(spec);
  const hasWorkbench = elements.some(
    (element) =>
      element.type === "ArtifactWorkbench" || element.type === "ComponentStudio",
  );

  if (hasWorkbench) {
    return (
      <div className="flex min-h-[24rem] flex-col gap-3 rounded-lg border bg-card p-4">
        <Skeleton className="h-8 w-48 rounded-sm" />
        <Skeleton className="min-h-[18rem] flex-1 rounded-md" />
      </div>
    );
  }

  const tabs = findElementByType(spec, "Tabs");
  if (tabs) {
    const items = readTabItems(tabs.props);
    const activeValue =
      readStringProp(tabs.props, "defaultValue") ?? items[0]?.value ?? "";
    const activePanelId = items.find((item) => item.value === activeValue)?.panel;
    const panelElement = activePanelId ? spec.elements[activePanelId] : undefined;
    const panelChildTypes = childTypesForElement(spec, panelElement);

    return (
      <div className="space-y-4">
        <TabsBarStatic items={items} activeValue={activeValue} />
        <SectionContentSkeleton childTypes={panelChildTypes} />
      </div>
    );
  }

  const section = findElementByType(spec, "Section");
  if (section) {
    const title = readStringProp(section.props, "title");
    const subtitle = readStringProp(section.props, "subtitle");
    const childTypes =
      section.children?.map(
        (childId: string) => spec.elements[childId]?.type ?? "unknown",
      ) ?? [];

    return (
      <section className="flex min-h-0 flex-1 flex-col gap-3">
        {title ? (
          <SectionHeaderStatic title={title} subtitle={subtitle} />
        ) : null}
        <SectionContentSkeleton childTypes={childTypes} />
      </section>
    );
  }

  const hasTable = elements.some((element) => element.type === "DataTable");
  if (hasTable) {
    return <SectionContentSkeleton childTypes={["DataTable"]} />;
  }

  const hasEditor = elements.some(
    (element) =>
      element.type === "DocumentEditor" || element.type === "RichTextEditor",
  );
  if (hasEditor) {
    return <SectionContentSkeleton childTypes={["DocumentEditor"]} />;
  }

  const hasCardList = elements.some(
    (element) =>
      element.type === "DocumentCardListSheet" || element.type === "CardListSheet",
  );
  if (hasCardList) {
    return <SegmentedListSkeleton rows={4} row="card" />;
  }

  return <SegmentedListSkeleton rows={Math.min(elements.length || 3, 4)} />;
}
