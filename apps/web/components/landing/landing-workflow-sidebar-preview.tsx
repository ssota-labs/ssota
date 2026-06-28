"use client";

import { ConsolePreview } from "@/components/onboarding/console-preview";
import { DEFAULT_TEMPLATE_ID } from "@/components/onboarding/console-preview-provisioning";

/** 온보딩 우측 미리보기와 동일한 SWDL 시드 사이드바 — 좌측 확대·overflow clip */
export function LandingWorkflowSidebarPreview() {
  return (
    <div className="relative h-[24rem] overflow-hidden bg-muted/10 md:h-[28rem]">
      <div className="absolute top-0 left-0 w-[128%] min-w-[44rem] origin-left scale-[1.06]">
        <div className="overflow-hidden rounded-xl border border-border bg-background shadow-lg">
          <ConsolePreview
            organizationName="SSOTA Labs"
            projectName="ssota-dev"
            templateId={DEFAULT_TEMPLATE_ID}
            forceWorkflowComplete
          />
        </div>
      </div>
    </div>
  );
}
