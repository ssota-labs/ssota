"use client";

import { Button } from "@ssota/ui/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ssota/ui/components/ui/empty";
import { useLocale } from "@/components/i18n/locale-provider";

export function CompanyWorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t("companyWorkspace.errorTitle")}</EmptyTitle>
          <EmptyDescription>
            {t("companyWorkspace.errorDescription")}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" onClick={reset}>
            {t("companyWorkspace.retry")}
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
