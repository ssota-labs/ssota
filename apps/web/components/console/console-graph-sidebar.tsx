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
  SidebarRail,
} from "@loopos/ui/components/ui/sidebar";
import { graphPath, projectPath } from "@/lib/console/paths";
import { useProjectContext } from "./project-context";

const graphItems = [
  { segment: "", label: "Overview" },
  { segment: "nodes", label: "Nodes" },
  { segment: "edges", label: "Edges" },
  { segment: "actions", label: "Actions" },
] as const;

export function ConsoleGraphSidebar() {
  const ctx = useProjectContext();
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href={projectPath(ctx)} />}>
                  ← Back to project
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Graph</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {graphItems.map((item) => {
                const href = item.segment
                  ? graphPath(ctx, item.segment)
                  : graphPath(ctx);
                const active =
                  item.segment === ""
                    ? pathname === href
                    : pathname.startsWith(href);
                return (
                  <SidebarMenuItem key={item.segment || "overview"}>
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
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
