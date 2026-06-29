"use client";

import { useEffect, useState } from "react";

/** Tailwind `md` breakpoint — landing 프리뷰 모바일 레이아웃·줌 조정용 */
export function useMobileViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}
