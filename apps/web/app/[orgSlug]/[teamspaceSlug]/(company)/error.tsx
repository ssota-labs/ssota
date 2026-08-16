"use client";

import { CompanyWorkspaceError } from "@/components/company-workspace/company-workspace-error";

export default function CompanyWorkspaceSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <CompanyWorkspaceError error={error} reset={reset} />;
}
