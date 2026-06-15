"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PagePatternTree } from "@ssota/ui/components/page-patterns";

export type IaTreeNode = {
  id: string;
  label: string;
  children?: IaTreeNode[];
};

type DesignIaWorkspaceProps = {
  nodes: IaTreeNode[];
  selectedPageContent?: string;
  newLabel: string;
  onCreatePage: () => Promise<void>;
};

export function DesignIaWorkspace({
  nodes,
  selectedPageContent,
  newLabel,
  onCreatePage,
}: DesignIaWorkspaceProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <PagePatternTree
      nodes={nodes}
      newLabel={newLabel}
      onNew={
        pending
          ? undefined
          : () => {
              startTransition(async () => {
                await onCreatePage();
                router.refresh();
              });
            }
      }
      emptyState={
        nodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create the master IA root, then add pages.
          </p>
        ) : undefined
      }
      detail={
        selectedPageContent != null ? (
          <pre className="whitespace-pre-wrap text-sm">{selectedPageContent}</pre>
        ) : (
          <p className="text-sm text-muted-foreground">Select a page node to preview.</p>
        )
      }
    />
  );
}
