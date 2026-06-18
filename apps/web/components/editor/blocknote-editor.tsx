"use client";

import type {
  Block,
  BlockNoteEditor as BlockNoteEditorInstance,
  PartialBlock,
} from "@blocknote/core";
import { ko } from "@blocknote/core/locales";
import "@blocknote/core/fonts/inter.css";
import { FormattingToolbarController, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";

import { BlockNoteFormattingToolbar } from "@/components/editor/blocknote-formatting-toolbar";
import {
  resolveBlockNoteMarkerShell,
  updateBlockNoteListMarkers,
} from "@/lib/editor/blocknote-list-markers";

let markerShellElement: HTMLDivElement | null = null;

function getMarkerShell(shellRef: {
  current: HTMLDivElement | null;
}): HTMLElement | null {
  return markerShellElement ?? resolveBlockNoteMarkerShell(shellRef);
}

declare global {
  interface Window {
    __ssotaBlockNoteLab?: BlockNoteEditorInstance;
    __ssotaBlockNoteLabRefreshMarkers?: () => void;
  }
}

const placeholders = {
  ...ko.placeholders,
  default: "내용을 입력하거나 '/'를 누르세요",
};

const dictionary = {
  ...ko,
  placeholders,
};

const placeholderCssVars = {
  "--ssota-bn-placeholder-heading": `"${ko.placeholders.heading}"`,
  "--ssota-bn-placeholder-toggle-list": `"${ko.placeholders.toggleListItem}"`,
} as CSSProperties;

export interface SsotaBlockNoteEditorProps {
  initialContent?: PartialBlock[];
  uploadImage?: (file: File) => Promise<string>;
  editable?: boolean;
  onChange?: (blocks: Block[]) => void;
  onEditorReady?: (editor: BlockNoteEditorInstance) => void;
  className?: string;
}

export function SsotaBlockNoteEditor({
  initialContent,
  uploadImage,
  editable = true,
  onChange,
  onEditorReady,
  className,
}: SsotaBlockNoteEditorProps) {
  const { resolvedTheme } = useTheme();
  const shellRef = useRef<HTMLDivElement>(null);
  const refreshFrameRef = useRef<number | null>(null);
  const setShellRef = useCallback((node: HTMLDivElement | null) => {
    shellRef.current = node;
    markerShellElement = node;
    if (node) {
      updateBlockNoteListMarkers(node);
    }
  }, []);
  const uploadImageRef = useRef(uploadImage);
  uploadImageRef.current = uploadImage;

  const blockNoteTheme =
    resolvedTheme === "dark"
      ? "dark"
      : resolvedTheme === "light"
        ? "light"
        : undefined;

  const editorOptions = useMemo(() => {
    const base = {
      dictionary,
      initialContent,
    };

    if (!uploadImage) {
      return base;
    }

    return {
      ...base,
      uploadFile: async (file: File) => {
        const upload = uploadImageRef.current;
        if (!upload) {
          throw new Error("Image upload is not configured");
        }
        return upload(file);
      },
    };
  }, [initialContent, uploadImage]);

  const editor = useCreateBlockNote(editorOptions, [initialContent, uploadImage]);

  const refreshListMarkersSync = useCallback(() => {
    const shell = getMarkerShell(shellRef);
    if (!shell) {
      return;
    }
    updateBlockNoteListMarkers(shell);
  }, []);

  const refreshListMarkers = useCallback(() => {
    const shell = getMarkerShell(shellRef);
    if (!shell) {
      return;
    }

    if (refreshFrameRef.current !== null) {
      window.cancelAnimationFrame(refreshFrameRef.current);
    }

    refreshFrameRef.current = window.requestAnimationFrame(() => {
      refreshFrameRef.current = null;
      updateBlockNoteListMarkers(shell);
    });
  }, []);

  const handleChange = useCallback(() => {
    onChange?.(editor.document);
    refreshListMarkers();
  }, [editor, onChange, refreshListMarkers]);

  useLayoutEffect(() => {
    const shell = getMarkerShell(shellRef);
    if (!shell) {
      return;
    }

    refreshListMarkersSync();

    const observer = new MutationObserver(() => {
      refreshListMarkers();
    });

    observer.observe(shell, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-index", "data-prev-index", "data-prev-type"],
      childList: true,
    });

    return () => observer.disconnect();
  }, [editor, refreshListMarkers, refreshListMarkersSync]);

  useEffect(() => {
    const unsubscribe = editor.onChange(() => {
      refreshListMarkers();
    });

    return unsubscribe;
  }, [editor, refreshListMarkers]);

  useEffect(() => {
    onEditorReady?.(editor);
    window.__ssotaBlockNoteLab = editor;
    window.__ssotaBlockNoteLabRefreshMarkers = refreshListMarkersSync;
    refreshListMarkersSync();

    return () => {
      delete window.__ssotaBlockNoteLab;
      delete window.__ssotaBlockNoteLabRefreshMarkers;
    };
  }, [editor, onEditorReady, refreshListMarkersSync]);

  return (
    <div
      ref={setShellRef}
      className={["blocknote-editor-shell", className].filter(Boolean).join(" ")}
      data-testid="blocknote-editor-shell"
      style={placeholderCssVars}
    >
      <BlockNoteView
        editor={editor}
        editable={editable}
        formattingToolbar={false}
        onChange={handleChange}
        theme={blockNoteTheme}
      >
        <FormattingToolbarController
          formattingToolbar={BlockNoteFormattingToolbar}
        />
      </BlockNoteView>
    </div>
  );
}
