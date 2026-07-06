"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { indentWithTab } from "@codemirror/commands";
import { EditorView, keymap } from "@codemirror/view";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { useTheme } from "next-themes";
import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import { cn } from "@ssota/ui/lib/utils";

export const WORKER_SCRIPT_EDITOR_MIN_HEIGHT = "16rem";

type WorkerScriptEditorProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  testId?: string;
  minHeight?: string;
  readOnly?: boolean;
  className?: string;
};

export function WorkerScriptEditorSkeleton({
  minHeight = WORKER_SCRIPT_EDITOR_MIN_HEIGHT,
  className,
  testId = "worker-edit-script-skeleton",
}: {
  minHeight?: string;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn("flex overflow-hidden bg-muted/20", className)}
      style={{ minHeight }}
      aria-hidden
    >
      <div className="flex w-10 shrink-0 flex-col gap-2 border-r border-border px-2 py-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-3 w-3 rounded-sm" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-4 py-2">
        <Skeleton className="h-3 w-[88%] max-w-md rounded-sm" />
        <Skeleton className="h-3 w-[72%] max-w-sm rounded-sm" />
        <Skeleton className="h-3 w-[56%] max-w-xs rounded-sm" />
        <Skeleton className="h-3 w-[40%] max-w-[10rem] rounded-sm" />
      </div>
    </div>
  );
}

export function WorkerScriptEditor({
  value,
  onChange,
  id,
  testId,
  minHeight = WORKER_SCRIPT_EDITOR_MIN_HEIGHT,
  readOnly = false,
  className,
}: WorkerScriptEditorProps) {
  const { resolvedTheme } = useTheme();

  const extensions = useMemo(
    () => [
      javascript({ typescript: true }),
      keymap.of([indentWithTab]),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": { backgroundColor: "transparent" },
        ".cm-gutters": {
          backgroundColor: "transparent",
          borderRight: "1px solid var(--border)",
        },
        ".cm-content": {
          padding: "0.5rem 0",
        },
      }),
    ],
    [],
  );

  const theme = resolvedTheme === "dark" ? githubDark : githubLight;

  return (
    <div
      id={id}
      data-testid={testId}
      className={cn(
        "overflow-hidden rounded-md border bg-muted/20",
        "[&_.cm-editor]:outline-none",
        "[&_.cm-scroller]:font-mono [&_.cm-scroller]:text-xs",
        className,
      )}
    >
      <CodeMirror
        value={value}
        height={minHeight}
        theme={theme}
        extensions={extensions}
        editable={!readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          bracketMatching: true,
          indentOnInput: true,
        }}
        onChange={onChange}
      />
    </div>
  );
}
