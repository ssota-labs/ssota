import Link from "next/link";
import { PageRuntimeLabClient } from "./page-runtime-lab-client";

export const metadata = {
  title: "Page Runtime Lab · SSOTA",
};

export default function PageRuntimeLabPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 space-y-2">
        <p className="text-muted-foreground text-sm">
          <Link href="/labs" className="hover:text-foreground underline-offset-4 hover:underline">
            Labs
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Page Runtime Lab</h1>
        <p className="text-muted-foreground text-sm">
          Live preview of <code className="font-mono text-xs">DynamicPageRenderer</code>{" "}
          with sample JSON specs. Use this to validate layout components before seeding
          pages.
        </p>
      </div>
      <PageRuntimeLabClient />
    </main>
  );
}
