"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  BriefcaseIcon,
  ChartLineUpIcon,
  DatabaseIcon,
  FileTextIcon,
  HouseIcon,
  KanbanIcon,
  ListChecksIcon,
  TrayIcon,
} from "@phosphor-icons/react";
import type { CompanyWorkspaceNavIcon } from "@/lib/company-workspace/navigation";

const ICONS: Record<CompanyWorkspaceNavIcon, Icon> = {
  house: HouseIcon,
  tray: TrayIcon,
  handshake: BriefcaseIcon,
  chart: ChartLineUpIcon,
  files: FileTextIcon,
  database: DatabaseIcon,
  briefcase: BriefcaseIcon,
  queue: ListChecksIcon,
  kanban: KanbanIcon,
};

export function CompanyWorkspaceNavIconView({
  icon,
  className,
}: {
  icon: CompanyWorkspaceNavIcon;
  className?: string;
}) {
  const Glyph = ICONS[icon];
  return <Glyph className={className} />;
}
