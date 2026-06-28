"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/** 랜딩(/)에서만 다크 테마를 강제하고, 이탈 시 system으로 복원한다. */
export function LandingDarkMode() {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("dark");
    return () => {
      setTheme("system");
    };
  }, [setTheme]);

  return null;
}
