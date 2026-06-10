import { Suspense } from "react";
import { ConsentForm } from "./consent-form";

export default function ConsentPage() {
  return (
    <Suspense fallback={<main className="p-8">로딩 중…</main>}>
      <ConsentForm />
    </Suspense>
  );
}
