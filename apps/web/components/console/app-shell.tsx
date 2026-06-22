"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions";
import { appProjectPath } from "@/lib/console/app-paths";
import { cn } from "@/lib/utils";

export type AppShellContext = {
  orgSlug: string;
  projectSlug: string;
  projectId: string;
  accountId: string;
  userEmail: string;
  pageLinks: { routeKey: string; label: string }[];
};

const FIXED_TABS = [
  { key: "chat", label: "Chat", segment: "chat" },
  { key: "tasks", label: "Tasks", segment: "tasks" },
  { key: "connections", label: "Connections", segment: "connections" },
] as const;

export function AppShell({
  ctx,
  children,
}: {
  ctx: AppShellContext;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const base = appProjectPath(ctx);
  const isChat = pathname.includes("/chat");
  const isFullBleed = isChat;

  return (
    <div className="flex h-svh w-full flex-col overflow-hidden">
      <header className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <span className="text-foreground truncate text-sm font-medium">
            {ctx.projectSlug}
          </span>
          <nav className="flex flex-wrap items-center gap-1">
            {ctx.pageLinks.map((page) => {
              const href = appProjectPath(ctx, "p", page.routeKey);
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={page.routeKey}
                  href={href}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-sm transition-colors",
                    active
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  {page.label}
                </Link>
              );
            })}
            {FIXED_TABS.map((tab) => {
              const href = appProjectPath(ctx, tab.segment);
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={tab.key}
                  href={href}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-sm transition-colors",
                    active
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="text-muted-foreground flex items-center gap-3 text-sm">
          <span className="hidden max-w-[12rem] truncate sm:inline">{ctx.userEmail}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
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
  );
}
