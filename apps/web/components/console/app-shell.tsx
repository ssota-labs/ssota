"use client";

import { usePathname } from "next/navigation";
import { EndUserSidebar, type AppShellContext } from "./end-user-sidebar";

export type { AppShellContext };

export function AppShell({
  ctx,
  children,
}: {
  ctx: AppShellContext;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isChat = pathname.includes("/chat");
  const isFullBleed = isChat;

  return (
    <div className="flex h-svh w-full overflow-hidden">
      <EndUserSidebar ctx={ctx} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main
          className={
            isFullBleed
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "flex min-h-0 flex-1 flex-col overflow-auto p-4 md:p-6"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
