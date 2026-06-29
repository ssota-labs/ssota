import type { ReactNode } from "react";

type SettingsPanelProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function SettingsPanel({ title, description, children }: SettingsPanelProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  );
}
