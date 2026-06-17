import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BorderStyleIconProps = {
  className?: string;
};

function BorderStyleLineIcon({
  className,
  children,
}: BorderStyleIconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 14 14"
      aria-hidden
      className={cn("size-3.5 shrink-0", className)}
      fill="none"
    >
      {children}
    </svg>
  );
}

export function BorderStyleSolidIcon({ className }: BorderStyleIconProps) {
  return (
    <BorderStyleLineIcon className={className}>
      <line
        x1="2"
        y1="7"
        x2="12"
        y2="7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </BorderStyleLineIcon>
  );
}

export function BorderStyleDashedIcon({ className }: BorderStyleIconProps) {
  return (
    <BorderStyleLineIcon className={className}>
      <line
        x1="2"
        y1="7"
        x2="12"
        y2="7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2.5 2"
      />
    </BorderStyleLineIcon>
  );
}

export function BorderStyleDottedIcon({ className }: BorderStyleIconProps) {
  return (
    <BorderStyleLineIcon className={className}>
      <line
        x1="2"
        y1="7"
        x2="12"
        y2="7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.1 2.25"
      />
    </BorderStyleLineIcon>
  );
}

export function BorderStyleDoubleIcon({ className }: BorderStyleIconProps) {
  return (
    <BorderStyleLineIcon className={className}>
      <line
        x1="2"
        y1="5.5"
        x2="12"
        y2="5.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="2"
        y1="8.5"
        x2="12"
        y2="8.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </BorderStyleLineIcon>
  );
}

export function BorderStyleNoneIcon({ className }: BorderStyleIconProps) {
  return (
    <BorderStyleLineIcon className={className}>
      <line
        x1="2"
        y1="7"
        x2="12"
        y2="7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.25"
      />
      <line
        x1="3.5"
        y1="10.5"
        x2="10.5"
        y2="3.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </BorderStyleLineIcon>
  );
}
