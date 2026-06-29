import type { ReactNode } from "react";
import { cn } from "@ssota/ui/lib/utils";

type ConsolePageFrameProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  testId?: string;
  /** Skip max-width constraint (e.g. ArtifactWorkbench). */
  fullWidth?: boolean;
  /**
   * Fill the main column height for in-page panels (document sheets, split panes).
   * Browse-style pages (Connectors) leave this false and scroll the frame.
   */
  fillHeight?: boolean;
};

/**
 * Shared console content column — matches Connectors `BrowseWorkspace.Frame`
 * (`max-w-5xl`, centered, horizontal padding). Applied at route/layout parents,
 * not inside json-render page specs.
 */
export function ConsolePageFrame({
  children,
  className,
  contentClassName,
  testId,
  fullWidth = false,
  fillHeight = false,
}: ConsolePageFrameProps) {
  if (fullWidth) {
    return (
      <div
        className={cn("flex min-h-0 flex-1 flex-col", className)}
        data-testid={testId}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        fillHeight
          ? "flex min-h-0 flex-1 flex-col overflow-hidden"
          : "min-h-0 flex-1 overflow-y-auto",
        className,
      )}
      data-testid={testId}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-5xl flex-col px-6 py-8",
          fillHeight && "min-h-0 flex-1",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
