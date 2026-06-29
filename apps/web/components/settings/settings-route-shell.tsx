"use client";

import type { ReactNode } from "react";
import { SettingsSidebar } from "./settings-sidebar";

interface SettingsRouteShellProps {
  children: ReactNode;
}

export function SettingsRouteShell({ children }: SettingsRouteShellProps) {
  return (
    <div className="flex h-full min-h-0">
      <SettingsSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
