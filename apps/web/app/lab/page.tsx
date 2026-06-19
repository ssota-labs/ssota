import Link from "next/link";

const SECTIONS = [
  {
    title: "Preview",
    href: "/lab/preview",
    body: "Workspace nav + DynamicPageRenderer against in-memory bindings.",
  },
  {
    title: "Fixtures",
    href: "/lab/data",
    body: "Edit the full mock dataset (catalog, nodes, pages, nav) as JSON.",
  },
  {
    title: "L1 Catalog",
    href: "/lab/catalog",
    body: "Node and edge catalog entries (property schemas).",
  },
  {
    title: "L3 Pages",
    href: "/lab/pages",
    body: "PageRuntimeDefinition — spec + bindings cross-validation.",
  },
  {
    title: "L4 Nav",
    href: "/lab/nav",
    body: "Workspace nav seed (pageKey → resolved at preview).",
  },
  {
    title: "L2 UI Catalog",
    href: "/lab/ui-catalog",
    body: "Registered json-render component keys for the preview renderer.",
  },
] as const;

export default function LabHomePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-semibold">Developer Lab</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Top-level sandbox — no org, no project, no database. All data lives in
          browser memory (with optional localStorage persistence).
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="border-border hover:bg-accent/40 block h-full rounded-lg border p-4 transition-colors"
            >
              <h2 className="font-medium">{section.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm">{section.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
