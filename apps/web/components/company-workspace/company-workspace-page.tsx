"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ssota/ui/components/ui/empty";
import { useLocale } from "@/components/i18n/locale-provider";
import type { CompanyWorkspacePageId } from "@/lib/company-workspace/navigation";

const PAGE_COPY: Record<
  CompanyWorkspacePageId,
  { titleKey: string; emptyTitleKey: string; emptyDescriptionKey: string }
> = {
  home: {
    titleKey: "nav.home",
    emptyTitleKey: "companyWorkspace.homeEmptyTitle",
    emptyDescriptionKey: "companyWorkspace.homeEmptyDescription",
  },
  requests: {
    titleKey: "nav.requests",
    emptyTitleKey: "companyWorkspace.requestsEmptyTitle",
    emptyDescriptionKey: "companyWorkspace.requestsEmptyDescription",
  },
  engagements: {
    titleKey: "nav.engagements",
    emptyTitleKey: "companyWorkspace.engagementsEmptyTitle",
    emptyDescriptionKey: "companyWorkspace.engagementsEmptyDescription",
  },
  reports: {
    titleKey: "nav.reports",
    emptyTitleKey: "companyWorkspace.reportsEmptyTitle",
    emptyDescriptionKey: "companyWorkspace.reportsEmptyDescription",
  },
  documents: {
    titleKey: "nav.documents",
    emptyTitleKey: "companyWorkspace.documentsEmptyTitle",
    emptyDescriptionKey: "companyWorkspace.documentsEmptyDescription",
  },
  "company-data": {
    titleKey: "nav.companyData",
    emptyTitleKey: "companyWorkspace.companyDataEmptyTitle",
    emptyDescriptionKey: "companyWorkspace.companyDataEmptyDescription",
  },
  portfolio: {
    titleKey: "nav.clientPortfolio",
    emptyTitleKey: "companyWorkspace.portfolioEmptyTitle",
    emptyDescriptionKey: "companyWorkspace.portfolioEmptyDescription",
  },
  "review-queue": {
    titleKey: "nav.reviewQueue",
    emptyTitleKey: "companyWorkspace.reviewQueueEmptyTitle",
    emptyDescriptionKey: "companyWorkspace.reviewQueueEmptyDescription",
  },
  workspace: {
    titleKey: "nav.engagementWorkspace",
    emptyTitleKey: "companyWorkspace.workspaceEmptyTitle",
    emptyDescriptionKey: "companyWorkspace.workspaceEmptyDescription",
  },
};

export function CompanyWorkspacePage({
  pageId,
}: {
  pageId: CompanyWorkspacePageId;
}) {
  const { t } = useLocale();
  const copy = PAGE_COPY[pageId];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">{t(copy.titleKey)}</h1>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t(copy.emptyTitleKey)}</EmptyTitle>
            <EmptyDescription>{t(copy.emptyDescriptionKey)}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </div>
  );
}
