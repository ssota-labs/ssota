"use client";

import { useEffect, useRef, useState } from "react";

type UseRevealOnScrollOptions = {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
};

export function useRevealOnScroll({
  threshold = 0.12,
  rootMargin = "0px 0px -8% 0px",
  once = true,
}: UseRevealOnScrollOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (once && revealed) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          if (once) observer.disconnect();
          return;
        }

        if (!once) {
          setRevealed(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, revealed, rootMargin, threshold]);

  return { ref, revealed };
}
