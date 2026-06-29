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
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      {title || description ? (
        <div className="space-y-1">
          {title ? <h2 className="text-sm font-semibold">{title}</h2> : null}
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
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
        "grid grid-cols-1 gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_min(100%,20rem)] sm:items-start sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="text-sm font-medium">{title}</div>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="min-w-0 w-full sm:justify-self-end">{children}</div>
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
