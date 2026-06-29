import type { ReactNode } from "react";

interface SettingsRouteShellProps {
  children: ReactNode;
}

export function SettingsRouteShell({ children }: SettingsRouteShellProps) {
  return <div className="flex h-full min-h-0 flex-col">{children}</div>;
}
