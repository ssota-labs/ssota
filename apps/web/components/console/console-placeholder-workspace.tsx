"use client";

import { BrowseWorkspace } from "@/components/console/browse-workspace";

type ConsolePlaceholderWorkspaceProps = {
  title: string;
  description: string;
  body: string;
  testId?: string;
};

export function ConsolePlaceholderWorkspace({
  title,
  description,
  body,
  testId,
}: ConsolePlaceholderWorkspaceProps) {
  return (
    <BrowseWorkspace.Frame testId={testId}>
      <BrowseWorkspace.Header title={title} description={description} />
      <BrowseWorkspace.Empty>{body}</BrowseWorkspace.Empty>
    </BrowseWorkspace.Frame>
  );
}
