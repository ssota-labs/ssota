"use client";

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@ssota/ui/components/ui/popover";
import { cn } from "@ssota/ui/lib/utils";
import { useState, type MouseEvent, type ReactNode } from "react";
import { useWireframeNavigation } from "./navigation-context";

type WireframeBaseProps = {
  className?: string;
  children?: ReactNode;
};

function wireframeBox(className?: string) {
  return cn(
    "border-border bg-muted/40 text-foreground/80 border border-dashed",
    className,
  );
}

type NavigableProps = WireframeBaseProps & {
  navigateTo?: string;
  onClick?: () => void;
};

function NavigableSurface({
  navigateTo,
  onClick,
  className,
  children,
  as: Tag = "div",
  ...props
}: NavigableProps & { as?: "div" | "button" | "a" }) {
  const nav = useWireframeNavigation();
  const [missingOpen, setMissingOpen] = useState(false);
  const target = navigateTo?.trim().toLowerCase();
  const hasTarget = target ? nav?.knownSlugs.has(target) : false;
  const isMissing = Boolean(target && nav && !hasTarget);
  const isInteractive = Boolean(target || onClick);
  const showHotspotCue = Boolean(isInteractive && nav?.hotspotsVisible);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (!isInteractive) return;
    event.stopPropagation();
    if (isMissing) {
      setMissingOpen(true);
      return;
    }
    if (target && nav) {
      nav.navigateTo(target);
    }
    onClick?.();
  };

  const surfaceClassName = cn(
    "relative",
    isInteractive && "cursor-pointer",
    className,
    showHotspotCue &&
      "border-2 border-solid border-blue-500 bg-blue-500/10 shadow-none",
  );

  const surfaceProps = {
    type: Tag === "button" ? ("button" as const) : undefined,
    className: surfaceClassName,
    onClick: isInteractive ? handleClick : undefined,
    "data-navigate-to": target || undefined,
    "data-testid": target ? `wireframe-nav-${target}` : undefined,
    "data-hotspot-visible": showHotspotCue ? "true" : undefined,
    "data-nav-missing": isMissing ? "true" : undefined,
    title: !isMissing && target ? `Navigate to ${target}` : undefined,
    ...props,
  };

  if (isMissing) {
    return (
      <Popover open={missingOpen} onOpenChange={setMissingOpen}>
        <PopoverTrigger
          nativeButton={Tag === "button"}
          render={<Tag {...surfaceProps} />}
        >
          {children}
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-56 text-xs">
          <PopoverHeader>
            <PopoverTitle>Missing page</PopoverTitle>
            <PopoverDescription>
              Page &quot;{target}&quot; is not in this wireframe set. Add a{" "}
              <span className="font-mono">page_wireframe</span> with slug{" "}
              <span className="font-mono">{target}</span> to enable navigation.
            </PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    );
  }

  return <Tag {...surfaceProps}>{children}</Tag>;
}

export function Screen({ className, children }: WireframeBaseProps) {
  const nav = useWireframeNavigation();
  return (
    <div
      className={cn(
        "bg-background text-foreground flex h-full min-h-dvh flex-col md:flex-row overflow-hidden",
        !nav?.hotspotsVisible && "grayscale",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Sidebar({ className, children }: WireframeBaseProps) {
  return (
    <aside
      className={cn(
        "border-border bg-muted/30 hidden w-full shrink-0 border-b p-2 text-[10px] md:flex md:w-28 md:flex-col md:border-r md:border-b-0 lg:w-32",
        className,
      )}
    >
      {children}
    </aside>
  );
}

export function Main({ className, children }: WireframeBaseProps) {
  return <main className={cn("min-w-0 flex-1 p-3", className)}>{children}</main>;
}

export function NavItem({
  active,
  navigateTo,
  className,
  children,
}: NavigableProps & { active?: boolean }) {
  return (
    <NavigableSurface
      navigateTo={navigateTo}
      className={cn(
        "mb-1 rounded px-2 py-1",
        !active && "text-muted-foreground",
        active && "font-semibold",
        className,
      )}
    >
      {children}
    </NavigableSurface>
  );
}

export function Title({ className, children }: WireframeBaseProps) {
  return (
    <h1 className={cn("mb-3 text-sm font-semibold", className)}>{children}</h1>
  );
}

export function Text({ className, children }: WireframeBaseProps) {
  return <p className={cn("text-muted-foreground mb-2 text-[11px]", className)}>{children}</p>;
}

export function Button({
  navigateTo,
  className,
  children,
}: NavigableProps) {
  return (
    <NavigableSurface
      as="button"
      navigateTo={navigateTo}
      className={cn(
        wireframeBox("bg-muted mb-2 rounded px-3 py-1.5 text-[11px] font-medium"),
        className,
      )}
    >
      {children}
    </NavigableSurface>
  );
}

export function Link({
  navigateTo,
  className,
  children,
}: NavigableProps) {
  return (
    <NavigableSurface
      navigateTo={navigateTo}
      className={cn("text-foreground mb-2 inline-block text-[11px] underline", className)}
    >
      {children}
    </NavigableSurface>
  );
}

export function Image({ className, label = "Image" }: WireframeBaseProps & { label?: string }) {
  return (
    <div
      className={cn(
        wireframeBox("mb-2 flex aspect-video w-full items-center justify-center text-[10px]"),
        className,
      )}
      aria-hidden
    >
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

export function Card({ className, children }: WireframeBaseProps) {
  return (
    <div className={cn(wireframeBox("mb-3 rounded-md p-2"), className)}>{children}</div>
  );
}

export function List({ className, children }: WireframeBaseProps) {
  return <ul className={cn("mb-2 space-y-1", className)}>{children}</ul>;
}

export function ListItem({ className, children }: WireframeBaseProps) {
  return (
    <li className={cn(wireframeBox("rounded px-2 py-1 text-[10px]"), className)}>
      {children}
    </li>
  );
}

export function Input({
  label,
  className,
  placeholder = "…",
}: WireframeBaseProps & { label?: string; placeholder?: string }) {
  return (
    <label className={cn("mb-2 block text-[10px]", className)}>
      {label ? <span className="mb-1 block font-medium">{label}</span> : null}
      <span
        className={wireframeBox(
          "bg-background block rounded px-2 py-1.5 text-muted-foreground",
        )}
      >
        {placeholder}
      </span>
    </label>
  );
}

export function Row({ className, children }: WireframeBaseProps) {
  return (
    <div className={cn("mb-2 flex flex-col gap-2 sm:flex-row", className)}>
      {children}
    </div>
  );
}

export function Placeholder({
  className,
  height = 48,
}: WireframeBaseProps & { height?: number }) {
  return (
    <div
      className={cn(wireframeBox("mb-2 w-full rounded"), className)}
      style={{ height }}
    />
  );
}

/** Component map injected into JSXPreview for wireframe JSX strings. */
export const WIREFRAME_JSX_COMPONENTS = {
  Screen,
  Sidebar,
  Main,
  NavItem,
  Title,
  Text,
  Button,
  Link,
  Image,
  Card,
  List,
  ListItem,
  Input,
  Row,
  Placeholder,
} as const;
