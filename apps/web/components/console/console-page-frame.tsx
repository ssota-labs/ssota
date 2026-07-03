import type { ReactNode } from "react";
import { cn } from "@ssota/ui/lib/utils";

type ConsolePageFrameProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  testId?: string;
  /** Skip max-width constraint (e.g. ArtifactWorkbench). */
  fullWidth?: boolean;
  /** Tailwind max-width class for the inner column (Connectors browse). */
  maxWidthClassName?: string;
  /**
   * Fill the main column height for in-page panels (document sheets, split panes).
   * Browse-style pages (Connectors) leave this false and scroll the frame.
   */
  fillHeight?: boolean;
};

/**
 * Shared console content column for browse-style console pages. Applied at route
 * layout parents, not inside json-render page specs. Page routes use full width;
 * Connectors keeps optional `maxWidth` constraint.
 */
export function ConsolePageFrame({
  children,
  className,
  contentClassName,
  testId,
  fullWidth = false,
  fillHeight = false,
  maxWidthClassName,
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
          "mx-auto flex w-full flex-col px-6 pt-4 pb-6",
          maxWidthClassName,
          fillHeight && "min-h-0 flex-1",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
