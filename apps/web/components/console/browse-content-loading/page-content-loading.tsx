import type { JsonRenderSpec } from "@ssota/contracts";
import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import { ConsolePageFrame } from "@/components/console/console-page-frame";
import { resolveOrgPage } from "@/lib/console/resolve-org-page";

function PageSpecSkeleton({ spec }: { spec: JsonRenderSpec }) {
  const elements = Object.values(spec.elements);
  const hasTable = elements.some((el) => el.type === "DataTable");
  const hasEditor = elements.some(
    (el) => el.type === "DocumentEditor" || el.type === "RichTextEditor",
  );
  const hasWorkbench = elements.some(
    (el) => el.type === "ArtifactWorkbench" || el.type === "ComponentStudio",
  );

  if (hasWorkbench) {
    return (
      <div className="flex min-h-[24rem] flex-col gap-3 rounded-lg border bg-card p-4">
        <Skeleton className="h-8 w-48 rounded-sm" />
        <Skeleton className="min-h-[18rem] flex-1 rounded-md" />
      </div>
    );
  }

  if (hasTable) {
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

  if (hasEditor) {
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

  return (
    <div className="space-y-3">
      {Array.from({ length: Math.min(elements.length || 3, 4) }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
}

type PageContentLoadingProps = {
  params: Promise<{ orgSlug: string; teamspaceSlug: string; pageId: string }>;
};

/** Phase-2 Suspense fallback for json-render tree pages. */
export async function PageContentLoading({ params }: PageContentLoadingProps) {
  const { orgSlug, pageId } = await params;
  const { page } = await resolveOrgPage(orgSlug, pageId);

  return (
    <div data-testid="content-loading-page">
      <ConsolePageFrame contentClassName="gap-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
          <Skeleton className="h-4 w-48 max-w-full rounded-sm" />
        </header>
        <PageSpecSkeleton spec={page.spec} />
      </ConsolePageFrame>
    </div>
  );
}

type NodePageContentLoadingProps = {
  params: Promise<{
    orgSlug: string;
    teamspaceSlug: string;
    nodeId: string;
    pageId: string;
  }>;
};

/** Phase-2 Suspense fallback for node drill-in template pages. */
export async function NodePageContentLoading({
  params,
}: NodePageContentLoadingProps) {
  const { orgSlug, pageId } = await params;
  const { page } = await resolveOrgPage(orgSlug, pageId);

  return (
    <div data-testid="content-loading-node-page">
      <ConsolePageFrame contentClassName="gap-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
          <Skeleton className="h-4 w-56 max-w-full rounded-sm" />
        </header>
        <PageSpecSkeleton spec={page.spec} />
      </ConsolePageFrame>
    </div>
  );
}
