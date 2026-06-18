import { UI_CATALOG_COMPONENTS } from "@/lib/lab-sandbox/dynamic-page-renderer";

export default function LabUiCatalogPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">L2 — UI catalog (preview registry)</h1>
      <p className="text-muted-foreground text-sm">
        Components available to <code>PageRuntimeDefinition.spec</code> in the
        sandbox renderer. Production ui-catalog in contracts is post-release.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {UI_CATALOG_COMPONENTS.map((key) => (
          <li
            key={key}
            className="border-border rounded-md border px-3 py-2 font-mono text-sm"
          >
            {key}
          </li>
        ))}
      </ul>
    </div>
  );
}
