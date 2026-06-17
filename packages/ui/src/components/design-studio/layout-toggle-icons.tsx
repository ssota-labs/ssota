import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LayoutIconProps = {
  className?: string;
};

function LayoutIconFrame({
  className,
  children,
}: LayoutIconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 14 14"
      aria-hidden
      className={cn("size-3.5 shrink-0", className)}
      fill="currentColor"
    >
      <rect
        x="1"
        y="1"
        width="12"
        height="12"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.35"
      />
      {children}
    </svg>
  );
}

export function FlexDirectionRowIcon({ className }: LayoutIconProps) {
  return (
    <LayoutIconFrame className={className}>
      <path d="M3.5 7h5.5M7.5 5.5 9.5 7 7.5 8.5" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </LayoutIconFrame>
  );
}

export function FlexDirectionColIcon({ className }: LayoutIconProps) {
  return (
    <LayoutIconFrame className={className}>
      <path d="M7 3.5v5.5M5.5 7.5 7 9.5 8.5 7.5" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </LayoutIconFrame>
  );
}

export function FlexDirectionRowReverseIcon({ className }: LayoutIconProps) {
  return (
    <LayoutIconFrame className={className}>
      <path d="M10.5 7H5M6.5 5.5 4.5 7 6.5 8.5" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </LayoutIconFrame>
  );
}

export function FlexDirectionColReverseIcon({ className }: LayoutIconProps) {
  return (
    <LayoutIconFrame className={className}>
      <path d="M7 10.5V5M5.5 6.5 7 4.5 8.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </LayoutIconFrame>
  );
}

export function AlignItemsStartIcon({ className }: LayoutIconProps) {
  return (
    <LayoutIconFrame className={className}>
      <rect x="3.5" y="3" width="7" height="1.5" rx="0.5" />
      <rect x="3.5" y="5.5" width="5" height="1.5" rx="0.5" />
    </LayoutIconFrame>
  );
}

export function AlignItemsCenterIcon({ className }: LayoutIconProps) {
  return (
    <LayoutIconFrame className={className}>
      <rect x="3.5" y="4.25" width="7" height="1.5" rx="0.5" />
      <rect x="3.5" y="6.75" width="5" height="1.5" rx="0.5" />
    </LayoutIconFrame>
  );
}

export function AlignItemsEndIcon({ className }: LayoutIconProps) {
  return (
    <LayoutIconFrame className={className}>
      <rect x="3.5" y="7" width="7" height="1.5" rx="0.5" />
      <rect x="3.5" y="9.5" width="5" height="1.5" rx="0.5" />
    </LayoutIconFrame>
  );
}

export function AlignItemsStretchIcon({ className }: LayoutIconProps) {
  return (
    <LayoutIconFrame className={className}>
      <rect x="3.5" y="3" width="7" height="8" rx="0.5" opacity="0.85" />
      <rect x="5.5" y="4" width="3" height="6" rx="0.5" />
    </LayoutIconFrame>
  );
}

export function AlignItemsBaselineIcon({ className }: LayoutIconProps) {
  return (
    <LayoutIconFrame className={className}>
      <rect x="3.5" y="4" width="2.5" height="4.5" rx="0.5" />
      <rect x="6.75" y="5.5" width="2.5" height="3" rx="0.5" />
      <rect x="10" y="3.5" width="2.5" height="5" rx="0.5" />
      <rect x="2.5" y="9.75" width="9" height="1" rx="0.5" opacity="0.55" />
    </LayoutIconFrame>
  );
}

export function JustifyStartIcon({ className }: LayoutIconProps) {
  return (
    <LayoutIconFrame className={className}>
      <rect x="3" y="4" width="1.5" height="6" rx="0.5" />
      <rect x="5.5" y="5" width="1.5" height="4" rx="0.5" />
      <rect x="8" y="4.5" width="1.5" height="5" rx="0.5" />
    </LayoutIconFrame>
  );
}

export function JustifyCenterIcon({ className }: LayoutIconProps) {
  return (
    <LayoutIconFrame className={className}>
      <rect x="4" y="4" width="1.5" height="6" rx="0.5" />
      <rect x="6.25" y="5" width="1.5" height="4" rx="0.5" />
      <rect x="8.5" y="4.5" width="1.5" height="5" rx="0.5" />
    </LayoutIconFrame>
  );
}

export function JustifyEndIcon({ className }: LayoutIconProps) {
  return (
    <LayoutIconFrame className={className}>
      <rect x="4.5" y="4" width="1.5" height="6" rx="0.5" />
      <rect x="7" y="5" width="1.5" height="4" rx="0.5" />
      <rect x="9.5" y="4.5" width="1.5" height="5" rx="0.5" />
    </LayoutIconFrame>
  );
}

export function JustifyBetweenIcon({ className }: LayoutIconProps) {
  return (
    <LayoutIconFrame className={className}>
      <rect x="3" y="4.5" width="1.5" height="5" rx="0.5" />
      <rect x="6.25" y="5" width="1.5" height="4" rx="0.5" />
      <rect x="9.5" y="4" width="1.5" height="6" rx="0.5" />
    </LayoutIconFrame>
  );
}

export function JustifyAroundIcon({ className }: LayoutIconProps) {
  return (
    <LayoutIconFrame className={className}>
      <rect x="2.75" y="4.5" width="1.5" height="5" rx="0.5" />
      <rect x="5.75" y="5" width="1.5" height="4" rx="0.5" />
      <rect x="8.75" y="4" width="1.5" height="6" rx="0.5" />
    </LayoutIconFrame>
  );
}

export function JustifyEvenlyIcon({ className }: LayoutIconProps) {
  return (
    <LayoutIconFrame className={className}>
      <rect x="3.25" y="4.5" width="1.5" height="5" rx="0.5" />
      <rect x="6.25" y="5" width="1.5" height="4" rx="0.5" />
      <rect x="9.25" y="4" width="1.5" height="6" rx="0.5" />
    </LayoutIconFrame>
  );
}
