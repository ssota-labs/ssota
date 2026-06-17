"use client";

import { cloneElement, isValidElement, type ReactElement, type ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

type InspectorSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function InspectorSection({
  title,
  children,
  className,
}: InspectorSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <h3 className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

type InspectorFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function InspectorField({
  label,
  children,
  className,
}: InspectorFieldProps) {
  const id = useId();

  const control =
    isValidElement(children) && children.type !== "div"
      ? cloneElement(children as ReactElement<{ id?: string; "aria-label"?: string }>, {
          id,
          "aria-label": label,
        })
      : children;

  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <label
        htmlFor={id}
        className="block truncate text-xs text-muted-foreground"
        title={label}
      >
        {label}
      </label>
      {control}
    </div>
  );
}

type InspectorGridProps = {
  children: ReactNode;
  columns?: 1 | 2;
};

export function InspectorGrid({ children, columns = 2 }: InspectorGridProps) {
  return (
    <div
      className={cn(
        "grid gap-2",
        columns === 2 ? "grid-cols-2" : "grid-cols-1",
      )}
    >
      {children}
    </div>
  );
}
