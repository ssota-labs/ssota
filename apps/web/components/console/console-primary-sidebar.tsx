"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@loopos/ui/components/ui/sidebar";
import { projectPath } from "@/lib/console/paths";
import { useProjectContext } from "./project-context";

const primaryItems = [
  { segment: "", label: "Project Home" },
  { segment: "graph", label: "Graph" },
  { segment: "instructions", label: "Instruction" },
] as const;

const opsItems = [
  { segment: "gates", label: "Gates" },
  { segment: "log", label: "Action Log" },
] as const;

export function ConsolePrimarySidebar() {
  const ctx = useProjectContext();
  const pathname = usePathname();

  return (
    <Sidebar collapsible="none">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{ctx.project.name}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryItems.map((item) => {
                const href = item.segment
                  ? projectPath(ctx, item.segment)
                  : projectPath(ctx);
                const active =
                  item.segment === ""
                    ? pathname === href
                    : pathname.startsWith(href);
                return (
                  <SidebarMenuItem key={item.segment || "home"}>
                    <SidebarMenuButton
                      render={<Link href={href} />}
                      isActive={active}
                    >
                      {item.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {opsItems.map((item) => {
                const href = projectPath(ctx, item.segment);
                const active = pathname.startsWith(href);
                return (
                  <SidebarMenuItem key={item.segment}>
                    <SidebarMenuButton
                      render={<Link href={href} />}
                      isActive={active}
                    >
                      {item.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href={projectPath(ctx, "settings", "general")} />}
                  isActive={pathname.includes("/settings")}
                >
                  Settings
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
