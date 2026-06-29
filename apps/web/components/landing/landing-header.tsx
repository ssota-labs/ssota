"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const SCROLL_THRESHOLD_PX = 8;

export function LandingHeader({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled ? "true" : "false"}
      className={cn(
        "group fixed inset-x-0 top-0 z-20 transition-[background-color,box-shadow,border-color] duration-300",
        scrolled
          ? "border-b border-border/40 bg-background"
          : "bg-gradient-to-b from-black/20 to-transparent",
      )}
    >
      {children}
    </header>
  );
}
