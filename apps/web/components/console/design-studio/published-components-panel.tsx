type PublishedComponentsPanelProps = {
  components: Array<{
    id: string;
    title: string;
    slug: string;
    tier: string;
  }>;
};

export function PublishedComponentsPanel({
  components,
}: PublishedComponentsPanelProps) {
  if (components.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        No published UI components yet. Deploy a component from Design Studio to
        use it in wireframes.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-2 text-sm font-medium">Published UI components</h2>
      <ul className="space-y-1 text-sm">
        {components.map((component) => (
          <li key={component.id} className="flex items-center justify-between">
            <span>{component.title}</span>
            <span className="text-muted-foreground">
              {component.slug} · {component.tier}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
