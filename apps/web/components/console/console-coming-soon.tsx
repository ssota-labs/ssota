type ConsoleComingSoonProps = {
  title: string;
  description?: string;
  body?: string;
};

export function ConsoleComingSoon({ title, description, body }: ConsoleComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {body ? <p className="max-w-md text-xs text-muted-foreground">{body}</p> : null}
    </div>
  );
}
