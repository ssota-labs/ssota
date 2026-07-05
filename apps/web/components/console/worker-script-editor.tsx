"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { indentWithTab } from "@codemirror/commands";
import { EditorView, keymap } from "@codemirror/view";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { useTheme } from "next-themes";
import { cn } from "@ssota/ui/lib/utils";

type WorkerScriptEditorProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  testId?: string;
  minHeight?: string;
  readOnly?: boolean;
  className?: string;
};

export function WorkerScriptEditor({
  value,
  onChange,
  id,
  testId,
  minHeight = "14rem",
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
