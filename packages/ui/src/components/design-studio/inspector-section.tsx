"use client";

import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type InspectorSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
};

export function InspectorSection({
  title,
  children,
  className,
  headerAction,
}: InspectorSectionProps) {
  return (
    <section className={cn("space-y-3 px-4 py-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          {title}
        </h3>
        {headerAction ? (
          <div className="shrink-0">{headerAction}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

type InspectorSectionListProps = {
  children: ReactNode;
};

export function InspectorSectionList({ children }: InspectorSectionListProps) {
  const items = Children.toArray(children).filter(Boolean);

  return (
    <>
      {items.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? <Separator /> : null}
          {child}
        </Fragment>
      ))}
    </>
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
