import Link from "next/link";
import { LabsHomeLinks } from "./page-runtime/page-runtime-lab-client";

export const metadata = {
  title: "Labs · SSOTA",
};

export default function LabsHomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 lg:max-w-7xl">
      <div className="mb-8 space-y-2">
        <p className="text-muted-foreground text-sm">
          <Link href="/home" className="hover:text-foreground underline-offset-4 hover:underline">
            Home
          </Link>
        </p>
        <h1 className="text-3xl font-semibold">Labs</h1>
        <p className="text-muted-foreground text-sm">
          Internal previews for JSON-render page catalog and editor experiments. No
          project auth required.
        </p>
      </div>
      <LabsHomeLinks />
    </main>
  );
}
