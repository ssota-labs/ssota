import { useEffect, useState } from "react";

import type { ArgTypeDef } from "../lib/story-catalog";
import { ExportPanel } from "./ExportPanel";
import { PropsControls } from "./PropsControls";
import { ThemeInspector } from "./ThemeInspector";
import { TokenInspector } from "./TokenInspector";

type Tab = "props" | "tokens" | "theme" | "export";

type InspectorPanelProps = {
  showProps?: boolean;
  propsEnabled?: boolean;
  argTypes?: Record<string, ArgTypeDef>;
  storyArgs?: Record<string, unknown>;
  onStoryArgChange?: (key: string, value: unknown) => void;
  onResetStoryArgs?: () => void;
  variantLabel?: string;
};

export function InspectorPanel({
  showProps = false,
  propsEnabled = false,
  argTypes,
  storyArgs = {},
  onStoryArgChange,
  onResetStoryArgs,
  variantLabel,
}: InspectorPanelProps) {
  const [tab, setTab] = useState<Tab>(showProps ? "props" : "tokens");

  useEffect(() => {
    if (!showProps && tab === "props") setTab("tokens");
  }, [showProps, tab]);

  const tabs: { id: Tab; label: string }[] = [
    ...(showProps ? [{ id: "props" as const, label: "Props" }] : []),
    { id: "tokens", label: "Tokens" },
    { id: "theme", label: "Theme" },
    { id: "export", label: "Export" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-border bg-card">
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              tab === t.id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "props" && (
          <>
            {!propsEnabled ? (
              <p className="text-xs text-muted-foreground">
                {variantLabel ? (
                  <>
                    <span className="font-medium text-foreground">
                      {variantLabel}
                    </span>
                    은 정적 쇼케이스입니다. Controls를 쓰려면 Default 등 args
                    variant를 선택하세요.
                  </>
                ) : (
                  "컴포넌트를 선택하면 props controls가 표시됩니다."
                )}
              </p>
            ) : (
              <PropsControls
                argTypes={argTypes}
                args={storyArgs}
                onChange={(key, value) => onStoryArgChange?.(key, value)}
                onReset={() => onResetStoryArgs?.()}
              />
            )}
          </>
        )}
        {tab === "tokens" && <TokenInspector />}
        {tab === "theme" && <ThemeInspector />}
        {tab === "export" && <ExportPanel />}
      </div>
    </div>
  );
}
