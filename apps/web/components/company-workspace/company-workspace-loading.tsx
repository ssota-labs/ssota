"use client";

import { Spinner } from "@ssota/ui/components/ui/spinner";

export function CompanyWorkspaceLoading() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <Spinner className="size-6" />
    </div>
  );
}
