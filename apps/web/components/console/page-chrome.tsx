import type { ReactNode } from "react";
import { ConsolePageFrame } from "@/components/console/console-page-frame";
import { PageSiblingNav } from "@/components/console/page-sibling-nav";
import type { PageSiblingNavData } from "@/lib/console/page-sibling-nav";
import { pageUsesArtifactWorkbench } from "@/lib/page-runtime/spec-utils";
import type { JsonRenderSpec } from "@ssota/contracts";
import { cn } from "@ssota/ui/lib/utils";

type PageChromeProps = {
  spec: JsonRenderSpec;
  siblingNav?: PageSiblingNavData | null;
  children: ReactNode;
  testId?: string;
};

/** Shared chrome for json-render pages (loaded + loading). */
export function PageChrome({
  spec,
  siblingNav,
  children,
  testId,
}: PageChromeProps) {
  const usesWorkbench = pageUsesArtifactWorkbench(spec);

  // Workbench: 프레임이 뷰포트를 채우고 내부 패널이 스크롤.
  // Browse(Goals·Roadmap 등): overflow-y-auto로 페이지 스크롤.
  // 이전 fillHeight={!usesWorkbench}는 비워크벤치에서 overflow-hidden + Tabs
  // flex-1 잠금과 겹쳐 스크롤이 막혔다.
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      data-testid={testId}
    >
      {siblingNav ? <PageSiblingNav {...siblingNav} /> : null}
      <ConsolePageFrame
        fullWidth={usesWorkbench}
        fillHeight={usesWorkbench}
        contentClassName={cn(
          "gap-6",
          // ConsolePageFrame 기본 pt-4/pb-6 제거 — sibling nav 아래 flush
          !usesWorkbench && "pt-0 pb-0",
        )}
      >
        {children}
      </ConsolePageFrame>
    </div>
  );
}
