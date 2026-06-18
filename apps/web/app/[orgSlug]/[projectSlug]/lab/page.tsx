import { redirect } from "next/navigation";
import { isCatalogLabEnabled } from "@/lib/lab/catalog-lab-enabled";

export default function LabIndexPage() {
  if (!isCatalogLabEnabled()) {
    redirect("/");
  }
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Catalog Lab</h1>
      <p className="text-muted-foreground text-sm">
        Internal demo — L1 catalog, L3 pages, L4 workspace nav editors.
      </p>
      <ul className="list-disc space-y-2 pl-6 text-sm">
        <li>
          <a className="text-primary underline" href="catalog">
            L1 — node / edge catalog
          </a>
        </li>
        <li>
          <a className="text-primary underline" href="pages">
            L3 — page runtime JSON
          </a>
        </li>
        <li>
          <a className="text-primary underline" href="nav">
            L4 — workspace nav
          </a>
        </li>
        <li>
          <a className="text-primary underline" href="ui-catalog">
            L2 — UI component keys (read-only)
          </a>
        </li>
      </ul>
    </div>
  );
}
