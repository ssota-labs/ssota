import type { ReactNode } from "react";
import { cn } from "@ssota/ui/lib/utils";

export function SettingsPanel({ title, description, children }: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-4xl flex-col px-6 py-8">
        <header className="mb-8 space-y-1 border-b pb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </header>
        <div className="space-y-10">{children}</div>
      </div>
    </div>
  );
}

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="divide-y rounded-lg border bg-card">{children}</div>
    </section>
  );
}

export function SettingsRow({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1 sm:max-w-md">
        <div className="text-sm font-medium">{title}</div>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="w-full shrink-0 sm:max-w-sm">{children}</div>
    </div>
  );
}

export function SettingsDangerCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-destructive">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
