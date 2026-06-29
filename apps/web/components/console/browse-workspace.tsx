import type { ReactNode } from "react";
import { cn } from "@ssota/ui/lib/utils";
import { ConsolePageFrame } from "@/components/console/console-page-frame";
import { WorkspaceHeader } from "@/lib/console/workspace-header";
import {
  connectorCardDescriptionClassName,
  connectorCardInteractiveClassName,
  connectorCardTextClassName,
  connectorCardTitleClassName,
  connectorIconWrapClassName,
} from "@/components/connectors/connector-card-styles";

function Frame({
  children,
  className,
  testId,
}: {
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <ConsolePageFrame
      className={className}
      testId={testId}
      contentClassName="gap-8"
    >
      {children}
    </ConsolePageFrame>
  );
}

function Header({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <WorkspaceHeader
        as="h1"
        density="page"
        title={title}
        description={description}
        actions={actions}
      />
      {children}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </h2>
      {children}
    </section>
  );
}

function Grid({
  children,
  columns = "three",
}: {
  children: ReactNode;
  columns?: "two" | "three";
}) {
  return (
    <div
      className={cn(
        "grid gap-2.5",
        columns === "two" ? "grid-cols-1 sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {children}
    </div>
  );
}

type CardProps = {
  title: string;
  subtitle?: string;
  description?: string;
  subtitleClassName?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  highlighted?: boolean;
  selected?: boolean;
  onSelect: () => void;
  testId?: string;
  className?: string;
};

function Card({
  title,
  subtitle,
  description,
  subtitleClassName,
  icon,
  badge,
  highlighted = false,
  selected = false,
  onSelect,
  testId,
  className,
}: CardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={testId}
      className={cn(
        connectorCardInteractiveClassName,
        (highlighted || selected) && "border-primary/20",
        selected && "bg-muted/30",
        className,
      )}
    >
      {icon ? <span className={connectorIconWrapClassName}>{icon}</span> : null}
      <span className={connectorCardTextClassName}>
        <span className={connectorCardTitleClassName}>{title}</span>
        {subtitle ? (
          <span className={cn(connectorCardDescriptionClassName, subtitleClassName)}>
            {subtitle}
          </span>
        ) : null}
        {description ? (
          <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      {badge}
    </button>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export const BrowseWorkspace = {
  Frame,
  Header,
  Section,
  Grid,
  Card,
  Empty,
};
