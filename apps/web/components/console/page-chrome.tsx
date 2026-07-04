import type { ReactNode } from "react";
import { ConsolePageFrame } from "@/components/console/console-page-frame";
import { PageSiblingNav } from "@/components/console/page-sibling-nav";
import type { PageSiblingNavData } from "@/lib/console/page-sibling-nav";
import { pageUsesArtifactWorkbench } from "@/lib/page-runtime/spec-utils";
import type { JsonRenderSpec } from "@ssota/contracts";

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

  return (
    <div data-testid={testId}>
      {siblingNav ? <PageSiblingNav {...siblingNav} /> : null}
      <ConsolePageFrame
        fullWidth={usesWorkbench}
        fillHeight={!usesWorkbench}
        contentClassName={siblingNav ? "gap-6 pt-2" : "gap-6"}
      >
        {children}
      </ConsolePageFrame>
    </div>
  );
}
