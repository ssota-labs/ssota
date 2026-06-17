"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CaretDownIcon } from "@phosphor-icons/react";
import {
  markdownToTiptapDoc,
  SsotaEditor,
  tiptapDocToMarkdown,
  type JSONContent,
} from "@ssota/editor";
import "@ssota/editor/styles.css";
import { cn } from "@ssota/ui/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { createSsotaEditorHostProps } from "@/lib/editor/host-props";

const AUTOSAVE_DEBOUNCE_MS = 800;

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

type RoadmapDocumentPanelProps = {
  content: string;
  projectId: string;
  onSave: (input: { content: string }) => Promise<void>;
  expandTestId?: string;
  className?: string;
};

export function RoadmapDocumentPanel({
  content,
  projectId,
  onSave,
  expandTestId = "roadmap-expand",
  className,
}: RoadmapDocumentPanelProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [draftDoc, setDraftDoc] = useState<JSONContent>(() =>
    markdownToTiptapDoc(content),
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const onSaveRef = useRef(onSave);
  const lastSavedMarkdownRef = useRef(content);
  const latestPendingMarkdownRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVersionRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const savedFadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextChangeRef = useRef(false);

  onSaveRef.current = onSave;

  const editorHostProps = useMemo(
    () => createSsotaEditorHostProps(projectId),
    [projectId],
  );

  useEffect(() => {
    lastSavedMarkdownRef.current = content;
    if (!expanded) {
      setDraftDoc(markdownToTiptapDoc(content));
    }
  }, [content, expanded]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (savedFadeTimeoutRef.current) clearTimeout(savedFadeTimeoutRef.current);
    };
  }, []);

  const markSaved = useCallback(() => {
    setSaveStatus("saved");
    if (savedFadeTimeoutRef.current) {
      clearTimeout(savedFadeTimeoutRef.current);
    }
    savedFadeTimeoutRef.current = setTimeout(() => {
      setSaveStatus((current) => (current === "saved" ? "idle" : current));
    }, 2000);
  }, []);

  const processSaveLoop = useCallback(async () => {
    if (inFlightRef.current) {
      await inFlightRef.current;
      if (
        latestPendingMarkdownRef.current &&
        latestPendingMarkdownRef.current !== lastSavedMarkdownRef.current
      ) {
        return processSaveLoop();
      }
      return;
    }

    const run = async () => {
      while (true) {
        const markdown = latestPendingMarkdownRef.current;
        if (!markdown || markdown === lastSavedMarkdownRef.current) {
          setSaveStatus("idle");
          return;
        }

        latestPendingMarkdownRef.current = null;
        const version = ++saveVersionRef.current;
        setSaveStatus("saving");

        try {
          await onSaveRef.current({ content: markdown });
          if (version !== saveVersionRef.current) continue;

          lastSavedMarkdownRef.current = markdown;
          markSaved();

          if (
            latestPendingMarkdownRef.current &&
            latestPendingMarkdownRef.current !== lastSavedMarkdownRef.current
          ) {
            continue;
          }
          return;
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("[roadmap autosave]", error);
          }
          if (version === saveVersionRef.current) {
            latestPendingMarkdownRef.current = markdown;
            setSaveStatus("error");
          }
          return;
        }
      }
    };

    const promise = run();
    inFlightRef.current = promise;
    try {
      await promise;
    } finally {
      if (inFlightRef.current === promise) {
        inFlightRef.current = null;
      }
    }
  }, [markSaved]);

  const scheduleSave = useCallback(
    (markdown: string) => {
      if (markdown === lastSavedMarkdownRef.current) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        latestPendingMarkdownRef.current = null;
        setSaveStatus("idle");
        return;
      }

      latestPendingMarkdownRef.current = markdown;
      setSaveStatus((current) => (current === "error" ? current : "pending"));

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null;
        void processSaveLoop();
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [processSaveLoop],
  );

  const handleEditorChange = useCallback(
    (doc: JSONContent) => {
      setDraftDoc(doc);
      if (!expanded) return;
      if (skipNextChangeRef.current) {
        skipNextChangeRef.current = false;
        return;
      }
      scheduleSave(tiptapDocToMarkdown(doc));
    },
    [expanded, scheduleSave],
  );

  const flushPendingSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (
      latestPendingMarkdownRef.current &&
      latestPendingMarkdownRef.current !== lastSavedMarkdownRef.current
    ) {
      await processSaveLoop();
      return;
    }

    if (inFlightRef.current) {
      await inFlightRef.current;
    }
  }, [processSaveLoop]);

  const handleExpand = () => {
    setDraftDoc(markdownToTiptapDoc(content));
    latestPendingMarkdownRef.current = null;
    skipNextChangeRef.current = true;
    setSaveStatus("idle");
    setExpanded(true);
  };

  const handleCollapse = () => {
    void flushPendingSave().finally(() => {
      router.refresh();
      setExpanded(false);
    });
  };

  const saveStatusLabel =
    saveStatus === "pending" || saveStatus === "saving"
      ? t("roadmap.saving")
      : saveStatus === "saved"
        ? t("roadmap.saved")
        : saveStatus === "error"
          ? t("roadmap.saveError")
          : null;

  return (
    <div
      className={cn("space-y-4", className)}
      data-testid="roadmap-document-panel"
    >
      <div
        className={cn(!expanded && "relative max-h-64 overflow-hidden")}
        data-testid="roadmap-document-editor"
      >
        <SsotaEditor
          key={expanded ? "editing" : "readonly"}
          content={draftDoc}
          editable={expanded}
          onChange={expanded ? handleEditorChange : undefined}
          className={cn("roadmap-readonly-editor", expanded && "pb-14")}
          {...editorHostProps}
        />

        {!expanded ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-card via-card/95 to-transparent pb-2">
            <button
              type="button"
              data-testid={expandTestId}
              aria-expanded={false}
              aria-label={t("roadmap.expandContent")}
              className="pointer-events-auto inline-flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
              onClick={handleExpand}
            >
              <CaretDownIcon className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <div className="pointer-events-none sticky bottom-0 z-10 -mt-14 flex flex-col items-center gap-1 pb-2 pt-1">
            {saveStatusLabel ? (
              <span
                className={cn(
                  "text-xs",
                  saveStatus === "error"
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
                data-testid="roadmap-save-status"
                aria-live="polite"
              >
                {saveStatusLabel}
              </span>
            ) : null}
            <button
              type="button"
              data-testid={`${expandTestId}-collapse`}
              aria-expanded
              aria-label={t("roadmap.collapseContent")}
              className="pointer-events-auto inline-flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
              onClick={handleCollapse}
            >
              <CaretDownIcon className="size-4 rotate-180" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
