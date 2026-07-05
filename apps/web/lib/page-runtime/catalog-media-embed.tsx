"use client";

import { Badge } from "@ssota/ui/components/ui/badge";
import { buttonVariants } from "@ssota/ui/components/ui/button";
import { cn } from "@/lib/utils";

export type MediaPlatform = "youtube" | "x" | "article" | "other";

export function detectMediaPlatform(url: string): MediaPlatform {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be" || host.endsWith("youtube.com")) return "youtube";
    if (host === "x.com" || host === "twitter.com") return "x";
    if (host === "example.com") return "article";
    return "other";
  } catch {
    return "other";
  }
}

export function parseYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ?? null;
    }
    if (host.endsWith("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2] ?? null;
      }
      const fromQuery = parsed.searchParams.get("v");
      if (fromQuery) return fromQuery;
      const shorts = parsed.pathname.match(/^\/shorts\/([^/]+)/);
      if (shorts?.[1]) return shorts[1];
    }
    return null;
  } catch {
    return null;
  }
}

export function MediaEmbedEl({
  url,
  platform,
  title,
  summary,
  height = 360,
}: {
  url?: string;
  platform?: MediaPlatform;
  title?: string;
  summary?: string;
  height?: number;
}) {
  if (!url) {
    return (
      <p className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
        Select a source to preview the media embed.
      </p>
    );
  }

  const resolvedPlatform = platform ?? detectMediaPlatform(url);

  if (resolvedPlatform === "youtube") {
    const videoId = parseYouTubeVideoId(url);
    if (!videoId) {
      return (
        <p className="text-destructive text-sm">
          Could not parse YouTube video id from URL.
        </p>
      );
    }
    return (
      <div
        className="overflow-hidden rounded-md border bg-black"
        data-testid="media-embed-youtube"
      >
        <iframe
          title={title ?? "YouTube embed"}
          src={`https://www.youtube.com/embed/${videoId}`}
          className="w-full"
          style={{ height }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const platformLabel =
    resolvedPlatform === "x"
      ? "X"
      : resolvedPlatform === "article"
        ? "Article"
        : "Link";

  return (
    <div
      className="space-y-3 rounded-md border bg-muted/20 p-4"
      data-testid={`media-embed-${resolvedPlatform}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{platformLabel}</Badge>
        {title ? <span className="text-sm font-medium">{title}</span> : null}
      </div>
      {summary ? (
        <p className="text-muted-foreground text-sm">{summary}</p>
      ) : null}
      <p className="text-muted-foreground break-all text-xs">{url}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="media-embed-open-link"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        {resolvedPlatform === "x" ? "Open in X" : "Open link"}
      </a>
    </div>
  );
}
