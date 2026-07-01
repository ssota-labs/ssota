"use client";

import { Marker, MarkerContent, MarkerIcon } from "@ssota/ui/components/ui/marker";
import { Spinner } from "@ssota/ui/components/ui/spinner";
import { useLocale } from "@/components/i18n/locale-provider";

/** Inline status row shown while the agent is preparing a reply. */
export function ChatThinkingMarker() {
  const { t } = useLocale();

  return (
    <Marker role="status">
      <MarkerIcon>
        <Spinner />
      </MarkerIcon>
      <MarkerContent className="shimmer">{t("chat.thinking")}</MarkerContent>
    </Marker>
  );
}
